const test = require('node:test');
const assert = require('node:assert/strict');
const option2 = require('../../src/option2-tailoring-review');
const { APPLICANT_PAGE } = require('../../src/applicant-option2-page');

function sessionFixture() {
  return {
    jobId: 'job-128-grouping',
    reviewRun: {
      review_decisions: [
        { evidence_candidate_id: 'candidate-heading', original_claim: 'Gift Recommendation App' },
        { evidence_candidate_id: 'candidate-body', original_claim: 'Built a recommendation workflow with React and API integrations.' },
        { evidence_candidate_id: 'candidate-stock', original_claim: 'Stock Pattern Label Platform' },
      ],
    },
    integration: {
      integration_decisions: [
        { id: 'integration-heading', source_evidence_refs: [{ type: 'evidence_candidate', id: 'candidate-heading' }] },
        { id: 'integration-body', source_evidence_refs: [{ type: 'evidence_candidate', id: 'candidate-body' }] },
        { id: 'integration-stock', source_evidence_refs: [{ type: 'evidence_candidate', id: 'candidate-stock' }] },
      ],
      applied_facts: [
        { id: 'fact-heading', integration_decision_id: 'integration-heading' },
        { id: 'fact-body', integration_decision_id: 'integration-body' },
        { id: 'fact-stock', integration_decision_id: 'integration-stock' },
      ],
    },
    tailoring: {
      source_resume_snapshot: {
        sections: [{
          section: 'Projects',
          statements: [
            { source_statement_id: 'source-gift-heading', text: 'Gift Recommendation App', display_style: 'heading' },
            { source_statement_id: 'source-gift-body', parent_source_statement_id: 'source-gift-heading', text: 'Built a recommendation workflow with React and API integrations.', display_style: 'bullet' },
            { source_statement_id: 'source-stock-heading', text: 'Stock Pattern Label Platform', display_style: 'heading' },
          ],
        }],
      },
    },
    artifact: {
      resume_artifacts: [{
        artifact_type: 'structured_resume',
        content: {
          sections: [{
            section: 'Projects',
            statements: [
              {
                statement_id: 'generated-gift-heading',
                source_statement_id: 'source-gift-heading',
                parent_source_statement_id: null,
                display_style: 'heading',
                content_origin: 'candidate_knowledge_generated',
                text: 'Gift Recommendation App — analytics-focused recommendation workflow',
                provenance: { candidate_fact_ids: ['fact-heading'], job_requirement_ids: ['requirement-analytics'] },
              },
              {
                statement_id: 'generated-gift-body',
                source_statement_id: 'source-gift-body',
                parent_source_statement_id: 'source-gift-heading',
                display_style: 'bullet',
                content_origin: 'candidate_knowledge_generated',
                text: 'Built a React recommendation workflow with API integrations for job-relevant analytics use cases.',
                provenance: { candidate_fact_ids: ['fact-body'], job_requirement_ids: ['requirement-analytics'] },
              },
              {
                statement_id: 'generated-stock-heading',
                source_statement_id: 'source-stock-heading',
                parent_source_statement_id: null,
                display_style: 'heading',
                content_origin: 'candidate_knowledge_generated',
                text: 'Stock Pattern Label Platform',
                provenance: { candidate_fact_ids: ['fact-stock'], job_requirement_ids: [] },
              },
            ],
          }],
        },
      }],
    },
    store: {
      getJobRequirementProfile() {
        return { requirements: [{ id: 'requirement-analytics', normalized_name: 'analytics workflow' }] };
      },
    },
  };
}

test('Tailoring Review exposes stable source-entry grouping for multiple changes in one Project', () => {
  const review = option2.buildTailoringReview(sessionFixture());
  const giftHeading = review.find((item) => item.id === 'generated-gift-heading');
  const giftBody = review.find((item) => item.id === 'generated-gift-body');
  const stockHeading = review.find((item) => item.id === 'generated-stock-heading');

  assert.equal(giftHeading.entryId, 'source-gift-heading');
  assert.equal(giftBody.entryId, 'source-gift-heading');
  assert.equal(giftHeading.entryLabel, 'Gift Recommendation App');
  assert.equal(giftBody.entryLabel, 'Gift Recommendation App');
  assert.equal(giftHeading.displayStyle, 'heading');
  assert.equal(giftBody.displayStyle, 'bullet');
  assert.equal(stockHeading.entryId, 'source-stock-heading');
  assert.notEqual(stockHeading.entryId, giftHeading.entryId);
});

test('Applicant Tailoring Review renders entry groups instead of one card per internal statement', () => {
  assert.match(APPLICANT_PAGE, /function tailoringGroups\(/);
  assert.match(APPLICANT_PAGE, /data-tailoring-entry/);
  assert.match(APPLICANT_PAGE, /Changes in this resume entry/);
  assert.doesNotMatch(APPLICANT_PAGE, /tailoring\.map\(tailoringCard\)/);
});
