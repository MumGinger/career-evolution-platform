const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');
const { importResume, parseResumeText } = require('../src/resume');

const RESUME = `Aira Example\naira@example.com\n+1 416 555 0199\n\nExperience\nProduct Engineer at Acme\n\nEducation\nBSc Computer Science\n\nProjects\nCareer platform prototype\n\nSkills\nJavaScript, SQL\n\nCertifications\nAWS Certified Cloud Practitioner`;
function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-intake-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }

test('parses only explicit resume facts and marks ambiguous entities for confirmation', () => {
  const parsed = parseResumeText(RESUME);
  assert.equal(parsed.basic.name, 'Aira Example');
  assert.equal(parsed.basic.email, 'aira@example.com');
  assert.equal(parsed.basic.phone, '+1 416 555 0199');
  assert.deepEqual(parsed.facts.filter((fact) => fact.entity_type === 'skill').map((fact) => fact.value.name), ['JavaScript', 'SQL']);
  assert.equal(parsed.facts.find((fact) => fact.entity_type === 'experience').confirmation_status, 'needs_confirmation');
});
test('persists imported candidate knowledge with resume provenance', () => withStore((store) => {
  const knowledge = importResume(store, 'resume.pdf', () => RESUME);
  assert.equal(knowledge.profile.name, 'Aira Example');
  assert.equal(knowledge.facts.length, 9);
  assert.ok(knowledge.facts.every((fact) => fact.source === 'resume' && fact.confidence === 'parsed'));
  assert.equal(store.getCandidateKnowledge(knowledge.profile.id).facts.filter((fact) => fact.entity_type === 'certification')[0].value.text, 'AWS Certified Cloud Practitioner');
}));
test('keeps a missing resume name empty instead of storing a placeholder as fact', () => withStore((store) => {
  const knowledge = importResume(store, 'resume.pdf', () => 'someone@example.com\n\nSkills\nJavaScript');
  assert.equal(knowledge.profile.name, '');
  assert.equal(knowledge.facts.some((fact) => fact.entity_type === 'basic_information' && fact.value.name), false);
}));
test('stops a supported section at an unsupported section heading', () => {
  const parsed = parseResumeText('Skills\nJavaScript, SQL\nLanguages\nEnglish, French');
  assert.deepEqual(parsed.facts.filter((fact) => fact.entity_type === 'skill').map((fact) => fact.value.name), ['JavaScript', 'SQL']);
});
test('rejects non-PDF resume paths', () => {
  const { extractPdfText } = require('../src/resume');
  assert.throws(() => extractPdfText('resume.txt'), /Only PDF resumes/);
});
