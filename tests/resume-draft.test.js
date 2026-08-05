const test = require('node:test'); const assert = require('node:assert/strict');
const { MockResumeDraftProvider, RESUME_DRAFT_JSON_SCHEMA } = require('../src/resume-draft');
const validation = require('../src/resume-validation');

test('structured draft cites only committed facts and omits unsupported sections', async () => {
  const facts = new Map([['fact-sql', { id: 'fact-sql', entity_type: 'skill', value: { name: 'SQL' } }]]);
  const selections = [{ id: 'selection-sql', candidate_fact_id: 'fact-sql', selection_state: 'include', recommended_section: 'Skills', mapped_requirement_ids: ['requirement-sql'], permitted_claim_scope: ['skill_name'], inherited_provenance_references: ['decision-sql'], candidate_fact_revision: 'fact-sql' }];
  const result = await new MockResumeDraftProvider().draft({ facts, selections, requirements: [] });
  assert.ok(result.draft.sections.some((section) => section.section === 'Professional Summary'));
  assert.deepEqual(result.draft.sections.find((section) => section.section === 'Skills').statements[0].candidate_fact_ids, ['fact-sql']);
  assert.ok(!result.draft.sections.some((section) => section.section === 'Projects'));
  assert.equal(RESUME_DRAFT_JSON_SCHEMA.properties.sections.items.properties.statements.items.required.includes('candidate_fact_ids'), true);
});

test('draft statement citing an unsupported fact is blocked by deterministic validation', () => {
  const selection = { id: 'selection-sql', candidate_fact_id: 'fact-sql', candidate_fact_revision: 'fact-sql', selection_state: 'include', recommended_section: 'Skills', mapped_requirement_ids: ['requirement-sql'], permitted_claim_scope: ['skill_name'], inherited_provenance_references: ['decision-sql'] };
  const artifactRun = { id: 'artifact-run', resume_tailoring_plan_run_id: 'plan-run', resume_artifacts: [{ content: { sections: [{ section: 'Skills', position: 1, statements: [{ statement_id: 'draft:Skills:1', template: 'skill_name', text: 'SQL', resume_content_selection_ids: [selection.id], provenance: { candidate_fact_id: 'fact-sql', candidate_fact_ids: ['invented-fact'], job_requirement_ids: ['requirement-sql'], inherited_provenance_references: ['decision-sql'] } }] }] }, metadata: { traceability: { resume_artifact_run_id: 'artifact-run', resume_tailoring_plan_run_id: 'plan-run' }, omissions: [], blocked_claims: [], requirement_coverage: [], draft_provider: { provider: 'openai-compatible', model: 'test' } } }] };
  const plan = { id: 'plan-run', resume_content_selections: [selection], candidate_knowledge_snapshot: [{ id: 'fact-sql' }], requirement_coverage: [{ job_requirement_id: 'requirement-sql', coverage_status: 'covered' }], section_plans: [{ section: 'Skills' }] };
  const result = validation.validate({ artifactRun, plan, integrity: new Map([['fact-sql', { fact_exists: true, integration_exists: true, provenance_exists: true }]]) });
  assert.ok(result.findings.some((item) => item.rule === 'statement-fact-provenance'));
});
