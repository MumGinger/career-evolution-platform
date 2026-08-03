const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { Store } = require('../src/store');
const { runResumeSemanticUnderstanding } = require('../src/resume-semantic');
const { runResumeSemanticGraphConstruction } = require('../src/resume-semantic-graph');
const discoveryPolicy = require('../src/evidence-discovery');

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

test('reconstructs graph structure from persisted real-style spans when 002.5 has flat entities and no relations', () => withStore((store) => {
  const profile = store.createProfile({ name: 'Flat semantic run' });
  const artifact = store.createSourceResumeArtifactVersion({ profileId: profile.id, sourcePath: 'flat-pdf.txt', parsedText: 'Persisted fixture only' });
  const semantic = store.createResumeSemanticRun({ profileId: profile.id, artifactId: artifact.artifact.id, policyVersion: 'fixture/1.0.0', parsed: {
    spans: [
      { key: 'skills', section_name: 'skills', bullet_index: null, line_start: 1, line_end: 1, raw_text: 'SQL, Python' },
      { key: 'projects-heading', section_name: 'projects', bullet_index: null, line_start: 3, line_end: 3, raw_text: 'Projects' },
      { key: 'project', section_name: 'projects', bullet_index: null, line_start: 4, line_end: 4, raw_text: 'Zurich Analytics Console | 2025' },
      { key: 'wrapped-bullet', section_name: 'projects', bullet_index: null, line_start: 5, line_end: 6, raw_text: 'Built dashboards with SQL and Python; improved refresh time by 25%.' },
      { key: 'imperfect-bullet', section_name: 'projects', bullet_index: 9, line_start: 7, line_end: 7, raw_text: 'Automated workflow automation with SQL.' },
      { key: 'experience-heading', section_name: 'experience', bullet_index: null, line_start: 9, line_end: 9, raw_text: 'Experience' },
      { key: 'unanchored-bullet', section_name: 'experience', bullet_index: null, line_start: 10, line_end: 10, raw_text: 'Designed a reporting process.' },
      { key: 'education', section_name: 'education', bullet_index: null, line_start: 12, line_end: 12, raw_text: 'BSc Computer Science' },
    ],
    entities: [
      { key: 'tool-sql', span_key: 'skills', entity_type: 'tool', name: 'SQL', decision_state: 'explicit', rationale: 'Exact listed tool.', attributes: {} },
      { key: 'tool-python', span_key: 'skills', entity_type: 'tool', name: 'Python', decision_state: 'explicit', rationale: 'Exact listed tool.', attributes: {} },
      { key: 'education', span_key: 'education', entity_type: 'education', name: 'BSc Computer Science', decision_state: 'explicit', rationale: 'Exact education.', attributes: {} },
    ], relations: [],
  } });
  assert.equal(semantic.relations.length, 0); assert.equal(semantic.entities.some((item) => item.entity_type === 'responsibility'), false);
  const graph = runResumeSemanticGraphConstruction(store, { semanticRunId: semantic.id });
  assert.ok(graph.nodes.filter((item) => item.node_type === 'responsibility').length >= 3);
  assert.ok(graph.edges.length > 0); assert.ok(graph.edges.some((item) => item.edge_type === 'performed_in'));
  assert.ok(graph.edges.some((item) => item.edge_type === 'used_in')); assert.ok(graph.edges.some((item) => item.edge_type === 'supports'));
  assert.ok(graph.edges.some((item) => item.edge_type === 'part_of'));
  assert.ok(graph.nodes.some((item) => item.decision_state === 'explicit'));
  assert.ok(graph.nodes.some((item) => item.decision_state === 'derived_structurally'));
  assert.ok(graph.nodes.some((item) => item.decision_state === 'possible'));
  const derivedResponsibility = store.getResumeSemanticGraphEvidenceSnapshot(profile.id).find((item) => item.entity_type === 'responsibility' && item.provenance.decision_state === 'derived_structurally');
  const candidate = discoveryPolicy.candidateFor({ id: 'need' }, derivedResponsibility, 'resume_semantic_graph');
  assert.equal(discoveryPolicy.resolve([candidate])[0].state, 'needs_confirmation');
  assert.equal(store.getCandidateKnowledge(profile.id).facts.length, 0);
}));
