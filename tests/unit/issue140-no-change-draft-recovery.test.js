const test = require('node:test');
const assert = require('node:assert/strict');

const { recoverableNoChangeBlock, recoverNoChangeBlock, requiredCoreCoveredBySource } = require('../../src/no-change-draft-recovery');

function sourceStatement(text) {
  return {
    text,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    provenance: { exact_source_text: text },
  };
}

function session(overrides = {}) {
  return {
    stage: 'draft-blocked',
    tailoring: { resume_content_selections: [], candidate_knowledge_snapshot: [] },
    generatedReview: [{
      section: 'Projects',
      ai_version: { statements: [sourceStatement('Source project')] },
    }],
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

test('valid complete source resume with zero core selections and zero material changes is recoverable', () => {
  const state = session();
  const result = recoverNoChangeBlock(state, prepared());

  assert.equal(recoverableNoChangeBlock(session(), prepared()), true);
  assert.equal(result.blocked, false);
  assert.equal(result.stage, 'Tailoring Review');
  assert.equal(result.message, null);
  assert.equal(result.recovery.reason, 'valid_complete_resume_with_no_material_wording_changes');
  assert.deepEqual(result.recovery.source_equivalent_core_selection_ids, []);
  assert.equal(state.stage, 'tailoring-review');
});

test('required Project selection can recover only when its committed fact is visibly source-equivalent in Projects', () => {
  const state = session({
    tailoring: {
      resume_content_selections: [{
        id: 'selection-project-detail',
        candidate_fact_id: 'fact-project-detail',
        selection_state: 'include',
        recommended_section: 'Projects',
      }],
      candidate_knowledge_snapshot: [{
        id: 'fact-project-detail',
        entity_type: 'responsibility',
        value: { text: 'Built Power BI dashboards using Python and SQL.' },
      }],
    },
    generatedReview: [{
      section: 'Projects',
      ai_version: { statements: [
        sourceStatement('Analytics Dashboard'),
        sourceStatement('Built Power BI dashboards using Python and SQL.'),
      ] },
    }],
  });

  assert.equal(requiredCoreCoveredBySource(state), true);
  const result = recoverNoChangeBlock(state, prepared());
  assert.equal(result.blocked, false);
  assert.equal(result.recovery.reason, 'valid_source_equivalent_core_evidence_with_no_material_wording_changes');
  assert.deepEqual(result.recovery.source_equivalent_core_selection_ids, ['selection-project-detail']);
});

test('failed deterministic validation is never recovered', () => {
  const state = session();
  const input = prepared({ draftValidation: 'failed' });
  assert.equal(recoverableNoChangeBlock(state, input), false);
  assert.equal(recoverNoChangeBlock(state, input), input);
  assert.equal(state.stage, 'draft-blocked');
});

test('required included Project evidence that is not present as source-equivalent content remains blocked', () => {
  const state = session({
    tailoring: {
      resume_content_selections: [{
        id: 'selection-project',
        candidate_fact_id: 'fact-project',
        selection_state: 'include',
        recommended_section: 'Projects',
      }],
      candidate_knowledge_snapshot: [{
        id: 'fact-project',
        entity_type: 'responsibility',
        value: { text: 'Built a missing dashboard.' },
      }],
    },
  });
  const input = prepared();
  assert.equal(requiredCoreCoveredBySource(state), false);
  assert.equal(recoverableNoChangeBlock(state, input), false);
  assert.equal(recoverNoChangeBlock(state, input), input);
  assert.equal(state.stage, 'draft-blocked');
});

test('generated text cannot masquerade as source-equivalent evidence for no-change recovery', () => {
  const state = session({
    tailoring: {
      resume_content_selections: [{
        id: 'selection-project',
        candidate_fact_id: 'fact-project',
        selection_state: 'include',
        recommended_section: 'Projects',
      }],
      candidate_knowledge_snapshot: [{
        id: 'fact-project',
        entity_type: 'responsibility',
        value: { text: 'Built Power BI dashboards using Python and SQL.' },
      }],
    },
    generatedReview: [{
      section: 'Projects',
      ai_version: { statements: [{
        text: 'Built Power BI dashboards using Python and SQL.',
        content_origin: 'candidate_knowledge_generated',
      }] },
    }],
  });

  assert.equal(requiredCoreCoveredBySource(state), false);
  assert.equal(recoverableNoChangeBlock(state, prepared()), false);
});
