const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const option2 = require('../../src/option2-tailoring-review');
const { createBetaUiServer } = require('../../src/beta-ui');

let app;
let baseURL;
let root;
let originalPrepare;

const RESUME = `Taylor Chen
taylor.chen@example.com | +1 416 555 0199

Skills
Python, SQL, Power BI

Projects
Analytics Dashboard
- Built Power BI reporting views and used Python and SQL to prepare business metrics.

Education
B.Sc. Statistics — Example University`;

const JOB = `Company: Example Employer
Role Title: Data Analytics Intern

Required Qualifications:
Python required.
SQL required.
Power BI required.`;

function forceObservedNoChangeBlockedState(session, prepared) {
  const originalItems = prepared.tailoringReview || [];
  const sourceEquivalentItems = originalItems.map((item) => ({
    ...item,
    tailoredText: item.originalText,
    materialRewrite: false,
  }));
  const byStatementId = new Map(sourceEquivalentItems.map((item) => [item.id, item]));

  session.generatedReview = (session.generatedReview || []).map((section) => ({
    ...section,
    ai_version: {
      ...section.ai_version,
      statements: (section.ai_version?.statements || []).map((statement) => {
        const item = byStatementId.get(statement.statement_id);
        if (!item) return statement;
        return {
          ...statement,
          text: item.originalText,
          content_origin: 'source_resume_passthrough',
          resume_content_selection_ids: [],
          provenance: {
            source_kind: 'validated_resume_understanding',
            exact_source_text: item.originalText,
            evidence_candidate_id: item.evidenceCandidateId,
          },
        };
      }),
    },
  }));
  session.tailoringReview = sourceEquivalentItems;
  session.stage = 'draft-blocked';

  const blocked = {
    ...prepared,
    stage: 'Draft blocked',
    blocked: true,
    tailoringReview: sourceEquivalentItems,
    draftValidation: session.draftValidation.validation_status,
    draftValidationFindings: session.draftValidation.validation_findings,
    message: 'Tailoring Review is blocked because required included evidence did not render in its planned Experience or Projects section.',
  };
  session.option2PreparedResult = blocked;
  return blocked;
}

test.beforeAll(async () => {
  originalPrepare = option2.prepare;
  option2.prepare = async (session) => {
    const prepared = await originalPrepare(session);
    const requiredCore = (session.tailoring?.resume_content_selections || []).filter((selection) =>
      selection.selection_state === 'include'
        && ['Experience', 'Projects'].includes(selection.recommended_section));
    if (!requiredCore.length) throw new Error('Zero-change regression requires at least one included Experience/Project selection.');
    if (!['passed', 'passed_with_warnings'].includes(session.draftValidation?.validation_status)) {
      throw new Error('Zero-change regression requires deterministic draft validation to pass before reproducing the dead-end state.');
    }
    return forceObservedNoChangeBlockedState(session, prepared);
  };

  root = fs.mkdtempSync(path.join(os.tmpdir(), 'issue147-zero-change-browser-'));
  app = createBetaUiServer({ port: 0, tempRoot: root });
  const address = await app.listen();
  baseURL = `http://${address.address}:${address.port}`;
});

test.afterAll(async () => {
  option2.prepare = originalPrepare;
  await app.close();
  fs.rmSync(root, { recursive: true, force: true });
});

test('deterministic-valid complete zero-change resume completes shipped flow through export', async ({ page, request }) => {
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
  const requiredCore = session.tailoring.resume_content_selections.filter((selection) =>
    selection.selection_state === 'include'
      && ['Experience', 'Projects'].includes(selection.recommended_section));
  expect(session.queue.flatMap((group) => group.candidates).length).toBeGreaterThan(0);
  expect(requiredCore.length).toBeGreaterThan(0);
  expect(session.stage).toBe('tailoring-review');
  expect(session.draftValidation.validation_status).toMatch(/^passed/);
  expect((session.tailoringReview || []).filter((item) => item.materialRewrite)).toHaveLength(0);
  expect(session.option2PreparedResult.recovery.reason).toBe('deterministic_valid_complete_resume_with_no_material_wording_changes');

  await expect(page.getByRole('button', { name: 'Continue with these changes' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue with these changes' }).click();

  await expect(page.locator('#draft')).toBeVisible();
  await expect(page.locator('#preview')).toContainText('Taylor Chen');
  await expect(page.locator('#preview')).toContainText('Analytics Dashboard');
  await expect(page.locator('#preview')).toContainText('Built Power BI reporting views');
  await expect(page.locator('#validation')).toContainText(/Ready for your review|Ready for review/);
  await expect(page.getByRole('button', { name: 'Continue to Career Review' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue to Career Review' }).click();
  await expect(page.locator('#draft')).toBeHidden();
  await expect(page.locator('#career')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/4 of 5/);

  const reviewCards = page.locator('#reviews .review-card');
  expect(await reviewCards.count()).toBeGreaterThan(0);
  for (let index = 0; index < await reviewCards.count(); index += 1) {
    await page.locator(`input[data-review-action="${index}"][value="approve"]`).check();
  }
  await expect(page.getByRole('button', { name: 'Finish review and export resume' })).toBeEnabled();
  await page.getByRole('button', { name: 'Finish review and export resume' }).click();

  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/5 of 5/);
  const pdfHref = await page.getByRole('link', { name: 'Open submission-ready PDF' }).getAttribute('href');
  expect(pdfHref).toBeTruthy();
  const pdf = await request.get(`${baseURL}${pdfHref}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  const pdfBody = await pdf.body();
  expect(pdfBody.subarray(0, 8).toString('latin1')).toMatch(/^%PDF-1\.4/);
  expect(pdfBody.toString('latin1')).toContain('Taylor Chen');
  expect(session.stage).toBe('complete');
});
