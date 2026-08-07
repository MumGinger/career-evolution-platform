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

test('real browser reviews concrete tailoring, regenerates after correction, and preserves Career Review authority', async ({ page, request }) => {
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: 'Build and verify your tailored resume' })).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/1 of 5/);
  await expect(page.locator('body')).toContainText('uploaded resume is treated as your source');

  await page.locator('#p').selectOption('mock');
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.locator('#readiness')).toHaveText('Ready to create your tailored resume.');

  await page.locator('#f').setInputFiles({
    name: 'representative-browser-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(RESUME),
  });

  await page.getByRole('button', { name: 'Understand and tailor my resume' }).click();
  await expect(page.getByRole('alert')).toHaveText('Paste the job description before continuing.');
  await expect(page.locator('#input')).toBeVisible();

  await page.locator('#j').fill(JOB);
  await page.getByRole('button', { name: 'Understand and tailor my resume' }).click();
  await expect(page.locator('#understanding')).toBeVisible();
  await expect(page.locator('#tailoring')).toBeVisible();
  await expect(page.locator('#counts .metric')).toHaveCount(4);
  await expect(page.locator('#understanding')).toContainText('Processing summary — no decision needed');
  await expect(page.locator('#understanding')).toContainText('not being re-verified');

  await expect(page.locator('#tailoring')).toContainText('Tailoring Review');
  await expect(page.locator('#tailoring')).toContainText('Original wording');
  await expect(page.locator('#tailoring')).toContainText('Proposed tailored wording');
  await expect(page.locator('#tailoring')).toContainText('Use tailored version');
  await expect(page.locator('#tailoring')).toContainText('Keep original wording');
  await expect(page.locator('#tailoring')).toContainText('Needs correction');
  await expect(page.locator('#tailoring')).not.toContainText(/Evidence Review|Accept —|Skip —|Candidate Knowledge|003\.6/i);

  let materialCards = page.locator('.tailoring-card').filter({ has: page.locator('input[data-tailoring-choice]') });
  expect(await materialCards.count()).toBeGreaterThan(0);
  const firstCard = materialCards.first();
  const firstName = await firstCard.locator('input[data-tailoring-choice]').first().getAttribute('name');
  await firstCard.locator('input[value="needs_correction"]').check();
  await expect(firstCard.locator('.correction-box')).toBeVisible();
  await firstCard.locator(`textarea[data-correction="${firstName}"]`).fill('The dashboard focused on FX exposure reporting; it did not cover portfolio risk.');
  for (let index = 1; index < await materialCards.count(); index += 1) {
    await materialCards.nth(index).locator('input[value="use_tailored"]').check();
  }
  await expect(page.getByRole('button', { name: 'Apply my wording choices' })).toBeEnabled();
  await page.getByRole('button', { name: 'Apply my wording choices' }).click();

  await expect(page.locator('#tailoring')).toBeVisible();
  await expect(page.locator('#draft')).toBeHidden();
  await expect(page.locator('#state')).toHaveText(/2 of 5.*Tailoring Review/);
  await expect(page.locator('#tailoring-status')).toContainText('Correction integrated and proposal regenerated');
  await expect(page.locator('#tailoring-status')).toContainText('Review the new before/after proposal again');
  await expect(page.locator('#tailoring')).toContainText('FX exposure reporting');
  await expect(page.locator('#tailoring')).not.toContainText(/Candidate Knowledge|003\.6/i);

  const session = [...app.sessions.values()][0];
  expect(session.reviewRun.review_actor).toBe('source_resume_attestation');
  expect(session.integration?.id).toBeTruthy();
  expect(session.correctionIntegrations?.length).toBe(1);
  expect(session.correctionIntegrations[0].acquisition?.id).toBeTruthy();
  expect(session.correctionIntegrations[0].integration?.applied_facts?.length).toBeGreaterThan(0);
  expect(session.store.getCommittedCandidateKnowledge(session.profileId).some((fact) => JSON.stringify(fact).includes('FX exposure reporting'))).toBe(true);

  materialCards = page.locator('.tailoring-card').filter({ has: page.locator('input[data-tailoring-choice]') });
  expect(await materialCards.count()).toBeGreaterThan(0);
  for (let index = 0; index < await materialCards.count(); index += 1) {
    await materialCards.nth(index).locator('input[value="use_tailored"]').check();
  }
  await expect(page.getByRole('button', { name: 'Apply my wording choices' })).toBeEnabled();
  await page.getByRole('button', { name: 'Apply my wording choices' }).click();

  await expect(page.locator('#draft')).toBeVisible();
  await expect(page.locator('#understanding')).toBeHidden();
  await expect(page.locator('#tailoring')).toBeHidden();
  await expect(page.locator('#preview .resume-paper')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('Taylor Chen');
  await expect(page.locator('#preview')).toContainText('Experience');
  await expect(page.locator('#preview')).toContainText('Education');
  await expect(page.locator('#preview .resume-skills')).toBeVisible();
  expect(await page.locator('#preview .resume-skills li').count()).toBeGreaterThanOrEqual(4);
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
  await expect(page.locator('#reviews')).toContainText('Why this section looks this way');
  await expect(page.locator('#reviews')).toContainText('Looks correct — approve this section');
  await expect(page.locator('#reviews')).toContainText('Needs changes — edit this section before export');
  await expect(page.locator('#reviews')).not.toContainText(/Candidate Knowledge|003\.6|statement_id|candidate_fact_id|resume_content_selection_ids/);
  await expect(page.locator('body')).not.toContainText(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  await expect(page.locator('body')).not.toContainText(/â€¢|â€“|ï‚·||�/);

  const actions = page.locator('input[data-review-action]');
  expect(await actions.count()).toBe((await reviewCards.count()) * 2);
  await expect(page.getByRole('button', { name: 'Finish review and export resume' })).toBeDisabled();

  await page.locator('input[data-review-action="0"][value="edit"]').check();
  await expect(page.locator('[data-review-editor="0"]')).toBeVisible();
  const firstEdit = page.locator('[data-review-editor="0"] [data-review-edit]').first();
  await expect(firstEdit).toBeVisible();
  await firstEdit.fill('Taylor Chen Updated');
  for (let index = 1; index < await reviewCards.count(); index += 1) {
    await page.locator(`input[data-review-action="${index}"][value="approve"]`).check();
  }
  await expect(page.getByRole('button', { name: 'Finish review and export resume' })).toBeEnabled();
  await page.getByRole('button', { name: 'Finish review and export resume' }).click();

  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/5 of 5/);
  const pdfHref = await page.getByRole('link', { name: 'Open submission-ready PDF' }).getAttribute('href');
  const reportHref = await page.getByRole('link', { name: 'Open readable Career Review report' }).getAttribute('href');
  expect(pdfHref).toBeTruthy();
  expect(reportHref).toBeTruthy();

  const pdf = await request.get(`${baseURL}${pdfHref}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  const pdfBody = await pdf.body();
  expect(pdfBody.subarray(0, 8).toString('latin1')).toMatch(/^%PDF-1\.4/);
  expect(pdfBody.toString('latin1')).toContain('Taylor Chen Updated');

  const report = await request.get(`${baseURL}${reportHref}`);
  expect(report.status()).toBe(200);
  const reportText = await report.text();
  expect(reportText).toContain('Career Review complete');
  expect(reportText).toContain('Taylor Chen Updated');
  expect(reportText).toContain('Where this came from');
  expect(reportText).toContain('What changed for this application');
  expect(reportText).toMatch(/uploaded resume remains unchanged/i);
  expect(reportText).not.toMatch(/Candidate Knowledge|003\.6|statement_id|candidate_fact_id|[0-9a-f]{8}-[0-9a-f-]{27,}/i);

  for (const name of ['final-resume.md', 'final-resume.json']) {
    const response = await request.get(`${baseURL}/api/llm-first/sessions/${session.id}/outputs/${name}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Taylor Chen Updated');
  }
});
