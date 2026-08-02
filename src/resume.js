const { spawnSync } = require('node:child_process');

const SECTION_NAMES = new Map([['experience', 'experience'], ['work experience', 'experience'], ['education', 'education'], ['projects', 'project'], ['skills', 'skill'], ['certifications', 'certification'], ['certificates', 'certification']]);
const UNSUPPORTED_SECTION_HEADINGS = new Set(['languages', 'interests', 'awards', 'publications', 'volunteering', 'summary', 'profile']);

function parseResumeText(text) {
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const basic = {};
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) basic.email = email[0];
  const phone = text.match(/(?:\+?\d[\d(). -]{7,}\d)/);
  if (phone) basic.phone = phone[0];
  if (lines[0] && /^[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3}$/.test(lines[0])) basic.name = lines[0];
  const facts = [];
  let section = null;
  for (const line of lines) {
    const heading = SECTION_NAMES.get(line.toLowerCase().replace(/:$/, ''));
    if (heading) { section = heading; continue; }
    if (UNSUPPORTED_SECTION_HEADINGS.has(line.toLowerCase().replace(/:$/, '')) || /^[A-Z][A-Z ]{2,}$/.test(line)) { section = null; continue; }
    if (!section) continue;
    const clean = line.replace(/^[•*-]\s*/, '');
    if (!clean) continue;
    if (section === 'skill') {
      for (const name of clean.split(/[,;|]/).map((value) => value.trim()).filter(Boolean)) facts.push({ entity_type: 'skill', value: { name }, confirmation_status: 'confirmed' });
    } else {
      facts.push({ entity_type: section, value: { text: clean }, confirmation_status: 'needs_confirmation' });
    }
  }
  if (basic.name) facts.push({ entity_type: 'basic_information', value: { name: basic.name }, confirmation_status: 'confirmed' });
  if (basic.email) facts.push({ entity_type: 'basic_information', value: { email: basic.email }, confirmation_status: 'confirmed' });
  if (basic.phone) facts.push({ entity_type: 'basic_information', value: { phone: basic.phone }, confirmation_status: 'confirmed' });
  return { basic, facts };
}

function extractPdfText(pdfPath) {
  if (!pdfPath.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF resumes are supported in Experiment 002.');
  const result = spawnSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`Unable to extract text from PDF: ${result.stderr || result.error?.message || 'unknown error'}`);
  return result.stdout;
}

function importResume(store, pdfPath, readPdf = extractPdfText) {
  return store.createResumeProfile({ sourcePath: pdfPath, ...parseResumeText(readPdf(pdfPath)) });
}

module.exports = { extractPdfText, importResume, parseResumeText };
