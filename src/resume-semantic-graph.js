const POLICY_VERSION = 'resume-semantic-graph-policy/1.1.0';

const NODE_TYPES = new Set(['project', 'experience', 'responsibility', 'achievement', 'skill', 'tool', 'workflow', 'education', 'credential', 'domain']);
const TOOL_VOCABULARY = ['SQL', 'Python', 'JavaScript', 'TypeScript', 'React', 'Excel', 'Tableau', 'Power BI', 'AWS', 'Git', 'Docker'];
const ACTION_VERB = /\b(built|created|developed|designed|implemented|led|managed|analyzed|analysed|automated|improved|reduced|increased|delivered|maintained|optimized|optimised|migrated|launched|collaborated)\b/i;
const DATE_OR_TITLE = /\b(?:19|20)\d{2}\b|\b(?:intern|analyst|engineer|developer|manager|consultant|co-?op|project|platform|system|application|dashboard|console)\b/i;

function normalizeLabel(value) { return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function add(items, item, same) { if (!items.some((existing) => same(existing, item))) items.push(item); }
function spanOrder(a, b) { return (a.line_start ?? Number.MAX_SAFE_INTEGER) - (b.line_start ?? Number.MAX_SAFE_INTEGER) || (a.bullet_index ?? -1) - (b.bullet_index ?? -1) || a.id.localeCompare(b.id); }
function isWorkSection(span) { return ['projects', 'experience'].includes(span.section_name); }
function isHeading(span) { return normalizeLabel(span.raw_text) === normalizeLabel(span.section_name); }
function explicitToolIn(text) { return TOOL_VOCABULARY.filter((tool) => new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(text)); }
function anchorLike(span) { return isWorkSection(span) && span.bullet_index == null && !isHeading(span) && span.raw_text.length <= 160 && DATE_OR_TITLE.test(span.raw_text) && !ACTION_VERB.test(span.raw_text); }
function responsibilityLike(span) {
  return isWorkSection(span) && !isHeading(span) && (span.bullet_index != null || ACTION_VERB.test(span.raw_text));
}

function buildResumeSemanticGraph(semanticRun) {
  const nodes = []; const edges = [];
  const spans = [...semanticRun.spans].sort(spanOrder);
  const spanById = new Map(spans.map((span) => [span.id, span]));
  const entitiesBySpan = new Map();
  for (const entity of semanticRun.entities) {
    const list = entitiesBySpan.get(entity.evidence_span_id) || []; list.push(entity); entitiesBySpan.set(entity.evidence_span_id, list);
  }
  const nodeKeyByEntityId = new Map(); const nodeKeyByDerived = new Map();

  function nodeForEntity(entity) {
    if (!NODE_TYPES.has(entity.entity_type)) return null;
    const key = `node:${entity.id}`; nodeKeyByEntityId.set(entity.id, key);
    add(nodes, { key, node_type: entity.entity_type, normalized_label: normalizeLabel(entity.name), label: entity.name,
      decision_state: entity.decision_state, confidence: entity.decision_state === 'explicit' ? 'high' : 'medium', rationale: entity.rationale,
      evidence_span_ids: [entity.evidence_span_id] }, (a, b) => a.key === b.key);
    return key;
  }
  for (const entity of semanticRun.entities) nodeForEntity(entity);

  function derivedNode(kind, span, label, state, rationale) {
    const identity = `${kind}:${span.id}:${normalizeLabel(label)}`;
    if (!nodeKeyByDerived.has(identity)) {
      const key = `derived:${identity}`; nodeKeyByDerived.set(identity, key);
      add(nodes, { key, node_type: kind, normalized_label: normalizeLabel(label), label, decision_state: state,
        confidence: state === 'explicit' ? 'high' : 'medium', rationale, evidence_span_ids: [span.id] }, (a, b) => a.key === b.key);
    }
    return nodeKeyByDerived.get(identity);
  }
  function edge(fromKey, toKey, edgeType, state, rationale, spanIds) {
    if (!fromKey || !toKey || fromKey === toKey) return;
    add(edges, { from_key: fromKey, to_key: toKey, edge_type: edgeType, decision_state: state,
      confidence: state === 'explicit' ? 'high' : 'medium', rationale, evidence_span_ids: [...new Set(spanIds)].filter(Boolean) },
    (a, b) => a.from_key === b.from_key && a.to_key === b.to_key && a.edge_type === b.edge_type);
  }

  // Reconstruct only bounded structure persisted by 002.5: section, order, bullet index, span text, and entity provenance.
  const anchors = [];
  for (const span of spans) {
    if (!isWorkSection(span)) continue;
    const explicit = (entitiesBySpan.get(span.id) || []).find((entity) => ['project', 'experience'].includes(entity.entity_type));
    if (explicit) anchors.push({ span, key: nodeKeyByEntityId.get(explicit.id), type: explicit.entity_type, explicit: true });
    else if (anchorLike(span)) anchors.push({ span, key: derivedNode(span.section_name === 'projects' ? 'project' : 'experience', span, span.raw_text, 'derived_structurally', 'Conservative title/date anchor reconstructed from a non-bullet project or experience span.'), type: span.section_name === 'projects' ? 'project' : 'experience', explicit: false });
  }
  function nearestAnchor(span) {
    return [...anchors].reverse().find((anchor) => anchor.span.section_name === span.section_name && spanOrder(anchor.span, span) < 0) || null;
  }

  for (const span of spans) {
    if (!responsibilityLike(span)) continue;
    const spanEntities = entitiesBySpan.get(span.id) || [];
    const responsibilityEntity = spanEntities.find((entity) => entity.entity_type === 'responsibility');
    const anchor = nearestAnchor(span);
    const responsibilityState = anchor ? 'derived_structurally' : 'possible';
    const responsibilityKey = responsibilityEntity ? nodeKeyByEntityId.get(responsibilityEntity.id) : derivedNode('responsibility', span, span.raw_text, responsibilityState,
      anchor ? 'Responsibility reconstructed from a persisted bullet/action span and its nearest preceding anchor in the same section.' : 'Persisted bullet/action span has no unambiguous preceding anchor in the same section.');
    if (anchor) edge(responsibilityKey, anchor.key, 'performed_in', 'derived_structurally', 'Nearest preceding project or experience anchor within the same persisted section.', [span.id, anchor.span.id]);

    const explicitTools = spanEntities.filter((entity) => ['skill', 'tool'].includes(entity.entity_type) && entity.decision_state === 'explicit');
    const tools = new Map(explicitTools.map((entity) => [normalizeLabel(entity.name), nodeKeyByEntityId.get(entity.id)]));
    for (const tool of explicitToolIn(span.raw_text)) {
      const matchingEntity = semanticRun.entities.find((entity) => ['skill', 'tool'].includes(entity.entity_type) && entity.decision_state === 'explicit' && normalizeLabel(entity.name) === normalizeLabel(tool));
      tools.set(normalizeLabel(tool), matchingEntity && matchingEntity.evidence_span_id === span.id ? nodeKeyByEntityId.get(matchingEntity.id) : derivedNode('tool', span, tool, 'explicit', 'Exact versioned narrow-vocabulary tool wording appears in this persisted responsibility span.'));
    }
    for (const toolKey of tools.values()) {
      if (anchor) {
        edge(toolKey, anchor.key, 'used_in', 'derived_structurally', 'Exact tool wording is bounded by a responsibility structurally associated with the anchor.', [span.id, anchor.span.id]);
        edge(toolKey, responsibilityKey, 'supports', 'derived_structurally', 'Exact tool wording occurs in the same bounded responsibility span.', [span.id]);
      } else edge(toolKey, responsibilityKey, 'mentioned_with', 'possible', 'Exact tool wording shares an unanchored responsibility span; no stronger association is justified.', [span.id]);
    }

    const workflow = spanEntities.find((entity) => entity.entity_type === 'workflow') || (/\bworkflow automation\b/i.test(span.raw_text) ? { name: 'automation', id: null } : null);
    if (workflow && anchor) edge(workflow.id ? nodeKeyByEntityId.get(workflow.id) : derivedNode('workflow', span, workflow.name, 'derived_structurally', 'Exact workflow automation wording appears in the persisted responsibility span.'), anchor.key, 'part_of', 'derived_structurally', 'Workflow wording is bounded by a responsibility structurally associated with the anchor.', [span.id, anchor.span.id]);

    const achievement = spanEntities.find((entity) => entity.entity_type === 'achievement');
    if (achievement && anchor) edge(nodeKeyByEntityId.get(achievement.id), responsibilityKey, 'produced_by', 'derived_structurally', 'Explicit outcome candidate is contained in the bounded responsibility.', [span.id]);
  }
  return { semantic_run_id: semanticRun.id, policy_version: POLICY_VERSION, nodes, edges, source_artifact_id: semanticRun.artifact_id, source_artifact_version_id: semanticRun.artifact_version_id, span_count: spanById.size };
}

function runResumeSemanticGraphConstruction(store, { semanticRunId }) {
  return store.createResumeSemanticGraphRun({ semanticRunId, policyVersion: POLICY_VERSION, graph: buildResumeSemanticGraph(store.getResumeSemanticRun(semanticRunId)) });
}

module.exports = { POLICY_VERSION, NODE_TYPES, normalizeLabel, buildResumeSemanticGraph, runResumeSemanticGraphConstruction };
