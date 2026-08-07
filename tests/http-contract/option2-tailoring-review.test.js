const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer, APPLICANT_PAGE } = require('../../src/beta-ui');
const llmUnderstanding = require('../../src/llm-resume-understanding');

async function withServer(run, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'option2-tailoring-review-'));
  const app = createBetaUiServer({ port: 0, tempRoot: root, ...options });
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

test('LLM-first start source-attests uploaded resume through 003.6 and returns concrete tailoring proposals', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/llm-first/start`, input());
  assert.equal(started.response.status, 201, JSON.stringify(started.value));
  assert.equal(started.value.stage, 'Tailoring Review');
  assert.ok(Array.isArray(started.value.tailoringReview));
  assert.ok(started.value.tailoringReview.length > 0);
  assert.ok(started.value.tailoringReview.every((item) => item.originalText && item.tailoredText));

  const session = app.sessions.get(started.value.sessionId);
  assert.ok(session.reviewRun?.id, 'source-attested review remains an internal immutable boundary');
  assert.equal(session.reviewRun.review_actor, 'source_resume_attestation');
  assert.ok(session.integration?.id, '003.6 remains the Candidate Knowledge write path');
  const facts = session.store.getCommittedCandidateKnowledge(session.profileId);
  assert.ok(facts.length > 0);
  assert.ok(facts.every((fact) => fact.integration_decision_id));
}));

test('source attestation never promotes an AI-only normalized meaning into Candidate Knowledge', async () => {
  const supplied = input();
  const text = Buffer.from(supplied.resume.data, 'base64').toString('utf8');
  const understanding = llmUnderstanding.mockUnderstand({ text });
  const target = understanding.blocks.find((block) => block.type === 'responsibility');
  assert.ok(target);
  target.normalized_meaning = 'Led enterprise AI transformation across the company';
  const provider = {
    name: 'mock',
    model: 'source-bound-adversarial-fixture',
    async understand() { return { provider: this.name, model: this.model, understanding }; },
  };
  await withServer(async ({ app, base }) => {
    const started = await json(`${base}/api/llm-first/start`, supplied);
    assert.equal(started.response.status, 201, JSON.stringify(started.value));
    const session = app.sessions.get(started.value.sessionId);
    const committed = session.store.getCommittedCandidateKnowledge(session.profileId);
    assert.ok(committed.length > 0);
    assert.doesNotMatch(JSON.stringify(committed), /Led enterprise AI transformation/i);
    assert.match(JSON.stringify(committed), /Delivered business insights and data analysis reporting for stakeholders/i);
  }, { resumeUnderstandingProviderFromConfig: () => provider });
});

test('needs-correction flows through acquisition and 003.6, regenerates, and requires a second tailoring decision', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/llm-first/start`, input());
  assert.equal(started.response.status, 201, JSON.stringify(started.value));
  const material = started.value.tailoringReview.filter((item) => item.materialRewrite);
  assert.ok(material.length > 0, JSON.stringify(started.value.tailoringReview));
  const target = material.find((item) => ['Experience', 'Projects'].includes(item.section)) || material[0];
  const session = app.sessions.get(started.value.sessionId);
  const before = session.store.getCommittedCandidateKnowledge(session.profileId);
  const prior = before.find((fact) => fact.id === target.candidateFactId);
  assert.ok(prior, JSON.stringify({ target, before }));

  const correction = 'The dashboard reported FX exposure, not portfolio risk.';
  const corrected = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/tailoring-review`, {
    decisions: material.map((item) => item.id === target.id
      ? { id: item.id, action: 'needs_correction', correction }
      : { id: item.id, action: 'use_tailored' }),
  });
  assert.equal(corrected.response.status, 200, JSON.stringify(corrected.value));
  assert.equal(corrected.value.stage, 'Tailoring Review');
  assert.equal(corrected.value.regenerated, true);
  assert.ok(corrected.value.corrections.some((item) => item.id === target.id && item.status === 'integrated_and_regenerated'));
  assert.ok(Array.isArray(corrected.value.tailoringReview));
  assert.ok(corrected.value.tailoringReview.length > 0);

  assert.equal(session.correctionIntegrations.length, 1);
  const correctionRun = session.correctionIntegrations[0];
  assert.ok(correctionRun.acquisition.id);
  assert.ok(correctionRun.integration.id);
  assert.ok(correctionRun.integration.applied_facts.length > 0);
  assert.ok(correctionRun.integration.integration_decisions.every((decision) => decision.policy_version.includes('candidate-knowledge-integration-policy')));

  const after = session.store.getCommittedCandidateKnowledge(session.profileId);
  assert.ok(after.some((fact) => JSON.stringify(fact).includes('FX exposure')), JSON.stringify(after));
  assert.ok(!after.some((fact) => fact.id === prior.id), 'superseded fact must not remain in effective Candidate Knowledge');
  const revisions = session.store.db.prepare('SELECT * FROM candidate_fact_revisions WHERE prior_fact_id = ?').all(prior.id);
  assert.ok(revisions.some((revision) => revision.relation === 'supersedes'));

  const secondMaterial = corrected.value.tailoringReview.filter((item) => item.materialRewrite);
  const reviewed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/tailoring-review`, {
    decisions: secondMaterial.map((item) => ({ id: item.id, action: 'use_tailored' })),
  });
  assert.equal(reviewed.response.status, 200, JSON.stringify(reviewed.value));
  assert.equal(reviewed.value.stage, 'Career Review');
  assert.ok(Array.isArray(reviewed.value.careerReview));
  assert.ok(reviewed.value.careerReview.length > 0);
}));
