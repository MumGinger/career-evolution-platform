const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer } = require('../src/beta-ui');
const { REQUIRED_SECTIONS } = require('../src/human-review');

async function withServer(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-ui-test-')); const app = createBetaUiServer({ port: 0, tempRoot: root }); const address = await app.listen(); const base = `http://${address.address}:${address.port}`;
  try { await run({ app, base }); } finally { await app.close(); fs.rmSync(root, { recursive: true, force: true }); }
}
async function json(url, options = {}) { const response = await fetch(url, options); return { response, value: await response.json() }; }
function input() { return { resume: { name: 'synthetic-resume.txt', data: Buffer.from(fs.readFileSync(path.join(__dirname, '../examples/synthetic-resume.txt'))).toString('base64') }, jobText: fs.readFileSync(path.join(__dirname, '../examples/synthetic-job.txt'), 'utf8'), provider: 'mock', apiKey: 'not-a-real-key' }; }
function realResumeFailureShapeInput() { const resume = `Ya-Ching Tang\nSkills\nPower BI, Python, SQL\nProjects\nCustomer Analytics Dashboard\n- Built Power BI data visualization dashboards and automation workflows using Python and SQL.\nExperience\nData Analyst\n- Delivered business insights and data analysis reporting for stakeholders.`; const jobText = `Company: Zurich\nRole Title: Data Analytics and AI Analyst\n\nRequired Qualifications:\nPower BI required.\nPython required.\nSQL required.\nData visualization required.\nDashboard development required.\nAutomation required.\nBusiness insights required.\nData analysis required.`; return { resume: { name: 'ya-ching-tang-resume.txt', data: Buffer.from(resume).toString('base64') }, jobText, provider: 'mock' }; }

test('local Beta UI runs the existing review, integration, Career Review, and export flow without persisting an API key', async () => withServer(async ({ app, base }) => {
  const page = await fetch(`${base}/`); assert.equal(page.status, 200); assert.match(await page.text(), /Career Evolution/);
  const started = await json(`${base}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input()) }); assert.equal(started.response.status, 201); assert.equal(started.value.provider, 'mock'); assert.ok(started.value.candidates.length > 0);
  const session = app.sessions.get(started.value.sessionId); const secret = 'not-a-real-key'; const saved = fs.readdirSync(session.dir).map((name) => fs.readFileSync(path.join(session.dir, name)).toString('utf8')); assert.ok(saved.every((value) => !value.includes(secret)));
  const blocked = await fetch(`${base}/api/sessions/${started.value.sessionId}/outputs/final-resume.md`); assert.equal(blocked.status, 409);
  const reviewed = await json(`${base}/api/sessions/${started.value.sessionId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((candidate) => ({ key: candidate.key, action: 'accepted' })) }) }); assert.equal(reviewed.response.status, 200); assert.ok(reviewed.value.committedFacts > 0); assert.match(reviewed.value.resumeMarkdown, /SQL/); assert.equal(reviewed.value.careerReview.length, REQUIRED_SECTIONS.length);
  const complete = await json(`${base}/api/sessions/${started.value.sessionId}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: reviewed.value.careerReview.map((section) => ({ section: section.section, action: 'approve' })) }) }); assert.equal(complete.response.status, 200); assert.equal(complete.value.exportAllowed, true); assert.ok(complete.value.outputs.includes('career-review-report.html'));
  const output = await fetch(`${base}/api/sessions/${started.value.sessionId}/outputs/final-resume.md`); assert.equal(output.status, 200); assert.match(await output.text(), /## Skills/);
}));

test('Career Review remains mandatory for local export', async () => withServer(async ({ base }) => {
  const started = await json(`${base}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input()) }); const reviewed = await json(`${base}/api/sessions/${started.value.sessionId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((candidate) => ({ key: candidate.key, action: 'accepted' })) }) });
  const incomplete = await json(`${base}/api/sessions/${started.value.sessionId}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [{ section: reviewed.value.careerReview[0].section, action: 'approve' }] }) }); assert.equal(incomplete.response.status, 400); assert.match(incomplete.value.error, /explicit decisions/);
  const blocked = await fetch(`${base}/api/sessions/${started.value.sessionId}/outputs/final-resume.json`); assert.equal(blocked.status, 409);
}));

test('reviewed project and experience bullets survive 003.6 and populate all core draft sections', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(realResumeFailureShapeInput()) });
  assert.equal(started.response.status, 201); assert.ok(started.value.candidates.some((item) => item.section === 'projects'), JSON.stringify(started.value.candidates)); assert.ok(started.value.candidates.some((item) => item.section === 'experiences'), JSON.stringify(started.value.candidates));
  const reviewed = await json(`${base}/api/sessions/${started.value.sessionId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((candidate) => ({ key: candidate.key, action: 'accepted' })) }) });
  assert.equal(reviewed.response.status, 200); assert.notEqual(reviewed.value.validation, 'failed', JSON.stringify(app.sessions.get(started.value.sessionId).validation.validation_findings));
  const session = app.sessions.get(started.value.sessionId); const artifact = session.artifact.resume_artifacts[0]; assert.equal(artifact.metadata.draft_provider.provider, 'mock');
  for (const heading of ['Professional Summary', 'Skills', 'Experience', 'Projects']) assert.match(reviewed.value.resumeMarkdown, new RegExp(`## ${heading}\\n\\n- `), JSON.stringify(session.integration.integration_decisions));
  assert.match(reviewed.value.resumeMarkdown, /Customer Analytics Dashboard: Built Power BI data visualization dashboards and automation workflows using Python and SQL\./);
  assert.match(reviewed.value.resumeMarkdown, /Delivered business insights and data analysis reporting for stakeholders\./);
}));

test('failed startup cleans its temporary store and directory before registering a session', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-ui-startup-failure-')); const app = createBetaUiServer({ port: 0, tempRoot: root }); const address = await app.listen();
  try {
    const failed = await json(`http://${address.address}:${address.port}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input(), jobText: '' }) });
    assert.equal(failed.response.status, 400); assert.match(failed.value.error, /Paste a job description/); assert.deepEqual(fs.readdirSync(root), []); assert.equal(app.sessions.size, 0);
  } finally { await app.close(); fs.rmSync(root, { recursive: true, force: true }); }
});

test('LLM-first beta uses the existing durable review, Candidate Knowledge, draft, and export gates', async () => withServer(async ({ app, base }) => {
  const source = `Aira Candidate\nSkills\nPython, SQL\nExperience\nData Analyst\n- Built Python reporting workflows for stakeholders.`; const job = `Company: Acme\nRole Title: Analyst\n\nRequired Qualifications:\nPython required.\nSQL required.`;
  const started = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: { name: 'resume.txt', data: Buffer.from(source).toString('base64') }, jobText: job, provider: 'mock' }) }); assert.equal(started.response.status, 201); const session = app.sessions.get(started.value.sessionId); assert.ok(session.semantic.id); assert.ok(session.discoveryId);
  const confirmed = await json(`${base}/api/llm-first/sessions/${session.id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((item) => ({ evidence_candidate_id: item.evidence_candidate_id, action: 'accept' })) }) }); assert.equal(confirmed.response.status, 200); assert.ok(session.reviewRun.id); assert.ok(session.integration?.id); assert.ok(session.artifact.id); assert.equal(confirmed.value.validation !== 'failed', true);
  const exported = await json(`${base}/api/llm-first/sessions/${session.id}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: confirmed.value.careerReview.map((section) => ({ section: section.section, action: 'approve' })) }) }); assert.equal(exported.response.status, 200); assert.equal(exported.value.exportAllowed, true);
}));

test('LLM-first export gate blocks Career Review when deterministic draft validation fails', async () => withServer(async ({ app, base }) => {
  const source = `Aira Candidate\nSkills\nPython, SQL\nExperience\nData Analyst\n- Built Python reporting workflows for stakeholders.`; const job = `Company: Acme\nRole Title: Analyst\n\nRequired Qualifications:\nPython required.\nSQL required.`;
  const started = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: { name: 'resume.txt', data: Buffer.from(source).toString('base64') }, jobText: job, provider: 'mock' }) }); const session = app.sessions.get(started.value.sessionId); session.providerConfig = { provider: 'openai-compatible', model: 'unavailable', apiKey: 'memory-only', baseUrl: 'http://127.0.0.1:9' };
  const confirmed = await json(`${base}/api/llm-first/sessions/${session.id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((item) => ({ evidence_candidate_id: item.evidence_candidate_id, action: 'accept' })) }) }); assert.equal(confirmed.response.status, 200); assert.equal(confirmed.value.blocked, true); assert.equal(confirmed.value.careerReview, null); assert.equal(session.draftValidation.validation_status, 'failed');
  const blocked = await json(`${base}/api/llm-first/sessions/${session.id}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [] }) }); assert.equal(blocked.response.status, 400); assert.match(blocked.value.error, /blocked until deterministic draft validation passes/); assert.equal(session.exported, undefined);
}));
