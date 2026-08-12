const test = require('node:test');
const assert = require('node:assert/strict');
const composition = require('../../src/resume-composition');
const artifactGeneration = require('../../src/resume-artifact');
const humanReview = require('../../src/human-review');
const applicantResume = require('../../src/applicant-resume');

function sourceSnapshot() {
  const spans = [
    ['s1', 1, 'Data Analyst — Example Co.'],
    ['s2', 2, 'Built recurring reporting for stakeholders.'],
    ['s3', 3, 'Gift Recommendation App'],
    ['s4', 4, 'Built a recommendation workflow with React and API integrations.'],
    ['s5', 5, 'Stock Pattern Label Platform'],
    ['s6', 6, 'Built an interface for labeling market patterns.'],
  ].map(([id, bullet_index, raw_text]) => ({
    id,
    bullet_index,
    raw_text,
    artifact_id: 'resume-128',
    artifact_version_id: 'resume-128-v1',
  }));

  const entities = [
    ['e1', 'experience', 's1', 'experience-1', null],
    ['e2', 'responsibility', 's2', 'responsibility-1', 'experience-1'],
    ['e3', 'project', 's3', 'project-1', null],
    ['e4', 'responsibility', 's4', 'responsibility-2', 'project-1'],
    ['e5', 'project', 's5', 'project-2', null],
    ['e6', 'responsibility', 's6', 'responsibility-3', 'project-2'],
  ].map(([id, entity_type, evidence_span_id, upstream_block_id, parent_id]) => ({
    id,
    entity_type,
    evidence_span_id,
    attributes: { upstream_block_id, parent_id },
  }));

  return composition.composeSourceResume({
    profile: { id: 'profile-128' },
    semanticRun: {
      id: 'semantic-128',
      artifact_id: 'resume-128',
      artifact_version_id: 'resume-128-v1',
      spans,
      entities,
    },
  });
}

function plan() {
  const projectFact = {
    id: 'fact-gift-project',
    entity_type: 'project',
    value: { name: 'Gift Recommendation App' },
    integration_decision_id: 'integration-gift',
  };
  const responsibilityFact = {
    id: 'fact-gift-responsibility',
    entity_type: 'responsibility',
    value: { text: 'Built a recommendation workflow with React and API integrations.' },
    integration_decision_id: 'integration-gift-body',
  };

  return {
    id: 'plan-128',
    job_requirement_profile_id: 'job-128',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [projectFact, responsibilityFact],
    source_resume_snapshot: sourceSnapshot(),
    resume_content_selections: [
      {
        id: 'selection-gift-project',
        candidate_fact_id: projectFact.id,
        candidate_fact_revision: projectFact.id,
        mapped_requirement_ids: ['requirement-analytics'],
        selection_state: 'include',
        relevance_rationale: 'Project is relevant to the role.',
        inherited_provenance_references: ['integration-gift'],
        recommended_section: 'Projects',
        emphasis_level: 'high',
        priority_score: 20,
        permitted_claim_scope: ['project_name'],
        blocked_claim_scopes: [],
        limitations: '',
      },
      {
        id: 'selection-gift-responsibility',
        candidate_fact_id: responsibilityFact.id,
        candidate_fact_revision: responsibilityFact.id,
        mapped_requirement_ids: ['requirement-analytics'],
        selection_state: 'include',
        relevance_rationale: 'Project responsibility is relevant to the role.',
        inherited_provenance_references: ['integration-gift-body'],
        recommended_section: 'Projects',
        emphasis_level: 'high',
        priority_score: 19,
        permitted_claim_scope: ['bounded_project_responsibilities'],
        blocked_claim_scopes: [],
        limitations: '',
      },
    ],
    requirement_coverage: [{
      job_requirement_id: 'requirement-analytics',
      coverage_status: 'covered',
      coverage_rationale: 'Project evidence is explicit.',
    }],
    section_plans: [{ section: 'Projects', recommended_order: 1, candidate_fact_ids: [projectFact.id, responsibilityFact.id] }],
  };
}

function artifactRun(generated) {
  return {
    id: 'artifact-run-128',
    resume_tailoring_plan_run_id: 'plan-128',
    resume_artifacts: [{
      artifact_type: 'structured_resume',
      content: { format: generated.format, sections: generated.sections },
      metadata: generated.metadata,
    }],
  };
}

test('tailored project heading and child keep one source entry through composition, Career Review, and presentation', () => {
  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.0.0',
    draft: {
      sections: [{
        section: 'Projects',
        statements: [
          {
            text: 'Gift Recommendation App — analytics-focused recommendation workflow',
            candidate_fact_ids: ['fact-gift-project'],
            job_requirement_ids: ['requirement-analytics'],
          },
          {
            text: 'Built a React recommendation workflow with integrated APIs for job-relevant analytics use cases.',
            candidate_fact_ids: ['fact-gift-responsibility'],
            job_requirement_ids: ['requirement-analytics'],
          },
        ],
      }],
    },
  };

  const generated = artifactGeneration.generate(plan(), null, provider);
  const projects = generated.sections.find((section) => section.section === 'Projects');
  const tailoredHeading = projects.statements.find((statement) =>
    statement.text.startsWith('Gift Recommendation App'));
  const tailoredGiftBody = projects.statements.find((statement) =>
    statement.text.startsWith('Built a React recommendation workflow'));

  assert.equal(tailoredHeading.display_style, 'heading');
  assert.equal(tailoredHeading.content_origin, 'candidate_knowledge_generated');
  assert.ok(tailoredHeading.source_statement_id, 'tailored heading must retain the source heading identity');
  assert.equal(tailoredGiftBody.display_style, 'bullet');
  assert.equal(tailoredGiftBody.content_origin, 'candidate_knowledge_generated');
  assert.ok(tailoredGiftBody.source_statement_id, 'tailored child must retain the source child identity');
  assert.equal(tailoredGiftBody.parent_source_statement_id, tailoredHeading.source_statement_id);

  const review = humanReview.createDraft({ artifactRun: artifactRun(generated) });
  const projectReview = review.find((section) => section.section === 'Projects');
  const reviewedHeading = projectReview.ai_version.statements.find((statement) =>
    statement.text.startsWith('Gift Recommendation App'));
  const reviewedGiftBody = projectReview.ai_version.statements.find((statement) =>
    statement.text.startsWith('Built a React recommendation workflow'));

  assert.equal(reviewedHeading.source_statement_id, tailoredHeading.source_statement_id);
  assert.equal(reviewedGiftBody.source_statement_id, tailoredGiftBody.source_statement_id);
  assert.equal(reviewedGiftBody.parent_source_statement_id, reviewedHeading.source_statement_id);

  const model = applicantResume.resumePresentationModel(review);
  const projectModel = model.find((section) => section.section === 'Projects');

  assert.equal(projectModel.entries.length, 2);
  assert.equal(projectModel.entries[0].title, 'Gift Recommendation App — analytics-focused recommendation workflow');
  assert.deepEqual(projectModel.entries[0].body.map((statement) => statement.text), [
    'Built a React recommendation workflow with integrated APIs for job-relevant analytics use cases.',
  ]);
  assert.equal(projectModel.entries[1].title, 'Stock Pattern Label Platform');
  assert.deepEqual(projectModel.entries[1].body.map((statement) => statement.text), [
    'Built an interface for labeling market patterns.',
  ]);
});
