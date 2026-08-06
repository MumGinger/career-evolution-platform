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
test('accepted contextual project evidence preserves the matching child bullet through 003.6', async () => withStore(async (store) => {
  const sourceText = 'Projects\nReporting Portal\n- Built SQL automation for weekly reporting.';
  const knowledge = store.createResumeProfile({ sourcePath: 'synthetic-contextual.txt', basic: { name: 'Synthetic Candidate' }, facts: [] });
  const source = store.createSourceResumeArtifactVersion({ profileId: knowledge.profile.id, sourcePath: 'synthetic-contextual.txt', parsedText: sourceText });
  store.createResumeSemanticRun({ profileId: knowledge.profile.id, artifactId: source.artifact.id, policyVersion: 'synthetic/1', parsed: {
    spans: [
      { key: 'project-span', section_name: 'Projects', line_start: 2, line_end: 2, raw_text: 'Reporting Portal' },
      { key: 'bullet-span', section_name: 'Projects', bullet_index: 1, line_start: 3, line_end: 3, raw_text: 'Built SQL automation for weekly reporting.' },
    ],
    entities: [
      { key: 'project', span_key: 'project-span', entity_type: 'project', name: 'Reporting Portal', decision_state: 'explicit', rationale: 'Synthetic parent.', attributes: { upstream_block_id: 'project-block' } },
      { key: 'bullet', span_key: 'bullet-span', entity_type: 'responsibility', name: 'Built SQL automation for weekly reporting.', decision_state: 'explicit', rationale: 'Synthetic child.', attributes: { upstream_block_id: 'bullet-block', parent_id: 'project-block' } },
    ], relations: [],
  } });
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nSQL required.' });
  const needs = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
  const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
  const project = review.queue(discovery).flatMap((group) => group.candidates).map((item) => ({ ...item, entity_type: store.getEvidenceReviewCandidate(discovery.id, item.candidate.id).entity_type })).find((item) => item.entity_type === 'project');
  assert.equal(project.candidate.extraction_method, 'source_bound_semantic_contextual_retrieval');
  assert.equal(project.candidate.supporting_text, 'Built SQL automation for weekly reporting.');
  assert.deepEqual(project.candidate.provenance.contextual_match, {
    matched_evidence_id: project.candidate.source_reference,
    matched_evidence_span_id: project.candidate.provenance.evidence_span_id,
    matched_upstream_block_id: 'bullet-block', matched_parent_id: 'project-block',
    matched_source_text: 'Built SQL automation for weekly reporting.', matched_line_start: 3, matched_line_end: 3,
    parent_evidence_id: project.candidate.provenance.semantic.contextual_match.parent_evidence_id,
    parent_evidence_span_id: project.candidate.provenance.semantic.contextual_match.parent_evidence_span_id,
    parent_upstream_block_id: 'project-block',
  });
  // Real-provider project candidates can retain only a bounded project name;
  // the integration boundary must add the immutable evidence reference.
  store.db.prepare('UPDATE evidence_candidates SET supporting_value = ? WHERE id = ?').run(JSON.stringify({ name: 'Reporting Portal' }), project.candidate.id);
  const projectWithoutSourceReference = { ...project, candidate: store.getEvidenceReviewCandidate(discovery.id, project.candidate.id).candidate };
  const reviewRun = store.createEvidenceReviewRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id, evidenceDiscoveryRunId: discovery.id, decisions: [review.decisionFrom(projectWithoutSourceReference, { action: 'accepted' })] });
  const integrationRun = review.integrateReviewedEvidence({ store, candidateProfileId: knowledge.profile.id, discoveryRunId: discovery.id, reviewRun });
  assert.equal(integrationRun.integration_decisions[0].state, 'accepted');
  assert.equal(integrationRun.applied_facts[0].entity_type, 'project');
  const accepted = integrationRun.upstream_snapshot.need_results.flatMap((result) => result.candidates).find((item) => item.candidate.id === project.candidate.id);
  assert.equal(accepted.candidate.provenance.contextual_match.matched_upstream_block_id, 'bullet-block');
  assert.equal(accepted.candidate.provenance.contextual_match.parent_upstream_block_id, 'project-block');
}));
test('fixture CLI completes without stdin and writes the complete user-facing output set', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-review-cli-')); const db = path.join(dir, 'test.db'); const store = new Store(db); const { profile, job } = setup(store); store.close(); const fixture = path.join(dir, 'fixture.json'); const output = path.join(dir, 'output'); fs.writeFileSync(fixture, JSON.stringify({ decisions: [{ requirementName: 'SQL', action: 'accepted' }] })); const io = { stdin: null, stdout: { write() {} } };
  try { await reviewCli(['--db', db, '--candidate-profile-id', profile.id, '--job-profile-id', job.id, '--review-fixture', fixture, '--non-interactive', '--output-dir', output], io); for (const name of ['evidence-review-run.json', 'review-decisions.json', 'candidate-knowledge-after-review.json', 'career-conversation.json', 'tailoring-plan.json', 'resume-artifact.json', 'validation-report.json', 'resume-after-review.md', 'evidence-review-report.html']) assert.ok(fs.existsSync(path.join(output, name))); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('HTML report escapes review and resume content', () => {
  const output = require('../src/evidence-review-cli').html({ reviewRun: { review_decisions: [{ action: 'accepted', original_claim: '<script>alert(1)</script>', source_evidence_refs: [{ id: '<ref>' }] }] }, kpi: { needs_review_count: 1, auto_accepted_evidence_count: 0, committed_coverage_before: 0, committed_coverage_after: 100, candidate_knowledge_facts_before: 0, candidate_knowledge_facts_after: 1 }, validation: { status: 'passed', findings: [{ message: '</pre><script>alert(1)</script>' }] }, artifact: { markdown: '# Candidate\n</pre><script>alert(1)</script>' } });
  assert.ok(output.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!output.includes('<script>'));
});
