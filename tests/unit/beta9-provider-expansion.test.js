const test = require('node:test');
const assert = require('node:assert/strict');
const composition = require('../../src/resume-composition');
const artifactGeneration = require('../../src/resume-artifact');
const humanReview = require('../../src/human-review');
const applicant = require('../../src/applicant-resume');

function sourceSnapshot() {
  const spans = [
    { id: 'heading', bullet_index: 1, raw_text: 'Gift Recommendation App', artifact_id: 'resume-expansion', artifact_version_id: 'v1' },
    { id: 'body', bullet_index: 2, raw_text: 'Built a recommendation workflow with React and API integrations.', artifact_id: 'resume-expansion', artifact_version_id: 'v1' },
  ];
  const entities = [
    { id: 'project', entity_type: 'project', evidence_span_id: 'heading', attributes: { upstream_block_id: 'project-entry', parent_id: null } },
    { id: 'responsibility', entity_type: 'responsibility', evidence_span_id: 'body', attributes: { upstream_block_id: 'project-body', parent_id: 'project-entry' } },
  ];
  return composition.composeSourceResume({
    profile: { id: 'profile-expansion' },
    semanticRun: {
      id: 'semantic-expansion',
      artifact_id: 'resume-expansion',
      artifact_version_id: 'v1',
      spans,
      entities,
    },
  });
}

function plan() {
  const fact = {
    id: 'fact-body',
    entity_type: 'responsibility',
    value: { text: 'Built a recommendation workflow with React and API integrations.' },
    integration_decision_id: 'integration-body',
  };
  return {
    id: 'plan-expansion',
    job_requirement_profile_id: 'job-expansion',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [fact],
    source_resume_snapshot: sourceSnapshot(),
    resume_content_selections: [{
      id: 'selection-body',
      candidate_fact_id: fact.id,
      candidate_fact_revision: fact.id,
      mapped_requirement_ids: ['requirement-analytics'],
      selection_state: 'include',
      relevance_rationale: 'Explicit source-backed project work is relevant.',
      inherited_provenance_references: ['integration-body'],
      recommended_section: 'Projects',
      emphasis_level: 'high',
      priority_score: 20,
      permitted_claim_scope: ['bounded_project_responsibilities'],
      blocked_claim_scopes: [],
      limitations: '',
    }],
    requirement_coverage: [{
      job_requirement_id: 'requirement-analytics',
      coverage_status: 'covered',
      coverage_rationale: 'Explicit project evidence.',
    }],
    section_plans: [{ section: 'Projects', recommended_order: 1, candidate_fact_ids: [fact.id] }],
  };
}

function artifactRun(generated) {
  return {
    id: 'artifact-expansion',
    resume_tailoring_plan_run_id: 'plan-expansion',
    resume_artifacts: [{
      artifact_type: 'structured_resume',
      content: { format: generated.format, sections: generated.sections },
      metadata: generated.metadata,
    }],
  };
}

test('one source statement cannot expand into multiple provider alternatives in the final resume', () => {
  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.0.0',
    draft: {
      sections: [{
        section: 'Projects',
        statements: [
          {
            text: 'Built a React recommendation workflow with integrated APIs.',
            candidate_fact_ids: ['fact-body'],
            job_requirement_ids: ['requirement-analytics'],
          },
          {
            text: 'Applied API-connected recommendation logic to support analytics workflows.',
            candidate_fact_ids: ['fact-body'],
            job_requirement_ids: ['requirement-analytics'],
          },
        ],
      }],
    },
  };

  const generated = artifactGeneration.generate(plan(), null, provider);
  const review = humanReview.createDraft({ artifactRun: artifactRun(generated) });
  const projects = applicant.resumePresentationModel(review).find((section) => section.section === 'Projects');

  assert.equal(projects.entries.length, 1);
  assert.equal(projects.entries[0].title, 'Gift Recommendation App');
  assert.equal(projects.entries[0].body.length, 1, 'one source bullet must not silently expand into multiple tailored bullets');
  assert.equal(projects.entries[0].body[0].text, 'Built a React recommendation workflow with integrated APIs.');
});
