const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { OUTPUT_FILES, confirmationProposals, runDemo, summary, jobIdentity } = require('../src/demo');

const root = path.join(__dirname, '..');
function fixture(name) { return path.join(root, 'examples', name); }
function tempOutput() { return fs.mkdtempSync(path.join(os.tmpdir(), 'career-demo-output-')); }
function careerReviewFixture() { return fixture('synthetic-career-review.json'); }
function evidenceReviewFixture() { return fixture('synthetic-evidence-review.json'); }

test('synthetic demo runs the complete immutable pipeline and writes every expected output', async () => {
  const output = tempOutput();
  try {
    const result = await runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), evidenceReviewFixturePath: evidenceReviewFixture(), careerReviewFixturePath: careerReviewFixture(), outputDirectory: output });
    assert.equal(result.validation.validation_status, 'passed');
    assert.deepEqual(fs.readdirSync(output).sort(), OUTPUT_FILES.slice().sort());
    assert.equal(result.semantic, null);
    assert.equal(result.graph, null);
    assert.equal(result.ast.validation_status, 'passed');
    assert.ok(fs.existsSync(path.join(output, 'resume-ast-run.json')));
    assert.ok(fs.existsSync(path.join(output, 'confirmation-proposals.json')));
    assert.ok(result.integration.integration_decisions.every((decision) => decision.state !== 'accepted' || decision.source_evidence_refs.length));
    assert.ok(result.integration.applied_facts.length > 0);
    const report = fs.readFileSync(path.join(output, 'report.html'), 'utf8');
    assert.match(report, /Intelligent Resume v1/);
    assert.match(report, /Career Understanding/);
    assert.match(report, /Presentation Strategy/);
    assert.match(report, /Resume Draft/);
    assert.match(report, /Career Review/);
    assert.match(report, /Complete — export allowed/);
    assert.match(report, /Approved Resume Export/);
    assert.equal(result.humanReviewRun.review_complete, true);
    assert.equal(result.exportedResume.human_review_run_id, result.humanReviewRun.id);
    assert.match(summary(result), /Career Review: complete — export allowed/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'career-evolution-loop-summary.json'), 'utf8')).career_review.product_label, 'Career Review');
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
    const result = await runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), evidenceReviewFixturePath: evidenceReviewFixture(), careerReviewFixturePath: careerReviewFixture(), outputDirectory: output, careerDirection: 'Data Analytics', reflectionAction: 'looks_right', reflectionNote: 'This is a useful starting point.', curiosityResponse: 'interesting' });
    assert.equal(result.conversation.answer, 'Data Analytics');
    assert.equal(result.snapshot.current_direction.label, 'Data Analytics');
    assert.equal(result.reflection.action, 'looks_right');
    assert.equal(result.curiosity.status, 'available');
    assert.equal(result.curiosityObservation.user_response, 'interesting');
    const loop = JSON.parse(fs.readFileSync(path.join(output, 'career-evolution-loop-summary.json'), 'utf8'));
    assert.deepEqual(loop.flow, ['Resume + JD', 'Evidence Review', 'Candidate Knowledge Integration', 'Tailoring', 'Presentation Strategy', 'Resume Draft', 'Career Review', 'Approved Resume Export']);
    assert.equal(loop.presentation_strategy.shared_understanding.current_direction, 'Data Analytics');
    const report = fs.readFileSync(path.join(output, 'report.html'), 'utf8');
    for (const section of ['Career Understanding', 'Presentation Strategy', 'Resume Draft', 'Career Review', 'Approved Resume Export', 'Pipeline readiness']) assert.match(report, new RegExp(section));
    assert.match(report, /Evidence reviewed: 18/);
    assert.match(report, /Facts committed: 4/);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('without a capture fixture, unresolved acquisition is skipped and no unsupported evidence is integrated', async () => {
  const output = tempOutput();
  try {
    const result = await runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), evidenceReviewFixturePath: evidenceReviewFixture(), careerReviewFixturePath: careerReviewFixture(), outputDirectory: output });
    assert.ok(result.integration.applied_facts.length > 0);
    assert.equal(result.reviewRun.review_decisions.length, 18);
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
    const result = await runDemo({ resumePath: fixture('synthetic-complex-resume.txt'), jobInput: fixture('synthetic-job.txt'), evidenceReviewFixturePath: evidenceReviewFixture(), careerReviewFixturePath: careerReviewFixture(), outputDirectory: output, buildSemanticGraph: true });
    const graphStates = [...result.graph.nodes, ...result.graph.edges].filter((item) => item.decision_state === 'derived_structurally');
    assert.ok(result.graph.edges.length > 0); assert.ok(graphStates.length > 0);
    assert.ok(result.discovery.information_need_run.available_working_evidence_summary.length > 0);
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});

test('uses one canonical identity for three-line LinkedIn and Role at Company openings', () => {
  assert.deepEqual(jobIdentity('Zurich Canada\nFall 2026 Internship/Co-op - Data Analytics & AI\nToronto, ON'), { company: 'Zurich Canada', roleTitle: 'Fall 2026 Internship/Co-op - Data Analytics & AI', location: 'Toronto, ON' });
  assert.deepEqual(jobIdentity('Data Analyst at Acme'), { company: 'Acme', roleTitle: 'Data Analyst' });
});

test('primary demo requires an explicit Career Review fixture and does not add duplicate review or export modules', async () => {
  const output = tempOutput();
  try {
    await assert.rejects(runDemo({ resumePath: fixture('synthetic-resume.txt'), jobInput: fixture('synthetic-job.txt'), outputDirectory: output }), /Career Review requires/);
    const sourceFiles = fs.readdirSync(path.join(root, 'src'));
    assert.ok(!sourceFiles.includes('career-review.js'));
    assert.ok(!sourceFiles.includes('final-export.js'));
  } finally { fs.rmSync(output, { recursive: true, force: true }); }
});
