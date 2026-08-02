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
  const record = store.getApplication(application.id);
  assert.equal(record.artifacts.length, 1);
  assert.equal(record.evidence[0].classification, 'internal_diagnostic');
  assert.equal(record.evidence[0].supports_skill_update, false);
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
