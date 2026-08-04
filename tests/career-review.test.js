const test = require('node:test');
const assert = require('node:assert/strict');
const { createCareerReview } = require('../src/career-review');
const { createFinalExport } = require('../src/final-export');

const artifact = { id: 'artifact-run-1', resume_artifacts: [{ content: { sections: [{ section: 'Skills', statements: [] }] } }] };
const presentationStrategy = { traceability: { resume_artifact_run_id: 'artifact-run-1' }, decisions: [{ section: 'Skills', rationale: 'Supported skill evidence.' }] };
const validation = { id: 'validation-1', validation_status: 'passed' };

test('Career Review requires an explicit approval for every resume section', () => {
  const review = createCareerReview({ artifact, presentationStrategy, reviewInput: { sections: [] } });
  assert.equal(review.completed, false);
  assert.match(review.block_reasons[0], /Skills/);
  assert.throws(() => createFinalExport({ artifact, validation, careerReview: review }), /blocked until Career Review/);
});

test('final export becomes available only after complete Career Review and passing validation', () => {
  const review = createCareerReview({ artifact, presentationStrategy, reviewInput: { sections: [{ section: 'Skills', status: 'approved' }] } });
  const result = createFinalExport({ artifact, validation, careerReview: review });
  assert.equal(review.completed, true);
  assert.equal(result.export_status, 'ready');
});
