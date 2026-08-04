const POLICY_VERSION = 'career-understanding/1.0.0';

const UNKNOWN = ['Preferred industry', 'Long-term role goal', 'Preferred work style'];
const LIMITATIONS = [
  'This is a read-only summary of committed facts, validated resume evidence, confirmed conversation answers, and recorded applications.',
  'Applications are neutral activity signals, not preferences.',
  'Unknowns are intentionally not inferred.'
];

function name(value) { return value?.name || value?.text || value?.label || null; }
function item({ label, category, state, confidence, sources, rationale, lastObservedAt }) {
  return { label, category, state, confidence, supporting_source_references: sources, rationale, last_observed_at: lastObservedAt };
}
function snapshot({ facts, astEvidence, conversations, applications }) {
  const items = [];
  const seen = new Set();
  const add = (value) => { const key = `${value.category}:${value.label.toLowerCase()}`; if (!seen.has(key)) { seen.add(key); items.push(value); } };
  for (const observation of conversations.filter((entry) => !entry.skipped && entry.answer)) {
    if (observation.answer === "I'm still exploring") continue;
    add(item({ label: observation.answer, category: 'direction', state: 'user_confirmed', confidence: 'medium', sources: [{ type: 'career_conversation_observation', id: observation.id }], rationale: `You selected ${observation.answer} in the career conversation.`, lastObservedAt: observation.observed_at }));
  }
  for (const fact of facts) {
    const label = name(fact.value); if (!label) continue;
    const category = fact.entity_type === 'domain_knowledge' ? 'domain' : fact.entity_type === 'working_style' ? 'working_style' : 'strength';
    if (!['strength', 'domain', 'working_style'].includes(category)) continue;
    add(item({ label, category, state: 'explicit', confidence: fact.confidence_level === 'low' ? 'low' : 'high', sources: [{ type: 'candidate_knowledge_fact', id: fact.id, integration_decision_id: fact.integration_decision_id }], rationale: `Your committed Candidate Knowledge includes ${label}.`, lastObservedAt: fact.created_at }));
  }
  for (const evidence of astEvidence) {
    const label = name(evidence.value); if (!label || !['skill', 'tool'].includes(evidence.entity_type) || evidence.provenance.extraction_state !== 'explicit') continue;
    add(item({ label, category: 'strength', state: 'supported_signal', confidence: 'medium', sources: [{ type: 'resume_ast', id: evidence.id, resume_ast_run_id: evidence.provenance.resume_ast_run_id, artifact_version_id: evidence.provenance.artifact_version_id }], rationale: `Your validated resume explicitly lists ${label}.`, lastObservedAt: evidence.provenance.created_at || null }));
  }
  const direction = items.find((entry) => entry.category === 'direction');
  const neutralSignals = applications.map((application) => ({ type: 'application', id: application.id, role_title: application.role_title, company: application.company, application_date: application.application_date }));
  const currentDirection = direction ? { state: 'exploring', label: direction.label } : { state: 'unknown', label: null };
  return { current_direction: currentDirection, understanding_items: items, unknowns: UNKNOWN, limitations: LIMITATIONS, neutral_activity_signals: neutralSignals };
}
function feedbackState(feedback) { return feedback.length ? feedback.at(-1).action : 'not_reviewed'; }
function readable(snapshotRun) {
  const groups = (category) => snapshotRun.understanding_items.filter((entry) => entry.category === category);
  const lines = ['Current Career Snapshot', '', 'Direction'];
  const directions = groups('direction'); lines.push(...(directions.length ? directions.map((entry) => `- ${entry.label} — ${entry.state.replace('_', ' ')} — ${entry.confidence} confidence`) : ['- Still unknown']));
  lines.push('', 'Strengths'); const strengths = groups('strength').concat(groups('domain')); lines.push(...(strengths.length ? strengths.map((entry) => `- ${entry.label} — ${entry.state.replace('_', ' ')} — ${entry.confidence} confidence`) : ['- None confirmed yet']));
  lines.push('', 'Signals'); lines.push(...(snapshotRun.neutral_activity_signals.length ? snapshotRun.neutral_activity_signals.map((entry) => `- Applied to ${entry.role_title} at ${entry.company} — neutral signal only`) : ['- No recorded applications']));
  lines.push('', 'Still unknown', ...snapshotRun.unknowns.map((entry) => `- ${entry}`), '', 'Why', ...snapshotRun.understanding_items.map((entry) => `- ${entry.rationale}`), '', `Feedback: ${snapshotRun.feedback_state}`);
  return lines.join('\n');
}
module.exports = { POLICY_VERSION, snapshot, feedbackState, readable };
