const { createHash } = require('node:crypto');

const SCHEMA_VERSION = 'resume-ast/1.0.0';
const PROMPT_VERSION = 'resume-ast-extraction/1.0.0';
const VALIDATION_POLICY_VERSION = 'resume-ast-validation/1.0.0';
const RETRIEVER_VERSION = 'resume-ast-lexical-retriever/1.0.0';

function normalize(value) { return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function hash(value) { return createHash('sha256').update(String(value)).digest('hex'); }
function linesFor(text) { return String(text).replace(/\r/g, '').split('\n').map((raw_text, index) => ({ id: `line-${index + 1}`, raw_text, line_start: index + 1, line_end: index + 1 })).filter((line) => line.raw_text.trim()); }
function provenance(text, line) { return { source_span_ids: [line.id], exact_source_text: text, source_line_start: line.line_start, source_line_end: line.line_end, extraction_state: 'explicit', confidence: 'high', rationale: 'Mock extraction copied the exact source line.' }; }
function leaf(text, line) { return { value: text, provenance: provenance(text, line) }; }

// Offline mock: deliberately narrow and deterministic. It is test/demo infrastructure, not a substitute for a provider.
function mockAst(text) {
  const lines = linesFor(text); const ast = { identity: null, summary_blocks: [], education: [], credentials: [], skills: [], experiences: [], projects: [], additional_sections: [] };
  let section = ''; let current = null;
  for (const line of lines) {
    const raw = line.raw_text.trim(); const heading = normalize(raw.replace(/:$/, ''));
    if (['experience', 'work experience'].includes(heading)) { section = 'experiences'; current = null; continue; }
    if (['projects', 'project'].includes(heading)) { section = 'projects'; current = null; continue; }
    if (['skills', 'technical skills'].includes(heading)) { section = 'skills'; current = null; continue; }
    if (['education', 'credentials', 'certifications'].includes(heading)) { section = heading; current = null; continue; }
    if (!ast.identity && /^[A-Z][A-Za-z' -]{2,}$/.test(raw) && !raw.includes(',')) { ast.identity = leaf(raw, line); continue; }
    if (section === 'skills') { raw.split(/[,;|]/).map((value) => value.trim()).filter(Boolean).forEach((value) => ast.skills.push(leaf(value, line))); continue; }
    if (section === 'experiences' || section === 'projects') {
      if (/^[•*-]\s+/.test(raw)) { if (current) current.bullets.push(leaf(raw.replace(/^[•*-]\s+/, ''), line)); continue; }
      current = { ...(section === 'projects' ? { title: leaf(raw, line), technologies: [] } : { organization: leaf(raw, line), role: null, location: null }), start_date: null, end_date: null, bullets: [] };
      ast[section].push(current); continue;
    }
    if (section === 'education') ast.education.push({ institution: leaf(raw, line) });
    else if (section === 'credentials' || section === 'certifications') ast.credentials.push(leaf(raw, line));
  }
  return ast;
}

class MockResumeAstProvider { constructor({ response } = {}) { this.response = response; this.name = 'mock'; this.model = 'deterministic-fixture'; }
  extractResumeAst({ text }) { const ast = this.response || mockAst(text); return { provider: this.name, model: this.model, version: SCHEMA_VERSION, rawResponse: JSON.stringify(ast), ast }; }
}
class OpenAiCompatibleResumeAstProvider { constructor({ apiKey = process.env.CEP_LLM_API_KEY, baseUrl = process.env.CEP_LLM_BASE_URL, model = process.env.CEP_LLM_MODEL } = {}) { if (!apiKey || !model) throw new Error('OpenAI-compatible provider unavailable: set CEP_LLM_API_KEY and CEP_LLM_MODEL.'); this.apiKey = apiKey; this.baseUrl = baseUrl || 'https://api.openai.com/v1'; this.model = model; this.name = 'openai-compatible'; }
  async extractResumeAst({ text, schema, promptVersion }) { const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: this.model, response_format: { type: 'json_schema', json_schema: { name: 'resume_ast', strict: true, schema } }, messages: [{ role: 'system', content: `Extract only resume structure. Every leaf must carry source provenance. Prompt ${promptVersion}.` }, { role: 'user', content: text }] }) }); if (!response.ok) throw new Error(`Resume AST provider failed: ${response.status}`); const json = await response.json(); const rawResponse = json.choices?.[0]?.message?.content; if (!rawResponse) throw new Error('Resume AST provider returned no structured content.'); return { provider: this.name, model: this.model, version: SCHEMA_VERSION, rawResponse, ast: JSON.parse(rawResponse) }; }
}
function providerFromConfig(config = {}) { const provider = config.provider || process.env.CEP_LLM_PROVIDER || 'mock'; if (provider === 'mock') return new MockResumeAstProvider(config); if (provider === 'openai-compatible') return new OpenAiCompatibleResumeAstProvider(config); throw new Error(`Resume AST provider unavailable: ${provider}. Use mock or openai-compatible.`); }

function validateAst({ ast, text }) {
  const findings = []; const sourceLines = linesFor(text); const spanById = new Map(sourceLines.map((line) => [line.id, line]));
  function check(value, path) { if (!value || typeof value.value !== 'string' || !value.provenance) { findings.push({ severity: 'error', path, message: 'Leaf does not satisfy the canonical schema.' }); return false; } const p = value.provenance; const spans = (p.source_span_ids || []).map((id) => spanById.get(id)).filter(Boolean); const reconstructed = spans.map((span) => span.raw_text.trim().replace(/^[•*-]\s+/, '')).join(' '); if (!spans.length || !normalize(reconstructed).includes(normalize(value.value)) || normalize(p.exact_source_text) !== normalize(value.value)) { findings.push({ severity: 'error', path, message: 'Value is not traceable to exact or adjacent reconstructable source text.' }); return false; } return true; }
  function clean(value, path) { return check(value, path) ? value : null; }
  const output = { identity: ast?.identity ? clean(ast.identity, 'identity') : null, summary_blocks: [], education: [], credentials: [], skills: [], experiences: [], projects: [], additional_sections: [] };
  for (const key of ['summary_blocks', 'credentials', 'skills', 'additional_sections']) for (const [i, value] of (ast?.[key] || []).entries()) { const valid = clean(value, `${key}[${i}]`); if (valid) output[key].push(valid); }
  for (const [i, item] of (ast?.education || []).entries()) { const institution = clean(item.institution, `education[${i}].institution`); if (institution) output.education.push({ institution }); }
  for (const [i, item] of (ast?.experiences || []).entries()) { const organization = clean(item.organization, `experiences[${i}].organization`); const role = item.role ? clean(item.role, `experiences[${i}].role`) : null; const bullets = (item.bullets || []).map((v, j) => clean(v, `experiences[${i}].bullets[${j}]`)).filter(Boolean); if (organization) output.experiences.push({ organization, role, location: item.location ? clean(item.location, `experiences[${i}].location`) : null, start_date: item.start_date ? clean(item.start_date, `experiences[${i}].start_date`) : null, end_date: item.end_date ? clean(item.end_date, `experiences[${i}].end_date`) : null, bullets }); }
  for (const [i, item] of (ast?.projects || []).entries()) { const title = clean(item.title, `projects[${i}].title`); const technologies = (item.technologies || []).map((v, j) => clean(v, `projects[${i}].technologies[${j}]`)).filter(Boolean); const bullets = (item.bullets || []).map((v, j) => clean(v, `projects[${i}].bullets[${j}]`)).filter(Boolean); if (title) output.projects.push({ title, technologies, start_date: item.start_date ? clean(item.start_date, `projects[${i}].start_date`) : null, end_date: item.end_date ? clean(item.end_date, `projects[${i}].end_date`) : null, bullets }); }
  return { normalizedAst: output, findings, validation_status: findings.some((item) => item.severity === 'error') ? 'blocked' : 'passed' };
}
function blocks(ast) { const items = []; for (const skill of ast.skills || []) items.push({ text: skill.value, leaf: skill, kind: 'skill', section: 'skills' }); for (const project of ast.projects || []) { items.push({ text: project.title.value, leaf: project.title, kind: 'project', section: 'projects' }); for (const bullet of project.bullets) items.push({ text: bullet.value, leaf: bullet, kind: 'bullet', section: 'projects' }); } for (const experience of ast.experiences || []) { items.push({ text: experience.organization.value, leaf: experience.organization, kind: 'experience', section: 'experiences' }); if (experience.role) items.push({ text: experience.role.value, leaf: experience.role, kind: 'role', section: 'experiences' }); for (const bullet of experience.bullets) items.push({ text: bullet.value, leaf: bullet, kind: 'bullet', section: 'experiences' }); } return items; }
function retrieve(requirement, ast) { const terms = normalize(requirement.normalized_name || requirement.name).split(/\s+/).filter((term) => term.length > 1); return blocks(ast).map((block) => ({ block, exact: normalize(block.text).includes(normalize(requirement.normalized_name || requirement.name)), score: terms.filter((term) => normalize(block.text).includes(term)).length + (block.kind === 'skill' ? 2 : 0) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.block.text.localeCompare(b.block.text)); }
module.exports = { SCHEMA_VERSION, PROMPT_VERSION, VALIDATION_POLICY_VERSION, RETRIEVER_VERSION, hash, MockResumeAstProvider, OpenAiCompatibleResumeAstProvider, providerFromConfig, validateAst, retrieve };
