const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-discovery-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function job(store, text = 'Required Qualifications:\nSQL required.') { return store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: text }); }
function resume(store, facts = [], skills = []) { return store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic Candidate', skills }, facts }); }
function profile(store, skills = []) { const candidate = store.createProfile({ name: 'Synthetic Candidate', skills }); return { profile: candidate, facts: [] }; }
function addResumeFact(store, profileId, value, confirmationStatus = 'confirmed') { const importId = store.id(); store.db.prepare('INSERT INTO resume_imports VALUES (?, ?, ?, ?)').run(importId, profileId, 'synthetic.pdf', store.now()); store.db.prepare('INSERT INTO candidate_facts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(store.id(), profileId, importId, 'skill', JSON.stringify({ name: value }), 'resume', 'parsed', confirmationStatus, store.now()); }
function fact(name, confirmation_status = 'confirmed', entity_type = 'skill', extra = {}) { return { entity_type, value: { name, ...extra }, confirmation_status }; }
function makeUnknownWithSnapshot(store, knowledge, profile, requirementName = 'SQL') {
  const informationRun = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: profile.id });
  const need = informationRun.information_needs.find((item) => item.normalized_name === requirementName);
  store.db.prepare("UPDATE information_needs SET status = 'unknown' WHERE id = ?").run(need.id);
  return store.getInformationNeedRun(informationRun.id);
}
function onlyResult(run) { assert.equal(run.need_results.length, 1); return run.need_results[0]; }

test('unknown SQL need with explicit confirmed profile skill is accepted, sufficient, and skips lower sources', () => withStore((store) => {
  const knowledge = profile(store, ['SQL']);
  const jobProfile = job(store);
  const informationRun = makeUnknownWithSnapshot(store, knowledge, jobProfile);
  const run = store.createEvidenceDiscoveryRun({ informationNeedRunId: informationRun.id });
  const result = onlyResult(run);
  assert.equal(result.sufficient, true);
  assert.equal(result.candidates[0].resolution.state, 'accepted_for_need');
  assert.deepEqual(run.source_searches.map((search) => search.result_status), ['completed_no_candidates', 'completed_with_candidates', 'skipped_sufficient', 'skipped_sufficient']);
}));

test('resume-derived confirmation-required evidence remains unresolved', () => withStore((store) => {
  const knowledge = resume(store, [fact('SQL', 'needs_confirmation')]);
  const profile = job(store);
  const informationRun = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: profile.id });
  const run = store.createEvidenceDiscoveryRun({ informationNeedRunId: informationRun.id });
  const result = onlyResult(run);
  assert.equal(result.terminal_status, 'unresolved_after_search');
  assert.equal(result.candidates[0].resolution.state, 'needs_confirmation');
}));

test('compatible profile skill and resume evidence are not conflicts and record deterministic sufficiency', () => withStore((store) => {
  const knowledge = profile(store, ['SQL']);
  addResumeFact(store, knowledge.profile.id, 'SQL');
  const jobProfile = job(store);
  const informationRun = makeUnknownWithSnapshot(store, knowledge, jobProfile);
  const run = store.createEvidenceDiscoveryRun({ informationNeedRunId: informationRun.id });
  const result = onlyResult(run);
  assert.equal(result.sufficient, true);
  assert.ok(result.candidates.every((item) => item.resolution.state !== 'conflicting'));
  assert.equal(run.source_searches.find((search) => search.source_type === 'resume_import').result_status, 'skipped_sufficient');
}));

test('materially incompatible structured evidence is conflicting and not sufficient', () => withStore((store) => {
  const knowledge = resume(store, [fact('Two years', 'confirmed', 'experience', { years_of_experience: 2 }), fact('Five years', 'confirmed', 'experience', { years_of_experience: 5 })]);
  const profile = job(store, 'Required Qualifications:\nAt least 3 years of experience.');
  const informationRun = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: profile.id });
  const run = store.createEvidenceDiscoveryRun({ informationNeedRunId: informationRun.id });
  const result = onlyResult(run);
  assert.equal(result.sufficient, false);
  assert.ok(result.candidates.every((item) => item.resolution.state === 'conflicting'));
}));

test('no evidence completes local sources and creates no question', () => withStore((store) => {
  const knowledge = resume(store);
  const profile = job(store);
  const informationRun = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: profile.id });
  const run = store.createEvidenceDiscoveryRun({ informationNeedRunId: informationRun.id });
  const result = onlyResult(run);
  assert.equal(result.terminal_status, 'unresolved_after_search');
  assert.equal(result.candidates.length, 0);
  assert.equal(run.source_searches.length, 4);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name LIKE '%question%'").get().count, 0);
}));

test('supported needs are not searched and focused discovery limits processing to one unresolved need', () => withStore((store) => {
  const knowledge = resume(store, [fact('SQL')]);
  const profile = job(store, 'Required Qualifications:\nSQL and Python required.');
  const informationRun = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: profile.id });
  const sql = informationRun.information_needs.find((item) => item.normalized_name === 'SQL');
  const python = informationRun.information_needs.find((item) => item.normalized_name === 'Python');
  assert.equal(sql.status, 'supported');
  const run = store.createEvidenceDiscoveryRun({ informationNeedRunId: informationRun.id, informationNeedId: python.id });
  assert.deepEqual(run.selected_information_need_ids, [python.id]);
  assert.ok(run.source_searches.every((search) => search.information_need_id === python.id));
}));

test('re-running after new source evidence produces independent immutable runs', () => withStore((store) => {
  const knowledge = resume(store);
  const profile = job(store);
  const firstInformationRun = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: profile.id });
  const first = store.createEvidenceDiscoveryRun({ informationNeedRunId: firstInformationRun.id });
  const importId = store.db.prepare('SELECT id FROM resume_imports WHERE profile_id = ?').get(knowledge.profile.id).id;
  store.db.prepare('INSERT INTO candidate_facts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(store.id(), knowledge.profile.id, importId, 'skill', JSON.stringify({ name: 'SQL' }), 'user', 'high', 'confirmed', store.now());
  const secondInformationRun = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: profile.id });
  const secondNeed = secondInformationRun.information_needs[0];
  store.db.prepare("UPDATE information_needs SET status = 'unknown' WHERE id = ?").run(secondNeed.id);
  const second = store.createEvidenceDiscoveryRun({ informationNeedRunId: secondInformationRun.id });
  assert.notEqual(first.id, second.id);
  assert.equal(store.getEvidenceDiscoveryRun(first.id).need_results[0].terminal_status, 'unresolved_after_search');
  assert.equal(second.need_results[0].sufficient, true);
  assert.equal(store.getCandidateKnowledge(knowledge.profile.id).facts.length, 1);
}));
