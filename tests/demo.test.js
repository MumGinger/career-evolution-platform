const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { OUTPUT_FILES, confirmationProposals, runDemo, jobIdentity } = require('../src/demo');

const root = path.join(__dirname, '..');
function fixture(name) { return path.join(root, 'examples', name); }
function tempOutput() { return fs.mkdtempSync(path.join(os.tmpdir(), 'career-demo-output-')); }

test('synthetic demo runs the complete immutable pipeline and writes every expected output', async () => {
  const output = tempOutput();
  try {
    const result = await runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), capturePath: fixture('synthetic-capture.json'), outputDirectory: output });
    assert.equal(result.validation.validation_status, 'passed');
    assert.deepEqual(fs.readdirSync(output).sort(), OUTPUT_FILES.slice().sort());
    assert.equal(result.semantic, null);
    assert.equal(result.graph, null);
    assert.equal(result.ast.validation_status, 'passed');
    assert.ok(fs.existsSync(path.join(output, 'resume-ast-run.json')));
    assert.ok(fs.existsSync(path.join(output, 'confirmation-proposals.json')));
    assert.ok(result.integration.integration_decisions.every((decision) => decision.state !== 'accepted' || decision.source_evidence_refs.length));
    assert.equal(result.integration.applied_facts.length, 0);
    const report = fs.readFileSync(path.join(output, 'report.html'), 'utf8');
    assert.match(report, /1\. Resume Intelligence/);
    assert.match(report, /2\. Career Conversation/);
    assert.match(report, /3\. Career Understanding/);
    assert.match(report, /Career Curiosity/);
    assert.ok(JSON.parse(fs.readFileSync(path.join(output, 'career-curiosity-run.json'), 'utf8')).career_curiosity);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('integrated demo confirmation proposals retain provenance-rich review fields', () => {
  const [proposal] = confirmationProposals({ need_results: [{ candidates: [{ resolution: { state: 'needs_confirmation' }, candidate: { normalized_claim: 'SQL dashboard experience', source_reference: 'resume-ast-block-1', supporting_text: 'Built a SQL dashboard.', provenance: { block_kind: 'project_bullet', section: 'Projects', extraction_state: 'explicit', exact_source_text: 'Built a SQL dashboard.', retrieval: { rank: 2, score: 0.82, rationale: 'Matched the required dashboard context.' } } } }] }] });
  assert.deepEqual(proposal, { requirement: 'SQL dashboard experience', proposed_evidence_block: 'resume-ast-block-1', block_kind: 'project_bullet', section: 'Projects', extraction_state: 'explicit', rank: 2, score: 0.82, rationale: 'Matched the required dashboard context.', exact_source_text: 'Built a SQL dashboard.', source_text: 'Built a SQL dashboard.', proposed_normalized_claim: 'SQL dashboard experience', action: 'confirm | reject | edit' });
});

test('career evolution demo joins every milestone stage into one bounded companion journey', async () => {
  const output = tempOutput();
  try {
    const result = await runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), capturePath: fixture('synthetic-capture.json'), outputDirectory: output, careerDirection: 'Data Analytics', reflectionAction: 'looks_right', reflectionNote: 'This is a useful starting point.', curiosityResponse: 'interesting' });
    assert.equal(result.conversation.answer, 'Data Analytics');
    assert.equal(result.snapshot.current_direction.label, 'Data Analytics');
    assert.equal(result.reflection.action, 'looks_right');
    assert.equal(result.curiosity.status, 'available');
    assert.equal(result.curiosityObservation.user_response, 'interesting');
    const loop = JSON.parse(fs.readFileSync(path.join(output, 'career-evolution-loop-summary.json'), 'utf8'));
    assert.deepEqual(loop.flow, ['resume_intelligence', 'career_conversation', 'career_understanding', 'shared_understanding', 'career_curiosity', 'completion']);
    assert.equal(loop.completion.one_new_possibility_explored.label, 'Business Intelligence Analyst');
    const report = fs.readFileSync(path.join(output, 'report.html'), 'utf8');
    for (const section of ['1. Resume Intelligence', '2. Career Conversation', '3. Career Understanding', '4. Shared Understanding', '5. Career Curiosity', '6. Decision Companion', '7. Your first loop is complete']) assert.match(report, new RegExp(section));
    assert.match(report, /Based on what I know today/);
    assert.match(report, /Return after a future career experience/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('without a capture fixture, unresolved acquisition is skipped and no unsupported evidence is integrated', async () => {
  const output = tempOutput();
  try {
    const result = await runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output });
    assert.equal(result.integration.applied_facts.length, 0);
    assert.equal(result.knowledge.facts.length, 0);
    assert.ok(result.integration.upstream_snapshot.acquisition_results.every((item) => item.execution_status === 'skipped'));
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('requires a clean output directory so every invocation is a new run set', async () => {
  const output = tempOutput();
  try {
    fs.writeFileSync(path.join(output, 'existing.txt'), 'x');
    await assert.rejects(runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output }), /must be empty/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('optional graph flag preserves existing graph output while preferred path remains graph-free', async () => {
  const output = tempOutput();
  try {
    const result = await runDemo({ resumePath: fixture('synthetic-complex-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output, buildSemanticGraph: true });
    const graphStates = [...result.graph.nodes, ...result.graph.edges].filter((item) => item.decision_state === 'derived_structurally');
    assert.ok(result.graph.edges.length > 0); assert.ok(graphStates.length > 0);
    assert.ok(result.needs.available_working_evidence_summary.length > 0);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('uses one canonical identity for three-line LinkedIn and Role at Company openings', () => {
  assert.deepEqual(jobIdentity('Zurich Canada\nFall 2026 Internship/Co-op - Data Analytics & AI\nToronto, ON'), { company: 'Zurich Canada', roleTitle: 'Fall 2026 Internship/Co-op - Data Analytics & AI', location: 'Toronto, ON' });
  assert.deepEqual(jobIdentity('Data Analyst at Acme'), { company: 'Acme', roleTitle: 'Data Analyst' });
});
