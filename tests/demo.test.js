const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { OUTPUT_FILES, runDemo, jobIdentity } = require('../src/demo');

const root = path.join(__dirname, '..');
function fixture(name) { return path.join(root, 'examples', name); }
function tempOutput() { return fs.mkdtempSync(path.join(os.tmpdir(), 'career-demo-output-')); }

test('synthetic demo runs the complete immutable pipeline and writes every expected output', () => {
  const output = tempOutput();
  try {
    const result = runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), capturePath: fixture('synthetic-capture.json'), outputDirectory: output });
    assert.equal(result.validation.validation_status, 'passed');
    assert.deepEqual(fs.readdirSync(output).sort(), OUTPUT_FILES.slice().sort());
    assert.ok(result.semantic.created_at <= result.discovery.created_at);
    assert.ok(result.semantic.spans.length > 0);
    assert.ok(fs.existsSync(path.join(output, 'resume-semantic-run.json')));
    assert.ok(result.discovery.need_results.flatMap((item) => item.candidates).some((item) => item.candidate.source_type === 'resume_semantic'));
    assert.ok(result.integration.integration_decisions.every((decision) => decision.state !== 'accepted' || decision.source_evidence_refs.length));
    assert.equal(result.integration.applied_facts.length, 0);
    const report = fs.readFileSync(path.join(output, 'report.html'), 'utf8');
    assert.match(report, /Rendered resume preview/);
    assert.match(report, /Resume Semantic Understanding/);
    assert.match(report, /Provenance/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('without a capture fixture, unresolved acquisition is skipped and no unsupported evidence is integrated', () => {
  const output = tempOutput();
  try {
    const result = runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output });
    assert.equal(result.integration.applied_facts.length, 0);
    assert.equal(result.knowledge.facts.length, 0);
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

test('complex real-style synthetic resume emits graph relationships and working evidence', () => {
  const output = tempOutput();
  try {
    const result = runDemo({ resumePath: fixture('synthetic-complex-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output });
    const graphStates = [...result.graph.nodes, ...result.graph.edges].filter((item) => item.decision_state === 'derived_structurally');
    assert.ok(result.graph.edges.length > 0); assert.ok(graphStates.length > 0);
    assert.ok(result.needs.available_working_evidence_summary.length > 0);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('uses one canonical identity for three-line LinkedIn and Role at Company openings', () => {
  assert.deepEqual(jobIdentity('Zurich Canada\nFall 2026 Internship/Co-op - Data Analytics & AI\nToronto, ON'), { company: 'Zurich Canada', roleTitle: 'Fall 2026 Internship/Co-op - Data Analytics & AI', location: 'Toronto, ON' });
  assert.deepEqual(jobIdentity('Data Analyst at Acme'), { company: 'Acme', roleTitle: 'Data Analyst' });
});
