const test = require('node:test');
const assert = require('node:assert/strict');

const artifactGeneration = require('../../src/resume-artifact');
const humanReview = require('../../src/human-review');
const applicant = require('../../src/applicant-resume');
const cleanup = require('../../src/applicant-cleanup');
const composition = require('../../src/resume-composition');

function sourceSkill(id, text, position) {
  return {
    statement_id: id,
    source_statement_id: id,
    text,
    section: 'Skills',
    position,
    display_style: 'inline',
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: null,
    provenance: { source_kind: 'validated_resume_understanding', exact_source_text: text },
  };
}

function realSkillFixture() {
  const source = {
    format: 'source-resume-composition/1.0.0',
    policy_version: 'complete-resume-composition-boundary/1.0.0',
    source_resume_artifact_id: 'source-real-skills',
    source_resume_artifact_version_id: 'source-real-skills-v1',
    resume_semantic_run_id: 'semantic-real-skills',
    sections: [{
      section: 'Skills',
      statements: [
        sourceSkill('source:skills-1', 'SKILLS\nProgramming & Data\nPython, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB', 1),
        sourceSkill('source:skills-2', 'Data Visualization & BI\nPower BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling, CSV Data Processing', 2),
        sourceSkill('source:skills-3', 'Statistical & Machine Learning\nLinear & Logistic Regression, GLMs, Regularization (L1/L2), PCA, Time Series Modeling, Neural Networks', 3),
        sourceSkill('source:skills-4', 'Finance & Markets\nEquity Analysis, Market Pattern Research, Financial Modeling, Quantitative Methods, CFA Curriculum', 4),
        sourceSkill('source:skills-5', 'Tools & Workflow\nGit, APIs, n8n, Notion, LLM APIs, Workflow Automation, Document Generation', 5),
        sourceSkill('source:skills-6', 'Languages\nMandarin (Native), English (Fluent), Japanese (Basic)', 6),
      ],
    }],
  };

  const plan = {
    id: 'plan-real-skills',
    job_requirement_profile_id: 'job-zurich',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [],
    source_resume_snapshot: source,
    resume_content_selections: [],
    requirement_coverage: [],
    section_plans: [],
    job_requirements: [
      { id: 'req-tools', normalized_name: 'experience with power bi sql python or similar tools', supporting_excerpts: ['Experience with Power BI, SQL, Python, or similar tools is considered an asset.'] },
      { id: 'req-dashboard', normalized_name: 'dashboard development business intelligence data visualization storytelling', supporting_excerpts: ['Assist with dashboards, reports, and performance tracking tools.', 'Experience with data visualization and storytelling.'] },
      { id: 'req-automation', normalized_name: 'automation process improvement ai enabled solutions', supporting_excerpts: ['Improve workflows, automate manual processes, and apply AI-enabled solutions.'] },
    ],
  };
  return { source, plan };
}

test('real source-resume Skills are target-selected for presentation without creating Candidate Knowledge', () => {
  const { plan } = realSkillFixture();
  const artifact = artifactGeneration.generate(plan);
  const skills = artifact.sections.find((section) => section.section === 'Skills');
  assert.equal(skills.statements.length, 6);
  assert.equal(skills.statements.every((statement) => statement.content_origin === 'source_resume_passthrough'), true);
  assert.equal(skills.statements.every((statement) => statement.text === statement.provenance.exact_source_text), true);

  const selected = skills.statements.filter((statement) => statement.presentation?.mode === 'selected_source_skills');
  assert.ok(selected.length >= 3);
  const visibleValues = selected.flatMap((statement) => statement.presentation.values || []);
  assert.ok(visibleValues.includes('Python'));
  assert.ok(visibleValues.includes('SQL'));
  assert.ok(visibleValues.includes('Power BI'));
  assert.ok(visibleValues.includes('Workflow Automation'));
  assert.equal(visibleValues.includes('Java'), false);
  assert.equal(visibleValues.includes('C++'), false);
  assert.equal(visibleValues.includes('CFA Curriculum'), false);
  assert.equal(visibleValues.includes('Japanese (Basic)'), false);
  assert.equal(artifact.metadata.source_skill_targeting.mode, 'source_resume_exact_token_selection');

  const review = humanReview.createDraft({
    artifactRun: {
      id: 'artifact-run-real-skills',
      resume_tailoring_plan_run_id: plan.id,
      resume_artifacts: [{ artifact_type: 'structured_resume', content: { format: artifact.format, sections: artifact.sections }, metadata: artifact.metadata }],
    },
  });
  const cleaned = cleanup.cleanRun({ section_reviews: review });
  const model = applicant.resumePresentationModel(cleaned.section_reviews);
  const presentation = model.find((section) => section.section === 'Skills');
  const text = JSON.stringify(presentation);
  assert.match(text, /Python/);
  assert.match(text, /SQL/);
  assert.match(text, /Power BI/);
  assert.match(text, /Workflow Automation/);
  assert.doesNotMatch(text, /Java|C\+\+|CFA Curriculum|Japanese \(Basic\)/);
});

test('source-skill validation rejects a valid source token attached to an unrelated but real requirement', () => {
  const { source, plan } = realSkillFixture();
  const statement = source.sections[0].statements[0];
  const tampered = {
    ...statement,
    presentation: {
      mode: 'selected_source_skills',
      label: 'Programming & Data',
      values: ['Java'],
      requirement_ids: ['req-dashboard'],
      source_statement_id: statement.source_statement_id,
    },
  };
  const findings = composition.validateSourceSkillPresentation({
    artifactRun: {
      resume_artifacts: [{ artifact_type: 'structured_resume', content: { sections: [{ section: 'Skills', statements: [tampered] }] } }],
    },
    plan,
  });
  assert.equal(findings.some((item) => item.severity === 'critical' && item.rule === 'source-skill-presentation-exact'), true);
});
