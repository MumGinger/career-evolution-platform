const FORMAT_VERSION = 'source-resume-composition/1.0.0';
const POLICY_VERSION = 'complete-resume-composition-boundary/1.0.0';
const SECTION_ORDER = ['Applicant Header', 'Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'];
const SECTION_FOR = {
  identity: 'Applicant Header',
  skill: 'Skills',
  tool: 'Skills',
  experience: 'Experience',
  responsibility: 'Experience',
  achievement: 'Experience',
  project: 'Projects',
  education: 'Education',
  certification: 'Certifications',
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

function deterministicIdentityBlocks(text, blocks) {
  const existing = (blocks || []).filter((item) => item?.type === 'identity').map((item) => normalize(item.exact_source_text));
  const candidates = [];
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const name = lines[0] && /^[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3}$/.test(lines[0]) ? lines[0] : null;
  const email = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = String(text || '').match(/(?:\+?\d[\d(). -]{7,}\d)/)?.[0] || null;
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
      const createReview = Store.prototype.createHumanReviewRun;
      Store.prototype.createHumanReviewRun = function createCompleteResumeHumanReview(input) {
        ensureExpandedReviewSchema(this.db);
        return createReview.call(this, input);
      };
      Object.defineProperty(Store.prototype, '__completeResumeCompositionBoundary', { value: true });
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
  deterministicIdentityBlocks,
  installRuntimeBoundaries,
};
