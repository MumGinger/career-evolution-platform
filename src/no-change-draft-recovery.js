const VALIDATION_SAFE = new Set(['passed', 'passed_with_warnings']);

function requiredCoreSelections(tailoringPlan) {
  return (tailoringPlan?.resume_content_selections || []).filter((selection) =>
    selection.selection_state === 'include'
      && ['Experience', 'Projects'].includes(selection.recommended_section));
}

function recoverableNoChangeBlock(session, prepared) {
  if (!prepared?.blocked) return false;
  if (!VALIDATION_SAFE.has(prepared.draftValidation)) return false;
  if (!Array.isArray(session?.generatedReview) || session.generatedReview.length === 0) return false;
  if (requiredCoreSelections(session.tailoring).length !== 0) return false;
  const material = (prepared.tailoringReview || []).filter((item) => item.materialRewrite);
  return material.length === 0;
}

function recoverNoChangeBlock(session, prepared) {
  if (!recoverableNoChangeBlock(session, prepared)) return prepared;
  const recovered = {
    ...prepared,
    stage: 'Tailoring Review',
    blocked: false,
    message: null,
    tailoringReview: prepared.tailoringReview || [],
    recovery: {
      reason: 'valid_complete_resume_with_no_material_wording_changes',
      applicant_action: 'continue_without_tailoring_decisions',
    },
  };
  session.stage = 'tailoring-review';
  session.tailoringReview = recovered.tailoringReview;
  session.option2PreparedResult = recovered;
  return recovered;
}

module.exports = {
  recoverableNoChangeBlock,
  recoverNoChangeBlock,
  requiredCoreSelections,
};
