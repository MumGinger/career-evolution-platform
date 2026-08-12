const test = require('node:test');
const assert = require('node:assert/strict');
const artifactGeneration = require('../../src/resume-artifact');

function sourceStatement(id, text, section, style, parent = null) {
  return {
    statement_id: id,
    source_statement_id: id,
    text,
    section,
    position: 1,
    display_style: style,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: parent,
    provenance: { source_kind: 'validated_resume_understanding', exact_source_text: text },
  };
}

test('cross-section Summary is supplemental and does not consume the primary Experience rendering', () => {
  const fact = {
    id: 'fact-analytics',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI dashboards for business reporting.' },
    integration_decision_id: 'decision-analytics',
  };
  const selection = {
    id: 'selection-analytics',
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    mapped_requirement_ids: ['req-analytics'],
    selection_state: 'include',
    relevance_rationale: 'Directly relevant.',
    inherited_provenance_references: [fact.integration_decision_id],
    recommended_section: 'Experience',
    emphasis_level: 'high',
    priority_score: 20,
    permitted_claim_scope: ['bounded_responsibility', 'cross_section_summary'],
    blocked_claim_scopes: [],
    limitations: '',
  };
  const plan = {
    id: 'plan-primary-section',
    job_requirement_profile_id: 'job-primary-section',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [fact],
    source_resume_snapshot: {
      format: 'source-resume-composition/1.0.0',
      source_resume_artifact_id: 'source-primary',
      source_resume_artifact_version_id: 'source-primary-v1',
      resume_semantic_run_id: 'semantic-primary',
      sections: [
        { section: 'Professional Summary', statements: [sourceStatement('source:summary', 'Broad source summary.', 'Professional Summary', 'line')] },
        { section: 'Experience', statements: [
          sourceStatement('source:experience', 'Data Analyst — Example Co.', 'Experience', 'heading'),
          sourceStatement('source:experience-body', fact.value.text, 'Experience', 'bullet', 'source:experience'),
        ] },
      ],
    },
    resume_content_selections: [selection],
    requirement_coverage: [{ job_requirement_id: 'req-analytics', coverage_status: 'covered', coverage_rationale: 'Supported.' }],
    section_plans: [{ section: 'Experience', recommended_order: 1, candidate_fact_ids: [fact.id] }],
  };
  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.1.0',
    draft: {
      sections: [{
        section: 'Professional Summary',
        statements: [{
          text: 'Data analytics candidate with Power BI reporting experience.',
          candidate_fact_ids: [fact.id],
          job_requirement_ids: ['req-analytics'],
        }],
      }],
    },
  };

  const artifact = artifactGeneration.generate(plan, null, provider);
  const summary = artifact.sections.find((section) => section.section === 'Professional Summary');
  const experience = artifact.sections.find((section) => section.section === 'Experience');

  assert.equal(summary.statements.length, 1);
  assert.deepEqual(summary.statements[0].resume_content_selection_ids, [selection.id]);
  assert.equal(experience.statements.length, 2);
  assert.deepEqual(experience.statements[1].resume_content_selection_ids, [selection.id]);
  assert.equal(experience.statements[1].content_origin, 'candidate_knowledge_generated');
  assert.equal(
    artifact.metadata.draft_completion_fallbacks.some((item) =>
      item.resume_content_selection_id === selection.id
        && item.reason === 'provider_omitted_included_selection'),
    true,
  );
});
