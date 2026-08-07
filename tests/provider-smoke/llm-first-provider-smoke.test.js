const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer } = require('../../src/beta-ui');

const enabled = process.env.CEP_PROVIDER_SMOKE === '1';

function required(name) {
  const value = process.env[name];
  assert.ok(value, `${name} is required when CEP_PROVIDER_SMOKE=1`);
  return value;
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  return { response, value: await response.json() };
}

test('real provider accepts the shipped understanding and draft schemas without retaining credentials', { skip: !enabled }, async () => {
  const provider = process.env.CEP_LLM_PROVIDER || 'openai-compatible';
  const model = required('CEP_LLM_MODEL');
  const apiKey = required('CEP_LLM_API_KEY');
  const baseUrl = process.env.CEP_LLM_BASE_URL || undefined;
  const resume = `Alex Morgan
alex.morgan@example.test | +1 416 555 0142

Skills
Python, SQL, Power BI

Experience
Data Analyst — Synthetic Insurance Lab
- Built recurring reporting and data quality checks using Python and SQL.

Projects
Claims Dashboard
- Built a Power BI dashboard for synthetic claims trend analysis.

Education
B.Sc. Statistics — Example University

Certifications
Microsoft Power BI Data Analyst`;
  const jobText = `Company: Synthetic Insurance Lab
Role Title: Data Analytics Analyst

Required Qualifications:
Python required.
SQL required.
Power BI required.`;

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-smoke-'));
  const app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  const base = `http://${address.address}:${address.port}`;
  try {
    const connection = { provider, model, apiKey, baseUrl };
    const preflight = await json(`${base}/api/llm-first/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(connection),
    });
    assert.equal(preflight.response.status, 200);
    assert.equal(preflight.value.state, 'ready', JSON.stringify(preflight.value));
    assert.doesNotMatch(JSON.stringify(preflight.value), new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    const started = await json(`${base}/api/llm-first/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...connection,
        resume: { name: 'synthetic-provider-smoke.txt', data: Buffer.from(resume).toString('base64') },
        jobText,
      }),
    });
    assert.equal(started.response.status, 201, JSON.stringify(started.value));
    assert.equal(started.value.mode, 'llm-first');
    assert.ok(Array.isArray(started.value.candidates) && started.value.candidates.length > 0);
    assert.ok(Array.isArray(started.value.evidence));
    assert.ok(started.value.validation?.counts?.valid > 0);

    const confirmed = await json(`${base}/api/llm-first/sessions/${started.value.sessionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisions: started.value.candidates.map((candidate) => ({
          evidence_candidate_id: candidate.evidence_candidate_id,
          action: 'accept',
        })),
      }),
    });
    assert.equal(confirmed.response.status, 200, JSON.stringify(confirmed.value));
    assert.notEqual(confirmed.value.validation, 'failed', JSON.stringify(confirmed.value.validationFindings));
    assert.ok(Array.isArray(confirmed.value.careerReview) && confirmed.value.careerReview.length > 0);
    assert.match(confirmed.value.resumeMarkdown, /Alex Morgan/);

    const session = app.sessions.get(started.value.sessionId);
    const stored = fs.readdirSync(session.dir)
      .map((name) => fs.readFileSync(path.join(session.dir, name)))
      .map((buffer) => buffer.toString('utf8'))
      .join('\n');
    assert.ok(!stored.includes(apiKey), 'API key must never be persisted');
    assert.ok(!stored.includes(root), 'local temporary paths must never be persisted');
    assert.equal(fs.existsSync(path.join(session.dir, 'synthetic-provider-smoke.txt')), false, 'source document must be deleted after extraction');
  } finally {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
