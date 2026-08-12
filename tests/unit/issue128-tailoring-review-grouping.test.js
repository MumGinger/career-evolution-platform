const test = require('node:test');
const assert = require('node:assert/strict');
const tailoringEntry = require('../../src/tailoring-review-entry-context');
const { APPLICANT_PAGE } = require('../../src/applicant-option2-page');

function sessionFixture() {
  return {
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
              },
              {
                statement_id: 'generated-gift-body',
                source_statement_id: 'source-gift-body',
                parent_source_statement_id: 'source-gift-heading',
                display_style: 'bullet',
                content_origin: 'candidate_knowledge_generated',
                text: 'Built a React recommendation workflow with API integrations for job-relevant analytics use cases.',
              },
              {
                statement_id: 'generated-stock-heading',
                source_statement_id: 'source-stock-heading',
                parent_source_statement_id: null,
                display_style: 'heading',
                content_origin: 'candidate_knowledge_generated',
                text: 'Stock Pattern Label Platform',
              },
            ],
          }],
        },
      }],
    },
  };
}

function reviewItems() {
  return [
    {
      id: 'generated-gift-heading',
      section: 'Projects',
      originalText: 'Gift Recommendation App',
      tailoredText: 'Gift Recommendation App — analytics-focused recommendation workflow',
      materialRewrite: true,
    },
    {
      id: 'generated-gift-body',
      section: 'Projects',
      originalText: 'Built a recommendation workflow with React and API integrations.',
      tailoredText: 'Built a React recommendation workflow with API integrations for job-relevant analytics use cases.',
      materialRewrite: true,
    },
    {
      id: 'generated-stock-heading',
      section: 'Projects',
      originalText: 'Stock Pattern Label Platform',
      tailoredText: 'Stock Pattern Label Platform',
      materialRewrite: false,
    },
  ];
}

test('Tailoring Review exposes stable source-entry grouping for multiple changes in one Project', () => {
  const review = tailoringEntry.annotateTailoringReview(sessionFixture(), reviewItems());
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
  assert.match(APPLICANT_PAGE, /tailoring\.filter\(item=>item\.materialRewrite\)/);
  assert.doesNotMatch(APPLICANT_PAGE, /tailoring\.map\(tailoringCard\)/);
});
