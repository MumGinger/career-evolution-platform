const POLICY_VERSION = 'human-review-policy/1.0.0';
const REQUIRED_SECTIONS = ['Professional Summary', 'Skills', 'Experience', 'Projects'];

function plainObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function validateFinalVersion(value) {
  if (!plainObject(value)) return 'must be an object';
  const hasPlaceholder = Object.hasOwn(value, 'placeholder');
  const hasStatements = Object.hasOwn(value, 'statements');
  if (!hasPlaceholder && !hasStatements) return 'must include placeholder and/or statements';
  if (hasPlaceholder && value.placeholder !== null && typeof value.placeholder !== 'string') return 'placeholder must be null or a string';
  if (hasStatements) {
    if (!Array.isArray(value.statements)) return 'statements must be an array';
    for (const [index, statement] of value.statements.entries()) {
      if (!plainObject(statement) || typeof statement.text !== 'string' || !statement.text.trim()) return `statement ${index + 1} must be an object with non-empty text`;
      if (Object.hasOwn(statement, 'statement_id') && typeof statement.statement_id !== 'string') return `statement ${index + 1} statement_id must be a string`;
      if (Object.hasOwn(statement, 'template') && typeof statement.template !== 'string') return `statement ${index + 1} template must be a string`;
      if (Object.hasOwn(statement, 'provenance') && !plainObject(statement.provenance)) return `statement ${index + 1} provenance must be an object`;
    }
  }
  return null;
}

function sectionDraft(section, strategy) {
  const statements = section.statements || [];
  const decisions = (strategy?.presentation_decisions || []).filter((decision) =>
    statements.some((statement) => statement.provenance?.candidate_fact_id === decision.candidate_fact_id));
  return {
    section: section.section,
    ai_version: { placeholder: section.placeholder || null, statements: statements.map((statement) => ({ text: statement.text, provenance: statement.provenance })) },
    supporting_evidence: statements.map((statement) => statement.provenance),
    presentation_rationale: decisions.length
      ? decisions.map((decision) => decision.rationale)
      : ['The AI preserved this section as a bounded draft; no unsupported claim was added.'],
  };
}

function createDraft({ artifactRun, presentationStrategyRun = null }) {
  const artifact = artifactRun.resume_artifacts.find((item) => item.artifact_type === 'structured_resume');
  if (!artifact) throw new Error('Human Review requires a structured resume artifact');
  const byName = new Map(artifact.content.sections.map((section) => [section.section, section]));
  return REQUIRED_SECTIONS.map((name) => byName.get(name)).filter((section) => section?.statements?.length).map((section) => sectionDraft(section, presentationStrategyRun?.strategy));
}

function complete(run) { return run.section_reviews.length > 0 && run.section_reviews.every((review) => ['approve', 'edit'].includes(review.action)); }
function finalSection(review) { return review.action === 'edit' ? review.final_version : review.ai_version; }
function markdown(run) { return run.section_reviews.map((review) => {
  const version = finalSection(review);
  const lines = version.placeholder ? [version.placeholder] : version.statements.map((statement) => `- ${statement.text}`);
  return lines.length ? `## ${review.section}\n\n${lines.join('\n')}` : '';
}).filter(Boolean).join('\n\n'); }

module.exports = { POLICY_VERSION, REQUIRED_SECTIONS, createDraft, complete, finalSection, markdown, validateFinalVersion };
