const POLICY_VERSION = 'resume-artifact-generation-policy/1.0.0';

const SECTIONS = ['Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'];

function scalar(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : null; }
function displayValue(fact) {
  if (fact.display_value) return fact.display_value;
  const value = fact.value || fact.canonical_value || {};
  for (const key of ['name', 'title', 'credential', 'degree', 'program']) if (scalar(value[key])) return scalar(value[key]);
  const pair = [value.organization, value.role].map(scalar).filter(Boolean);
  if (pair.length) return pair.join(' — ');
  const strings = Object.values(value).map(scalar).filter(Boolean);
  return strings.join(' — ');
}
function templateFor(selection, fact) {
  if (selection.recommended_section === 'Skills') return 'skill_name';
  if (selection.recommended_section === 'Projects') return 'project_name';
  if (selection.recommended_section === 'Experience') return fact.entity_type === 'achievement' ? 'accepted_achievement_detail' : 'accepted_fact_detail';
  return 'accepted_fact_detail';
}
function renderStatement(selection, fact) {
  const template = templateFor(selection, fact);
  if (!selection.permitted_claim_scope.includes(template)) return null;
  const text = displayValue(fact);
  if (!text) return null;
  return {
    statement_id: `statement:${selection.id}`,
    template,
    text,
    resume_content_selection_ids: [selection.id],
    provenance: {
      candidate_fact_id: selection.candidate_fact_id,
      candidate_fact_revision: selection.candidate_fact_revision,
      inherited_provenance_references: selection.inherited_provenance_references,
    },
  };
}
function generate(plan, presentationStrategy = null) {
  const facts = new Map(plan.candidate_knowledge_snapshot.map((fact) => [fact.id, fact]));
  const order = new Map((presentationStrategy?.ordered_resume_content_selection_ids || []).map((id, index) => [id, index]));
  const visibleSelections = plan.resume_content_selections.filter((selection) => selection.selection_state === 'include');
  const sections = SECTIONS.map((name, position) => ({
    section: name,
    position: position + 1,
    placeholder: name === 'Professional Summary' ? 'Summary is intentionally a placeholder; no summary claim is generated in Capability 004.2.' : null,
    statements: visibleSelections
      .filter((selection) => selection.recommended_section === name)
      .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER) || displayValue(facts.get(left.candidate_fact_id)).localeCompare(displayValue(facts.get(right.candidate_fact_id))))
      .map((selection) => renderStatement(selection, facts.get(selection.candidate_fact_id)))
      .filter(Boolean),
  }));
  const rendered = sections.flatMap((section) => section.statements);
  const omissions = plan.resume_content_selections
    .filter((selection) => selection.selection_state !== 'include')
    .map((selection) => ({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, state: selection.selection_state, rationale: selection.relevance_rationale }));
  const blockedClaims = plan.resume_content_selections
    .filter((selection) => selection.blocked_claim_scopes.length)
    .map((selection) => ({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, blocked_claim_scopes: selection.blocked_claim_scopes }));
  return {
    format: 'resume-artifact-model/1.0.0',
    sections,
    metadata: {
      job_requirement_profile_reference: { id: plan.job_requirement_profile_id, version: plan.job_requirement_profile_version },
      omissions,
      blocked_claims: blockedClaims,
      requirement_coverage: plan.requirement_coverage.map((coverage) => ({ requirement_id: coverage.job_requirement_id, status: coverage.coverage_status, rationale: coverage.coverage_rationale })),
      presentation_strategy: presentationStrategy ? { policy_version: presentationStrategy.policy_version, target_job: presentationStrategy.target_job, career_understanding_snapshot_run_id: presentationStrategy.shared_understanding.career_understanding_snapshot_run_id, limitations: presentationStrategy.limitations } : null,
      limitations: 'Visible content is deterministic and contains only values permitted by a Resume Content Selection. Omissions and blocked claims are metadata, not resume output.',
    },
    rendered_statement_count: rendered.length,
  };
}

module.exports = { POLICY_VERSION, SECTIONS, generate };
