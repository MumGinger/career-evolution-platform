const test = require('node:test');
const assert = require('node:assert/strict');

const scorecard = require('../../reports/pre-beta-quality/cycle3-real-input-repair-scorecard.json');
const { evaluateScorecard } = require('../../src/pre-beta-quality-gate');

test('Issue #138 Cycle 3 keeps its 92 artifact score but remains blocked without shipped-flow proof', () => {
  const result = evaluateScorecard(scorecard);
  assert.equal(result.total, 92);
  assert.equal(result.verdict, 'NOT BETA READY');
  assert.equal(result.beta_ready, false);
  assert.deepEqual(result.failed_critical, []);
  assert.deepEqual(result.unknown_critical, ['shipped_flow_completion']);
  assert.equal(result.requires_internal_loop, true);
});
