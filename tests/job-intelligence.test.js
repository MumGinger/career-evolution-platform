const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');
const { jobIdentity } = require('../src/demo');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-intelligence-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function requirement(profile, name) { return profile.requirements.find((item) => item.normalized_name === name); }

test('profiles Data Analyst requirements with concrete tools above generic language', () => withStore((store) => {
  const profile = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Data Analyst', jobDescription: `Required Qualifications:\n- SQL and Python are required.\n- Build data visualization dashboards.\n- Excel and strong communication skills.` });
  assert.deepEqual(profile.requirements.map((item) => item.normalized_name).sort(), ['Communication', 'Data visualization', 'Excel', 'Python', 'SQL']);
  assert.equal(requirement(profile, 'SQL').importance_level, 'high');
  assert.equal(requirement(profile, 'Python').resume_value_level, 'high');
  assert.equal(requirement(profile, 'Excel').resume_value_level, 'low');
  assert.equal(requirement(profile, 'Communication').importance_level, 'low');
  assert.match(requirement(profile, 'SQL').importance_rationale, /required-qualifications/i);
}));

test('profiles QA testing requirements and preserves generic requirements', () => withStore((store) => {
  const profile = store.createJobRequirementProfile({ company: 'Quality Co', roleTitle: 'QA Analyst', jobDescription: `Responsibilities:\nWrite test cases and perform regression testing, including source-to-target validation.\nRequired Qualifications:\nSQL required.\nCollaborate with stakeholders and demonstrate teamwork.` });
  assert.equal(requirement(profile, 'Regression testing').category, 'testing_practice');
  assert.equal(requirement(profile, 'Source-to-target validation').importance_level, 'medium');
  assert.equal(requirement(profile, 'SQL').explicitness, 'required');
  assert.equal(requirement(profile, 'Stakeholder management').resume_value_level, 'low');
  assert.equal(requirement(profile, 'Teamwork').resume_value_level, 'low');
}));

test('promotes stakeholder management when supplied role context makes it central', () => withStore((store) => {
  const profile = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Stakeholder Management Lead', jobDescription: `Responsibilities:\nLead stakeholder management across product and engineering.\nRequired Qualifications:\nMust manage stakeholders, communicate priorities, and own stakeholder management plans.` });
  const stakeholder = requirement(profile, 'Stakeholder management');
  assert.equal(stakeholder.importance_level, 'high');
  assert.equal(stakeholder.resume_value_level, 'high');
  assert.match(stakeholder.resume_value_rationale, /central/i);
}));

test('promotes a requirement when its explicit alias appears in the role title alone', () => withStore((store) => {
  const profile = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Stakeholder Manager', jobDescription: 'Collaborate with stakeholders across internal teams.' });
  const stakeholder = requirement(profile, 'Stakeholder management');
  assert.equal(stakeholder.importance_level, 'high');
  assert.equal(stakeholder.resume_value_level, 'high');
  assert.match(stakeholder.importance_rationale, /role context/i);
}));

test('clears section context at unsupported heading-like boundaries', () => withStore((store) => {
  const profile = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: `Required Qualifications:\nSQL required.\nAbout You:\nStrong communication skills and teamwork.` });
  assert.equal(requirement(profile, 'SQL').explicitness, 'required');
  assert.equal(requirement(profile, 'Communication').explicitness, 'contextual');
  assert.equal(requirement(profile, 'Teamwork').explicitness, 'contextual');
}));

test('keeps role-section context for ordinary title-cased content lines', () => withStore((store) => {
  const profile = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: `What you will do\nData Analysis And Dashboard Development` });
  assert.equal(requirement(profile, 'Data analysis').explicitness, 'responsibility-derived');
  assert.equal(requirement(profile, 'Dashboard development').explicitness, 'responsibility-derived');
}));

test('marks preferred requirements and boosts repeated mandatory requirements with traceable excerpts', () => withStore((store) => {
  const profile = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: `Required Qualifications:\nSQL is required.\nResponsibilities:\nUse SQL to analyze product data.\nPreferred Qualifications:\nPython preferred.` });
  const sql = requirement(profile, 'SQL');
  assert.equal(sql.explicitness, 'required');
  assert.equal(sql.importance_level, 'high');
  assert.equal(sql.supporting_excerpts.length, 2);
  assert.match(sql.importance_rationale, /appears 2 times/i);
  assert.equal(requirement(profile, 'Python').explicitness, 'preferred');
}));

test('persists snapshots and creates new immutable profile versions without candidate claims', () => withStore((store) => {
  const input = { company: 'Acme', roleTitle: 'Data Analyst', jobDescription: 'Required Qualifications:\nSQL required.', sourceUrl: 'https://example.test/jobs/1', sourceMetadata: { captured_by: 'user' } };
  const first = store.createJobRequirementProfile(input);
  const second = store.createJobRequirementProfile(input);
  assert.equal(first.version, 1);
  assert.equal(second.version, 2);
  assert.equal(first.snapshot.id, second.snapshot.id);
  assert.equal(first.snapshot.description, input.jobDescription);
  assert.equal(first.snapshot.description_hash.length, 64);
  assert.equal(first.requirements[0].source_metadata.source_url, input.sourceUrl);
  assert.equal(first.requirements[0].parser_version, first.parser_version);
  assert.equal(Object.keys(first).some((key) => /candidate|match|interview/i.test(key)), false);
}));

test('existing Capability 001 and 002 records remain functional', () => withStore((store) => {
  const profile = store.createProfile({ name: 'Aira', skills: ['SQL'] });
  const application = store.createApplication({ profileId: profile.id, company: 'Acme', roleTitle: 'Analyst', jobDescription: 'SQL', applicationDate: '2026-08-02' });
  assert.equal(store.getApplication(application.id).profile.id, profile.id);
  assert.equal(store.getCandidateKnowledge(profile.id).profile.id, profile.id);
}));

test('hardens raw LinkedIn-style Zurich input by selecting role sections and excluding company history', () => withStore((store) => {
  const jobDescription = fs.readFileSync(path.join(__dirname, '../examples/synthetic-linkedin-zurich-job.txt'), 'utf8');
  assert.deepEqual(jobIdentity(jobDescription), { roleTitle: 'Fall 2026 Internship/Co-op - Data Analytics & AI', company: 'Zurich Canada' });
  const profile = store.createJobRequirementProfile({ ...jobIdentity(jobDescription), jobDescription }); const names = profile.requirements.map((item) => item.normalized_name);
  for (const expected of ['Data analysis', 'Power BI', 'SQL', 'Python', 'Dashboard development', 'Business intelligence', 'Automation', 'AI / machine learning', 'Requirements gathering', 'Business insights / storytelling', 'Stakeholder communication', 'Data quality', 'Responsible AI / privacy / ethical AI', 'Process improvement', 'Team collaboration']) assert.ok(names.includes(expected), expected);
  assert.equal(names.includes('Years of experience'), false);
}));
