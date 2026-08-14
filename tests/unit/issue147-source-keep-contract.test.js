const test = require('node:test');
const assert = require('node:assert/strict');

const artifactGeneration = require('../../src/resume-artifact');
const resumeValidation = require('../../src/resume-validation');
const option2 = require('../../src/option2-tailoring-review');

function sourceStatement(text, { id = 'source-project', section = 'Projects', style = 'heading' } = {}) {
  return {
    statement_id: id,
    source_statement_id: id,
    parent_source_statement_id: null,
    text,
    display_style: style,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    provenance: {
      source_kind: 'validated_resume_understanding',
      exact_source_text: text,
      evidence_span_id: id,
    },
    section,
  };
}

function sourceBackedPlan({ factText = 'Source-bound Project', factId = 'fact-project' } = {}) {
  const fact = {
    id: factId,
    entity_type: 'project',
    value: { name: factText, source_reference: 'span-project' },
    display_value: factText,
    integration_decision_id: 'integration-project',
  };
  const selection = {
    id: 'selection-project',
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    selection_state: 'include',
    recommended_section: 'Projects',
    mapped_requirement_ids: ['requirement-project'],
    inherited_provenance_references: ['integration-project'],
    permitted_claim_scope: ['project_name', 'cross_section_summary'],
    blocked_claim_scopes: ['proficiency', 'years_of_experience', 'ownership', 'leadership', 'impact'],
    relevance_rationale: 'Source-backed project supports the target role.',
    priority_score: 90,
  };
  const source = sourceStatement(factText);
  return {
    fact,
    selection,
    plan: {
      id: 'plan-project',
      job_requirement_profile_id: 'job-project',
      job_requirement_profile_version: 1,
      candidate_knowledge_snapshot: [fact],
      resume_content_selections: [selection],
      requirement_coverage: [{ job_requirement_id: 'requirement-project', coverage_status: 'covered', coverage_rationale: 'covered' }],
      section_plans: [{ section: 'Projects' }],
      source_resume_snapshot: {
        id: 'source-resume',
        version: 1,
        format: 'source-resume-composition/1.0.0',
        policy_version: 'complete-resume-composition-boundary/1.0.0',
        source_resume_artifact_id: 'source-resume',
        source_resume_artifact_version_id: 'source-resume-v1',
        resume_semantic_run_id: 'semantic-run',
        sections: [{ section: 'Projects', statements: [source] }],
      },
    },
  };
}

function artifactRun(plan, generated) {
  return {
    id: 'artifact-run',
    resume_tailoring_plan_run_id: plan.id,
    resume_artifacts: [{
      artifact_type: 'structured_resume',
      content: { sections: generated.sections },
      metadata: {
        ...generated.metadata,
        traceability: {
          resume_artifact_run_id: 'artifact-run',
          resume_tailoring_plan_run_id: plan.id,
        },
      },
    }],
  };
}

function validate(plan, fact, generated) {
  return resumeValidation.validate({
    artifactRun: artifactRun(plan, generated),
    plan,
    integrity: new Map([[fact.id, { fact_exists: true, integration_exists: true, provenance_exists: true }]]),
  });
}

function hardFindings(result) {
  return result.findings.filter((item) => ['error', 'critical'].includes(item.severity));
}

test('provider omission keeps exact source-backed included evidence in original structure instead of generating a fallback', () => {
  const { plan, fact, selection } = sourceBackedPlan();
  const provider = {
    provider: 'openai-compatible',
    model: 'selective-provider',
    version: 'resume-draft-generation/1.1.0',
    draft: { sections: [] },
  };
  const generated = artifactGeneration.generate(plan, null, provider);
  const projects = generated.sections.find((section) => section.section === 'Projects');

  assert.equal(projects.statements.length, 1);
  assert.equal(projects.statements[0].content_origin, 'source_resume_passthrough');
  assert.equal(projects.statements[0].text, 'Source-bound Project');
  assert.equal(generated.metadata.draft_completion_fallbacks.length, 0);
  assert.deepEqual(generated.metadata.draft_completion_source_keeps.map((item) => item.resume_content_selection_id), [selection.id]);
  assert.deepEqual(hardFindings(validate(plan, fact, generated)), []);
});

test('invalid provider requirement citations are dropped and safely fall back to source KEEP instead of blocking the resume', () => {
  const { plan, fact, selection } = sourceBackedPlan();
  const provider = {
    provider: 'openai-compatible',
    model: 'selective-provider',
    version: 'resume-draft-generation/1.1.0',
    draft: {
      sections: [{
        section: 'Projects',
        statements: [{
          text: 'Tailored project wording that forgot requirement citations.',
          candidate_fact_ids: [fact.id],
          job_requirement_ids: [],
        }],
      }],
    },
  };
  const generated = artifactGeneration.generate(plan, null, provider);
  const projects = generated.sections.find((section) => section.section === 'Projects');

  assert.equal(projects.statements.length, 1);
  assert.equal(projects.statements[0].text, 'Source-bound Project');
  assert.equal(projects.statements[0].content_origin, 'source_resume_passthrough');
  assert.ok(generated.metadata.dropped_provider_alternatives.some((item) => item.reason === 'invalid_provider_requirement_citations'));
  assert.deepEqual(generated.metadata.draft_completion_source_keeps.map((item) => item.resume_content_selection_id), [selection.id]);
  assert.deepEqual(hardFindings(validate(plan, fact, generated)), []);
});

test('non-source included evidence still receives deterministic generated placement when provider omits it', () => {
  const { plan, fact } = sourceBackedPlan({ factText: 'Corrected project context' });
  plan.source_resume_snapshot.sections[0].statements[0] = sourceStatement('Original project context');
  const provider = {
    provider: 'openai-compatible',
    model: 'selective-provider',
    version: 'resume-draft-generation/1.1.0',
    draft: { sections: [] },
  };
  const generated = artifactGeneration.generate(plan, null, provider);
  const projects = generated.sections.find((section) => section.section === 'Projects');

  assert.equal(generated.metadata.draft_completion_source_keeps.length, 0);
  assert.equal(generated.metadata.draft_completion_fallbacks.length, 1);
  assert.ok(projects.statements.some((statement) => statement.content_origin === 'candidate_knowledge_generated' && statement.text === 'Corrected project context'));
});

test('review readiness accepts a deterministic-valid complete source document without requiring generated selection IDs', () => {
  const run = {
    resume_artifacts: [{
      artifact_type: 'structured_resume',
      content: {
        sections: [
          { section: 'Applicant Header', statements: [{ text: 'Candidate' }] },
          { section: 'Projects', statements: [{ text: 'Source project', content_origin: 'source_resume_passthrough', resume_content_selection_ids: [] }] },
        ],
      },
    }],
  };
  const review = [{ section: 'Applicant Header' }, { section: 'Projects' }];
  assert.equal(option2.qualityReady(run, review), true);
});
