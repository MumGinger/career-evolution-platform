const test = require('node:test');
const assert = require('node:assert/strict');

const artifactGeneration = require('../../src/resume-artifact');

function sourceSummary() {
  return {
    format: 'source-resume-composition/1.0.0',
    source_resume_artifact_id: 'source-summary',
    source_resume_artifact_version_id: 'source-summary-v1',
    resume_semantic_run_id: 'semantic-summary',
    sections: [{
      section: 'Professional Summary',
      statements: [{
        statement_id: 'source:summary-1',
        source_statement_id: 'source:summary-1',
        text: 'Seeking internship roles in finance, data analytics, quantitative finance, and software engineering.',
        section: 'Professional Summary',
        position: 1,
        display_style: 'line',
        content_origin: 'source_resume_passthrough',
        resume_content_selection_ids: [],
        parent_source_statement_id: null,
        provenance: { source_kind: 'validated_resume_understanding' },
      }],
    }],
  };
}

test('supported job-specific generated summary supersedes the broad source summary instead of appending to it', () => {
  const fact = {
    id: 'fact-analytics',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI dashboards and automated reporting workflows for business analysis.' },
    integration_decision_id: 'decision-analytics',
  };
  const plan = {
    id: 'plan-summary',
    job_requirement_profile_id: 'job-zurich',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [fact],
    source_resume_snapshot: sourceSummary(),
    resume_content_selections: [{
      id: 'selection-analytics',
      candidate_fact_id: fact.id,
      candidate_fact_revision: fact.id,
      mapped_requirement_ids: ['requirement-data-analytics'],
      selection_state: 'include',
      relevance_rationale: 'Directly supports the target Data Analytics & AI role.',
      inherited_provenance_references: [fact.integration_decision_id],
      recommended_section: 'Experience',
      emphasis_level: 'high',
      priority_score: 20,
      permitted_claim_scope: ['bounded_responsibility', 'cross_section_summary'],
      blocked_claim_scopes: [],
      limitations: '',
    }],
    requirement_coverage: [{ job_requirement_id: 'requirement-data-analytics', coverage_status: 'covered', coverage_rationale: 'Explicit evidence.' }],
    section_plans: [{ section: 'Experience', recommended_order: 1, candidate_fact_ids: [fact.id] }],
  };
  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.0.0',
    draft: {
      sections: [{
        section: 'Professional Summary',
        statements: [{
          text: 'Data analytics candidate with Power BI dashboard and reporting automation experience.',
          candidate_fact_ids: [fact.id],
          job_requirement_ids: ['requirement-data-analytics'],
        }],
      }],
    },
  };

  const artifact = artifactGeneration.generate(plan, null, provider);
  const summary = artifact.sections.find((section) => section.section === 'Professional Summary');

  assert.deepEqual(summary.statements.map((statement) => statement.text), [
    'Data analytics candidate with Power BI dashboard and reporting automation experience.',
  ]);
  assert.equal(
    artifact.metadata.composition.superseded_source_statements.some((item) =>
      item.source_statement_id === 'source:summary-1'
        && item.reason === 'supported_job_specific_summary_replacement'),
    true,
  );
});
