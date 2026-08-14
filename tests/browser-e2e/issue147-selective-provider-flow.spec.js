const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer } = require('../../src/beta-ui');

let app;
let baseURL;
let root;
let providerServer;
let providerBaseURL;

const SOURCE = `Casey Lee
casey.lee@example.com | +1 416 555 0100

Professional Summary
Data analyst building source-linked reporting workflows.

Skills
Python, SQL, Power BI, Tableau

Experience
Northstar Insurance - Data Analyst
Toronto, ON
May 2024 - Present
- Built weekly reporting with SQL and Power BI.

Projects
Analytics Dashboard
(Python, SQL, Power BI)
May 2025 - Present
- Built Power BI dashboards using Python and SQL.
- Automated weekly reporting workflows in Python.

Gift Recommendation App
(React, JavaScript)
August 2025 - Present
- Built a recommendation interface using React and JavaScript.

Education
Example University
BSc Statistics

Certifications
CFA Level I`;

const JOB = `Company: Example Insurance
Role Title: Data Analytics Analyst

Required Qualifications:
Power BI required.
Python required.
SQL required.
Automation required.`;

function exactContainer(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : text.length;
  if (start < 0 || end < 0) throw new Error(`Replay fixture could not locate ${startMarker} -> ${endMarker}`);
  return text.slice(start, end).trim();
}

function block({ id, type, title, exact, parentId = null, meaning = title }) {
  return {
    id,
    type,
    title,
    label: title,
    exact_source_text: exact,
    source_location: null,
    parent_id: parentId,
    normalized_meaning: meaning,
    confidence: 'high',
    state: 'confirmed',
    provenance: { source: 'resume_input', exact_source_text: exact },
    limitations: [],
  };
}

function replayUnderstanding(text) {
  const experienceContainer = exactContainer(text, 'Northstar Insurance - Data Analyst', 'Projects');
  const analyticsContainer = exactContainer(text, 'Analytics Dashboard', 'Gift Recommendation App');
  const giftContainer = exactContainer(text, 'Gift Recommendation App', 'Education');
  return {
    blocks: [
      block({ id: 'identity-1', type: 'identity', title: 'Casey Lee', exact: exactContainer(text, 'Casey Lee', 'Professional Summary'), meaning: 'Casey Lee' }),
      block({ id: 'summary-1', type: 'summary', title: 'Professional Summary', exact: 'Data analyst building source-linked reporting workflows.' }),
      block({ id: 'skill-1', type: 'skill', title: 'Skills', exact: 'Python, SQL, Power BI, Tableau', meaning: 'Python, SQL, Power BI, Tableau' }),
      block({ id: 'experience-1', type: 'experience', title: 'Northstar Insurance - Data Analyst', exact: experienceContainer, meaning: 'Northstar Insurance - Data Analyst' }),
      block({ id: 'experience-child-1', type: 'responsibility', title: 'Built weekly reporting with SQL and Power BI.', exact: 'Built weekly reporting with SQL and Power BI.', parentId: 'experience-1' }),
      block({ id: 'project-analytics', type: 'project', title: 'Analytics Dashboard', exact: analyticsContainer, meaning: 'Analytics Dashboard' }),
      block({ id: 'project-analytics-child-1', type: 'responsibility', title: 'Built Power BI dashboards using Python and SQL.', exact: 'Built Power BI dashboards using Python and SQL.', parentId: 'project-analytics' }),
      block({ id: 'project-analytics-child-2', type: 'responsibility', title: 'Automated weekly reporting workflows in Python.', exact: 'Automated weekly reporting workflows in Python.', parentId: 'project-analytics' }),
      block({ id: 'project-gift', type: 'project', title: 'Gift Recommendation App', exact: giftContainer, meaning: 'Gift Recommendation App' }),
      block({ id: 'project-gift-child-1', type: 'responsibility', title: 'Built a recommendation interface using React and JavaScript.', exact: 'Built a recommendation interface using React and JavaScript.', parentId: 'project-gift' }),
      block({ id: 'education-1', type: 'education', title: 'Example University', exact: exactContainer(text, 'Example University', 'Certifications'), meaning: 'Example University - BSc Statistics' }),
      block({ id: 'certification-1', type: 'certification', title: 'CFA Level I', exact: 'CFA Level I', meaning: 'CFA Level I' }),
    ],
  };
}

function replayDraft(payload) {
  const committed = (payload.committed_facts || []).filter((fact) => (fact.mapped_job_requirement_ids || []).length);
  if (committed.length < 2) throw new Error('Issue #147 replay requires at least two mapped source-backed facts.');
  const valid = committed[0];
  const invalid = committed[1];
  const sections = new Map();
  const push = (section, statement) => sections.set(section, [...(sections.get(section) || []), statement]);

  push(valid.recommended_section, {
    text: `Targeted ${valid.value}`,
    candidate_fact_ids: [valid.candidate_fact_id],
    job_requirement_ids: [valid.mapped_job_requirement_ids[0]],
  });

  // A real model can return structurally valid JSON while omitting provenance metadata.
  // This proposal must be discarded without poisoning the complete source-backed resume.
  push(invalid.recommended_section, {
    text: `Selective provider proposal for ${invalid.value}`,
    candidate_fact_ids: [invalid.candidate_fact_id],
    job_requirement_ids: [],
  });

  // All remaining mapped facts are intentionally omitted. The product must KEEP their
  // exact source statements in the original resume structure rather than fabricate work.
  return { sections: [...sections].map(([section, statements]) => ({ section, statements })) };
}

function responseEnvelope(content) {
  return JSON.stringify({ choices: [{ message: { content } }] });
}

function startProviderReplayServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => {
        try {
          const body = JSON.parse(raw || '{}');
          const schemaName = body.response_format?.json_schema?.name || 'connection_probe';
          let content = 'READY';
          if (schemaName === 'resume_understanding') {
            content = JSON.stringify(replayUnderstanding(body.messages?.at(-1)?.content || ''));
          } else if (schemaName === 'resume_draft') {
            const payload = JSON.parse(body.messages?.at(-1)?.content || '{}');
            content = JSON.stringify(replayDraft(payload));
          }
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(responseEnvelope(content));
        } catch (error) {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: String(error.message || error) }));
        }
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function occurrences(value, needle) {
  return String(value).split(needle).length - 1;
}

test.beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'issue147-selective-provider-'));
  providerServer = await startProviderReplayServer();
  const providerAddress = providerServer.address();
  providerBaseURL = `http://127.0.0.1:${providerAddress.port}/v1`;
  app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  baseURL = `http://${address.address}:${address.port}`;
});

test.afterAll(async () => {
  await app.close();
  await new Promise((resolve) => providerServer.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
});

test('selective imperfect provider still completes the natural PDF shipped flow using source-backed KEEP', async ({ page, request }) => {
  const pdfPath = path.join(root, 'source-resume.pdf');
  await page.setContent(`<html><body><pre style="font: 10px monospace; white-space: pre-wrap">${escapeHtml(SOURCE)}</pre></body></html>`);
  await page.pdf({ path: pdfPath, format: 'Letter', printBackground: true });

  await page.goto(baseURL);
  await page.locator('#p').selectOption('openai-compatible');
  await page.locator('#m').fill('selective-provider-replay');
  await page.locator('#k').fill('test-only-key');
  await page.locator('#b').fill(providerBaseURL);
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.locator('#readiness')).toHaveText('Ready to create your tailored resume.');
  await page.locator('#f').setInputFiles(pdfPath);
  await page.locator('#j').fill(JOB);
  await page.getByRole('button', { name: 'Understand and tailor my resume' }).click();

  await expect(page.locator('#tailoring')).toBeVisible();
  await expect(page.locator('#draft')).toBeHidden();
  await expect(page.locator('#state')).toHaveText(/2 of 5.*Tailoring Review/);

  const session = [...app.sessions.values()][0];
  expect(session.stage).toBe('tailoring-review');
  expect(session.draftValidation.validation_status).not.toBe('failed');
  expect((session.draftValidation.validation_findings || []).filter((finding) => ['critical', 'error'].includes(finding.severity))).toEqual([]);

  const metadata = session.artifact.resume_artifacts.find((item) => item.artifact_type === 'structured_resume').metadata;
  expect(metadata.draft_completion_source_keeps.length).toBeGreaterThan(0);
  expect(metadata.dropped_provider_alternatives.some((item) => item.reason === 'invalid_provider_requirement_citations')).toBe(true);
  expect(metadata.draft_completion_fallbacks.length).toBe(0);

  await page.getByRole('button', { name: 'Continue with these changes' }).click();
  await expect(page.locator('#draft')).toBeVisible();
  await expect(page.locator('#validation')).toContainText(/Ready for your review|Ready for review/);
  const preview = await page.locator('#preview').innerText();
  expect(occurrences(preview, 'Analytics Dashboard')).toBe(1);
  expect(occurrences(preview, 'Built Power BI dashboards using Python and SQL.')).toBe(1);
  expect(occurrences(preview, 'Automated weekly reporting workflows in Python.')).toBe(1);
  expect(occurrences(preview, 'Gift Recommendation App')).toBe(1);

  await page.getByRole('button', { name: 'Continue to Career Review' }).click();
  await expect(page.locator('#career')).toBeVisible();
  const cards = page.locator('#reviews .review-card');
  expect(await cards.count()).toBeGreaterThan(0);
  for (let index = 0; index < await cards.count(); index += 1) {
    await page.locator(`input[data-review-action="${index}"][value="approve"]`).check();
  }
  await page.getByRole('button', { name: 'Finish review and export resume' }).click();
  await expect(page.locator('#output')).toBeVisible();

  const pdfHref = await page.getByRole('link', { name: 'Open submission-ready PDF' }).getAttribute('href');
  expect(pdfHref).toBeTruthy();
  const outputPdf = await request.get(`${baseURL}${pdfHref}`);
  expect(outputPdf.status()).toBe(200);
  expect(outputPdf.headers()['content-type']).toContain('application/pdf');
  const finalPdf = await outputPdf.body();
  expect(finalPdf.subarray(0, 8).toString('latin1')).toMatch(/^%PDF-1\.4/);
  expect(session.stage).toBe('complete');
});
