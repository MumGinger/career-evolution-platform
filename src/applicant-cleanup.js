const { normalizeVisibleText } = require('./applicant-resume');

const DATE_RANGE = /^(?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}\s*[–—-]\s*(?:(?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}|Present|Current)$/i;

function cleanStatement(statement = {}) {
  const displayStyle = statement.display_style || 'bullet';
  let text = normalizeVisibleText(statement.text);
  if (displayStyle === 'bullet') text = text.replace(/^(?:[•▪◦]\s*|-\s+)/, '');
  return {
    ...statement,
    text,
    display_style: displayStyle === 'heading' && DATE_RANGE.test(text) ? 'line' : displayStyle,
  };
}

function cleanVersion(version) {
  if (!version || typeof version !== 'object') return version;
  return {
    ...version,
    placeholder: version.placeholder == null ? version.placeholder : normalizeVisibleText(version.placeholder),
    statements: Array.isArray(version.statements)
      ? version.statements.map(cleanStatement)
      : version.statements,
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
    .replace(/^(#{3,}\s+)((?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}\s*[–—-]\s*(?:(?:[A-Z][a-z]{2,8}\s+)?(?:19|20)\d{2}|Present|Current))$/gim, '$2');
}

module.exports = {
  cleanMarkdown,
  cleanReview,
  cleanRun,
  cleanStatement,
};
