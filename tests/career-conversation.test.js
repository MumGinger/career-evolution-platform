const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { Store } = require('../src/store');
const conversation = require('../src/career-conversation');
const { main: reviewCli, html } = require('../src/evidence-review-cli');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-conversation-')); const store = new Store(path.join(dir, 'test.db')); try { run(store, dir); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function reviewRun(store) { const knowledge = store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic Candidate' } }); const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' }); const needs = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id }); const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id }); return { profile: knowledge.profile, run: store.createEvidenceReviewRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id, evidenceDiscoveryRunId: discovery.id, decisions: [] }) }; }

test('records one answered observation without writing Candidate Knowledge', () => withStore((store) => {
  const { profile, run } = reviewRun(store); const observation = conversation.observe({ store, reviewRun: run, answer: 'Data Analytics' });
  assert.equal(observation.question, conversation.QUESTION); assert.equal(observation.answer, 'Data Analytics'); assert.equal(observation.skipped, false);
  assert.equal(store.getCommittedCandidateKnowledge(profile.id).length, 0);
}));
test('skip creates an explicit observation with no answer', () => withStore((store) => {
  const { run } = reviewRun(store); const observation = conversation.observe({ store, reviewRun: run, skipped: true });
  assert.equal(observation.answer, null); assert.equal(observation.skipped, true);
}));
test('a completed workflow never receives a duplicate question', () => withStore((store) => {
  const { run } = reviewRun(store); const first = conversation.observe({ store, reviewRun: run, answer: 'Finance' }); const second = conversation.observe({ store, reviewRun: run, skipped: true });
  assert.equal(first.id, second.id); assert.equal(second.answer, 'Finance');
}));
test('fixture CLI adds the optional answer to JSON and HTML output', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-conversation-cli-')); const db = path.join(dir, 'test.db'); const store = new Store(db); const knowledge = store.createResumeProfile({ sourcePath: 'synthetic.pdf', basic: { name: 'Synthetic Candidate' }, facts: [{ entity_type: 'skill', value: { name: 'SQL' }, confirmation_status: 'needs_confirmation' }] }); const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' }); store.close(); const fixture = path.join(dir, 'fixture.json'); const output = path.join(dir, 'output'); fs.writeFileSync(fixture, JSON.stringify({ decisions: [{ requirementName: 'SQL', action: 'skipped' }], careerConversation: { answer: 'AI / ML' } }));
  try { await reviewCli(['--db', db, '--candidate-profile-id', knowledge.profile.id, '--job-profile-id', job.id, '--review-fixture', fixture, '--non-interactive', '--output-dir', output], { stdin: null, stdout: { write() {} } }); const saved = JSON.parse(fs.readFileSync(path.join(output, 'career-conversation.json'), 'utf8')); assert.equal(saved.answer, 'AI / ML'); assert.match(fs.readFileSync(path.join(output, 'evidence-review-report.html'), 'utf8'), /Career Conversation/); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('HTML labels a skipped question explicitly', () => {
  const output = html({ reviewRun: { review_decisions: [] }, kpi: { needs_review_count: 0, auto_accepted_evidence_count: 0, committed_coverage_before: 0, committed_coverage_after: 0, candidate_knowledge_facts_before: 0, candidate_knowledge_facts_after: 0 }, validation: { status: 'passed', findings: [] }, artifact: { markdown: '# Candidate' }, careerConversation: { question: conversation.QUESTION, answer: null, skipped: true } });
  assert.match(output, /Answer:<\/strong> Skipped/); assert.match(output, /Skipped\?<\/strong> Yes/);
});
