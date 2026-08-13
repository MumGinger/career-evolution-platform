const test = require('node:test');
const assert = require('node:assert/strict');
const { composeSourceResume } = require('../../src/resume-composition');
const { CANONICAL_RESUME_VERSION, canonicalResumeErrors, projectSourceResumeSnapshot } = require('../../src/source-structure-projection');

function semanticRun() {
  return {
    id: 'semantic-run-1',
    artifact_id: 'source-artifact-1',
    artifact_version_id: 'source-version-1',
    spans: [
      {
        id: 'span-parent',
        bullet_index: 1,
        raw_text: 'Analytics Dashboard\n(Python, SQL, Power BI)\nMay 2025 - Present\n- Built Power BI dashboards using Python and SQL.\n- Automated weekly reporting workflows in Python.',
      },
      { id: 'span-child-1', bullet_index: 2, raw_text: 'Built Power BI dashboards using Python and SQL.' },
      { id: 'span-child-2', bullet_index: 3, raw_text: 'Automated weekly reporting workflows in Python.' },
    ],
    entities: [
      {
        id: 'entity-parent',
        evidence_span_id: 'span-parent',
        entity_type: 'project',
        attributes: {
          upstream_block_id: 'project-1',
          title: 'Analytics Dashboard',
          parent_id: null,
        },
      },
      {
        id: 'entity-child-1',
        evidence_span_id: 'span-child-1',
        entity_type: 'responsibility',
        attributes: {
          upstream_block_id: 'project-child-1',
          title: 'Built Power BI dashboards using Python and SQL.',
          parent_id: 'project-1',
        },
      },
      {
        id: 'entity-child-2',
        evidence_span_id: 'span-child-2',
        entity_type: 'responsibility',
        attributes: {
          upstream_block_id: 'project-child-2',
          title: 'Automated weekly reporting workflows in Python.',
          parent_id: 'project-1',
        },
      },
    ],
  };
}

test('source structure boundary projects raw parent evidence into one heading, metadata lines, and nonduplicated child bullets', () => {
  const semantic = semanticRun();
  const raw = composeSourceResume({ profile: { id: 'profile-1' }, semanticRun: semantic });
  const artifact = projectSourceResumeSnapshot(raw, semantic);
  const projects = artifact.sections.find((section) => section.section === 'Projects').statements;
  assert.deepEqual(projects.map((statement) => [statement.display_style, statement.text]), [
    ['heading', 'Analytics Dashboard'],
    ['line', '(Python, SQL, Power BI)'],
    ['line', 'May 2025 - Present'],
    ['bullet', 'Built Power BI dashboards using Python and SQL.'],
    ['bullet', 'Automated weekly reporting workflows in Python.'],
  ]);
  assert.equal(projects.filter((statement) => statement.text.includes('Built Power BI dashboards using Python and SQL.')).length, 1);
  assert.equal(projects[3].parent_source_statement_id, projects[0].source_statement_id);
  assert.equal(projects[4].parent_source_statement_id, projects[0].source_statement_id);
  assert.equal(projects[0].provenance.raw_container_exact_source_text.includes('May 2025 - Present'), true);
  assert.equal(artifact.structure_projection.raw_evidence_authority, 'resume_semantic_run');

  const canonical = artifact.canonical_document;
  assert.equal(canonical.schema, CANONICAL_RESUME_VERSION);
  assert.deepEqual(canonicalResumeErrors(canonical), []);
  assert.equal(artifact.structure_projection.structural_authority, CANONICAL_RESUME_VERSION);
  const projectSection = canonical.sections.find((section) => section.section === 'Projects');
  assert.equal(projectSection.entries.length, 1);
  assert.equal(projectSection.entries[0].title, 'Analytics Dashboard');
  assert.deepEqual(projectSection.entries[0].metadata.map((item) => item.text), ['(Python, SQL, Power BI)', 'May 2025 - Present']);
  assert.deepEqual(projectSection.entries[0].body.map((item) => item.text), [
    'Built Power BI dashboards using Python and SQL.',
    'Automated weekly reporting workflows in Python.',
  ]);
});
