const test = require('node:test');
const assert = require('node:assert/strict');

const cleanup = require('../../src/applicant-cleanup');

function review(statements) {
  return {
    section: 'Projects',
    action: 'approve',
    ai_version: { placeholder: null, statements },
    final_version: { placeholder: null, statements },
  };
}

test('generated project synopsis is not rendered as an oversized project title when child bullets carry the detail', () => {
  const heading = {
    statement_id: 'draft:Projects:1',
    source_statement_id: 'source:salary',
    parent_source_statement_id: null,
    text: 'Global AI Job Salaries Visualization — developed an interactive salary analytics dashboard to analyze compensation by location, experience level, job category, and industry.',
    display_style: 'heading',
    content_origin: 'candidate_knowledge_generated',
    resume_content_selection_ids: ['selection-salary'],
    provenance: { candidate_fact_id: 'fact-salary', candidate_fact_ids: ['fact-salary'] },
  };
  const bullet = {
    statement_id: 'source:salary:1',
    source_statement_id: 'source:salary:1',
    parent_source_statement_id: 'source:salary',
    text: 'Built coordinated D3.js visualizations, including a global map and box plot chart.',
    display_style: 'bullet',
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    provenance: { exact_source_text: 'Built coordinated D3.js visualizations, including a global map and box plot chart.' },
  };

  const cleaned = cleanup.cleanRun({ section_reviews: [review([heading, bullet])] });
  assert.equal(cleaned.section_reviews[0].ai_version.statements[0].text, 'Global AI Job Salaries Visualization');
});
