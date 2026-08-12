const DIMENSIONS = [
  'job_specific_targeting',
  'content_coherence_prioritization',
  'concision_duplication_control',
  'evidence_strength_supported_meaning',
  'section_entry_integrity',
  'summary_skills_quality',
  'experience_projects_education_hierarchy',
  'typography_spacing_density_page_composition',
  'final_pdf_professional_credibility',
  'review_final_equivalence_decision_preservation',
];

const CRITICAL = [
  'truth_support_integrity',
  'section_identity',
  'entry_integrity',
  'duplication_expansion_integrity',
  'applicant_decision_integrity',
  'professional_readability',
  'final_pdf_usability',
  'review_export_equivalence',
];

const CRITICAL_STATES = new Set(['PASS', 'FAIL', 'UNKNOWN']);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function evaluateScorecard(scorecard) {
  assertObject(scorecard, 'scorecard');
  if (!scorecard.candidate_id || typeof scorecard.candidate_id !== 'string') {
    throw new Error('scorecard.candidate_id must identify the frozen candidate.');
  }

  assertObject(scorecard.dimensions, 'scorecard.dimensions');
  const dimensionScores = {};
  for (const key of DIMENSIONS) {
    const value = scorecard.dimensions[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) {
      throw new Error(`scorecard.dimensions.${key} must be a number from 0 to 10.`);
    }
    dimensionScores[key] = value;
  }

  assertObject(scorecard.critical, 'scorecard.critical');
  const critical = {};
  for (const key of CRITICAL) {
    const value = scorecard.critical[key];
    if (!CRITICAL_STATES.has(value)) {
      throw new Error(`scorecard.critical.${key} must be PASS, FAIL, or UNKNOWN.`);
    }
    critical[key] = value;
  }

  const total = DIMENSIONS.reduce((sum, key) => sum + dimensionScores[key], 0);
  const failedCritical = CRITICAL.filter((key) => critical[key] === 'FAIL');
  const unknownCritical = CRITICAL.filter((key) => critical[key] === 'UNKNOWN');
  const allCriticalPass = failedCritical.length === 0 && unknownCritical.length === 0;

  let verdict;
  if (!allCriticalPass || total < 85) verdict = 'NOT BETA READY';
  else if (total < 90) verdict = 'NEAR READY';
  else verdict = 'BETA READY';

  return {
    candidate_id: scorecard.candidate_id,
    total,
    maximum: 100,
    verdict,
    beta_ready: verdict === 'BETA READY',
    failed_critical: failedCritical,
    unknown_critical: unknownCritical,
    requires_internal_loop: verdict !== 'BETA READY',
  };
}

module.exports = {
  CRITICAL,
  DIMENSIONS,
  evaluateScorecard,
};
