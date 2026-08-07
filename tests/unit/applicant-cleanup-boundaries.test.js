const test = require('node:test');
const assert = require('node:assert/strict');
const cleanup = require('../../src/applicant-cleanup');

test('presentation cleanup preserves identical source wording under separate headings', () => {
  const review = cleanup.cleanReview({
    section: 'Experience',
    ai_version: {
      placeholder: null,
      statements: [
        { text: 'Analyst — Company A', display_style: 'heading', content_origin: 'source_resume_passthrough' },
        { text: 'Built weekly reporting.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
        { text: 'Analyst — Company B', display_style: 'heading', content_origin: 'source_resume_passthrough' },
        { text: 'Built weekly reporting.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
      ],
    },
    final_version: null,
  });

  assert.deepEqual(
    review.ai_version.statements.map((statement) => statement.text),
    ['Analyst — Company A', 'Built weekly reporting.', 'Analyst — Company B', 'Built weekly reporting.'],
  );
});
