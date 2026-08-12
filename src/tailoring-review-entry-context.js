function structuredArtifact(session) {
  return session?.artifact?.resume_artifacts?.find((item) => item.artifact_type === 'structured_resume') || null;
}

function sourceSnapshot(session) {
  return session?.tailoring?.source_resume_snapshot || session?.baseSourceResumeSnapshot || null;
}

function sourceStatementIndex(session) {
  const index = new Map();
  for (const section of sourceSnapshot(session)?.sections || []) {
    for (const statement of section.statements || []) {
      const id = statement.source_statement_id || statement.statement_id;
      if (id) index.set(id, { ...statement, section: section.section });
    }
  }
  return index;
}

function artifactStatementIndex(session) {
  const index = new Map();
  for (const section of structuredArtifact(session)?.content?.sections || []) {
    for (const statement of section.statements || []) {
      if (statement.statement_id) index.set(statement.statement_id, { ...statement, section: section.section });
    }
  }
  return index;
}

function entryIdentity(statement, item, sourceById) {
  const sourceStatementId = statement?.source_statement_id || null;
  const parentSourceStatementId = statement?.parent_source_statement_id || null;
  const structuralEntryId = parentSourceStatementId
    || (statement?.display_style === 'heading' ? sourceStatementId : null)
    || sourceStatementId;
  const sourceEntry = structuralEntryId ? sourceById.get(structuralEntryId) : null;
  const entryId = structuralEntryId || `generated:${item.section}:${item.id}`;
  const entryLabel = sourceEntry?.text
    || (statement?.display_style === 'heading' ? item.originalText : null)
    || item.section;
  return {
    entryId,
    entryLabel,
    displayStyle: statement?.display_style || 'bullet',
    sourceStatementId,
    parentSourceStatementId,
  };
}

function annotateTailoringReview(session, items = []) {
  const sourceById = sourceStatementIndex(session);
  const artifactById = artifactStatementIndex(session);
  return (items || []).map((item) => ({
    ...item,
    ...entryIdentity(artifactById.get(item.id), item, sourceById),
  }));
}

module.exports = {
  annotateTailoringReview,
  artifactStatementIndex,
  entryIdentity,
  sourceStatementIndex,
};
