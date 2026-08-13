const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultTailoringDecisions } = require('../../src/beta-ui');

function session() {
  return {
    tailoringReview: [
      { id: 'change-1', materialRewrite: true },
      { id: 'change-2', materialRewrite: true },
      { id: 'no-material-change', materialRewrite: false },
    ],
  };
}

test('untouched material proposals default to use_tailored without per-line approval', () => {
  assert.deepEqual(defaultTailoringDecisions(session(), []), [
    { id: 'change-1', action: 'use_tailored' },
    { id: 'change-2', action: 'use_tailored' },
  ]);
});

test('an explicit exception is preserved while untouched proposals still default to use_tailored', () => {
  assert.deepEqual(defaultTailoringDecisions(session(), [
    { id: 'change-1', action: 'needs_correction', correction: 'This was coursework, not professional Experience.' },
  ]), [
    { id: 'change-1', action: 'needs_correction', correction: 'This was coursework, not professional Experience.' },
    { id: 'change-2', action: 'use_tailored' },
  ]);
});

test('unknown or duplicate explicit decisions are rejected', () => {
  assert.throws(() => defaultTailoringDecisions(session(), [{ id: 'unknown', action: 'keep_original' }]), /unknown or duplicate/i);
  assert.throws(() => defaultTailoringDecisions(session(), [
    { id: 'change-1', action: 'keep_original' },
    { id: 'change-1', action: 'use_tailored' },
  ]), /unknown or duplicate/i);
});
