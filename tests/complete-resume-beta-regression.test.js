const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer } = require('../src/beta-ui');

async function withServer(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'complete-resume-beta-'));
  const app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  const base = `http://${address.address}:${address.port}`;
  try { await run({ app, base }); }
  finally { await app.close(); fs.rmSync(root, { recursive: true, force: true }); }
}
async function json(url, options = {}) { const response = await fetch(url, options); return { response, value: await response.json() }; }
function input() {
  const resume = `private candidate Tang
ya.ching@example.com | +1 416 555 0123

Skills
Power BI, Python, SQL

Experience
Data Analyst — Example Co.
- Delivered recurring reporting for stakeholders.

Projects
Customer Analytics Dashboard
- Built Power BI dashboards and automation workflows using Python and SQL.

Education
B.Sc. Information Systems — Example University

Certifications
Microsoft Power BI Data Analyst`;
  const jobText = `Company: Zurich
Role Title: Data Analytics and AI Analyst

Required Qualifications:
Power BI required.
Automation required.`;
  return { resume: { name: 'complete-resume.txt', data: Buffer.from(resume).toString('base64') }, jobText, provider: 'mock' };
}

test('Projects-only accepted evidence still exports a complete source-preserving tailored resume', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/llm-first/start`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input()),
  });
  assert.equal(started.response.status, 201, JSON.stringify(started.value));
  assert.ok(started.value.candidates.some((item) => item.section === 'project'), JSON.stringify(started.value.candidates));

  const confirmed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions: started.value.candidates.map((item) => ({ evidence_candidate_id: item.evidence_candidate_id, action: item.section === 'project' ? 'accept' : 'skip' })) }),
  });
  assert.equal(confirmed.response.status, 200, JSON.stringify(confirmed.value));
  assert.notEqual(confirmed.value.validation, 'failed', JSON.stringify(confirmed.value.validationFindings));
  assert.ok(Array.isArray(confirmed.value.careerReview));

  const session = app.sessions.get(started.value.sessionId);
  const committed = session.store.getCommittedCandidateKnowledge(session.profileId);
  assert.ok(committed.length > 0);
  assert.ok(committed.every((fact) => fact.entity_type === 'project'), JSON.stringify(committed));

  const artifact = session.artifact.resume_artifacts[0];
  const sections = new Map(artifact.content.sections.map((section) => [section.section, section]));
  for (const name of ['Applicant Header', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications']) {
    assert.ok(sections.get(name)?.statements.length > 0, `${name}: ${JSON.stringify(artifact.content.sections)}`);
  }
  const sourceStatements = artifact.content.sections.flatMap((section) => section.statements).filter((statement) => statement.content_origin === 'source_resume_passthrough');
  assert.ok(sourceStatements.length > 0);
  assert.ok(sourceStatements.every((statement) => statement.resume_content_selection_ids.length === 0 && statement.text === statement.provenance.exact_source_text));
  const generatedStatements = sections.get('Projects').statements.filter((statement) => statement.content_origin === 'candidate_knowledge_generated');
  assert.ok(generatedStatements.length > 0);
  assert.ok(generatedStatements.every((statement) => statement.resume_content_selection_ids.length > 0 && statement.provenance.candidate_fact_ids.length > 0));

  assert.deepEqual(confirmed.value.careerReview.map((section) => section.section), ['Applicant Header', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications']);
  const completed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/career-review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions: confirmed.value.careerReview.map((section) => ({ section: section.section, action: 'approve' })) }),
  });
  assert.equal(completed.response.status, 200, JSON.stringify(completed.value));
  assert.equal(completed.value.exportAllowed, true);

  const output = await fetch(`${base}/api/llm-first/sessions/${started.value.sessionId}/outputs/final-resume.md`);
  assert.equal(output.status, 200);
  const markdown = await output.text();
  assert.match(markdown, /^private candidate Tang\nya\.ching@example\.com\n\+1 416 555 0123/m);
  for (const heading of ['Skills', 'Experience', 'Projects', 'Education', 'Certifications']) assert.match(markdown, new RegExp(`## ${heading}`));
  assert.match(markdown, /Delivered recurring reporting for stakeholders\./);
  assert.match(markdown, /B\.Sc\. Information Systems — Example University/);
  assert.match(markdown, /Microsoft Power BI Data Analyst/);
}));
