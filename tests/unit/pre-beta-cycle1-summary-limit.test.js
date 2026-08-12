const test = require('node:test');
const assert = require('node:assert/strict');

const artifactGeneration = require('../../src/resume-artifact');

function selection(id, fact, priority) {
  return {
    id,
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    mapped_requirement_ids: [`req-${id}`],
    selection_state: 'include',
    relevance_rationale: 'Target-role evidence.',
    inherited_provenance_references: [fact.integration_decision_id],
    recommended_section: 'Experience',
    emphasis_level: priority >= 15 ? 'high' : 'medium',
    priority_score: priority,
    permitted_claim_scope: ['bounded_responsibility', 'cross_section_summary'],
    blocked_claim_scopes: [],
    limitations: '',
  };
}

test('Professional Summary keeps only the highest-priority supported provider statement', () => {
  const high = {
    id: 'fact-high',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI dashboards for business reporting.' },
    integration_decision_id: 'decision-high',
  };
  const medium = {
    id: 'fact-medium',
    entity_type: 'responsibility',
    value: { text: 'Used Git for collaborative project workflows.' },
    integration_decision_id: 'decision-medium',
  };
  const plan = {
    id: 'plan-summary-limit',
    job_requirement_profile_id: 'job-summary-limit',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [high, medium],
    source_resume_snapshot: null,
    resume_content_selections: [
      selection('high', high, 20),
      selection('medium', medium, 12),
    ],
    requirement_coverage: [
      { job_requirement_id: 'req-high', coverage_status: 'covered', coverage_rationale: 'Supported.' },
      { job_requirement_id: 'req-medium', coverage_status: 'covered', coverage_rationale: 'Supported.' },
    ],
    section_plans: [{ section: 'Experience', recommended_order: 1, candidate_fact_ids: [high.id, medium.id] }],
  };
  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.1.0',
    draft: {
      sections: [{
        section: 'Professional Summary',
        statements: [
          { text: 'Collaborative candidate with Git workflow experience.', candidate_fact_ids: [medium.id], job_requirement_ids: ['req-medium'] },
          { text: 'Data analytics candidate with Power BI dashboard experience.', candidate_fact_ids: [high.id], job_requirement_ids: ['req-high'] },
        ],
      }],
    },
  };

  const artifact = artifactGeneration.generate(plan, null, provider);
  const summary = artifact.sections.find((section) => section.section === 'Professional Summary');

  assert.deepEqual(summary.statements.map((statement) => statement.text), [
    'Data analytics candidate with Power BI dashboard experience.',
  ]);
  assert.equal(
    artifact.metadata.dropped_provider_alternatives.some((item) =>
      item.reason === 'summary_statement_limit'
        && item.statement_id === 'draft:Professional Summary:1'),
    true,
  );
});
