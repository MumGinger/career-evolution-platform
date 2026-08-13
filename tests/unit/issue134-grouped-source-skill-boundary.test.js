const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceAttestedProposal } = require('../../src/option2-tailoring-review');

function sourceSkill(exact) {
  return {
    entity_type: 'skill',
    candidate: {
      id: 'candidate-skill',
      confidence_level: 'high',
      supporting_text: exact,
      source_reference: 'span-skill',
      provenance: {
        exact_source_text: exact,
        evidence_span_id: 'span-skill',
      },
    },
  };
}

const reviewDecision = {
  source_evidence_refs: [{ type: 'evidence_candidate', id: 'candidate-skill' }],
};
const reviewRun = { id: 'review-run' };

test('categorized multi-skill source inventory stays source-linked and is not committed as one Candidate Knowledge skill', () => {
  const proposal = sourceAttestedProposal(
    sourceSkill('Programming & Data\nPython, SQL, Java, C++'),
    reviewDecision,
    reviewRun,
  );
  assert.equal(proposal, null);
});

test('atomic source skill remains eligible for source-attested Candidate Knowledge integration', () => {
  const proposal = sourceAttestedProposal(
    sourceSkill('Power BI'),
    reviewDecision,
    reviewRun,
  );
  assert.ok(proposal);
  assert.equal(proposal.entityType, 'skill');
  assert.deepEqual(proposal.value, { name: 'Power BI' });
  assert.equal(proposal.displayValue, 'Power BI');
});
