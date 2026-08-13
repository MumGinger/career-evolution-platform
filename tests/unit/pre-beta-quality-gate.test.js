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

test('90/100 with all critical PASS is BETA READY', () => {
  const result = evaluateScorecard(scorecard());
  assert.equal(result.total, 90);
  assert.equal(result.verdict, 'BETA READY');
  assert.equal(result.beta_ready, true);
  assert.equal(result.requires_internal_loop, false);
});

test('85-89 remains NEAR READY and cannot enter Beta', () => {
  const candidate = scorecard();
  candidate.dimensions.job_specific_targeting = 8;
  const result = evaluateScorecard(candidate);
  assert.equal(result.total, 89);
  assert.equal(result.verdict, 'NEAR READY');
  assert.equal(result.beta_ready, false);
  assert.equal(result.requires_internal_loop, true);
});

test('below 85 remains NOT BETA READY', () => {
  const result = evaluateScorecard(scorecard({ score: 8 }));
  assert.equal(result.total, 80);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.equal(result.beta_ready, false);
});

test('critical FAIL blocks a high numerical score', () => {
  const candidate = scorecard({ score: 10 });
  candidate.critical.section_identity = 'FAIL';
  const result = evaluateScorecard(candidate);
  assert.equal(result.total, 100);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.deepEqual(result.failed_critical, ['section_identity']);
});

test('critical UNKNOWN blocks a high numerical score', () => {
  const candidate = scorecard({ score: 10 });
  candidate.critical.final_pdf_usability = 'UNKNOWN';
  const result = evaluateScorecard(candidate);
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
