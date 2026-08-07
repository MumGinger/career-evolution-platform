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

function renderStatementHtml(statement) {
  const text = escapeHtml(statement.text);
  if (statement.display_style === 'heading') return `<h3 class="resume-entry-heading">${text}</h3>`;
  if (statement.display_style === 'line' || statement.display_style === 'inline') return `<p class="resume-line">${text}</p>`;
  return `<li>${text}</li>`;
}

function renderResumeSectionHtml(sectionName, statements) {
  if (String(sectionName).toLowerCase() === 'skills') {
    const skills = statements.flatMap((statement) => splitSkillItems(statement.text));
    return `<section class="resume-section resume-skills-section"><h2>${escapeHtml(sectionName)}</h2><ul class="resume-skills">${skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join('')}</ul></section>`;
  }

  const rendered = statements.map(renderStatementHtml);
  const bullets = [];
  const blocks = [];
  for (const item of rendered) {
    if (item.startsWith('<li>')) bullets.push(item);
    else {
      if (bullets.length) blocks.push(`<ul>${bullets.splice(0).join('')}</ul>`);
      blocks.push(item);
    }
  }
  if (bullets.length) blocks.push(`<ul>${bullets.join('')}</ul>`);
  if (sectionName === 'Applicant Header') return `<header class="resume-header">${blocks.join('')}</header>`;
  return `<section class="resume-section"><h2>${escapeHtml(sectionName)}</h2>${blocks.join('')}</section>`;
}

function resumeHtml(reviews, { title = 'Approved Resume', standalone = true } = {}) {
  const body = (reviews || []).map((review) => renderResumeSectionHtml(review.section, sectionStatements(review))).join('');
  const content = `<article class="resume-paper" aria-label="${escapeHtml(title)}">${body}</article>`;
  if (!standalone) return content;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${resumeCss()}</style></head><body>${content}</body></html>`;
}

function resumeCss() {
  return `
:root{font-family:Inter,"Segoe UI",Arial,Helvetica,sans-serif;color:#172033;background:#eef1f5}
*{box-sizing:border-box}
body{margin:0;padding:32px}
.resume-paper{width:min(8.5in,100%);min-height:11in;margin:0 auto;background:#fff;padding:.5in .6in;box-shadow:0 10px 35px rgba(20,32,55,.12);line-height:1.36;color:#172033}
.resume-header{text-align:center;border-bottom:1.5px solid #253858;padding-bottom:10px;margin-bottom:15px}
.resume-header .resume-line:first-child{font-size:27px;font-weight:750;letter-spacing:.01em;margin:0 0 4px}
.resume-header .resume-line:not(:first-child){font-size:9.6pt;color:#36445a}
.resume-line{margin:3px 0;font-size:10pt;white-space:pre-line}
.resume-section{margin:13px 0 0;break-inside:avoid}
.resume-section>h2{margin:0 0 6px;border-bottom:1px solid #a8b2c1;padding-bottom:2px;font-size:11.5pt;letter-spacing:.055em;text-transform:uppercase;color:#253858}
.resume-entry-heading{font-size:10.7pt;line-height:1.3;margin:8px 0 2px;font-weight:700;white-space:pre-line}
ul{margin:3px 0 6px;padding-left:18px}
li{font-size:10pt;line-height:1.36;margin:2px 0}
.resume-skills{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:26px;row-gap:1px;margin-top:2px}
.resume-skills li{margin:1px 0}
@media(max-width:650px){.resume-skills{grid-template-columns:1fr}}
@media print{body{background:#fff;padding:0}.resume-paper{box-shadow:none;width:auto;min-height:auto;margin:0;padding:.44in .56in}@page{size:Letter;margin:0}}
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

function pdfLines(reviews) {
  const lines = [];
  for (const review of reviews || []) {
    const statements = sectionStatements(review);
    if (review.section === 'Applicant Header') {
      statements.forEach((statement, index) => lines.push({
        text: statement.text,
        style: index === 0 ? 'name' : 'contact',
      }));
      lines.push({ style: 'header-rule' });
      continue;
    }
    lines.push({ text: review.section, style: 'section' });
    if (String(review.section).toLowerCase() === 'skills') {
      statements.flatMap((statement) => splitSkillItems(statement.text)).forEach((skill) => {
        lines.push({ text: `- ${skill}`, style: 'bullet' });
      });
      lines.push({ style: 'space' });
      continue;
    }
    for (const statement of statements) {
      if (statement.display_style === 'heading') lines.push({ text: statement.text, style: 'heading' });
      else if (statement.display_style === 'line' || statement.display_style === 'inline') lines.push({ text: statement.text, style: 'line' });
      else lines.push({ text: `- ${statement.text}`, style: 'bullet' });
    }
    lines.push({ style: 'space' });
  }
  return lines;
}

function resumePdf(reviews) {
  const pageWidth = 612;
  const pageHeight = 792;
  const left = 50;
  const right = 50;
  const top = 42;
  const bottom = 42;
  const pages = [];
  let commands = [];
  let y = pageHeight - top;

  function nextPage() {
    if (commands.length) pages.push(commands.join('\n'));
    commands = [];
    y = pageHeight - top;
  }
  function addText(text, { font = 'F1', size = 10, leading = 13, indent = 0, align = 'left' } = {}) {
    const width = Math.max(32, Math.floor((pageWidth - left - right - indent) / (size * 0.52)));
    for (const line of wrapText(text, width)) {
      if (y - leading < bottom) nextPage();
      const estimate = line.length * size * 0.52;
      const x = align === 'center' ? Math.max(left, (pageWidth - estimate) / 2) : left + indent;
      commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(line)}) Tj ET`);
      y -= leading;
    }
  }

  for (const item of pdfLines(reviews)) {
    if (item.style === 'space') { y -= 4; continue; }
    if (item.style === 'header-rule') {
      y -= 2;
      commands.push(`0.18 0.25 0.38 RG ${left} ${y} m ${pageWidth - right} ${y} l S`);
      y -= 10;
      continue;
    }
    if (item.style === 'name') addText(item.text, { font: 'F2', size: 20, leading: 24, align: 'center' });
    else if (item.style === 'contact') addText(item.text, { size: 9.5, leading: 12, align: 'center' });
    else if (item.style === 'section') {
      if (y - 30 < bottom) nextPage();
      y -= 3;
      commands.push(`0.18 0.25 0.38 RG ${left} ${y - 2} m ${pageWidth - right} ${y - 2} l S`);
      addText(item.text.toUpperCase(), { font: 'F2', size: 12, leading: 17 });
    } else if (item.style === 'heading') addText(item.text, { font: 'F2', size: 10.7, leading: 14 });
    else if (item.style === 'bullet') addText(item.text, { size: 10, leading: 13.5, indent: 11 });
    else addText(item.text, { size: 10, leading: 13.5 });
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
  normalizeVisibleText,
  resumeCss,
  resumeHtml,
  resumePdf,
  sectionOriginExplanation,
  sectionStatements,
  splitSkillItems,
  validationSummary,
  writeApplicantOutputs,
};