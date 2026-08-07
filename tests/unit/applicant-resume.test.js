const test = require('node:test');
const assert = require('node:assert/strict');
const applicant = require('../../src/applicant-resume');
const cleanup = require('../../src/applicant-cleanup');

function reviewRun() {
  return {
    review_complete: true,
    section_reviews: [
      {
        section: 'Applicant Header',
        action: 'approve',
        ai_version: {
          placeholder: null,
          statements: [
            { text: 'Taylor Chen', display_style: 'line', content_origin: 'source_resume_passthrough' },
            { text: 'taylor@example.com • +1 416 555 0199', display_style: 'line', content_origin: 'source_resume_passthrough' },
          ],
        },
        final_version: {
          placeholder: null,
          statements: [
            { text: 'Taylor Chen', display_style: 'line', content_origin: 'source_resume_passthrough' },
            { text: 'taylor@example.com • +1 416 555 0199', display_style: 'line', content_origin: 'source_resume_passthrough' },
          ],
        },
        presentation_rationale: ['Preserve the applicant header.'],
      },
      {
        section: 'Experience',
        action: 'approve',
        ai_version: {
          placeholder: null,
          statements: [
            { text: 'Data Analyst — Example Co.', display_style: 'heading', content_origin: 'source_resume_passthrough' },
            { text: 'Built dashboards â€¢ improved reporting.', display_style: 'bullet', content_origin: 'candidate_knowledge_generated' },
          ],
        },
        final_version: {
          placeholder: null,
          statements: [
            { text: 'Data Analyst — Example Co.', display_style: 'heading', content_origin: 'source_resume_passthrough' },
            { text: 'Built dashboards â€¢ improved reporting.', display_style: 'bullet', content_origin: 'candidate_knowledge_generated' },
          ],
        },
        presentation_rationale: ['Prioritize supported job-relevant evidence.'],
      },
    ],
  };
}

test('visible text normalization repairs common PDF mojibake without inventing content', () => {
  assert.equal(
    applicant.normalizeVisibleText('Built dashboards â€¢ improved reporting â€“ 2023'),
    'Built dashboards • improved reporting – 2023',
  );
  assert.equal(applicant.normalizeVisibleText('A\uF0B7 B\uFFFD'), 'A• B');
});

test('visible bullet cleanup removes markers but preserves legitimate leading negative values', () => {
  assert.equal(cleanup.cleanStatement({ text: '• Reduced review time.', display_style: 'bullet' }).text, 'Reduced review time.');
  assert.equal(cleanup.cleanStatement({ text: '- Reduced review time.', display_style: 'bullet' }).text, 'Reduced review time.');
  assert.equal(cleanup.cleanStatement({ text: 'Dashboard: • Reduced review time.', display_style: 'bullet' }).text, 'Dashboard: Reduced review time.');
  assert.equal(cleanup.cleanStatement({ text: '-5% variance remained.', display_style: 'bullet' }).text, '-5% variance remained.');
});

test('passed_with_warnings is translated into applicant-readable action language', () => {
  const summary = applicant.validationSummary('passed_with_warnings', [{
    category: 'coverage_gap',
    severity: 'warning',
    message: 'selection_id 123e4567-e89b-12d3-a456-426614174000 has limited coverage.',
  }]);
  assert.equal(summary.title, 'Ready for review — check these items');
  assert.equal(summary.warnings[0].title, 'Job requirement coverage');
  assert.doesNotMatch(JSON.stringify(summary), /123e4567|selection_id/);
});

test('Career Review HTML is applicant-readable and omits raw implementation records', () => {
  const run = reviewRun();
  const html = applicant.careerReviewHtml(run, { markdown: 'Taylor Chen\n\n## Experience\n\n- Built dashboards.' });
  assert.match(html, /Career Review complete/);
  assert.match(html, /Where this came from/);
  assert.match(html, /Taylor Chen/);
  assert.doesNotMatch(html, /statement_id|candidate_fact_id|supporting_evidence.*\{/);
});

test('submission-ready PDF is a valid uncompressed PDF with readable applicant content', () => {
  const pdf = applicant.resumePdf(reviewRun().section_reviews);
  assert.ok(Buffer.isBuffer(pdf));
  assert.match(pdf.subarray(0, 8).toString('latin1'), /^%PDF-1\.4/);
  assert.match(pdf.toString('latin1'), /Taylor Chen/);
  assert.match(pdf.toString('latin1'), /EXPERIENCE/);
  assert.doesNotMatch(pdf.toString('latin1'), /â€¢|\uFFFD/);
});

test('Evidence Review explanation states the applicant decision and consequences without internal terminology', () => {
  const explanation = applicant.evidenceAcceptExplanation();
  assert.match(explanation, /accurate about you/i);
  assert.match(explanation, /not deciding whether this item is relevant to the job/i);
  assert.match(explanation, /does not guarantee that it will appear in your resume/i);
  assert.match(explanation, /Skipping does not delete text from your uploaded resume/i);
  assert.doesNotMatch(explanation, /Candidate Knowledge|003\.6|Integration/i);
});
