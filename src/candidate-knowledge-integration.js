const POLICY_VERSION = 'candidate-knowledge-integration-policy/1.0.0';
const ENTITY_TYPES = new Set(['skill', 'project', 'experience', 'education', 'credential', 'responsibility', 'achievement', 'domain_knowledge']);
const DECISIONS = new Set(['accepted', 'needs_confirmation', 'rejected', 'conflicting', 'duplicate', 'deferred']);
const RELATIONS = new Set(['new', 'confirms', 'extends', 'supersedes']);
const FORBIDDEN_KEYS = new Set(['proficiency', 'years', 'years_of_experience', 'leadership', 'communication_quality', 'impact', 'ownership', 'outcome_metrics']);

function normalized(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function identity(entityType, value) {
  if (!value || typeof value !== 'object') return null;
  if (entityType === 'skill') return `${entityType}:${normalized(value.name)}`;
  if (entityType === 'experience') return value.organization && value.role && value.start_date && value.end_date ? `${entityType}:${normalized(value.organization)}:${normalized(value.role)}:${value.start_date}:${value.end_date}` : null;
  if (entityType === 'education') return value.institution && value.program && value.degree ? `${entityType}:${normalized(value.institution)}:${normalized(value.program)}:${normalized(value.degree)}` : null;
  if (entityType === 'project') return value.name && (value.source_reference || value.reference) ? `${entityType}:${normalized(value.name)}:${normalized(value.source_reference || value.reference)}` : null;
  return value.name || value.text ? `${entityType}:${normalized(value.name || value.text)}` : null;
}
function bounded(entityType, value) {
  if (!ENTITY_TYPES.has(entityType) || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).some((key) => FORBIDDEN_KEYS.has(key))) return false;
  return Boolean(identity(entityType, value));
}
function classify({ proposal, sources, existingFacts }) {
  if (proposal && proposal.materialConflict) return { state: 'conflicting', rationale: 'The proposal is explicitly a materially conflicting claim and cannot overwrite Candidate Knowledge.' };
  if (!proposal || typeof proposal !== 'object' || !bounded(proposal.entityType, proposal.value)) return { state: 'rejected', rationale: 'A Candidate Fact requires a permitted entity type and an explicit bounded canonical value.' };
  if (!Array.isArray(proposal.sourceEvidenceRefs) || !proposal.sourceEvidenceRefs.length || sources.some((source) => !source.valid)) return { state: 'rejected', rationale: 'Every proposed fact needs at least one legitimate, traceable source evidence reference.' };
  if (sources.some((source) => !source.positive)) return { state: 'needs_confirmation', rationale: 'Captured or relevant evidence lacks explicit positive confirmation.' };
  if (proposal.confirmationStatus !== 'confirmed') return { state: 'needs_confirmation', rationale: 'A durable fact requires explicit confirmed status.' };
  const key = identity(proposal.entityType, proposal.value);
  const same = existingFacts.filter((fact) => fact.identity_key === key);
  if (same.length) return { state: 'duplicate', existingFactId: same[0].id, rationale: 'An equivalent confirmed Candidate Fact already exists; evidence may be linked without creating another fact.' };
  const comparable = existingFacts.filter((fact) => fact.entity_type === proposal.entityType);
  if (comparable.some((fact) => fact.value.organization && proposal.value.organization && normalized(fact.value.organization) === normalized(proposal.value.organization) && fact.value.role && normalized(fact.value.role) === normalized(proposal.value.role) && (fact.value.start_date !== proposal.value.start_date || fact.value.end_date !== proposal.value.end_date))) return { state: 'conflicting', rationale: 'The proposal materially conflicts with existing date-bound Candidate Knowledge and cannot overwrite it.' };
  if (proposal.relation && !RELATIONS.has(proposal.relation)) return { state: 'rejected', rationale: 'Revision relation must be new, confirms, extends, or supersedes.' };
  if (proposal.relation && proposal.relation !== 'new' && !proposal.priorFactId) return { state: 'deferred', rationale: 'A non-new revision requires an explicit prior Candidate Fact reference.' };
  return { state: 'accepted', relation: proposal.relation || 'new', rationale: 'Bounded, positively confirmed, traceable evidence satisfies the deterministic acceptance policy.' };
}
module.exports = { POLICY_VERSION, DECISIONS, RELATIONS, identity, bounded, classify };
