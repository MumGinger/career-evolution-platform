const test = require('node:test');
const assert = require('node:assert/strict');

const artifactGeneration = require('../../src/resume-artifact');

function sourceStatement(id, text, section, displayStyle, parent = null, position = 1) {
  return {
    statement_id: id,
    source_statement_id: id,
    text,
    section,
    position,
    display_style: displayStyle,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: parent,
    provenance: { source_kind: 'validated_resume_understanding', exact_source_text: text },
  };
}

function selection(id, fact, state, section, scope = []) {
  return {
    id,
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    mapped_requirement_ids: state === 'include' ? ['req-data'] : [],
    selection_state: state,
    relevance_rationale: state === 'include'
      ? 'Directly relevant to the target data role.'
      : 'No explicit match to the target job requirement profile.',
    inherited_provenance_references: [fact.integration_decision_id],
    recommended_section: section,
    emphasis_level: state === 'include' ? 'high' : 'low',
    priority_score: state === 'include' ? 20 : 0,
    permitted_claim_scope: scope,
    blocked_claim_scopes: [],
    limitations: '',
  };
}

test('explicit role-specific omit removes only the matched source subtree and preserves unrelated resume completeness', () => {
  const relevantProject = {
    id: 'fact-relevant-project',
    entity_type: 'project',
    value: { name: 'Analytics Dashboard' },
    integration_decision_id: 'decision-relevant-project',
  };
  const relevantBody = {
    id: 'fact-relevant-body',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI reporting for business stakeholders.' },
    integration_decision_id: 'decision-relevant-body',
  };
  const irrelevantProject = {
    id: 'fact-irrelevant-project',
    entity_type: 'project',
    value: { name: 'Gift Recommendation App' },
    integration_decision_id: 'decision-irrelevant-project',
  };
  const irrelevantBody = {
    id: 'fact-irrelevant-body',
    entity_type: 'responsibility',
    value: { text: 'Planned a future monetization roadmap for gift recommendations.' },
    integration_decision_id: 'decision-irrelevant-body',
  };

  const source = {
    format: 'source-resume-composition/1.0.0',
    source_resume_artifact_id: 'source-1',
    source_resume_artifact_version_id: 'source-1-v1',
    resume_semantic_run_id: 'semantic-1',
    sections: [
      {
        section: 'Projects',
        statements: [
          sourceStatement('source:relevant-heading', 'Analytics Dashboard', 'Projects', 'heading', null, 1),
          sourceStatement('source:relevant-body', 'Built Power BI reporting for business stakeholders.', 'Projects', 'bullet', 'source:relevant-heading', 2),
          sourceStatement('source:irrelevant-heading', 'Gift Recommendation App', 'Projects', 'heading', null, 3),
          sourceStatement('source:irrelevant-body', 'Planned a future monetization roadmap for gift recommendations.', 'Projects', 'bullet', 'source:irrelevant-heading', 4),
        ],
      },
      {
        section: 'Education',
        statements: [sourceStatement('source:education', 'University of Toronto — Statistics & Computer Science', 'Education', 'line', null, 5)],
      },
    ],
  };

  const plan = {
    id: 'plan-1',
    job_requirement_profile_id: 'job-1',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [relevantProject, relevantBody, irrelevantProject, irrelevantBody],
    source_resume_snapshot: source,
    resume_content_selections: [
      selection('sel-relevant-project', relevantProject, 'include', 'Projects', ['project_name']),
      selection('sel-relevant-body', relevantBody, 'include', 'Projects', ['bounded_project_responsibilities']),
      selection('sel-irrelevant-project', irrelevantProject, 'omit', 'Projects'),
      selection('sel-irrelevant-body', irrelevantBody, 'omit', 'Projects'),
    ],
    requirement_coverage: [{ job_requirement_id: 'req-data', coverage_status: 'covered', coverage_rationale: 'Relevant project supports the job.' }],
    section_plans: [{ section: 'Projects', recommended_order: 1, candidate_fact_ids: [relevantProject.id, relevantBody.id] }],
  };

  const artifact = artifactGeneration.generate(plan);
  const projects = artifact.sections.find((section) => section.section === 'Projects');
  const education = artifact.sections.find((section) => section.section === 'Education');

  assert.deepEqual(projects.statements.map((statement) => statement.text), [
    'Analytics Dashboard',
    'Built Power BI reporting for business stakeholders.',
  ]);
  assert.deepEqual(education.statements.map((statement) => statement.text), [
    'University of Toronto — Statistics & Computer Science',
  ], 'unrelated essential source content still survives complete-resume composition');
  assert.deepEqual(
    artifact.metadata.composition.omitted_source_statements.map((item) => item.source_statement_id),
    ['source:irrelevant-heading', 'source:irrelevant-body'],
  );
});
