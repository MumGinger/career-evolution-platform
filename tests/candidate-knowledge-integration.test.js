const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'candidate-knowledge-integration-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function acceptedDiscovery(store) {
  const profile = store.createProfile({ name: 'Synthetic Candidate' });
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' });
  const needs = store.createInformationNeedRun({ candidateProfileId: profile.id, jobRequirementProfileId: job.id });
  const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
  const plan = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id });
  const action = plan.acquisition_plans[0].acquisition_actions[0];
  const result = store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: [{ actionId: action.id, rawCapturedEvidence: { text: 'Candidate confirmed SQL use.' } }] });
  return { profile, discovery: result, source: result.acquisition_results[0] };
}
function sqlProposal(source, more = {}) { return { entityType: 'skill', value: { name: 'SQL' }, displayValue: 'SQL', confirmationStatus: 'confirmed', confidenceLevel: 'high', sourceEvidenceRefs: [{ type: 'acquisition_result', id: source.id, positiveConfirmation: true }], ...more }; }

test('1: confirmed SQL evidence creates one accepted Candidate Fact with decision and provenance', () => withStore((store) => {
  const { profile, discovery, source } = acceptedDiscovery(store);
  const run = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [sqlProposal(source)] });
  assert.equal(run.integration_decisions[0].state, 'accepted'); assert.equal(run.applied_facts.length, 1);
  assert.equal(store.getCommittedCandidateKnowledge(profile.id)[0].integration_decision_id, run.integration_decisions[0].id);
}));
test('2: duplicate integration adds evidence link and no second fact', () => withStore((store) => {
  const { profile, discovery, source } = acceptedDiscovery(store); store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [sqlProposal(source)] });
  const second = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [sqlProposal(source)] });
  assert.equal(second.integration_decisions[0].state, 'duplicate'); assert.equal(second.applied_facts.length, 0); assert.equal(store.getCommittedCandidateKnowledge(profile.id).length, 1);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM candidate_fact_evidence_links').get().count, 1);
}));
test('3: ambiguous or unbounded text needs no Candidate Fact', () => withStore((store) => {
  const { profile, discovery, source } = acceptedDiscovery(store); const run = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [{ ...sqlProposal(source), value: { proficiency: 'advanced', name: 'SQL' } }] });
  assert.equal(run.integration_decisions[0].state, 'rejected'); assert.equal(run.applied_facts.length, 0);
}));
test('4: captured raw result requires positive confirmation', () => withStore((store) => {
  const { profile } = acceptedDiscovery(store); const job = store.createJobRequirementProfile({ company: 'B', roleTitle: 'Analyst', jobDescription: 'Python required.' }); const needs = store.createInformationNeedRun({ candidateProfileId: profile.id, jobRequirementProfileId: job.id }); const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id }); const plan = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id }); const action = plan.acquisition_plans[0].acquisition_actions[0]; const result = store.createAcquisitionResultRun({ acquisitionPlanRunId: plan.id, captures: [{ actionId: action.id, rawCapturedEvidence: { text: 'Used Python.' } }] });
  const run = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: result.id, proposals: [{ entityType: 'skill', value: { name: 'Python' }, confirmationStatus: 'confirmed', sourceEvidenceRefs: [{ type: 'acquisition_result', id: result.acquisition_results[0].id }] }] });
  assert.equal(run.integration_decisions[0].state, 'needs_confirmation'); assert.equal(run.applied_facts.length, 0);
}));
test('5: material years conflict is retained as a conflicting decision and never overwrites', () => withStore((store) => { const { profile, discovery, source } = acceptedDiscovery(store); const run = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [{ ...sqlProposal(source), value: { name: 'SQL', years: 8 }, materialConflict: true }] }); assert.equal(run.integration_decisions[0].state, 'conflicting'); assert.equal(run.applied_facts.length, 0); }));
test('6: later stronger compatible fact extends while preserving a revision relationship', () => withStore((store) => { const { profile, discovery, source } = acceptedDiscovery(store); const first = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [{ ...sqlProposal(source), entityType: 'domain_knowledge', value: { name: 'analytics' } }] }); const second = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [{ ...sqlProposal(source), entityType: 'domain_knowledge', value: { name: 'analytics engineering' }, relation: 'extends', priorFactId: first.applied_facts[0].id }] }); assert.equal(second.integration_decisions[0].state, 'accepted'); assert.equal(store.db.prepare('SELECT relation FROM candidate_fact_revisions').get().relation, 'extends'); }));
test('7: rejected, deferred, and needs-confirmation decisions write no facts', () => withStore((store) => { const { profile, discovery, source } = acceptedDiscovery(store); const run = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [{ ...sqlProposal(source), confirmationStatus: 'needs_confirmation' }, { ...sqlProposal(source), entityType: 'project', value: { name: 'X' }, relation: 'extends' }, { entityType: 'skill', value: {}, sourceEvidenceRefs: [] }] }); assert.deepEqual(run.integration_decisions.map((item) => item.state), ['needs_confirmation', 'rejected', 'rejected']); assert.equal(run.applied_facts.length, 0); }));
test('8: only 003.6 creates committed Candidate Knowledge facts', () => withStore((store) => { const { profile, discovery, source } = acceptedDiscovery(store); assert.equal(store.getCommittedCandidateKnowledge(profile.id).length, 0); store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [sqlProposal(source)] }); assert.equal(store.getCommittedCandidateKnowledge(profile.id).length, 1); }));
test('9: re-runs are immutable independent integration records', () => withStore((store) => { const { profile, discovery, source } = acceptedDiscovery(store); const one = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [sqlProposal(source)] }); const two = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [sqlProposal(source)] }); assert.notEqual(one.id, two.id); assert.equal(store.getCandidateKnowledgeIntegrationRun(one.id).integration_decisions[0].state, 'accepted'); assert.equal(store.getCandidateKnowledgeIntegrationRun(two.id).integration_decisions[0].state, 'duplicate'); }));
test('10: supersede preserves the prior fact', () => withStore((store) => { const { profile, discovery, source } = acceptedDiscovery(store); const one = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [{ ...sqlProposal(source), entityType: 'domain_knowledge', value: { name: 'reporting' } }] }); store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: discovery.id, proposals: [{ ...sqlProposal(source), entityType: 'domain_knowledge', value: { name: 'business intelligence reporting' }, relation: 'supersedes', priorFactId: one.applied_facts[0].id }] }); assert.equal(store.getCommittedCandidateKnowledge(profile.id).length, 2); assert.equal(store.db.prepare('SELECT relation FROM candidate_fact_revisions').get().relation, 'supersedes'); }));
