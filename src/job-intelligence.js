const { createHash } = require('node:crypto');

const PARSER_VERSION = 'job-intelligence-parser/1.0.0';
const POLICY_VERSION = 'job-requirement-policy/1.0.0';
const CATALOG = [
  ['SQL', /\bsql\b/i, 'technical_skill', false],
  ['Python', /\bpython\b/i, 'technical_skill', false],
  ['Data visualization', /\b(?:data )?visuali[sz]ation\b/i, 'technical_skill', false],
  ['Regression testing', /\bregression testing\b/i, 'testing_practice', false],
  ['Test cases', /\btest cases?\b/i, 'testing_practice', false],
  ['Source-to-target validation', /\bsource[- ]to[- ]target validation\b/i, 'testing_practice', false],
  ['Excel', /\b(?:excel|microsoft excel)\b/i, 'technical_skill', true],
  ['Microsoft Office', /\bmicrosoft office\b/i, 'technical_skill', true],
  ['Communication', /\bcommunication skills?\b|\bcommunicat(?:e|ing|ion)\b/i, 'interpersonal_capability', true],
  ['Teamwork', /\bteamwork\b|\bteam player\b|\bcollaborat(?:e|ion|ing)\b/i, 'interpersonal_capability', true],
  ['Stakeholder management', /\bstakeholder management\b|\bmanage stakeholders?\b|\bstakeholders?\b/i, 'interpersonal_capability', true, ['stakeholder manager']],
];

function hash(text) { return createHash('sha256').update(text).digest('hex'); }
function sectionFor(line) {
  const value = line.toLowerCase().replace(/[:]/g, '').trim();
  if (/^(required|minimum)( qualifications?| requirements?)?$/.test(value)) return 'required';
  if (/^(preferred|desired)( qualifications?| requirements?)?$/.test(value)) return 'preferred';
  if (/^(responsibilities|what you.ll do|duties|key responsibilities)$/.test(value)) return 'responsibility';
  return null;
}
function isUnsupportedHeading(line) {
  const value = line.replace(/:$/, '').trim();
  const normalized = value.toLowerCase();
  if (['about you', 'benefits', 'company culture', 'what we offer', 'why join us', 'our culture'].includes(normalized)) return true;
  const words = value.split(/\s+/);
  return words.length >= 2 && words.length <= 5 && !/[.!?;,]/.test(value) && words.every((word) => /^[A-Z][A-Za-z/&-]*$/.test(word));
}
function explicitness(text, section) {
  if (section === 'required' || /\b(required|must|minimum|at least)\b/i.test(text)) return 'required';
  if (section === 'preferred' || /\b(preferred|nice to have|desired)\b/i.test(text)) return 'preferred';
  if (section === 'responsibility') return 'responsibility-derived';
  return 'contextual';
}
function level(score) { return score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low'; }
function analyzeRequirement(item, roleTitle) {
  const count = item.excerpts.length;
  const mandatory = item.excerpts.some((excerpt) => /\b(required|must|minimum|at least)\b/i.test(excerpt));
  const required = item.explicitness.includes('required') || mandatory;
  const responsibilities = item.explicitness.includes('responsibility-derived');
  const title = roleTitle.toLowerCase();
  const titleMention = title.includes(item.normalized_name.toLowerCase()) || item.aliases.some((alias) => title.includes(alias.toLowerCase()));
  const stakeholderCore = item.normalized_name === 'Stakeholder management' && (count >= 2 || (required && responsibilities) || titleMention);
  const roleTitleCore = titleMention || stakeholderCore;
  let importanceScore = item.generic && !roleTitleCore ? 1 : 4;
  if (item.generic && !roleTitleCore) {
    if (mandatory) importanceScore += 2;
    if (count > 1) importanceScore += 1;
    if (responsibilities) importanceScore += 1;
  } else {
    if (required) importanceScore += 3;
    if (count > 1) importanceScore += 2;
    if (responsibilities) importanceScore += 1;
    if (titleMention) importanceScore += 1;
  }
  if (stakeholderCore) importanceScore += 3;
  let resumeValueScore = item.generic ? 2 : 6;
  if (!item.generic && (required || count > 1)) resumeValueScore += 1;
  if (stakeholderCore) resumeValueScore += 5;
  const signals = [];
  if (required) signals.push('mandatory wording or required-qualifications context');
  if (count > 1) signals.push(`appears ${count} times`);
  if (responsibilities) signals.push('appears in responsibilities');
  if (stakeholderCore) signals.push('role context makes stakeholder work central');
  const genericNote = item.generic && !stakeholderCore ? ' Generic language remains visible but is initially deprioritized without role-specific evidence.' : '';
  return {
    ...item,
    importance_level: level(importanceScore),
    importance_score: importanceScore,
    resume_value_level: level(resumeValueScore),
    resume_value_score: resumeValueScore,
    importance_rationale: `Initial deterministic policy: ${signals.join(', ') || 'a single contextual mention'}.${genericNote}`,
    resume_value_rationale: stakeholderCore
      ? 'Stakeholder management is resume-demonstrable and promoted because the supplied role context makes it central.'
      : item.generic
        ? 'Initial low value for broadly applicable language; retain it because the job description explicitly mentions it.'
        : 'Concrete tool, method, or testing practice that can be supported by truthful role-specific evidence.',
    uncertainty: 'Derived only from supplied job-description wording; section detection and requirement normalization are deterministic and may not capture every synonym or nuance.',
  };
}

function parseJobDescription({ roleTitle = '', jobDescription }) {
  const requirements = new Map();
  let section = null;
  for (const rawLine of jobDescription.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = sectionFor(line);
    if (heading) { section = heading; continue; }
    if (isUnsupportedHeading(line)) { section = null; continue; }
    for (const [name, pattern, category, generic, aliases = []] of CATALOG) {
      if (!pattern.test(line)) continue;
      const current = requirements.get(name) || { normalized_name: name, category, generic, aliases, excerpts: [], explicitness: [] };
      current.excerpts.push(line);
      current.explicitness.push(explicitness(line, section));
      requirements.set(name, current);
    }
  }
  return [...requirements.values()].map((item) => analyzeRequirement(item, roleTitle));
}

module.exports = { PARSER_VERSION, POLICY_VERSION, hash, parseJobDescription };
