const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { Store } = require('../src/store');
const review = require('../src/evidence-review');
const { main: reviewCli } = require('../src/evidence-review-cli');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-review-')); const store = new Store(path.join(dir, 'test.db')); return Promise.resolve(run(store, dir)).finally(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); }); }
function setup(store) { const knowledge = store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic Candidate' }, facts: [{ entity_type: 'skill', value: { name: 'SQL' }, confirmation_status: 'needs_confirmation' }] }); const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' }); return { profile: knowledge.profile, job }; }

test('accepted evidence remains outside knowledge until 003.6 and then regenerates artifact and validation', async () => withStore(async (store) => {
  const { profile, job } = setup(store); const result = await review.run({ store, candidateProfileId: profile.id, jobRequirementProfileId: job.id, fixture: { decisions: [{ requirementName: 'SQL', action: 'accepted' }] }, nonInteractive: true });
  assert.equal(result.kpi.candidate_knowledge_facts_before, 0); assert.equal(result.integrationRun.integration_decisions[0].state, 'accepted'); assert.equal(result.kpi.candidate_knowledge_facts_after, 1); assert.equal(result.validation.status, 'passed'); assert.ok(result.artifact.markdown.includes('SQL')); assert.notEqual(result.beforePlan.id, result.afterPlan.id);
}));
test('skipped evidence creates no fact and duplicate fixture decisions use the first decision deterministically', async () => withStore(async (store) => {
  const { profile, job } = setup(store); const result = await review.run({ store, candidateProfileId: profile.id, jobRequirementProfileId: job.id, fixture: { decisions: [{ requirementName: 'SQL', action: 'skipped' }, { requirementName: 'SQL', action: 'accepted' }] }, nonInteractive: true });
  assert.equal(result.reviewRun.review_decisions[0].action, 'skipped'); assert.equal(store.getCommittedCandidateKnowledge(profile.id).length, 0); assert.equal(result.integrationRun, null);
}));
test('supported exact edit is integrated with provenance while unsupported edit is blocked', async () => withStore(async (store) => {
  const { profile, job } = setup(store); const good = await review.run({ store, candidateProfileId: profile.id, jobRequirementProfileId: job.id, fixture: { decisions: [{ requirementName: 'SQL', action: 'edited', value: { name: 'SQL' } }] }, nonInteractive: true });
  assert.equal(good.reviewRun.review_decisions[0].action, 'edited'); assert.equal(good.integrationRun.applied_facts.length, 1); assert.equal(good.reviewRun.review_decisions[0].source_evidence_refs[0].reviewedConfirmation, true);
  const other = setup(store); const bad = await review.run({ store, candidateProfileId: other.profile.id, jobRequirementProfileId: other.job.id, fixture: { decisions: [{ requirementName: 'SQL', action: 'edited', value: { name: 'Advanced SQL' } }] }, nonInteractive: true });
  assert.equal(bad.reviewRun.review_decisions[0].action, 'blocked'); assert.equal(bad.kpi.blocked_edits_count, 1); assert.equal(store.getCommittedCandidateKnowledge(other.profile.id).length, 0);
}));
test('review run snapshots are immutable and the prompt adapter is independently testable', async () => withStore(async (store) => {
  const { profile, job } = setup(store); const needs = store.createInformationNeedRun({ candidateProfileId: profile.id, jobRequirementProfileId: job.id }); const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id }); const item = review.queue(discovery)[0].candidates[0]; const source = store.getEvidenceReviewCandidate(discovery.id, item.candidate.id); const fake = { ask: async () => ({ action: 'accepted' }) }; const decisions = await review.collectInteractive([{ requirement: needs.information_needs[0], candidates: [{ ...item, entity_type: source.entity_type }] }], fake); const run = store.createEvidenceReviewRun({ candidateProfileId: profile.id, jobRequirementProfileId: job.id, evidenceDiscoveryRunId: discovery.id, decisions }); assert.equal(run.review_actor, 'user'); assert.equal(run.review_decisions.length, 1); assert.equal(store.getEvidenceReviewRun(run.id).discovery_snapshot.id, discovery.id);
}));
test('fixture CLI completes without stdin and writes the complete user-facing output set', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-review-cli-')); const db = path.join(dir, 'test.db'); const store = new Store(db); const { profile, job } = setup(store); store.close(); const fixture = path.join(dir, 'fixture.json'); const output = path.join(dir, 'output'); fs.writeFileSync(fixture, JSON.stringify({ decisions: [{ requirementName: 'SQL', action: 'accepted' }] })); const io = { stdin: null, stdout: { write() {} } };
  try { await reviewCli(['--db', db, '--candidate-profile-id', profile.id, '--job-profile-id', job.id, '--review-fixture', fixture, '--non-interactive', '--output-dir', output], io); for (const name of ['evidence-review-run.json', 'review-decisions.json', 'candidate-knowledge-after-review.json', 'tailoring-plan.json', 'resume-artifact.json', 'validation-report.json', 'resume-after-review.md', 'evidence-review-report.html']) assert.ok(fs.existsSync(path.join(output, name))); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('HTML report escapes review and resume content', () => {
  const output = require('../src/evidence-review-cli').html({ reviewRun: { review_decisions: [{ action: 'accepted', original_claim: '<script>alert(1)</script>', source_evidence_refs: [{ id: '<ref>' }] }] }, kpi: { needs_review_count: 1, auto_accepted_evidence_count: 0, committed_coverage_before: 0, committed_coverage_after: 100, candidate_knowledge_facts_before: 0, candidate_knowledge_facts_after: 1 }, validation: { status: 'passed', findings: [{ message: '</pre><script>alert(1)</script>' }] }, artifact: { markdown: '# Candidate\n</pre><script>alert(1)</script>' } });
  assert.ok(output.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!output.includes('<script>'));
});
