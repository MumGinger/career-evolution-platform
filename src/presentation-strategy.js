const POLICY_VERSION = 'intelligent-resume-presentation-strategy/1.0.0';

const DIRECTION_FOCUS = {
  'data analytics': ['data visualization', 'sql', 'python'],
  'business analysis': ['requirements analysis', 'stakeholder communication', 'sql'],
};

function decisionFor(selection, position, originalPosition, focusRequirement = null) {
  return {
    resume_content_selection_id: selection.id,
    candidate_fact_id: selection.candidate_fact_id,
    decision: 'emphasize_existing_evidence',
    position,
    mapped_job_requirement_ids: selection.mapped_requirement_ids,
    original_position: originalPosition,
    moved: originalPosition !== position,
    rationale: focusRequirement
      ? `Moved from position ${originalPosition} to ${position}: the user-confirmed career direction has a bounded presentation focus on ${focusRequirement.normalized_name}, and this already-approved fact directly supports that target-job requirement. Presentation changes order only; it does not add, strengthen, or rewrite the candidate fact.`
      : 'This already-approved selection directly supports a target-job requirement. No supported shared-understanding focus changed its original tailoring-plan order, and presentation does not add, strengthen, or rewrite the candidate fact.',
    supporting_evidence: {
      candidate_fact_revision: selection.candidate_fact_revision,
      inherited_provenance_references: selection.inherited_provenance_references,
      tailoring_plan_selection_id: selection.id,
    },
  };
}

function create({ plan, job, snapshot, reflectionRun = null, curiosityResult = null, curiosityObservation = null, decisionRun = null }) {
  const original = plan.resume_content_selections
    .filter((selection) => selection.selection_state === 'include')
    .sort((left, right) => right.priority_score - left.priority_score || left.id.localeCompare(right.id));
  const direction = snapshot.current_direction?.label || null;
  const focusNames = DIRECTION_FOCUS[String(direction || '').toLowerCase()] || [];
  const requirements = new Map((job.requirements || []).map((requirement) => [requirement.id, requirement]));
  const focusFor = (selection) => selection.mapped_requirement_ids
    .map((id) => requirements.get(id))
    .find((requirement) => requirement && focusNames.includes(String(requirement.normalized_name).toLowerCase())) || null;
  const included = focusNames.length
    ? [...original].sort((left, right) => {
      const leftFocus = focusFor(left); const rightFocus = focusFor(right);
      const leftRank = leftFocus ? focusNames.indexOf(String(leftFocus.normalized_name).toLowerCase()) : Number.MAX_SAFE_INTEGER;
      const rightRank = rightFocus ? focusNames.indexOf(String(rightFocus.normalized_name).toLowerCase()) : Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || original.indexOf(left) - original.indexOf(right);
    })
    : original;
  const context = [];
  if (direction) context.push({ type: 'career_direction', state: 'considered', value: direction, source_reference: { type: 'career_understanding_snapshot_run', id: snapshot.id }, rationale: 'The user explicitly selected this direction. It frames the target-job context but is not converted into a skill, achievement, preference, or other candidate fact.' });
  if (reflectionRun) context.push({ type: 'shared_understanding', state: 'considered', value: reflectionRun.action, source_reference: { type: 'career_reflection_run', id: reflectionRun.id }, rationale: 'The response records whether the snapshot felt accurate; it validates neither individual facts nor new claims.' });
  if (decisionRun) context.push({ type: 'decision_context', state: 'considered', value: decisionRun.response.final_state, source_reference: { type: 'decision_companion_run', id: decisionRun.id }, rationale: 'A Decision Companion response remains user-owned context. It does not create a recommendation or candidate fact.' });
  const exclusions = [];
  if (curiosityResult?.status === 'available') exclusions.push({ type: 'career_curiosity', state: 'not_used_for_resume_claims', source_reference: curiosityObservation ? { type: 'career_curiosity_observation', id: curiosityObservation.id } : { type: 'generated_career_possibility', id: curiosityResult.possibility.id }, rationale: 'An adjacent possibility expands perspective; it is not evidence that the candidate has a skill, goal, or qualification.' });
  return {
    policy_version: POLICY_VERSION,
    target_job: { job_requirement_profile_id: job.id, job_requirement_profile_version: job.version, company: job.snapshot.company, role_title: job.snapshot.role_title },
    shared_understanding: { career_understanding_snapshot_run_id: snapshot.id, current_direction: direction, context, exclusions, unknowns: snapshot.unknowns },
    presentation_decisions: included.map((selection, index) => decisionFor(selection, index + 1, original.indexOf(selection) + 1, focusFor(selection))),
    ordered_resume_content_selection_ids: included.map((selection) => selection.id),
    limitations: 'The strategy only orders already-included, committed candidate facts. It never turns Career Understanding, reflection, curiosity, or Decision Companion context into a resume claim, changes selection state, acquires evidence, or writes Candidate Knowledge.',
  };
}

module.exports = { POLICY_VERSION, create };
