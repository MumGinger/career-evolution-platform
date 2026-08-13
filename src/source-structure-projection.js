const { Store } = require('./store');
const { latestSourceResumeSnapshot } = require('./resume-composition');

const GLYPH_ONLY = /^[\u2022\u2023\u25e6\uf0b7\u00b7\-\u2013\u2014*]+$/;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function cleanLine(value) {
  return String(value || '').replace(/^\s*[\u2022\u2023\u25e6\uf0b7\u00b7*]+\s*/, '').trim();
}

function formattingMarker(line, section) {
  const key = normalize(line);
  if (!key) return true;
  if (GLYPH_ONLY.test(String(line || '').trim())) return true;
  const sectionKey = normalize(section);
  if (key === sectionKey) return true;
  if (section === 'Projects' && /^(ongoing )?projects\b/.test(key)) return true;
  if (section === 'Projects' && key === 'research experience') return true;
  if (section === 'Experience' && /\bexperience$/.test(key) && key.length < 80) return true;
  if (section === 'Education' && key === 'education') return true;
  if (section === 'Certifications' && /^(certifications?|credentials?)$/.test(key)) return true;
  if (section === 'Skills' && key === 'skills') return true;
  return false;
}

function sourceBackedTitle(statement, entity) {
  const proposed = cleanLine(entity?.attributes?.title || '');
  if (!proposed) return null;
  const lines = String(statement?.text || '').replace(/\r/g, '').split('\n').map(cleanLine).filter(Boolean);
  return lines.find((line) => normalize(line) === normalize(proposed)) || null;
}

function projectedProvenance(statement, exactSourceText, fragmentKind) {
  return {
    ...(statement.provenance || {}),
    source_kind: 'validated_resume_structure_projection',
    exact_source_text: exactSourceText,
    raw_container_exact_source_text: statement.text,
    source_fragment_kind: fragmentKind,
  };
}

function parentProjection(statement, section, entity, children) {
  if (!['project', 'experience'].includes(statement?.provenance?.block_type)) return null;
  if (statement.display_style !== 'heading' || !String(statement.text || '').includes('\n')) return null;
  const title = sourceBackedTitle(statement, entity);
  if (!title) return null;

  let residual = String(statement.text || '');
  for (const child of children) {
    const exact = String(child.text || '');
    if (exact && residual.includes(exact)) residual = residual.replace(exact, '');
  }
  const metadata = residual
    .replace(/\r/g, '')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => normalize(line) !== normalize(title))
    .filter((line) => !formattingMarker(line, section));

  const heading = {
    ...statement,
    text: title,
    provenance: projectedProvenance(statement, title, 'entry_heading'),
  };
  const lines = metadata.map((text, index) => ({
    statement_id: `${statement.statement_id}:meta:${index + 1}`,
    source_statement_id: `${statement.source_statement_id || statement.statement_id}:meta:${index + 1}`,
    text,
    section,
    position: Number(statement.position || 0) + ((index + 1) / 100),
    display_style: 'line',
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: statement.source_statement_id || statement.statement_id,
    provenance: projectedProvenance(statement, text, 'entry_metadata'),
  }));
  return [heading, ...lines];
}

function standaloneProjection(statement, section) {
  if (statement?.content_origin !== 'source_resume_passthrough') return [statement];
  const raw = String(statement.text || '');
  if (!raw.includes('\n')) return [statement];
  const lines = raw.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const retained = lines.filter((line) => !GLYPH_ONLY.test(line) && !formattingMarker(line, section));
  if (!retained.length || retained.length === lines.length) return [statement];
  const text = retained.join('\n');
  return [{
    ...statement,
    text,
    provenance: projectedProvenance(statement, text, 'standalone_content'),
  }];
}

function projectSourceResumeSnapshot(snapshot, semanticRun) {
  if (!snapshot?.sections?.length || !semanticRun?.entities?.length) return snapshot;
  const entityBySpan = new Map((semanticRun.entities || []).map((entity) => [entity.evidence_span_id, entity]));
  const projectedSections = snapshot.sections.map((section) => {
    const childByParent = new Map();
    for (const statement of section.statements || []) {
      if (!statement.parent_source_statement_id) continue;
      childByParent.set(statement.parent_source_statement_id, [
        ...(childByParent.get(statement.parent_source_statement_id) || []),
        statement,
      ]);
    }
    const statements = [];
    for (const statement of section.statements || []) {
      const sourceId = statement.source_statement_id || statement.statement_id;
      const entity = entityBySpan.get(statement.provenance?.evidence_span_id);
      const parent = parentProjection(statement, section.section, entity, childByParent.get(sourceId) || []);
      if (parent) statements.push(...parent);
      else statements.push(...standaloneProjection(statement, section.section));
    }
    return { ...section, statements };
  });
  return {
    ...snapshot,
    content: projectedSections.flatMap((section) => section.statements.map((statement) => statement.text)).join('\n'),
    sections: projectedSections,
    structure_projection: {
      policy_version: 'source-structure-projection/1.0.0',
      raw_evidence_authority: 'resume_semantic_run',
    },
  };
}

function installSourceStructureBoundary() {
  if (Store.prototype.__sourceStructureProjectionBoundary) return;
  const createPlan = Store.prototype.createResumeTailoringPlanRun;
  Store.prototype.createResumeTailoringPlanRun = function createStructurallyProjectedPlan(input) {
    let sourceResumeArtifact = input.sourceResumeArtifact || null;
    if (!sourceResumeArtifact) sourceResumeArtifact = latestSourceResumeSnapshot(this, input.candidateProfileId);
    if (sourceResumeArtifact?.resume_semantic_run_id) {
      const semanticRun = this.getResumeSemanticRun(sourceResumeArtifact.resume_semantic_run_id);
      sourceResumeArtifact = projectSourceResumeSnapshot(sourceResumeArtifact, semanticRun);
    }
    return createPlan.call(this, { ...input, ...(sourceResumeArtifact ? { sourceResumeArtifact } : {}) });
  };
  Object.defineProperty(Store.prototype, '__sourceStructureProjectionBoundary', { value: true });
}

module.exports = {
  installSourceStructureBoundary,
  projectSourceResumeSnapshot,
  sourceBackedTitle,
};
