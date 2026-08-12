const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../../src/resume-composition');

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

test('a committed responsibility sourced from a Project stays in Projects with section-compatible bounded scope', () => {
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
      permitted_claim_scope: ['bounded_responsibility', 'cross_section_summary'],
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
