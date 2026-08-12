const FORMAT_VERSION = 'source-resume-composition/1.0.0';
const POLICY_VERSION = 'complete-resume-composition-boundary/1.0.0';
const SECTION_ORDER = ['Applicant Header', 'Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'];
const SECTION_FOR = {
  identity: 'Applicant Header',
  summary: 'Professional Summary',
  skill: 'Skills',
  tool: 'Skills',
  experience: 'Experience',
  responsibility: 'Experience',
  achievement: 'Experience',
  project: 'Projects',
  education: 'Education',
  certification: 'Certifications',
};

const SOURCE_SKILL_ALIASES = {
  'power bi': ['power bi'],
  python: ['python'],
  sql: ['sql'],
  'interactive dashboards': ['dashboard', 'performance tracking'],
  'data storytelling': ['storytelling', 'business story', 'clear business insights'],
  'workflow automation': ['automation', 'automate manual', 'workflow'],
  'd3 js': ['data visualization', 'visualization'],
  'csv data processing': ['preparing data', 'prepare data', 'data preparation'],
  'linear logistic regression': ['machine learning'],
  glms: ['machine learning'],
  'time series modeling': ['machine learning', 'identifying patterns'],
  'model evaluation diagnostics': ['machine learning', 'data quality'],
  'llm apis': ['ai enabled', 'artificial intelligence'],
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9@+.-]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function displayStyle(type) {
  if (type === 'identity') return 'line';
  if (type === 'experience' || type === 'project') return 'heading';
  if (type === 'responsibility' || type === 'achievement') return 'bullet';
  if (type === 'skill' || type === 'tool') return 'inline';
  return 'line';
}

function composeSourceResume({ profile = {}, semanticRun }) {
  if (!semanticRun?.id || !Array.isArray(semanticRun.spans) || !Array.isArray(semanticRun.entities)) return null;
  const spans = new Map(semanticRun.spans.map((span) => [span.id, span]));
  const typeByUpstream = new Map(semanticRun.entities.map((entity) => [entity.attributes?.upstream_block_id, entity.entity_type]).filter(([id]) => id));
  const rows = semanticRun.entities.map((entity) => {
    const span = spans.get(entity.evidence_span_id);
    const attributes = entity.attributes || {};
    const parentType = attributes.parent_id ? typeByUpstream.get(attributes.parent_id) : null;
    const section = parentType === 'project' ? 'Projects' : parentType === 'experience' ? 'Experience' : SECTION_FOR[entity.entity_type];
    return span && section ? {
      entity,
      span,
      attributes,
      section,
      order: Number.isInteger(span.bullet_index) ? span.bullet_index : Number.isInteger(span.line_start) ? span.line_start : Number.MAX_SAFE_INTEGER,
    } : null;
  }).filter(Boolean).sort((left, right) => left.order - right.order || left.entity.id.localeCompare(right.entity.id));

  const upstreamToStatement = new Map();
  for (const row of rows) {
    const upstream = row.attributes.upstream_block_id;
    if (upstream) upstreamToStatement.set(upstream, `source:${semanticRun.id}:${row.span.id}`);
  }

  const statements = rows.map(({ entity, span, attributes, section, order }) => ({
    statement_id: `source:${semanticRun.id}:${span.id}`,
    source_statement_id: `source:${semanticRun.id}:${span.id}`,
    text: span.raw_text,
    section,
    position: order,
    display_style: displayStyle(entity.entity_type),
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: attributes.parent_id ? upstreamToStatement.get(attributes.parent_id) || null : null,
    provenance: {
      source_kind: 'validated_resume_understanding',
      source_resume_artifact_id: semanticRun.artifact_id,
      source_resume_artifact_version_id: semanticRun.artifact_version_id,
      resume_semantic_run_id: semanticRun.id,
      evidence_span_id: span.id,
      upstream_block_id: attributes.upstream_block_id || null,
      block_type: entity.entity_type,
      exact_source_text: span.raw_text,
    },
  }));

  const headerValues = statements.filter((item) => item.section === 'Applicant Header').map((item) => normalize(item.text));
  const fallback = [
    ['name', profile.name],
    ['email', profile.email],
  ].filter(([, value]) => String(value || '').trim()).filter(([, value]) => !headerValues.some((existing) => existing.includes(normalize(value)))).map(([field, value], index) => ({
    statement_id: `source-profile:${profile.id}:${field}`,
    source_statement_id: `source-profile:${profile.id}:${field}`,
    text: String(value).trim(),
    section: 'Applicant Header',
    position: -100 + index,
    display_style: 'line',
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: null,
    provenance: {
      source_kind: 'source_profile_intake',
      candidate_profile_id: profile.id,
      profile_field: field,
      exact_source_text: String(value).trim(),
    },
  }));

  const all = [...fallback, ...statements];
  const sections = SECTION_ORDER.map((section, index) => ({
    section,
    position: index + 1,
    statements: all.filter((item) => item.section === section).sort((left, right) => left.position - right.position || left.statement_id.localeCompare(right.statement_id)),
  })).filter((section) => section.statements.length);

  return {
    id: semanticRun.artifact_id,
    version: semanticRun.artifact_version_id,
    format: FORMAT_VERSION,
    policy_version: POLICY_VERSION,
    source_resume_artifact_id: semanticRun.artifact_id,
    source_resume_artifact_version_id: semanticRun.artifact_version_id,
    resume_semantic_run_id: semanticRun.id,
    content: sections.flatMap((section) => section.statements.map((statement) => statement.text)).join('\n'),
    sections,
  };
}

function latestSourceResumeSnapshot(store, candidateProfileId) {
  const row = store.db.prepare('SELECT id FROM resume_semantic_runs WHERE profile_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(candidateProfileId);
  if (!row) return null;
  return composeSourceResume({ profile: store.getProfile(candidateProfileId), semanticRun: store.getResumeSemanticRun(row.id) });
}

function splitBalancedCsv(value) {
  const output = [];
  let current = '';
  let depth = 0;
  for (const char of String(value || '')) {
    if (char === '(') depth += 1;
    if (char === ')' && depth > 0) depth -= 1;
    if (char === ',' && depth === 0) {
      if (current.trim()) output.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) output.push(current.trim());
  return output;
}

function parseSourceSkillStatement(statement) {
  const lines = String(statement?.text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  while (lines.length && normalize(lines[0]) === 'skills') lines.shift();
  if (lines.length < 2) return null;
  const label = lines.shift();
  const values = splitBalancedCsv(lines.join(' '));
  return label && values.length ? { label, values } : null;
}

function requirementText(requirement) {
  const excerpts = Array.isArray(requirement?.supporting_excerpts) ? requirement.supporting_excerpts : [];
  return normalize([requirement?.normalized_name, ...excerpts].filter(Boolean).join(' '));
}

function sourceSkillRequirementIds(value, requirements) {
  const key = normalize(value);
  const aliases = SOURCE_SKILL_ALIASES[key] || [key];
  return (requirements || []).filter((requirement) => {
    const text = requirementText(requirement);
    return aliases.some((alias) => {
      const trigger = normalize(alias);
      return trigger.length >= 3 && text.includes(trigger);
    });
  }).map((requirement) => requirement.id).filter(Boolean);
}

function targetSourceSkills(artifact, plan) {
  const requirements = Array.isArray(plan?.job_requirements) ? plan.job_requirements : [];
  if (!requirements.length) return artifact;
  const section = artifact?.sections?.find((item) => item.section === 'Skills');
  if (!section?.statements?.length) return artifact;
  if (section.statements.some((statement) => statement.content_origin === 'candidate_knowledge_generated')) return artifact;

  const targeted = section.statements.map((statement) => {
    if (statement.content_origin !== 'source_resume_passthrough') return statement;
    const parsed = parseSourceSkillStatement(statement);
    if (!parsed) return statement;
    const selected = parsed.values.map((value) => ({
      value,
      requirement_ids: sourceSkillRequirementIds(value, requirements),
    })).filter((item) => item.requirement_ids.length);
    if (!selected.length) return statement;
    return {
      ...statement,
      presentation: {
        mode: 'selected_source_skills',
        label: parsed.label,
        values: selected.map((item) => item.value),
        requirement_ids: [...new Set(selected.flatMap((item) => item.requirement_ids))],
        source_statement_id: statement.source_statement_id || statement.statement_id,
      },
    };
  });
  const selectedValues = targeted.flatMap((statement) => statement.presentation?.values || []);
  if (selectedValues.length < 3) return artifact;
  return {
    ...artifact,
    sections: artifact.sections.map((item) => item.section === 'Skills' ? { ...item, statements: targeted } : item),
    metadata: {
      ...artifact.metadata,
      source_skill_targeting: {
        mode: 'source_resume_exact_token_selection',
        selected_value_count: selectedValues.length,
        source_statement_ids: targeted.filter((statement) => statement.presentation?.mode === 'selected_source_skills').map((statement) => statement.source_statement_id || statement.statement_id),
      },
    },
  };
}

function factTextValues(fact) {
  const value = fact?.value || fact?.canonical_value || {};
  return [...new Set([
    fact?.display_value,
    ...Object.values(value),
  ].filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))];
}

function sourceSectionForFact(fact, sourceResumeArtifact) {
  if (!sourceResumeArtifact?.sections?.length) return null;
  const candidates = sourceResumeArtifact.sections.flatMap((section) => (section.statements || []).map((statement) => ({ section: section.section, statement })));
  const values = factTextValues(fact).map((text) => ({ raw: text, key: normalize(text) })).filter((item) => item.key.length >= 8);
  let best = null;
  for (const candidate of candidates) {
    const sourceKey = normalize(candidate.statement.text);
    for (const value of values) {
      const exact = sourceKey === value.key;
      const contained = value.key.length >= 20 && sourceKey.includes(value.key);
      if (!exact && !contained) continue;
      const score = exact ? 100000 - sourceKey.length : 10000 - sourceKey.length;
      if (!best || score > best.score) best = { section: candidate.section, score };
    }
  }
  return best?.section || null;
}

function sourceLinkedTailoring(output, facts, sourceResumeArtifact) {
  if (!sourceResumeArtifact?.sections?.length || !Array.isArray(output?.selections)) return output;
  const factMap = new Map((facts || []).map((fact) => [fact.id, fact]));
  const selections = output.selections.map((selection) => {
    const fact = factMap.get(selection.candidate_fact_id);
    if (!fact || !['responsibility', 'achievement'].includes(fact.entity_type)) return selection;
    const sourceSection = sourceSectionForFact(fact, sourceResumeArtifact);
    if (!['Experience', 'Projects'].includes(sourceSection) || sourceSection === selection.recommended_section) return selection;
    return {
      ...selection,
      recommended_section: sourceSection,
      relevance_rationale: `${selection.relevance_rationale} Source-resume parentage keeps this evidence in ${sourceSection}.`,
    };
  });
  const included = selections.filter((selection) => selection.selection_state === 'include');
  const sectionPlans = [...new Set(included.map((selection) => selection.recommended_section))].map((section, index) => ({
    section,
    recommended_order: index + 1,
    candidate_fact_ids: included.filter((selection) => selection.recommended_section === section).map((selection) => selection.candidate_fact_id),
  }));
  return { ...output, selections, sectionPlans };
}

function validateSourceSkillPresentation({ artifactRun, plan }) {
  const findings = [];
  const jobRequirements = Array.isArray(plan?.job_requirements) ? plan.job_requirements : [];
  const requirementIds = new Set(jobRequirements.map((requirement) => requirement.id));
  const artifact = artifactRun?.resume_artifacts?.find((item) => item.artifact_type === 'structured_resume');
  const skills = artifact?.content?.sections?.find((section) => section.section === 'Skills');
  for (const statement of skills?.statements || []) {
    const presentation = statement.presentation;
    if (!presentation) continue;
    const invalidBase = statement.content_origin !== 'source_resume_passthrough'
      || presentation.mode !== 'selected_source_skills'
      || presentation.source_statement_id !== (statement.source_statement_id || statement.statement_id)
      || !Array.isArray(presentation.values)
      || !presentation.values.length
      || !Array.isArray(presentation.requirement_ids)
      || !presentation.requirement_ids.length;
    const parsed = parseSourceSkillStatement(statement);
    const allowed = new Set(parsed?.values || []);
    const invalidValues = !parsed || presentation.values.some((value) => !allowed.has(value));
    const invalidRequirements = presentation.requirement_ids.some((id) => !requirementIds.has(id));
    const recomputedByValue = presentation.values.map((value) => sourceSkillRequirementIds(value, jobRequirements));
    const recomputedRequirementIds = new Set(recomputedByValue.flat());
    const invalidMapping = recomputedByValue.some((ids) => !ids.length || !ids.some((id) => presentation.requirement_ids.includes(id)))
      || presentation.requirement_ids.some((id) => !recomputedRequirementIds.has(id));
    if (invalidBase || invalidValues || invalidRequirements || invalidMapping) findings.push({
      category: 'source_resume_integrity',
      rule: 'source-skill-presentation-exact',
      severity: 'critical',
      message: 'Source-resume skill presentation must select only exact source tokens with recomputable mappings to immutable target-job requirements.',
      references: { statement_id: statement.statement_id },
    });
  }
  return findings;
}

function expandedReviewTableSql() {
  return `CREATE TABLE human_review_sections (
    id TEXT PRIMARY KEY,
    human_review_run_id TEXT NOT NULL REFERENCES human_review_runs(id),
    section TEXT NOT NULL CHECK(section IN ('Applicant Header', 'Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications')),
    action TEXT NOT NULL CHECK(action IN ('approve', 'edit')),
    ai_version TEXT NOT NULL,
    final_version TEXT NOT NULL,
    supporting_evidence TEXT NOT NULL,
    presentation_rationale TEXT NOT NULL,
    review_actor TEXT NOT NULL,
    reviewed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(human_review_run_id, section)
  ) STRICT;`;
}

function ensureExpandedReviewSchema(db) {
  const current = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'human_review_sections'").get();
  if (!current?.sql || current.sql.includes("'Applicant Header'")) return;
  db.exec('PRAGMA foreign_keys = OFF;');
  try {
    db.exec(`
      BEGIN IMMEDIATE;
      DROP TRIGGER IF EXISTS human_review_sections_immutable_update;
      DROP TRIGGER IF EXISTS human_review_sections_immutable_delete;
      ALTER TABLE human_review_sections RENAME TO human_review_sections_before_complete_resume;
      ${expandedReviewTableSql()}
      INSERT INTO human_review_sections SELECT * FROM human_review_sections_before_complete_resume;
      DROP TABLE human_review_sections_before_complete_resume;
      CREATE TRIGGER human_review_sections_immutable_update BEFORE UPDATE ON human_review_sections BEGIN SELECT RAISE(ABORT, 'Human Review section decisions are immutable'); END;
      CREATE TRIGGER human_review_sections_immutable_delete BEFORE DELETE ON human_review_sections BEGIN SELECT RAISE(ABORT, 'Human Review section decisions are immutable'); END;
      COMMIT;
    `);
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch {}
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

function firstPhone(text) {
  const matches = String(text || '').match(/(?:\+?\d[\d(). -]{7,}\d)/g) || [];
  return matches.map((value) => value.trim()).find((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15
      && !/^\d{4}\s*[-–—]\s*\d{4}$/.test(value);
  }) || null;
}

function deterministicIdentityBlocks(text, blocks) {
  const existing = (blocks || []).filter((item) => item?.type === 'identity').map((item) => normalize(item.exact_source_text));
  const candidates = [];
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const name = lines[0] && /^[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3}$/.test(lines[0]) ? lines[0] : null;
  const email = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = firstPhone(text);
  for (const [field, value] of [['name', name], ['email', email], ['phone', phone]]) {
    if (!value || existing.some((sourceText) => sourceText.includes(normalize(value)))) continue;
    const start = String(text || '').indexOf(value);
    if (start < 0) continue;
    candidates.push({
      id: `identity-intake-${field}`,
      type: 'identity',
      title: field === 'name' ? 'Applicant name' : field === 'email' ? 'Email' : 'Phone',
      label: field === 'name' ? 'Applicant name' : field === 'email' ? 'Email' : 'Phone',
      exact_source_text: value,
      source_location: { start, end: start + value.length },
      parent_id: null,
      normalized_meaning: value,
      confidence: 'high',
      state: 'confirmed',
      provenance: { source: 'resume_input', exact_source_text: value },
      limitations: ['Deterministically retained as source identity/contact text; it is not Candidate Knowledge.'],
    });
  }
  return candidates;
}

function installRuntimeBoundaries() {
  if (globalThis.__careerCompleteResumeBoundaryScheduled) return;
  globalThis.__careerCompleteResumeBoundaryScheduled = true;
  process.nextTick(() => {
    let storeModule;
    try { storeModule = require('./store'); } catch (error) { if (error?.code === 'MODULE_NOT_FOUND') return; throw error; }
    const Store = storeModule.Store;
    if (Store && !Store.prototype.__completeResumeCompositionBoundary) {
      const createPlan = Store.prototype.createResumeTailoringPlanRun;
      Store.prototype.createResumeTailoringPlanRun = function createCompleteResumeTailoringPlan(input) {
        const sourceResumeArtifact = input.sourceResumeArtifact || latestSourceResumeSnapshot(this, input.candidateProfileId);
        return createPlan.call(this, { ...input, sourceResumeArtifact });
      };
      const getPlan = Store.prototype.getResumeTailoringPlanRun;
      Store.prototype.getResumeTailoringPlanRun = function getCompleteResumeTailoringPlan(id) {
        const plan = getPlan.call(this, id);
        const profile = this.getJobRequirementProfile(plan.job_requirement_profile_id);
        return { ...plan, job_requirements: profile.requirements || [] };
      };
      const createReview = Store.prototype.createHumanReviewRun;
      Store.prototype.createHumanReviewRun = function createCompleteResumeHumanReview(input) {
        ensureExpandedReviewSchema(this.db);
        return createReview.call(this, input);
      };
      Object.defineProperty(Store.prototype, '__completeResumeCompositionBoundary', { value: true });
    }

    const tailoring = require('./resume-tailoring');
    if (tailoring && !tailoring.__sourceSectionOwnershipBoundary) {
      const originalPlan = tailoring.plan;
      tailoring.plan = function sourceLinkedPlan(input) {
        return sourceLinkedTailoring(originalPlan(input), input.facts, input.sourceResumeArtifact);
      };
      Object.defineProperty(tailoring, '__sourceSectionOwnershipBoundary', { value: true });
    }

    const artifactGeneration = require('./resume-artifact');
    if (artifactGeneration && !artifactGeneration.__sourceSkillTargetingBoundary) {
      const originalGenerate = artifactGeneration.generate;
      artifactGeneration.generate = function sourceTargetedGenerate(plan, ...rest) {
        return targetSourceSkills(originalGenerate(plan, ...rest), plan);
      };
      Object.defineProperty(artifactGeneration, '__sourceSkillTargetingBoundary', { value: true });
    }

    const validation = require('./resume-validation');
    if (validation && !validation.__sourceSkillPresentationBoundary) {
      const originalValidate = validation.validate;
      validation.validate = function validateWithSourceSkillPresentation(input) {
        const result = originalValidate(input);
        return { ...result, findings: [...(result.findings || []), ...validateSourceSkillPresentation(input)] };
      };
      Object.defineProperty(validation, '__sourceSkillPresentationBoundary', { value: true });
    }

    const llm = require('./llm-resume-understanding');
    if (llm && !llm.__identityPassthroughBoundary) {
      const align = llm.alignUnderstanding;
      llm.alignUnderstanding = function alignWithDeterministicIdentity({ understanding, text }) {
        if (!understanding || !Array.isArray(understanding.blocks)) return align({ understanding, text });
        const additions = deterministicIdentityBlocks(text, understanding.blocks);
        return align({ understanding: { ...understanding, blocks: [...understanding.blocks, ...additions] }, text });
      };
      Object.defineProperty(llm, '__identityPassthroughBoundary', { value: true });
    }
  });
}

module.exports = {
  FORMAT_VERSION,
  POLICY_VERSION,
  SECTION_ORDER,
  composeSourceResume,
  latestSourceResumeSnapshot,
  ensureExpandedReviewSchema,
  firstPhone,
  deterministicIdentityBlocks,
  parseSourceSkillStatement,
  sourceLinkedTailoring,
  targetSourceSkills,
  validateSourceSkillPresentation,
  installRuntimeBoundaries,
};
