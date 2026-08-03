const POLICY_VERSION = 'resume-semantic-policy/1.1.0';

const SECTION_ALIASES = new Map([
  ['summary', 'summary'], ['professional summary', 'summary'], ['skills', 'skills'], ['technical skills', 'skills'], ['tools', 'skills'],
  ['education', 'education'], ['certifications', 'credentials'], ['certificates', 'credentials'], ['credentials', 'credentials'],
  ['experience', 'experience'], ['work experience', 'experience'], ['professional experience', 'experience'], ['projects', 'projects'],
  ['data analysis visualization and modeling experience', 'experience'],
]);
const TOOLS = ['SQL', 'Python', 'JavaScript', 'TypeScript', 'React', 'Excel', 'Tableau', 'Power BI', 'AWS', 'Git', 'Docker'];
const BULLET = /^[\u2022\u2023\u25e6\uf0b7\u00b7\-\u2013\u2014*]+\s*/;
const GLYPH_ONLY = /^[\u2022\u2023\u25e6\uf0b7\u00b7\-\u2013\u2014*]+$/;

function normalizeHeading(line) { return line.replace(/[():]/g, ' ').replace(/&/g, ' and ').replace(/\s+/g, ' ').trim().toLowerCase(); }
function heading(line) {
  const value = normalizeHeading(line);
  if (SECTION_ALIASES.has(value)) return SECTION_ALIASES.get(value);
  if (/\bprojects?\b/.test(value) && !/[.!?]/.test(line)) return 'projects';
  if (/\bexperience\b/.test(value) && !/[.!?]/.test(line)) return 'experience';
  return null;
}
function bullet(line) { return BULLET.test(line); }
function cleanBullet(line) { return line.replace(BULLET, '').trim(); }
function likelyAnchor(section, text) { return ['projects', 'experience'].includes(section) && text.length <= 140 && !/[.!?]$/.test(text) && !bullet(text); }
function span(key, section, bulletIndex, start, end, raw) { return { key, section_name: section, bullet_index: bulletIndex, line_start: start, line_end: end, raw_text: raw }; }
function addEntity(result, entity) { if (!result.entities.some((item) => item.key === entity.key)) result.entities.push(entity); }
function link(result, relation) { if (!result.relations.some((item) => item.from_key === relation.from_key && item.to_key === relation.to_key && item.relation_type === relation.relation_type)) result.relations.push(relation); }

function logicalLines(text) {
  const output = []; const lines = text.replace(/\r/g, '').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim(); if (!raw || GLYPH_ONLY.test(raw)) continue;
    if (bullet(raw)) { output.push({ text: cleanBullet(raw), start: index + 1, end: index + 1, isBullet: true }); continue; }
    const previous = output.at(-1);
    if (previous?.isBullet && !heading(raw) && (lines[index].match(/^\s+/) || !/^[A-Z][A-Z ,&()/-]{4,}$/.test(raw)) && !likelyAnchor('projects', raw)) {
      previous.text = `${previous.text} ${raw}`.replace(/\s+/g, ' '); previous.end = index + 1; continue;
    }
    output.push({ text: raw, start: index + 1, end: index + 1, isBullet: false });
  }
  return output;
}

function understandResume(text) {
  const result = { spans: [], entities: [], relations: [] }; let section = null; let anchor = null; let bulletIndex = 0; let sequence = 0;
  for (const item of logicalLines(text)) {
    const detected = heading(item.text);
    if (detected) { section = detected; anchor = null; bulletIndex = 0; result.spans.push(span(`span-${++sequence}`, section, null, item.start, item.end, item.text)); continue; }
    const spanKey = `span-${++sequence}`; result.spans.push(span(spanKey, section, item.isBullet ? ++bulletIndex : null, item.start, item.end, item.text));
    if (section === 'skills') { for (const name of item.text.split(/[,;|]/).map((value) => value.trim()).filter(Boolean)) addEntity(result, { key: `skill-${name.toLowerCase()}-${spanKey}`, span_key: spanKey, entity_type: TOOLS.some((tool) => tool.toLowerCase() === name.toLowerCase()) ? 'tool' : 'skill', name, decision_state: 'explicit', rationale: 'Exact named skill or tool is explicitly listed.', attributes: {} }); continue; }
    if (['education', 'credentials'].includes(section)) { addEntity(result, { key: `${section}-${spanKey}`, span_key: spanKey, entity_type: section === 'education' ? 'education' : 'credential', name: item.text, decision_state: 'explicit', rationale: `Explicitly listed in the ${section} section.`, attributes: {} }); continue; }
    if (likelyAnchor(section, item.text)) { const type = section === 'projects' ? 'project' : 'experience'; const key = `${type}-${spanKey}`; addEntity(result, { key, span_key: spanKey, entity_type: type, name: item.text, decision_state: 'explicit', rationale: `Explicit anchor in the ${section} section.`, attributes: {} }); anchor = { key, type }; continue; }
    if (!item.isBullet) continue;
    const responsibilityKey = `responsibility-${spanKey}`; addEntity(result, { key: responsibilityKey, span_key: spanKey, entity_type: 'responsibility', name: item.text, decision_state: anchor ? 'derived_structurally' : 'possible', rationale: anchor ? 'Bullet is structurally associated with the nearest preceding anchor.' : 'Bullet has no unambiguous project or experience anchor.', attributes: {} });
    if (anchor) link(result, { from_key: responsibilityKey, to_key: anchor.key, relation_type: 'performed_in', decision_state: 'derived_structurally', rationale: 'Nearest-anchor association within a section.' });
    if (/\bworkflow automation\b/i.test(item.text)) addEntity(result, { key: `workflow-automation-${spanKey}`, span_key: spanKey, entity_type: 'workflow', name: 'automation', decision_state: 'derived_structurally', rationale: 'Exact workflow automation wording supports this narrow normalized label.', attributes: { policy_phrase: 'workflow automation' } });
    for (const tool of TOOLS) if (new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(item.text)) { const key = `tool-${tool.toLowerCase()}-${spanKey}`; addEntity(result, { key, span_key: spanKey, entity_type: 'tool', name: tool, decision_state: 'explicit', rationale: 'Exact tool wording appears in the source bullet.', attributes: {} }); if (anchor) link(result, { from_key: key, to_key: anchor.key, relation_type: 'used_in', decision_state: 'derived_structurally', rationale: 'Tool and anchor co-occur in the same bounded bullet context.' }); }
    const quantity = item.text.match(/\b\d+(?:\.\d+)?(?:%|\+)?\b/);
    if (quantity && /\b(increased|reduced|improved|saved|grew|decreased|cut)\b/i.test(item.text)) { const key = `achievement-${spanKey}`; addEntity(result, { key, span_key: spanKey, entity_type: 'achievement', name: item.text, decision_state: 'explicit', rationale: 'An explicit numeric result and outcome verb appear together.', attributes: { quantified_result: quantity[0] } }); if (anchor) link(result, { from_key: key, to_key: responsibilityKey, relation_type: 'produced', decision_state: 'derived_structurally', rationale: 'Explicit result is contained in the bounded responsibility.' }); }
  }
  return result;
}
function runResumeSemanticUnderstanding(store, { profileId, artifactId }) { return store.createResumeSemanticRun({ profileId, artifactId, policyVersion: POLICY_VERSION, parsed: understandResume(store.getSourceResumeArtifact(artifactId).versions.at(-1).parsed_text) }); }
module.exports = { POLICY_VERSION, understandResume, runResumeSemanticUnderstanding };
