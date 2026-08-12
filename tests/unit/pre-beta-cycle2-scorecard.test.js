const test = require('node:test');
const assert = require('node:assert/strict');

const scorecard = require('../../reports/pre-beta-quality/cycle2-representative-scorecard.json');
const { evaluateScorecard } = require('../../src/pre-beta-quality-gate');

test('Cycle 2 representative scorecard clears the deterministic 90-point gate', () => {
  const result = evaluateScorecard(scorecard);
  assert.equal(result.total, 91);
  assert.equal(result.verdict, 'BETA READY');
  assert.equal(result.beta_ready, true);
  assert.deepEqual(result.failed_critical, []);
  assert.deepEqual(result.unknown_critical, []);
  assert.equal(result.requires_internal_loop, false);
});
