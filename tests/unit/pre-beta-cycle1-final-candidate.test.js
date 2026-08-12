const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../../src/resume-composition');
const artifactGeneration = require('../../src/resume-artifact');
const humanReview = require('../../src/human-review');
const applicant = require('../../src/applicant-resume');

function sourceResume() {
  const rows = [
    ['s1', 1, 'Taylor Chen'],
    ['s2', 2, 'Toronto, ON | taylor@example.com | +1 416 555 0199'],
    ['s3', 3, 'Seeking internship roles in finance, data analytics, quantitative finance, and software engineering.'],
    ['s4', 4, 'Programming & Data'],
    ['s5', 5, 'Python, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB'],
    ['s6', 6, 'Data Visualization & BI'],
    ['s7', 7, 'Power BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling'],
    ['s8', 8, 'Statistical & Machine Learning'],
    ['s9', 9, 'Linear & Logistic Regression, GLMs, PCA, Time Series Modeling, Model Evaluation & Diagnostics'],
    ['s10', 10, 'Tools & Workflow'],
    ['s11', 11, 'Git, APIs, n8n, Notion, LLM APIs, Workflow Automation'],
    ['s12', 12, 'Languages'],
    ['s13', 13, 'Mandarin (Native), English (Fluent), Japanese (Basic)'],
    ['s14', 14, 'Data Analyst — Example Co.\nToronto, ON | May 2023 – Aug 2024'],
    ['s15', 15, 'Built Power BI dashboards and automated reporting workflows for business analysis.'],
    ['s16', 16, 'Analytics Dashboard'],
    ['s17', 17, 'Built reporting views that connected business questions to decision-ready metrics.'],
    ['s18', 18, 'Gift Recommendation App'],
    ['s19', 19, 'Planned a future monetization roadmap for gift recommendations.'],
    ['s20', 20, 'University of Toronto | Sep 2024 – Present | BSc, Statistics & Computer Science | Minor in Economics'],
    ['s21', 21, 'CFA Level I'],
  ];
  const spans = rows.map(([id, bullet_index, raw_text]) => ({
    id,
    bullet_index,
    raw_text,
    artifact_id: 'resume-cycle1',
    artifact_version_id: 'resume-cycle1-v1',
  }));
  const entities = [
    ['e1', 'identity', 's1', 'identity-name', null],
    ['e2', 'identity', 's2', 'identity-contact', null],
    ['e3', 'summary', 's3', 'summary-body', null],
    ['e4', 'skill', 's4', 'skill-programming-label', null],
    ['e5', 'skill', 's5', 'skill-programming-values', null],
    ['e6', 'skill', 's6', 'skill-bi-label', null],
    ['e7', 'tool', 's7', 'skill-bi-values', null],
    ['e8', 'skill', 's8', 'skill-stat-label', null],
    ['e9', 'skill', 's9', 'skill-stat-values', null],
    ['e10', 'skill', 's10', 'skill-tools-label', null],
    ['e11', 'tool', 's11', 'skill-tools-values', null],
    ['e12', 'skill', 's12', 'skill-language-label', null],
    ['e13', 'skill', 's13', 'skill-language-values', null],
    ['e14', 'experience', 's14', 'experience-entry', null],
    ['e15', 'responsibility', 's15', 'experience-body', 'experience-entry'],
    ['e16', 'project', 's16', 'analytics-project', null],
    ['e17', 'responsibility', 's17', 'analytics-body', 'analytics-project'],
    ['e18', 'project', 's18', 'gift-project', null],
    ['e19', 'responsibility', 's19', 'gift-body', 'gift-project'],
    ['e20', 'education', 's20', 'education-entry', null],
    ['e21', 'certification', 's21', 'certification-entry', null],
  ].map(([id, entity_type, evidence_span_id, upstream_block_id, parent_id]) => ({
    id,
    entity_type,
    evidence_span_id,
    attributes: { upstream_block_id, parent_id },
  }));

  return composition.composeSourceResume({
    profile: { id: 'profile-cycle1' },
    semanticRun: {
      id: 'semantic-cycle1',
      artifact_id: 'resume-cycle1',
      artifact_version_id: 'resume-cycle1-v1',
      spans,
      entities,
    },
  });
}

function plan() {
  const analytics = {
    id: 'fact-analytics',
    entity_type: 'responsibility',
    value: { text: 'Built Power BI dashboards and automated reporting workflows for business analysis.' },
    integration_decision_id: 'decision-analytics',
  };
  const giftProject = {
    id: 'fact-gift-project',
    entity_type: 'project',
    value: { name: 'Gift Recommendation App' },
    integration_decision_id: 'decision-gift-project',
  };
  const giftRoadmap = {
    id: 'fact-gift-roadmap',
    entity_type: 'responsibility',
    value: { text: 'Planned a future monetization roadmap for gift recommendations.' },
    integration_decision_id: 'decision-gift-roadmap',
  };

  return {
    id: 'plan-cycle1',
    job_requirement_profile_id: 'job-zurich-shape',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [analytics, giftProject, giftRoadmap],
    source_resume_snapshot: sourceResume(),
    resume_content_selections: [
      {
        id: 'selection-analytics',
        candidate_fact_id: analytics.id,
        candidate_fact_revision: analytics.id,
        mapped_requirement_ids: ['requirement-data-analytics'],
        selection_state: 'include',
        relevance_rationale: 'Directly supports the target data analytics role.',
        inherited_provenance_references: [analytics.integration_decision_id],
        recommended_section: 'Experience',
        emphasis_level: 'high',
        priority_score: 20,
        permitted_claim_scope: ['bounded_responsibility', 'cross_section_summary'],
        blocked_claim_scopes: [],
        limitations: '',
      },
      {
        id: 'selection-gift-project',
        candidate_fact_id: giftProject.id,
        candidate_fact_revision: giftProject.id,
        mapped_requirement_ids: [],
        selection_state: 'omit',
        relevance_rationale: 'No explicit target-job match.',
        inherited_provenance_references: [giftProject.integration_decision_id],
        recommended_section: 'Projects',
        emphasis_level: 'low',
        priority_score: 0,
        permitted_claim_scope: [],
        blocked_claim_scopes: [],
        limitations: '',
      },
      {
        id: 'selection-gift-roadmap',
        candidate_fact_id: giftRoadmap.id,
        candidate_fact_revision: giftRoadmap.id,
        mapped_requirement_ids: [],
        selection_state: 'omit',
        relevance_rationale: 'Future-roadmap wording is not useful for this target role.',
        inherited_provenance_references: [giftRoadmap.integration_decision_id],
        recommended_section: 'Projects',
        emphasis_level: 'low',
        priority_score: 0,
        permitted_claim_scope: [],
        blocked_claim_scopes: [],
        limitations: '',
      },
    ],
    requirement_coverage: [{
      job_requirement_id: 'requirement-data-analytics',
      coverage_status: 'covered',
      coverage_rationale: 'Explicit analytics evidence is available.',
    }],
    section_plans: [{
      section: 'Experience',
      recommended_order: 1,
      candidate_fact_ids: [analytics.id],
    }],
  };
}

function artifactRun(content) {
  return {
    id: 'artifact-run-cycle1',
    resume_tailoring_plan_run_id: 'plan-cycle1',
    resume_artifacts: [{ artifact_type: 'structured_resume', content, metadata: {} }],
  };
}

function count(value, needle) {
  return value.split(needle).length - 1;
}

test('Cycle 1 representative candidate resolves Beta 9 section, targeting, omission, and Skills failures together', () => {
  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.1.0',
    draft: {
      sections: [{
        section: 'Professional Summary',
        statements: [{
          text: 'Data analytics candidate with Power BI dashboard and reporting automation experience.',
          candidate_fact_ids: ['fact-analytics'],
          job_requirement_ids: ['requirement-data-analytics'],
        }],
      }],
    },
  };

  const generated = artifactGeneration.generate(plan(), null, provider);
  const review = humanReview.createDraft({
    artifactRun: artifactRun({ format: generated.format, sections: generated.sections }),
  });
  const model = applicant.resumePresentationModel(review);

  assert.deepEqual(model.map((section) => section.section), [
    'Applicant Header',
    'Professional Summary',
    'Skills',
    'Experience',
    'Projects',
    'Education',
    'Certifications',
  ]);

  const summary = model.find((section) => section.section === 'Professional Summary');
  assert.deepEqual(summary.entries[0].body.map((item) => item.text), [
    'Data analytics candidate with Power BI dashboard and reporting automation experience.',
  ]);

  const skills = model.find((section) => section.section === 'Skills');
  assert.deepEqual(skills.groups.map((group) => group.label), [
    'Programming & Data',
    'Data Visualization & BI',
    'Statistical & Machine Learning',
    'Tools & Workflow',
    'Languages',
  ]);
  assert.equal(skills.items.length, 0);

  const projects = model.find((section) => section.section === 'Projects');
  assert.equal(projects.entries.length, 1);
  assert.equal(projects.entries[0].title, 'Analytics Dashboard');
  assert.deepEqual(projects.entries[0].body.map((item) => item.text), [
    'Built reporting views that connected business questions to decision-ready metrics.',
  ]);

  const experience = model.find((section) => section.section === 'Experience');
  assert.equal(experience.entries.length, 1);
  assert.equal(experience.entries[0].title, 'Data Analyst — Example Co.');
  assert.equal(experience.entries[0].date, 'May 2023 – Aug 2024');
  assert.deepEqual(experience.entries[0].body.map((item) => item.text), [
    'Built Power BI dashboards and automated reporting workflows for business analysis.',
  ]);

  const html = applicant.resumeHtml(review, { standalone: false });
  assert.equal(count(html, 'Data analytics candidate with Power BI dashboard and reporting automation experience.'), 1);
  assert.equal(count(html, 'Seeking internship roles in finance, data analytics, quantitative finance, and software engineering.'), 0);
  assert.equal(count(html, 'Gift Recommendation App'), 0);
  assert.equal(count(html, 'future monetization roadmap'), 0);
  assert.equal((html.match(/resume-skill-group/g) || []).length >= 5, true);
  assert.doesNotMatch(html, /<li>\s*<\/li>/);

  const compositionMetadata = generated.metadata.composition;
  assert.equal(
    compositionMetadata.superseded_source_statements.some((item) =>
      item.reason === 'supported_job_specific_summary_replacement'),
    true,
  );
  assert.deepEqual(
    compositionMetadata.omitted_source_statements.map((item) => item.source_statement_id).sort(),
    ['source:semantic-cycle1:s18', 'source:semantic-cycle1:s19'],
  );

  const pdf = applicant.resumePdf(review).toString('latin1');
  for (const required of [
    'PROFESSIONAL SUMMARY',
    'SKILLS',
    'Data analytics candidate with Power BI dashboard and reporting automation experience.',
    'Programming & Data:',
    'Data Visualization & BI:',
    'Analytics Dashboard',
    'University of Toronto',
    'CFA Level I',
  ]) assert.match(pdf, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(pdf, /Gift Recommendation App/);
  assert.doesNotMatch(pdf, /quantitative finance/);
});
