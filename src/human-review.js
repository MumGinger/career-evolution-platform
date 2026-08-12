const POLICY_VERSION = 'human-review-policy/1.1.0';
const REQUIRED_SECTIONS = ['Applicant Header', 'Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'];

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
      if (Object.hasOwn(statement, 'source_statement_id') && typeof statement.source_statement_id !== 'string') return `statement ${index + 1} source_statement_id must be a string`;
      if (Object.hasOwn(statement, 'parent_source_statement_id') && statement.parent_source_statement_id !== null && typeof statement.parent_source_statement_id !== 'string') return `statement ${index + 1} parent_source_statement_id must be null or a string`;
      if (Object.hasOwn(statement, 'template') && typeof statement.template !== 'string') return `statement ${index + 1} template must be a string`;
      if (Object.hasOwn(statement, 'display_style') && !['line', 'heading', 'bullet', 'inline'].includes(statement.display_style)) return `statement ${index + 1} display_style must be line, heading, bullet, or inline`;
      if (Object.hasOwn(statement, 'content_origin') && !['source_resume_passthrough', 'candidate_knowledge_generated'].includes(statement.content_origin)) return `statement ${index + 1} content_origin is unsupported`;
      if (Object.hasOwn(statement, 'provenance') && !plainObject(statement.provenance)) return `statement ${index + 1} provenance must be an object`;
      if (Object.hasOwn(statement, 'presentation') && !plainObject(statement.presentation)) return `statement ${index + 1} presentation must be an object`;
    }
  }
  return null;
}

function reviewStatement(statement) {
  return {
    statement_id: statement.statement_id,
    ...(statement.source_statement_id ? { source_statement_id: statement.source_statement_id } : {}),
    ...(Object.hasOwn(statement, 'parent_source_statement_id') ? { parent_source_statement_id: statement.parent_source_statement_id } : {}),
    text: statement.text,
    display_style: statement.display_style || 'bullet',
    content_origin: statement.content_origin || 'candidate_knowledge_generated',
    resume_content_selection_ids: statement.resume_content_selection_ids || [],
    provenance: statement.provenance,
    ...(statement.presentation ? { presentation: statement.presentation } : {}),
  };
}

function projectEntryLabel(group) {
  const heading = group.statements.find((statement) => statement.display_style === 'heading') || group.statements[0];
  const lines = String(heading?.text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const meaningful = lines.filter((line) => !/^[•▪◦-]+$/.test(line) && !/^ongoing projects\b/i.test(line) && !/^research experience$/i.test(line));
  return meaningful[0] || 'Unnamed source project';
}

function targetProjectStatements(section, statements) {
  if (section !== 'Projects') return { statements, omittedEntryCount: 0, omittedEntryLabels: [] };
  const groups = [];
  let current = null;
  for (const statement of statements) {
    if (statement.display_style === 'heading') {
      current = { statements: [statement] };
      groups.push(current);
    } else if (current) current.statements.push(statement);
    else {
      current = { statements: [statement] };
      groups.push(current);
    }
  }
  const selected = groups.map((group) => ({
    ...group,
    selected: group.statements.some((statement) =>
      statement.content_origin === 'candidate_knowledge_generated'
      || (statement.resume_content_selection_ids || []).length > 0),
  }));
  const selectedCount = selected.filter((group) => group.selected).length;
  if (selectedCount < 3) return { statements, omittedEntryCount: 0, omittedEntryLabels: [] };
  const kept = selected.filter((group) => group.selected);
  const omitted = selected.filter((group) => !group.selected);
  return {
    statements: kept.flatMap((group) => group.statements),
    omittedEntryCount: omitted.length,
    omittedEntryLabels: omitted.map(projectEntryLabel),
  };
}

function sectionDraft(section, strategy) {
  const targetedProjects = targetProjectStatements(section.section, section.statements || []);
  const statements = targetedProjects.statements;
  const decisions = (strategy?.presentation_decisions || []).filter((decision) =>
    statements.some((statement) => statement.provenance?.candidate_fact_id === decision.candidate_fact_id));
  const sourceOnly = statements.length > 0 && statements.every((statement) => statement.content_origin === 'source_resume_passthrough');
  const targetedSource = statements.some((statement) => statement.presentation?.mode === 'selected_source_skills');
  const rationale = decisions.map((decision) => decision.rationale);
  if (targetedProjects.omittedEntryCount > 0) rationale.push(`Source-only project entries not selected for this application: ${targetedProjects.omittedEntryLabels.join('; ')}. They remain unchanged in the uploaded resume and can be restored during Career Review.`);
  if (targetedSource) rationale.push('This section uses exact source-resume skill wording selected for the target job. The source resume remains unchanged and no new Candidate Knowledge claim is created.');
  if (!rationale.length && sourceOnly) rationale.push('This section is preserved verbatim from validated source-resume spans. It is not a new Candidate Knowledge claim.');
  if (!rationale.length) rationale.push('The AI preserved this section as a bounded draft; no unsupported claim was added.');
  return {
    section: section.section,
    ai_version: { placeholder: section.placeholder || null, statements: statements.map(reviewStatement) },
    supporting_evidence: statements.map((statement) => statement.provenance),
    presentation_rationale: rationale,
  };
}

function createDraft({ artifactRun, presentationStrategyRun = null }) {
  const artifact = artifactRun.resume_artifacts.find((item) => item.artifact_type === 'structured_resume');
  if (!artifact) throw new Error('Human Review requires a structured resume artifact');
  return [...artifact.content.sections]
    .sort((left, right) => left.position - right.position)
    .filter((section) => section?.statements?.length)
    .map((section) => sectionDraft(section, presentationStrategyRun?.strategy));
}

function complete(run) { return run.section_reviews.length > 0 && run.section_reviews.every((review) => ['approve', 'edit'].includes(review.action)); }
function finalSection(review) { return review.action === 'edit' ? review.final_version : review.ai_version; }
function statementLines(section, version) {
  if (version.placeholder) return [version.placeholder];
  const lines = [];
  for (const statement of version.statements || []) {
    if (statement.display_style === 'heading') lines.push(`### ${statement.text}`);
    else if (statement.display_style === 'line') lines.push(statement.text);
    else lines.push(`- ${statement.text}`);
  }
  return lines;
}
function markdown(run) {
  return run.section_reviews.map((review) => {
    const version = finalSection(review);
    const lines = statementLines(review.section, version);
    if (!lines.length) return '';
    if (review.section === 'Applicant Header') return lines.join('\n');
    return `## ${review.section}\n\n${lines.join('\n')}`;
  }).filter(Boolean).join('\n\n');
}

module.exports = { POLICY_VERSION, REQUIRED_SECTIONS, createDraft, complete, finalSection, markdown, validateFinalVersion, reviewStatement, targetProjectStatements };
