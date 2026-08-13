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
Python, SQL, Power BI

Projects
Analytics Dashboard
- Built reporting views for business metrics.

Education
B.Sc. Statistics — Example University`;

const JOB = `Company: Example Employer
Role Title: Data Analytics Intern

Required Qualifications:
Python required.
SQL required.
Power BI required.`;

test.beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'issue140-browser-'));
  app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  baseURL = `http://${address.address}:${address.port}`;
});

test.afterAll(async () => {
  await app.close();
  fs.rmSync(root, { recursive: true, force: true });
});

test('valid reviewable source evidence with zero material wording changes never dead-ends at Draft blocked', async ({ page }) => {
  await page.goto(baseURL);
  await page.locator('#p').selectOption('mock');
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.locator('#readiness')).toHaveText('Ready to create your tailored resume.');

  await page.locator('#f').setInputFiles({
    name: 'no-change-resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(RESUME),
  });
  await page.locator('#j').fill(JOB);
  await page.getByRole('button', { name: 'Understand and tailor my resume' }).click();

  await expect(page.locator('#understanding')).toBeVisible();
  await expect(page.locator('#tailoring')).toBeVisible();
  await expect(page.locator('#draft')).toBeHidden();
  await expect(page.locator('#state')).toHaveText(/2 of 5.*Tailoring Review/);
  await expect(page.locator('#counts')).toContainText('Concrete changes');
  await expect(page.locator('#counts')).toContainText('0');
  await expect(page.locator('#tailoring-cards')).toContainText('No material wording changes need your decision');
  await expect(page.locator('#validation')).not.toContainText('Draft blocked');

  const session = [...app.sessions.values()][0];
  expect(session.queue.flatMap((group) => group.candidates).length).toBeGreaterThan(0);
  expect(session.stage).toBe('tailoring-review');
  expect(session.draftValidation.validation_status).toMatch(/^passed/);
  expect((session.tailoringReview || []).filter((item) => item.materialRewrite)).toHaveLength(0);

  await expect(page.getByRole('button', { name: 'Apply my wording choices' })).toBeEnabled();
  await page.getByRole('button', { name: 'Apply my wording choices' }).click();

  await expect(page.locator('#draft')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('Taylor Chen');
  await expect(page.locator('#preview')).toContainText('Analytics Dashboard');
  await expect(page.locator('#validation')).toContainText(/Ready for your review|Ready for review/);
  await expect(page.getByRole('button', { name: 'Continue to Career Review' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue to Career Review' }).click();
  await expect(page.locator('#career')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/4 of 5/);
});
