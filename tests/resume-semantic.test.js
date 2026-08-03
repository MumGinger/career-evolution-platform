const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/store');
const { runResumeSemanticUnderstanding } = require('../src/resume-semantic');

const SYNTHETIC_RESUME = `Skills
SQL, Python, React

Projects
Analytics Console | 2025
- Developed dashboards with SQL and Python; improved refresh time by 25%.
- Built workflow automation with caching and data ingestion.

Experience
- Designed a reporting process.
Data Associate | 2024
- Implemented a regression model visualization.

Education
BSc, Computer Science

Certifications
Cloud Fundamentals Certificate`;
function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-semantic-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function run(store, text = SYNTHETIC_RESUME) { const profile = store.createProfile({ name: 'Synthetic Candidate' }); const artifact = store.createSourceResumeArtifactVersion({ profileId: profile.id, sourcePath: 'synthetic-resume.txt', parsedText: text }); return { profile, artifact, semantic: runResumeSemanticUnderstanding(store, { profileId: profile.id, artifactId: artifact.artifact.id }) }; }

test('creates exact skill and tool candidates with source spans', () => withStore((store) => {
  const { semantic } = run(store); const sql = semantic.entities.find((entity) => entity.name === 'SQL');
  assert.equal(sql.entity_type, 'tool'); assert.equal(sql.decision_state, 'explicit');
  assert.equal(semantic.spans.find((span) => span.id === sql.evidence_span_id).raw_text, 'SQL, Python, React');
}));
test('anchors project bullets and links separate SQL and Python candidates without proficiency claims', () => withStore((store) => {
  const { semantic } = run(store); const project = semantic.entities.find((entity) => entity.entity_type === 'project');
  assert.equal(project.name, 'Analytics Console | 2025');
  for (const name of ['SQL', 'Python']) assert.ok(semantic.entities.some((entity) => entity.name === name && entity.evidence_span_id !== project.evidence_span_id));
  assert.ok(semantic.relations.some((relation) => relation.relation_type === 'used_in'));
  assert.equal(semantic.entities.some((entity) => /proficien|years|leadership|ownership/i.test(JSON.stringify(entity))), false);
}));
test('creates achievements only for explicit quantified outcomes and generic verbs do not claim leadership', () => withStore((store) => {
  const { semantic } = run(store); assert.equal(semantic.entities.filter((entity) => entity.entity_type === 'achievement').length, 1);
  assert.equal(semantic.entities.some((entity) => /leadership|ownership/i.test(entity.entity_type)), false);
}));
test('keeps an unanchored bullet possible instead of falsely attaching it', () => withStore((store) => {
  const { semantic } = run(store); const ambiguous = semantic.entities.find((entity) => entity.name === 'Designed a reporting process.');
  assert.equal(ambiguous.decision_state, 'possible');
  assert.equal(semantic.relations.some((relation) => relation.from_entity_candidate_id === ambiguous.id && relation.relation_type === 'performed_in'), false);
}));
test('applies narrow policy vocabulary but does not infer QA or testing', () => withStore((store) => {
  const { semantic } = run(store); assert.ok(semantic.entities.some((entity) => entity.name === 'automation' && entity.entity_type === 'workflow'));
  assert.equal(semantic.entities.some((entity) => /qa|testing/i.test(entity.name)), false);
}));
test('creates education and credential candidates with provenance', () => withStore((store) => {
  const { semantic } = run(store); for (const type of ['education', 'credential']) { const entity = semantic.entities.find((item) => item.entity_type === type); assert.ok(entity); assert.ok(semantic.spans.some((span) => span.id === entity.evidence_span_id && span.artifact_version_id)); }
}));
test('creates immutable runs, does not write Candidate Knowledge, and exposes bounded discovery evidence', () => withStore((store) => {
  const { profile, artifact, semantic } = run(store); const second = runResumeSemanticUnderstanding(store, { profileId: profile.id, artifactId: artifact.artifact.id });
  assert.notEqual(semantic.id, second.id); assert.equal(store.getCandidateKnowledge(profile.id).facts.length, 0);
  const evidence = store.getResumeSemanticEvidenceSnapshot(profile.id).filter((item) => item.value.name === 'Python'); assert.ok(evidence.length >= 1); assert.ok(evidence.every((item) => item.source === 'resume_semantic'));
}));
test('Evidence Discovery searches explicit semantic candidates without writing Candidate Knowledge', () => withStore((store) => {
  const { profile } = run(store);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nPython required.' });
  const information = store.createInformationNeedRun({ candidateProfileId: profile.id, jobRequirementProfileId: job.id });
  const need = information.information_needs.find((item) => item.normalized_name === 'Python');
  store.db.prepare("UPDATE information_needs SET status = 'unknown' WHERE id = ?").run(need.id);
  const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: information.id });
  const semanticSearch = discovery.source_searches.find((item) => item.source_type === 'resume_semantic');
  assert.equal(semanticSearch.result_status, 'completed_with_candidates');
  assert.ok(discovery.need_results[0].candidates.some((item) => item.candidate.source_type === 'resume_semantic'));
  assert.equal(store.getCandidateKnowledge(profile.id).facts.length, 0);
}));
