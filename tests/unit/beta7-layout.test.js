const test = require('node:test');
const assert = require('node:assert/strict');
const applicant = require('../../src/applicant-resume');

function sectionReview(section, statements) {
  return {
    section,
    action: 'approve',
    ai_version: { placeholder: null, statements },
    final_version: { placeholder: null, statements },
    presentation_rationale: ['Use a conventional professional resume layout.'],
  };
}

function source(text, display_style = 'line') {
  return { text, display_style, content_origin: 'source_resume_passthrough' };
}

test('professional resume presentation separates summary, skill groups, and entry metadata', () => {
  const reviews = [
    sectionReview('Applicant Header', [
      source('Taylor Chen'),
      source('Toronto, ON | taylor@example.com | +1 416 555 0199'),
    ]),
    sectionReview('Professional Summary', [
      source('Data analyst with experience translating business questions into decision-ready reporting.'),
    ]),
    sectionReview('Skills', [
      source('Languages: Python, SQL; Visualization: Power BI, Tableau; Tools: Excel, Git'),
    ]),
    sectionReview('Experience', [
      source('Data Analyst — Example Co.\nToronto, ON | May 2023 – Aug 2024', 'heading'),
      source('Built recurring executive reporting for business leaders.', 'bullet'),
    ]),
    sectionReview('Projects', [
      source('Claims Intelligence Dashboard', 'heading'),
      source('Built a Power BI dashboard for claims analysis.', 'bullet'),
      source('Jan 2025 – Apr 2025'),
    ]),
    sectionReview('Education', [
      source('University of Toronto | Sep 2024 – Present | BSc, Statistics & Computer Science | Minor in Economics | GPA 3.8/4.0'),
    ]),
  ];

  const html = applicant.resumeHtml(reviews, { standalone: false });

  assert.match(html, /class="resume-section resume-summary-section"/);
  assert.match(html, /class="resume-skill-group"/);
  assert.match(html, /class="resume-skill-label">Languages<\/span>/);
  assert.match(html, /class="resume-entry"/);
  assert.match(html, /class="resume-entry-date">May 2023 – Aug 2024<\/span>/);
  assert.match(html, /class="resume-entry-date">Jan 2025 – Apr 2025<\/span>/);
  assert.match(html, /class="resume-entry-date">Sep 2024 – Present<\/span>/);

  const projectDate = html.indexOf('Jan 2025 – Apr 2025');
  const projectBullet = html.indexOf('Built a Power BI dashboard for claims analysis.');
  assert.ok(projectDate > -1 && projectDate < projectBullet, 'project date should be displayed with the project heading, before bullets');

  for (const required of [
    'Data Analyst — Example Co.',
    'Toronto, ON',
    'Claims Intelligence Dashboard',
    'University of Toronto',
    'BSc, Statistics &amp; Computer Science',
    'Minor in Economics',
    'GPA 3.8/4.0',
  ]) assert.match(html, new RegExp(required));
});

test('embedded summary marker is promoted out of Experience only at the presentation boundary', () => {
  const reviews = [
    sectionReview('Experience', [
      source('Professional Summary', 'heading'),
      source('Analyst focused on data automation and reporting.'),
      source('Data Analyst — Example Co.\nMay 2023 – Aug 2024', 'heading'),
      source('Built recurring executive reporting.', 'bullet'),
    ]),
  ];

  const model = applicant.resumePresentationModel(reviews);
  assert.equal(model[0].section, 'Professional Summary');
  assert.equal(model[0].entries[0].body[0].text, 'Analyst focused on data automation and reporting.');
  assert.equal(model[1].section, 'Experience');
  assert.equal(model[1].entries[0].title, 'Data Analyst — Example Co.');

  const original = reviews[0].final_version.statements.map((statement) => statement.text);
  assert.deepEqual(original, [
    'Professional Summary',
    'Analyst focused on data automation and reporting.',
    'Data Analyst — Example Co.\nMay 2023 – Aug 2024',
    'Built recurring executive reporting.',
  ]);
});

test('date-like body claims stay in body instead of being moved into entry metadata', () => {
  const reviews = [sectionReview('Projects', [
    source('Forecasting Platform', 'heading'),
    source('Compared 2023 – 2024 monthly performance to identify seasonal changes.', 'bullet'),
  ])];
  const model = applicant.resumePresentationModel(reviews);
  assert.equal(model[0].entries[0].date, null);
  assert.equal(model[0].entries[0].body[0].text, 'Compared 2023 – 2024 monthly performance to identify seasonal changes.');
});
