const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createBetaUiServer } = require('../../src/beta-ui');

let app;
let baseURL;
let root;
let providerServer;
let providerBaseURL;
let observedProviderCalls = [];

const CANDIDATE_ID = 'issue134-pre-beta-complex-golden-v1';
const TEST_ID = 'issue134-pre-beta-complex-golden';

const SOURCE = `Casey Lee
casey.lee@example.com | +1 416 555 0100 | Toronto, ON

Professional Summary
Analytical student with broad interests across technology, markets, software, and data projects.

Skills
Programming & Data
Python, Java, C++, JavaScript, SQL, VBA
Data Visualization & BI
Power BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling
Statistical & Machine Learning
Linear & Logistic Regression, GLMs, PCA, Time Series Modeling, Model Evaluation & Diagnostics
Finance & Markets
Equity Research, Market Pattern Research, Financial Modeling
Tools & Workflow
Git, APIs, n8n, LLM APIs, Workflow Automation, Document Generation
Languages
Mandarin (Native), English (Fluent), Japanese (Basic)

Experience
Northstar Analytics - Data Assistant
Toronto, ON
May 2024 - Present
- Maintained data quality checks for recurring reporting datasets.
- Prepared recurring internal reports for the analytics team.

Projects
Market Pattern Research Platform
(React, Node.js, Market APIs)
January 2026 - Present
- Built a market-pattern research interface for manually tagging price and volume behavior.
- Added historical market-data caching for repeated research sessions.

Consumer Recommendation Interface
(React, JavaScript)
August 2025 - Present
- Built a recommendation interface with adaptive questions and reusable UI components.
- Added multilingual interface support and persistent user state.

Workflow Automation System
(n8n, JavaScript, LLM APIs)
May 2025 - Present
- Built workflow automation to extract structured information and generate formatted documents.
- Integrated LLM APIs and reusable orchestration steps for repeatable processing.

Global Compensation Analytics Dashboard
(D3.js, Power BI, CSV)
February 2025 - Present
- Built dashboard development workflows for interactive compensation analysis.
- Used data visualization and data storytelling to compare distributions and trends.

Data Analysis and Model Building
(Python, Statistics)
September 2024 - Present
- Performed data analysis with regression models on real-world datasets.
- Evaluated model diagnostics and data quality before interpreting results.

Graph Ranking Research
(Java, Linear Algebra)
May 2023 - May 2024
- Built a graph-ranking research prototype and compared ranking behavior across test datasets.
- Documented the research approach and findings with a student team.

Education
Metro University, Toronto, ON
September 2023 - June 2027
BSc - Statistics and Computer Science
Minor - Economics

Western Institute, London, ON
September 2022 - August 2023
Graduate Certificate - Data Analytics
Honors - Dean's List

Certifications
Data Analytics Professional Certificate`;

const JOB = `Company: Example Insurance
Role Title: Data Analytics & AI Intern

Responsibilities:
Develop dashboards and support dashboard development for business reporting.
Use data visualization and storytelling to communicate business insights.
Support automation and process improvement for recurring workflows.
Apply AI or machine learning techniques where appropriate.
Maintain strong data quality in analytical work.

Required Qualifications:
Python required.
SQL required.
Power BI required.
Data analysis required.
Data visualization required.
Automation required.
AI or machine learning coursework or projects required.
Data quality required.`;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function evidencePath() {
  return process.env.CEP_RUNTIME_EVIDENCE_PATH
    || path.join(process.cwd(), 'test-results', 'runtime-evidence', `${TEST_ID}.json`);
}

function qualityPdfPath() {
  return process.env.CEP_QUALITY_PDF_PATH
    || path.join(process.cwd(), 'test-results', 'runtime-evidence', `${TEST_ID}.pdf`);
}

function writeRuntimeEvidence({ sourcePdf, session, finalPdf }) {
  const target = evidencePath();
  const pdfTarget = qualityPdfPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.mkdirSync(path.dirname(pdfTarget), { recursive: true });
  fs.writeFileSync(pdfTarget, finalPdf);
  const evidence = {
    candidate_id: CANDIDATE_ID,
    source_resume_sha256: sha256(sourcePdf),
    job_description_sha256: sha256(Buffer.from(JOB)),
    final_pdf_sha256: sha256(finalPdf),
    artifact_run_id: session.artifact.id,
    quality_artifact: {
      final_pdf_path: pdfTarget,
      expected_max_pages: 2,
      target_project_count: 3,
    },
    shipped_flow: {
      status: 'PASS',
      natural_pipeline: true,
      post_validation_state_mutation: false,
      provider: 'openai-compatible/pre-beta-complex-replay',
      test_id: TEST_ID,
      run_id: process.env.GITHUB_RUN_ID || 'local-playwright-run',
      completed_stages: ['Resume Input', 'Tailoring Review', 'Draft', 'Career Review', 'Export'],
    },
  };
  fs.writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

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

function projectBlocks(text, id, title, nextMarker, bullets) {
  const exact = exactContainer(text, title, nextMarker);
  return [
    block({ id, type: 'project', title, exact, meaning: title }),
    ...bullets.map((bullet, index) => block({
      id: `${id}:child:${index + 1}`,
      type: 'responsibility',
      title: bullet,
      exact: bullet,
      parentId: id,
      meaning: bullet,
    })),
  ];
}

function replayUnderstanding(text) {
  const skillGroups = [
    ['skill-programming', 'Programming & Data\nPython, Java, C++, JavaScript, SQL, VBA'],
    ['skill-visualization', 'Data Visualization & BI\nPower BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling'],
    ['skill-statistics', 'Statistical & Machine Learning\nLinear & Logistic Regression, GLMs, PCA, Time Series Modeling, Model Evaluation & Diagnostics'],
    ['skill-finance', 'Finance & Markets\nEquity Research, Market Pattern Research, Financial Modeling'],
    ['skill-workflow', 'Tools & Workflow\nGit, APIs, n8n, LLM APIs, Workflow Automation, Document Generation'],
    ['skill-languages', 'Languages\nMandarin (Native), English (Fluent), Japanese (Basic)'],
  ];
  const blocks = [
    block({ id: 'identity-1', type: 'identity', title: 'Casey Lee', exact: exactContainer(text, 'Casey Lee', 'Professional Summary'), meaning: 'Casey Lee' }),
    block({ id: 'summary-1', type: 'summary', title: 'Professional Summary', exact: 'Analytical student with broad interests across technology, markets, software, and data projects.' }),
    ...skillGroups.map(([id, exact]) => block({ id, type: 'skill', title: exact.split('\n')[0], exact, meaning: exact })),
    block({ id: 'experience-1', type: 'experience', title: 'Northstar Analytics - Data Assistant', exact: exactContainer(text, 'Northstar Analytics - Data Assistant', 'Projects'), meaning: 'Northstar Analytics - Data Assistant' }),
    block({ id: 'experience-1:child:1', type: 'responsibility', title: 'Maintained data quality checks for recurring reporting datasets.', exact: 'Maintained data quality checks for recurring reporting datasets.', parentId: 'experience-1' }),
    block({ id: 'experience-1:child:2', type: 'responsibility', title: 'Prepared recurring internal reports for the analytics team.', exact: 'Prepared recurring internal reports for the analytics team.', parentId: 'experience-1' }),
    ...projectBlocks(text, 'project-market', 'Market Pattern Research Platform', 'Consumer Recommendation Interface', [
      'Built a market-pattern research interface for manually tagging price and volume behavior.',
      'Added historical market-data caching for repeated research sessions.',
    ]),
    ...projectBlocks(text, 'project-recommendation', 'Consumer Recommendation Interface', 'Workflow Automation System', [
      'Built a recommendation interface with adaptive questions and reusable UI components.',
      'Added multilingual interface support and persistent user state.',
    ]),
    ...projectBlocks(text, 'project-workflow', 'Workflow Automation System', 'Global Compensation Analytics Dashboard', [
      'Built workflow automation to extract structured information and generate formatted documents.',
      'Integrated LLM APIs and reusable orchestration steps for repeatable processing.',
    ]),
    ...projectBlocks(text, 'project-dashboard', 'Global Compensation Analytics Dashboard', 'Data Analysis and Model Building', [
      'Built dashboard development workflows for interactive compensation analysis.',
      'Used data visualization and data storytelling to compare distributions and trends.',
    ]),
    ...projectBlocks(text, 'project-analysis', 'Data Analysis and Model Building', 'Graph Ranking Research', [
      'Performed data analysis with regression models on real-world datasets.',
      'Evaluated model diagnostics and data quality before interpreting results.',
    ]),
    ...projectBlocks(text, 'project-ranking', 'Graph Ranking Research', 'Education', [
      'Built a graph-ranking research prototype and compared ranking behavior across test datasets.',
      'Documented the research approach and findings with a student team.',
    ]),
    block({ id: 'education-1', type: 'education', title: 'Metro University', exact: exactContainer(text, 'Metro University, Toronto, ON', 'Western Institute, London, ON'), meaning: 'Metro University - BSc Statistics and Computer Science' }),
    block({ id: 'education-2', type: 'education', title: 'Western Institute', exact: exactContainer(text, 'Western Institute, London, ON', 'Certifications'), meaning: 'Western Institute - Graduate Certificate Data Analytics' }),
    block({ id: 'certification-1', type: 'certification', title: 'Data Analytics Professional Certificate', exact: 'Data Analytics Professional Certificate', meaning: 'Data Analytics Professional Certificate' }),
  ];
  return { blocks };
}

function replayDraft(payload) {
  const committed = payload.committed_facts || [];
  const sections = new Map();
  for (const fact of committed) {
    if (!(fact.mapped_job_requirement_ids || []).length) continue;
    if (!sections.has(fact.recommended_section)) sections.set(fact.recommended_section, []);
    sections.get(fact.recommended_section).push({
      text: fact.value,
      candidate_fact_ids: [fact.candidate_fact_id],
      job_requirement_ids: fact.mapped_job_requirement_ids.slice(0, 1),
    });
  }

  // Synthesize one target-specific Professional Summary statement from the strongest
  // included, cross-section-eligible evidence, mirroring what a real provider does per
  // the resume-draft system prompt ("Summary should synthesize the strongest
  // target-relevant evidence rather than repeat a bullet verbatim").
  const eligible = committed.filter((fact) =>
    (fact.mapped_job_requirement_ids || []).length
    && (fact.permitted_claim_scope || []).includes('cross_section_summary'));
  const byValue = (needle) => eligible.find((fact) => fact.value.includes(needle));
  const summaryEvidence = [
    byValue('Workflow Automation System'),
    byValue('Data Analysis and Model Building'),
    byValue('Maintained data quality checks'),
    byValue('Built workflow automation to extract structured information'),
    byValue('Performed data analysis with regression models'),
  ].filter(Boolean);
  if (summaryEvidence.length) {
    sections.set('Professional Summary', [{
      text: 'Data analyst with hands-on project experience in workflow automation, data quality, and analytics reporting, including building the Workflow Automation System and performing data analysis and model evaluation on real-world datasets.',
      candidate_fact_ids: summaryEvidence.map((fact) => fact.candidate_fact_id),
      job_requirement_ids: [...new Set(summaryEvidence.flatMap((fact) => fact.mapped_job_requirement_ids.slice(0, 1)))],
    }]);
  }

  return {
    sections: [...sections.entries()].map(([section, statements]) => ({ section, statements })),
  };
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
          observedProviderCalls.push(schemaName);
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

function occurrences(value, needle) {
  return String(value).split(needle).length - 1;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

test.beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'issue134-complex-golden-'));
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

test('complex master-resume shape naturally converges to a targeted <=2-page application artifact', async ({ page, request }) => {
  observedProviderCalls = [];
  const sourcePdfPath = path.join(root, 'complex-master-resume.pdf');
  await page.setContent(`<html><body><pre style="font: 9px monospace; white-space: pre-wrap">${escapeHtml(SOURCE)}</pre></body></html>`);
  await page.pdf({ path: sourcePdfPath, format: 'Letter', printBackground: true });
  const sourcePdf = fs.readFileSync(sourcePdfPath);

  await page.goto(baseURL);
  await page.locator('#p').selectOption('openai-compatible');
  await page.locator('#m').fill('pre-beta-complex-replay');
  await page.locator('#k').fill('provider-replay-key');
  await page.locator('#b').fill(providerBaseURL);
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.locator('#readiness')).toHaveText('Ready to create your tailored resume.');
  await page.locator('#f').setInputFiles(sourcePdfPath);
  await page.locator('#j').fill(JOB);
  await page.getByRole('button', { name: 'Understand and tailor my resume' }).click();

  await expect(page.locator('#tailoring')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/2 of 5.*Tailoring Review/);
  await expect(page.locator('#validation')).not.toContainText('Draft blocked');
  expect(observedProviderCalls).toContain('resume_understanding');
  expect(observedProviderCalls).toContain('resume_draft');

  const session = [...app.sessions.values()][0];
  expect(session).toBeTruthy();
  expect(session.draftValidation.validation_status).not.toBe('failed');
  expect((session.draftValidation.validation_findings || []).filter((finding) => ['critical', 'error'].includes(finding.severity))).toEqual([]);

  const committedSkills = (session.integration?.applied_facts || []).filter((fact) => fact.entity_type === 'skill');
  expect(committedSkills.every((fact) => !/[\n,;]/.test(fact.value?.name || fact.canonical_value?.name || ''))).toBe(true);

  const materialCards = page.locator('.tailoring-card').filter({ has: page.locator('input[data-tailoring-choice]') });
  for (let index = 0; index < await materialCards.count(); index += 1) {
    await materialCards.nth(index).locator('input[value="use_tailored"]').check();
  }
  await page.getByRole('button', { name: 'Apply my wording choices' }).click();

  await expect(page.locator('#draft')).toBeVisible();
  await expect(page.locator('#state')).toHaveText(/3 of 5.*Draft and validation/);
  const preview = await page.locator('#preview').innerText();

  expect(preview).toContain('PROFESSIONAL SUMMARY');
  expect(preview).toContain('SKILLS');
  expect(preview.indexOf('PROFESSIONAL SUMMARY')).toBeLessThan(preview.indexOf('SKILLS'));
  expect(preview).toContain('Python');
  expect(preview).toContain('SQL');
  expect(preview).toContain('Power BI');
  expect(preview).toContain('Workflow Automation');
  expect(preview).not.toContain('Java, C++');
  expect(preview).not.toContain('Equity Research, Market Pattern Research, Financial Modeling');
  expect(preview).not.toContain('Japanese (Basic)');

  expect(occurrences(preview, 'Workflow Automation System')).toBe(1);
  expect(occurrences(preview, 'Global Compensation Analytics Dashboard')).toBe(1);
  expect(occurrences(preview, 'Data Analysis and Model Building')).toBe(1);
  expect(preview).not.toContain('Market Pattern Research Platform');
  expect(preview).not.toContain('Consumer Recommendation Interface');
  expect(preview).not.toContain('Graph Ranking Research');

  expect(occurrences(preview, 'Built workflow automation to extract structured information and generate formatted documents.')).toBe(1);
  expect(occurrences(preview, 'Built dashboard development workflows for interactive compensation analysis.')).toBe(1);
  expect(occurrences(preview, 'Performed data analysis with regression models on real-world datasets.')).toBe(1);
  expect(preview).toContain('Metro University, Toronto, ON');
  expect(preview).toContain('Western Institute, London, ON');
  expect(preview).toContain('Data Analytics Professional Certificate');

  const visibleBullets = await page.locator('#preview li').allTextContents();
  expect(visibleBullets.every((text) => text.trim().length > 0)).toBe(true);

  await page.getByRole('button', { name: 'Continue to Career Review' }).click();
  await expect(page.locator('#career')).toBeVisible();
  const cards = page.locator('#reviews .review-card');
  for (let index = 0; index < await cards.count(); index += 1) {
    await page.locator(`input[data-review-action="${index}"][value="approve"]`).check();
  }
  await page.getByRole('button', { name: 'Finish review and export resume' }).click();
  await expect(page.locator('#state')).toHaveText(/5 of 5/);

  const markdownResponse = await request.get(`${baseURL}/api/llm-first/sessions/${session.id}/outputs/final-resume.md`);
  expect(markdownResponse.status()).toBe(200);
  const markdown = await markdownResponse.text();
  expect(occurrences(markdown, 'Workflow Automation System')).toBe(1);
  expect(occurrences(markdown, 'Global Compensation Analytics Dashboard')).toBe(1);
  expect(occurrences(markdown, 'Data Analysis and Model Building')).toBe(1);
  expect(markdown).not.toMatch(/^\s*[•\uf0b7-]\s*$/m);

  const pdfHref = await page.getByRole('link', { name: 'Open submission-ready PDF' }).getAttribute('href');
  const outputPdf = await request.get(`${baseURL}${pdfHref}`);
  expect(outputPdf.status()).toBe(200);
  const finalPdf = await outputPdf.body();
  expect(finalPdf.subarray(0, 8).toString('latin1')).toMatch(/^%PDF-1\.4/);

  const tempPdf = path.join(root, 'final-resume.pdf');
  fs.writeFileSync(tempPdf, finalPdf);
  const info = execFileSync('pdfinfo', [tempPdf], { encoding: 'utf8' });
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
  expect(Number.isInteger(pages)).toBe(true);
  expect(pages).toBeLessThanOrEqual(2);
  const pdfText = execFileSync('pdftotext', ['-enc', 'UTF-8', tempPdf, '-'], { encoding: 'utf8' });
  expect(pdfText).toContain('Workflow Automation System');
  expect(pdfText).toContain('Global Compensation Analytics Dashboard');
  expect(pdfText).toContain('Data Analysis and Model Building');
  expect(pdfText).not.toContain('Consumer Recommendation Interface');
  expect(pdfText).not.toContain('Graph Ranking Research');
  expect(pdfText).not.toContain('Java, C++');

  const evidence = writeRuntimeEvidence({ sourcePdf, session, finalPdf });
  expect(evidence.candidate_id).toBe(CANDIDATE_ID);
  expect(evidence.quality_artifact.expected_max_pages).toBe(2);
});
