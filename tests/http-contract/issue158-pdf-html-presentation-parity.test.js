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

function readPpmPixel(ppmPath, x, y) {
  const buffer = fs.readFileSync(ppmPath);
  let offset = 0;
  function nextToken() {
    while (buffer[offset] === 0x23) { while (buffer[offset] !== 0x0a) offset += 1; offset += 1; }
    while (/\s/.test(String.fromCharCode(buffer[offset]))) offset += 1;
    const start = offset;
    while (!/\s/.test(String.fromCharCode(buffer[offset]))) offset += 1;
    return buffer.toString('latin1', start, offset);
  }
  const magic = nextToken();
  if (magic !== 'P6') throw new Error(`unsupported PPM magic: ${magic}`);
  const width = Number(nextToken());
  const height = Number(nextToken());
  nextToken();
  offset += 1;
  if (x >= width || y >= height) throw new Error(`pixel (${x},${y}) outside ${width}x${height} image`);
  const pixelStart = offset + (y * width + x) * 3;
  return { r: buffer[pixelStart], g: buffer[pixelStart + 1], b: buffer[pixelStart + 2] };
}

test('the rendered PDF page has no gray canvas showing through below short content', async (t) => {
  const run = [sectionReview('Applicant Header', [source('Taylor Chen')])];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'issue158-pdf-visual-'));
  t.after(async () => {
    fs.rmSync(temp, { recursive: true, force: true });
    await applicant.closePdfRenderer();
  });
  const pdfPath = path.join(temp, 'short-resume.pdf');
  fs.writeFileSync(pdfPath, await applicant.resumePdf(run));

  const dpi = 50;
  const ppmPrefix = path.join(temp, 'page');
  execFileSync('pdftoppm', ['-r', String(dpi), pdfPath, ppmPrefix]);
  const ppmPath = `${ppmPrefix}-1.ppm`;
  assert.ok(fs.existsSync(ppmPath), 'expected pdftoppm to produce a rasterized page');

  const pageWidthPx = Math.round((612 / 72) * dpi);
  const pageHeightPx = Math.round((792 / 72) * dpi);
  for (const [label, x, y] of [
    ['bottom-left corner', 10, pageHeightPx - 10],
    ['bottom-right corner', pageWidthPx - 10, pageHeightPx - 10],
    ['vertical center, far below the one-line header', Math.round(pageWidthPx / 2), Math.round(pageHeightPx * 0.6)],
  ]) {
    const pixel = readPpmPixel(ppmPath, x, y);
    assert.ok(
      pixel.r >= 250 && pixel.g >= 250 && pixel.b >= 250,
      `expected white at ${label} (${x},${y}) below the short header, got rgb(${pixel.r},${pixel.g},${pixel.b}) — the web-view canvas background is showing through`,
    );
  }
});

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
