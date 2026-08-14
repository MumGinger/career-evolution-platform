const crypto = require('node:crypto');
const fs = require('node:fs');

const APPLICANT_PATH_CHECKS = ['unit', 'integration', 'http-contract', 'browser-e2e', 'issue-152-replay'];
const DOCUMENTATION_CHECKS = ['documentation-diff'];
const DOCUMENTATION_PATHS = [/^docs\//, /^README\.md$/, /^MILESTONE_1\.md$/];

function classifyChangeScope(changedFiles = []) {
  const normalized = changedFiles.map((file) => file.replaceAll('\\', '/'));
  if (normalized.length && normalized.every((file) => DOCUMENTATION_PATHS.some((pattern) => pattern.test(file)))) return 'documentation';
  return 'applicant-path';
}

function normalizeStatus(status) {
  if (['passed', 'success'].includes(status)) return 'passed';
  if (status === 'skipped') return 'skipped';
  if (['failed', 'failure', 'cancelled', 'timed_out'].includes(status)) return 'failed';
  return 'pending';
}

function artifactRecord(name, filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { name, path: filePath || null, status: 'missing', sha256: null };
  const content = fs.readFileSync(filePath);
  let evidence = null;
  try {
    const parsed = JSON.parse(content.toString('utf8'));
    evidence = {
      delivery_incident: parsed.delivery_incident || null,
      revision: parsed.revision || null,
      runtime_evidence: parsed.runtime_evidence === true,
    };
  } catch { /* Non-JSON artifacts remain hash-bound but carry no replay evidence. */ }
  return {
    name,
    path: filePath,
    status: 'present',
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    evidence,
  };
}

function generateGateManifest({ revision, runId, repository, changedFiles = [], outcomes = {}, artifacts = {} }) {
  if (!revision) throw new Error('Gate Manifest requires the tested revision.');
  const scope = classifyChangeScope(changedFiles);
  const requiredChecks = scope === 'applicant-path' ? APPLICANT_PATH_CHECKS : DOCUMENTATION_CHECKS;
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    revision,
    run: { id: String(runId || 'local'), repository: repository || 'local' },
    scope,
    changed_files: [...changedFiles].sort(),
    required_checks: requiredChecks,
    checks: requiredChecks.map((name) => ({ name, status: normalizeStatus(outcomes[name]) })),
    scenario: scope === 'applicant-path' ? {
      delivery_incident: '#152',
      replay_check: 'issue-152-replay',
      reproduction_artifact: 'tests/fixtures/issue152-draft-blocked-reproduction.json',
    } : null,
    artifacts: Object.entries(artifacts).sort(([left], [right]) => left.localeCompare(right)).map(([name, filePath]) => artifactRecord(name, filePath)),
  };
}

function validateGateManifest(manifest, { expectedRevision } = {}) {
  const errors = [];
  if (!manifest || manifest.schema_version !== 1) return ['unsupported Gate Manifest schema'];
  if (!manifest.revision) errors.push('missing tested revision');
  if (expectedRevision && manifest.revision !== expectedRevision) errors.push(`revision mismatch: expected ${expectedRevision}, received ${manifest.revision}`);
  if (!['applicant-path', 'documentation'].includes(manifest.scope)) errors.push(`unknown gate scope: ${manifest.scope}`);

  const expectedChecks = manifest.scope === 'documentation' ? DOCUMENTATION_CHECKS : APPLICANT_PATH_CHECKS;
  const required = manifest.required_checks || [];
  if (JSON.stringify(required) !== JSON.stringify(expectedChecks)) errors.push('required checks do not match the declared gate scope');
  const checks = new Map();
  for (const check of manifest.checks || []) {
    if (checks.has(check.name)) errors.push(`duplicate check record: ${check.name}`);
    else checks.set(check.name, check.status);
    if (!expectedChecks.includes(check.name)) errors.push(`unknown check record: ${check.name}`);
  }
  for (const name of expectedChecks) {
    if (!checks.has(name)) errors.push(`missing required check: ${name}`);
    else if (checks.get(name) !== 'passed') errors.push(`${name} must be passed, received ${checks.get(name)}`);
  }

  const artifacts = new Map();
  for (const artifact of manifest.artifacts || []) {
    if (artifacts.has(artifact.name)) errors.push(`duplicate artifact record: ${artifact.name}`);
    else artifacts.set(artifact.name, artifact);
    if (manifest.scope === 'applicant-path' && artifact.name !== 'issue152-draft-blocked-replay') {
      errors.push(`unknown artifact record: ${artifact.name}`);
    }
  }

  if (manifest.scope === 'documentation') {
    if (manifest.scenario || (manifest.artifacts || []).length || APPLICANT_PATH_CHECKS.some((name) => checks.has(name))) {
      errors.push('documentation gate cannot claim applicant-path proof');
    }
  } else {
    if (manifest.scenario?.delivery_incident !== '#152' || manifest.scenario?.replay_check !== 'issue-152-replay') {
      errors.push('applicant-path gate must identify Delivery Incident #152 and its replay check');
    }
    const replayArtifact = artifacts.get('issue152-draft-blocked-replay');
    if (!replayArtifact || replayArtifact.status !== 'present' || !/^[a-f0-9]{64}$/.test(replayArtifact.sha256 || '')) {
      errors.push('applicant-path gate requires a hashed issue152-draft-blocked-replay artifact');
    } else if (replayArtifact.evidence?.delivery_incident !== '#152' || replayArtifact.evidence?.revision !== manifest.revision || !replayArtifact.evidence?.runtime_evidence) {
      errors.push('issue152-draft-blocked-replay artifact is not runtime evidence for the tested revision');
    }
  }
  return errors;
}

module.exports = {
  APPLICANT_PATH_CHECKS,
  DOCUMENTATION_CHECKS,
  classifyChangeScope,
  generateGateManifest,
  validateGateManifest,
};
