const POLICY_VERSION = 'resume-presentation-strategy/1.0.0';

function sectionDecision(section, selections) {
  const included = selections.filter((item) => item.recommended_section === section.section && item.selection_state === 'include');
  const withheld = selections.filter((item) => item.recommended_section === section.section && item.selection_state !== 'include');
  return {
    section: section.section,
    purpose: section.section === 'Professional Summary'
      ? 'Introduce the candidate without adding an unsupported summary claim.'
      : `Present supported ${section.section.toLowerCase()} evidence that is relevant to this role.`,
    included_selection_ids: included.map((item) => item.id),
    withheld_selection_ids: withheld.map((item) => item.id),
    rationale: included.length
      ? `This section foregrounds ${included.length} supported selection${included.length === 1 ? '' : 's'} for the target role.`
      : 'No supported selection is being foregrounded in this section.',
    evidence: included.map((item) => ({ candidate_fact_id: item.candidate_fact_id, requirement_ids: item.mapped_requirement_ids, rationale: item.relevance_rationale })),
  };
}

function createPresentationStrategy({ job, tailoring, artifact }) {
  const resume = artifact.resume_artifacts[0];
  return {
    artifact_type: 'resume_presentation_strategy',
    format_version: '1.0.0',
    policy_version: POLICY_VERSION,
    target: { company: job.snapshot.company, role_title: job.snapshot.role_title, job_requirement_profile_id: job.id },
    principle: 'The platform explains how it presents supported evidence; it does not decide the candidate\'s identity or invent claims.',
    decisions: resume.content.sections.map((section) => sectionDecision(section, tailoring.resume_content_selections)),
    requirement_coverage: tailoring.requirement_coverage.map((item) => ({ requirement_id: item.job_requirement_id, status: item.coverage_status, rationale: item.coverage_rationale })),
    limitations: 'This explains deterministic presentation choices from the immutable tailoring plan. It is not a claim that uncovered requirements are absent from the candidate.',
    traceability: { resume_artifact_run_id: artifact.id, resume_tailoring_plan_run_id: tailoring.id, job_requirement_profile_id: job.id },
  };
}

module.exports = { POLICY_VERSION, createPresentationStrategy };
