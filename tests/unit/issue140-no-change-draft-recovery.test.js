const test = require('node:test');
const assert = require('node:assert/strict');

const { recoverableNoChangeBlock, recoverNoChangeBlock } = require('../../src/no-change-draft-recovery');

function session(overrides = {}) {
  return {
    stage: 'draft-blocked',
    tailoring: { resume_content_selections: [] },
    generatedReview: [{ section: 'Projects', ai_version: { statements: [{ text: 'Source project' }] } }],
    tailoringReview: [],
    ...overrides,
  };
}

function prepared(overrides = {}) {
  return {
    stage: 'Draft blocked',
    blocked: true,
    draftValidation: 'passed',
    tailoringReview: [],
    resumeMarkdown: '## Projects\n\n- Source project',
    message: 'Tailoring Review is blocked because required included evidence did not render in its planned Experience or Projects section.',
    ...overrides,
  };
}

test('valid complete source resume with zero material changes is recoverable instead of applicant dead-end', () => {
  const state = session();
  const result = recoverNoChangeBlock(state, prepared());

  assert.equal(recoverableNoChangeBlock(session(), prepared()), true);
  assert.equal(result.blocked, false);
  assert.equal(result.stage, 'Tailoring Review');
  assert.equal(result.message, null);
  assert.equal(result.recovery.reason, 'valid_complete_resume_with_no_material_wording_changes');
  assert.equal(state.stage, 'tailoring-review');
});

test('failed deterministic validation is never recovered', () => {
  const state = session();
  const input = prepared({ draftValidation: 'failed' });
  assert.equal(recoverableNoChangeBlock(state, input), false);
  assert.equal(recoverNoChangeBlock(state, input), input);
  assert.equal(state.stage, 'draft-blocked');
});

test('missing required included Project evidence remains blocked', () => {
  const state = session({
    tailoring: {
      resume_content_selections: [{
        id: 'selection-project',
        selection_state: 'include',
        recommended_section: 'Projects',
      }],
    },
  });
  const input = prepared();
  assert.equal(recoverableNoChangeBlock(state, input), false);
  assert.equal(recoverNoChangeBlock(state, input), input);
  assert.equal(state.stage, 'draft-blocked');
});
