const test = require('node:test');
const assert = require('node:assert/strict');

const humanReview = require('../../src/human-review');

function statement(id, text, origin, parent = null, selectionIds = []) {
  return {
    statement_id: id,
    source_statement_id: id.startsWith('source:') ? id : `source:${id}`,
    parent_source_statement_id: parent,
    text,
    display_style: parent ? 'bullet' : 'heading',
    content_origin: origin,
    resume_content_selection_ids: selectionIds,
    provenance: origin === 'source_resume_passthrough'
      ? { source_kind: 'validated_resume_understanding', exact_source_text: text }
      : { candidate_fact_id: `fact-${id}`, candidate_fact_ids: [`fact-${id}`] },
  };
}

test('Human Review focuses Projects on three target-selected entries while leaving source-only projects outside this application artifact', () => {
  const projects = [
    statement('source:stock', 'Stock Pattern Label Platform', 'source_resume_passthrough'),
    statement('source:stock:1', 'Studied intraday price and volume patterns.', 'source_resume_passthrough', 'source:stock'),
    statement('source:gift', 'Gift Recommendation App', 'source_resume_passthrough'),
    statement('source:gift:1', 'Built an AI-assisted gift flow.', 'source_resume_passthrough', 'source:gift'),
    statement('workflow', 'Workflow Automation & Document Generation System', 'candidate_knowledge_generated', null, ['selection-workflow']),
    statement('source:workflow:1', 'Automated structured data extraction and PDF generation.', 'source_resume_passthrough', 'source:workflow'),
    statement('salary', 'Global AI Job Salaries Visualization — developed an interactive salary analytics dashboard.', 'candidate_knowledge_generated', null, ['selection-salary']),
    statement('source:salary:1', 'Built coordinated D3.js visualizations.', 'source_resume_passthrough', 'source:salary'),
    statement('analysis', 'Data Analysis and Model Building — developed regression and GLM models.', 'candidate_knowledge_generated', null, ['selection-analysis']),
    statement('source:analysis:1', 'Implemented Generalized Linear Models.', 'source_resume_passthrough', 'source:analysis'),
    statement('source:pagerank', 'RESEARCH EXPERIENCE\nResearch Project on PageRank', 'source_resume_passthrough'),
    statement('source:pagerank:1', 'Developed a Java PageRank application.', 'source_resume_passthrough', 'source:pagerank'),
  ];

  const reviews = humanReview.createDraft({
    artifactRun: {
      id: 'artifact-run-project-targeting',
      resume_tailoring_plan_run_id: 'plan-project-targeting',
      resume_artifacts: [{
        artifact_type: 'structured_resume',
        content: { sections: [{ section: 'Projects', position: 5, statements: projects }] },
      }],
    },
  });

  const projectReview = reviews.find((review) => review.section === 'Projects');
  const text = projectReview.ai_version.statements.map((item) => item.text).join('\n');
  assert.match(text, /Workflow Automation/);
  assert.match(text, /Global AI Job Salaries/);
  assert.match(text, /Data Analysis and Model Building/);
  assert.doesNotMatch(text, /Gift Recommendation App|Stock Pattern Label Platform|PageRank/);
  assert.equal(projectReview.presentation_rationale.some((reason) => /source-only project entries remain/i.test(reason)), true);
});
