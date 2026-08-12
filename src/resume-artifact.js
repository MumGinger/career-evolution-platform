const composition = require('./resume-composition');
composition.installRuntimeBoundaries();

const POLICY_VERSION = 'resume-artifact-generation-policy/1.2.0';
const FORMAT_VERSION = 'resume-artifact-model/1.0.0';

const SECTIONS = ['Applicant Header', 'Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'];
const GENERATED_SECTIONS = SECTIONS.filter((name) => name !== 'Applicant Header');

function scalar(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : null; }
function normal(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }
function displayValue(fact) {
  if (fact?.display_value) return fact.display_value;
  const value = fact?.value || fact?.canonical_value || {};
  if (fact?.entity_type === 'project' && scalar(value.name) && scalar(value.text) && value.name !== value.text) return `${value.name}: ${value.text}`;
  for (const key of ['name', 'title', 'credential', 'degree', 'program']) if (scalar(value[key])) return scalar(value[key]);
  const pair = [value.organization, value.role].map(scalar).filter(Boolean);
  if (pair.length) return pair.join(' — ');
  const strings = Object.values(value).map(scalar).filter(Boolean);
  return strings.join(' — ');
}
function sourceValues(fact, template = null) {
  const value = fact?.value || fact?.canonical_value || {};
  if (template === 'bounded_project_responsibilities' || template === 'bounded_responsibility' || template === 'accepted_achievement_detail') return [value.text].filter((item) => scalar(item)).map(String);
  if (template === 'project_name' || template === 'skill_name') return [value.name].filter((item) => scalar(item)).map(String);
  return [...new Set([fact?.display_value, value.name, value.title, value.text, value.credential, value.degree, value.program, displayValue(fact)].filter((item) => scalar(item)).map(String))];
}
function templateFor(selection, fact) {
  if (selection.recommended_section === 'Skills') return 'skill_name';
  if (selection.recommended_section === 'Projects') return fact?.value?.text && fact.value.text !== fact.value.name ? 'bounded_project_responsibilities' : 'project_name';
  if (selection.recommended_section === 'Experience' && fact?.entity_type === 'responsibility') return 'bounded_responsibility';
  if (selection.recommended_section === 'Experience') return fact?.entity_type === 'achievement' ? 'accepted_achievement_detail' : 'accepted_fact_detail';
  return 'accepted_fact_detail';
}
function renderedValue(fact, template) {
  const values = sourceValues(fact, template);
  return values[0] || displayValue(fact);
}
function renderStatement(selection, fact) {
  const template = templateFor(selection, fact);
  if (!selection.permitted_claim_scope.includes(template)) return null;
  const text = renderedValue(fact, template);
  if (!text) return null;
  return {
    statement_id: `statement:${selection.id}`,
    template,
    text,
    display_style: 'bullet',
    content_origin: 'candidate_knowledge_generated',
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
  return GENERATED_SECTIONS.map((name, position) => ({ section: name, position: position + 1, placeholder: null, statements: (sections.get(name) || []).map((item, index) => {
    const factIds = [...new Set(item.candidate_fact_ids || [])]; const linked = factIds.map((id) => selections.get(id)).filter(Boolean);
    const first = linked[0]; const fact = facts.get(first?.candidate_fact_id);
    return { statement_id: `draft:${name}:${index + 1}`, template: templateFor(first || {}, fact || {}), text: item.text, display_style: 'bullet', content_origin: 'candidate_knowledge_generated', resume_content_selection_ids: linked.map((selection) => selection.id), provenance: { candidate_fact_id: first?.candidate_fact_id || null, candidate_fact_revision: first?.candidate_fact_revision || null, candidate_fact_ids: factIds, job_requirement_ids: item.job_requirement_ids || [], inherited_provenance_references: linked.flatMap((selection) => selection.inherited_provenance_references || []) } };
  }) }));
}
function sameSet(left, right) { return left.length === right.length && new Set(left).size === left.length && left.every((item) => right.includes(item)); }
function crossSectionSummary(selection, section) { return section === 'Professional Summary' && selection.permitted_claim_scope.includes('cross_section_summary'); }
function providerSelectionSetKey(statement) {
  return [...new Set(statement.resume_content_selection_ids || [])].sort().join('\u001f');
}
function providerStatementPriority(statement, selections) {
  return Math.max(0, ...(statement.resume_content_selection_ids || []).map((id) => selections.get(id)?.priority_score || 0));
}
function completedProviderSections(providerSections, plan, facts) {
  const selections = new Map(plan.resume_content_selections.map((selection) => [selection.id, selection]));
  const droppedAlternatives = [];
  const sections = providerSections.map((section) => {
    const seenSelectionSets = new Set();
    let statements = section.statements.filter((statement) => {
      const linked = statement.resume_content_selection_ids.map((id) => selections.get(id)).filter(Boolean);
      const factIds = statement.provenance?.candidate_fact_ids || [];
      const valid = linked.length === statement.resume_content_selection_ids.length
        && linked.length > 0
        && linked.every((selection) => selection.selection_state === 'include' && (selection.recommended_section === section.section || crossSectionSummary(selection, section.section)))
        && sameSet(factIds, linked.map((selection) => selection.candidate_fact_id));
      if (!valid) return false;
      const selectionSetKey = providerSelectionSetKey(statement);
      if (seenSelectionSets.has(selectionSetKey)) {
        droppedAlternatives.push({
          section: section.section,
          statement_id: statement.statement_id,
          resume_content_selection_ids: [...statement.resume_content_selection_ids],
          reason: 'duplicate_provider_alternative_for_selection_set',
        });
        return false;
      }
      seenSelectionSets.add(selectionSetKey);
      return true;
    });
    if (section.section === 'Professional Summary' && statements.length > 1) {
      statements = [...statements].sort((left, right) =>
        providerStatementPriority(right, selections) - providerStatementPriority(left, selections)
          || left.statement_id.localeCompare(right.statement_id));
      for (const dropped of statements.slice(1)) {
        droppedAlternatives.push({
          section: section.section,
          statement_id: dropped.statement_id,
          resume_content_selection_ids: [...dropped.resume_content_selection_ids],
          reason: 'summary_statement_limit',
        });
      }
      statements = statements.slice(0, 1);
    }
    return { ...section, statements };
  });
  const renderedInPrimarySection = new Set(sections.flatMap((section) =>
    section.statements.flatMap((statement) => (statement.resume_content_selection_ids || []).filter((selectionId) =>
      selections.get(selectionId)?.recommended_section === section.section))));
  const fallbacks = []; const failures = [];
  for (const selection of plan.resume_content_selections.filter((item) => item.selection_state === 'include' && !renderedInPrimarySection.has(item.id))) {
    const statement = renderStatement(selection, facts.get(selection.candidate_fact_id));
    if (!statement) { failures.push({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, recommended_section: selection.recommended_section, reason: 'deterministic_completion_unrenderable' }); continue; }
    const section = sections.find((item) => item.section === selection.recommended_section);
    if (section) section.statements.push(statement);
    else sections.push({ section: selection.recommended_section, position: GENERATED_SECTIONS.indexOf(selection.recommended_section) + 1, placeholder: null, statements: [statement] });
    fallbacks.push({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, recommended_section: selection.recommended_section, reason: 'provider_omitted_included_selection' });
  }
  return { sections: sections.sort((left, right) => left.position - right.position), fallbacks, failures, droppedAlternatives };
}

function matchableGenerated(statement, facts) {
  const factIds = statement.provenance?.candidate_fact_ids || [];
  return factIds.flatMap((id) => sourceValues(facts.get(id), statement.template)).map(normal).filter(Boolean);
}

function replacementWithSourceStructure(statement, sourceStatement) {
  const sourceStatementId = sourceStatement.source_statement_id || sourceStatement.statement_id;
  return {
    ...statement,
    display_style: sourceStatement.display_style || statement.display_style,
    source_statement_id: sourceStatementId,
    parent_source_statement_id: sourceStatement.parent_source_statement_id || null,
  };
}

function explicitSourceOmissions(plan, facts) {
  const byValue = new Map();
  for (const selection of plan.resume_content_selections.filter((item) => item.selection_state === 'omit')) {
    const fact = facts.get(selection.candidate_fact_id);
    for (const value of sourceValues(fact)) {
      const key = normal(value);
      if (!key) continue;
      byValue.set(key, [...(byValue.get(key) || []), selection]);
    }
  }
  return byValue;
}

function composeSections(generatedSections, plan, facts) {
  const source = plan.source_resume_snapshot;
  if (!source?.sections?.length) return {
    sections: generatedSections,
    composition: { policy_version: composition.POLICY_VERSION, source_resume_snapshot: null, source_statement_count: 0, preserved_source_statement_ids: [], superseded_source_statements: [], omitted_source_statements: [], generated_statement_count: generatedSections.flatMap((item) => item.statements).length },
  };
  const generatedBySection = new Map(generatedSections.map((section) => [section.section, section]));
  const sourceBySection = new Map(source.sections.map((section) => [section.section, section]));
  const explicitOmissions = explicitSourceOmissions(plan, facts);
  const preserved = [];
  const superseded = [];
  const omittedSourceStatements = [];
  const usedGenerated = new Set();
  const sections = SECTIONS.map((name, index) => {
    const generated = generatedBySection.get(name) || { section: name, position: index + 1, placeholder: null, statements: [] };
    const sourceSection = sourceBySection.get(name) || { statements: [] };
    const sourceStatements = sourceSection.statements || [];

    if (name === 'Professional Summary' && generated.statements.length) {
      const generatedIds = generated.statements.map((statement) => statement.statement_id);
      for (const sourceStatement of sourceStatements) {
        superseded.push({
          source_statement_id: sourceStatement.source_statement_id || sourceStatement.statement_id,
          generated_statement_ids: generatedIds,
          reason: 'supported_job_specific_summary_replacement',
        });
      }
      for (const statement of generated.statements) usedGenerated.add(statement.statement_id);
      return { section: name, position: index + 1, placeholder: null, statements: generated.statements };
    }

    const statements = [];
    const omissionFor = (sourceStatement) => explicitOmissions.get(normal(sourceStatement.text)) || [];
    const sourceId = (sourceStatement) => sourceStatement.source_statement_id || sourceStatement.statement_id;
    const shouldOmitHeading = (sourceStatement) => {
      const selections = omissionFor(sourceStatement);
      if (!selections.length || sourceStatement.display_style !== 'heading') return false;
      const children = sourceStatements.filter((child) => child.parent_source_statement_id === sourceId(sourceStatement));
      return !children.length || children.every((child) => omissionFor(child).length > 0);
    };
    for (const sourceStatement of sourceStatements) {
      const sourceKey = normal(sourceStatement.text);
      const omittedSelections = omissionFor(sourceStatement);
      const omit = omittedSelections.length > 0
        && (sourceStatement.display_style !== 'heading' || shouldOmitHeading(sourceStatement));
      if (omit) {
        omittedSourceStatements.push({
          source_statement_id: sourceId(sourceStatement),
          resume_content_selection_ids: omittedSelections.map((selection) => selection.id),
          reason: 'explicit_role_specific_omission',
        });
        continue;
      }
      const replacements = generated.statements.filter((statement) => !usedGenerated.has(statement.statement_id) && matchableGenerated(statement, facts).includes(sourceKey));
      if (replacements.length) {
        replacements.forEach((statement) => { statements.push(replacementWithSourceStructure(statement, sourceStatement)); usedGenerated.add(statement.statement_id); });
        superseded.push({ source_statement_id: sourceId(sourceStatement), generated_statement_ids: replacements.map((statement) => statement.statement_id), reason: 'supported_tailored_replacement' });
      } else {
        statements.push({ ...sourceStatement, statement_id: sourceStatement.statement_id || sourceStatement.source_statement_id, source_statement_id: sourceId(sourceStatement), resume_content_selection_ids: [] });
        preserved.push(sourceId(sourceStatement));
      }
    }
    for (const statement of generated.statements) if (!usedGenerated.has(statement.statement_id)) { statements.push(statement); usedGenerated.add(statement.statement_id); }
    return { section: name, position: index + 1, placeholder: generated.placeholder || null, statements };
  });
  return {
    sections,
    composition: {
      policy_version: composition.POLICY_VERSION,
      source_resume_snapshot: {
        format: source.format,
        source_resume_artifact_id: source.source_resume_artifact_id,
        source_resume_artifact_version_id: source.source_resume_artifact_version_id,
        resume_semantic_run_id: source.resume_semantic_run_id,
      },
      source_statement_count: source.sections.flatMap((section) => section.statements || []).length,
      preserved_source_statement_ids: preserved,
      superseded_source_statements: superseded,
      omitted_source_statements: omittedSourceStatements,
      generated_statement_count: generatedSections.flatMap((section) => section.statements || []).length,
    },
  };
}

function generate(plan, presentationStrategy = null, draftResult = null) {
  const facts = new Map(plan.candidate_knowledge_snapshot.map((fact) => [fact.id, fact]));
  const order = new Map((presentationStrategy?.ordered_resume_content_selection_ids || []).map((id, index) => [id, index]));
  const visibleSelections = plan.resume_content_selections.filter((selection) => selection.selection_state === 'include');
  const deterministicSections = GENERATED_SECTIONS.map((name, position) => ({
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
  const completion = providerSections ? completedProviderSections(providerSections, plan, facts) : { sections: deterministicSections, fallbacks: [], failures: [], droppedAlternatives: [] };
  const composed = composeSections(completion.sections, plan, facts);
  const sections = composed.sections;
  const rendered = sections.flatMap((section) => section.statements);
  const omissions = plan.resume_content_selections
    .filter((selection) => selection.selection_state !== 'include')
    .map((selection) => ({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, state: selection.selection_state, rationale: selection.relevance_rationale }));
  const blockedClaims = plan.resume_content_selections
    .filter((selection) => selection.blocked_claim_scopes.length)
    .map((selection) => ({ resume_content_selection_id: selection.id, candidate_fact_id: selection.candidate_fact_id, blocked_claim_scopes: selection.blocked_claim_scopes }));
  return {
    format: FORMAT_VERSION,
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
      dropped_provider_alternatives: completion.droppedAlternatives,
      composition: composed.composition,
      limitations: 'Generated claims contain only values permitted by a Resume Content Selection. Unchanged source-resume passthrough is preserved verbatim unless an exact source statement is linked to an explicit role-specific omit selection; supported generated Professional Summary statements replace the broad source Summary and are recorded as superseded source content. Cross-section Summary use is supplemental: every included selection still renders in its primary approved section. These composition decisions never write Candidate Knowledge.',
    },
    rendered_statement_count: rendered.length,
  };
}

module.exports = { POLICY_VERSION, FORMAT_VERSION, SECTIONS, generate, composeSections };