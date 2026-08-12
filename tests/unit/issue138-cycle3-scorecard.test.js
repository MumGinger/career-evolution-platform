const test = require('node:test');
const assert = require('node:assert/strict');

const scorecard = require('../../reports/pre-beta-quality/cycle3-real-input-repair-scorecard.json');
const { evaluateScorecard } = require('../../src/pre-beta-quality-gate');

test('Issue #138 Cycle 3 real-input repair clears the deterministic 90-point gate', () => {
  const result = evaluateScorecard(scorecard);
  assert.equal(result.total, 92);
  assert.equal(result.verdict, 'BETA READY');
  assert.equal(result.beta_ready, true);
  assert.deepEqual(result.failed_critical, []);
  assert.deepEqual(result.unknown_critical, []);
  assert.equal(result.requires_internal_loop, false);
});
