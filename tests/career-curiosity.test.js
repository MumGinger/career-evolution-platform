const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Store } = require('../src/store');
const curiosity = require('../src/career-curiosity');

function snapshot() { return { id: 'snapshot-synthetic', current_direction: { state: 'exploring', label: 'Data Analytics' }, understanding_items: [
  { label: 'Data Analytics', category: 'direction', confidence: 'medium', rationale: 'You selected Data Analytics in the career conversation.', supporting_source_references: [{ type: 'career_conversation_observation', id: 'direction-1' }] },
  { label: 'SQL', category: 'strength', confidence: 'high', rationale: 'Your committed Candidate Knowledge includes SQL.', supporting_source_references: [{ type: 'candidate_knowledge_fact', id: 'skill-1' }] }
] }; }
function withStore(run) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-curiosity-')); const store = new Store(path.join(dir, 'test.db')); try { run(store, dir); } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); } }

test('generates exactly one adjacent possibility with snapshot provenance', () => {
  const result = curiosity.generate(snapshot());
  assert.equal(result.status, 'available'); assert.equal(result.possibility.id, 'business-intelligence-analyst');
  assert.match(result.possibility.introduction, /Based on what we've explored together/);
  assert.match(result.possibility.introduction, /one path you may not have considered/);
  assert.match(result.possibility.explanation, /SQL/);
  assert.deepEqual(result.possibility.supporting_snapshot.items.map((item) => item.label), ['Data Analytics', 'SQL']);
  assert.doesNotMatch(JSON.stringify(result), /best match|you should|rank/i);
});
test('suppresses a possibility when confidence is insufficient', () => {
  const result = curiosity.generate({ ...snapshot(), current_direction: { state: 'unknown', label: null } });
  assert.equal(result.status, 'insufficient_confidence'); assert.match(result.message, /not enough supported understanding/);
});
for (const response of curiosity.RESPONSES) test(`${response} persists only an immutable observation`, () => withStore((store) => {
  const possibility = curiosity.generate(snapshot()).possibility; const beforeFacts = store.getCommittedCandidateKnowledge(store.createProfile({ name: 'Synthetic' }).id);
  const observation = store.recordCareerCuriosityObservation({ possibility, userResponse: response });
  assert.deepEqual(Object.keys(observation).sort(), ['id', 'possibility_id', 'supporting_snapshot', 'timestamp', 'user_response']);
  assert.equal(observation.user_response, response); assert.equal(observation.possibility_id, possibility.id); assert.deepEqual(observation.supporting_snapshot, possibility.supporting_snapshot);
  assert.throws(() => store.db.prepare("UPDATE career_curiosity_observations SET user_response = 'interesting' WHERE id = ?").run(observation.id));
  assert.deepEqual(store.getCommittedCandidateKnowledge(store.db.prepare('SELECT id FROM candidate_profiles LIMIT 1').get().id), beforeFacts);
}));
test('CLI JSON and text are readable and retain the generated possibility', () => withStore((store, dir) => {
  const candidate = store.createProfile({ name: 'Synthetic' }); const now = store.now(); const id = store.id(); const source = { candidate_knowledge: [], resume_ast_evidence: [], career_conversations: [], applications: [] }; const items = snapshot().understanding_items;
  store.db.prepare('INSERT INTO career_understanding_snapshot_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, candidate.id, JSON.stringify(source), now, 'synthetic/1', JSON.stringify(snapshot().current_direction), JSON.stringify(items), '[]', '[]');
  const root = path.resolve(__dirname, '..'); const text = execFileSync(process.execPath, ['src/cli.js', 'career-curiosity-show', '--db', path.join(dir, 'test.db'), '--snapshot-run-id', id, '--response', 'interesting', '--format', 'text'], { cwd: root, encoding: 'utf8' });
  const json = JSON.parse(execFileSync(process.execPath, ['src/cli.js', 'career-curiosity-show', '--db', path.join(dir, 'test.db'), '--snapshot-run-id', id], { cwd: root, encoding: 'utf8' }));
  assert.match(text, /Career Curiosity/); assert.match(text, /Business Intelligence Analyst/); assert.match(text, /Response: interesting/); assert.equal(json.career_curiosity.possibility.id, 'business-intelligence-analyst');
}));
