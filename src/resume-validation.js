const POLICY_VERSION = 'resume-truth-validation-policy/1.0.0';

function finding(category, rule, severity, message, references = {}) {
  return { category, rule, severity, message, references };
}
function normal(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function sameUniqueSet(left, right) { return Array.isArray(left) && Array.isArray(right) && new Set(left).size === left.length && new Set(right).size === right.length && left.length === right.length && left.every((item) => right.includes(item)); }
function visibleStatements(artifact) {
  return (artifact.content.sections || []).flatMap((section) => (section.statements || []).map((statement) => ({ section, statement })));
}

function validate({ artifactRun, plan, integrity }) {
  const findings = [];
  const artifact = artifactRun.resume_artifacts[0];
  if (!artifact) return { findings: [finding('artifact_completeness', 'artifact-present', 'critical', 'Resume Artifact Run contains no artifact.')] };
  const selections = new Map(plan.resume_content_selections.map((selection) => [selection.id, selection]));
  const facts = new Map(plan.candidate_knowledge_snapshot.map((fact) => [fact.id, fact]));
  const coverage = new Map(plan.requirement_coverage.map((item) => [item.job_requirement_id, item]));
  const duplicates = new Map();
  const traceability = artifact.metadata && artifact.metadata.traceability;
  if (!artifactRun.id || !artifactRun.resume_tailoring_plan_run_id || !traceability || traceability.resume_artifact_run_id !== artifactRun.id || traceability.resume_tailoring_plan_run_id !== plan.id) {
    findings.push(finding('artifact_completeness', 'run-traceability', 'error', 'Artifact must retain matching Artifact Run and Tailoring Plan Run IDs.'));
  }
  if (artifact.metadata?.draft_provider?.parse_error) findings.push(finding('draft_provider', 'draft-parse-or-provider-error', 'critical', 'Resume draft provider did not return a usable structured draft.', { provider: artifact.metadata.draft_provider.provider }));
  for (const section of artifact.content.sections || []) {
    if (!section.section || !Number.isInteger(section.position) || !Array.isArray(section.statements)) findings.push(finding('artifact_completeness', 'section-shape', 'error', 'Each section must retain a name, position, and statement list.', { section: section.section }));
  }
  if ((artifact.content.sections || []).some((section, index) => section.position !== index + 1)) findings.push(finding('plan_compliance', 'section-order', 'warning', 'Serialized section ordering does not match retained section positions.'));
  for (const { section, statement } of visibleStatements(artifact)) {
    const refs = statement.resume_content_selection_ids;
    if (!statement.statement_id) findings.push(finding('artifact_completeness', 'statement-id', 'error', 'Every visible statement must retain a statement ID.', { text: statement.text }));
    if (!Array.isArray(refs) || refs.length === 0) {
      findings.push(finding('provenance_integrity', 'statement-selection-reference', 'critical', 'Visible statement has no Resume Content Selection reference.', { statement_id: statement.statement_id }));
      continue;
    }
    for (const selectionId of refs) {
      const selection = selections.get(selectionId);
      if (!selection) { findings.push(finding('provenance_integrity', 'selection-resolves', 'critical', 'Statement references a selection absent from its immutable plan.', { selection_id: selectionId })); continue; }
      if (selection.selection_state !== 'include') findings.push(finding('plan_compliance', 'visible-selection-state', 'error', 'Blocked, omitted, or deprioritized selections cannot appear in visible output.', { selection_id: selectionId, state: selection.selection_state }));
      const fact = facts.get(selection.candidate_fact_id);
      const check = integrity.get(selection.candidate_fact_id);
      if (!fact || !check || !check.fact_exists) findings.push(finding('provenance_integrity', 'candidate-fact-resolves', 'critical', 'Selection does not resolve to a committed Candidate Fact.', { selection_id: selectionId, candidate_fact_id: selection.candidate_fact_id }));
      else if (!check.integration_exists || !check.provenance_exists) findings.push(finding('provenance_integrity', 'fact-provenance', 'critical', 'Candidate Fact lacks a valid integration decision or evidence provenance reference.', { candidate_fact_id: selection.candidate_fact_id }));
      const citedFacts = statement.provenance?.candidate_fact_ids || [statement.provenance?.candidate_fact_id];
      if (!statement.provenance || !Array.isArray(citedFacts) || !citedFacts.includes(selection.candidate_fact_id) || !Array.isArray(statement.provenance.inherited_provenance_references)) findings.push(finding('provenance_integrity', 'statement-fact-provenance', 'error', 'Statement provenance must cite every selected committed Candidate Fact.', { statement_id: statement.statement_id, selection_id: selectionId }));
      const citedRequirements = statement.provenance?.job_requirement_ids || [];
      const attachedSelections = (statement.resume_content_selection_ids || []).map((id) => selections.get(id)).filter(Boolean);
      const attachedFactIds = attachedSelections.map((item) => item.candidate_fact_id);
      const attachedRequirementIds = [...new Set(attachedSelections.flatMap((item) => item.mapped_requirement_ids || []))];
      if (artifact.metadata?.draft_provider?.provider !== 'deterministic-fallback' && !sameUniqueSet(citedFacts, attachedFactIds)) findings.push(finding('provenance_integrity', 'draft-fact-citation-set', 'critical', 'Draft statement fact citations must exactly match its attached included selections.', { statement_id: statement.statement_id, cited_candidate_fact_ids: citedFacts, attached_candidate_fact_ids: attachedFactIds }));
      if (artifact.metadata?.draft_provider?.provider !== 'deterministic-fallback' && !sameUniqueSet(citedRequirements, attachedRequirementIds)) findings.push(finding('provenance_integrity', 'draft-requirement-citation-set', 'critical', 'Draft statement requirement citations must exactly match requirements mapped by its attached selections.', { statement_id: statement.statement_id, cited_job_requirement_ids: citedRequirements, attached_job_requirement_ids: attachedRequirementIds }));
      if (section.section !== selection.recommended_section && !(section.section === 'Professional Summary' && artifact.metadata?.draft_provider)) findings.push(finding('plan_compliance', 'section-placement', 'warning', 'Statement placement differs from the approved plan.', { statement_id: statement.statement_id, expected: selection.recommended_section, actual: section.section }));
      for (const requirementId of selection.mapped_requirement_ids) if (coverage.get(requirementId)?.coverage_status === 'uncovered') findings.push(finding('coverage_integrity', 'uncovered-requirement-claim', 'error', 'An uncovered requirement cannot appear as a supported visible claim.', { requirement_id: requirementId, selection_id: selectionId }));
      if (!selection.permitted_claim_scope.includes(statement.template)) findings.push(finding('claim_scope_compliance', 'template-permission', 'error', 'Rendered template is outside the selection permitted claim scope.', { statement_id: statement.statement_id, template: statement.template }));
      const text = String(statement.text || '');
      if (/\b(advanced|expert|proficient|proficiency|\d+\+?\s+years?|years?\s+of\s+experience|led|leadership|owned|ownership)\b/i.test(text) || /\b(increased|improved|reduced|grew)\b.*\d+(?:\.\d+)?\s*(%|percent|users|customers|revenue|hours|dollars?)/i.test(text)) findings.push(finding('claim_scope_compliance', 'bounded-wording', 'error', 'Rendered wording asserts a blocked proficiency, duration, ownership, leadership, or quantified outcome.', { statement_id: statement.statement_id, text }));
    }
    const key = normal(statement.text);
    if (key) duplicates.set(key, [...(duplicates.get(key) || []), statement.statement_id]);
  }
  for (const [text, ids] of duplicates) if (ids.length > 1) findings.push(finding('duplication_consistency', 'duplicate-visible-claim', 'warning', 'Duplicate visible claim detected.', { normalized_text: text, statement_ids: ids }));
  const actualOrder = (artifact.content.sections || []).filter((section) => section.statements?.length).map((section) => section.section);
  const plannedOrder = plan.section_plans.map((section) => section.section).filter((section) => actualOrder.includes(section));
  if (actualOrder.filter((section) => plannedOrder.includes(section)).join('|') !== plannedOrder.join('|')) findings.push(finding('plan_compliance', 'section-order', 'warning', 'Visible section ordering differs from the approved plan.', { expected: plannedOrder, actual: actualOrder }));
  if (!artifact.metadata || !Array.isArray(artifact.metadata.omissions) || !Array.isArray(artifact.metadata.blocked_claims) || !Array.isArray(artifact.metadata.requirement_coverage)) findings.push(finding('artifact_completeness', 'traceability-metadata', 'error', 'Artifact metadata must retain omissions, blocked claims, and requirement coverage.'));
  return { findings };
}

function statusFor(findings) {
  if (findings.some((item) => item.severity === 'error' || item.severity === 'critical')) return 'failed';
  if (findings.some((item) => item.severity === 'warning')) return 'passed_with_warnings';
  return 'passed';
}

module.exports = { POLICY_VERSION, validate, statusFor };
