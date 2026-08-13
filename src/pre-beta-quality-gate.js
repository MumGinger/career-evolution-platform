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
  'shipped_flow_completion',
];

const CRITICAL_STATES = new Set(['PASS', 'FAIL', 'UNKNOWN']);
const REQUIRED_SHIPPED_STAGES = ['Resume Input', 'Tailoring Review', 'Draft', 'Career Review', 'Export'];
const SHA256 = /^[0-9a-f]{64}$/i;

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function runtimeFlowEvidenceErrors(candidateId, runtimeEvidence) {
  const errors = [];
  if (!runtimeEvidence || typeof runtimeEvidence !== 'object' || Array.isArray(runtimeEvidence)) {
    return ['runtime evidence is required when shipped_flow_completion is claimed PASS'];
  }
  if (candidateId && runtimeEvidence.candidate_id !== candidateId) {
    errors.push('runtime evidence candidate_id must match the scorecard candidate_id');
  }
  for (const key of ['source_resume_sha256', 'job_description_sha256', 'final_pdf_sha256']) {
    if (!SHA256.test(String(runtimeEvidence[key] || ''))) errors.push(`${key} must be a SHA-256 digest`);
  }
  if (!String(runtimeEvidence.artifact_run_id || '').trim()) errors.push('artifact_run_id is required');
  const flow = runtimeEvidence.shipped_flow;
  if (!flow || typeof flow !== 'object' || Array.isArray(flow)) return [...errors, 'shipped_flow runtime evidence is required'];
  if (flow.status !== 'PASS') errors.push('shipped_flow.status must be PASS');
  if (flow.natural_pipeline !== true) errors.push('shipped_flow.natural_pipeline must be true');
  if (flow.post_validation_state_mutation !== false) errors.push('shipped_flow.post_validation_state_mutation must be false');
  if (!String(flow.provider || '').trim()) errors.push('shipped_flow.provider is required');
  if (!String(flow.test_id || '').trim()) errors.push('shipped_flow.test_id is required');
  if (!String(flow.run_id || '').trim()) errors.push('shipped_flow.run_id is required');
  if (!Array.isArray(flow.completed_stages) || REQUIRED_SHIPPED_STAGES.some((stage) => !flow.completed_stages.includes(stage))) {
    errors.push(`shipped_flow.completed_stages must include ${REQUIRED_SHIPPED_STAGES.join(' -> ')}`);
  }
  return errors;
}

function shippedFlowEvidenceErrors(scorecard, runtimeEvidence, requireReviewedPdf = false) {
  const errors = runtimeFlowEvidenceErrors(scorecard?.candidate_id, runtimeEvidence);
  if (!requireReviewedPdf || !runtimeEvidence || typeof runtimeEvidence !== 'object' || Array.isArray(runtimeEvidence)) {
    return errors;
  }

  const reviewedFinalPdf = String(scorecard?.reviewed_final_pdf_sha256 || '');
  if (!SHA256.test(reviewedFinalPdf)) {
    errors.push('scorecard reviewed_final_pdf_sha256 must identify the final PDF independently reviewed for this score');
  } else if (reviewedFinalPdf.toLowerCase() !== String(runtimeEvidence.final_pdf_sha256 || '').toLowerCase()) {
    errors.push('reviewed final PDF SHA-256 must match runtime evidence final_pdf_sha256');
  }
  return errors;
}

function evaluateScorecard(scorecard, runtimeEvidence = null) {
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

  const runtimeEvidenceErrors = critical.shipped_flow_completion === 'PASS'
    ? shippedFlowEvidenceErrors(scorecard, runtimeEvidence, true)
    : [];
  if (critical.shipped_flow_completion === 'PASS' && runtimeEvidenceErrors.length) {
    critical.shipped_flow_completion = 'UNKNOWN';
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
    runtime_evidence_valid: runtimeEvidenceErrors.length === 0 && critical.shipped_flow_completion === 'PASS',
    runtime_evidence_errors: runtimeEvidenceErrors,
    requires_internal_loop: verdict !== 'BETA READY',
  };
}

module.exports = {
  CRITICAL,
  DIMENSIONS,
  REQUIRED_SHIPPED_STAGES,
  evaluateScorecard,
  runtimeFlowEvidenceErrors,
  shippedFlowEvidenceErrors,
};
