const test = require('node:test');
const assert = require('node:assert/strict');

const artifactGeneration = require('../../src/resume-artifact');
const humanReview = require('../../src/human-review');
const applicant = require('../../src/applicant-resume');
const validation = require('../../src/resume-validation');

function sourceStatement(id, text, section, style, position, parent = null) {
  return {
    statement_id: id,
    source_statement_id: id,
    text,
    section,
    position,
    display_style: style,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: parent,
    provenance: { source_kind: 'validated_resume_understanding', exact_source_text: text },
  };
}

function fact(id, entityType, value) {
  return { id, entity_type: entityType, value, integration_decision_id: `decision-${id}` };
}

function selection(id, candidateFact, section, priority, scopes, requirements = []) {
  return {
    id,
    candidate_fact_id: candidateFact.id,
    candidate_fact_revision: candidateFact.id,
    mapped_requirement_ids: requirements,
    selection_state: 'include',
    relevance_rationale: 'Directly supports the target Data Analytics & AI role.',
    inherited_provenance_references: [candidateFact.integration_decision_id],
    recommended_section: section,
    emphasis_level: priority >= 18 ? 'high' : 'medium',
    priority_score: priority,
    permitted_claim_scope: scopes,
    blocked_claim_scopes: [],
    limitations: '',
  };
}

function omitSelection(id, candidateFact, section) {
  return {
    id,
    candidate_fact_id: candidateFact.id,
    candidate_fact_revision: candidateFact.id,
    mapped_requirement_ids: [],
    selection_state: 'omit',
    relevance_rationale: 'No explicit match to the target role.',
    inherited_provenance_references: [candidateFact.integration_decision_id],
    recommended_section: section,
    emphasis_level: 'low',
    priority_score: 0,
    permitted_claim_scope: [],
    blocked_claim_scopes: [],
    limitations: '',
  };
}

test('Cycle 2 candidate replaces broad master Skills with target-specific supported skills end to end', () => {
  const python = fact('fact-python', 'skill', { name: 'Python' });
  const sql = fact('fact-sql', 'skill', { name: 'SQL' });
  const powerBi = fact('fact-power-bi', 'skill', { name: 'Power BI' });
  const analytics = fact('fact-analytics', 'responsibility', {
    text: 'Built Power BI dashboards and automated reporting workflows for business analysis.',
  });
  const giftProject = fact('fact-gift-project', 'project', { name: 'Gift Recommendation App' });
  const giftRoadmap = fact('fact-gift-roadmap', 'responsibility', {
    text: 'Planned a future monetization roadmap for gift recommendations.',
  });

  const source = {
    format: 'source-resume-composition/1.0.0',
    policy_version: 'complete-resume-composition-boundary/1.0.0',
    source_resume_artifact_id: 'source-cycle2',
    source_resume_artifact_version_id: 'source-cycle2-v1',
    resume_semantic_run_id: 'semantic-cycle2',
    sections: [
      { section: 'Applicant Header', statements: [
        sourceStatement('source:name', 'Taylor Chen', 'Applicant Header', 'line', 1),
        sourceStatement('source:contact', 'Toronto, ON | taylor@example.com | +1 416 555 0199', 'Applicant Header', 'line', 2),
      ] },
      { section: 'Professional Summary', statements: [
        sourceStatement('source:summary', 'Seeking internship roles in finance, data analytics, quantitative finance, and software engineering.', 'Professional Summary', 'line', 3),
      ] },
      { section: 'Skills', statements: [
        sourceStatement('source:skill-label-1', 'Programming & Data', 'Skills', 'inline', 4),
        sourceStatement('source:skill-values-1', 'Python, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB', 'Skills', 'inline', 5),
        sourceStatement('source:skill-label-2', 'Data Visualization & BI', 'Skills', 'inline', 6),
        sourceStatement('source:skill-values-2', 'Power BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling', 'Skills', 'inline', 7),
        sourceStatement('source:skill-label-3', 'Languages', 'Skills', 'inline', 8),
        sourceStatement('source:skill-values-3', 'Mandarin (Native), English (Fluent), Japanese (Basic)', 'Skills', 'inline', 9),
      ] },
      { section: 'Experience', statements: [
        sourceStatement('source:experience', 'Data Analyst — Example Co.\nToronto, ON | May 2023 – Aug 2024', 'Experience', 'heading', 10),
        sourceStatement('source:experience-body', analytics.value.text, 'Experience', 'bullet', 11, 'source:experience'),
      ] },
      { section: 'Projects', statements: [
        sourceStatement('source:analytics-project', 'Analytics Dashboard', 'Projects', 'heading', 12),
        sourceStatement('source:analytics-project-body', 'Built reporting views that connected business questions to decision-ready metrics.', 'Projects', 'bullet', 13, 'source:analytics-project'),
        sourceStatement('source:gift-project', giftProject.value.name, 'Projects', 'heading', 14),
        sourceStatement('source:gift-roadmap', giftRoadmap.value.text, 'Projects', 'bullet', 15, 'source:gift-project'),
      ] },
      { section: 'Education', statements: [
        sourceStatement('source:education', 'University of Toronto | Sep 2024 – Present | BSc, Statistics & Computer Science | Minor in Economics', 'Education', 'line', 16),
      ] },
      { section: 'Certifications', statements: [
        sourceStatement('source:certification', 'CFA Level I', 'Certifications', 'line', 17),
      ] },
    ],
  };

  const selections = [
    selection('selection-python', python, 'Skills', 20, ['skill_name', 'cross_section_summary'], ['req-python']),
    selection('selection-sql', sql, 'Skills', 19, ['skill_name', 'cross_section_summary'], ['req-sql']),
    selection('selection-power-bi', powerBi, 'Skills', 20, ['skill_name', 'cross_section_summary'], ['req-power-bi']),
    selection('selection-analytics', analytics, 'Experience', 20, ['bounded_responsibility', 'cross_section_summary'], ['req-analytics']),
    omitSelection('selection-gift-project', giftProject, 'Projects'),
    omitSelection('selection-gift-roadmap', giftRoadmap, 'Projects'),
  ];

  const plan = {
    id: 'plan-cycle2',
    job_requirement_profile_id: 'job-zurich-shape',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [python, sql, powerBi, analytics, giftProject, giftRoadmap],
    source_resume_snapshot: source,
    resume_content_selections: selections,
    requirement_coverage: selections.filter((item) => item.selection_state === 'include').flatMap((item) =>
      item.mapped_requirement_ids.map((id) => ({ job_requirement_id: id, coverage_status: 'covered', coverage_rationale: 'Supported.' }))),
    section_plans: [
      { section: 'Skills', recommended_order: 1, candidate_fact_ids: [python.id, sql.id, powerBi.id] },
      { section: 'Experience', recommended_order: 2, candidate_fact_ids: [analytics.id] },
    ],
  };

  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.1.0',
    draft: { sections: [{
      section: 'Professional Summary',
      statements: [{
        text: 'Data analytics candidate with Power BI dashboard and reporting automation experience.',
        candidate_fact_ids: [analytics.id],
        job_requirement_ids: ['req-analytics'],
      }],
    }] },
  };

  const generated = artifactGeneration.generate(plan, null, provider);
  const skillsSection = generated.sections.find((section) => section.section === 'Skills');
  assert.deepEqual(skillsSection.statements.map((item) => item.text), ['Python', 'SQL', 'Power BI']);
  assert.equal(skillsSection.statements.every((item) => item.content_origin === 'candidate_knowledge_generated'), true);

  const findings = [];
  validation.validateSourceComposition({
    artifact: { content: { sections: generated.sections }, metadata: generated.metadata },
    plan,
    findings,
  });
  assert.deepEqual(findings, []);

  const review = humanReview.createDraft({
    artifactRun: {
      id: 'artifact-run-cycle2',
      resume_tailoring_plan_run_id: plan.id,
      resume_artifacts: [{ artifact_type: 'structured_resume', content: { format: generated.format, sections: generated.sections }, metadata: {} }],
    },
  });
  const model = applicant.resumePresentationModel(review);
  const skills = model.find((section) => section.section === 'Skills');
  assert.deepEqual(skills.groups, []);
  assert.deepEqual(skills.items, ['Python', 'SQL', 'Power BI']);

  const projects = model.find((section) => section.section === 'Projects');
  assert.equal(projects.entries.length, 1);
  assert.equal(projects.entries[0].title, 'Analytics Dashboard');

  const html = applicant.resumeHtml(review, { standalone: false });
  assert.match(html, /Python/);
  assert.match(html, /Power BI/);
  assert.doesNotMatch(html, /JavaScript|MATLAB|Japanese \(Basic\)|Gift Recommendation App|quantitative finance/);
});
