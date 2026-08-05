const integration = require('./candidate-knowledge-integration');

function stable(value) { return JSON.stringify(value, Object.keys(value || {}).sort()); }
function coverage(plan) {
  const relevant = plan.requirement_coverage.filter((item) => item.coverage_status !== 'not_resume_relevant');
  return relevant.length ? Math.round((relevant.filter((item) => item.coverage_status === 'covered').length / relevant.length) * 100) : 0;
}
function queue(discoveryRun) {
  const needs = new Map(discoveryRun.information_need_run.information_needs.map((need) => [need.id, need]));
  return discoveryRun.need_results.map((result) => ({
    requirement: needs.get(result.information_need_id),
    candidates: result.candidates.filter((item) => ['needs_confirmation', 'accepted_for_need'].includes(item.resolution.state)).map((item, index) => ({
      ...item,
      rank: index + 1,
      score: (item.candidate.confidence_level === 'high' ? 100 : 70) - index,
      why_selected: item.resolution.rationale,
    })),
  })).filter((item) => item.candidates.length);
}
function supportedEdit(candidate, editedClaim) {
  if (!editedClaim || typeof editedClaim !== 'object' || Array.isArray(editedClaim)) return false;
  return stable(candidate.candidate.supporting_value) === stable(editedClaim) && integration.bounded(candidate.entity_type, editedClaim);
}
function decisionFrom(candidate, supplied) {
  const action = supplied?.action || supplied?.state;
  if (action === 'accepted') return { evidenceCandidateId: candidate.candidate.id, action: 'accepted', originalClaim: candidate.candidate.supporting_text, rationale: supplied.rationale || null };
  if (action === 'skipped') return { evidenceCandidateId: candidate.candidate.id, action: 'skipped', originalClaim: candidate.candidate.supporting_text, rationale: supplied.rationale || null };
  if (action === 'edited') {
    const editedClaim = supplied.editedClaim || supplied.value;
    return supportedEdit(candidate, editedClaim)
      ? { evidenceCandidateId: candidate.candidate.id, action: 'edited', originalClaim: candidate.candidate.supporting_text, editedClaim, rationale: supplied.rationale || null }
      : { evidenceCandidateId: candidate.candidate.id, action: 'blocked', originalClaim: candidate.candidate.supporting_text, editedClaim, rationale: 'Edited claim is not an exact bounded representation of the selected source evidence.' };
  }
  throw new Error(`A review decision is required for ${candidate.candidate.id}`);
}
function buildArtifact(profile, plan) {
  const selected = plan.resume_content_selections.filter((item) => item.selection_state === 'include');
  const facts = new Map(plan.candidate_knowledge_snapshot.map((fact) => [fact.id, fact]));
  const sections = plan.section_plans.map((section) => ({ section: section.section, facts: section.candidate_fact_ids.map((id) => facts.get(id)).filter(Boolean).map((fact) => fact.value?.name || fact.value?.text || JSON.stringify(fact.value)) }));
  const markdown = [`# ${profile.name || 'Candidate'}`, profile.headline || ''].filter(Boolean).join('\n\n') + '\n\n' + sections.map((section) => `## ${section.section}\n${section.facts.map((text) => `- ${text}`).join('\n')}`).join('\n\n');
  return { artifact_type: 'truthful_resume_markdown', generated_from_tailoring_plan_id: plan.id, selections: selected.map((item) => item.candidate_fact_id), sections, markdown };
}
function validate(plan, artifact) {
  const selected = new Set(plan.resume_content_selections.filter((item) => item.selection_state === 'include').map((item) => item.candidate_fact_id));
  const rendered = new Set(artifact.selections);
  const findings = [...rendered].filter((id) => !selected.has(id)).map((id) => ({ severity: 'error', message: `Rendered fact ${id} was not selected by the tailoring plan.` }));
  return { status: findings.length ? 'failed' : 'passed', findings, checked_tailoring_plan_id: plan.id, limitations: 'Validation checks plan membership and does not infer claims.' };
}
function reviewFixtureMap(fixture) {
  const decisions = Array.isArray(fixture) ? fixture : fixture?.decisions || [];
  const map = new Map();
  for (const item of decisions) if (item.evidenceCandidateId && !map.has(item.evidenceCandidateId)) map.set(item.evidenceCandidateId, item);
  const defaultAction = !Array.isArray(fixture) && ['accepted', 'skipped'].includes(fixture?.defaultAction) ? fixture.defaultAction : null;
  return { map, decisions, defaultAction };
}
async function collectInteractive(queueItems, adapter) {
  const decisions = [];
  for (const item of queueItems) for (const candidate of item.candidates) {
    const answer = await adapter.ask({ requirement: item.requirement, candidate });
    decisions.push(decisionFrom(candidate, answer));
  }
  return decisions;
}
function integrateReviewedEvidence({ store, candidateProfileId, discoveryRunId, reviewRun }) {
  const proposals = reviewRun.review_decisions.filter((item) => item.action === 'accepted' || item.action === 'edited').map((item) => {
    const source = store.getEvidenceReviewCandidate(discoveryRunId, item.evidence_candidate_id);
    return { entityType: source.entity_type, value: item.action === 'edited' ? item.edited_claim : source.candidate.supporting_value, displayValue: item.action === 'edited' ? source.candidate.supporting_text : null, confirmationStatus: 'confirmed', confidenceLevel: source.candidate.confidence_level, sourceEvidenceRefs: item.source_evidence_refs, relatedReferences: [reviewRun.id] };
  });
  return proposals.length ? store.createCandidateKnowledgeIntegrationRun({ candidateProfileId, evidenceDiscoveryRunId: discoveryRunId, proposals }) : null;
}
async function run({ store, candidateProfileId, jobRequirementProfileId, fixture, adapter, nonInteractive = false }) {
  const beforeFacts = store.getCommittedCandidateKnowledge(candidateProfileId);
  const beforePlan = store.createResumeTailoringPlanRun({ candidateProfileId, jobRequirementProfileId });
  const needs = store.createInformationNeedRun({ candidateProfileId, jobRequirementProfileId });
  const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
  const queueItems = queue(discovery).map((item) => ({ ...item, candidates: item.candidates.map((item) => ({ ...item, entity_type: store.getEvidenceReviewCandidate(discovery.id, item.candidate.id).entity_type })) }));
  let decisions;
  if (fixture) {
    const supplied = reviewFixtureMap(fixture);
    decisions = queueItems.flatMap((item) => item.candidates.map((candidate) => {
      const suppliedDecision = supplied.map.get(candidate.candidate.id) || supplied.decisions.find((item) => String(item.requirementName || '').toLowerCase() === candidate.candidate.normalized_claim) || (supplied.defaultAction ? { action: supplied.defaultAction, rationale: 'Intentional fixture default for otherwise unmatched reviewable evidence.' } : null);
      if (!suppliedDecision && nonInteractive) throw new Error(`Unresolved review decision for ${candidate.candidate.id}`);
      return suppliedDecision ? decisionFrom(candidate, suppliedDecision) : null;
    }).filter(Boolean));
  } else if (adapter) decisions = await collectInteractive(queueItems, adapter);
  else if (nonInteractive && queueItems.length) throw new Error('Non-interactive review requires a fixture for every needs_confirmation candidate');
  else decisions = [];
  const reviewRun = store.createEvidenceReviewRun({ candidateProfileId, jobRequirementProfileId, evidenceDiscoveryRunId: discovery.id, decisions });
  const integrationRun = integrateReviewedEvidence({ store, candidateProfileId, discoveryRunId: discovery.id, reviewRun });
  const afterFacts = store.getCommittedCandidateKnowledge(candidateProfileId);
  const afterPlan = store.createResumeTailoringPlanRun({ candidateProfileId, jobRequirementProfileId });
  const artifact = buildArtifact(store.getProfile(candidateProfileId), afterPlan);
  const validation = validate(afterPlan, artifact);
  const counts = reviewRun.review_decisions.reduce((result, item) => ({ ...result, [item.action]: (result[item.action] || 0) + 1 }), {});
  const autoAccepted = discovery.need_results.flatMap((item) => item.candidates).filter((item) => item.resolution.state === 'accepted_for_need').length;
  return { discovery, queue: queueItems, reviewRun, integrationRun, beforePlan, afterPlan, artifact, validation, kpi: { total_requirements: needs.information_needs.length, auto_accepted_evidence_count: autoAccepted, needs_review_count: queueItems.reduce((sum, item) => sum + item.candidates.length, 0), accepted_count: counts.accepted || 0, skipped_count: counts.skipped || 0, edited_count: counts.edited || 0, blocked_edits_count: counts.blocked || 0, committed_coverage_before: coverage(beforePlan), committed_coverage_after: coverage(afterPlan), candidate_knowledge_facts_before: beforeFacts.length, candidate_knowledge_facts_after: afterFacts.length, validation_status: validation.status } };
}

module.exports = { queue, supportedEdit, decisionFrom, collectInteractive, integrateReviewedEvidence, buildArtifact, validate, run };
