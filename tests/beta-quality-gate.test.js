const test = require('node:test');
const assert = require('node:assert/strict');
const { qualityReady } = require('../src/beta-ui');

function artifact(sections) {
  return {
    resume_artifacts: [{
      artifact_type: 'structured_resume',
      content: { sections },
    }],
  };
}

function section(name, selectionIds = []) {
  return {
    section: name,
    statements: selectionIds.map((selectionId) => ({
      text: `${name} statement`,
      resume_content_selection_ids: [selectionId],
    })),
  };
}

test('an omitted responsibility does not block a valid Projects-only draft', () => {
  const tailoring = {
    resume_content_selections: [
      { id: 'project-include', selection_state: 'include', recommended_section: 'Projects' },
      { id: 'responsibility-omit', selection_state: 'omit', recommended_section: 'Experience' },
    ],
  };

  assert.equal(
    qualityReady(
      artifact([section('Projects', ['project-include'])]),
      [{ section: 'Projects' }],
      tailoring,
    ),
    true,
  );
});

test('an included core selection still blocks when absent from its recommended section', () => {
  const tailoring = {
    resume_content_selections: [
      { id: 'project-include', selection_state: 'include', recommended_section: 'Projects' },
      { id: 'experience-include', selection_state: 'include', recommended_section: 'Experience' },
    ],
  };

  assert.equal(
    qualityReady(
      artifact([section('Projects', ['project-include'])]),
      [{ section: 'Projects' }],
      tailoring,
    ),
    false,
  );
});

test('rendered included Experience and Projects selections pass the quality gate', () => {
  const tailoring = {
    resume_content_selections: [
      { id: 'project-include', selection_state: 'include', recommended_section: 'Projects' },
      { id: 'experience-include', selection_state: 'include', recommended_section: 'Experience' },
      { id: 'old-responsibility', selection_state: 'deprioritize', recommended_section: 'Experience' },
    ],
  };

  assert.equal(
    qualityReady(
      artifact([
        section('Experience', ['experience-include']),
        section('Projects', ['project-include']),
      ]),
      [{ section: 'Experience' }, { section: 'Projects' }],
      tailoring,
    ),
    true,
  );
});
