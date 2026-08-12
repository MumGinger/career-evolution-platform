const fs = require('node:fs');
const path = require('node:path');
const humanReview = require('./human-review');

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
      current = { title: '', date: null, meta: [], body: [], source_statements: [] };
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
  const body = resumePresentationModel(reviews).map(renderPresentationSectionHtml).join('');
  const content = `<article class="resume-paper" aria-label="${escapeHtml(title)}">${body}</article>`;
  if (!standalone) return content;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${resumeCss()}</style></head><body>${content}</body></html>`;
}

function resumeCss() {
  return `
:root{font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;color:#171a21;background:#eef1f5}
*{box-sizing:border-box}
body{margin:0;padding:32px}
.resume-paper{width:min(8.5in,100%);min-height:11in;margin:0 auto;background:#fff;padding:.46in .56in;box-shadow:0 10px 35px rgba(20,32,55,.12);line-height:1.28;color:#171a21}
.resume-header{text-align:center;padding-bottom:9px;margin-bottom:12px;border-bottom:1.25px solid #353b45}
.resume-header .resume-line{margin:0}
.resume-header .resume-name{font-size:23px;font-weight:700;letter-spacing:.012em;margin-bottom:4px}
.resume-header .resume-contact{font-size:9.3pt;color:#3f4650;line-height:1.3}
.resume-section{margin:11px 0 0;break-inside:auto}
.resume-section>h2{margin:0 0 5px;border-bottom:1px solid #8d949e;padding-bottom:2px;font-size:11pt;letter-spacing:.065em;text-transform:uppercase;color:#20252c}
.resume-summary-section{margin-top:9px}
.resume-summary-section .resume-line{margin:0;font-size:9.8pt;line-height:1.34}
.resume-entry{margin:0 0 8px;break-inside:avoid}
.resume-entry-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:0 0 2px}
.resume-entry-primary{min-width:0;flex:1}
.resume-entry-heading{font-size:10.3pt;line-height:1.24;margin:0;font-weight:700}
.resume-entry-date{font-size:9.4pt;line-height:1.24;font-weight:600;white-space:nowrap;text-align:right;color:#303640}
.resume-entry-meta{font-size:9.3pt;line-height:1.24;margin:1px 0 0;color:#424953}
.resume-line{margin:2px 0;font-size:9.7pt;line-height:1.31;white-space:pre-line}
ul{margin:2px 0 4px;padding-left:16px}
li{font-size:9.7pt;line-height:1.31;margin:1.5px 0;padding-left:1px}
.resume-skill-groups{display:block;margin:0}
.resume-skill-group{display:flex;gap:8px;align-items:flex-start;margin:1.5px 0;font-size:9.4pt;line-height:1.29}
.resume-skill-label{font-weight:700;min-width:150px;flex:0 0 150px}
.resume-skill-values{flex:1;min-width:0}
.resume-skills-section>.resume-skills{display:flex;flex-wrap:wrap;gap:2px 16px;list-style:none;padding:0;margin:3px 0 0}
.resume-skills-section>.resume-skills li{margin:0}
.resume-education-section .resume-entry{margin-bottom:7px}
.resume-education-section .resume-line{margin:1px 0}
@media(max-width:650px){.resume-entry-head{display:block}.resume-entry-date{display:block;text-align:left;margin-top:1px}.resume-skill-group{display:block}.resume-skill-label{display:block;min-width:0}.resume-paper{padding:24px}}
@media print{body{background:#fff;padding:0}.resume-paper{box-shadow:none;width:auto;min-height:auto;margin:0;padding:.38in .48in}@page{size:Letter;margin:0}}
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

function pdfAscii(value) {
  return normalizeVisibleText(value)
    .replace(/[•▪◦]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\x20-\x7E]/g, '');
}

function wrapText(text, width) {
  const words = pdfAscii(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function pdfEscape(value) {
  return pdfAscii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function resumePdf(reviews) {
  const pageWidth = 612;
  const pageHeight = 792;
  const left = 46;
  const right = 46;
  const top = 38;
  const bottom = 38;
  const pages = [];
  let commands = [];
  let y = pageHeight - top;

  function nextPage() {
    if (commands.length) pages.push(commands.join('\n'));
    commands = [];
    y = pageHeight - top;
  }
  function ensureSpace(amount) {
    if (y - amount < bottom) nextPage();
  }
  function textCommand(text, x, baseline, { font = 'F1', size = 10 } = {}) {
    commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfEscape(text)}) Tj ET`);
  }
  function addText(text, { font = 'F1', size = 9.7, leading = 12.6, indent = 0, align = 'left', widthChars = null } = {}) {
    const width = widthChars || Math.max(32, Math.floor((pageWidth - left - right - indent) / (size * 0.52)));
    for (const line of wrapText(text, width)) {
      ensureSpace(leading);
      const estimate = pdfAscii(line).length * size * 0.52;
      const x = align === 'center' ? Math.max(left, (pageWidth - estimate) / 2) : left + indent;
      textCommand(line, x, y, { font, size });
      y -= leading;
    }
  }
  function addSectionTitle(title) {
    ensureSpace(28);
    y -= 3;
    textCommand(title.toUpperCase(), left, y, { font: 'F2', size: 12 });
    y -= 4;
    commands.push(`0.42 G ${left} ${y} m ${pageWidth - right} ${y} l S`);
    y -= 8;
  }
  function addEntry(entry, section) {
    ensureSpace(34);
    if (entry.title || entry.date) {
      const titleLines = entry.title ? wrapText(entry.title, entry.date ? 58 : 88) : [''];
      const first = titleLines.shift() || '';
      if (first) textCommand(first, left, y, { font: 'F2', size: 10.3 });
      if (entry.date) {
        const dateText = pdfAscii(entry.date);
        const dateSize = 9.4;
        const x = pageWidth - right - (dateText.length * dateSize * 0.52);
        textCommand(dateText, x, y, { font: 'F1', size: dateSize });
      }
      y -= 12.5;
      for (const line of titleLines) {
        textCommand(line, left, y, { font: 'F2', size: 10.3 });
        y -= 12.5;
      }
    }
    for (const meta of entry.meta || []) addText(meta, { size: 9.2, leading: 11.5 });
    for (const statement of entry.body || []) {
      if (statement.display_style === 'bullet' && section !== 'Education') addText(`- ${statement.text}`, { size: 9.6, leading: 12.4, indent: 10 });
      else addText(statement.text, { size: 9.6, leading: 12.4 });
    }
    y -= 3;
  }

  for (const model of resumePresentationModel(reviews)) {
    if (model.kind === 'header') {
      const body = model.entries[0]?.body || [];
      body.forEach((statement, index) => addText(statement.text, {
        font: index === 0 ? 'F2' : 'F1',
        size: index === 0 ? 20 : 9.3,
        leading: index === 0 ? 23 : 11.5,
        align: 'center',
      }));
      y -= 2;
      commands.push(`0.22 G ${left} ${y} m ${pageWidth - right} ${y} l S`);
      y -= 9;
      continue;
    }

    addSectionTitle(model.section);
    if (model.kind === 'summary') {
      for (const statement of model.entries[0]?.body || []) addText(statement.text, { size: 9.7, leading: 12.7 });
      y -= 2;
      continue;
    }
    if (model.kind === 'skills') {
      for (const group of model.groups) {
        ensureSpace(13);
        textCommand(`${group.label}:`, left, y, { font: 'F2', size: 9.4 });
        const labelWidth = Math.max(108, Math.min(170, (pdfAscii(group.label).length + 2) * 9.4 * 0.52 + 10));
        const valueX = left + labelWidth;
        const valueWidth = Math.max(38, Math.floor((pageWidth - right - valueX) / (9.4 * 0.52)));
        const lines = wrapText(group.values, valueWidth);
        lines.forEach((line, index) => {
          if (index > 0) y -= 11.7;
          textCommand(line, valueX, y, { size: 9.4 });
        });
        y -= 12.2;
      }
      if (model.items.length) addText(model.items.join(' | '), { size: 9.4, leading: 12.2 });
      y -= 1;
      continue;
    }
    if (model.kind === 'entries') {
      for (const entry of model.entries) addEntry(entry, model.section);
      continue;
    }
    for (const statement of model.entries[0]?.body || []) {
      if (statement.display_style === 'bullet') addText(`- ${statement.text}`, { indent: 10 });
      else addText(statement.text);
    }
    y -= 2;
  }
  if (commands.length || !pages.length) pages.push(commands.join('\n'));

  const objects = [null];
  const addObject = (body) => { objects.push(body); return objects.length - 1; };
  const catalogId = addObject('');
  const pagesId = addObject('');
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds = [];
  for (const stream of pages) {
    const streamBuffer = Buffer.from(stream, 'latin1');
    const contentId = addObject(`<< /Length ${streamBuffer.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n%CEP\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

function writeApplicantOutputs({ directory, run, exported }) {
  const markdown = normalizeVisibleText(humanReview.markdown(run));
  const normalizedExport = { ...exported, markdown };
  fs.writeFileSync(path.join(directory, 'final-resume.md'), `${markdown}\n`);
  fs.writeFileSync(path.join(directory, 'final-resume.json'), `${JSON.stringify(normalizedExport, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, 'career-review-report.html'), careerReviewHtml(run, normalizedExport));
  fs.writeFileSync(path.join(directory, 'final-resume.pdf'), resumePdf(run.section_reviews));
  return normalizedExport;
}

module.exports = {
  careerReviewHtml,
  evidenceAcceptExplanation,
  escapeHtml,
  isStandaloneDateRange,
  normalizeVisibleText,
  resumeCss,
  resumeHtml,
  resumePdf,
  resumePresentationModel,
  sectionOriginExplanation,
  sectionStatements,
  splitSkillItems,
  validationSummary,
  writeApplicantOutputs,
};
