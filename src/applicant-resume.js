const fs = require('node:fs');
const path = require('node:path');
const humanReview = require('./human-review');

const REVIEWED_RESUME_VERSION = 'reviewed-resume-document/1.0.0';
const MOJIBAKE = new Map([
  ['â€¢', '•'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['ï‚·', '•'],
  ['', '•'],
  ['Â', ''],
]);

const PRESENTATION_SECTION_ORDER = [
  'Applicant Header',
  'Professional Summary',
  'Skills',
  'Experience',
  'Projects',
  'Education',
  'Certifications',
];

function normalizeVisibleText(value) {
  let text = String(value ?? '').replace(/\r\n?/g, '\n');
  for (const [broken, fixed] of MOJIBAKE) text = text.split(broken).join(fixed);
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\uF0B7\u25AA\u25E6]/g, '•')
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/[\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu, '')
    .replace(/\uFFFD/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeKey(value) {
  return normalizeVisibleText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function escapeHtml(value) {
  return normalizeVisibleText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function finalVersion(review) {
  return humanReview.finalSection(review);
}

function sectionStatements(sectionOrReview) {
  const version = sectionOrReview.ai_version
    ? finalVersion(sectionOrReview)
    : sectionOrReview;
  if (version?.placeholder) return [{ text: version.placeholder, display_style: 'line' }];
  return (version?.statements || []).map((statement) => ({
    ...statement,
    text: normalizeVisibleText(statement.text),
    display_style: statement.display_style || 'bullet',
  }));
}

function sectionOriginExplanation(review) {
  const statements = sectionStatements(review);
  const origins = new Set(statements.map((statement) => statement.content_origin).filter(Boolean));
  if (origins.size === 1 && origins.has('source_resume_passthrough')) {
    return 'Preserved from your uploaded resume. Evidence accepted elsewhere did not silently change this source text.';
  }
  if (origins.has('source_resume_passthrough') && origins.has('candidate_knowledge_generated')) {
    return 'Combines text from your uploaded resume with new wording supported by evidence you reviewed. New wording remains linked to that reviewed evidence and validation checks.';
  }
  return 'Created from evidence you reviewed. The wording remains linked to that reviewed evidence and validation checks.';
}

function evidenceAcceptExplanation() {
  return 'The text below already comes from your uploaded resume. This step does not decide what stays in your final resume. You are deciding whether we may treat this specific item as confirmed support for new or rewritten wording for this application. Accept allows this evidence to support new wording after later checks, but it does not guarantee that the evidence or wording will appear in the final resume. Skip means do not reuse this evidence for new wording; it does not remove the original source text. “Why this was surfaced” explains job relevance separately.';
}

function humanizeCategory(category) {
  const known = {
    requirement_coverage: 'Job requirement coverage',
    coverage_gap: 'Job requirement coverage',
    duplicate_content: 'Repeated wording',
    duplication: 'Repeated wording',
    source_resume_completeness: 'Source resume completeness',
    whole_resume_completeness: 'Source resume completeness',
    claim_scope: 'Claim support',
    provenance: 'Source support',
  };
  return known[category] || String(category || 'Resume check')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stripTechnicalDetails(message) {
  return normalizeVisibleText(message)
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, 'the affected item')
    .replace(/\b(?:resume_|candidate_|artifact_|validation_|selection_)[a-z0-9_]+\b/gi, 'resume information')
    .replace(/\s+/g, ' ')
    .trim();
}

function validationSummary(status, findings = []) {
  const warnings = (findings || [])
    .filter((finding) => !['info', 'passed'].includes(String(finding.severity || '').toLowerCase()))
    .map((finding) => ({
      title: humanizeCategory(finding.category),
      message: stripTechnicalDetails(finding.message || finding.description || 'Review this item before applying.'),
      action: stripTechnicalDetails(finding.recommendation || finding.action || 'Review the related resume section and confirm that it is accurate.'),
    }));

  if (status === 'passed') {
    return {
      tone: 'success',
      title: 'Ready for your review',
      message: 'The resume passed the deterministic checks. You still make the final approval or correction decision.',
      warnings: [],
    };
  }
  if (status === 'passed_with_warnings') {
    return {
      tone: 'warning',
      title: 'Ready for review — check these items',
      message: 'The resume can be reviewed and exported, but these items may affect how strong or clear it is for this application.',
      warnings: warnings.length ? warnings : [{
        title: 'Review recommended',
        message: 'The automated checks found a non-blocking concern.',
        action: 'Read the complete resume and confirm or correct every section before export.',
      }],
    };
  }
  return {
    tone: 'blocked',
    title: 'Resume needs correction before review',
    message: 'A required deterministic check did not pass, so export remains blocked.',
    warnings,
  };
}

function splitSkillItems(value) {
  const text = normalizeVisibleText(value);
  if (!text) return [];
  const separator = text.includes(':') ? /\s*(?:[;•|]|\n)\s*/ : /\s*(?:[,;•|]|\n)\s*/;
  const items = text.split(separator).map((item) => item.trim()).filter(Boolean);
  return items.length ? items : [text];
}

function isStandaloneDateRange(value) {
  const text = normalizeVisibleText(value).replace(/\s+/g, ' ').trim();
  if (!text || text.length > 48) return false;
  const month = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
  const season = '(?:Spring|Summer|Fall|Autumn|Winter)';
  const year = '(?:19|20)\\d{2}';
  const point = `(?:(?:${month}|${season})\\s+)?${year}`;
  const end = `(?:${point}|Present|Current)`;
  return new RegExp(`^${point}\\s*(?:[-–—]|to)\\s*${end}$`, 'i').test(text);
}

function metadataParts(value) {
  return normalizeVisibleText(value)
    .split(/\n|\s+\|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseHeadingMetadata(value) {
  const parts = metadataParts(value);
  const title = parts.shift() || '';
  let date = null;
  const meta = [];
  for (const part of parts) {
    if (!date && isStandaloneDateRange(part)) date = part;
    else meta.push(part);
  }
  return { title, date, meta };
}

const SKILL_GROUP_LABEL = /^(?:programming(?:\s*&\s*data)?|data(?:\s*&\s*analytics|\s+visualization(?:\s*&\s*bi)?)|statistical(?:\s*&\s*machine learning)?|machine learning|finance(?:\s*&\s*markets)?|tools?(?:\s*&\s*(?:workflow|frameworks?))?|frameworks?|languages?)$/i;

function normalizedSkillValues(value) {
  return normalizeVisibleText(value)
    .replace(/\s*(?:[;•|]|\n)\s*/g, ', ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
}

function parseSkillPresentation(statements) {
  const texts = (statements || []).map((statement) => normalizeVisibleText(statement.text)).filter(Boolean);
  const groups = [];
  const items = [];

  for (let index = 0; index < texts.length; index += 1) {
    const text = texts[index];
    const colon = text.indexOf(':');
    if (colon > 0 && colon < 40) {
      const label = text.slice(0, colon).trim();
      const values = normalizedSkillValues(text.slice(colon + 1));
      if (label && values) {
        groups.push({ label, values });
        continue;
      }
    }

    const next = texts[index + 1];
    if (SKILL_GROUP_LABEL.test(text) && next && !SKILL_GROUP_LABEL.test(next)) {
      groups.push({ label: text, values: normalizedSkillValues(next) });
      index += 1;
      continue;
    }

    items.push(...splitSkillItems(text));
  }

  return { groups, items };
}

function embeddedSummary(statements) {
  const markerIndex = statements.findIndex((statement) =>
    /^(?:professional\s+summary|summary)$/i.test(normalizeVisibleText(statement.text)),
  );
  if (markerIndex < 0) return { summary: [], remaining: statements };
  let end = markerIndex + 1;
  while (end < statements.length && statements[end].display_style !== 'heading') end += 1;
  const summary = statements.slice(markerIndex + 1, end).filter((statement) => normalizeVisibleText(statement.text));
  const remaining = [...statements.slice(0, markerIndex), ...statements.slice(end)];
  return { summary, remaining };
}

function structuredEntries(section, statements) {
  if (section === 'Education') {
    return statements.map((statement) => {
      const parts = metadataParts(statement.text);
      const title = parts.shift() || statement.text;
      let date = null;
      const body = [];
      for (const part of parts) {
        if (!date && isStandaloneDateRange(part)) date = part;
        else body.push({ ...statement, text: part, display_style: 'line' });
      }
      return { title, date, meta: [], body, source_statements: [statement] };
    });
  }

  const entries = [];
  let current = null;
  function ensureEntry() {
    if (!current) {
      current = { title: '', date: null, meta: [], body: [], source_statements: [], orphan: true };
      entries.push(current);
    }
    return current;
  }

  for (const statement of statements) {
    if (statement.display_style === 'heading') {
      const parsed = parseHeadingMetadata(statement.text);
      current = {
        title: parsed.title,
        date: parsed.date,
        meta: parsed.meta,
        body: [],
        source_statements: [statement],
      };
      entries.push(current);
      continue;
    }
    const entry = ensureEntry();
    entry.source_statements.push(statement);
    if (!entry.date && statement.display_style !== 'bullet' && isStandaloneDateRange(statement.text)) {
      entry.date = normalizeVisibleText(statement.text);
    } else {
      entry.body.push(statement);
    }
  }
  return entries;
}

function presentationSection(section, statements) {
  if (section === 'Applicant Header') {
    return { section, kind: 'header', entries: [{ title: null, date: null, meta: [], body: statements }] };
  }
  if (section === 'Professional Summary') {
    return { section, kind: 'summary', entries: [{ title: null, date: null, meta: [], body: statements }] };
  }
  if (section === 'Skills') {
    const skills = parseSkillPresentation(statements);
    return { section, kind: 'skills', entries: [], ...skills };
  }
  if (['Experience', 'Projects', 'Education'].includes(section)) {
    return { section, kind: 'entries', entries: structuredEntries(section, statements) };
  }
  return {
    section,
    kind: 'generic',
    entries: [{ title: null, date: null, meta: [], body: statements }],
  };
}

function resumePresentationModel(reviews) {
  const raw = (reviews || []).map((review) => ({ section: review.section, statements: sectionStatements(review) }));
  const directSummary = raw.some((item) => item.section === 'Professional Summary');
  const promoted = [];
  const normalized = raw.map((item) => {
    if (item.section !== 'Experience') return item;
    const split = embeddedSummary(item.statements);
    if (!directSummary && split.summary.length) promoted.push(...split.summary);
    return { ...item, statements: split.remaining };
  }).filter((item) => item.statements.length);
  if (promoted.length) normalized.push({ section: 'Professional Summary', statements: promoted });

  return normalized
    .map((item) => presentationSection(item.section, item.statements))
    .sort((left, right) => {
      const a = PRESENTATION_SECTION_ORDER.indexOf(left.section);
      const b = PRESENTATION_SECTION_ORDER.indexOf(right.section);
      return (a < 0 ? 999 : a) - (b < 0 ? 999 : b);
    });
}

function reviewedResumeErrors(document) {
  if (!document || document.schema !== REVIEWED_RESUME_VERSION || !Array.isArray(document.sections)) return ['invalid reviewed resume document'];
  const errors = [];
  const seenSections = new Set();
  for (const section of document.sections) {
    if (seenSections.has(section.section)) errors.push(`duplicate reviewed section: ${section.section}`);
    seenSections.add(section.section);
    if (section.kind !== 'entries') continue;
    for (const entry of section.entries) {
      if (entry.orphan && entry.body.some((item) => item.display_style === 'bullet')) errors.push(`orphan bullet in ${section.section}`);
      const titleKey = normalizeKey(entry.title || '');
      const seenBody = new Set();
      for (const statement of entry.body || []) {
        const key = normalizeKey(statement.text);
        if (!key && statement.display_style === 'bullet') errors.push(`blank bullet in ${section.section}`);
        if (key && titleKey && key === titleKey) errors.push(`title repeated as body in ${section.section}`);
        if (key && seenBody.has(key)) errors.push(`duplicate body content in ${section.section}`);
        if (key) seenBody.add(key);
      }
    }
  }
  return [...new Set(errors)];
}

function reviewedResumeDocument(reviews) {
  const sections = resumePresentationModel(reviews);
  const document = {
    schema: REVIEWED_RESUME_VERSION,
    section_order: sections.map((section) => section.section),
    sections,
  };
  const errors = reviewedResumeErrors(document);
  if (errors.length) throw new Error(`Reviewed resume invariant failed: ${errors.join('; ')}`);
  return document;
}

function renderBodyHtml(body, { linesOnly = false } = {}) {
  const blocks = [];
  let bullets = [];
  function flushBullets() {
    if (!bullets.length) return;
    blocks.push(`<ul>${bullets.join('')}</ul>`);
    bullets = [];
  }
  for (const statement of body || []) {
    const text = escapeHtml(statement.text);
    if (!linesOnly && statement.display_style === 'bullet') bullets.push(`<li>${text}</li>`);
    else {
      flushBullets();
      blocks.push(`<p class="resume-line">${text}</p>`);
    }
  }
  flushBullets();
  return blocks.join('');
}

function renderPresentationSectionHtml(model) {
  if (model.kind === 'header') {
    const body = model.entries[0]?.body || [];
    return `<header class="resume-header">${body.map((statement, index) => `<p class="resume-line${index === 0 ? ' resume-name' : ' resume-contact'}">${escapeHtml(statement.text)}</p>`).join('')}</header>`;
  }
  if (model.kind === 'summary') {
    return `<section class="resume-section resume-summary-section"><h2>${escapeHtml(model.section)}</h2>${renderBodyHtml(model.entries[0]?.body || [], { linesOnly: true })}</section>`;
  }
  if (model.kind === 'skills') {
    const groupRows = model.groups.map((group) => `<div class="resume-skill-group"><span class="resume-skill-label">${escapeHtml(group.label)}</span><span class="resume-skill-values">${escapeHtml(group.values)}</span></div>`).join('');
    const grouped = model.groups.length ? `<div class="resume-skill-groups">${groupRows}</div>` : '';
    const flat = model.items.length ? `<ul class="resume-skills">${model.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
    return `<section class="resume-section resume-skills-section"><h2>${escapeHtml(model.section)}</h2>${grouped}${flat}</section>`;
  }
  if (model.kind === 'entries') {
    const entries = model.entries.map((entry) => {
      const heading = entry.title || entry.date || entry.meta.length
        ? `<div class="resume-entry-head"><div class="resume-entry-primary">${entry.title ? `<h3 class="resume-entry-heading">${escapeHtml(entry.title)}</h3>` : ''}${entry.meta.length ? `<p class="resume-entry-meta">${entry.meta.map(escapeHtml).join(' · ')}</p>` : ''}</div>${entry.date ? `<span class="resume-entry-date">${escapeHtml(entry.date)}</span>` : ''}</div>`
        : '';
      return `<div class="resume-entry">${heading}${renderBodyHtml(entry.body, { linesOnly: model.section === 'Education' })}</div>`;
    }).join('');
    return `<section class="resume-section resume-${model.section.toLowerCase()}-section"><h2>${escapeHtml(model.section)}</h2>${entries}</section>`;
  }
  return `<section class="resume-section"><h2>${escapeHtml(model.section)}</h2>${renderBodyHtml(model.entries[0]?.body || [])}</section>`;
}

function renderResumeSectionHtml(sectionName, statements) {
  return renderPresentationSectionHtml(presentationSection(sectionName, statements));
}

function resumeHtml(reviews, { title = 'Approved Resume', standalone = true } = {}) {
  const document = reviewedResumeDocument(reviews);
  const body = document.sections.map(renderPresentationSectionHtml).join('');
  const content = `<article class="resume-paper" data-resume-schema="${REVIEWED_RESUME_VERSION}" aria-label="${escapeHtml(title)}">${body}</article>`;
  if (!standalone) return content;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${resumeCss()}</style></head><body>${content}</body></html>`;
}

function resumeCss() {
  return `
:root{font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;color:#171a21;background:#eef1f5}
*{box-sizing:border-box}
body{margin:0;padding:32px}
.resume-paper{width:min(8.5in,100%);min-height:11in;margin:0 auto;background:#fff;padding:.48in .58in;box-shadow:0 10px 35px rgba(20,32,55,.12);line-height:1.3;color:#171a21}
.resume-header{text-align:center;padding-bottom:10px;margin-bottom:13px;border-bottom:1.25px solid #353b45}
.resume-header .resume-line{margin:0}
.resume-header .resume-name{font-size:24px;font-weight:700;letter-spacing:.01em;margin-bottom:4px}
.resume-header .resume-contact{font-size:9.5pt;color:#3f4650;line-height:1.32}
.resume-section{margin:12px 0 0;break-inside:auto}
.resume-section>h2{margin:0 0 5px;border-bottom:1px solid #8d949e;padding-bottom:2px;font-size:11pt;letter-spacing:.06em;text-transform:uppercase;color:#20252c;break-after:avoid-page}
.resume-summary-section{margin-top:9px}
.resume-summary-section .resume-line{margin:0;font-size:10pt;line-height:1.36}
.resume-entry{margin:0 0 8.5px;break-inside:avoid}
.resume-entry-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:0 0 2px}
.resume-entry-primary{min-width:0;flex:1}
.resume-entry-heading{font-size:10.5pt;line-height:1.25;margin:0;font-weight:700}
.resume-entry-date{font-size:9.5pt;line-height:1.25;font-weight:600;white-space:nowrap;text-align:right;color:#303640}
.resume-entry-meta{font-size:9.4pt;line-height:1.25;margin:1px 0 0;color:#424953}
.resume-line{margin:2px 0;font-size:9.8pt;line-height:1.33;white-space:pre-line}
ul{margin:2px 0 4px;padding-left:16px}
li{font-size:9.8pt;line-height:1.33;margin:1.7px 0;padding-left:1px}
.resume-skill-groups{display:block;margin:0}
.resume-skill-group{display:flex;gap:8px;align-items:flex-start;margin:1.7px 0;font-size:9.5pt;line-height:1.3}
.resume-skill-label{font-weight:700;min-width:145px;flex:0 0 145px}
.resume-skill-values{flex:1;min-width:0}
.resume-skills-section>.resume-skills{display:flex;flex-wrap:wrap;gap:2px 16px;list-style:none;padding:0;margin:3px 0 0}
.resume-skills-section>.resume-skills li{margin:0}
.resume-education-section .resume-entry{margin-bottom:7px}
.resume-education-section .resume-line{margin:1px 0}
@media(max-width:650px){.resume-entry-head{display:block}.resume-entry-date{display:block;text-align:left;margin-top:1px}.resume-skill-group{display:block}.resume-skill-label{display:block;min-width:0}.resume-paper{padding:24px}}
@media print{:root,body{background:#fff}body{padding:0}.resume-paper{box-shadow:none;width:auto;min-height:auto;margin:0;padding:.4in .5in}@page{size:Letter;margin:0}}
`;
}

function careerReviewHtml(run, exported) {
  const approved = resumeHtml(run.section_reviews, { standalone: false });
  const sections = run.section_reviews.map((review) => {
    const statements = sectionStatements(review);
    const rationale = (review.presentation_rationale || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('');
    const status = review.action === 'edit' ? 'Edited by applicant' : 'Approved';
    return `<section class="review-card">
      <div class="review-heading"><h2>${escapeHtml(review.section)}</h2><span>${escapeHtml(status)}</span></div>
      <div class="review-copy">${renderResumeSectionHtml(review.section, statements)}</div>
      <p><strong>Where this came from:</strong> ${escapeHtml(sectionOriginExplanation(review))}</p>
      <div class="presentation-note"><strong>Why this section looks this way:</strong><ul>${rationale || '<li>No additional presentation change was required.</li>'}</ul></div>
    </section>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Career Review — Approved Resume</title><style>${resumeCss()}
body{background:#f3f5f8;color:#172033}.review-shell{max-width:1080px;margin:auto}.review-intro,.review-card{background:#fff;border:1px solid #d8dee8;border-radius:12px;padding:20px;margin:18px 0}.review-heading{display:flex;justify-content:space-between;align-items:center}.review-heading span{background:#e8f5ec;color:#176b39;border-radius:999px;padding:4px 10px;font-weight:700}.review-copy .resume-section,.review-copy .resume-header{border:0;margin:8px 0;padding:0;text-align:left}.approved-preview{margin:24px 0}.technical-note{font-size:14px;color:#566277}.presentation-note{background:#f6f8fb;border-radius:8px;padding:10px 12px}.presentation-note ul{margin-bottom:0}</style></head><body><main class="review-shell"><section class="review-intro"><h1>Career Review complete</h1><p>This report shows the resume you approved or corrected in applicant-readable form. It deliberately omits raw identifiers and implementation fields.</p><p class="technical-note">The structured JSON remains available separately for audit and interoperability; it is not the primary applicant review surface.</p></section><section class="review-intro"><h2>What changed for this application</h2><p>This is the final reviewed application resume, not a deletion log. Content not shown in this report is simply not part of this application artifact; your uploaded resume remains unchanged.</p><p>For each included section, <strong>Where this came from</strong> explains whether the wording was preserved from your source resume or created from reviewed evidence, and <strong>Why this section looks this way</strong> shows the available presentation rationale.</p></section><div class="approved-preview">${approved}</div><h1>Section-by-section review record</h1>${sections}<section class="review-intro"><h2>Approved resume text</h2><pre>${escapeHtml(normalizeVisibleText(exported.markdown))}</pre></section></main></body></html>`;
}

let pdfBrowserPromise = null;
function pdfBrowser() {
  if (!pdfBrowserPromise) {
    const { chromium } = require('playwright-core');
    pdfBrowserPromise = chromium.launch().catch((error) => {
      pdfBrowserPromise = null;
      throw error;
    });
  }
  return pdfBrowserPromise;
}

async function closePdfRenderer() {
  if (!pdfBrowserPromise) return;
  const pending = pdfBrowserPromise;
  pdfBrowserPromise = null;
  const browser = await pending.catch(() => null);
  if (browser) await browser.close();
}

async function pdfPage() {
  const browser = await pdfBrowser();
  try {
    return await browser.newPage();
  } catch (error) {
    pdfBrowserPromise = null;
    return (await pdfBrowser()).newPage();
  }
}

async function resumePdf(reviews) {
  const html = resumeHtml(reviews, { title: 'Resume', standalone: true });
  const page = await pdfPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await page.close().catch(() => {});
  }
}

async function writeApplicantOutputs({ directory, run, exported, renderPdf = resumePdf }) {
  const markdown = normalizeVisibleText(humanReview.markdown(run));
  const reviewedResume = reviewedResumeDocument(run.section_reviews);
  const normalizedExport = { ...exported, markdown, reviewed_resume_document: reviewedResume };
  const pdf = await renderPdf(run.section_reviews);
  fs.writeFileSync(path.join(directory, 'final-resume.md'), `${markdown}\n`);
  fs.writeFileSync(path.join(directory, 'final-resume.json'), `${JSON.stringify(normalizedExport, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, 'career-review-report.html'), careerReviewHtml(run, normalizedExport));
  fs.writeFileSync(path.join(directory, 'final-resume.pdf'), pdf);
  return normalizedExport;
}

module.exports = {
  REVIEWED_RESUME_VERSION,
  careerReviewHtml,
  closePdfRenderer,
  evidenceAcceptExplanation,
  escapeHtml,
  isStandaloneDateRange,
  normalizeVisibleText,
  resumeCss,
  resumeHtml,
  resumePdf,
  resumePresentationModel,
  reviewedResumeDocument,
  reviewedResumeErrors,
  sectionOriginExplanation,
  sectionStatements,
  splitSkillItems,
  validationSummary,
  writeApplicantOutputs,
};