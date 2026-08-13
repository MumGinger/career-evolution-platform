const test = require('node:test');
const assert = require('node:assert/strict');
const artifact = require('../../src/resume-artifact');
const validation = require('../../src/resume-validation');

function fixture() {
  const facts = [
    { id: 'fact-a', entity_type: 'responsibility', value: { text: 'Built Power BI dashboards using Python and SQL.' }, integration_decision_id: 'integration-a' },
    { id: 'fact-b', entity_type: 'responsibility', value: { text: 'Automated weekly reporting workflows in Python.' }, integration_decision_id: 'integration-b' },
  ];
  const selections = facts.map((fact, index) => ({
    id: `selection-${index + 1}`,
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    mapped_requirement_ids: [`requirement-${index + 1}`],
    selection_state: 'include',
    relevance_rationale: 'Relevant source evidence.',
    inherited_provenance_references: [fact.integration_decision_id],
    recommended_section: 'Projects',
    emphasis_level: 'high',
    priority_score: 100 - index,
    permitted_claim_scope: ['bounded_project_responsibilities'],
    blocked_claim_scopes: [],
    limitations: [],
  }));
  const source = {
    format: 'source-resume-composition/1.0.0',
    policy_version: 'complete-resume-composition-boundary/1.0.0',
    source_resume_artifact_id: 'source-artifact',
    source_resume_artifact_version_id: 'source-version',
    resume_semantic_run_id: 'semantic-run',
    sections: [{
      section: 'Projects',
      position: 1,
      statements: [
        { statement_id: 'source-a', source_statement_id: 'source-a', text: facts[0].value.text, section: 'Projects', position: 1, display_style: 'bullet', content_origin: 'source_resume_passthrough', resume_content_selection_ids: [], parent_source_statement_id: 'source-heading', provenance: { source_kind: 'validated_resume_understanding', exact_source_text: facts[0].value.text } },
        { statement_id: 'source-b', source_statement_id: 'source-b', text: facts[1].value.text, section: 'Projects', position: 2, display_style: 'bullet', content_origin: 'source_resume_passthrough', resume_content_selection_ids: [], parent_source_statement_id: 'source-heading', provenance: { source_kind: 'validated_resume_understanding', exact_source_text: facts[1].value.text } },
      ],
    }],
  };
  const plan = {
    id: 'plan-fanin',
    job_requirement_profile_id: 'job-fanin',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: facts,
    resume_content_selections: selections,
    requirement_coverage: selections.map((selection) => ({ job_requirement_id: selection.mapped_requirement_ids[0], coverage_status: 'covered' })),
    section_plans: [{ section: 'Projects', recommended_order: 1, candidate_fact_ids: facts.map((fact) => fact.id) }],
    source_resume_snapshot: source,
  };
  const draftResult = {
    provider: 'openai-compatible',
    model: 'provider-replay',
    version: 'resume-draft/1.0.0',
    draft: {
      sections: [{
        section: 'Projects',
        statements: [{
          text: `${facts[0].value.text} ${facts[1].value.text}`,
          candidate_fact_ids: facts.map((fact) => fact.id),
          job_requirement_ids: ['requirement-1'],
        }],
      }],
    },
  };
  const integrity = new Map(facts.map((fact) => [fact.id, { fact_exists: true, integration_exists: true, provenance_exists: true }]));
  return { plan, draftResult, integrity };
}

test('one provider statement representing two source-linked facts supersedes both source statements but renders once', () => {
  const { plan, draftResult, integrity } = fixture();
  const structured = artifact.generate(plan, null, draftResult);
  const projects = structured.sections.find((section) => section.section === 'Projects').statements;
  const visible = projects.map((statement) => statement.text);
  assert.equal(visible.length, 1, JSON.stringify(projects, null, 2));
  assert.equal(visible[0].includes('Built Power BI dashboards using Python and SQL.'), true);
  assert.equal(visible[0].includes('Automated weekly reporting workflows in Python.'), true);
  assert.equal(structured.metadata.composition.superseded_source_statements.length, 2);
  assert.deepEqual(
    structured.metadata.composition.superseded_source_statements.map((item) => item.source_statement_id).sort(),
    ['source-a', 'source-b'],
  );
  assert.ok(structured.metadata.composition.superseded_source_statements.every((item) => item.generated_statement_ids.length === 1));
  assert.deepEqual(
    structured.metadata.composition.superseded_source_statements.flatMap((item) => item.resume_content_selection_ids).sort(),
    ['selection-1', 'selection-2'],
  );

  const artifactRun = {
    id: 'artifact-run-fanin',
    resume_tailoring_plan_run_id: plan.id,
    resume_artifacts: [{
      artifact_type: 'structured_resume',
      content: { sections: structured.sections },
      metadata: {
        ...structured.metadata,
        traceability: {
          resume_artifact_run_id: 'artifact-run-fanin',
          resume_tailoring_plan_run_id: plan.id,
        },
      },
    }],
  };
  const result = validation.validate({ artifactRun, plan, integrity });
  const critical = result.findings.filter((finding) => ['critical', 'error'].includes(finding.severity));
  assert.deepEqual(critical, [], JSON.stringify(critical, null, 2));
});
