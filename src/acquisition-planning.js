const POLICY_VERSION = 'acquisition-planning-policy/1.0.0';

const LEVEL_SCORE = { none: 0, low: 1, medium: 2, high: 3 };

function score(level) { return LEVEL_SCORE[level] ?? 0; }

function selectStrategy({ need, discoveryResult }) {
  const candidates = discoveryResult.candidates || [];
  const states = candidates.map((item) => item.resolution.state);
  if (states.includes('conflicting')) {
    return { strategy: 'resolve_conflict', action_type: 'reconcile_conflicting_evidence', acquisition_cost: 'medium', confidence: 'high', reason: 'Discovery found materially conflicting evidence, which must be reconciled before it can support the bounded need.' };
  }
  if (candidates.some((item) => item.candidate.source_type === 'resume_import')) {
    return { strategy: 'recover_project_details', action_type: 'recover_resume_project_context', acquisition_cost: 'medium', confidence: 'medium', reason: 'Discovery found weak resume-derived context; recovering bounded project details is preferred before requesting wholly new evidence.' };
  }
  if (states.includes('needs_confirmation')) {
    return { strategy: 'confirm_existing_evidence', action_type: 'confirm_relevant_existing_evidence', acquisition_cost: 'low', confidence: 'high', reason: 'Discovery found relevant but unconfirmed existing evidence; confirming it has lower user cost than requesting it again.' };
  }
  return { strategy: 'request_new_evidence', action_type: 'request_supporting_evidence', acquisition_cost: 'high', confidence: 'medium', reason: 'Discovery exhausted the available local evidence snapshot without sufficient evidence.' };
}

function planFor({ need, discoveryResult }) {
  const selected = selectStrategy({ need, discoveryResult });
  const informationGainScore = Math.max(1, need.priority_score - (score(selected.acquisition_cost) - 1));
  const informationGain = informationGainScore >= 7 ? 'high' : informationGainScore >= 4 ? 'medium' : 'low';
  return {
    ...selected,
    information_gain: informationGain,
    information_gain_score: informationGainScore,
    action_key: `${selected.action_type}:${need.category}`,
    rationale: `${selected.reason} Expected information gain is ${informationGain} (${informationGainScore}) from the need priority of ${need.priority_level} (${need.priority_score}) relative to ${selected.acquisition_cost} acquisition cost.`,
    limitations: 'This is a deterministic recommendation only. It does not generate wording, contact a source, execute an acquisition action, or update Candidate Knowledge.',
    stop_condition: 'Stop when evidence is sufficient for the bounded Information Need or when the selected action cannot produce permitted evidence.',
  };
}

function groupPlans(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.strategy}|${item.action_type}|${item.action_key}`;
    if (!groups.has(key)) groups.set(key, { ...item, needs: [] });
    groups.get(key).needs.push(item.need);
  }
  return [...groups.values()].sort((a, b) => b.information_gain_score - a.information_gain_score || a.action_key.localeCompare(b.action_key));
}

module.exports = { POLICY_VERSION, planFor, groupPlans };
