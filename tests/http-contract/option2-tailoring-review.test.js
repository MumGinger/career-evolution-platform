const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer, APPLICANT_PAGE } = require('../../src/beta-ui');

async function withServer(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'option2-tailoring-review-'));
  const app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  const base = `http://${address.address}:${address.port}`;
  try { await run({ app, base }); }
  finally { await app.close(); fs.rmSync(root, { recursive: true, force: true }); }
}

function input() {
  const resume = `Candidate Example\nSkills\nPower BI, Python, SQL\nProjects\nCustomer Analytics Dashboard\n- Built Power BI dashboards and automation workflows using Python and SQL.\nExperience\nData Analyst\n- Delivered business insights and data analysis reporting for stakeholders.`;
  const jobText = `Company: Example\nRole Title: Data Analytics Analyst\n\nRequired Qualifications:\nPower BI required.\nPython required.\nSQL required.\nData analysis required.`;
  return {
    resume: { name: 'synthetic-resume.txt', data: Buffer.from(resume).toString('base64') },
    jobText,
    provider: 'mock',
  };
}

async function json(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, value: await response.json() };
}

test('applicant surface reviews concrete tailoring instead of re-verifying uploaded resume evidence', () => {
  assert.doesNotMatch(APPLICANT_PAGE, /<h2>Evidence Review<\/h2>/);
  assert.doesNotMatch(APPLICANT_PAGE, /Accept — allow this evidence|Skip — do not reuse this evidence/);
  assert.match(APPLICANT_PAGE, /Tailoring Review/);
  assert.match(APPLICANT_PAGE, /Use tailored version/);
  assert.match(APPLICANT_PAGE, /Keep original wording/);
  assert.match(APPLICANT_PAGE, /Needs correction/);
  assert.match(APPLICANT_PAGE, /What is inaccurate or missing/);
});

test('LLM-first start treats uploaded resume evidence as source-attested through 003.6 and returns a concrete tailoring review', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/llm-first/start`, input());
  assert.equal(started.response.status, 201);
  assert.equal(started.value.stage, 'Tailoring Review');
  assert.ok(Array.isArray(started.value.tailoringReview));
  assert.ok(started.value.tailoringReview.length > 0);
  assert.ok(started.value.tailoringReview.every((item) => item.originalText && item.tailoredText));
  assert.ok(started.value.tailoringReview.every((item) => item.originalText !== item.tailoredText || item.materialRewrite === false));

  const session = app.sessions.get(started.value.sessionId);
  assert.ok(session.reviewRun?.id, 'source-attested Evidence Review run remains an internal immutable boundary');
  assert.equal(session.reviewRun.review_actor, 'source_resume_attestation');
  assert.ok(session.integration?.id, '003.6 remains the only Candidate Knowledge write path');
  assert.ok(session.store.getCommittedCandidateKnowledge(session.profileId).length > 0);
}));

test('needs-correction records applicant context without silently writing it as Candidate Knowledge', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/llm-first/start`, input());
  const target = started.value.tailoringReview.find((item) => item.materialRewrite) || started.value.tailoringReview[0];
  const before = app.sessions.get(started.value.sessionId).store.getCommittedCandidateKnowledge(app.sessions.get(started.value.sessionId).profileId).length;

  const reviewed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/tailoring-review`, {
    decisions: started.value.tailoringReview.map((item) => item.id === target.id
      ? { id: item.id, action: 'needs_correction', correction: 'The dashboard reported FX exposure, not portfolio risk.' }
      : { id: item.id, action: 'use_tailored' }),
  });
  assert.equal(reviewed.response.status, 200);
  assert.equal(reviewed.value.stage, 'Career Review');
  assert.ok(reviewed.value.corrections.some((item) => item.id === target.id && item.status === 'deferred_pending_integration'));

  const session = app.sessions.get(started.value.sessionId);
  const after = session.store.getCommittedCandidateKnowledge(session.profileId).length;
  assert.equal(after, before, 'free-text correction is not silently committed as Candidate Knowledge');
  assert.ok(session.correctionObservations?.length > 0);
}));
