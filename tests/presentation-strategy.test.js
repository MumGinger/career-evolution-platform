const test = require('node:test');
const assert = require('node:assert/strict');
const strategy = require('../src/presentation-strategy');

test('uses shared understanding as explainable context without creating a resume claim', () => {
  const plan = { resume_content_selections: [{ id: 'selection-sql', candidate_fact_id: 'fact-sql', candidate_fact_revision: 'fact-sql', mapped_requirement_ids: ['requirement-sql'], selection_state: 'include', priority_score: 12, inherited_provenance_references: ['integration-sql'] }] };
  const job = { id: 'job-profile', version: 1, snapshot: { company: 'Northstar', role_title: 'Data Analyst' } };
  const snapshot = { id: 'snapshot-1', current_direction: { label: 'Data Analytics' }, unknowns: ['Preferred work style'] };
  const result = strategy.create({ plan, job, snapshot, reflectionRun: { id: 'reflection-1', action: 'looks_right' }, curiosityResult: { status: 'available', possibility: { id: 'business-intelligence-analyst' } }, curiosityObservation: { id: 'curiosity-1' } });
  assert.deepEqual(result.ordered_resume_content_selection_ids, ['selection-sql']);
  assert.equal(result.presentation_decisions[0].candidate_fact_id, 'fact-sql');
  assert.match(result.presentation_decisions[0].rationale, /does not add/);
  assert.equal(result.shared_understanding.context[0].value, 'Data Analytics');
  assert.equal(result.shared_understanding.exclusions[0].state, 'not_used_for_resume_claims');
  assert.match(result.limitations, /never turns Career Understanding/);
});
