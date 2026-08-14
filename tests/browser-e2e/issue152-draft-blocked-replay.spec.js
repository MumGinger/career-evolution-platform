const { test, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer } = require('../../src/beta-ui');
const llmUnderstanding = require('../../src/llm-resume-understanding');

const TEST_ID = 'issue152-draft-blocked-replay';
const REPRODUCTION = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'issue152-draft-blocked-reproduction.json'), 'utf8'));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeRuntimeEvidence() {
  const target = process.env.CEP_ISSUE152_RUNTIME_EVIDENCE_PATH
    || path.join(process.cwd(), 'test-results', 'runtime-evidence', `${TEST_ID}.json`);
  const evidence = {
    schema_version: 1,
    runtime_evidence: true,
    delivery_incident: '#152',
    revision: process.env.CEP_GATE_REVISION || process.env.GITHUB_SHA || 'local-playwright-run',
    run_id: process.env.GITHUB_RUN_ID || 'local-playwright-run',
    observable_state: '3 of 5 · Draft blocked',
    recovery_action: 'start_new_session',
    privacy: {
      contains_resume_text: false,
      contains_job_description_text: false,
      contains_provider_credentials: false,
      contains_raw_provider_response: false,
    },
  };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

const RESUME = `Jordan Park
jordan.park@example.test | +1 416 555 0142

Skills
Python, SQL, Power BI

Experience
Data Analyst — Northstar Insurance
- Built recurring reporting for claims leaders using SQL and Power BI.

Projects
Claims Intelligence Dashboard
- Built dashboard automation with Python and SQL.

Education
BSc Statistics — Example University`;

const JOB = `Company: Example Insurance
Role Title: Data Analytics Analyst

Required Qualifications:
Python required.
SQL required.
Power BI required.`;

function replayUnderstandingProvider() {
  return {
    name: 'issue152-understanding-replay',
    model: 'deidentified-draft-blocked-shape',
    async checkConnection() { return true; },
    async understand({ text }) {
      return { provider: this.name, model: this.model, understanding: llmUnderstanding.mockUnderstand({ text }) };
    },
  };
}

function startUnusableDraftProvider() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => {
        const body = JSON.parse(raw || '{}');
        const schemaName = body.response_format?.json_schema?.name || 'connection_probe';
        const content = schemaName === 'resume_draft' ? '{not-valid-json' : 'READY';
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content } }] }));
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let app;
let baseURL;
let root;
let providerServer;
let providerBaseURL;

test.beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'issue152-draft-blocked-'));
  providerServer = await startUnusableDraftProvider();
  const providerAddress = providerServer.address();
  providerBaseURL = `http://127.0.0.1:${providerAddress.port}/v1`;
  app = createBetaUiServer({
    port: 0,
    tempRoot: root,
    resumeUnderstandingProviderFromConfig: () => replayUnderstandingProvider(),
  });
  const address = await app.listen();
  baseURL = `http://${address.address}:${address.port}`;
});

test.afterAll(async () => {
  await app.close();
  await new Promise((resolve) => providerServer.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
});

test('captures the deidentified Draft-blocked dead end without private replay input', async ({ page }) => {
  assert.equal(REPRODUCTION.delivery_incident, '#152');
  assert.equal(REPRODUCTION.delivery_owner.github_login, 'MumGinger');
  assert.equal(REPRODUCTION.delivery_owner.role, 'Engineering Lead');
  assert.equal(REPRODUCTION.source_resume_sha256, sha256(RESUME));
  assert.equal(REPRODUCTION.job_description_sha256, sha256(JOB));
  assert.match(REPRODUCTION.correlation_id, /^cep-issue152-[a-z0-9-]+$/);
  assert.equal(REPRODUCTION.observable_symptom.stage, '3 of 5 · Draft blocked');
  assert.equal(REPRODUCTION.privacy.contains_resume_text, false);
  assert.equal(REPRODUCTION.privacy.contains_job_description_text, false);
  assert.equal(REPRODUCTION.privacy.contains_provider_credentials, false);
  assert.equal(REPRODUCTION.privacy.contains_raw_provider_response, false);

  await page.goto(baseURL);
  await page.locator('#p').selectOption('openai-compatible');
  await page.locator('#m').fill('issue152-unusable-draft-replay');
  await page.locator('#k').fill('test-only-key');
  await page.locator('#b').fill(providerBaseURL);
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.locator('#readiness')).toHaveText('Ready to create your tailored resume.');

  await page.locator('#f').setInputFiles({
    name: 'deidentified-incident-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(RESUME),
  });
  await page.locator('#j').fill(JOB);
  await page.getByRole('button', { name: 'Understand and tailor my resume' }).click();

  await expect(page.locator('#understanding')).toBeVisible();
  await expect(page.locator('#understanding')).toContainText('Processing summary');
  await expect(page.locator('#state')).toHaveText(REPRODUCTION.observable_symptom.stage);
  await expect(page.locator('#draft')).toBeVisible();
  await expect(page.locator('#tailoring')).toBeHidden();
  await expect(page.locator('#validation')).toContainText('We couldn’t create a reviewable draft.');
  await expect(page.locator('#validation')).toContainText(/Draft incident reference: draft-[a-f0-9-]+/);
  await expect(page.locator('#preview')).toBeEmpty();
  const restart = page.getByRole('button', { name: 'Start a new session' });
  await expect(restart).toBeVisible();

  const session = [...app.sessions.values()][0];
  expect(session.stage).toBe('draft-blocked');
  expect(session.draftValidation.validation_status).toBe('failed');

  await restart.click();
  await expect(page.locator('#input')).toBeVisible();
  await expect(page.locator('#understanding')).toBeHidden();
  await expect(page.locator('#draft')).toBeHidden();

  const evidence = writeRuntimeEvidence();
  expect(evidence.delivery_incident).toBe('#152');
  expect(evidence.runtime_evidence).toBe(true);
});
