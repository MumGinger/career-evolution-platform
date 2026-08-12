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
    ['s3', 3, 'Languages: Python, SQL'],
    ['s4', 4, 'Visualization: Power BI, Tableau'],
    ['s5', 5, 'Tools: Excel, Git'],
    ['s6', 6, 'Professional Summary'],
    ['s7', 7, 'Data analyst focused on automation, reporting, and decision-ready analysis.'],
    ['s8', 8, 'Data Analyst — Example Co.\nToronto, ON | May 2023 – Aug 2024'],
    ['s9', 9, 'Built recurring executive reporting for business stakeholders.'],
    ['s10', 10, 'Gift Recommendation App'],
    ['s11', 11, 'Built a recommendation workflow with React and API integrations.'],
    ['s12', 12, 'Stock Pattern Label Platform'],
    ['s13', 13, 'Built an interface for labeling market patterns.'],
    ['s14', 14, 'University of Toronto | Sep 2024 – Present | BSc, Statistics & Computer Science | Minor in Economics'],
    ['s15', 15, 'CFA Level I'],
  ];
  const spans = rows.map(([id, bullet_index, raw_text]) => ({
    id,
    bullet_index,
    raw_text,
    artifact_id: 'resume-beta9',
    artifact_version_id: 'resume-beta9-v1',
  }));
  const entities = [
    ['e1', 'identity', 's1', 'identity-name', null],
    ['e2', 'identity', 's2', 'identity-contact', null],
    ['e3', 'skill', 's3', 'skill-languages', null],
    ['e4', 'tool', 's4', 'skill-visualization', null],
    ['e5', 'tool', 's5', 'skill-tools', null],
    ['e6', 'experience', 's6', 'summary-entry', null],
    ['e7', 'responsibility', 's7', 'summary-body', 'summary-entry'],
    ['e8', 'experience', 's8', 'experience-entry', null],
    ['e9', 'responsibility', 's9', 'experience-body', 'experience-entry'],
    ['e10', 'project', 's10', 'gift-entry', null],
    ['e11', 'responsibility', 's11', 'gift-body', 'gift-entry'],
    ['e12', 'project', 's12', 'stock-entry', null],
    ['e13', 'responsibility', 's13', 'stock-body', 'stock-entry'],
    ['e14', 'education', 's14', 'education-entry', null],
    ['e15', 'certification', 's15', 'certification-entry', null],
  ].map(([id, entity_type, evidence_span_id, upstream_block_id, parent_id]) => ({
    id,
    entity_type,
    evidence_span_id,
    attributes: { upstream_block_id, parent_id },
  }));
  return composition.composeSourceResume({
    profile: { id: 'profile-beta9' },
    semanticRun: {
      id: 'semantic-beta9',
      artifact_id: 'resume-beta9',
      artifact_version_id: 'resume-beta9-v1',
      spans,
      entities,
    },
  });
}

function tailoringPlan() {
  const project = {
    id: 'fact-gift-project',
    entity_type: 'project',
    value: { name: 'Gift Recommendation App' },
    integration_decision_id: 'integration-gift-project',
  };
  const responsibility = {
    id: 'fact-gift-body',
    entity_type: 'responsibility',
    value: { text: 'Built a recommendation workflow with React and API integrations.' },
    integration_decision_id: 'integration-gift-body',
  };
  const selection = (id, fact, scope, priority) => ({
    id,
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    mapped_requirement_ids: ['requirement-analytics'],
    selection_state: 'include',
    relevance_rationale: 'Explicit source-backed evidence is relevant to the target role.',
    inherited_provenance_references: [fact.integration_decision_id],
    recommended_section: 'Projects',
    emphasis_level: 'high',
    priority_score: priority,
    permitted_claim_scope: [scope],
    blocked_claim_scopes: [],
    limitations: '',
  });
  return {
    id: 'plan-beta9',
    job_requirement_profile_id: 'job-beta9',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [project, responsibility],
    source_resume_snapshot: sourceResume(),
    resume_content_selections: [
      selection('selection-gift-project', project, 'project_name', 20),
      selection('selection-gift-body', responsibility, 'bounded_project_responsibilities', 19),
    ],
    requirement_coverage: [{
      job_requirement_id: 'requirement-analytics',
      coverage_status: 'covered',
      coverage_rationale: 'The project evidence is explicit.',
    }],
    section_plans: [{
      section: 'Projects',
      recommended_order: 1,
      candidate_fact_ids: [project.id, responsibility.id],
    }],
  };
}

function artifactRun(content) {
  return {
    id: 'artifact-run-beta9',
    resume_tailoring_plan_run_id: 'plan-beta9',
    resume_artifacts: [{
      artifact_type: 'structured_resume',
      content,
      metadata: {},
    }],
  };
}

function occurrences(value, needle) {
  return value.split(needle).length - 1;
}

test('Beta 9 representative composed resume remains coherent through final HTML and PDF presentation', () => {
  const provider = {
    provider: 'openai-compatible',
    model: 'fixture',
    version: 'resume-draft/1.0.0',
    draft: {
      sections: [{
        section: 'Projects',
        statements: [
          {
            text: 'Gift Recommendation App — analytics-focused recommendation workflow',
            candidate_fact_ids: ['fact-gift-project'],
            job_requirement_ids: ['requirement-analytics'],
          },
          {
            text: 'Built a React recommendation workflow with API integrations for analytics use cases.',
            candidate_fact_ids: ['fact-gift-body'],
            job_requirement_ids: ['requirement-analytics'],
          },
        ],
      }],
    },
  };

  const generated = artifactGeneration.generate(tailoringPlan(), null, provider);
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
    'Data analyst focused on automation, reporting, and decision-ready analysis.',
  ]);

  const experience = model.find((section) => section.section === 'Experience');
  assert.equal(experience.entries.length, 1);
  assert.equal(experience.entries[0].title, 'Data Analyst — Example Co.');
  assert.equal(experience.entries[0].date, 'May 2023 – Aug 2024');
  assert.deepEqual(experience.entries[0].body.map((item) => item.text), [
    'Built recurring executive reporting for business stakeholders.',
  ]);

  const skills = model.find((section) => section.section === 'Skills');
  assert.deepEqual(skills.groups.map((group) => group.label), ['Languages', 'Visualization', 'Tools']);
  assert.deepEqual(skills.groups.map((group) => group.values), ['Python, SQL', 'Power BI, Tableau', 'Excel, Git']);

  const projects = model.find((section) => section.section === 'Projects');
  assert.equal(projects.entries.length, 2);
  assert.equal(projects.entries[0].title, 'Gift Recommendation App — analytics-focused recommendation workflow');
  assert.deepEqual(projects.entries[0].body.map((item) => item.text), [
    'Built a React recommendation workflow with API integrations for analytics use cases.',
  ]);
  assert.equal(projects.entries[1].title, 'Stock Pattern Label Platform');
  assert.deepEqual(projects.entries[1].body.map((item) => item.text), [
    'Built an interface for labeling market patterns.',
  ]);

  const education = model.find((section) => section.section === 'Education');
  assert.equal(education.entries.length, 1);
  assert.equal(education.entries[0].title, 'University of Toronto');
  assert.equal(education.entries[0].date, 'Sep 2024 – Present');
  assert.deepEqual(education.entries[0].body.map((item) => item.text), [
    'BSc, Statistics & Computer Science',
    'Minor in Economics',
  ]);

  const certifications = model.find((section) => section.section === 'Certifications');
  assert.deepEqual(certifications.entries[0].body.map((item) => item.text), ['CFA Level I']);

  const html = applicant.resumeHtml(review, { standalone: false });
  assert.equal(occurrences(html, 'Gift Recommendation App'), 1, 'Gift project heading must render once');
  assert.equal(occurrences(html, 'Built a recommendation workflow with React and API integrations.'), 0, 'superseded Gift source wording must not remain visible');
  assert.equal(occurrences(html, 'Built a React recommendation workflow with API integrations for analytics use cases.'), 1);
  assert.equal(occurrences(html, 'Stock Pattern Label Platform'), 1);
  assert.match(html, /class="resume-section resume-summary-section"/);
  assert.match(html, /class="resume-skill-group"/);
  assert.doesNotMatch(html, /<li>\s*<\/li>/);

  const pdf = applicant.resumePdf(review).toString('latin1');
  for (const required of [
    'Professional Summary',
    'Data Analyst - Example Co.',
    'Gift Recommendation App - analytics-focused recommendation workflow',
    'Stock Pattern Label Platform',
    'University of Toronto',
    'CFA Level I',
  ]) assert.match(pdf, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
