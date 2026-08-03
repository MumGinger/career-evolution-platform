const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { Store } = require('../src/store');
const { runResumeSemanticUnderstanding } = require('../src/resume-semantic');
const { runResumeSemanticGraphConstruction } = require('../src/resume-semantic-graph');

const TEXT = `Projects
Analytics Console | 2025
- Built dashboards with SQL and Python; improved refresh time by 25%.
- Built workflow automation.
Experience
- Designed a reporting process.
Education
BSc Computer Science
Certifications
Cloud Certificate`;
function withStore(fn) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-graph-')); const store = new Store(path.join(dir, 'db.sqlite')); try { fn(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function build(store) { const profile = store.createProfile({ name: 'Synthetic' }); const artifact = store.createSourceResumeArtifactVersion({ profileId: profile.id, sourcePath: 'synthetic.txt', parsedText: TEXT }); const semantic = runResumeSemanticUnderstanding(store, { profileId: profile.id, artifactId: artifact.artifact.id }); return { profile, semantic, graph: runResumeSemanticGraphConstruction(store, { semanticRunId: semantic.id }) }; }
function node(graph, label) { return graph.nodes.find((item) => item.label === label); }

test('constructs bounded project, responsibility, tool, workflow, and achievement graph relations', () => withStore((store) => {
  const { graph } = build(store); const project = node(graph, 'Analytics Console | 2025'); const responsibility = node(graph, 'Built dashboards with SQL and Python; improved refresh time by 25%.');
  assert.ok(project && responsibility); assert.ok(graph.edges.some((edge) => edge.edge_type === 'performed_in'));
  assert.ok(graph.edges.some((edge) => edge.edge_type === 'used_in'));
  assert.ok(graph.edges.some((edge) => edge.edge_type === 'supports'));
  assert.ok(graph.edges.some((edge) => edge.edge_type === 'part_of'));
  assert.ok(graph.edges.some((edge) => edge.edge_type === 'produced_by'));
  assert.ok(graph.edges.some((edge) => edge.decision_state === 'derived_structurally'));
  assert.equal(graph.nodes.some((item) => /proficien|leadership|ownership|years/i.test(JSON.stringify(item))), false);
}));

test('keeps ambiguous bullets possible, excludes generic headings, and preserves exact span provenance', () => withStore((store) => {
  const { graph } = build(store); const ambiguous = node(graph, 'Designed a reporting process.');
  assert.equal(ambiguous.decision_state, 'possible'); assert.equal(graph.edges.some((edge) => edge.from_node_candidate_id === ambiguous.id && edge.edge_type === 'performed_in'), false);
  assert.equal(graph.nodes.some((item) => /Projects|Experience|Education/.test(item.label)), false);
  assert.ok(graph.nodes.every((item) => item.evidence_span_ids.length)); assert.ok(graph.edges.every((item) => item.evidence_span_ids.length));
}));

test('graph runs are immutable, do not write Candidate Knowledge, and graph evidence remains bounded', () => withStore((store) => {
  const { profile, semantic, graph } = build(store); const second = runResumeSemanticGraphConstruction(store, { semanticRunId: semantic.id });
  assert.notEqual(graph.id, second.id); assert.equal(store.getCandidateKnowledge(profile.id).facts.length, 0);
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Analyst', jobDescription: 'Required Qualifications:\nPython required.' });
  const needs = store.createInformationNeedRun({ candidateProfileId: profile.id, jobRequirementProfileId: job.id }); const need = needs.information_needs.find((item) => item.normalized_name === 'Python'); store.db.prepare("UPDATE information_needs SET status = 'unknown' WHERE id = ?").run(need.id);
  const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id }); const candidate = discovery.need_results[0].candidates.find((item) => item.candidate.source_type === 'resume_semantic_graph');
  assert.ok(candidate); assert.equal(candidate.resolution.state, 'accepted_for_need'); assert.ok(store.getInformationNeedRun(needs.id).available_working_evidence_summary.length);
}));
