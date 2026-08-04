const { normalize, matchingFacts } = require('./information-needs');

const POLICY_VERSION = 'evidence-discovery-policy/1.1.0';
const ADAPTER_VERSION = 'local-evidence-adapters/1.0.0';
const SOURCE_ORDER = ['candidate_fact', 'profile_skill', 'resume_import', 'resume_ast', 'resume_semantic', 'resume_semantic_graph'];

function sourceFor(fact) {
  if (fact.source === 'profile_skill') return 'profile_skill';
  if (fact.source === 'resume_semantic') return 'resume_semantic';
  if (fact.source === 'resume_semantic_graph') return 'resume_semantic_graph';
  if (fact.source === 'resume_ast') return 'resume_ast';
  return fact.source === 'resume' ? 'resume_import' : 'candidate_fact';
}

function structuredMatches(requirement, facts) {
  if (requirement.normalized_name !== 'Years of experience') return [];
  return facts.filter((fact) => fact.entity_type === 'experience' && Number.isFinite(Number(fact.value?.years_of_experience ?? fact.value?.years)));
}

function matches(requirement, facts) {
  return [...matchingFacts(requirement, facts), ...structuredMatches(requirement, facts).filter((fact) => !matchingFacts(requirement, facts).some((match) => match.id === fact.id))];
}

function claimFor(fact) {
  if (fact.value?.name) return fact.value.name;
  if (Number.isFinite(Number(fact.value?.years_of_experience ?? fact.value?.years))) return `${Number(fact.value.years_of_experience ?? fact.value.years)} years of experience`;
  return JSON.stringify(fact.value);
}

function candidateFor(need, fact, sourceType) {
  const ast = sourceType === 'resume_ast' ? fact.provenance : null;
  const confirmed = sourceType === 'resume_ast'
    ? ast.extraction_state === 'explicit' && ['skill', 'tool'].includes(ast.block_kind) && fact.confirmation_status === 'confirmed'
    : fact.confirmation_status === 'confirmed';
  const confidence = sourceType === 'profile_skill' || sourceType === 'candidate_fact' ? 'high' : 'medium';
  return {
    information_need_id: need.id,
    job_requirement_id: need.job_requirement_id,
    source_type: sourceType,
    source_reference: fact.id,
    normalized_claim: normalize(claimFor(fact)),
    supporting_value: fact.value,
    supporting_text: fact.value?.text || fact.value?.name || claimFor(fact),
    extraction_method: sourceType === 'resume_ast' ? 'validated_resume_ast_requirement_retrieval' : 'deterministic_exact_or_explicit_alias',
    confidence_level: confidence,
    parser_version: ADAPTER_VERSION,
    provenance: { source: fact.source, confirmation_status: fact.confirmation_status, resume_import_id: fact.resume_import_id || null, semantic: fact.provenance || null, retrieval: ast?.retrieval || null, extraction_state: ast?.extraction_state || null, block_kind: ast?.block_kind || null, section: ast?.section || null, exact_source_text: ast?.exact_source_text || null },
    limitations: confirmed
      ? 'Explicit bounded match only; it does not establish proficiency, recency, depth, or outcomes.'
      : 'Potentially relevant evidence is not explicitly confirmed and cannot become Candidate Knowledge through discovery.',
  };
}

function resolve(candidates) {
  const structuredValues = [...new Set(candidates.map((candidate) => Number(candidate.supporting_value?.years_of_experience ?? candidate.supporting_value?.years)).filter(Number.isFinite))];
  if (structuredValues.length > 1) return candidates.map(() => ({ state: 'conflicting', rationale: 'Materially incompatible structured values prevent deterministic sufficiency.' }));
  return candidates.map((candidate) => candidate.provenance.confirmation_status === 'confirmed'
    ? { state: 'accepted_for_need', rationale: 'Explicit confirmed evidence matches the bounded requirement through an exact value or explicit alias.' }
    : { state: 'needs_confirmation', rationale: 'The evidence is relevant but its stored confirmation state does not support an accepted claim.' });
}

function sufficiency(resolvedCandidates) {
  if (resolvedCandidates.some((item) => item.resolution.state === 'conflicting')) return { sufficient: false, rationale: 'Unresolved material conflict prevents evidence sufficiency.' };
  const accepted = resolvedCandidates.filter((item) => item.resolution.state === 'accepted_for_need');
  if (accepted.some((item) => item.candidate.confidence_level === 'high')) return { sufficient: true, rationale: 'One high-confidence accepted candidate is sufficient for this bounded need.' };
  const independent = new Set(accepted.filter((item) => item.candidate.confidence_level === 'medium').map((item) => ['resume_semantic', 'resume_semantic_graph'].includes(item.candidate.source_type) ? 'resume_working_evidence' : item.candidate.source_type));
  if (independent.size >= 2) return { sufficient: true, rationale: 'Multiple independently traceable medium-confidence accepted candidates are sufficient for this bounded need.' };
  return { sufficient: false, rationale: accepted.length ? 'Accepted evidence is not yet sufficient under the deterministic threshold.' : 'No accepted evidence is available for this bounded need.' };
}

module.exports = { POLICY_VERSION, ADAPTER_VERSION, SOURCE_ORDER, sourceFor, matches, candidateFor, resolve, sufficiency };
