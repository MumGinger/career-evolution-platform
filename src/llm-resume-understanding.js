// Preferred real-resume beta path. The AST pipeline remains legacy/diagnostic.
const BLOCK_TYPES = ['identity', 'summary', 'education', 'certification', 'skill', 'experience', 'project', 'responsibility', 'achievement', 'tool'];
const BLOCK_STATES = ['confirmed', 'uncertain'];
const CONFIDENCE_LEVELS = ['low', 'medium', 'high'];
const SECTION_FOR = { identity: 'Professional Summary', summary: 'Professional Summary', skill: 'Skills', tool: 'Skills', experience: 'Experience', responsibility: 'Experience', achievement: 'Experience', project: 'Projects', education: 'Education', certification: 'Certifications' };
const number = /\b\d+(?:[,.]\d+)?(?:\s*%|\s*(?:hours?|days?|years?|users?|customers?|dollars?)\b)/i;
const id = (type, index) => `${type}-${index + 1}`;
const sourceSpan = (text, exact) => { const start = text.indexOf(exact); return start < 0 ? null : { start, end: start + exact.length }; };
const ALIGNMENT_CHARACTER = new Map([['\u00a0', ' '], ['\u2007', ' '], ['\u202f', ' '], ['\u2010', '-'], ['\u2011', '-'], ['\u2012', '-'], ['\u2013', '-'], ['\u2014', '-'], ['\u2212', '-'], ['\u2018', "'"], ['\u2019', "'"], ['\u201c', '"'], ['\u201d', '"'], ['\u2022', '-'], ['\u2023', '-'], ['\u2043', '-'], ['\u25e6', '-']]);
function normalizedSource(text) { const output = []; const map = []; for (let index = 0; index < String(text || '').length; index += 1) { const source = String(text || '')[index]; const value = /\s/u.test(source) ? ' ' : (ALIGNMENT_CHARACTER.get(source) || source); if (value === ' ' && output.at(-1) === ' ') { map.at(-1).end = index + 1; continue; } output.push(value); map.push({ start: index, end: index + 1 }); } return { text: output.join('').trim(), map: output.length && output[0] === ' ' ? map.slice(1) : map }; }
function alignmentMatches(canonical, candidate) { const normalized = normalizedSource(canonical); const target = normalizedSource(candidate).text; if (!target) return []; const matches = []; let position = normalized.text.indexOf(target); while (position >= 0) { const first = normalized.map[position]; const last = normalized.map[position + target.length - 1]; if (first && last) matches.push({ start: first.start, end: last.end }); position = normalized.text.indexOf(target, position + 1); } return matches; }

function normalizeSectionHeading(value) {
  return String(value || '').replace(/[():]/g, ' ').replace(/&/g, ' and ').replace(/\s+/g, ' ').trim().toLowerCase();
}
function explicitSectionName(line) {
  const value = normalizeSectionHeading(line);
  if (['summary', 'professional summary'].includes(value)) return 'summary';
  if (['skills', 'technical skills', 'tools'].includes(value)) return 'skills';
  if (value === 'education') return 'education';
  if (['certification', 'certifications', 'certificate', 'certificates', 'credentials'].includes(value)) return 'certifications';
  if (value.startsWith('ongoing projects') || ['projects', 'project', 'selected projects'].includes(value)) return 'projects';
  if (['experience', 'employment', 'work experience', 'professional experience', 'research experience', 'data analysis visualization and modeling experience'].includes(value)) return 'experience';
  return null;
}
function explicitSectionRanges(text) {
  const source = String(text || '');
  const headings = [];
  for (const match of source.matchAll(/[^\r\n]+/g)) {
    const raw = match[0];
    const section = explicitSectionName(raw);
    if (!section) continue;
    headings.push({ section, heading_start: match.index, content_start: match.index + raw.length });
  }
  return headings.map((heading, index) => ({
    ...heading,
    content_end: headings[index + 1]?.heading_start ?? source.length,
  }));
}
function applyExplicitSectionBoundaries(blocks, text) {
  const ranges = explicitSectionRanges(text);
  if (!ranges.length) return blocks;
  return (blocks || []).map((candidate) => {
    const start = candidate?.source_location?.start;
    const end = candidate?.source_location?.end;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return candidate;
    const range = ranges.find((item) => start >= item.content_start && end <= item.content_end);
    if (!range) return candidate;
    if (range.section === 'summary') return { ...candidate, type: 'summary', parent_id: null };
    if (range.section === 'skills') return { ...candidate, type: candidate.type === 'tool' ? 'tool' : 'skill', parent_id: null };
    if (range.section === 'education') return { ...candidate, type: 'education', parent_id: null };
    if (range.section === 'certifications') return { ...candidate, type: 'certification', parent_id: null };
    return candidate;
  });
}
function alignUnderstanding({ understanding, text }) { if (!understanding || typeof understanding !== 'object' || Array.isArray(understanding) || !Array.isArray(understanding.blocks)) return { understanding, findings: [] }; const findings = []; const blocks = understanding.blocks.map((candidate) => { const matches = alignmentMatches(text, candidate?.exact_source_text); const hint = candidate?.source_location; const hinted = matches.filter((match) => Number.isInteger(hint?.start) && Number.isInteger(hint?.end) && match.start < hint.end && hint.start < match.end); const selected = matches.length === 1 ? matches[0] : hinted.length === 1 ? hinted[0] : null; if (!selected) { findings.push({ block_id: candidate?.id || null, severity: 'error', category: matches.length ? 'source_alignment_ambiguous' : 'source_alignment_not_found', message: matches.length ? 'Source alignment is ambiguous.' : 'Source alignment did not find an exact normalized source span.' }); return candidate; }
    const exact = text.slice(selected.start, selected.end); return { ...candidate, exact_source_text: exact, source_location: selected, provenance: { ...(candidate.provenance || {}), source: candidate.provenance?.source || 'resume_input', exact_source_text: exact, source_alignment: { method: matches.length === 1 && exact === candidate.exact_source_text ? 'canonical_exact' : matches.length === 1 ? 'normalized_unique_match' : 'source_location_disambiguated' } } };
  }); return { understanding: { ...(understanding || {}), blocks: applyExplicitSectionBoundaries(blocks, text) }, findings };
}
const RESUME_UNDERSTANDING_JSON_SCHEMA = { type: 'object', additionalProperties: false, required: ['blocks'], properties: { blocks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'type', 'title', 'label', 'exact_source_text', 'source_location', 'parent_id', 'normalized_meaning', 'confidence', 'state', 'provenance', 'limitations'], properties: {
  id: { type: 'string', minLength: 1 }, type: { type: 'string', enum: BLOCK_TYPES }, title: { type: 'string', minLength: 1 }, label: { type: 'string', minLength: 1 }, exact_source_text: { type: 'string', minLength: 1 }, source_location: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['start', 'end'], properties: { start: { type: 'integer', minimum: 0 }, end: { type: 'integer', minimum: 0 } } }] }, parent_id: { anyOf: [{ type: 'null' }, { type: 'string', minLength: 1 }] }, normalized_meaning: { type: 'string', minLength: 1 }, confidence: { type: 'string', enum: CONFIDENCE_LEVELS }, state: { type: 'string', enum: BLOCK_STATES }, provenance: { type: 'object', additionalProperties: false, required: ['source', 'exact_source_text'], properties: { source: { type: 'string', minLength: 1 }, exact_source_text: { type: 'string', minLength: 1 } } }, limitations: { type: 'array', items: { type: 'string' } },
} } } } };

class ResumeUnderstandingProviderError extends Error { constructor() { super('Resume Understanding provider/API request failed.'); this.category = 'provider_api_failure'; } }

function block(type, title, exact, text, index, extra = {}) {
  return { id: id(type, index), type, title, label: title, exact_source_text: exact, source_location: sourceSpan(text, exact), parent_id: extra.parent_id || null, normalized_meaning: extra.normalized_meaning || exact, confidence: extra.confidence || 'medium', state: extra.state || 'confirmed', provenance: { source: 'resume_input', exact_source_text: exact }, limitations: extra.limitations || [] };
}
function lines(text) { return text.replace(/\r/g, '').split('\n').map((value) => value.trim()).filter(Boolean); }
function mockUnderstand({ text }) {
  const out = []; let section = ''; let experience = null; let project = null;
  for (const line of lines(text)) {
    if (/^(summary|professional summary)$/i.test(line)) { section = 'summary'; experience = null; project = null; continue; }
    if (/^(experience|employment|work experience|professional experience|research experience|data analysis,? visualization\s*&?\s*modeling experience)$/i.test(line)) { section = 'experience'; experience = null; project = null; continue; }
    if (/^(projects?|selected projects?|ongoing projects.*)$/i.test(line)) { section = 'project'; experience = null; project = null; continue; }
    if (/^(skills?|technical skills?|tools?)$/i.test(line)) { section = 'skill'; experience = null; project = null; continue; }
    if (/^(education)$/i.test(line)) { section = 'education'; experience = null; project = null; continue; }
    if (/^(certifications?|certificates?)$/i.test(line)) { section = 'certification'; experience = null; project = null; continue; }
    if (/^[•-]\s*/.test(line)) {
      const parent = section === 'project' ? project : experience;
      out.push(block(number.test(line) ? 'achievement' : 'responsibility', line.replace(/^[•-]\s*/, ''), line, text, out.length, { parent_id: parent?.id || null, state: parent ? 'confirmed' : 'uncertain', limitations: parent ? [] : ['Parent heading was not confidently identified.'] }));
      continue;
    }
    if (section === 'summary') out.push(block('summary', 'Professional Summary', line, text, out.length));
    else if (section === 'skill') for (const skill of line.split(/[,|]/).map((value) => value.trim()).filter(Boolean)) out.push(block(/^(python|sql|power bi|tableau|excel|r|javascript)/i.test(skill) ? 'tool' : 'skill', skill, skill, text, out.length));
    else if (section === 'experience') { experience = block('experience', line, line, text, out.length); out.push(experience); }
    else if (section === 'project') { project = block('project', line, line, text, out.length); out.push(project); }
    else if (section === 'education' || section === 'certification') out.push(block(section, line, line, text, out.length));
    else if (!out.length) out.push(block('identity', line, line, text, out.length));
  }
  return { blocks: out };
}
class MockResumeUnderstandingProvider { constructor({ response } = {}) { this.name = 'mock'; this.model = 'bounded-fixture'; this.response = response; } async checkConnection() { return true; } async understand(input) { return { provider: this.name, model: this.model, understanding: this.response || mockUnderstand(input) }; } }
class OpenAiCompatibleResumeUnderstandingProvider {
  constructor({ apiKey = process.env.CEP_LLM_API_KEY, baseUrl = process.env.CEP_LLM_BASE_URL, model = process.env.CEP_LLM_MODEL } = {}) { if (!apiKey || !model) throw new Error('LLM Resume Understanding requires an API key and model.'); this.apiKey = apiKey; this.baseUrl = baseUrl || 'https://api.openai.com/v1'; this.model = model; this.name = 'openai-compatible'; }
  async understand({ text }) {
    let response;
    try { response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: this.model, response_format: { type: 'json_schema', json_schema: { name: 'resume_understanding', strict: true, schema: RESUME_UNDERSTANDING_JSON_SCHEMA } }, messages: [{ role: 'system', content: 'Return only the schema-bound Resume Understanding response. Use only exact resume text; preserve explicit source section boundaries. Content under an explicit SUMMARY or PROFESSIONAL SUMMARY heading must use type summary. Preserve experience/project to responsibility/achievement relationships and mark uncertainty explicitly.' }, { role: 'user', content: text }] }) }); } catch { throw new ResumeUnderstandingProviderError(); }
    if (!response.ok) throw new ResumeUnderstandingProviderError();
    let envelope;
    try { envelope = await response.json(); } catch { return { provider: this.name, model: this.model, understanding: null, parseError: 'Provider returned an invalid response envelope.' }; }
    const raw = envelope.choices?.[0]?.message?.content;
    if (typeof raw !== 'string' || !raw.trim()) return { provider: this.name, model: this.model, understanding: null, parseError: 'Provider returned no structured content.' };
    try { return { provider: this.name, model: this.model, understanding: JSON.parse(raw) }; } catch { return { provider: this.name, model: this.model, understanding: null, parseError: 'Provider returned invalid structured JSON.' }; }
  }
  async checkConnection({ timeoutMs = 8000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const messages = [{ role: 'user', content: 'Reply exactly READY.' }];
    const probe = async (body) => {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('connection rejected');
      const envelope = await response.json();
      if (!envelope || typeof envelope !== 'object') throw new Error('connection response invalid');
      const content = envelope.choices?.[0]?.message?.content;
      return typeof content === 'string' && Boolean(content.trim());
    };
    try {
      if (await probe({ model: this.model, max_completion_tokens: 16, messages })) return true;
      if (await probe({ model: this.model, messages })) return true;
      throw new Error('connection response invalid');
    } catch {
      throw new ResumeUnderstandingProviderError();
    } finally {
      clearTimeout(timer);
    }
  }
}
function providerFromConfig(config = {}) { if ((config.provider || 'mock') === 'mock') return new MockResumeUnderstandingProvider(config); if (config.provider === 'openai-compatible') return new OpenAiCompatibleResumeUnderstandingProvider(config); throw new Error(`LLM Resume Understanding provider unavailable: ${config.provider}.`); }
function validateUnderstanding({ understanding, text, alignmentFindings = [] }) {
  const valid = []; const findings = [...alignmentFindings]; const seen = new Set(); const alignmentBlocked = new Set(alignmentFindings.map((finding) => finding.block_id));
  if (!understanding || typeof understanding !== 'object' || Array.isArray(understanding) || !Array.isArray(understanding.blocks)) return { valid_blocks: valid, findings: [{ block_id: null, severity: 'error', category: 'invalid_structured_response', message: 'Structured response must contain a blocks array.' }], status: 'blocked', invalid_structure: true };
  for (const candidate of understanding.blocks) {
    if (alignmentBlocked.has(candidate?.id || null)) continue;
    const issues = [];
    if (!BLOCK_TYPES.includes(candidate?.type)) issues.push(['unsupported_block_type', 'Unsupported block type.']);
    if (!candidate?.id || seen.has(candidate.id)) issues.push(['invalid_block_id', 'Block ID must be unique.']);
    if (!candidate?.exact_source_text || !text.includes(candidate.exact_source_text)) issues.push(['exact_source_text_not_found', 'Exact source text must map to the resume input.']);
    if (candidate?.parent_id && !understanding.blocks.some((item) => item?.id === candidate.parent_id)) issues.push(['invalid_parent_reference', 'Parent reference does not exist.']);
    if (!candidate?.state || !candidate?.confidence) issues.push(['missing_state_or_confidence', 'Uncertainty must be explicit through state and confidence.']);
    if (number.test(candidate?.normalized_meaning || '') && !number.test(candidate?.exact_source_text || '')) issues.push(['unsupported_normalized_metric', 'Normalized meaning introduces an unsupported number or metric.']);
    if (issues.length) findings.push({ block_id: candidate?.id || null, severity: 'error', category: issues.map(([category]) => category).join(','), message: issues.map(([, message]) => message).join(' ') }); else { seen.add(candidate.id); valid.push(candidate); }
  }
  const retainedIds = new Set(valid.map((candidate) => candidate.id)); const parentExcluded = valid.filter((candidate) => candidate.parent_id && !retainedIds.has(candidate.parent_id));
  for (const candidate of parentExcluded) findings.push({ block_id: candidate.id, severity: 'error', category: 'parent_not_retained', message: 'Parent reference did not retain valid source-bound evidence.' });
  const retained = valid.filter((candidate) => !parentExcluded.includes(candidate));
  return { valid_blocks: retained, findings, status: findings.length ? 'passed_with_excluded_blocks' : 'passed' };
}
function grouped(blocks) {
  const byId = new Map(blocks.map((item) => [item.id, item])); const cards = [];
  for (const item of blocks.filter((candidate) => candidate.type === 'experience' || candidate.type === 'project')) cards.push({ id: item.id, type: item.type, title: item.title, exact_source_text: item.exact_source_text, bullets: blocks.filter((candidate) => candidate.parent_id === item.id).map((candidate) => ({ id: candidate.id, text: candidate.exact_source_text, type: candidate.type })), technologies: [] });
  return { cards, compact: blocks.filter((item) => ['skill', 'tool', 'certification', 'education'].includes(item.type)).map((item) => ({ id: item.id, type: item.type, label: item.label, exact_source_text: item.exact_source_text })), orphaned: blocks.filter((item) => ['responsibility', 'achievement'].includes(item.type) && !byId.has(item.parent_id)).map((item) => ({ id: item.id, text: item.exact_source_text, state: 'uncertain' })) };
}
function approvedBlocks(blocks, decisions) { const decision = new Map((decisions || []).map((item) => [item.id, item])); return blocks.filter((item) => { const choice = decision.get(item.id); return choice?.action === 'accept' || choice?.action === 'edit'; }).map((item) => { const choice = decision.get(item.id); if (choice?.action !== 'edit') return item; const value = String(choice.value || '').trim(); const sourceTokens = new Set(item.exact_source_text.toLowerCase().match(/[a-z0-9]+/g) || []); const editTokens = value.toLowerCase().match(/[a-z0-9]+/g) || []; if (!value || editTokens.some((token) => !sourceTokens.has(token)) || number.test(value) !== number.test(item.exact_source_text)) throw new Error(`Edited evidence for ${item.id} must preserve its exact source-bound claim scope.`); return { ...item, normalized_meaning: value, limitations: [...item.limitations, 'User-normalized within exact source-bound vocabulary.'] }; }); }
function requirements(jobText) { return lines(jobText).filter((line) => /required|qualification|skill|experience/i.test(line)).map((text, index) => ({ id: `requirement-${index + 1}`, text })); }
function draft({ approved, jobText, careerUnderstanding = null }) {
  const byType = (type) => approved.filter((item) => item.type === type); const statements = []; const add = (section, text, evidence) => { if (evidence.length) statements.push({ section, text, supporting_evidence_block_ids: evidence.map((item) => item.id), job_requirement_ids: requirements(jobText).filter((req) => evidence.some((item) => req.text.toLowerCase().includes(item.title.toLowerCase()))).map((req) => req.id), rationale: 'Uses only approved resume evidence.' }); };
  const skills = [...byType('skill'), ...byType('tool')]; const work = [...byType('responsibility'), ...byType('achievement')]; const experiences = byType('experience'); const projects = byType('project');
  if (skills.length || work.length) add('Professional Summary', `Candidate with experience in ${skills.slice(0, 3).map((item) => item.title).join(', ') || 'the approved responsibilities'}${work.length ? ` and work including ${work[0].normalized_meaning}` : ''}.`, [...skills.slice(0, 3), ...work.slice(0, 1)]);
  for (const item of skills) add('Skills', item.title, [item]);
  for (const item of experiences) add('Experience', item.title, [item]);
  for (const item of work.filter((item) => item.parent_id && byType('experience').some((parent) => parent.id === item.parent_id))) add('Experience', item.normalized_meaning, [item, ...byType('experience').filter((parent) => parent.id === item.parent_id)]);
  for (const item of projects) add('Projects', item.title, [item]);
  for (const item of work.filter((item) => item.parent_id && byType('project').some((parent) => parent.id === item.parent_id))) add('Projects', item.normalized_meaning, [item, ...byType('project').filter((parent) => parent.id === item.parent_id)]);
  for (const item of byType('education')) add('Education', item.title, [item]); for (const item of byType('certification')) add('Certifications', item.title, [item]);
  return { sections: ['Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'].map((section) => ({ section, statements: statements.filter((item) => item.section === section) })).filter((section) => section.statements.length), career_understanding_used_for_emphasis_only: Boolean(careerUnderstanding) };
}
function validateDraft({ draft: value, approved }) { const ids = new Set(approved.map((item) => item.id)); const findings = []; for (const statement of value.sections.flatMap((section) => section.statements)) { if (!statement.supporting_evidence_block_ids?.length || statement.supporting_evidence_block_ids.some((item) => !ids.has(item))) findings.push({ severity: 'critical', statement: statement.text, message: 'Draft statement cites unapproved evidence.' }); if (number.test(statement.text) && !statement.supporting_evidence_block_ids.some((item) => number.test(approved.find((block) => block.id === item)?.exact_source_text || ''))) findings.push({ severity: 'critical', statement: statement.text, message: 'Draft statement introduces an unsupported metric.' }); }
  return { findings, status: findings.length ? 'failed' : 'passed' };
}
module.exports = { BLOCK_TYPES, BLOCK_STATES, CONFIDENCE_LEVELS, RESUME_UNDERSTANDING_JSON_SCHEMA, ResumeUnderstandingProviderError, MockResumeUnderstandingProvider, OpenAiCompatibleResumeUnderstandingProvider, providerFromConfig, mockUnderstand, alignUnderstanding, explicitSectionRanges, applyExplicitSectionBoundaries, validateUnderstanding, grouped, approvedBlocks, draft, validateDraft };
