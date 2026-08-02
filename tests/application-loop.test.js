const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store, SKILL } = require('../src/store');
const { generateApplicationPackage, recordUserEdit } = require('../src/service');

function withStore(run) {
  const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'career-loop-')), 'mvp.db');
  const store = new Store(filename);
  try { run(store); } finally { store.close(); fs.rmSync(path.dirname(filename), { recursive: true, force: true }); }
}
function createApplication(store) {
  const profile = store.createProfile({ name: 'Aira Example', skills: ['JavaScript', 'SQL', 'Product writing'] });
  return store.createApplication({ profileId: profile.id, company: 'Acme', roleTitle: 'Product Engineer', location: 'Toronto', jobCategory: 'Engineering', applicationDate: '2026-08-02', jobDescription: 'Build JavaScript products with SQL and communicate with a product team.' });
}
test('creates a versioned application artifact linked to the active skill', () => withStore((store) => {
  const application = createApplication(store);
  const artifact = generateApplicationPackage(store, application.id);
  assert.equal(artifact.artifact_type, 'tailored_application_note');
  assert.equal(artifact.version, 1);
  assert.equal(artifact.skill_id, SKILL.id);
  assert.equal(artifact.skill_version, SKILL.version);
  assert.match(artifact.content.body, /matched skills: javascript, sql/i);
  const record = store.getApplication(application.id);
  assert.equal(record.artifacts.length, 1);
  assert.equal(record.evidence[0].classification, 'internal_diagnostic');
  assert.equal(record.evidence[0].supports_skill_update, false);
}));
test('uses neutral wording when the profile has no matched skills', () => withStore((store) => {
  const profile = store.createProfile({ name: 'Aira Example', skills: ['Illustration'] });
  const application = store.createApplication({ profileId: profile.id, company: 'Acme', roleTitle: 'Platform Engineer', location: 'Toronto', jobCategory: 'Engineering', applicationDate: '2026-08-02', jobDescription: 'Build Kubernetes services with Python.' });
  const artifact = generateApplicationPackage(store, application.id);
  assert.deepEqual(artifact.content.assessment.matched_skills, []);
  assert.match(artifact.content.body, /does not claim a skills match/i);
  assert.doesNotMatch(artifact.content.body, /aligns with the role/i);
}));
test('rejects artifacts that reference an unknown skill version', () => withStore((store) => {
  const application = createApplication(store);
  assert.throws(() => store.db.prepare('INSERT INTO artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('invalid-artifact', application.id, 'tailored_application_note', '{}', 1, 'unknown-skill', '9.9.9', '{}', new Date().toISOString()), /FOREIGN KEY constraint failed/);
}));
test('records outcomes and user edits as distinct non-learning evidence', () => withStore((store) => {
  const application = createApplication(store);
  const edit = recordUserEdit(store, application.id, 'Shortened the opening paragraph.');
  const outcome = store.recordOutcome(application.id, 'interview_invited');
  assert.equal(edit.classification, 'preference');
  assert.equal(outcome.classification, 'primary_outcome');
  assert.equal(outcome.supports_skill_update, false);
  const record = store.getApplication(application.id);
  assert.equal(record.status, 'interview_invited');
  assert.equal(record.evidence.length, 2);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM skill_definitions WHERE id = ? AND version = ?').get(SKILL.id, SKILL.version).count, 1);
}));
