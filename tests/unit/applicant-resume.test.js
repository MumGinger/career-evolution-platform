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

test('Evidence Review source display removes unexplained glyph bullets without changing negative values', () => {
  assert.equal(
    cleanup.cleanEvidenceSourceText('• Built dashboards.\n▪ Automated reports.\n-5% variance remained.'),
    'Built dashboards.\nAutomated reports.\n-5% variance remained.',
  );
});

test('presentation cleanup removes exact repeated statements while retaining one structured copy', () => {
  const review = cleanup.cleanReview({
    section: 'Experience',
    ai_version: {
      placeholder: null,
      statements: [
        { text: 'Built recurring executive reporting.', display_style: 'line', content_origin: 'source_resume_passthrough' },
        { text: '• Built recurring executive reporting.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
        { text: '-5% variance remained.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
      ],
    },
    final_version: {
      placeholder: null,
      statements: [
        { text: 'Built recurring executive reporting.', display_style: 'line', content_origin: 'source_resume_passthrough' },
        { text: '• Built recurring executive reporting.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
        { text: '-5% variance remained.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
      ],
    },
  });
  assert.equal(review.ai_version.statements.length, 2);
  assert.equal(review.ai_version.statements[0].text, 'Built recurring executive reporting.');
  assert.equal(review.ai_version.statements[0].display_style, 'bullet');
  assert.equal(review.ai_version.statements[1].text, '-5% variance remained.');
  assert.deepEqual(review.ai_version.statements, review.final_version.statements);
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
  assert.doesNotMatch(html, /Candidate Knowledge|003\.6|statement_id|candidate_fact_id|supporting_evidence.*\{/i);
});

test('submission-ready PDF is a valid uncompressed PDF with readable applicant content', () => {
  const pdf = applicant.resumePdf(reviewRun().section_reviews);
  assert.ok(Buffer.isBuffer(pdf));
  assert.match(pdf.subarray(0, 8).toString('latin1'), /^%PDF-1\.4/);
  assert.match(pdf.toString('latin1'), /Taylor Chen/);
  assert.match(pdf.toString('latin1'), /EXPERIENCE/);
  assert.doesNotMatch(pdf.toString('latin1'), /â€¢|\uFFFD/);
});

test('Evidence Review explanation distinguishes evidence reuse from final resume inclusion', () => {
  const explanation = applicant.evidenceAcceptExplanation();
  assert.match(explanation, /already comes from your uploaded resume/i);
  assert.match(explanation, /does not decide what stays in your final resume/i);
  assert.match(explanation, /confirmed support for new or rewritten wording/i);
  assert.match(explanation, /Accept/i);
  assert.match(explanation, /Skip/i);
  assert.match(explanation, /Why this was surfaced/i);
  assert.doesNotMatch(explanation, /Candidate Knowledge|003\.6|Integration/i);
});

test('Career Review origin explanations stay applicant-readable', () => {
  const explanation = applicant.sectionOriginExplanation(reviewRun().section_reviews[1]);
  assert.match(explanation, /uploaded resume|reviewed evidence|validation/i);
  assert.doesNotMatch(explanation, /Candidate Knowledge|003\.6|Integration/i);
});
