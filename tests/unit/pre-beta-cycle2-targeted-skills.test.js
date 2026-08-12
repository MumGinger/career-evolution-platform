const test = require('node:test');
const assert = require('node:assert/strict');

const artifactGeneration = require('../../src/resume-artifact');
const validation = require('../../src/resume-validation');

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

function skillFact(id, name) {
  return {
    id,
    entity_type: 'skill',
    value: { name },
    integration_decision_id: `decision-${id}`,
  };
}

function skillSelection(id, fact, priority) {
  return {
    id,
    candidate_fact_id: fact.id,
    candidate_fact_revision: fact.id,
    mapped_requirement_ids: [`req-${id}`],
    selection_state: 'include',
    relevance_rationale: 'Explicitly required by the target job.',
    inherited_provenance_references: [fact.integration_decision_id],
    recommended_section: 'Skills',
    emphasis_level: priority >= 18 ? 'high' : 'medium',
    priority_score: priority,
    permitted_claim_scope: ['skill_name', 'cross_section_summary'],
    blocked_claim_scopes: [],
    limitations: '',
  };
}

test('included target-job skill selections replace the broad source Skills inventory', () => {
  const python = skillFact('fact-python', 'Python');
  const sql = skillFact('fact-sql', 'SQL');
  const powerBi = skillFact('fact-power-bi', 'Power BI');
  const selections = [
    skillSelection('selection-python', python, 20),
    skillSelection('selection-sql', sql, 19),
    skillSelection('selection-power-bi', powerBi, 18),
  ];
  const source = {
    format: 'source-resume-composition/1.0.0',
    policy_version: 'complete-resume-composition-boundary/1.0.0',
    source_resume_artifact_id: 'source-skills',
    source_resume_artifact_version_id: 'source-skills-v1',
    resume_semantic_run_id: 'semantic-skills',
    sections: [{
      section: 'Skills',
      statements: [
        sourceSkill('source:skills-label-1', 'Programming & Data', 1),
        sourceSkill('source:skills-values-1', 'Python, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB', 2),
        sourceSkill('source:skills-label-2', 'Data Visualization & BI', 3),
        sourceSkill('source:skills-values-2', 'Power BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling', 4),
        sourceSkill('source:skills-label-3', 'Languages', 5),
        sourceSkill('source:skills-values-3', 'Mandarin (Native), English (Fluent), Japanese (Basic)', 6),
      ],
    }],
  };
  const plan = {
    id: 'plan-targeted-skills',
    job_requirement_profile_id: 'job-zurich-shape',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [python, sql, powerBi],
    source_resume_snapshot: source,
    resume_content_selections: selections,
    requirement_coverage: selections.map((selection) => ({
      job_requirement_id: selection.mapped_requirement_ids[0],
      coverage_status: 'covered',
      coverage_rationale: 'Supported.',
    })),
    section_plans: [{ section: 'Skills', recommended_order: 1, candidate_fact_ids: [python.id, sql.id, powerBi.id] }],
  };

  const artifact = artifactGeneration.generate(plan);
  const skills = artifact.sections.find((section) => section.section === 'Skills');

  assert.deepEqual(skills.statements.map((statement) => statement.text), ['Power BI', 'Python', 'SQL']);
  assert.equal(skills.statements.every((statement) => statement.content_origin === 'candidate_knowledge_generated'), true);
  assert.equal(skills.statements.some((statement) => /Java|C\+\+|Japanese/.test(statement.text)), false);
  assert.equal(
    artifact.metadata.composition.superseded_source_statements.filter((item) =>
      item.reason === 'supported_job_specific_skills_replacement').length,
    6,
  );

  const findings = [];
  validation.validateSourceComposition({
    artifact: { content: { sections: artifact.sections }, metadata: artifact.metadata },
    plan,
    findings,
  });
  assert.deepEqual(findings, []);
});

test('source Skills remain intact when no supported target-specific skill selection exists', () => {
  const source = {
    format: 'source-resume-composition/1.0.0',
    policy_version: 'complete-resume-composition-boundary/1.0.0',
    source_resume_artifact_id: 'source-skills-fallback',
    source_resume_artifact_version_id: 'source-skills-fallback-v1',
    resume_semantic_run_id: 'semantic-skills-fallback',
    sections: [{
      section: 'Skills',
      statements: [
        sourceSkill('source:skills-label', 'Programming & Data', 1),
        sourceSkill('source:skills-values', 'Python, SQL, Power BI', 2),
      ],
    }],
  };
  const plan = {
    id: 'plan-source-skills-fallback',
    job_requirement_profile_id: 'job-source-skills-fallback',
    job_requirement_profile_version: 1,
    candidate_knowledge_snapshot: [],
    source_resume_snapshot: source,
    resume_content_selections: [],
    requirement_coverage: [],
    section_plans: [],
  };

  const artifact = artifactGeneration.generate(plan);
  const skills = artifact.sections.find((section) => section.section === 'Skills');
  assert.deepEqual(skills.statements.map((statement) => statement.text), [
    'Programming & Data',
    'Python, SQL, Power BI',
  ]);
  assert.equal(artifact.metadata.composition.superseded_source_statements.length, 0);
});
