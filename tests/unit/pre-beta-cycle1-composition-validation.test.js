const test = require('node:test');
const assert = require('node:assert/strict');

const validation = require('../../src/resume-validation');

function sourceStatement(id, text, section, displayStyle = 'line') {
  return {
    statement_id: id,
    source_statement_id: id,
    text,
    section,
    position: 1,
    display_style: displayStyle,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: null,
    provenance: { source_kind: 'validated_resume_understanding', exact_source_text: text },
  };
}

test('validator accepts an exact source statement omitted by an explicit role-specific omit selection', () => {
  const source = sourceStatement('source:gift', 'Gift Recommendation App', 'Projects', 'heading');
  const fact = {
    id: 'fact-gift',
    entity_type: 'project',
    value: { name: 'Gift Recommendation App' },
  };
  const selection = {
    id: 'selection-gift',
    candidate_fact_id: fact.id,
    selection_state: 'omit',
    recommended_section: 'Projects',
    permitted_claim_scope: [],
  };
  const plan = {
    candidate_knowledge_snapshot: [fact],
    resume_content_selections: [selection],
    source_resume_snapshot: {
      policy_version: 'complete-resume-composition-boundary/1.0.0',
      sections: [{ section: 'Projects', statements: [source] }],
    },
  };
  const artifact = {
    content: { sections: [{ section: 'Projects', position: 5, statements: [] }] },
    metadata: {
      composition: {
        policy_version: 'complete-resume-composition-boundary/1.0.0',
        source_statement_count: 1,
        preserved_source_statement_ids: [],
        superseded_source_statements: [],
        omitted_source_statements: [{
          source_statement_id: source.statement_id,
          resume_content_selection_ids: [selection.id],
          reason: 'explicit_role_specific_omission',
        }],
      },
    },
  };
  const findings = [];

  validation.validateSourceComposition({ artifact, plan, findings });
  assert.deepEqual(findings, []);
});

test('validator accepts a supported cross-section summary as an auditable replacement for broad source summary', () => {
  const source = sourceStatement(
    'source:summary',
    'Seeking internship roles in finance, data analytics, quantitative finance, and software engineering.',
    'Professional Summary',
  );
  const fact = {
    id: 'fact-analytics',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI dashboards and automated reporting workflows for business analysis.' },
  };
  const selection = {
    id: 'selection-analytics',
    candidate_fact_id: fact.id,
    selection_state: 'include',
    recommended_section: 'Experience',
    permitted_claim_scope: ['bounded_responsibility', 'cross_section_summary'],
  };
  const generated = {
    statement_id: 'draft:Professional Summary:1',
    text: 'Data analytics candidate with Power BI dashboard and reporting automation experience.',
    template: 'bounded_responsibility',
    content_origin: 'candidate_knowledge_generated',
    resume_content_selection_ids: [selection.id],
    provenance: { candidate_fact_ids: [fact.id] },
  };
  const plan = {
    candidate_knowledge_snapshot: [fact],
    resume_content_selections: [selection],
    source_resume_snapshot: {
      policy_version: 'complete-resume-composition-boundary/1.0.0',
      sections: [{ section: 'Professional Summary', statements: [source] }],
    },
  };
  const artifact = {
    content: { sections: [{ section: 'Professional Summary', position: 2, statements: [generated] }] },
    metadata: {
      composition: {
        policy_version: 'complete-resume-composition-boundary/1.0.0',
        source_statement_count: 1,
        preserved_source_statement_ids: [],
        omitted_source_statements: [],
        superseded_source_statements: [{
          source_statement_id: source.statement_id,
          generated_statement_ids: [generated.statement_id],
          reason: 'supported_job_specific_summary_replacement',
        }],
      },
    },
  };
  const findings = [];

  validation.validateSourceComposition({ artifact, plan, findings });
  assert.deepEqual(findings, []);
});
