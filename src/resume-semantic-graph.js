const POLICY_VERSION = 'resume-semantic-graph-policy/1.0.0';

const NODE_TYPES = new Set(['project', 'experience', 'responsibility', 'achievement', 'skill', 'tool', 'workflow', 'education', 'credential', 'domain']);

function normalizeLabel(value) { return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function add(items, item, same) { if (!items.some((existing) => same(existing, item))) items.push(item); }

function buildResumeSemanticGraph(semanticRun) {
  const nodes = []; const edges = [];
  const spanById = new Map(semanticRun.spans.map((span) => [span.id, span]));
  const entityById = new Map(semanticRun.entities.map((entity) => [entity.id, entity]));
  const nodeKeyByEntityId = new Map();

  for (const entity of semanticRun.entities) {
    if (!NODE_TYPES.has(entity.entity_type)) continue;
    const key = `node:${entity.id}`;
    nodeKeyByEntityId.set(entity.id, key);
    add(nodes, {
      key, node_type: entity.entity_type, normalized_label: normalizeLabel(entity.name), label: entity.name,
      decision_state: entity.decision_state, confidence: entity.decision_state === 'explicit' ? 'high' : 'medium',
      rationale: entity.rationale, evidence_span_ids: [entity.evidence_span_id],
    }, (a, b) => a.key === b.key);
  }

  function edge(fromId, toId, edgeType, state, rationale, spanIds) {
    const fromKey = nodeKeyByEntityId.get(fromId); const toKey = nodeKeyByEntityId.get(toId);
    if (!fromKey || !toKey || fromKey === toKey) return;
    add(edges, { from_key: fromKey, to_key: toKey, edge_type: edgeType, decision_state: state, confidence: state === 'explicit' ? 'high' : 'medium', rationale, evidence_span_ids: [...new Set(spanIds)].filter(Boolean) }, (a, b) => a.from_key === b.from_key && a.to_key === b.to_key && a.edge_type === b.edge_type);
  }

  for (const relation of semanticRun.relations) {
    if (relation.relation_type === 'performed_in' || relation.relation_type === 'used_in') {
      const from = entityById.get(relation.from_entity_candidate_id); const to = entityById.get(relation.to_entity_candidate_id);
      edge(relation.from_entity_candidate_id, relation.to_entity_candidate_id, relation.relation_type, relation.decision_state, relation.rationale, [from?.evidence_span_id, to?.evidence_span_id]);
    }
  }

  const entitiesBySpan = new Map();
  for (const entity of semanticRun.entities) {
    const list = entitiesBySpan.get(entity.evidence_span_id) || []; list.push(entity); entitiesBySpan.set(entity.evidence_span_id, list);
  }
  for (const [spanId, entities] of entitiesBySpan) {
    const responsibility = entities.find((entity) => entity.entity_type === 'responsibility');
    const anchor = [...semanticRun.entities].filter((entity) => ['project', 'experience'].includes(entity.entity_type))
      .find((entity) => semanticRun.relations.some((relation) => relation.from_entity_candidate_id === responsibility?.id && relation.to_entity_candidate_id === entity.id && relation.relation_type === 'performed_in'));
    for (const entity of entities.filter((item) => ['skill', 'tool'].includes(item.entity_type))) {
      if (responsibility) edge(entity.id, responsibility.id, 'supports', 'derived_structurally', 'Exact skill/tool and responsibility occur in the same bounded bullet.', [spanId]);
      if (!anchor && responsibility) edge(entity.id, responsibility.id, 'mentioned_with', 'possible', 'Same-bullet co-occurrence does not establish an unambiguous anchor.', [spanId]);
    }
    for (const workflow of entities.filter((item) => item.entity_type === 'workflow')) if (anchor) edge(workflow.id, anchor.id, 'part_of', 'derived_structurally', 'Workflow wording occurs in a responsibility structurally associated with the anchor.', [spanId]);
    for (const achievement of entities.filter((item) => item.entity_type === 'achievement')) {
      if (responsibility) edge(achievement.id, responsibility.id, 'produced_by', 'derived_structurally', 'Explicit outcome wording is contained in the bounded responsibility.', [spanId]);
      else if (anchor) edge(achievement.id, anchor.id, 'produced_by', 'derived_structurally', 'Explicit outcome wording is bounded by the project or experience anchor.', [spanId]);
    }
  }
  return { semantic_run_id: semanticRun.id, policy_version: POLICY_VERSION, nodes, edges, source_artifact_id: semanticRun.artifact_id, source_artifact_version_id: semanticRun.artifact_version_id, span_count: spanById.size };
}

function runResumeSemanticGraphConstruction(store, { semanticRunId }) {
  return store.createResumeSemanticGraphRun({ semanticRunId, policyVersion: POLICY_VERSION, graph: buildResumeSemanticGraph(store.getResumeSemanticRun(semanticRunId)) });
}

module.exports = { POLICY_VERSION, NODE_TYPES, normalizeLabel, buildResumeSemanticGraph, runResumeSemanticGraphConstruction };
