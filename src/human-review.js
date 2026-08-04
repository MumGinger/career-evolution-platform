const POLICY_VERSION = 'human-review-policy/1.0.0';
const REQUIRED_SECTIONS = ['Professional Summary', 'Skills', 'Experience', 'Projects'];

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
  return REQUIRED_SECTIONS.map((name) => sectionDraft(byName.get(name) || { section: name, statements: [] }, presentationStrategyRun?.strategy));
}

function complete(run) { return REQUIRED_SECTIONS.every((section) => run.section_reviews.some((review) => review.section === section)); }
function finalSection(review) { return review.action === 'edit' ? review.final_version : review.ai_version; }
function markdown(run) { return run.section_reviews.map((review) => {
  const version = finalSection(review);
  const lines = version.placeholder ? [version.placeholder] : version.statements.map((statement) => `- ${statement.text}`);
  return `## ${review.section}\n\n${lines.join('\n') || '_No content approved for this section._'}`;
}).join('\n\n'); }

module.exports = { POLICY_VERSION, REQUIRED_SECTIONS, createDraft, complete, finalSection, markdown };
