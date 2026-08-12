const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../../src/resume-composition');
const tailoring = require('../../src/resume-tailoring');

function sourceStatement(id, text, style, parent = null) {
  return {
    statement_id: id,
    source_statement_id: id,
    text,
    section: 'Projects',
    display_style: style,
    parent_source_statement_id: parent,
    content_origin: 'source_resume_passthrough',
    provenance: { exact_source_text: text },
  };
}

test('responsibility claim scope supports bounded rendering in Experience or Projects without strengthening the claim', () => {
  const responsibility = {
    id: 'fact-responsibility',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI data visualization dashboards and automation workflows using Python and SQL.' },
    integration_decision_id: 'decision-responsibility',
    confirmation_status: 'confirmed',
  };
  const requirement = {
    id: 'req-dashboard',
    normalized_name: 'power bi data visualization dashboards',
    importance_score: 8,
    resume_value_score: 8,
  };
  const planned = tailoring.plan({ facts: [responsibility], requirements: [requirement], sourceResumeArtifact: null });
  const selection = planned.selections[0];
  assert.equal(selection.permitted_claim_scope.includes('bounded_responsibility'), true);
  assert.equal(selection.permitted_claim_scope.includes('bounded_project_responsibilities'), true);
});

test('a committed responsibility sourced from a Project stays in Projects with the bounded scopes intact', () => {
  const responsibility = {
    id: 'fact-responsibility',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI data visualization dashboards and automation workflows using Python and SQL.' },
  };
  const source = {
    sections: [{
      section: 'Projects',
      statements: [
        sourceStatement('source:project', 'Customer Analytics Dashboard', 'heading'),
        sourceStatement('source:project:1', responsibility.value.text, 'bullet', 'source:project'),
      ],
    }],
  };
  const output = {
    selections: [{
      candidate_fact_id: responsibility.id,
      selection_state: 'include',
      recommended_section: 'Experience',
      relevance_rationale: 'Direct match.',
      permitted_claim_scope: ['bounded_responsibility', 'bounded_project_responsibilities', 'cross_section_summary'],
    }],
    sectionPlans: [{ section: 'Experience', recommended_order: 1, candidate_fact_ids: [responsibility.id] }],
  };

  const routed = composition.sourceLinkedTailoring(output, [responsibility], source);
  const selection = routed.selections[0];
  assert.equal(selection.recommended_section, 'Projects');
  assert.equal(selection.permitted_claim_scope.includes('bounded_project_responsibilities'), true);
  assert.equal(selection.permitted_claim_scope.includes('bounded_responsibility'), true);
  assert.deepEqual(routed.sectionPlans, [{ section: 'Projects', recommended_order: 1, candidate_fact_ids: [responsibility.id] }]);
});
