const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createBetaUiServer } = require('../../src/beta-ui');

function winAnsi(value) {
  return String(value)
    .replace(/•/g, '\x95')
    .replace(/–/g, '\x96')
    .replace(/—/g, '\x97')
    .replace(/’/g, '\x92')
    .replace(/[^\x20-\x7E\x80-\xFF]/g, '');
}
function pdfEscape(value) {
  return winAnsi(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function sourcePdf(lines) {
  const commands = lines.map((line, index) => `BT /F1 9.5 Tf 1 0 0 1 54 ${744 - index * 15} Tm (${pdfEscape(line)}) Tj ET`).join('\n');
  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [5 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(commands, 'latin1')} >>\nstream\n${commands}\nendstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>',
  ];
  let pdf = '%PDF-1.4\n%CEP\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const SOURCE_LINES = [
  'Taylor Chen',
  'taylor.chen@example.com | +1 416 555 0199',
  'EXPERIENCE',
  'Senior Analyst – Northstar Insurance',
  '• Built recurring executive reporting for claims leaders.',
  '2022 – 2023',
  'Data Analyst – City Lab',
  '• Automated data quality checks with Python and SQL.',
  'PROJECTS',
  'Claims Intelligence Dashboard',
  '• Built Power BI dashboards for claims trend analysis.',
  'Forecasting Toolkit',
  '• Developed Python forecasting workflows for monthly planning.',
  'SKILLS',
  'Python, SQL, Power BI, Tableau',
  'EDUCATION',
  'B.Sc. Statistics – Example University',
  '2022 – 2023',
  'CERTIFICATIONS',
  'Microsoft Power BI Data Analyst',
  'Azure Data Fundamentals',
];

const JOB_TEXT = `Company: Example Insurance
Role Title: Data Analytics Analyst

Required Qualifications:
Power BI required.
Python required.
Claims analytics preferred.`;

async function json(url, options = {}) {
  const response = await fetch(url, options);
  return { response, value: await response.json() };
}
function count(text, phrase) { return text.split(phrase).length - 1; }
function markdownSection(markdown, heading) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, `${heading} section is missing\n${markdown}`);
  const remainder = markdown.slice(start + marker.length);
  const nextSection = remainder.search(/\n## /);
  return nextSection === -1 ? remainder : remainder.slice(0, nextSection);
}

test('representative PDF survives Option 2 source attestation, concrete review, composition, Career Review, and every export', async () => {
  const check = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
  assert.notEqual(check.error?.code, 'ENOENT', 'pdftotext is required for the representative PDF contract tier');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'representative-pdf-contract-'));
  const app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  const base = `http://${address.address}:${address.port}`;
  try {
    const pdf = sourcePdf(SOURCE_LINES);
    const sourcePath = path.join(root, 'representative-resume.pdf');
    fs.writeFileSync(sourcePath, pdf);
    const extracted = spawnSync('pdftotext', ['-enc', 'UTF-8', sourcePath, '-'], { encoding: 'utf8' });
    assert.equal(extracted.status, 0, extracted.stderr);
    assert.match(extracted.stdout, /Senior Analyst [–-] Northstar Insurance/);
    assert.match(extracted.stdout, /Built recurring executive reporting/);
    assert.match(extracted.stdout, /2022 [–-] 2023/);

    const started = await json(`${base}/api/llm-first/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume: { name: 'representative-resume.pdf', data: pdf.toString('base64') },
        jobText: JOB_TEXT,
        provider: 'mock',
      }),
    });
    assert.equal(started.response.status, 201, JSON.stringify(started.value));
    assert.equal(started.value.stage, 'Tailoring Review');
    assert.ok(Array.isArray(started.value.tailoringReview));

    const session = app.sessions.get(started.value.sessionId);
    assert.equal(session.reviewRun.review_actor, 'source_resume_attestation');
    assert.ok(session.integration?.id);
    const committed = session.store.getCommittedCandidateKnowledge(session.profileId);
    assert.ok(committed.length > 0);
    assert.ok(committed.some((fact) => fact.entity_type === 'project'));
    assert.ok(committed.some((fact) => fact.entity_type === 'responsibility'));

    const artifact = session.artifact.resume_artifacts[0];
    const bySection = new Map(artifact.content.sections.map((section) => [section.section, section.statements]));
    for (const section of ['Applicant Header', 'Experience', 'Projects', 'Skills', 'Education', 'Certifications']) {
      assert.ok(bySection.get(section)?.length > 0, `${section}: ${JSON.stringify(artifact.content.sections)}`);
    }
    for (const statement of artifact.content.sections.flatMap((section) => section.statements)) {
      if (statement.content_origin === 'source_resume_passthrough') {
        assert.equal(statement.resume_content_selection_ids.length, 0);
        assert.equal(statement.text, statement.provenance.exact_source_text);
      } else {
        assert.ok(statement.resume_content_selection_ids.length > 0);
        assert.ok(statement.provenance.candidate_fact_ids.length > 0);
      }
    }

    const material = started.value.tailoringReview.filter((item) => item.materialRewrite);
    const reviewed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/tailoring-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions: material.map((item) => ({ id: item.id, action: 'keep_original' })) }),
    });
    assert.equal(reviewed.response.status, 200, JSON.stringify(reviewed.value));
    assert.equal(reviewed.value.stage, 'Career Review');
    assert.ok(Array.isArray(reviewed.value.careerReview));

    const completed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/career-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisions: reviewed.value.careerReview.map((section) => ({ section: section.section, action: 'approve' })),
      }),
    });
    assert.equal(completed.response.status, 200, JSON.stringify(completed.value));
    assert.equal(completed.value.primaryOutput, 'final-resume.pdf');
    assert.deepEqual(new Set(completed.value.outputs), new Set([
      'final-resume.md',
      'final-resume.json',
      'career-review-report.html',
    ]));
    assert.deepEqual(new Set(completed.value.applicantOutputs), new Set([
      'final-resume.pdf',
      'career-review-report.html',
      'final-resume.md',
      'final-resume.json',
    ]));

    const markdownResponse = await fetch(`${base}/api/llm-first/sessions/${started.value.sessionId}/outputs/final-resume.md`);
    const markdown = await markdownResponse.text();
    assert.equal(markdownResponse.status, 200);
    for (const phrase of [
      'Taylor Chen',
      'taylor.chen@example.com',
      '+1 416 555 0199',
      'Senior Analyst – Northstar Insurance',
      'Built recurring executive reporting for claims leaders.',
      'Data Analyst – City Lab',
      'Automated data quality checks with Python and SQL.',
      'B.Sc. Statistics – Example University',
      'Microsoft Power BI Data Analyst',
      'Azure Data Fundamentals',
    ]) assert.equal(count(markdown, phrase), 1, `${phrase}\n${markdown}`);
    const skills = markdownSection(markdown, 'Skills');
    for (const skill of ['Python', 'SQL', 'Power BI', 'Tableau']) {
      assert.equal(count(skills, `- ${skill}`), 1, `${skill} is not preserved exactly once in Skills\n${skills}`);
    }
    assert.doesNotMatch(markdown, /[•▪◦]|â€¢|â€“|ï‚·||\uFFFD/);

    const jsonResponse = await fetch(`${base}/api/llm-first/sessions/${started.value.sessionId}/outputs/final-resume.json`);
    const structured = await jsonResponse.json();
    assert.equal(structured.markdown.trim(), markdown.trim());

    const reportResponse = await fetch(`${base}/api/llm-first/sessions/${started.value.sessionId}/outputs/career-review-report.html`);
    const report = await reportResponse.text();
    assert.match(report, /Career Review complete/);
    assert.match(report, /Where this came from/);
    assert.match(report, /Taylor Chen/);
    assert.doesNotMatch(report, /statement_id|candidate_fact_id|[0-9a-f]{8}-[0-9a-f-]{27,}/i);

    const pdfResponse = await fetch(`${base}/api/llm-first/sessions/${started.value.sessionId}/outputs/final-resume.pdf`);
    assert.equal(pdfResponse.status, 200);
    assert.match(pdfResponse.headers.get('content-type'), /application\/pdf/);
    const finalPdfPath = path.join(root, 'final-resume.pdf');
    fs.writeFileSync(finalPdfPath, Buffer.from(await pdfResponse.arrayBuffer()));
    const finalText = spawnSync('pdftotext', ['-enc', 'UTF-8', finalPdfPath, '-'], { encoding: 'utf8' });
    assert.equal(finalText.status, 0, finalText.stderr);
    for (const phrase of ['Taylor Chen', 'Senior Analyst', 'Data Analyst', 'Power BI', 'Example University']) {
      assert.match(finalText.stdout, new RegExp(phrase));
    }
    assert.doesNotMatch(finalText.stdout, /â€¢|â€“|ï‚·||\uFFFD/);
  } finally {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
