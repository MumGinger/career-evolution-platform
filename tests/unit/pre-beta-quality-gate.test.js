const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateScorecard, DIMENSIONS, CRITICAL } = require('../../src/pre-beta-quality-gate');

function scorecard({ score = 9, critical = 'PASS', overrides = {} } = {}) {
  return {
    candidate_id: 'candidate-v1',
    dimensions: Object.fromEntries(DIMENSIONS.map((key) => [key, score])),
    critical: Object.fromEntries(CRITICAL.map((key) => [key, critical])),
    ...overrides,
  };
}

function runtimeEvidence(overrides = {}) {
  return {
    candidate_id: 'candidate-v1',
    source_resume_sha256: 'a'.repeat(64),
    job_description_sha256: 'b'.repeat(64),
    final_pdf_sha256: 'c'.repeat(64),
    artifact_run_id: 'artifact-run-v1',
    shipped_flow: {
      status: 'PASS',
      natural_pipeline: true,
      post_validation_state_mutation: false,
      provider: 'openai-compatible/provider-replay',
      test_id: 'issue140-natural-complex-pdf-flow',
      run_id: 'ci-run-v1',
      completed_stages: ['Resume Input', 'Tailoring Review', 'Draft', 'Career Review', 'Export'],
    },
    ...overrides,
  };
}

test('90/100 with all critical PASS and exact natural shipped-flow evidence is BETA READY', () => {
  const result = evaluateScorecard(scorecard(), runtimeEvidence());
  assert.equal(result.total, 90);
  assert.equal(result.verdict, 'BETA READY');
  assert.equal(result.beta_ready, true);
  assert.equal(result.runtime_evidence_valid, true);
  assert.equal(result.requires_internal_loop, false);
});

test('100/100 self-reported PASS without runtime evidence is NOT BETA READY', () => {
  const result = evaluateScorecard(scorecard({ score: 10 }));
  assert.equal(result.total, 100);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.equal(result.beta_ready, false);
  assert.deepEqual(result.unknown_critical, ['shipped_flow_completion']);
  assert.equal(result.runtime_evidence_valid, false);
  assert.match(result.runtime_evidence_errors.join(' '), /runtime evidence is required/i);
});

test('runtime evidence for a different candidate cannot authorize the scorecard', () => {
  const result = evaluateScorecard(scorecard({ score: 10 }), runtimeEvidence({ candidate_id: 'different-candidate' }));
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.deepEqual(result.unknown_critical, ['shipped_flow_completion']);
  assert.match(result.runtime_evidence_errors.join(' '), /candidate_id must match/i);
});

test('85-89 remains NEAR READY when machine evidence is valid', () => {
  const candidate = scorecard();
  candidate.dimensions.job_specific_targeting = 8;
  const result = evaluateScorecard(candidate, runtimeEvidence());
  assert.equal(result.total, 89);
  assert.equal(result.verdict, 'NEAR READY');
  assert.equal(result.beta_ready, false);
  assert.equal(result.requires_internal_loop, true);
});

test('below 85 remains NOT BETA READY', () => {
  const result = evaluateScorecard(scorecard({ score: 8 }), runtimeEvidence());
  assert.equal(result.total, 80);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.equal(result.beta_ready, false);
});

test('critical FAIL blocks a high numerical score', () => {
  const candidate = scorecard({ score: 10 });
  candidate.critical.section_identity = 'FAIL';
  const result = evaluateScorecard(candidate, runtimeEvidence());
  assert.equal(result.total, 100);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.deepEqual(result.failed_critical, ['section_identity']);
});

test('critical UNKNOWN blocks a high numerical score', () => {
  const candidate = scorecard({ score: 10 });
  candidate.critical.final_pdf_usability = 'UNKNOWN';
  const result = evaluateScorecard(candidate, runtimeEvidence());
  assert.equal(result.total, 100);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.deepEqual(result.unknown_critical, ['final_pdf_usability']);
});

test('shipped applicant flow completion is mandatory even for a 100-point artifact', () => {
  const candidate = scorecard({ score: 10 });
  candidate.critical.shipped_flow_completion = 'UNKNOWN';
  const result = evaluateScorecard(candidate);
  assert.equal(result.total, 100);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.equal(result.beta_ready, false);
  assert.deepEqual(result.unknown_critical, ['shipped_flow_completion']);
});

test('invalid or incomplete scorecards are rejected rather than treated as readiness evidence', () => {
  const candidate = scorecard();
  delete candidate.dimensions.final_pdf_professional_credibility;
  assert.throws(
    () => evaluateScorecard(candidate),
    /final_pdf_professional_credibility must be a number from 0 to 10/,
  );
});
