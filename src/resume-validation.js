const POLICY_VERSION = 'resume-truth-validation-policy/1.2.0';

function finding(category, rule, severity, message, references = {}) {
  return { category, rule, severity, message, references };
}
function normal(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function scalar(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : null; }
function factDisplayValue(fact) {
  if (fact?.display_value) return fact.display_value;
  const value = fact?.value || fact?.canonical_value || {};
  if (fact?.entity_type === 'project' && scalar(value.name) && scalar(value.text) && value.name !== value.text) return `${value.name}: ${value.text}`;
  for (const key of ['name', 'title', 'credential', 'degree', 'program']) if (scalar(value[key])) return scalar(value[key]);
  const pair = [value.organization, value.role].map(scalar).filter(Boolean);
  if (pair.length) return pair.join(' — ');
  return Object.values(value).map(scalar).filter(Boolean).join(' — ');
}
function candidateFactSourceValues(fact, template = null) {
  const value = fact?.value || fact?.canonical_value || {};
  if (template === 'bounded_project_responsibilities' || template === 'bounded_responsibility' || template === 'accepted_achievement_detail') return [value.text].filter((item) => scalar(item)).map(String);
  if (template === 'project_name' || template === 'skill_name') return [value.name].filter((item) => scalar(item)).map(String);
  return [...new Set([fact?.display_value, value.name, value.title, value.text, value.credential, value.degree, value.program, factDisplayValue(fact)].filter((item) => scalar(item)).map(String))];
}
function sameUniqueSet(left, right) { return Array.isArray(left) && Array.isArray(right) && new Set(left).size === left.length && new Set(right).size === right.length && left.length === right.length && left.every((item) => right.includes(item)); }
function visibleStatements(artifact) {
  return (artifact.content.sections || []).flatMap((section) => (section.statements || []).map((statement) => ({ section, statement })));
}
function sourceStatement(statement) { return statement?.content_origin === 'source_resume_passthrough'; }

function validateSourceComposition({ artifact, plan, findings }) {
  const snapshot = plan.source_resume_snapshot;
  if (!snapshot?.sections?.length) return;
  const metadata = artifact.metadata?.composition;
  if (!metadata || metadata.policy_version !== snapshot.policy_version) {
    findings.push(finding('whole_resume_completeness', 'composition-metadata', 'critical', 'A source-resume snapshot requires complete-resume composition metadata with the same policy boundary.'));
    return;
  }
  const facts = new Map(plan.candidate_knowledge_snapshot.map((fact) => [fact.id, fact]));
  const selections = new Map(plan.resume_content_selections.map((selection) => [selection.id, selection]));
  const visible = new Map(visibleStatements(artifact).map(({ section, statement }) => [statement.statement_id, { section: section.section, statement }]));
  const superseded = new Map((metadata.superseded_source_statements || []).map((item) => [item.source_statement_id, item]));
  const omitted = new Map((metadata.omitted_source_statements || []).map((item) => [item.source_statement_id, item]));
  const preserved = new Set(metadata.preserved_source_statement_ids || []);
  const generatedReplacementUsage = new Set();
  const expected = snapshot.sections.flatMap((section) => (section.statements || []).map((statement) => ({ section: section.section, statement })));
  if (metadata.source_statement_count !== expected.length) findings.push(finding('whole_resume_completeness', 'source-statement-count', 'critical', 'Composition metadata must count every immutable source-resume statement.', { expected: expected.length, actual: metadata.source_statement_count }));
  for (const { section, statement } of expected) {
    const id = statement.source_statement_id || statement.statement_id;
    const retainedEntry = visible.get(id);
    if (retainedEntry) {
      const retained = retainedEntry.statement;
      if (!sourceStatement(retained) || retainedEntry.section !== section || retained.text !== statement.text || retained.provenance?.exact_source_text !== statement.text) findings.push(finding('whole_resume_completeness', 'source-statement-verbatim', 'critical', 'A preserved source-resume statement must remain verbatim in its source section with exact source provenance.', { source_statement_id: id, section, actual_section: retainedEntry.section }));
      if (!preserved.has(id) || superseded.has(id) || omitted.has(id)) findings.push(finding('whole_resume_completeness', 'source-statement-composition-accounting', 'critical', 'Composition metadata must classify a visible source statement as preserved and not superseded or omitted.', { source_statement_id: id, section }));
      continue;
    }

    const omission = omitted.get(id);
    if (omission) {
      const omissionSelections = (omission.resume_content_selection_ids || []).map((selectionId) => selections.get(selectionId));
      const sourceKey = normal(statement.text);
      const supported = omission.reason === 'explicit_role_specific_omission'
        && omissionSelections.length > 0
        && omissionSelections.length === (omission.resume_content_selection_ids || []).length
        && omissionSelections.every((selection) => selection.selection_state === 'omit'
          && candidateFactSourceValues(facts.get(selection.candidate_fact_id)).map(normal).includes(sourceKey))
        && !preserved.has(id)
        && !superseded.has(id);
      if (!supported) findings.push(finding('whole_resume_completeness', 'source-statement-explicit-omission', 'critical', 'A source-resume statement may be omitted only when an exact source-linked Resume Content Selection explicitly records a role-specific omit decision.', { source_statement_id: id, section, resume_content_selection_ids: omission.resume_content_selection_ids || [] }));
      continue;
    }

    const replacement = superseded.get(id);
    const generatedIds = replacement?.generated_statement_ids || [];
    const generatedEntries = generatedIds.map((generatedId) => visible.get(generatedId)).filter(Boolean);
    let supported = false;

    if (replacement?.reason === 'supported_job_specific_summary_replacement') {
      supported = section === 'Professional Summary'
        && generatedIds.length > 0
        && generatedEntries.length === generatedIds.length
        && !preserved.has(id)
        && generatedEntries.every((entry) => {
          const generated = entry.statement;
          const attachedSelections = (generated.resume_content_selection_ids || []).map((selectionId) => selections.get(selectionId)).filter(Boolean);
          return !sourceStatement(generated)
            && entry.section === 'Professional Summary'
            && attachedSelections.length === (generated.resume_content_selection_ids || []).length
            && attachedSelections.length > 0
            && attachedSelections.every((selection) => selection.selection_state === 'include' && selection.permitted_claim_scope.includes('cross_section_summary'));
        });
    } else {
      supported = Boolean(replacement)
        && replacement.reason === 'supported_tailored_replacement'
        && generatedIds.length > 0
        && generatedEntries.length === generatedIds.length
        && !preserved.has(id);
      for (const entry of generatedEntries) {
        const generated = entry.statement;
        const factIds = generated.provenance?.candidate_fact_ids || [];
        const sourceValues = factIds.flatMap((factId) => candidateFactSourceValues(facts.get(factId), generated.template)).map(normal).filter(Boolean);
        if (sourceStatement(generated) || entry.section !== section || !sourceValues.includes(normal(statement.text)) || generatedReplacementUsage.has(generated.statement_id)) supported = false;
        generatedReplacementUsage.add(generated.statement_id);
      }
    }
    if (!supported) findings.push(finding('whole_resume_completeness', 'source-statement-preserved-or-supported-replacement', 'critical', 'Every source-resume statement must be preserved verbatim, explicitly omitted by an exact role-specific selection decision, or independently proven to be replaced by supported Candidate Knowledge generated content.', { source_statement_id: id, section, generated_statement_ids: generatedIds }));
  }
  for (const sourceSection of snapshot.sections.filter((item) => item.statements?.length)) {
    const represented = (artifact.content.sections || []).find((item) => item.section === sourceSection.section && item.statements?.length);
    const allExplicitlyOmitted = sourceSection.section !== 'Applicant Header'
      && sourceSection.statements.every((statement) => omitted.has(statement.source_statement_id || statement.statement_id));
    if (!represented && !allExplicitlyOmitted) findings.push(finding('whole_resume_completeness', 'source-section-preserved', 'critical', 'Every populated source-resume section must remain represented unless every source statement in that section has an auditable explicit role-specific omit decision.', { section: sourceSection.section }));
  }
  const header = snapshot.sections.find((section) => section.section === 'Applicant Header');
  if (header?.statements?.length && !(artifact.content.sections || []).find((section) => section.section === 'Applicant Header')?.statements?.length) findings.push(finding('whole_resume_completeness', 'applicant-header-present', 'critical', 'Applicant identity and contact content from the source resume must be present.'));
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
    if (sourceStatement(statement)) {
      if (!Array.isArray(refs) || refs.length !== 0) findings.push(finding('source_resume_integrity', 'passthrough-has-no-selection', 'critical', 'Source-resume passthrough cannot cite a Resume Content Selection or masquerade as Candidate Knowledge.', { statement_id: statement.statement_id }));
      if (!statement.provenance?.source_kind || statement.text !== statement.provenance?.exact_source_text) findings.push(finding('source_resume_integrity', 'passthrough-exact-source', 'critical', 'Source-resume passthrough must remain byte-for-byte equal to its retained exact source text.', { statement_id: statement.statement_id }));
      const key = normal(statement.text);
      if (key) duplicates.set(key, [...(duplicates.get(key) || []), statement.statement_id]);
      continue;
    }
    if (statement.content_origin && statement.content_origin !== 'candidate_knowledge_generated') findings.push(finding('provenance_integrity', 'known-content-origin', 'critical', 'Visible content must identify either source-resume passthrough or Candidate Knowledge generated authority.', { statement_id: statement.statement_id, content_origin: statement.content_origin }));
    if (!Array.isArray(refs) || refs.length === 0) {
      findings.push(finding('provenance_integrity', 'statement-selection-reference', 'critical', 'Generated visible statement has no Resume Content Selection reference.', { statement_id: statement.statement_id }));
      continue;
    }
    for (const selectionId of refs) {
      const selection = selections.get(selectionId);
      if (!selection) { findings.push(finding('provenance_integrity', 'selection-resolves', 'critical', 'Statement references a selection absent from its immutable plan.', { selection_id: selectionId })); continue; }
      if (selection.selection_state !== 'include') findings.push(finding('plan_compliance', 'visible-selection-state', 'error', 'Blocked, omitted, or deprioritized selections cannot appear in generated visible output.', { selection_id: selectionId, state: selection.selection_state }));
      const fact = facts.get(selection.candidate_fact_id);
      const check = integrity.get(selection.candidate_fact_id);
      if (!fact || !check || !check.fact_exists) findings.push(finding('provenance_integrity', 'candidate-fact-resolves', 'critical', 'Selection does not resolve to a committed Candidate Fact.', { selection_id: selectionId, candidate_fact_id: selection.candidate_fact_id }));
      else if (!check.integration_exists || !check.provenance_exists) findings.push(finding('provenance_integrity', 'fact-provenance', 'critical', 'Candidate Fact lacks a valid integration decision or evidence provenance reference.', { candidate_fact_id: selection.candidate_fact_id }));
      const citedFacts = statement.provenance?.candidate_fact_ids || [statement.provenance?.candidate_fact_id];
      if (!statement.provenance || !Array.isArray(citedFacts) || !citedFacts.includes(selection.candidate_fact_id) || !Array.isArray(statement.provenance.inherited_provenance_references)) findings.push(finding('provenance_integrity', 'statement-fact-provenance', 'error', 'Generated statement provenance must cite every selected committed Candidate Fact.', { statement_id: statement.statement_id, selection_id: selectionId }));
      const citedRequirements = statement.provenance?.job_requirement_ids || [];
      const attachedSelections = (statement.resume_content_selection_ids || []).map((id) => selections.get(id)).filter(Boolean);
      const attachedFactIds = attachedSelections.map((item) => item.candidate_fact_id);
      const attachedRequirementIds = [...new Set(attachedSelections.flatMap((item) => item.mapped_requirement_ids || []))];
      if (artifact.metadata?.draft_provider?.provider !== 'deterministic-fallback' && !sameUniqueSet(citedFacts, attachedFactIds)) findings.push(finding('provenance_integrity', 'draft-fact-citation-set', 'critical', 'Draft statement fact citations must exactly match its attached included selections.', { statement_id: statement.statement_id, cited_candidate_fact_ids: citedFacts, attached_candidate_fact_ids: attachedFactIds }));
      if (artifact.metadata?.draft_provider?.provider !== 'deterministic-fallback' && !sameUniqueSet(citedRequirements, attachedRequirementIds)) findings.push(finding('provenance_integrity', 'draft-requirement-citation-set', 'critical', 'Draft statement requirement citations must exactly match requirements mapped by its attached selections.', { statement_id: statement.statement_id, cited_job_requirement_ids: citedRequirements, attached_job_requirement_ids: attachedRequirementIds }));
      if (section.section !== selection.recommended_section && !(section.section === 'Professional Summary' && artifact.metadata?.draft_provider)) findings.push(finding('plan_compliance', 'section-placement', 'warning', 'Generated statement placement differs from the approved plan.', { statement_id: statement.statement_id, expected: selection.recommended_section, actual: section.section }));
      for (const requirementId of selection.mapped_requirement_ids) if (coverage.get(requirementId)?.coverage_status === 'uncovered') findings.push(finding('coverage_integrity', 'uncovered-requirement-claim', 'error', 'An uncovered requirement cannot appear as a supported generated claim.', { requirement_id: requirementId, selection_id: selectionId }));
      if (!selection.permitted_claim_scope.includes(statement.template)) findings.push(finding('claim_scope_compliance', 'template-permission', 'error', 'Rendered template is outside the selection permitted claim scope.', { statement_id: statement.statement_id, template: statement.template }));
      const text = String(statement.text || '');
      if (/\b(advanced|expert|proficient|proficiency|\d+\+?\s+years?|years?\s+of\s+experience|led|leadership|owned|ownership)\b/i.test(text) || /\b(increased|improved|reduced|grew)\b.*\d+(?:\.\d+)?\s*(%|percent|users|customers|revenue|hours|dollars?)/i.test(text)) findings.push(finding('claim_scope_compliance', 'bounded-wording', 'error', 'Generated wording asserts a blocked proficiency, duration, ownership, leadership, or quantified outcome.', { statement_id: statement.statement_id, text }));
    }
    const key = normal(statement.text);
    if (key) duplicates.set(key, [...(duplicates.get(key) || []), statement.statement_id]);
  }
  const renderedSelections = new Map();
  for (const { section, statement } of visibleStatements(artifact)) if (!sourceStatement(statement)) for (const selectionId of statement.resume_content_selection_ids || []) renderedSelections.set(selectionId, [...(renderedSelections.get(selectionId) || []), section.section]);
  for (const selection of plan.resume_content_selections.filter((item) => item.selection_state === 'include')) {
    const sections = renderedSelections.get(selection.id) || [];
    if (!sections.length) {
      findings.push(finding('plan_completeness', 'included-selection-rendered', 'critical', 'Every included Resume Content Selection must render in generated visible output.', { selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, recommended_section: selection.recommended_section }));
      continue;
    }
    const allowed = (section) => section === selection.recommended_section || (section === 'Professional Summary' && selection.permitted_claim_scope.includes('cross_section_summary'));
    if (!sections.every(allowed)) findings.push(finding('plan_completeness', 'included-selection-section', 'critical', 'An included Resume Content Selection rendered outside its permitted section.', { selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, recommended_section: selection.recommended_section, actual_sections: sections }));
  }
  for (const [text, ids] of duplicates) if (ids.length > 1) findings.push(finding('duplication_consistency', 'duplicate-visible-claim', 'warning', 'Duplicate visible claim detected.', { normalized_text: text, statement_ids: ids }));
  const actualOrder = (artifact.content.sections || []).filter((section) => section.statements?.length && !['Applicant Header', 'Education', 'Certifications'].includes(section.section)).map((section) => section.section);
  const plannedOrder = plan.section_plans.map((section) => section.section).filter((section) => actualOrder.includes(section));
  if (actualOrder.filter((section) => plannedOrder.includes(section)).join('|') !== plannedOrder.join('|')) findings.push(finding('plan_compliance', 'section-order', 'warning', 'Generated section ordering differs from the approved plan.', { expected: plannedOrder, actual: actualOrder }));
  if (!artifact.metadata || !Array.isArray(artifact.metadata.omissions) || !Array.isArray(artifact.metadata.blocked_claims) || !Array.isArray(artifact.metadata.requirement_coverage)) findings.push(finding('artifact_completeness', 'traceability-metadata', 'error', 'Artifact metadata must retain omissions, blocked claims, and requirement coverage.'));
  validateSourceComposition({ artifact, plan, findings });
  return { findings };
}

function statusFor(findings) {
  if (findings.some((item) => item.severity === 'error' || item.severity === 'critical')) return 'failed';
  if (findings.some((item) => item.severity === 'warning')) return 'passed_with_warnings';
  return 'passed';
}

module.exports = { POLICY_VERSION, validate, statusFor, validateSourceComposition };
