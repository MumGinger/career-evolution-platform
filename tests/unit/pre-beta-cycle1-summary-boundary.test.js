const test = require('node:test');
const assert = require('node:assert/strict');

const llmUnderstanding = require('../../src/llm-resume-understanding');
const { composeSourceResume } = require('../../src/resume-composition');

function summaryBlock() {
  return {
    id: 'summary-1',
    type: 'summary',
    title: 'Professional Summary',
    label: 'Professional Summary',
    exact_source_text: 'Statistics and Computer Science student focused on data analytics and AI.',
    source_location: { start: 8, end: 82 },
    parent_id: null,
    normalized_meaning: 'Statistics and Computer Science student focused on data analytics and AI.',
    confidence: 'high',
    state: 'confirmed',
    provenance: {
      source: 'resume_input',
      exact_source_text: 'Statistics and Computer Science student focused on data analytics and AI.',
    },
    limitations: [],
  };
}

test('Resume Understanding accepts an explicit source summary block', () => {
  const text = `SUMMARY\n${summaryBlock().exact_source_text}\nSKILLS\nPython | SQL | Power BI`;
  const validation = llmUnderstanding.validateUnderstanding({
    understanding: { blocks: [summaryBlock()] },
    text,
  });

  assert.equal(validation.status, 'passed');
  assert.equal(validation.valid_blocks.length, 1);
  assert.equal(validation.valid_blocks[0].type, 'summary');
});

test('complete-resume composition preserves source summary as Professional Summary', () => {
  const semanticRun = {
    id: 'semantic-real-shape',
    artifact_id: 'resume-real',
    artifact_version_id: 'resume-real-v1',
    spans: [
      {
        id: 'span-summary',
        raw_text: 'Statistics and Computer Science student focused on data analytics and AI.',
        line_start: 2,
        bullet_index: null,
      },
      {
        id: 'span-skill',
        raw_text: 'Programming & Data: Python | SQL | Power BI',
        line_start: 5,
        bullet_index: null,
      },
    ],
    entities: [
      {
        id: 'entity-summary',
        evidence_span_id: 'span-summary',
        entity_type: 'summary',
        attributes: { upstream_block_id: 'summary-1', parent_id: null },
      },
      {
        id: 'entity-skill',
        evidence_span_id: 'span-skill',
        entity_type: 'skill',
        attributes: { upstream_block_id: 'skill-1', parent_id: null },
      },
    ],
  };

  const composed = composeSourceResume({ profile: { id: 'profile-1' }, semanticRun });
  const summary = composed.sections.find((section) => section.section === 'Professional Summary');
  const skills = composed.sections.find((section) => section.section === 'Skills');

  assert.deepEqual(summary.statements.map((statement) => statement.text), [
    'Statistics and Computer Science student focused on data analytics and AI.',
  ]);
  assert.deepEqual(skills.statements.map((statement) => statement.text), [
    'Programming & Data: Python | SQL | Power BI',
  ]);
});
