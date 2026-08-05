// Preferred real-resume beta path. The AST pipeline remains legacy/diagnostic.
const BLOCK_TYPES = ['identity', 'education', 'certification', 'skill', 'experience', 'project', 'responsibility', 'achievement', 'tool'];
const SECTION_FOR = { identity: 'Professional Summary', skill: 'Skills', tool: 'Skills', experience: 'Experience', responsibility: 'Experience', achievement: 'Experience', project: 'Projects', education: 'Education', certification: 'Certifications' };
const number = /\b\d+(?:[,.]\d+)?(?:\s*%|\s*(?:hours?|days?|years?|users?|customers?|dollars?)\b)/i;
const id = (type, index) => `${type}-${index + 1}`;
const sourceSpan = (text, exact) => { const start = text.indexOf(exact); return start < 0 ? null : { start, end: start + exact.length }; };

function block(type, title, exact, text, index, extra = {}) {
  return { id: id(type, index), type, title, label: title, exact_source_text: exact, source_location: sourceSpan(text, exact), parent_id: extra.parent_id || null, normalized_meaning: extra.normalized_meaning || exact, confidence: extra.confidence || 'medium', state: extra.state || 'confirmed', provenance: { source: 'resume_input', exact_source_text: exact }, limitations: extra.limitations || [] };
}
function lines(text) { return text.replace(/\r/g, '').split('\n').map((value) => value.trim()).filter(Boolean); }
function mockUnderstand({ text }) {
  const out = []; let section = ''; let experience = null; let project = null;
  for (const line of lines(text)) {
    if (/^(experience|employment|work experience)$/i.test(line)) { section = 'experience'; continue; }
    if (/^(projects?|selected projects?)$/i.test(line)) { section = 'project'; continue; }
    if (/^(skills?|technical skills?|tools?)$/i.test(line)) { section = 'skill'; continue; }
    if (/^(education)$/i.test(line)) { section = 'education'; continue; }
    if (/^(certifications?|certificates?)$/i.test(line)) { section = 'certification'; continue; }
    if (/^[•-]\s*/.test(line)) {
      const parent = section === 'project' ? project : experience;
      out.push(block(number.test(line) ? 'achievement' : 'responsibility', line.replace(/^[•-]\s*/, ''), line, text, out.length, { parent_id: parent?.id || null, state: parent ? 'confirmed' : 'uncertain', limitations: parent ? [] : ['Parent heading was not confidently identified.'] }));
      continue;
    }
    if (section === 'skill') for (const skill of line.split(/[,|]/).map((value) => value.trim()).filter(Boolean)) out.push(block(/^(python|sql|power bi|tableau|excel|r|javascript)/i.test(skill) ? 'tool' : 'skill', skill, skill, text, out.length));
    else if (section === 'experience') { experience = block('experience', line, line, text, out.length); out.push(experience); }
    else if (section === 'project') { project = block('project', line, line, text, out.length); out.push(project); }
    else if (section === 'education' || section === 'certification') out.push(block(section, line, line, text, out.length));
    else if (!out.length) out.push(block('identity', line, line, text, out.length));
  }
  return { blocks: out };
}
class MockResumeUnderstandingProvider { constructor({ response } = {}) { this.name = 'mock'; this.model = 'bounded-fixture'; this.response = response; } async understand(input) { return { provider: this.name, model: this.model, understanding: this.response || mockUnderstand(input) }; } }
function validateUnderstanding({ understanding, text }) {
  const valid = []; const findings = []; const seen = new Set();
  for (const candidate of understanding?.blocks || []) {
    const issues = [];
    if (!BLOCK_TYPES.includes(candidate.type)) issues.push('Unsupported block type.');
    if (!candidate.id || seen.has(candidate.id)) issues.push('Block ID must be unique.');
    if (!candidate.exact_source_text || !text.includes(candidate.exact_source_text)) issues.push('Exact source text must map to the resume input.');
    if (candidate.parent_id && ![...(understanding?.blocks || [])].some((item) => item.id === candidate.parent_id)) issues.push('Parent reference does not exist.');
    if (!candidate.state || !candidate.confidence) issues.push('Uncertainty must be explicit through state and confidence.');
    if (number.test(candidate.normalized_meaning || '') && !number.test(candidate.exact_source_text || '')) issues.push('Normalized meaning introduces an unsupported number or metric.');
    if (issues.length) findings.push({ block_id: candidate.id || null, severity: 'error', message: issues.join(' ') }); else { seen.add(candidate.id); valid.push(candidate); }
  }
  return { valid_blocks: valid, findings, status: findings.length ? 'passed_with_excluded_blocks' : 'passed' };
}
function grouped(blocks) {
  const byId = new Map(blocks.map((item) => [item.id, item])); const cards = [];
  for (const item of blocks.filter((candidate) => candidate.type === 'experience' || candidate.type === 'project')) cards.push({ id: item.id, type: item.type, title: item.title, exact_source_text: item.exact_source_text, bullets: blocks.filter((candidate) => candidate.parent_id === item.id).map((candidate) => ({ id: candidate.id, text: candidate.exact_source_text, type: candidate.type })), technologies: [] });
  return { cards, compact: blocks.filter((item) => ['skill', 'tool', 'certification', 'education'].includes(item.type)).map((item) => ({ id: item.id, type: item.type, label: item.label, exact_source_text: item.exact_source_text })), orphaned: blocks.filter((item) => ['responsibility', 'achievement'].includes(item.type) && !byId.has(item.parent_id)).map((item) => ({ id: item.id, text: item.exact_source_text, state: 'uncertain' })) };
}
function approvedBlocks(blocks, decisions) { const decision = new Map((decisions || []).map((item) => [item.id, item])); return blocks.filter((item) => { const choice = decision.get(item.id); return choice?.action === 'accept' || choice?.action === 'edit'; }).map((item) => { const choice = decision.get(item.id); return choice?.action === 'edit' ? { ...item, normalized_meaning: choice.value, exact_source_text: item.exact_source_text, limitations: [...item.limitations, 'User-normalized during confirmation.'] } : item; }); }
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
module.exports = { BLOCK_TYPES, MockResumeUnderstandingProvider, mockUnderstand, validateUnderstanding, grouped, approvedBlocks, draft, validateDraft };
