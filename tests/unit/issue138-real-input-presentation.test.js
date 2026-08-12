const test = require('node:test');
const assert = require('node:assert/strict');

const applicant = require('../../src/applicant-resume');
const cleanup = require('../../src/applicant-cleanup');

function source(id, text, style, parent = null) {
  return {
    statement_id: id,
    source_statement_id: id,
    parent_source_statement_id: parent,
    text,
    display_style: style,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    provenance: { source_kind: 'validated_resume_understanding', exact_source_text: text },
  };
}

function review(section, statements) {
  return {
    section,
    action: 'approve',
    ai_version: { placeholder: null, statements },
    final_version: { placeholder: null, statements },
    presentation_rationale: [],
  };
}

test('real source container blocks render as one entry shell plus each child exactly once', () => {
  const stockHeading = source(
    'source:stock',
    'ONGOING PROJECTS (Finance, Data & Software)\nStock Pattern Label Platform\n(React, Node.js, Market Data APIs, Time Series)\n\n•\n•\n\nDesigned and built a full-stack stock pattern labeling platform to manually tag and study intraday price/volume patterns across\nmultiple tickers and timeframes.\nImplemented historical market data ingestion, caching, and visualization (candlestick + volume) to support efficient pattern\nanalysis without repeated API calls.',
    'heading',
  );
  const stockOne = source(
    'source:stock:1',
    'Designed and built a full-stack stock pattern labeling platform to manually tag and study intraday price/volume patterns across\nmultiple tickers and timeframes.',
    'bullet',
    'source:stock',
  );
  const stockTwo = source(
    'source:stock:2',
    'Implemented historical market data ingestion, caching, and visualization (candlestick + volume) to support efficient pattern\nanalysis without repeated API calls.',
    'bullet',
    'source:stock',
  );
  const giftHeading = source(
    'source:gift',
    'Gift Recommendation App\n(React, Tailwind CSS, AI-assisted logic)\n\n•\n•\n\nAugust 2025 – Present\n\nMay 2025 – Present\n\nBuilt a personalized gift recommendation web app using React and Tailwind CSS.\nDesigned a dynamic, AI-assisted question flow.',
    'heading',
  );
  const giftOne = source('source:gift:1', 'Built a personalized gift recommendation web app using React and Tailwind CSS.', 'bullet', 'source:gift');
  const giftTwo = source('source:gift:2', 'Designed a dynamic, AI-assisted question flow.', 'bullet', 'source:gift');

  const run = cleanup.cleanRun({
    section_reviews: [
      review('Applicant Header', [source('source:header', 'Ya-Ching Tang\n\nToronto, ON | yaching@example.com | (519) 870-4826', 'line')]),
      review('Projects', [stockHeading, stockOne, stockTwo, giftHeading, giftOne, giftTwo]),
      review('Education', [source('source:education', 'EDUCATION\n\nUniversity of Toronto St. George, Toronto, ON\n\nSeptember 2023 – June 2027\n\nMajor: Statistics; Computer Science\nMinor: Economics', 'line')]),
      review('Certifications', [source('source:certification', 'CERTIFICATIONS\nCFA Program (CFA Institute)\nLevel I Passed | Level II Candidate (2026)', 'line')]),
    ],
  });

  const model = applicant.resumePresentationModel(run.section_reviews);
  const header = model.find((section) => section.section === 'Applicant Header');
  assert.deepEqual(header.entries[0].body.map((item) => item.text), [
    'Ya-Ching Tang',
    'Toronto, ON | yaching@example.com | (519) 870-4826',
  ]);

  const projects = model.find((section) => section.section === 'Projects');
  assert.equal(projects.entries.length, 2);
  assert.equal(projects.entries[0].title, 'Stock Pattern Label Platform');
  assert.equal(projects.entries[0].date, 'August 2025 – Present');
  assert.deepEqual(projects.entries[0].meta, ['(React, Node.js, Market Data APIs, Time Series)']);
  assert.deepEqual(projects.entries[0].body.map((item) => item.text), [stockOne.text, stockTwo.text]);
  assert.equal(projects.entries[1].title, 'Gift Recommendation App');
  assert.equal(projects.entries[1].date, 'May 2025 – Present');
  assert.deepEqual(projects.entries[1].meta, ['(React, Tailwind CSS, AI-assisted logic)']);
  assert.deepEqual(projects.entries[1].body.map((item) => item.text), [giftOne.text, giftTwo.text]);

  const education = model.find((section) => section.section === 'Education');
  assert.equal(education.entries[0].title, 'University of Toronto St. George, Toronto, ON');
  assert.equal(education.entries[0].date, 'September 2023 – June 2027');

  const html = applicant.resumeHtml(run.section_reviews, { standalone: false });
  assert.equal((html.match(/Designed and built a full-stack stock pattern labeling platform/g) || []).length, 1);
  assert.equal((html.match(/Built a personalized gift recommendation web app/g) || []).length, 1);
  assert.doesNotMatch(html, /ONGOING PROJECTS|>EDUCATION<|>CERTIFICATIONS</);
  assert.doesNotMatch(html, />•</);

  const markdown = applicant.resumeMarkdown(run.section_reviews);
  assert.equal((markdown.match(/Designed and built a full-stack stock pattern labeling platform/g) || []).length, 1);
  assert.doesNotMatch(markdown, /ONGOING PROJECTS|^EDUCATION$|^CERTIFICATIONS$/m);
});
