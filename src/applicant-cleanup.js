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

function cleanApplicantRationale(value) {
  return normalizeVisibleText(value)
    .replace(/Candidate Knowledge/gi, 'reviewed evidence')
    .replace(/003\.6/gi, 'the evidence review step')
    .replace(/candidate fact/gi, 'supported applicant information')
    .replace(/tailoring-plan/gi, 'resume tailoring')
    .replace(/shared-understanding/gi, 'application context');
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

function canonicalText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function canonicalStatementText(statement) {
  return canonicalText(statement.text);
}

function dedupeAdjacentStatements(statements) {
  const result = [];
  for (const statement of statements) {
    const previous = result.at(-1);
    if (previous && canonicalStatementText(previous) === canonicalStatementText(statement)) {
      if (statementPreference(statement) > statementPreference(previous)) result[result.length - 1] = statement;
      continue;
    }
    result.push(statement);
  }
  return result;
}

function removeEmbeddedBulletLinesFromHeadings(statements) {
  const childrenByParent = new Map();
  for (const statement of statements) {
    if (statement.parent_source_statement_id && statement.display_style === 'bullet') {
      childrenByParent.set(statement.parent_source_statement_id, [
        ...(childrenByParent.get(statement.parent_source_statement_id) || []),
        statement,
      ]);
    }
  }

  return statements.map((statement, index) => {
    if (statement.display_style !== 'heading' || !statement.text.includes('\n')) return statement;
    const statementId = statement.source_statement_id || statement.statement_id;
    const related = childrenByParent.get(statementId) || [];
    const fallback = [];
    if (!related.length) {
      for (let cursor = index + 1; cursor < statements.length; cursor += 1) {
        const next = statements[cursor];
        if (next.display_style === 'heading') break;
        if (next.display_style === 'bullet') fallback.push(next);
      }
    }
    const children = related.length ? related : fallback;
    if (!children.length) return statement;

    let text = statement.text;
    for (const child of children) {
      const childText = normalizeVisibleText(child.text);
      if (childText && text.includes(childText)) text = text.split(childText).join('');
    }
    text = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !/^[•▪◦-]+$/.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text && text !== statement.text ? { ...statement, text } : statement;
  });
}

function compactGeneratedProjectHeadings(statements, section) {
  if (section !== 'Projects') return statements;
  return statements.map((statement) => {
    if (statement.display_style !== 'heading' || statement.content_origin !== 'candidate_knowledge_generated') return statement;
    const lines = normalizeVisibleText(statement.text).split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return statement;
    const match = lines[0].match(/^(.{3,100}?)\s+[—–-]\s+(?:developed|built|implemented|designed|created|analyzed|analysed|conducted|used|utilized|integrated|engineered)\b/i);
    if (!match) return statement;
    lines[0] = match[1].trim();
    return { ...statement, text: lines.join('\n') };
  });
}

function sectionMarker(section, line) {
  const value = canonicalText(line);
  if (!value) return false;
  if (section === 'Skills') return value === 'skills';
  if (section === 'Education') return value === 'education';
  if (section === 'Certifications') return value === 'certifications' || value === 'certification';
  if (section === 'Projects') return /^ongoing projects\b/.test(value) || value === 'research experience';
  if (section === 'Experience') return value === 'experience' || value === 'work experience';
  return false;
}

function removeRepeatedSectionMarkers(statements, section) {
  return statements.map((statement) => {
    const lines = normalizeVisibleText(statement.text).split('\n').map((line) => line.trim()).filter(Boolean);
    while (lines.length > 1 && sectionMarker(section, lines[0])) lines.shift();
    const text = lines.join('\n').trim();
    return text && text !== statement.text ? { ...statement, text } : statement;
  });
}

function applySourceSkillPresentation(statements, section) {
  if (section !== 'Skills') return statements;
  const targeted = statements.some((statement) => statement.presentation?.mode === 'selected_source_skills');
  if (!targeted) return statements;
  return statements.flatMap((statement) => {
    const presentation = statement.presentation;
    if (presentation?.mode !== 'selected_source_skills' || !Array.isArray(presentation.values) || !presentation.values.length) return [];
    return [{
      ...statement,
      text: `${presentation.label}: ${presentation.values.join(', ')}`,
      display_style: 'inline',
    }];
  });
}

function splitCombinedHeader(statements, section) {
  if (section !== 'Applicant Header') return statements;
  return statements.flatMap((statement) => {
    const parts = normalizeVisibleText(statement.text).split('\n').map((line) => line.trim()).filter(Boolean);
    if (parts.length < 2) return [statement];
    const [name, ...contact] = parts;
    return [
      { ...statement, text: name, display_style: 'line' },
      {
        ...statement,
        statement_id: statement.statement_id ? `${statement.statement_id}:contact` : statement.statement_id,
        text: contact.join(' | '),
        display_style: 'line',
      },
    ];
  });
}

function repairLeakedProjectDates(statements, section) {
  if (section !== 'Projects') return statements;
  const result = statements.map((statement) => ({ ...statement }));
  let previousHeadingIndex = null;
  for (let index = 0; index < result.length; index += 1) {
    const statement = result[index];
    if (statement.display_style !== 'heading') continue;
    const lines = normalizeVisibleText(statement.text).split('\n').map((line) => line.trim()).filter(Boolean);
    const dateIndexes = lines.map((line, lineIndex) => DATE_RANGE.test(line) ? lineIndex : -1).filter((lineIndex) => lineIndex >= 0);
    if (dateIndexes.length > 1 && previousHeadingIndex !== null) {
      const previous = result[previousHeadingIndex];
      const previousLines = normalizeVisibleText(previous.text).split('\n').map((line) => line.trim()).filter(Boolean);
      if (!previousLines.some((line) => DATE_RANGE.test(line))) {
        previousLines.push(lines[dateIndexes[0]]);
        previous.text = previousLines.join('\n');
        lines.splice(dateIndexes[0], 1);
        statement.text = lines.join('\n');
      }
    }
    previousHeadingIndex = index;
  }
  return result;
}

function removeRepeatedHeadingPrefixes(statements) {
  let heading = null;
  return statements.map((statement) => {
    if (statement.display_style === 'heading') {
      heading = statement.text;
      return statement;
    }
    if (statement.display_style !== 'bullet' || !heading) return statement;
    const prefix = `${heading}:`;
    if (!statement.text.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())) return statement;
    const text = statement.text.slice(prefix.length).trim().replace(/^[-–—]\s+/, '');
    return text ? { ...statement, text } : statement;
  });
}

function cleanVersion(version, section = null) {
  if (!version || typeof version !== 'object') return version;
  let statements = version.statements;
  if (Array.isArray(statements)) {
    statements = statements.map(cleanStatement);
    statements = applySourceSkillPresentation(statements, section);
    statements = removeEmbeddedBulletLinesFromHeadings(statements);
    statements = compactGeneratedProjectHeadings(statements, section);
    statements = removeRepeatedSectionMarkers(statements, section);
    statements = repairLeakedProjectDates(statements, section);
    statements = splitCombinedHeader(statements, section);
    statements = dedupeAdjacentStatements(statements);
    statements = removeRepeatedHeadingPrefixes(statements);
  }
  return {
    ...version,
    placeholder: version.placeholder == null ? version.placeholder : normalizeVisibleText(version.placeholder),
    statements,
  };
}

function cleanReview(review) {
  return {
    ...review,
    ai_version: cleanVersion(review.ai_version, review.section),
    final_version: cleanVersion(review.final_version, review.section),
    presentation_rationale: Array.isArray(review.presentation_rationale)
      ? review.presentation_rationale.map(cleanApplicantRationale)
      : review.presentation_rationale,
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
  cleanApplicantRationale,
  cleanEvidenceSourceText,
  cleanMarkdown,
  cleanReview,
  cleanRun,
  cleanStatement,
};
