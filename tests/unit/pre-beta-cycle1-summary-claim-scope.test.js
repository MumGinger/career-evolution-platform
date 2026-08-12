const test = require('node:test');
const assert = require('node:assert/strict');

const tailoring = require('../../src/resume-tailoring');

test('included role-relevant evidence explicitly permits bounded cross-section summary synthesis', () => {
  const fact = {
    id: 'fact-power-bi',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI dashboards for business reporting and analysis.' },
    integration_decision_id: 'decision-power-bi',
    confirmation_status: 'confirmed',
  };
  const requirement = {
    id: 'requirement-power-bi',
    normalized_name: 'power bi',
    importance_score: 8,
    resume_value_score: 8,
  };

  const result = tailoring.plan({
    facts: [fact],
    requirements: [requirement],
    sourceResumeArtifact: null,
  });

  const selection = result.selections.find((item) => item.candidate_fact_id === fact.id);
  assert.equal(selection.selection_state, 'include');
  assert.equal(selection.recommended_section, 'Experience');
  assert.equal(selection.permitted_claim_scope.includes('bounded_responsibility'), true);
  assert.equal(selection.permitted_claim_scope.includes('cross_section_summary'), true);
});

test('included target-relevant education can support internship Summary context without changing Education ownership', () => {
  const fact = {
    id: 'fact-education',
    entity_type: 'education',
    value: { program: 'Statistics and Computer Science' },
    integration_decision_id: 'decision-education',
    confirmation_status: 'confirmed',
  };
  const requirement = {
    id: 'requirement-degree',
    normalized_name: 'statistics and computer science',
    importance_score: 8,
    resume_value_score: 8,
  };

  const result = tailoring.plan({
    facts: [fact],
    requirements: [requirement],
    sourceResumeArtifact: null,
  });
  const selection = result.selections.find((item) => item.candidate_fact_id === fact.id);

  assert.equal(selection.selection_state, 'include');
  assert.equal(selection.recommended_section, 'Education');
  assert.equal(selection.permitted_claim_scope.includes('accepted_fact_detail'), true);
  assert.equal(selection.permitted_claim_scope.includes('cross_section_summary'), true);
});
