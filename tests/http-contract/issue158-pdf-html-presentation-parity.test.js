const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
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

function reviews() {
  return [
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
      source('University of Toronto | Sep 2024 – Present | BSc, Statistics & Computer Science | Minor in Economics'),
    ]),
    sectionReview('Certifications', [
      source('Microsoft Power BI Data Analyst'),
    ]),
  ];
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

test('the exported PDF carries the same reviewed content as the approved resume HTML', async (t) => {
  const run = reviews();
  const html = applicant.resumeHtml(run, { standalone: false });
  const htmlText = stripTags(html);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'issue158-pdf-html-parity-'));
  t.after(async () => {
    fs.rmSync(temp, { recursive: true, force: true });
    await applicant.closePdfRenderer();
  });
  const pdfPath = path.join(temp, 'final-resume.pdf');
  fs.writeFileSync(pdfPath, await applicant.resumePdf(run));

  const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  assert.match(info, /Page size:\s+612 x 792 pts \(letter\)/);
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
  assert.ok(Number.isInteger(pages) && pages >= 1 && pages <= 2, `expected 1-2 pages, got ${pages}`);

  const pdfText = execFileSync('pdftotext', ['-enc', 'UTF-8', pdfPath, '-'], { encoding: 'utf8' });

  for (const phrase of [
    'Taylor Chen',
    'Data analyst with experience translating business questions into decision-ready reporting.',
    'Python, SQL',
    'Power BI, Tableau',
    'Data Analyst',
    'Example Co.',
    'May 2023',
    'Aug 2024',
    'Built recurring executive reporting for business leaders.',
    'Claims Intelligence Dashboard',
    'Jan 2025',
    'Apr 2025',
    'University of Toronto',
    'BSc, Statistics & Computer Science',
    'Microsoft Power BI Data Analyst',
  ]) {
    assert.ok(htmlText.includes(phrase), `HTML is missing: ${phrase}`);
    assert.ok(pdfText.includes(phrase), `PDF is missing: ${phrase}\n${pdfText}`);
  }

  assert.doesNotMatch(pdfText, /â€¢|â€“|ï‚·|�/);
});
