const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acquisition-execution-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function setup(store, description = 'Required Qualifications:\nSQL required.') {
  const knowledge = store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic' }, facts: [] });
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: description });
  const needs = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
  const plan = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id });
  return { knowledge, plan };
}
function capturesFor(plan, evidence = { statement: 'Candidate supplied a raw SQL project description.' }) {
  return plan.acquisition_plans.flatMap((item) => item.acquisition_actions.map((action) => ({ actionId: action.id, rawCapturedEvidence: evidence, sourceType: 'candidate_local_input', provenance: { channel: 'local_cli', supplied_by: 'candidate' } })));
}

test('persists immutable Acquisition Result Runs with raw evidence and action provenance without changing Candidate Knowledge', () => withStore((store) => {
  const { knowledge, plan } = setup(store);
  const before = store.getCandidateKnowledge(knowledge.profile.id);
  const first = store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: capturesFor(plan) });
  const second = store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: capturesFor(plan, { statement: 'A later independent capture.' }) });
  assert.notEqual(first.id, second.id);
  assert.equal(first.acquisition_plan_run_id, plan.id);
  assert.equal(first.execution_adapter_version, 'deterministic-local-acquisition-execution/1.0.0');
  assert.equal(first.acquisition_results.length, 1);
  assert.equal(first.acquisition_results[0].execution_status, 'captured');
  assert.deepEqual(first.acquisition_results[0].raw_captured_evidence, { statement: 'Candidate supplied a raw SQL project description.' });
  assert.equal(first.acquisition_results[0].source_type, 'candidate_local_input');
  assert.deepEqual(first.acquisition_results[0].provenance, { channel: 'local_cli', supplied_by: 'candidate' });
  assert.deepEqual(store.getCandidateKnowledge(knowledge.profile.id), before);
}));

test('records one explicit deterministic outcome per planned action and rejects planning or action-reference violations', () => withStore((store) => {
  const { plan } = setup(store, 'Required Qualifications:\nSQL and Python required.');
  const actions = plan.acquisition_plans.flatMap((item) => item.acquisition_actions);
  assert.equal(actions.length, 1);
  const skipped = store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: [{ actionId: actions[0].id, executionStatus: 'skipped', limitations: 'Candidate chose not to provide evidence in this local run.' }] });
  assert.equal(skipped.acquisition_results[0].raw_captured_evidence, null);
  assert.equal(skipped.acquisition_results[0].execution_status, 'skipped');
  assert.throws(() => store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: [] }), /requires exactly one/);
  assert.throws(() => store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: [{ actionId: 'unplanned-action', rawCapturedEvidence: {} }] }), /must reference/);
  assert.throws(() => store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: [{ actionId: actions[0].id, executionStatus: 'captured' }] }), /require rawCapturedEvidence/);
}));
