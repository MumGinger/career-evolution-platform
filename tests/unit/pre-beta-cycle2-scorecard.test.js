const test = require('node:test');
const assert = require('node:assert/strict');

const scorecard = require('../../reports/pre-beta-quality/cycle2-representative-scorecard.json');
const { evaluateScorecard } = require('../../src/pre-beta-quality-gate');

test('Cycle 2 keeps its 91 artifact score but cannot be Beta-ready without shipped-flow proof', () => {
  const result = evaluateScorecard(scorecard);
  assert.equal(result.total, 91);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.equal(result.beta_ready, false);
  assert.deepEqual(result.failed_critical, []);
  assert.deepEqual(result.unknown_critical, ['shipped_flow_completion']);
  assert.equal(result.requires_internal_loop, true);
});
