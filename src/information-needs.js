const POLICY_VERSION = 'information-needs-policy/1.0.0';

const ALIASES = new Map([
  ['data visualization', ['visualization', 'visualisation']],
  ['regression testing', ['regression test', 'regression tests']],
  ['stakeholder management', ['manage stakeholders', 'stakeholder manager']],
]);

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function factValues(fact) {
  if (!fact.value || typeof fact.value !== 'object') return [];
  return [fact.value.name, fact.value.text, fact.value.title].filter(Boolean).map(normalize);
}

function matchingFacts(requirement, facts) {
  const target = normalize(requirement.normalized_name);
  const aliases = new Set([target, ...(ALIASES.get(target) || []).map(normalize)]);
  return facts.filter((fact) => factValues(fact).some((value) => aliases.has(value)));
}

function discoverability(requirement) {
  if (requirement.category === 'credential' || requirement.category === 'experience_constraint') {
    return { level: 'low', score: 2, rationale: 'Formal credentials and mandatory experience constraints should already have explicit evidence; absent evidence is not treated as highly recoverable.' };
  }
  if (requirement.category === 'testing_practice') {
    return { level: 'medium', score: 5, rationale: 'Testing practices may be evidenced through project or work context, but usually need concrete context to support a claim.' };
  }
  if (requirement.category === 'technical_skill') {
    return { level: 'high', score: 7, rationale: 'Concrete tools are commonly evidenced in academic, internship, work, research, or side-project contexts.' };
  }
  return { level: 'low', score: 2, rationale: 'Generic interpersonal language is not assumed recoverable without role-specific evidence.' };
}

function acquisitionCost(requirement) {
  if (requirement.category === 'credential') return { level: 'low', score: 2, rationale: 'A credential can be confirmed with a bounded existing record, although its discoverability may remain low.' };
  if (requirement.category === 'technical_skill') return { level: 'low', score: 2, rationale: 'Confirming a concrete tool in a known project or role is a low-friction evidence request.' };
  if (requirement.category === 'testing_practice') return { level: 'medium', score: 5, rationale: 'Testing evidence normally needs project context, actions, and scope.' };
  return { level: 'high', score: 8, rationale: 'Recovering broad interpersonal or stakeholder history generally requires reconstructing context and outcomes.' };
}

function level(score) { return score >= 18 ? 'high' : score >= 11 ? 'medium' : 'low'; }

function evaluateRequirement(requirement, facts) {
  const matches = matchingFacts(requirement, facts);
  const confirmed = matches.filter((fact) => fact.confirmation_status !== 'needs_confirmation');
  const status = confirmed.length ? 'supported' : matches.length ? 'needs_confirmation' : 'unknown';
  const existingEvidence = status === 'supported'
    ? { assessment: 'sufficient', score: 0, rationale: 'Explicit candidate fact(s) are available and do not require confirmation.' }
    : status === 'needs_confirmation'
      ? { assessment: 'present_needs_confirmation', score: 1, rationale: 'Potentially relevant candidate fact(s) exist but are explicitly marked as needing confirmation.' }
      : { assessment: 'absent', score: 2, rationale: 'No matching candidate fact is stored; this is an evidence gap, not a claim about the candidate.' };
  const discoverabilityInput = discoverability(requirement);
  const acquisitionCostInput = acquisitionCost(requirement);
  const importance = { level: requirement.importance_level, score: requirement.importance_score, rationale: requirement.importance_rationale };
  const resumeValue = { level: requirement.resume_value_level, score: requirement.resume_value_score, rationale: requirement.resume_value_rationale };
  if (status === 'supported') {
    return { status, priority_level: 'none', priority_score: 0, importance, resume_value: resumeValue, discoverability: discoverabilityInput, acquisition_cost: acquisitionCostInput, existing_evidence: existingEvidence, matched_fact_ids: confirmed.map((fact) => fact.id), uncertainty: 'Evidence is sufficient only for this bounded deterministic requirement match; it does not establish depth, recency, or proficiency.' };
  }
  const priorityScore = importance.score + resumeValue.score + discoverabilityInput.score - acquisitionCostInput.score + existingEvidence.score;
  return { status, priority_level: level(priorityScore), priority_score: priorityScore, importance, resume_value: resumeValue, discoverability: discoverabilityInput, acquisition_cost: acquisitionCostInput, existing_evidence: existingEvidence, matched_fact_ids: matches.map((fact) => fact.id), uncertainty: status === 'needs_confirmation' ? 'Matching evidence remains uncertain until its stored confirmation requirement is resolved.' : 'No matching evidence is stored; unknown does not assert the candidate lacks this requirement.' };
}

module.exports = { POLICY_VERSION, evaluateRequirement, normalize };
