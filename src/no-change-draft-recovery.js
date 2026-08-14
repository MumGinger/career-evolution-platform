const { installSourceStructureBoundary } = require('./source-structure-projection');

installSourceStructureBoundary();

const VALIDATION_SAFE = new Set(['passed', 'passed_with_warnings']);

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function requiredCoreSelections(tailoringPlan) {
  return (tailoringPlan?.resume_content_selections || []).filter((selection) =>
    selection.selection_state === 'include'
      && ['Experience', 'Projects'].includes(selection.recommended_section));
}

function factSourceValues(fact) {
  const value = fact?.value || fact?.canonical_value || {};
  return [...new Set([
    fact?.display_value,
    ...Object.values(value),
  ].filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))];
}

function sourceStatementsInSection(session, section) {
  const review = (session?.generatedReview || []).find((item) => item.section === section);
  return (review?.ai_version?.statements || []).filter((statement) =>
    statement.content_origin === 'source_resume_passthrough');
}

function selectionHasSourceEquivalent(session, selection) {
  const fact = (session?.tailoring?.candidate_knowledge_snapshot || []).find((item) =>
    item.id === selection.candidate_fact_id);
  if (!fact) return false;
  const values = factSourceValues(fact).map(normalize).filter((value) => value.length >= 3);
  if (!values.length) return false;
  const statements = sourceStatementsInSection(session, selection.recommended_section);
  return statements.some((statement) => {
    const source = normalize(statement.text);
    return values.some((value) => source === value || source.includes(value));
  });
}

function requiredCoreCoveredBySource(session) {
  return requiredCoreSelections(session?.tailoring).every((selection) =>
    selectionHasSourceEquivalent(session, selection));
}

function reviewableCorePresent(session) {
  return (session?.generatedReview || []).some((review) =>
    ['Experience', 'Projects'].includes(review.section)
      && (review.ai_version?.statements || []).some((statement) => String(statement.text || '').trim()));
}

function recoverableNoChangeBlock(session, prepared) {
  if (!prepared?.blocked) return false;
  if (!VALIDATION_SAFE.has(prepared.draftValidation)) return false;
  if (!Array.isArray(session?.generatedReview) || session.generatedReview.length === 0) return false;
  const material = (prepared.tailoringReview || []).filter((item) => item.materialRewrite);
  if (material.length !== 0) return false;

  // No material wording is being introduced, so selection-id/source-equivalence matching
  // must not become a second, hidden validation gate. The reviewed document itself is
  // the structural authority at this point. If deterministic validation passed and the
  // complete review contains normal Experience/Projects content, the applicant can
  // continue without a fake Tailoring decision.
  return reviewableCorePresent(session);
}

function recoverNoChangeBlock(session, prepared) {
  if (!recoverableNoChangeBlock(session, prepared)) return prepared;
  const requiredCore = requiredCoreSelections(session.tailoring);
  const sourceEquivalent = requiredCoreCoveredBySource(session)
    ? requiredCore.map((selection) => selection.id)
    : [];
  const recovered = {
    ...prepared,
    stage: 'Tailoring Review',
    blocked: false,
    message: null,
    tailoringReview: prepared.tailoringReview || [],
    recovery: {
      reason: 'deterministic_valid_complete_resume_with_no_material_wording_changes',
      applicant_action: 'continue_without_tailoring_decisions',
      source_equivalent_core_selection_ids: sourceEquivalent,
    },
  };
  session.stage = 'tailoring-review';
  session.tailoringReview = recovered.tailoringReview;
  session.option2PreparedResult = recovered;
  return recovered;
}

module.exports = {
  factSourceValues,
  recoverableNoChangeBlock,
  recoverNoChangeBlock,
  requiredCoreCoveredBySource,
  requiredCoreSelections,
  reviewableCorePresent,
  selectionHasSourceEquivalent,
};
