const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { Store } = require('../src/store');
const artifactGeneration = require('../src/resume-artifact');

function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-artifact-')); const store = new Store(path.join(dir, 'test.db')); try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }
function prepared(store) {
  const profile = store.createProfile({ name: 'Synthetic Candidate' });
  const job = store.createJobRequirementProfile({ company: 'Acme', roleTitle: 'Data Analyst', jobDescription: 'Required Qualifications:\nSQL required.\nPython required.' });
  const needs = store.createInformationNeedRun({ candidateProfileId: profile.id, jobRequirementProfileId: job.id });
  const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
  const acquisition = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id });
  const action = acquisition.acquisition_plans.flatMap((item) => item.acquisition_actions)[0];
  const result = store.createAcquisitionResultRun({ acquisitionPlanRunId: acquisition.id, captures: [{ actionId: action.id, rawCapturedEvidence: { text: 'Synthetic confirmation.' } }] });
  const source = result.acquisition_results[0];
  store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: profile.id, acquisitionResultRunId: result.id, proposals: [
    { entityType: 'skill', value: { name: 'SQL' }, confirmationStatus: 'confirmed', confidenceLevel: 'high', sourceEvidenceRefs: [{ type: 'acquisition_result', id: source.id, positiveConfirmation: true }] },
    { entityType: 'skill', value: { name: 'Python' }, confirmationStatus: 'confirmed', confidenceLevel: 'high', sourceEvidenceRefs: [{ type: 'acquisition_result', id: source.id, positiveConfirmation: true }] },
    { entityType: 'skill', value: { name: 'Communication' }, confirmationStatus: 'confirmed', confidenceLevel: 'high', sourceEvidenceRefs: [{ type: 'acquisition_result', id: source.id, positiveConfirmation: true }] },
  ] });
  return { profile, job };
}

test('renders a deterministic structured artifact with selection and fact provenance', () => withStore((store) => {
  const setup = prepared(store);
  const plan = store.createResumeTailoringPlanRun({ candidateProfileId: setup.profile.id, jobRequirementProfileId: setup.job.id });
  const run = store.createResumeArtifactRun({ resumeTailoringPlanRunId: plan.id });
  const artifact = run.resume_artifacts[0];
  const skills = artifact.content.sections.find((section) => section.section === 'Skills');
  const summary = artifact.content.sections.find((section) => section.section === 'Professional Summary');
  assert.equal(artifact.artifact_type, 'structured_resume');
  assert.equal(artifact.content.format, 'resume-artifact-model/1.0.0');
  assert.equal(summary.statements.length, 0);
  assert.ok(summary.placeholder);
  assert.deepEqual(skills.statements.map((statement) => statement.text), ['Python', 'SQL']);
  for (const statement of skills.statements) { assert.equal(statement.resume_content_selection_ids.length, 1); assert.ok(statement.provenance.candidate_fact_id); assert.ok(statement.provenance.inherited_provenance_references[0]); }
}));

test('keeps omissions and blocked claims in metadata and never renders them', () => withStore((store) => {
  const setup = prepared(store); const plan = store.createResumeTailoringPlanRun({ candidateProfileId: setup.profile.id, jobRequirementProfileId: setup.job.id }); const run = store.createResumeArtifactRun({ resumeTailoringPlanRunId: plan.id }); const artifact = run.resume_artifacts[0];
  const visible = artifact.content.sections.flatMap((section) => section.statements).map((statement) => statement.text);
  assert.ok(artifact.metadata.omissions.some((item) => item.state === 'omit'));
  assert.ok(artifact.metadata.blocked_claims.every((item) => item.blocked_claim_scopes.includes('proficiency')));
  assert.ok(!visible.includes('Communication'));
}));

test('runs retain plan snapshots and are immutable', () => withStore((store) => {
  const setup = prepared(store); const plan = store.createResumeTailoringPlanRun({ candidateProfileId: setup.profile.id, jobRequirementProfileId: setup.job.id }); const one = store.createResumeArtifactRun({ resumeTailoringPlanRunId: plan.id }); const two = store.createResumeArtifactRun({ resumeTailoringPlanRunId: plan.id });
  assert.notEqual(one.id, two.id); assert.deepEqual(one.candidate_knowledge_snapshot, plan.candidate_knowledge_snapshot); assert.deepEqual(one.job_requirement_profile_reference, { id: plan.job_requirement_profile_id, version: plan.job_requirement_profile_version }); assert.equal(store.getResumeArtifactRun(one.id).resume_artifacts[0].id, one.resume_artifacts[0].id);
}));

test('deterministically completes an included Projects selection omitted by the draft provider', () => {
  const project = { id: 'fact-project', entity_type: 'project', value: { name: 'Source-bound Project', text: 'Source-bound project responsibility.', source_reference: 'span-project' } };
  const responsibility = { id: 'fact-responsibility', entity_type: 'responsibility', value: { text: 'Source-bound experience responsibility.' } };
  const selection = (id, fact, section, scope) => ({ id, candidate_fact_id: fact.id, candidate_fact_revision: fact.id, selection_state: 'include', recommended_section: section, mapped_job_requirement_ids: [], inherited_provenance_references: ['integration-decision'], permitted_claim_scope: scope, blocked_claim_scopes: [], relevance_rationale: 'Synthetic included selection.' });
  const plan = { id: 'plan-1', job_requirement_profile_id: 'job-1', job_requirement_profile_version: 1, candidate_knowledge_snapshot: [project, responsibility], resume_content_selections: [selection('selection-project', project, 'Projects', ['project_name', 'bounded_project_responsibilities']), selection('selection-responsibility', responsibility, 'Experience', ['bounded_responsibility'])], requirement_coverage: [], section_plans: [{ section: 'Experience' }, { section: 'Projects' }] };
  const providerResult = { provider: 'openai-compatible', model: 'synthetic-model', version: 'resume-draft/1.0.0', draft: { sections: [{ section: 'Experience', statements: [{ text: 'Source-bound experience responsibility.', candidate_fact_ids: ['fact-responsibility'], job_requirement_ids: [] }] }] } };
  const generated = artifactGeneration.generate(plan, null, providerResult);
  const projects = generated.sections.find((section) => section.section === 'Projects');
  assert.equal(projects.statements.length, 1);
  assert.deepEqual(projects.statements[0].resume_content_selection_ids, ['selection-project']);
  assert.deepEqual(generated.metadata.draft_completion_fallbacks, [{ resume_content_selection_id: 'selection-project', candidate_fact_id: 'fact-project', recommended_section: 'Projects', reason: 'provider_omitted_included_selection' }]);
});
