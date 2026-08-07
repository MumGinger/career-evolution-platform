const { normalizeVisibleText } = require('./applicant-resume');

const DATE_RANGE = /^(?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}\s*[–—-]\s*(?:(?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}|Present|Current)$/i;

function cleanBulletArtifacts(value) {
  return value
    .replace(/^(?:[•▪◦]\s*|-\s+)/, '')
    .replace(/:\s*[•▪◦]\s*/g, ': ');
}

function cleanEvidenceSourceText(value) {
  return normalizeVisibleText(value)
    .split('\n')
    .map((line) => line.replace(/^\s*[•▪◦]\s*/, ''))
    .join('\n')
    .trim();
}

function cleanStatement(statement = {}) {
  const displayStyle = statement.display_style || 'bullet';
  let text = normalizeVisibleText(statement.text);
  if (displayStyle === 'bullet') text = cleanBulletArtifacts(text);
  return {
    ...statement,
    text,
    display_style: displayStyle === 'heading' && DATE_RANGE.test(text) ? 'line' : displayStyle,
  };
}

function statementPreference(statement) {
  if (DATE_RANGE.test(statement.text) && statement.display_style === 'line') return 5;
  return {
    heading: 4,
    bullet: 3,
    line: 2,
    inline: 1,
  }[statement.display_style] || 0;
}

function dedupeStatements(statements) {
  const selected = new Map();
  for (const [index, statement] of statements.entries()) {
    const key = statement.text.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    if (!key) continue;
    const current = selected.get(key);
    if (!current) {
      selected.set(key, { index, statement });
      continue;
    }
    if (statementPreference(statement) > statementPreference(current.statement)) {
      selected.set(key, { index: current.index, statement });
    }
  }
  return [...selected.values()]
    .sort((left, right) => left.index - right.index)
    .map((item) => item.statement);
}

function cleanVersion(version) {
  if (!version || typeof version !== 'object') return version;
  const statements = Array.isArray(version.statements)
    ? version.statements.map(cleanStatement)
    : version.statements;
  return {
    ...version,
    placeholder: version.placeholder == null ? version.placeholder : normalizeVisibleText(version.placeholder),
    statements: Array.isArray(statements) ? dedupeStatements(statements) : statements,
  };
}

function cleanReview(review) {
  return {
    ...review,
    ai_version: cleanVersion(review.ai_version),
    final_version: cleanVersion(review.final_version),
  };
}

function cleanRun(run) {
  return {
    ...run,
    section_reviews: (run.section_reviews || []).map(cleanReview),
  };
}

function cleanMarkdown(markdown) {
  return normalizeVisibleText(markdown)
    .replace(/^(\s*-\s+)[•▪◦]\s*/gm, '$1')
    .replace(/:\s*[•▪◦]\s*/g, ': ')
    .replace(/^(#{3,}\s+)((?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}\s*[–—-]\s*(?:(?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}|Present|Current))$/gim, '$2');
}

module.exports = {
  cleanEvidenceSourceText,
  cleanMarkdown,
  cleanReview,
  cleanRun,
  cleanStatement,
};
