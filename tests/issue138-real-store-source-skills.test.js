const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { Store } = require('../src/store');

function withStore(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue138-store-skills-'));
  const store = new Store(path.join(dir, 'test.db'));
  try { run(store); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

test('durable Store plan reload supplies target requirements and source-only Skills are targeted in the real artifact path', () => withStore((store) => {
  const profile = store.createProfile({ name: 'Synthetic Candidate', email: 'candidate@example.com' });
  const job = store.createJobRequirementProfile({
    company: 'Zurich-shaped Employer',
    roleTitle: 'Data Analytics & AI Intern',
    jobDescription: [
      'Responsibilities:',
      'Assist with dashboards, reports, and performance tracking tools.',
      'Improve workflows, automate manual processes, and apply AI-enabled solutions.',
      'Required Qualifications:',
      'Experience with Power BI, SQL, Python, or similar tools is considered an asset.',
      'Experience with data visualization and storytelling.',
    ].join('\n'),
  });

  const sourceText = [
    'SKILLS',
    'Programming & Data',
    'Python, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB',
    'Data Visualization & BI',
    'Power BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling, CSV Data Processing',
    'Tools & Workflow',
    'Git, APIs, n8n, Notion, LLM APIs, Workflow Automation, Document Generation',
    'Languages',
    'Mandarin (Native), English (Fluent), Japanese (Basic)',
  ].join('\n');
  const sourceVersion = store.createSourceResumeArtifactVersion({
    profileId: profile.id,
    sourcePath: 'synthetic-real-source.pdf',
    parsedText: sourceText,
  });

  const skillBlocks = [
    ['skill-1', 'SKILLS\nProgramming & Data\nPython, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB'],
    ['skill-2', 'Data Visualization & BI\nPower BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling, CSV Data Processing'],
    ['skill-3', 'Tools & Workflow\nGit, APIs, n8n, Notion, LLM APIs, Workflow Automation, Document Generation'],
    ['skill-4', 'Languages\nMandarin (Native), English (Fluent), Japanese (Basic)'],
  ];
  store.createResumeSemanticRun({
    profileId: profile.id,
    artifactId: sourceVersion.artifact.id,
    policyVersion: 'semantic-test/1.0.0',
    parsed: {
      spans: skillBlocks.map(([key, raw_text], index) => ({ key, line_start: index * 3 + 1, line_end: index * 3 + 3, raw_text })),
      entities: skillBlocks.map(([key], index) => ({
        key: `entity-${key}`,
        span_key: key,
        entity_type: 'skill',
        name: `Skill group ${index + 1}`,
        decision_state: 'accepted',
        rationale: 'Synthetic exact source skill group.',
        attributes: { upstream_block_id: `b${index + 1}`, parent_id: null },
      })),
      relations: [],
    },
  });

  const createdPlan = store.createResumeTailoringPlanRun({
    candidateProfileId: profile.id,
    jobRequirementProfileId: job.id,
  });
  assert.equal(createdPlan.candidate_knowledge_snapshot.length, 0);
  const reloadedPlan = store.getResumeTailoringPlanRun(createdPlan.id);
  assert.ok(reloadedPlan.job_requirements.length >= 3);
  assert.ok(reloadedPlan.job_requirements.some((requirement) => /power bi|sql|python/i.test(`${requirement.normalized_name} ${(requirement.supporting_excerpts || []).join(' ')}`)));

  const run = store.createResumeArtifactRun({ resumeTailoringPlanRunId: createdPlan.id });
  const artifact = run.resume_artifacts.find((item) => item.artifact_type === 'structured_resume');
  const skills = artifact.content.sections.find((section) => section.section === 'Skills');
  assert.ok(skills);
  assert.equal(skills.statements.every((statement) => statement.content_origin === 'source_resume_passthrough'), true);
  assert.equal(skills.statements.every((statement) => statement.text === statement.provenance.exact_source_text), true);

  const selected = skills.statements.filter((statement) => statement.presentation?.mode === 'selected_source_skills');
  const values = selected.flatMap((statement) => statement.presentation.values);
  assert.ok(values.includes('Python'));
  assert.ok(values.includes('SQL'));
  assert.ok(values.includes('Power BI'));
  assert.ok(values.includes('D3.js'));
  assert.ok(values.includes('Workflow Automation'));
  assert.equal(values.includes('Java'), false);
  assert.equal(values.includes('C++'), false);
  assert.equal(values.includes('Japanese (Basic)'), false);
  assert.equal(artifact.metadata.source_skill_targeting.mode, 'source_resume_exact_token_selection');
}));
