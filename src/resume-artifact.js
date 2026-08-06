const POLICY_VERSION = 'resume-artifact-generation-policy/1.1.0';

const SECTIONS = ['Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'];

function scalar(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : null; }
function displayValue(fact) {
  if (fact.display_value) return fact.display_value;
  const value = fact.value || fact.canonical_value || {};
  if (fact.entity_type === 'project' && scalar(value.name) && scalar(value.text) && value.name !== value.text) return `${value.name}: ${value.text}`;
  for (const key of ['name', 'title', 'credential', 'degree', 'program']) if (scalar(value[key])) return scalar(value[key]);
  const pair = [value.organization, value.role].map(scalar).filter(Boolean);
  if (pair.length) return pair.join(' — ');
  const strings = Object.values(value).map(scalar).filter(Boolean);
  return strings.join(' — ');
}
function templateFor(selection, fact) {
  if (selection.recommended_section === 'Skills') return 'skill_name';
  if (selection.recommended_section === 'Projects') return fact.value?.text && fact.value.text !== fact.value.name ? 'bounded_project_responsibilities' : 'project_name';
  if (selection.recommended_section === 'Experience' && fact.entity_type === 'responsibility') return 'bounded_responsibility';
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
      candidate_fact_ids: [selection.candidate_fact_id],
      candidate_fact_revision: selection.candidate_fact_revision,
      job_requirement_ids: selection.mapped_requirement_ids || [],
      inherited_provenance_references: selection.inherited_provenance_references,
    },
  };
}
function generatedStatements(draft, plan, facts) {
  if (!draft || !Array.isArray(draft.sections)) return null;
  const selections = new Map(plan.resume_content_selections.filter((item) => item.selection_state === 'include').map((item) => [item.candidate_fact_id, item]));
  const sections = new Map(draft.sections.map((item) => [item.section, item.statements]));
  return SECTIONS.map((name, position) => ({ section: name, position: position + 1, placeholder: null, statements: (sections.get(name) || []).map((item, index) => {
    const factIds = [...new Set(item.candidate_fact_ids || [])]; const linked = factIds.map((id) => selections.get(id)).filter(Boolean);
    const first = linked[0]; const fact = facts.get(first?.candidate_fact_id);
    return { statement_id: `draft:${name}:${index + 1}`, template: templateFor(first || {}, fact || {}), text: item.text, resume_content_selection_ids: linked.map((selection) => selection.id), provenance: { candidate_fact_id: first?.candidate_fact_id || null, candidate_fact_revision: first?.candidate_fact_revision || null, candidate_fact_ids: factIds, job_requirement_ids: item.job_requirement_ids || [], inherited_provenance_references: linked.flatMap((selection) => selection.inherited_provenance_references || []) } };
  }) }));
}
function sameSet(left, right) { return left.length === right.length && new Set(left).size === left.length && left.every((item) => right.includes(item)); }
function crossSectionSummary(selection, section) { return section === 'Professional Summary' && selection.permitted_claim_scope.includes('cross_section_summary'); }
function completedProviderSections(providerSections, plan, facts) {
  const selections = new Map(plan.resume_content_selections.map((selection) => [selection.id, selection]));
  const sections = providerSections.map((section) => ({ ...section, statements: section.statements.filter((statement) => {
    const linked = statement.resume_content_selection_ids.map((id) => selections.get(id)).filter(Boolean);
    const factIds = statement.provenance?.candidate_fact_ids || [];
    return linked.length === statement.resume_content_selection_ids.length
      && linked.length > 0
      && linked.every((selection) => selection.selection_state === 'include' && (selection.recommended_section === section.section || crossSectionSummary(selection, section.section)))
      && sameSet(factIds, linked.map((selection) => selection.candidate_fact_id));
  }) }));
  const rendered = new Set(sections.flatMap((section) => section.statements.flatMap((statement) => statement.resume_content_selection_ids)));
  const fallbacks = []; const failures = [];
  for (const selection of plan.resume_content_selections.filter((item) => item.selection_state === 'include' && !rendered.has(item.id))) {
    const statement = renderStatement(selection, facts.get(selection.candidate_fact_id));
    if (!statement) { failures.push({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, recommended_section: selection.recommended_section, reason: 'deterministic_completion_unrenderable' }); continue; }
    const section = sections.find((item) => item.section === selection.recommended_section);
    if (section) section.statements.push(statement);
    else sections.push({ section: selection.recommended_section, position: SECTIONS.indexOf(selection.recommended_section) + 1, placeholder: null, statements: [statement] });
    fallbacks.push({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, recommended_section: selection.recommended_section, reason: 'provider_omitted_included_selection' });
  }
  return { sections: sections.sort((left, right) => left.position - right.position), fallbacks, failures };
}
function generate(plan, presentationStrategy = null, draftResult = null) {
  const facts = new Map(plan.candidate_knowledge_snapshot.map((fact) => [fact.id, fact]));
  const order = new Map((presentationStrategy?.ordered_resume_content_selection_ids || []).map((id, index) => [id, index]));
  const visibleSelections = plan.resume_content_selections.filter((selection) => selection.selection_state === 'include');
  const deterministicSections = SECTIONS.map((name, position) => ({
    section: name,
    position: position + 1,
    placeholder: name === 'Professional Summary' ? 'Summary is intentionally a placeholder; no summary claim is generated in Capability 004.2.' : null,
    statements: visibleSelections
      .filter((selection) => selection.recommended_section === name)
      .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER) || displayValue(facts.get(left.candidate_fact_id)).localeCompare(displayValue(facts.get(right.candidate_fact_id))))
      .map((selection) => renderStatement(selection, facts.get(selection.candidate_fact_id)))
      .filter(Boolean),
  }));
  const providerSections = generatedStatements(draftResult?.draft, plan, facts);
  const completion = providerSections ? completedProviderSections(providerSections, plan, facts) : { sections: deterministicSections, fallbacks: [], failures: [] };
  const sections = completion.sections;
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
      draft_provider: draftResult ? { provider: draftResult.provider, model: draftResult.model, version: draftResult.version, parse_error: draftResult.parseError || null } : { provider: 'deterministic-fallback', model: 'local', version: POLICY_VERSION },
      draft_completion_fallbacks: completion.fallbacks,
      draft_completion_failures: completion.failures,
      limitations: 'Visible content is deterministic and contains only values permitted by a Resume Content Selection. Omissions and blocked claims are metadata, not resume output.',
    },
    rendered_statement_count: rendered.length,
  };
}

module.exports = { POLICY_VERSION, SECTIONS, generate };
