const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { OUTPUT_FILES, runDemo } = require('../src/demo');

const root = path.join(__dirname, '..');
function fixture(name) { return path.join(root, 'examples', name); }
function tempOutput() { return fs.mkdtempSync(path.join(os.tmpdir(), 'career-demo-output-')); }

test('synthetic demo runs the complete immutable pipeline and writes every expected output', () => {
  const output = tempOutput();
  try {
    const result = runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), capturePath: fixture('synthetic-capture.json'), reviewPath: fixture('synthetic-career-review.json'), outputDirectory: output });
    assert.equal(result.validation.validation_status, 'passed');
    assert.deepEqual(fs.readdirSync(output).sort(), OUTPUT_FILES.slice().sort());
    assert.ok(result.integration.integration_decisions.every((decision) => decision.state !== 'accepted' || decision.source_evidence_refs.length));
    assert.ok(result.integration.applied_facts.length >= 3);
    assert.equal(result.review.completed, true);
    assert.equal(result.finalExport.export_status, 'ready');
    assert.match(fs.readFileSync(path.join(output, 'report.html'), 'utf8'), /Career Review/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('without a capture fixture, unresolved acquisition is skipped and no unsupported evidence is integrated', () => {
  const output = tempOutput();
  try {
    const result = runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output });
    assert.equal(result.integration.applied_facts.length, 0);
    assert.equal(result.review.completed, false);
    assert.equal(result.finalExport, null);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'final-export.json'), 'utf8')).export_status, 'blocked');
    assert.ok(result.integration.upstream_snapshot.acquisition_results.every((item) => item.execution_status === 'skipped'));
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('requires a clean output directory so every invocation is a new run set', () => {
  const output = tempOutput();
  try {
    fs.writeFileSync(path.join(output, 'existing.txt'), 'x');
    assert.throws(() => runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output }), /must be empty/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});
