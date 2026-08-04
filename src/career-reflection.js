const { createHash } = require('node:crypto');

const POLICY_VERSION = 'career-reflection/1.0.0';
const PROMPT = 'Does this feel accurate right now?';
const ACTIONS = ['looks_right', 'not_quite', 'missing_something'];
const MAX_NOTE_LENGTH = 500;

function normalizeNote(note) {
  if (note === undefined || note === null || note === '') return null;
  if (typeof note !== 'string') throw new Error('Reflection note must be a short string');
  const normalized = note.trim();
  if (!normalized) return null;
  if (normalized.length > MAX_NOTE_LENGTH) throw new Error(`Reflection note must be ${MAX_NOTE_LENGTH} characters or fewer`);
  return normalized;
}
function submissionKey({ snapshotRunId, actor, action, note }) {
  return createHash('sha256').update([snapshotRunId, actor, action, note || ''].join('\u0000')).digest('hex');
}
function summary(snapshotRun) {
  const direction = snapshotRun.current_direction.label ? `You appear to be exploring ${snapshotRun.current_direction.label}.` : 'Your current direction is still unknown.';
  const strengths = snapshotRun.understanding_items.filter((item) => ['strength', 'domain'].includes(item.category)).map((item) => item.label);
  return [`Based on what I know today, ${direction}`, strengths.length ? `The snapshot also includes: ${strengths.join(', ')}.` : 'The snapshot does not yet include confirmed strengths.', `Still unknown: ${snapshotRun.unknowns.join(', ')}.`].join(' ');
}
function readable({ snapshotRun, reflectionRun = null }) {
  const lines = ['Shared Understanding', '', summary(snapshotRun), '', PROMPT, '', 'Choose one: Looks right | Not quite | Something important is missing'];
  if (reflectionRun) lines.push('', `Response: ${reflectionRun.action}`, `Note: ${reflectionRun.note || 'None'}`, `Reflected at: ${reflectionRun.reflected_at}`);
  else lines.push('', 'Response: Not recorded');
  return lines.join('\n');
}

module.exports = { POLICY_VERSION, PROMPT, ACTIONS, MAX_NOTE_LENGTH, normalizeNote, submissionKey, summary, readable };
