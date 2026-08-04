const POLICY_VERSION = 'career-review/1.0.0';

function requireReviewInput(reviewInput) {
  if (!reviewInput || !Array.isArray(reviewInput.sections)) throw new Error('Career Review is required before final export. Provide a review fixture with an approval for every resume section.');
}

function createCareerReview({ artifact, presentationStrategy, reviewInput }) {
  requireReviewInput(reviewInput);
  const expected = artifact.resume_artifacts[0].content.sections.map((section) => section.section);
  const supplied = new Map(reviewInput.sections.map((item) => [item.section, item]));
  const section_reviews = expected.map((section) => {
    const response = supplied.get(section);
    return {
      section,
      status: response?.status === 'approved' ? 'approved' : response?.status === 'changes_requested' ? 'changes_requested' : 'pending',
      comment: response?.comment || null,
      presentation_decision: presentationStrategy.decisions.find((item) => item.section === section),
    };
  });
  const unexpected = reviewInput.sections.filter((item) => !expected.includes(item.section)).map((item) => item.section);
  const complete = !unexpected.length && section_reviews.every((item) => item.status === 'approved');
  return {
    artifact_type: 'career_review', format_version: '1.0.0', policy_version: POLICY_VERSION,
    required: true, completed: complete, reviewed_at: reviewInput.reviewed_at || null,
    reviewer: reviewInput.reviewer || 'candidate', section_reviews,
    export_status: complete ? 'eligible_pending_validation' : 'blocked',
    block_reasons: complete ? [] : [unexpected.length ? `Unexpected review sections: ${unexpected.join(', ')}.` : null, ...section_reviews.filter((item) => item.status !== 'approved').map((item) => `${item.section} is ${item.status}; explicit approval is required.`)].filter(Boolean),
    statement: complete
      ? 'Career Review complete. This resume reflects both the candidate\'s evidence and how they chose to present it.'
      : 'Career Review is not complete. The candidate has the final word, so final export remains unavailable.',
    traceability: { resume_artifact_run_id: artifact.id, presentation_strategy_id: presentationStrategy.traceability.resume_artifact_run_id },
  };
}

module.exports = { POLICY_VERSION, createCareerReview };
