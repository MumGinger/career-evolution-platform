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
  const resume = `Ya-Ching Tang
y a.ching@example.com | +1 416 555 0123

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
Microsoft Power BI Data Analyst`.replace('y a.ching', 'ya.ching');
  const jobText = `Company: Zurich
Role Title: Data Analytics and AI Analyst

Required Qualifications:
Power BI required.
Automation required.`;
  return { resume: { name: 'complete-resume.txt', data: Buffer.from(resume).toString('base64') }, jobText, provider: 'mock' };
}

test('Option 2 source attestation still exports a complete source-preserving resume when tailored wording is declined', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/llm-first/start`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input()),
  });
  assert.equal(started.response.status, 201, JSON.stringify(started.value));
  assert.equal(started.value.stage, 'Tailoring Review');
  assert.ok(Array.isArray(started.value.tailoringReview));

  const session = app.sessions.get(started.value.sessionId);
  assert.equal(session.reviewRun.review_actor, 'source_resume_attestation');
  assert.ok(session.integration?.id);
  const committed = session.store.getCommittedCandidateKnowledge(session.profileId);
  assert.ok(committed.some((fact) => fact.entity_type === 'project'), JSON.stringify(committed));
  assert.ok(committed.some((fact) => fact.entity_type === 'responsibility'), JSON.stringify(committed));
  const integrity = session.store.candidateFactIntegrity(committed.map((fact) => fact.id));
  for (const fact of committed) {
    assert.equal(integrity.get(fact.id).fact_exists, true);
    assert.equal(integrity.get(fact.id).integration_exists, true);
    assert.equal(integrity.get(fact.id).provenance_exists, true);
  }

  const artifact = session.artifact.resume_artifacts[0];
  const sections = new Map(artifact.content.sections.map((section) => [section.section, section]));
  for (const name of ['Applicant Header', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications']) {
    assert.ok(sections.get(name)?.statements.length > 0, `${name}: ${JSON.stringify(artifact.content.sections)}`);
  }
  const sourceStatements = artifact.content.sections.flatMap((section) => section.statements)
    .filter((statement) => statement.content_origin === 'source_resume_passthrough');
  assert.ok(sourceStatements.length > 0);
  assert.ok(sourceStatements.every((statement) => statement.resume_content_selection_ids.length === 0 && statement.text === statement.provenance.exact_source_text));
  const generatedStatements = artifact.content.sections.flatMap((section) => section.statements)
    .filter((statement) => statement.content_origin === 'candidate_knowledge_generated');
  assert.ok(generatedStatements.length > 0);
  assert.ok(generatedStatements.every((statement) => statement.resume_content_selection_ids.length > 0 && statement.provenance.candidate_fact_ids.length > 0));

  const material = started.value.tailoringReview.filter((item) => item.materialRewrite);
  const reviewed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/tailoring-review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions: material.map((item) => ({ id: item.id, action: 'keep_original' })) }),
  });
  assert.equal(reviewed.response.status, 200, JSON.stringify(reviewed.value));
  assert.equal(reviewed.value.stage, 'Career Review');
  assert.deepEqual(reviewed.value.careerReview.map((section) => section.section), ['Applicant Header', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications']);

  const completed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/career-review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions: reviewed.value.careerReview.map((section) => ({ section: section.section, action: 'approve' })) }),
  });
  assert.equal(completed.response.status, 200, JSON.stringify(completed.value));
  assert.equal(completed.value.exportAllowed, true);

  const output = await fetch(`${base}/api/llm-first/sessions/${started.value.sessionId}/outputs/final-resume.md`);
  assert.equal(output.status, 200);
  const markdown = await output.text();
  assert.match(markdown, /^Ya-Ching Tang\nya\.ching@example\.com\n\+1 416 555 0123/m);
  for (const heading of ['Skills', 'Experience', 'Projects', 'Education', 'Certifications']) assert.match(markdown, new RegExp(`## ${heading}`));
  assert.match(markdown, /Delivered recurring reporting for stakeholders\./);
  assert.match(markdown, /Built Power BI dashboards and automation workflows using Python and SQL\./);
  assert.match(markdown, /B\.Sc\. Information Systems — Example University/);
  assert.match(markdown, /Microsoft Power BI Data Analyst/);
}));
