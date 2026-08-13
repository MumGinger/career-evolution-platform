const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceAttestedProposal } = require('../../src/option2-tailoring-review');

function source({ title = 'Analytics Dashboard', rawText } = {}) {
  const child = 'Built Power BI dashboards and automation workflows using Python and SQL.';
  const parent = rawText || `Analytics Dashboard\n(Python, SQL, Power BI)\nMay 2025 - Present\n- ${child}`;
  return {
    entity_type: 'project',
    candidate: {
      id: 'candidate-project',
      confidence_level: 'medium',
      supporting_text: child,
      source_reference: 'span-project',
      provenance: {
        exact_source_text: child,
        evidence_span_id: 'span-child',
        semantic: {
          raw_text: parent,
          attributes: {
            title,
            upstream_block_id: 'project-1',
          },
        },
        contextual_match: {
          matched_source_text: child,
        },
      },
    },
  };
}

const reviewDecision = {
  source_evidence_refs: [{ type: 'evidence_candidate', id: 'candidate-project' }],
};

const reviewRun = { id: 'review-run' };

test('source-attested Project stores only source-backed project identity; child responsibility stays in its child fact', () => {
  const proposal = sourceAttestedProposal(source(), reviewDecision, reviewRun);
  assert.ok(proposal);
  assert.deepEqual(proposal.value, {
    name: 'Analytics Dashboard',
    source_reference: 'span-child',
  });
  assert.equal(proposal.displayValue, 'Analytics Dashboard');
  assert.equal(JSON.stringify(proposal.value).includes('May 2025'), false);
  assert.equal(JSON.stringify(proposal.value).includes('Built Power BI dashboards'), false);
});

test('Project title must be source-backed before it can become Candidate Knowledge', () => {
  const proposal = sourceAttestedProposal(source({
    title: 'Invented Analytics Platform',
    rawText: 'Analytics Dashboard\nMay 2025 - Present\n- Built Power BI dashboards and automation workflows using Python and SQL.',
  }), reviewDecision, reviewRun);
  assert.equal(proposal, null);
});
