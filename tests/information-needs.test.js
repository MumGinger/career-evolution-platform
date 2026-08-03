const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'information-needs-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function candidate(store, facts = []) { return store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic Candidate' }, facts }); }
function fact(name, confirmation_status = 'confirmed') { return { entity_type: 'skill', value: { name }, confirmation_status }; }
function need(run, name) { return run.information_needs.find((item) => item.normalized_name === name); }

test('Data Analyst: explicit Python and SQL are supported while unknown visualization outranks Excel and communication', () => withStore((store) => {
  const knowledge = candidate(store, [fact('Python'), fact('SQL')]);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Data Analyst', jobDescription: 'Required Qualifications:\nPython and SQL required. Build data visualization dashboards. Excel and communication skills.' });
  const run = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.equal(need(run, 'Python').status, 'supported');
  assert.equal(need(run, 'SQL').priority_level, 'none');
  assert.equal(need(run, 'Data visualization').status, 'unknown');
  assert.ok(need(run, 'Data visualization').priority_score > need(run, 'Excel').priority_score);
  assert.ok(need(run, 'Data visualization').priority_score > need(run, 'Communication').priority_score);
  assert.ok(need(run, 'SQL').matched_fact_ids.length > 0);
}));

test('QA Analyst: SQL evidence is supported and regression testing outranks stakeholder and teamwork language', () => withStore((store) => {
  const knowledge = candidate(store, [fact('sql')]);
  const job = store.createJobRequirementProfile({ company: 'Quality Co', roleTitle: 'QA Analyst', jobDescription: 'Responsibilities:\nPerform regression testing. Collaborate with stakeholders and teamwork.\nRequired Qualifications:\nSQL required.' });
  const run = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.equal(need(run, 'SQL').status, 'supported');
  assert.equal(need(run, 'Regression testing').status, 'unknown');
  assert.ok(need(run, 'Regression testing').priority_score > need(run, 'Stakeholder management').priority_score);
  assert.ok(need(run, 'Regression testing').priority_score > need(run, 'Teamwork').priority_score);
}));

test('candidate fact needing confirmation is never treated as supported', () => withStore((store) => {
  const knowledge = candidate(store, [fact('SQL', 'needs_confirmation')]);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' });
  const run = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.equal(need(run, 'SQL').status, 'needs_confirmation');
  assert.equal(need(run, 'SQL').existing_evidence.assessment, 'present_needs_confirmation');
}));

test('central stakeholder requirement remains meaningfully prioritized when unknown', () => withStore((store) => {
  const knowledge = candidate(store);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Stakeholder Management Lead', jobDescription: 'Responsibilities:\nLead stakeholder management across product and engineering.\nRequired Qualifications:\nMust manage stakeholders and own stakeholder management plans.' });
  const run = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.equal(need(run, 'Stakeholder management').status, 'unknown');
  assert.notEqual(need(run, 'Stakeholder management').priority_level, 'low');
}));

test('credential and hard-experience constraints without evidence are unknown with low discoverability', () => withStore((store) => {
  const knowledge = candidate(store);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: "Required Qualifications:\nBachelor's degree required. At least 3 years of experience." });
  const run = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.equal(need(run, "Bachelor's degree").status, 'unknown');
  assert.equal(need(run, "Bachelor's degree").discoverability.level, 'low');
  assert.equal(need(run, 'Years of experience').discoverability.level, 'low');
}));

test('each evaluation is immutable and snapshots candidate evidence independently', () => withStore((store) => {
  const knowledge = candidate(store);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' });
  const first = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  const importId = store.db.prepare('SELECT id FROM resume_imports WHERE profile_id = ?').get(knowledge.profile.id).id;
  store.db.prepare('INSERT INTO candidate_facts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(store.id(), knowledge.profile.id, importId, 'skill', JSON.stringify({ name: 'SQL' }), 'user', 'high', 'confirmed', store.now());
  const second = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.notEqual(first.id, second.id);
  assert.equal(need(store.getInformationNeedRun(first.id), 'SQL').status, 'unknown');
  assert.equal(need(second, 'SQL').status, 'supported');
  assert.equal(first.job_requirement_profile_version, job.version);
  assert.ok(first.candidate_evidence_snapshot.length === 0);
}));

test('explicit alias matching is deterministic and preserves the supporting fact reference', () => withStore((store) => {
  const knowledge = candidate(store, [fact('visualisation')]);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Data visualization required.' });
  const run = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  assert.equal(need(run, 'Data visualization').status, 'supported');
  assert.equal(need(run, 'Data visualization').matched_fact_ids.length, 1);
}));
