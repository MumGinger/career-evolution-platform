const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBetaUiServer } = require('../../src/beta-ui');

let app;
let baseURL;
let root;

const RESUME = `Taylor Chen
taylor.chen@example.com | +1 416 555 0199

Skills
Python, SQL, Power BI, Tableau

Experience
Senior Analyst — Northstar Insurance
- Built recurring executive reporting for claims leaders.

Projects
Claims Intelligence Dashboard
- Built Power BI dashboards and automation workflows using Python and SQL.

Education
B.Sc. Statistics — Example University

Certifications
Microsoft Power BI Data Analyst`;

const JOB = `Company: Example Insurance
Role Title: Data Analytics Analyst

Required Qualifications:
Power BI required.
Python required.
Automation required.`;

test.beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'applicant-browser-e2e-'));
  app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  baseURL = `http://${address.address}:${address.port}`;
});

test.afterAll(async () => {
  await app.close();
  fs.rmSync(root, { recursive: true, force: true });
});

test('real browser makes Evidence Review decisions understandable and keeps progression discoverable', async ({ page, request }) => {
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: 'Build and verify your tailored resume' })).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/1 of 5/);

  await page.locator('#p').selectOption('mock');
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.locator('#readiness')).toHaveText('Ready to create your tailored resume.');

  await page.locator('#f').setInputFiles({
    name: 'representative-browser-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(RESUME),
  });

  await page.getByRole('button', { name: 'Understand my resume' }).click();
  await expect(page.getByRole('alert')).toHaveText('Paste the job description before continuing.');
  await expect(page.locator('#input')).toBeVisible();

  await page.locator('#j').fill(JOB);
  await page.getByRole('button', { name: 'Understand my resume' }).click();
  await expect(page.locator('#understanding')).toBeVisible();
  await expect(page.locator('#evidence')).toBeVisible();
  await expect(page.locator('#counts .metric')).toHaveCount(4);

  await expect(page.locator('#accept-help')).toContainText('accurate about you');
  await expect(page.locator('#accept-help')).toContainText('not deciding whether this item is relevant to the job');
  await expect(page.locator('#accept-help')).toContainText('does not guarantee that it will appear in your resume');
  await expect(page.locator('#accept-help')).toContainText('Skipping does not delete text from your uploaded resume');
  await expect(page.locator('#evidence')).not.toContainText(/Candidate Knowledge Integration|003\.6/i);

  const evidenceCards = page.locator('#cards .evidence-card');
  const decisions = page.locator('select[data-c]');
  expect(await evidenceCards.count()).toBeGreaterThan(0);
  expect(await decisions.count()).toBe(await evidenceCards.count());
  for (let index = 0; index < await evidenceCards.count(); index += 1) {
    const card = evidenceCards.nth(index);
    await expect(card).toContainText('Your decision');
    await expect(card).toContainText('Is this accurate evidence about you');
    await expect(card.locator('select[data-c] option[value="accept"]')).toHaveText(/Accept — use as verified support/);
    await expect(card.locator('select[data-c] option[value="skip"]')).toHaveText(/Skip — do not use as support/);
    await expect(card).toContainText('Accept can support tailored wording but does not guarantee this item appears in the resume');
    await expect(card).toContainText('Skip keeps this item from supporting new or rewritten wording');
    await decisions.nth(index).selectOption('accept');
  }

  await page.getByRole('button', { name: 'Create readable resume draft' }).click();
  await expect(page.locator('#draft')).toBeVisible();
  await expect(page.locator('#understanding')).toBeHidden();
  await expect(page.locator('#evidence')).toBeHidden();
  await expect(page.locator('#preview .resume-paper')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('Taylor Chen');
  await expect(page.locator('#preview')).toContainText('Experience');
  await expect(page.locator('#preview')).toContainText('Education');
  await expect(page.locator('#validation')).toContainText(/Ready for your review|Ready for review/);
  await expect(page.locator('#state')).toHaveText(/3 of 5/);
  await expect(page.locator('#career')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Continue to Career Review' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue to Career Review' }).click();
  await expect(page.locator('#draft')).toBeHidden();
  await expect(page.locator('#career')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/4 of 5/);

  const reviewCards = page.locator('#reviews .review-card');
  expect(await reviewCards.count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#reviews')).toContainText('Where this came from');
  await expect(page.locator('#reviews')).not.toContainText(/statement_id|candidate_fact_id|resume_content_selection_ids/);
  await expect(page.locator('body')).not.toContainText(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  await expect(page.locator('body')).not.toContainText(/â€¢|â€“|ï‚·||�/);

  const checks = page.locator('input[data-reviewed]');
  expect(await checks.count()).toBe(await reviewCards.count());
  await expect(page.getByRole('button', { name: 'Approve and export complete resume' })).toBeDisabled();
  for (let index = 0; index < await checks.count(); index += 1) await checks.nth(index).check();
  await expect(page.getByRole('button', { name: 'Approve and export complete resume' })).toBeEnabled();
  await page.getByRole('button', { name: 'Approve and export complete resume' }).click();

  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/5 of 5/);
  const pdfHref = await page.getByRole('link', { name: 'Open submission-ready PDF' }).getAttribute('href');
  const reportHref = await page.getByRole('link', { name: 'Open readable Career Review report' }).getAttribute('href');
  expect(pdfHref).toBeTruthy();
  expect(reportHref).toBeTruthy();

  const pdf = await request.get(`${baseURL}${pdfHref}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 8).toString('latin1')).toMatch(/^%PDF-1\.4/);

  const report = await request.get(`${baseURL}${reportHref}`);
  expect(report.status()).toBe(200);
  const reportText = await report.text();
  expect(reportText).toContain('Career Review complete');
  expect(reportText).toContain('Where this came from');
  expect(reportText).not.toMatch(/statement_id|candidate_fact_id|[0-9a-f]{8}-[0-9a-f-]{27,}/i);

  for (const name of ['final-resume.md', 'final-resume.json']) {
    const response = await request.get(`${baseURL}/api/llm-first/sessions/${[...app.sessions.keys()][0]}/outputs/${name}`);
    expect(response.status()).toBe(200);
  }
});
