const POLICY_VERSION = 'decision-companion/1.0.0';
const DECISION_TYPES = ['job_offer', 'career_direction', 'education', 'skill_investment', 'other'];
const CRITERIA = ['learning', 'compensation', 'work_life_balance', 'impact', 'stability', 'location', 'growth_potential', 'alignment_with_current_direction', 'custom'];
const FINAL_STATES = ['leaning', 'undecided', 'need_more_information', 'stopped'];
const REFLECTION_QUESTION = 'Which trade-off feels most acceptable to you right now?';

function validate({ title, decisionType, options, criteria }) {
  if (!title?.trim()) throw new Error('Decision title is required');
  if (!DECISION_TYPES.includes(decisionType)) throw new Error(`Decision type must be one of: ${DECISION_TYPES.join(', ')}`);
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) throw new Error('A decision requires 2 to 4 options');
  if (options.some((option) => !option?.label?.trim())) throw new Error('Each option requires a label');
  if (!Array.isArray(criteria) || criteria.length > 3) throw new Error('Select up to 3 criteria');
  if (criteria.some((criterion) => !CRITERIA.includes(criterion.type) || (criterion.type === 'custom' && !criterion.label?.trim()))) throw new Error('Criteria must be supported or a named custom criterion');
  const selectedKeys = criteria.map(criterionKey);
  if (options.some((option) => option.criterion_details && (typeof option.criterion_details !== 'object' || Array.isArray(option.criterion_details) || Object.keys(option.criterion_details).some((key) => !selectedKeys.includes(key) || !String(option.criterion_details[key]).trim())))) throw new Error('Option criterion details must be explicit details for selected criteria');
}

function criterionLabel(criterion) { return criterion.type === 'custom' ? criterion.label.trim() : criterion.type.replaceAll('_', ' '); }
function criterionKey(criterion) { return criterion.type === 'custom' ? criterion.label.trim() : criterion.type; }
function matchingSnapshotItems(snapshot, criterion) {
  if (criterion.type !== 'alignment_with_current_direction' || !snapshot?.current_direction?.label) return [];
  return snapshot.understanding_items.filter((item) => item.category === 'direction').map((item) => ({ label: item.label, rationale: item.rationale, source: item.supporting_source_references || [] }));
}
function comparison({ decision, snapshot }) {
  return decision.options.map((option) => {
    const explicit = option.details || option.context || null;
    const details = option.criterion_details || {};
    const servedCriteria = decision.criteria.flatMap((criterion) => details[criterionKey(criterion)] ? [{ criterion: criterionLabel(criterion), rationale: `You said: ${details[criterionKey(criterion)]}` }] : []);
    const snapshotItems = decision.criteria.flatMap((criterion) => matchingSnapshotItems(snapshot, criterion));
    const unsupportedCriteria = decision.criteria.filter((criterion) => !details[criterionKey(criterion)]).map(criterionLabel);
    return {
      option_id: option.id,
      option_label: option.label,
      what_supports_it: explicit ? [`You said: ${explicit}`] : [],
      trade_offs: explicit ? ['Here is one trade-off to consider: this option context does not resolve how it serves every selected criterion.'] : ['Here is one trade-off to consider: there is not enough option-specific context to assess it against the selected criteria.'],
      unknowns: unsupportedCriteria.length ? [`No explicit option detail was provided for: ${unsupportedCriteria.join(', ')}.`] : [],
      criteria_it_appears_to_serve: servedCriteria,
      provenance: { user_inputs: { option_id: option.id, label: option.label, details: explicit, criterion_details: details }, career_understanding: { snapshot_run_id: snapshot.id, matching_items: snapshotItems } }
    };
  });
}
function readable(run) {
  const lines = ['Decision Companion', '', "Let's think this through together.", `Decision type: ${run.decision.type}`, `Options: ${run.options.length}`, `Criteria: ${run.criteria.map(criterionLabel).join(', ') || 'None selected'}`, '', 'Based on what you said matters...'];
  for (const entry of run.comparison_entries) lines.push('', entry.option_label, `- Supports: ${entry.what_supports_it.join(' ') || 'No supporting detail recorded.'}`, `- Trade-off: ${entry.trade_offs[0]}`, `- Unknown: ${entry.unknowns[0]}`);
  lines.push('', run.reflection_question, `Final state: ${run.response.final_state}`);
  return lines.join('\n');
}

module.exports = { POLICY_VERSION, DECISION_TYPES, CRITERIA, FINAL_STATES, REFLECTION_QUESTION, validate, comparison, readable };
