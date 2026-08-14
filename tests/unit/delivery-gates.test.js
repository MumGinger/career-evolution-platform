const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  APPLICANT_PATH_CHECKS,
  DOCUMENTATION_CHECKS,
  classifyChangeScope,
  generateGateManifest,
  validateGateManifest,
} = require('../../src/delivery-gates');

const REVISION = 'a'.repeat(40);

function outcomes(requiredChecks, state = 'passed') {
  return Object.fromEntries(requiredChecks.map((name) => [name, state]));
}

function withArtifact(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-gates-'));
  const artifact = path.join(root, 'issue152-replay.json');
  fs.writeFileSync(artifact, JSON.stringify({
    delivery_incident: '#152',
    revision: REVISION,
    runtime_evidence: true,
    privacy: { contains_private_input: false },
  }));
  try { return run(artifact); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('applicant-path changes produce a revision-bound manifest with the incident replay artifact', () => withArtifact((artifact) => {
  assert.equal(classifyChangeScope(['src/applicant-option2-page.js']), 'applicant-path');
  const manifest = generateGateManifest({
    revision: REVISION,
    runId: '123456',
    repository: 'MumGinger/career-evolution-platform',
    changedFiles: ['src/applicant-option2-page.js'],
    outcomes: outcomes(APPLICANT_PATH_CHECKS),
    artifacts: { 'issue152-draft-blocked-replay': artifact },
  });

  assert.deepEqual(manifest.required_checks, APPLICANT_PATH_CHECKS);
  assert.equal(manifest.scenario.delivery_incident, '#152');
  assert.equal(manifest.artifacts[0].status, 'present');
  assert.match(manifest.artifacts[0].sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateGateManifest(manifest, { expectedRevision: REVISION }), []);
}));

test('manifest validation denies missing, failed, pending, and revision-mismatched applicant evidence', () => withArtifact((artifact) => {
  const valid = generateGateManifest({
    revision: REVISION,
    runId: '123456',
    repository: 'MumGinger/career-evolution-platform',
    changedFiles: ['src/applicant-option2-page.js'],
    outcomes: outcomes(APPLICANT_PATH_CHECKS),
    artifacts: { 'issue152-draft-blocked-replay': artifact },
  });

  const missing = structuredClone(valid);
  missing.checks = missing.checks.filter((check) => check.name !== 'issue-152-replay');
  assert.match(validateGateManifest(missing, { expectedRevision: REVISION }).join('\n'), /missing required check: issue-152-replay/i);

  const pending = structuredClone(valid);
  pending.checks.find((check) => check.name === 'browser-e2e').status = 'pending';
  assert.match(validateGateManifest(pending, { expectedRevision: REVISION }).join('\n'), /browser-e2e must be passed/i);

  const failed = structuredClone(valid);
  failed.checks.find((check) => check.name === 'http-contract').status = 'failed';
  assert.match(validateGateManifest(failed, { expectedRevision: REVISION }).join('\n'), /http-contract must be passed/i);

  const duplicate = structuredClone(valid);
  duplicate.checks.unshift({ name: 'browser-e2e', status: 'failed' });
  assert.match(validateGateManifest(duplicate, { expectedRevision: REVISION }).join('\n'), /duplicate check record: browser-e2e/i);

  const unknown = structuredClone(valid);
  unknown.checks.push({ name: 'hand-written-proof', status: 'passed' });
  assert.match(validateGateManifest(unknown, { expectedRevision: REVISION }).join('\n'), /unknown check record: hand-written-proof/i);

  const missingArtifact = structuredClone(valid);
  missingArtifact.artifacts = [];
  assert.match(validateGateManifest(missingArtifact, { expectedRevision: REVISION }).join('\n'), /requires a hashed issue152-draft-blocked-replay artifact/i);

  const mismatchedArtifact = structuredClone(valid);
  mismatchedArtifact.artifacts[0].evidence.revision = 'b'.repeat(40);
  assert.match(validateGateManifest(mismatchedArtifact, { expectedRevision: REVISION }).join('\n'), /not runtime evidence for the tested revision/i);

  const duplicateArtifact = structuredClone(valid);
  duplicateArtifact.artifacts.push(structuredClone(duplicateArtifact.artifacts[0]));
  assert.match(validateGateManifest(duplicateArtifact, { expectedRevision: REVISION }).join('\n'), /duplicate artifact record: issue152-draft-blocked-replay/i);

  const unknownArtifact = structuredClone(valid);
  unknownArtifact.artifacts.push({ name: 'hand-written-proof', status: 'present', sha256: 'c'.repeat(64) });
  assert.match(validateGateManifest(unknownArtifact, { expectedRevision: REVISION }).join('\n'), /unknown artifact record: hand-written-proof/i);

  assert.match(validateGateManifest(valid, { expectedRevision: 'b'.repeat(40) }).join('\n'), /revision mismatch/i);
}));

test('a skipped command remains skipped and still denies manifest validation', () => withArtifact((artifact) => {
  const manifest = generateGateManifest({
    revision: REVISION,
    runId: '123456',
    repository: 'MumGinger/career-evolution-platform',
    changedFiles: ['src/applicant-option2-page.js'],
    outcomes: { ...outcomes(APPLICANT_PATH_CHECKS), integration: 'skipped' },
    artifacts: { 'issue152-draft-blocked-replay': artifact },
  });
  assert.equal(manifest.checks.find((check) => check.name === 'integration').status, 'skipped');
  assert.match(validateGateManifest(manifest, { expectedRevision: REVISION }).join('\n'), /integration must be passed, received skipped/i);
}));

test('pure documentation uses the narrow documented gate and cannot claim applicant-path proof', () => {
  assert.equal(classifyChangeScope(['docs/vision/vision.md', 'README.md']), 'documentation');
  assert.equal(classifyChangeScope(['docs\\vision\\vision.md', 'README.md']), 'documentation');
  const manifest = generateGateManifest({
    revision: REVISION,
    runId: '123456',
    repository: 'MumGinger/career-evolution-platform',
    changedFiles: ['docs/vision/vision.md', 'README.md'],
    outcomes: outcomes(DOCUMENTATION_CHECKS),
  });

  assert.deepEqual(manifest.required_checks, DOCUMENTATION_CHECKS);
  assert.equal(manifest.scenario, null);
  assert.deepEqual(manifest.artifacts, []);
  assert.deepEqual(validateGateManifest(manifest, { expectedRevision: REVISION }), []);

  manifest.checks.push({ name: 'browser-e2e', status: 'passed' });
  assert.match(validateGateManifest(manifest, { expectedRevision: REVISION }).join('\n'), /documentation gate cannot claim applicant-path proof/i);
});
