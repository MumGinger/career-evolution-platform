const test = require('node:test');
const assert = require('node:assert/strict');
const resumeValidation = require('../../src/resume-validation');

function fixture(jobRequirementIds) {
  const fact = {
    id: 'fact-project',
    entity_type: 'project',
    value: { name: 'Analytics Dashboard' },
    integration_decision_id: 'integration-project',
  };
  const selection = {
    id: 'selection-project',
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    selection_state: 'include',
    recommended_section: 'Projects',
    mapped_requirement_ids: ['requirement-python', 'requirement-sql'],
    inherited_provenance_references: ['integration-project'],
    permitted_claim_scope: ['project_name'],
    blocked_claim_scopes: ['proficiency', 'years_of_experience', 'ownership', 'leadership', 'impact'],
  };
  const statement = {
    statement_id: 'draft:Projects:1',
    template: 'project_name',
    text: 'Analytics Dashboard',
    display_style: 'heading',
    content_origin: 'candidate_knowledge_generated',
    resume_content_selection_ids: [selection.id],
    provenance: {
      candidate_fact_id: fact.id,
      candidate_fact_ids: [fact.id],
      candidate_fact_revision: fact.id,
      job_requirement_ids: jobRequirementIds,
      inherited_provenance_references: ['integration-project'],
    },
  };
  const plan = {
    id: 'plan-project',
    job_requirement_profile_id: 'job-project',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [fact],
    resume_content_selections: [selection],
    requirement_coverage: [
      { job_requirement_id: 'requirement-python', coverage_status: 'covered' },
      { job_requirement_id: 'requirement-sql', coverage_status: 'covered' },
    ],
    section_plans: [{ section: 'Projects' }],
    source_resume_snapshot: null,
  };
  const artifactRun = {
    id: 'artifact-run-project',
    resume_tailoring_plan_run_id: plan.id,
    resume_artifacts: [{
      content: { sections: [{ section: 'Projects', position: 1, statements: [statement] }] },
      metadata: {
        traceability: {
          resume_artifact_run_id: 'artifact-run-project',
          resume_tailoring_plan_run_id: plan.id,
        },
        draft_provider: { provider: 'openai-compatible', model: 'provider-replay' },
        omissions: [],
        blocked_claims: [],
        requirement_coverage: [],
      },
    }],
  };
  const integrity = new Map([[fact.id, {
    fact_exists: true,
    integration_exists: true,
    provenance_exists: true,
  }]]);
  return { plan, artifactRun, integrity };
}

function criticalRules(result) {
  return result.findings
    .filter((finding) => ['critical', 'error'].includes(finding.severity))
    .map((finding) => finding.rule);
}

test('provider may cite a non-empty subset of requirements mapped to the attached selection', () => {
  const input = fixture(['requirement-python']);
  const result = resumeValidation.validate(input);
  assert.equal(
    criticalRules(result).includes('draft-requirement-citation-set'),
    false,
    'a statement that cites only a mapped requirement must not be rejected merely for omitting another mapped requirement',
  );
});

test('provider may not cite a requirement outside the requirements mapped to the attached selection', () => {
  const input = fixture(['requirement-unmapped']);
  const result = resumeValidation.validate(input);
  assert.equal(
    criticalRules(result).includes('draft-requirement-citation-set'),
    true,
    'unmapped requirement provenance must remain a critical validation failure',
  );
});
