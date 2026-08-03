const POLICY_VERSION = 'resume-semantic-policy/1.0.0';

const SECTIONS = new Map([
  ['skills', 'skills'], ['technical skills', 'skills'], ['tools', 'skills'], ['projects', 'projects'],
  ['experience', 'experience'], ['work experience', 'experience'], ['education', 'education'],
  ['certifications', 'credentials'], ['certificates', 'credentials'], ['credentials', 'credentials'],
]);
const VOCABULARY = [
  ['regression model', 'regression analysis', 'domain_knowledge', 'derived_structurally', 'Narrow policy mapping: exact “regression model” wording supports regression analysis.'],
  ['workflow automation', 'automation', 'workflow', 'derived_structurally', 'Narrow policy mapping: exact “workflow automation” wording supports automation workflow.'],
  ['data ingestion', 'data ingestion', 'responsibility', 'derived_structurally', 'Narrow policy mapping: exact “data ingestion” wording is preserved as a responsibility.'],
  ['caching', 'caching', 'responsibility', 'derived_structurally', 'Narrow policy mapping: exact “caching” wording is preserved as a responsibility.'],
  ['visualization', 'data visualization', 'domain_knowledge', 'derived_structurally', 'Narrow policy mapping: visualization wording supports data visualization.'],
];
const TOOLS = ['SQL', 'Python', 'JavaScript', 'TypeScript', 'React', 'Excel', 'Tableau', 'Power BI', 'AWS', 'Git', 'Docker'];

function heading(line) { return SECTIONS.get(line.replace(/:$/, '').trim().toLowerCase()); }
function bullet(line) { return /^[•*\-–—]\s+/.test(line); }
function likelyAnchor(section, text) {
  if (['projects', 'experience'].includes(section) && !bullet(text) && text.length <= 120) return true;
  return false;
}
function span(key, section, bulletIndex, line, raw) { return { key, section_name: section, bullet_index: bulletIndex, line_start: line, line_end: line, raw_text: raw }; }
function addEntity(result, entity) { if (!result.entities.some((item) => item.key === entity.key)) result.entities.push(entity); }

function understandResume(text) {
  const result = { spans: [], entities: [], relations: [] };
  let section = null; let anchor = null; let bulletIndex = 0; let sequence = 0;
  const lines = text.replace(/\r/g, '').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim(); if (!raw) continue;
    const detected = heading(raw);
    if (detected) { section = detected; anchor = null; bulletIndex = 0; const key = `span-${++sequence}`; result.spans.push(span(key, section, null, index + 1, raw)); continue; }
    const isBullet = bullet(raw); const clean = raw.replace(/^[•*\-–—]\s+/, '').trim(); const spanKey = `span-${++sequence}`;
    result.spans.push(span(spanKey, section, isBullet ? ++bulletIndex : null, index + 1, clean));
    if (section === 'skills') {
      for (const name of clean.split(/[,;|]/).map((item) => item.trim()).filter(Boolean)) addEntity(result, { key: `skill-${name.toLowerCase()}-${spanKey}`, span_key: spanKey, entity_type: TOOLS.some((tool) => tool.toLowerCase() === name.toLowerCase()) ? 'tool' : 'skill', name, decision_state: 'explicit', rationale: 'Explicitly listed in a Skills/Tools section.', attributes: {} });
      continue;
    }
    if (['education', 'credentials'].includes(section)) {
      addEntity(result, { key: `${section}-${spanKey}`, span_key: spanKey, entity_type: section === 'education' ? 'education' : 'credential', name: clean, decision_state: 'explicit', rationale: `Explicitly listed in the ${section} section.`, attributes: {} });
      continue;
    }
    if (likelyAnchor(section, raw)) {
      const entityType = section === 'projects' ? 'project' : 'experience'; const key = `${entityType}-${spanKey}`;
      addEntity(result, { key, span_key: spanKey, entity_type: entityType, name: clean, decision_state: 'explicit', rationale: `Heading-like anchor in the ${section} section.`, attributes: {} }); anchor = { key, type: entityType }; continue;
    }
    if (!isBullet) continue;
    const responsibilityKey = `responsibility-${spanKey}`;
    addEntity(result, { key: responsibilityKey, span_key: spanKey, entity_type: 'responsibility', name: clean, decision_state: anchor ? 'derived_structurally' : 'possible', rationale: anchor ? 'Bullet structurally associated with the nearest anchor.' : 'Bullet has no unambiguous nearest project or experience anchor.', attributes: {} });
    if (anchor) result.relations.push({ from_key: responsibilityKey, to_key: anchor.key, relation_type: anchor.type === 'project' ? 'used_in' : 'performed_in', decision_state: 'derived_structurally', rationale: 'Nearest-anchor association; does not assert ownership or leadership.' });
    for (const tool of TOOLS) if (new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(clean)) {
      const key = `tool-${tool.toLowerCase()}-${spanKey}`;
      addEntity(result, { key, span_key: spanKey, entity_type: 'tool', name: tool, decision_state: 'explicit', rationale: 'Exact tool wording appears in the resume bullet.', attributes: {} });
      if (anchor) result.relations.push({ from_key: key, to_key: anchor.key, relation_type: 'used_in', decision_state: 'derived_structurally', rationale: 'Tool and anchor are co-located in the same bullet context.' });
      result.relations.push({ from_key: key, to_key: responsibilityKey, relation_type: 'mentioned_with', decision_state: 'explicit', rationale: 'Exact tool wording appears in the responsibility bullet.' });
    }
    for (const [phrase, name, entityType, state, rationale] of VOCABULARY) if (clean.toLowerCase().includes(phrase)) {
      const key = `vocab-${name}-${spanKey}`;
      addEntity(result, { key, span_key: spanKey, entity_type: entityType, name, decision_state: state, rationale, attributes: { policy_phrase: phrase } });
      result.relations.push({ from_key: key, to_key: responsibilityKey, relation_type: 'supports', decision_state: state, rationale });
    }
    const quantity = clean.match(/\b\d+(?:\.\d+)?(?:%|\+)?\b/);
    if (quantity && /\b(increased|reduced|improved|saved|grew|decreased|cut)\b/i.test(clean)) addEntity(result, { key: `achievement-${spanKey}`, span_key: spanKey, entity_type: 'achievement', name: clean, decision_state: 'explicit', rationale: 'Number and outcome verb are both explicit in the bullet.', attributes: { quantified_result: quantity[0] } });
  }
  return result;
}

function runResumeSemanticUnderstanding(store, { profileId, artifactId }) { return store.createResumeSemanticRun({ profileId, artifactId, policyVersion: POLICY_VERSION, parsed: understandResume(store.getSourceResumeArtifact(artifactId).versions.at(-1).parsed_text) }); }
module.exports = { POLICY_VERSION, understandResume, runResumeSemanticUnderstanding };
