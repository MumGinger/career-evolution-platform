const test = require('node:test');
const assert = require('node:assert/strict');
const applicant = require('../../src/applicant-resume');
const cleanup = require('../../src/applicant-cleanup');

function sectionReview(section, statements) {
  return {
    section,
    action: 'approve',
    ai_version: { placeholder: null, statements },
    final_version: { placeholder: null, statements },
    presentation_rationale: ['Keep the applicant-facing resume clear and source-linked.'],
  };
}

test('applicant-visible normalization removes private-use icon glyphs without deleting real text', () => {
  assert.equal(
    applicant.normalizeVisibleText('\uF0E0 taylor@example.com  \uF095 +1 416 555 0199'),
    'taylor@example.com   +1 416 555 0199',
  );
  assert.equal(applicant.normalizeVisibleText('Montréal — 數據分析 — -5%'), 'Montréal — 數據分析 — -5%');
});

test('presentation cleanup removes exact bullet prose embedded inside a multiline Experience heading', () => {
  const review = cleanup.cleanReview(sectionReview('Experience', [
    {
      text: 'Senior Analyst — Northstar Insurance\nBuilt recurring executive reporting for claims leaders.',
      display_style: 'heading',
      content_origin: 'source_resume_passthrough',
    },
    {
      text: 'Built recurring executive reporting for claims leaders.',
      display_style: 'bullet',
      content_origin: 'source_resume_passthrough',
    },
  ]));

  assert.equal(review.ai_version.statements.length, 2);
  assert.equal(review.ai_version.statements[0].text, 'Senior Analyst — Northstar Insurance');
  assert.equal(review.ai_version.statements[0].display_style, 'heading');
  assert.equal(review.ai_version.statements[1].text, 'Built recurring executive reporting for claims leaders.');
  assert.deepEqual(review.ai_version.statements, review.final_version.statements);
});

test('presentation cleanup does not strip distinct metadata from an Experience heading', () => {
  const review = cleanup.cleanReview(sectionReview('Experience', [
    {
      text: 'Senior Analyst — Northstar Insurance\nToronto, ON | May 2025 – Present',
      display_style: 'heading',
      content_origin: 'source_resume_passthrough',
    },
    {
      text: 'Built recurring executive reporting for claims leaders.',
      display_style: 'bullet',
      content_origin: 'source_resume_passthrough',
    },
  ]));

  assert.match(review.ai_version.statements[0].text, /Senior Analyst — Northstar Insurance/);
  assert.match(review.ai_version.statements[0].text, /Toronto, ON \| May 2025 – Present/);
  assert.equal(review.ai_version.statements[1].text, 'Built recurring executive reporting for claims leaders.');
});

test('Skills are rendered as separated resume items instead of one crammed line', () => {
  const html = applicant.resumeHtml([
    sectionReview('Skills', [
      { text: 'Python, SQL, Power BI, Tableau', display_style: 'line', content_origin: 'source_resume_passthrough' },
    ]),
  ], { standalone: false });

  assert.match(html, /class="resume-skills"/);
  for (const skill of ['Python', 'SQL', 'Power BI', 'Tableau']) {
    assert.match(html, new RegExp(`<li>${skill}</li>`));
  }
});

test('Career Review report explains final-selection scope without pretending omitted source content was deleted', () => {
  const run = {
    review_complete: true,
    section_reviews: [sectionReview('Experience', [
      { text: 'Senior Analyst — Northstar Insurance', display_style: 'heading', content_origin: 'source_resume_passthrough' },
      { text: 'Built recurring executive reporting.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
    ])],
  };
  const html = applicant.careerReviewHtml(run, { markdown: '## Experience\n\n### Senior Analyst — Northstar Insurance\n- Built recurring executive reporting.' });

  assert.match(html, /What changed for this application/i);
  assert.match(html, /uploaded resume remains unchanged/i);
  assert.match(html, /not a deletion log/i);
});

test('final PDF uses the stronger applicant-facing typography contract', () => {
  const pdf = applicant.resumePdf([
    sectionReview('Applicant Header', [
      { text: 'Taylor Chen', display_style: 'line', content_origin: 'source_resume_passthrough' },
      { text: 'taylor@example.com | +1 416 555 0199', display_style: 'line', content_origin: 'source_resume_passthrough' },
    ]),
    sectionReview('Experience', [
      { text: 'Senior Analyst — Northstar Insurance', display_style: 'heading', content_origin: 'source_resume_passthrough' },
      { text: 'Built recurring executive reporting.', display_style: 'bullet', content_origin: 'source_resume_passthrough' },
    ]),
  ]).toString('latin1');

  assert.match(pdf, /\/F2 21 Tf/);
  assert.match(pdf, /\/F2 11\.6 Tf/);
  assert.match(pdf, /Senior Analyst - Northstar Insurance/);
});
