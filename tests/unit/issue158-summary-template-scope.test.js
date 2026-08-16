const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../../src/resume-composition');
const artifact = require('../../src/resume-artifact');
const validation = require('../../src/resume-validation');

function routedAchievement() {
  const fact = {
    id: 'fact-achievement',
    entity_type: 'achievement',
    value: { name: 'Delivered a project outcome' },
    integration_decision_id: 'integration-achievement',
  };
  const routed = composition.sourceLinkedTailoring({
    selections: [{
      id: 'selection-achievement', candidate_fact_id: fact.id, candidate_fact_revision: fact.id,
      mapped_requirement_ids: ['requirement-1'], selection_state: 'include', relevance_rationale: 'Relevant source evidence.',
      inherited_provenance_references: [fact.integration_decision_id], recommended_section: 'Experience', emphasis_level: 'high', priority_score: 10,
      permitted_claim_scope: ['accepted_achievement_detail', 'cross_section_summary'], blocked_claim_scopes: [], limitations: '',
    }],
    sectionPlans: [],
  }, [fact], { sections: [{ section: 'Projects', statements: [{ text: fact.value.name }] }] });
  return { fact, selection: routed.selections[0] };
}

function planFor(fact, selection) {
  return {
    id: 'plan-summary-template-scope', job_requirement_profile_id: 'job-summary-template-scope', job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [fact], resume_content_selections: [selection],
    requirement_coverage: [{ job_requirement_id: 'requirement-1', coverage_status: 'covered' }],
    section_plans: [{ section: 'Projects', recommended_order: 1, candidate_fact_ids: [fact.id] }],
  };
}

function findings(plan, structured) {
  return validation.validate({
    artifactRun: {
      id: 'artifact-summary-template-scope', resume_tailoring_plan_run_id: plan.id,
      resume_artifacts: [{ artifact_type: 'structured_resume', content: { sections: structured.sections }, metadata: {
        ...structured.metadata,
        traceability: { resume_artifact_run_id: 'artifact-summary-template-scope', resume_tailoring_plan_run_id: plan.id },
      } }],
    },
    plan,
    integrity: new Map([['fact-achievement', { fact_exists: true, integration_exists: true, provenance_exists: true }]]),
  }).findings;
}

test('a source-linked achievement retains its achievement template when rendered in Projects', () => {
  const { fact, selection } = routedAchievement();
  const plan = planFor(fact, selection);
  const structured = artifact.generate(plan, null, {
    provider: 'fixture', model: 'fixture', version: '1',
    draft: { sections: [{ section: 'Projects', statements: [{ text: fact.value.name, candidate_fact_ids: [fact.id], job_requirement_ids: ['requirement-1'] }] }] },
  });
  const statement = structured.sections.find((section) => section.section === 'Projects').statements[0];

  assert.equal(selection.recommended_section, 'Projects');
  assert.equal(statement.template, 'accepted_achievement_detail');
  assert.equal(findings(plan, structured).some((finding) => finding.rule === 'template-permission'), false);
});

test('a Professional Summary uses its cross-section template for source-linked evidence', () => {
  const { fact, selection } = routedAchievement();
  const plan = planFor(fact, selection);
  const structured = artifact.generate(plan, null, {
    provider: 'fixture', model: 'fixture', version: '1',
    draft: { sections: [{ section: 'Professional Summary', statements: [{ text: 'Target-relevant project outcome.', candidate_fact_ids: [fact.id], job_requirement_ids: ['requirement-1'] }] }] },
  });
  const statement = structured.sections.find((section) => section.section === 'Professional Summary').statements[0];

  assert.equal(statement.template, 'cross_section_summary');
  assert.equal(findings(plan, structured).some((finding) => finding.rule === 'template-permission'), false);
});
