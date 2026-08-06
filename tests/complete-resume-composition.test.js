const test = require('node:test');
const assert = require('node:assert/strict');
const composition = require('../src/resume-composition');
const artifactGeneration = require('../src/resume-artifact');
const validation = require('../src/resume-validation');
const humanReview = require('../src/human-review');

function sourceSnapshot() {
  return composition.composeSourceResume({
    profile: { id: 'profile-1', name: 'private candidate Tang', email: 'ya.ching@example.com' },
    semanticRun: {
      id: 'semantic-1', artifact_id: 'resume-1', artifact_version_id: 'resume-v1',
      spans: [
        ['s1', 0, 'private candidate Tang'], ['s2', 1, 'ya.ching@example.com'], ['s3', 2, '+1 416 555 0123'],
        ['s4', 3, 'Power BI'], ['s5', 4, 'Python'], ['s6', 5, 'Data Analyst — Example Co.'], ['s7', 6, 'Delivered reporting for stakeholders.'],
        ['s8', 7, 'Customer Analytics Dashboard'], ['s9', 8, 'Built Power BI dashboards and automation workflows.'],
        ['s10', 9, 'B.Sc. Information Systems — Example University'], ['s11', 10, 'Microsoft Power BI Data Analyst'],
      ].map(([id, bullet_index, raw_text]) => ({ id, bullet_index, raw_text, artifact_id: 'resume-1', artifact_version_id: 'resume-v1' })),
      entities: [
        ['e1', 'identity', 's1', 'identity-1', null], ['e2', 'identity', 's2', 'identity-2', null], ['e3', 'identity', 's3', 'identity-3', null],
        ['e4', 'skill', 's4', 'skill-1', null], ['e5', 'tool', 's5', 'tool-1', null],
        ['e6', 'experience', 's6', 'experience-1', null], ['e7', 'responsibility', 's7', 'responsibility-1', 'experience-1'],
        ['e8', 'project', 's8', 'project-1', null], ['e9', 'responsibility', 's9', 'responsibility-2', 'project-1'],
        ['e10', 'education', 's10', 'education-1', null], ['e11', 'certification', 's11', 'certification-1', null],
      ].map(([id, entity_type, evidence_span_id, upstream_block_id, parent_id]) => ({ id, entity_type, evidence_span_id, name: id, attributes: { upstream_block_id, parent_id } })),
    },
  });
}

function plan() {
  const project = { id: 'fact-project', entity_type: 'project', value: { name: 'Customer Analytics Dashboard', text: 'Built Power BI dashboards and automation workflows.' }, integration_decision_id: 'integration-1' };
  return {
    id: 'plan-1', job_requirement_profile_id: 'job-1', job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [project], source_resume_snapshot: sourceSnapshot(),
    resume_content_selections: [{
      id: 'selection-project', candidate_fact_id: project.id, candidate_fact_revision: project.id,
      mapped_requirement_ids: ['requirement-1'], selection_state: 'include', relevance_rationale: 'Supported project evidence.',
      inherited_provenance_references: ['integration-1'], recommended_section: 'Projects', emphasis_level: 'high', priority_score: 20,
      permitted_claim_scope: ['project_name', 'bounded_project_responsibilities'], blocked_claim_scopes: ['proficiency', 'years_of_experience'], limitations: '',
    }],
    requirement_coverage: [{ job_requirement_id: 'requirement-1', coverage_status: 'covered', coverage_rationale: 'Explicit project.' }],
    section_plans: [{ section: 'Projects', recommended_order: 1, candidate_fact_ids: [project.id] }],
  };
}

function artifactRun(generated) {
  generated.metadata.traceability = { resume_artifact_run_id: 'artifact-run-1', resume_tailoring_plan_run_id: 'plan-1' };
  return {
    id: 'artifact-run-1', resume_tailoring_plan_run_id: 'plan-1',
    resume_artifacts: [{ artifact_type: 'structured_resume', content: { format: generated.format, sections: generated.sections }, metadata: generated.metadata }],
  };
}

test('source composition retains identity, contact, hierarchy, essential sections, and exact provenance outside Candidate Knowledge', () => {
  const snapshot = sourceSnapshot();
  assert.deepEqual(snapshot.sections.map((section) => section.section), ['Applicant Header', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications']);
  assert.deepEqual(snapshot.sections[0].statements.map((statement) => statement.text), ['private candidate Tang', 'ya.ching@example.com', '+1 416 555 0123']);
  assert.equal(snapshot.sections.find((section) => section.section === 'Experience').statements[1].parent_source_statement_id, snapshot.sections.find((section) => section.section === 'Experience').statements[0].statement_id);
  for (const statement of snapshot.sections.flatMap((section) => section.statements)) {
    assert.equal(statement.content_origin, 'source_resume_passthrough');
    assert.deepEqual(statement.resume_content_selection_ids, []);
    assert.equal(statement.text, statement.provenance.exact_source_text);
  }
});

test('Projects-only Candidate Knowledge tailoring produces a complete recognizable resume', () => {
  const setup = plan();
  const provider = { provider: 'openai-compatible', model: 'fixture', version: 'resume-draft/1.0.0', draft: { sections: [{ section: 'Projects', statements: [{ text: 'Built a customer analytics dashboard with Power BI automation workflows.', candidate_fact_ids: ['fact-project'], job_requirement_ids: ['requirement-1'] }] }] } };
  const generated = artifactGeneration.generate(setup, null, provider);
  const bySection = new Map(generated.sections.map((section) => [section.section, section]));
  for (const section of ['Applicant Header', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications']) assert.ok(bySection.get(section).statements.length > 0, section);
  assert.deepEqual(bySection.get('Experience').statements.map((statement) => statement.content_origin), ['source_resume_passthrough', 'source_resume_passthrough']);
  assert.equal(bySection.get('Projects').statements.some((statement) => statement.content_origin === 'candidate_knowledge_generated'), true);
  assert.equal(generated.metadata.composition.source_statement_count, 11);
  assert.ok(generated.metadata.composition.superseded_source_statements.some((item) => item.source_statement_id.includes(':s9')));
});

test('validation separates generated claim safety from whole-resume completeness', () => {
  const setup = plan();
  const generated = artifactGeneration.generate(setup);
  assert.equal(generated.sections.find((section) => section.section === 'Projects').statements.find((statement) => statement.content_origin === 'candidate_knowledge_generated').text, 'Built Power BI dashboards and automation workflows.');
  const checked = validation.validate({ artifactRun: artifactRun(generated), plan: setup, integrity: new Map([['fact-project', { fact_exists: true, integration_exists: true, provenance_exists: true }]]) });
  assert.notEqual(validation.statusFor(checked.findings), 'failed', JSON.stringify(checked.findings));

  const broken = structuredClone(generated);
  broken.sections.find((section) => section.section === 'Education').statements = [];
  const brokenChecked = validation.validate({ artifactRun: artifactRun(broken), plan: setup, integrity: new Map([['fact-project', { fact_exists: true, integration_exists: true, provenance_exists: true }]]) });
  assert.equal(validation.statusFor(brokenChecked.findings), 'failed');
  assert.ok(brokenChecked.findings.some((finding) => finding.category === 'whole_resume_completeness'));
});

test('validation independently rejects unrelated Candidate Knowledge claimed as a source replacement', () => {
  const setup = plan();
  const generated = artifactGeneration.generate(setup);
  const projectStatement = generated.sections.find((section) => section.section === 'Projects').statements.find((statement) => statement.content_origin === 'candidate_knowledge_generated');
  const skillSection = generated.sections.find((section) => section.section === 'Skills');
  const removed = skillSection.statements.find((statement) => statement.text === 'Power BI');
  skillSection.statements = skillSection.statements.filter((statement) => statement.statement_id !== removed.statement_id);
  generated.metadata.composition.preserved_source_statement_ids = generated.metadata.composition.preserved_source_statement_ids.filter((id) => id !== removed.statement_id);
  generated.metadata.composition.superseded_source_statements.push({ source_statement_id: removed.statement_id, generated_statement_ids: [projectStatement.statement_id], reason: 'supported_tailored_replacement' });

  const checked = validation.validate({ artifactRun: artifactRun(generated), plan: setup, integrity: new Map([['fact-project', { fact_exists: true, integration_exists: true, provenance_exists: true }]]) });
  assert.equal(validation.statusFor(checked.findings), 'failed');
  assert.ok(checked.findings.some((finding) => finding.rule === 'source-statement-preserved-or-supported-replacement' && finding.references.source_statement_id === removed.statement_id), JSON.stringify(checked.findings));
});

test('Career Review and export operate on the complete composed resume', () => {
  const generated = artifactGeneration.generate(plan());
  const run = artifactRun(generated);
  const drafts = humanReview.createDraft({ artifactRun: run });
  assert.deepEqual(drafts.map((draft) => draft.section), ['Applicant Header', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications']);
  const reviewed = { section_reviews: drafts.map((draft) => ({ section: draft.section, action: 'approve', ai_version: draft.ai_version, final_version: draft.ai_version })) };
  const markdown = humanReview.markdown(reviewed);
  assert.match(markdown, /^private candidate Tang\nya\.ching@example\.com\n\+1 416 555 0123/m);
  for (const heading of ['Skills', 'Experience', 'Projects', 'Education', 'Certifications']) assert.match(markdown, new RegExp(`## ${heading}`));
  assert.match(markdown, /### Data Analyst — Example Co\./);
});

test('deterministic identity completion retains missing source contact spans without creating claims', () => {
  const additions = composition.deterministicIdentityBlocks('private candidate Tang\nya.ching@example.com | +1 416 555 0123\nSkills\nPower BI', [{ type: 'identity', exact_source_text: 'private candidate Tang' }]);
  assert.deepEqual(additions.map((item) => item.title), ['Email', 'Phone']);
  assert.ok(additions.every((item) => item.provenance.source === 'resume_input' && item.state === 'confirmed'));
});

test('deterministic identity completion does not misclassify employment dates as a phone number', () => {
  const additions = composition.deterministicIdentityBlocks('private candidate Tang\nya.ching@example.com\nData Analyst | 2022 - 2023\nEducation | 2018 - 2022', [{ type: 'identity', exact_source_text: 'private candidate Tang' }]);
  assert.deepEqual(additions.map((item) => item.title), ['Email']);
  assert.equal(composition.firstPhone('Data Analyst | 2022 - 2023'), null);
});
