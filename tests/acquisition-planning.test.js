const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acquisition-planning-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function fact(name, confirmation_status = 'confirmed') { return { entity_type: 'skill', value: { name }, confirmation_status }; }
function setup(store, description, facts = []) { const knowledge = store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic' }, facts }); const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: description }); const needs = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id }); const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id }); return { knowledge, needs, discovery }; }

test('persists an immutable, explainable plan run without changing Candidate Knowledge', () => withStore((store) => {
  const { knowledge, needs, discovery } = setup(store, 'Required Qualifications:\nSQL required.');
  const before = store.getCandidateKnowledge(knowledge.profile.id);
  const first = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id });
  const second = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id });
  assert.notEqual(first.id, second.id);
  assert.equal(first.acquisition_plans.length, 1);
  assert.equal(first.acquisition_plans[0].strategy, 'request_new_evidence');
  assert.equal(first.acquisition_plans[0].acquisition_actions[0].action_type, 'request_supporting_evidence');
  assert.match(first.acquisition_plans[0].rationale, /Expected information gain/);
  assert.deepEqual(store.getCandidateKnowledge(knowledge.profile.id), before);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name LIKE '%question%'").get().count, 0);
}));

test('recovery and conflict results select deterministic strategies distinct from actions', () => withStore((store) => {
  const confirmation = setup(store, 'Required Qualifications:\nSQL required.', [fact('SQL', 'needs_confirmation')]);
  const confirmPlan = store.createAcquisitionPlanRun({ informationNeedRunId: confirmation.needs.id, evidenceDiscoveryRunId: confirmation.discovery.id }).acquisition_plans[0];
  assert.equal(confirmPlan.strategy, 'recover_project_details');
  assert.equal(confirmPlan.acquisition_actions[0].action_type, 'recover_resume_project_context');
  const conflict = setup(store, 'Required Qualifications:\nAt least 3 years of experience.', [
    { entity_type: 'experience', value: { name: 'Two years', years_of_experience: 2 }, confirmation_status: 'confirmed' },
    { entity_type: 'experience', value: { name: 'Five years', years_of_experience: 5 }, confirmation_status: 'confirmed' },
  ]);
  const conflictPlan = store.createAcquisitionPlanRun({ informationNeedRunId: conflict.needs.id, evidenceDiscoveryRunId: conflict.discovery.id }).acquisition_plans[0];
  assert.equal(conflictPlan.strategy, 'resolve_conflict');
  assert.equal(conflictPlan.acquisition_actions[0].action_type, 'reconcile_conflicting_evidence');
}));

test('groups compatible unresolved needs under one shared acquisition action', () => withStore((store) => {
  const { needs, discovery } = setup(store, 'Required Qualifications:\nSQL and Python required.');
  const planRun = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id });
  assert.equal(planRun.acquisition_plans.length, 1);
  assert.equal(planRun.acquisition_plans[0].information_needs.length, 2);
  assert.match(planRun.acquisition_plans[0].acquisition_actions[0].rationale, /2 compatible/);
}));

test('rejects mismatched input runs and skips needs already sufficient after discovery', () => withStore((store) => {
  const first = setup(store, 'Required Qualifications:\nSQL required.');
  const second = setup(store, 'Required Qualifications:\nPython required.');
  assert.throws(() => store.createAcquisitionPlanRun({ informationNeedRunId: first.needs.id, evidenceDiscoveryRunId: second.discovery.id }), /must belong/);
  const knowledge = store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic' }, facts: [fact('SQL')] });
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' });
  const sufficientNeeds = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.throws(() => store.createEvidenceDiscoveryRun({ informationNeedRunId: sufficientNeeds.id }), /no unresolved/);
}));
