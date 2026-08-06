const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createBetaUiServer, BETA_PAGE } = require('../src/beta-ui');
const { Store } = require('../src/store');
const llmUnderstanding = require('../src/llm-resume-understanding');

async function withServer(run, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-ui-test-')); const app = createBetaUiServer({ port: 0, tempRoot: root, ...options }); const address = await app.listen(); const base = `http://${address.address}:${address.port}`;
  try { await run({ app, base }); } finally { await app.close(); fs.rmSync(root, { recursive: true, force: true }); }
}
async function withProvider(provider, run, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-ui-provider-test-')); const app = createBetaUiServer({ port: 0, tempRoot: root, resumeUnderstandingProviderFromConfig: () => provider, ...options }); const address = await app.listen(); const base = `http://${address.address}:${address.port}`;
  try { await run({ app, base, root }); } finally { await app.close(); fs.rmSync(root, { recursive: true, force: true }); }
}
async function json(url, options = {}) { const response = await fetch(url, options); return { response, value: await response.json() }; }
function input() { return { resume: { name: 'synthetic-resume.txt', data: Buffer.from(fs.readFileSync(path.join(__dirname, '../examples/synthetic-resume.txt'))).toString('base64') }, jobText: fs.readFileSync(path.join(__dirname, '../examples/synthetic-job.txt'), 'utf8'), provider: 'mock', apiKey: 'not-a-real-key' }; }
function realResumeFailureShapeInput() { const resume = `private candidate Tang\nSkills\nPower BI, Python, SQL\nProjects\nCustomer Analytics Dashboard\n- Built Power BI data visualization dashboards and automation workflows using Python and SQL.\nExperience\nData Analyst\n- Delivered business insights and data analysis reporting for stakeholders.`; const jobText = `Company: Zurich\nRole Title: Data Analytics and AI Analyst\n\nRequired Qualifications:\nPower BI required.\nPython required.\nSQL required.\nData visualization required.\nAutomation required.\nBusiness insights required.\nData analysis required.`; return { resume: { name: 'ya-ching-tang-resume.txt', data: Buffer.from(resume).toString('base64') }, jobText, provider: 'mock' }; }
function startupClassificationCases() {
  const supplied = realResumeFailureShapeInput();
  const text = Buffer.from(supplied.resume.data, 'base64').toString('utf8');
  return [
    ['invalid_structured_response', { name: 'openai-compatible', model: 'schema-model', async understand() { return { provider: this.name, model: this.model, parseError: 'raw private provider response' }; } }, supplied],
    ['invalid_structured_response', { name: 'openai-compatible', model: 'schema-model', async understand() { return { provider: this.name, model: this.model, understanding: {} }; } }, supplied],
    ['invalid_structured_response', { name: 'openai-compatible', model: 'schema-model', async understand() { return { provider: this.name, model: this.model, understanding: { blocks: null } }; } }, supplied],
    ['zero_extracted_blocks', { name: 'openai-compatible', model: 'schema-model', async understand() { return { provider: this.name, model: this.model, understanding: { blocks: [] } }; } }, supplied],
    ['all_blocks_excluded', { name: 'openai-compatible', model: 'schema-model', async understand() { const source = llmUnderstanding.mockUnderstand({ text }).blocks[0]; return { provider: this.name, model: this.model, understanding: { blocks: [{ ...source, id: 'excluded-only', exact_source_text: 'invented private text', source_location: null, provenance: { source: 'resume_input', exact_source_text: 'invented private text' } }] } }; } }, supplied],
    ['zero_reviewable_candidates', { name: 'openai-compatible', model: 'schema-model', async understand() { return { provider: this.name, model: this.model, understanding: llmUnderstanding.mockUnderstand({ text }) }; } }, { ...supplied, jobText: 'Company: Example\nRole Title: Analyst\n\nRequired Qualifications:\nExcel required.' }],
    ['provider_api_failure', { name: 'openai-compatible', model: 'schema-model', async understand() { const error = new Error('provider secret'); error.category = 'provider_api_failure'; throw error; } }, supplied],
  ];
}


test('local Beta UI runs the existing review, integration, Career Review, and export flow without persisting an API key', async () => withServer(async ({ app, base }) => {
  const page = await fetch(`${base}/`); assert.equal(page.status, 200); assert.match(await page.text(), /Career Evolution/);
  const started = await json(`${base}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input()) }); assert.equal(started.response.status, 201); assert.equal(started.value.provider, 'mock'); assert.ok(started.value.candidates.length > 0);
  const session = app.sessions.get(started.value.sessionId); const secret = 'not-a-real-key'; const saved = fs.readdirSync(session.dir).map((name) => fs.readFileSync(path.join(session.dir, name)).toString('utf8')); assert.ok(saved.every((value) => !value.includes(secret)));
  const blocked = await fetch(`${base}/api/sessions/${started.value.sessionId}/outputs/final-resume.md`); assert.equal(blocked.status, 409);
  const reviewed = await json(`${base}/api/sessions/${started.value.sessionId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((candidate) => ({ key: candidate.key, action: 'accepted' })) }) }); assert.equal(reviewed.response.status, 200); assert.ok(reviewed.value.committedFacts > 0); assert.match(reviewed.value.resumeMarkdown, /SQL/); assert.ok(reviewed.value.careerReview.length > 0); assert.ok(reviewed.value.careerReview.every((section) => section.ai_version.statements.length > 0));
  const complete = await json(`${base}/api/sessions/${started.value.sessionId}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: reviewed.value.careerReview.map((section) => ({ section: section.section, action: 'approve' })) }) }); assert.equal(complete.response.status, 200); assert.equal(complete.value.exportAllowed, true); assert.ok(complete.value.outputs.includes('career-review-report.html'));
  const output = await fetch(`${base}/api/sessions/${started.value.sessionId}/outputs/final-resume.md`); assert.equal(output.status, 200); assert.match(await output.text(), /## Skills/);
}));

test('Career Review remains mandatory for local export', async () => withServer(async ({ base }) => {
  const started = await json(`${base}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input()) }); const reviewed = await json(`${base}/api/sessions/${started.value.sessionId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((candidate) => ({ key: candidate.key, action: 'accepted' })) }) });
  const incomplete = await json(`${base}/api/sessions/${started.value.sessionId}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [{ section: reviewed.value.careerReview[0].section, action: 'approve' }] }) }); assert.equal(incomplete.response.status, 400); assert.match(incomplete.value.error, /explicit decisions/);
  const blocked = await fetch(`${base}/api/sessions/${started.value.sessionId}/outputs/final-resume.json`); assert.equal(blocked.status, 409);
}));

test('reviewed project and experience bullets survive 003.6 and populate all core draft sections', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(realResumeFailureShapeInput()) });
  assert.equal(started.response.status, 201); assert.ok(started.value.candidates.some((item) => item.section === 'projects'), JSON.stringify(started.value.candidates)); assert.ok(started.value.candidates.some((item) => item.section === 'experiences'), JSON.stringify(started.value.candidates));
  const reviewed = await json(`${base}/api/sessions/${started.value.sessionId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((candidate) => ({ key: candidate.key, action: 'accepted' })) }) });
  assert.equal(reviewed.response.status, 200); assert.notEqual(reviewed.value.validation, 'failed', JSON.stringify(app.sessions.get(started.value.sessionId).validation.validation_findings));
  const session = app.sessions.get(started.value.sessionId); const artifact = session.artifact.resume_artifacts[0]; assert.equal(artifact.metadata.draft_provider.provider, 'mock');
  for (const heading of ['Skills', 'Experience', 'Projects']) assert.match(reviewed.value.resumeMarkdown, new RegExp(`## ${heading}\\n\\n- `), JSON.stringify(session.integration.integration_decisions));
  assert.match(reviewed.value.resumeMarkdown, /Customer Analytics Dashboard: Built Power BI data visualization dashboards and automation workflows using Python and SQL\./);
  assert.match(reviewed.value.resumeMarkdown, /Delivered business insights and data analysis reporting for stakeholders\./);
}));

test('failed startup cleans its temporary store and directory before registering a session', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-ui-startup-failure-')); const app = createBetaUiServer({ port: 0, tempRoot: root }); const address = await app.listen();
  try {
    const failed = await json(`http://${address.address}:${address.port}/api/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input(), jobText: '' }) });
    assert.equal(failed.response.status, 400); assert.match(failed.value.error, /Paste a job description/); assert.deepEqual(fs.readdirSync(root), []); assert.equal(app.sessions.size, 0);
  } finally { await app.close(); fs.rmSync(root, { recursive: true, force: true }); }
});

test('LLM-first beta uses the existing durable review, Candidate Knowledge, draft, and export gates', async () => withServer(async ({ app, base }) => {
  const started = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(realResumeFailureShapeInput()) }); assert.equal(started.response.status, 201); const session = app.sessions.get(started.value.sessionId); assert.ok(session.semantic.id); assert.ok(session.discoveryId);
  const confirmed = await json(`${base}/api/llm-first/sessions/${session.id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((item) => ({ evidence_candidate_id: item.evidence_candidate_id, action: 'accept' })) }) }); assert.equal(confirmed.response.status, 200); assert.ok(session.reviewRun.id); assert.ok(session.integration?.id); assert.ok(session.artifact.id); assert.equal(confirmed.value.validation !== 'failed', true); const facts = session.store.getCommittedCandidateKnowledge(session.profileId); assert.ok(facts.some((fact) => fact.entity_type === 'project')); assert.ok(facts.some((fact) => fact.entity_type === 'responsibility')); const sections = new Map(session.artifact.resume_artifacts[0].content.sections.map((section) => [section.section, section.statements.length])); assert.ok(sections.get('Experience') > 0); assert.ok(sections.get('Projects') > 0);
  const exported = await json(`${base}/api/llm-first/sessions/${session.id}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: confirmed.value.careerReview.map((section) => ({ section: section.section, action: 'approve' })) }) }); assert.equal(exported.response.status, 200); assert.equal(exported.value.exportAllowed, true); assert.deepEqual(new Set(exported.value.outputs), new Set(['final-resume.md', 'final-resume.json', 'career-review-report.html'])); for (const file of exported.value.outputs) assert.equal((await fetch(`${base}/api/llm-first/sessions/${session.id}/outputs/${file}`)).status, 200);
}));

test('provider-shaped experience and project hierarchy reaches Evidence Review with safe provider metadata', async () => {
  const supplied = realResumeFailureShapeInput(); const text = Buffer.from(supplied.resume.data, 'base64').toString('utf8'); const provider = { name: 'openai-compatible', model: 'synthetic-schema-model', async understand() { return { provider: this.name, model: this.model, understanding: llmUnderstanding.mockUnderstand({ text }) }; } };
  await withProvider(provider, async ({ app, base }) => {
    const started = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...supplied, provider: 'openai-compatible', apiKey: 'synthetic-secret' }) });
    assert.equal(started.response.status, 201); assert.deepEqual(started.value.provider, { provider: 'openai-compatible', model: 'synthetic-schema-model' }); assert.ok(started.value.candidates.some((item) => item.section === 'project')); assert.ok(started.value.candidates.some((item) => item.section === 'experience'));
    const persisted = fs.readdirSync(app.sessions.get(started.value.sessionId).dir).map((file) => fs.readFileSync(path.join(app.sessions.get(started.value.sessionId).dir, file), 'utf8')).join('\n'); assert.doesNotMatch(persisted, /synthetic-secret|private candidate Tang\nSkills\nPower BI, Python, SQL\nProjects\nCustomer Analytics Dashboard\n- Built Power BI data visualization dashboards and automation workflows using Python and SQL\.\nExperience\nData Analyst\n- Delivered business insights and data analysis reporting for stakeholders\.|Company: Zurich\nRole Title: Data Analytics and AI Analyst\n\nRequired Qualifications:\nPower BI required\.\nPython required\.\nSQL required\.\nData visualization required\.\nAutomation required\.\nBusiness insights required\.\nData analysis required\./);
  });
});

test('excludes a child whose invalid parent would otherwise bind undefined as resume_relation_candidates parameter 3', async () => {
  const supplied = realResumeFailureShapeInput(); const text = Buffer.from(supplied.resume.data, 'base64').toString('utf8'); const shaped = llmUnderstanding.mockUnderstand({ text }); const parent = shaped.blocks.find((item) => item.type === 'project'); parent.exact_source_text = 'not in synthetic source'; const child = shaped.blocks.find((item) => item.parent_id === parent.id);
  const provider = { name: 'openai-compatible', model: 'synthetic-schema-model', async understand() { return { provider: this.name, model: this.model, understanding: shaped }; } };
  await withProvider(provider, async ({ app, base }) => {
    const started = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...supplied, provider: 'openai-compatible', apiKey: 'synthetic-secret' }) });
    assert.equal(started.response.status, 201); assert.ok(started.value.validation.validation_reason_categories.includes('source_alignment_not_found')); assert.ok(started.value.validation.validation_reason_categories.includes('parent_not_retained')); assert.ok(started.value.candidates.length > 0); assert.equal(app.sessions.size, 1); assert.ok(child);
  });
});

test('unexpected LLM-first persistence failures are private-safe and leave no session or temporary database', async () => {
  const supplied = realResumeFailureShapeInput(); const text = Buffer.from(supplied.resume.data, 'base64').toString('utf8'); const provider = { name: 'openai-compatible', model: 'synthetic-schema-model', async understand() { return { provider: this.name, model: this.model, understanding: llmUnderstanding.mockUnderstand({ text }) }; } };
  const storeFromPath = (databasePath) => { const store = new Store(databasePath); store.createResumeSemanticRun = () => { throw new Error('synthetic persistence internals'); }; return store; };
  await withProvider(provider, async ({ app, base, root }) => {
    const failed = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...supplied, provider: 'openai-compatible', apiKey: 'synthetic-secret' }) });
    assert.equal(failed.response.status, 400); assert.equal(failed.value.category, 'session_persistence_failure'); assert.deepEqual(failed.value.diagnostics.provider, 'openai-compatible'); assert.deepEqual(failed.value.diagnostics.model, 'synthetic-schema-model'); assert.ok(failed.value.diagnostics.validation_reason_categories.includes('session_persistence_failure')); assert.doesNotMatch(JSON.stringify(failed.value), /synthetic-secret|synthetic persistence internals|private candidate Tang|Zurich/); assert.equal(app.sessions.size, 0); assert.deepEqual(fs.readdirSync(root), []);
  }, { storeFromPath });
});

for (const [category, provider, request] of startupClassificationCases()) {
  test(`LLM-first startup classifies ${category} without private diagnostics`, async () => withProvider(provider, async ({ app, base, root }) => {
    const failed = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request, provider: 'openai-compatible', apiKey: 'synthetic-secret' }) });
    assert.equal(failed.response.status, 400); assert.equal(failed.value.category, category); assert.deepEqual(failed.value.diagnostics.provider, 'openai-compatible'); assert.deepEqual(failed.value.diagnostics.model, 'schema-model'); assert.doesNotMatch(JSON.stringify(failed.value), /synthetic-secret|private candidate Tang|Company: Zurich|provider secret|raw private provider response|invented private text/); assert.equal(app.sessions.size, 0); assert.deepEqual(fs.readdirSync(root), []);
  }));
}

test('LLM-first preflight reports setup required without creating a session or retaining connection input', async () => {
  await withServer(async ({ app, base }) => {
    const result = await json(`${base}/api/llm-first/preflight`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'openai-compatible', model: 'safe-model' }) });
    assert.equal(result.response.status, 200); assert.equal(result.value.state, 'setup_required'); assert.equal(app.sessions.size, 0); assert.doesNotMatch(JSON.stringify(result.value), /safe-secret|private resume|private job/);
  }, { resumeUnderstandingProviderFromConfig() { throw new Error('missing setup'); } });
});

test('LLM-first preflight performs a bounded connection check before reporting ready', async () => {
  const readyProvider = { name: 'openai-compatible', model: 'safe-model', async checkConnection() { return true; } };
  await withProvider(readyProvider, async ({ app, base }) => { const result = await json(`${base}/api/llm-first/preflight`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'openai-compatible', model: 'safe-model', apiKey: 'synthetic-secret' }) }); assert.equal(result.value.state, 'ready'); assert.equal(app.sessions.size, 0); assert.doesNotMatch(JSON.stringify(result.value), /synthetic-secret/); });
  const unavailableProvider = { name: 'openai-compatible', model: 'safe-model', async checkConnection() { const error = new Error('rejected'); error.category = 'provider_api_failure'; throw error; } };
  await withProvider(unavailableProvider, async ({ app, base }) => { const result = await json(`${base}/api/llm-first/preflight`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'openai-compatible', model: 'safe-model', apiKey: 'synthetic-secret' }) }); assert.equal(result.value.state, 'temporarily_unavailable'); assert.equal(app.sessions.size, 0); });
});

test('LLM-first client contract rejects incomplete, duplicate, unknown, and edit decisions', async () => withServer(async ({ base }) => {
  const started = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(realResumeFailureShapeInput()) }); const endpoint = `${base}/api/llm-first/sessions/${started.value.sessionId}/confirm`; const first = started.value.candidates[0];
  for (const decisions of [[], [{ evidence_candidate_id: first.evidence_candidate_id, action: 'accept' }, { evidence_candidate_id: first.evidence_candidate_id, action: 'accept' }], started.value.candidates.map((item) => ({ evidence_candidate_id: item.evidence_candidate_id, action: 'edit' })), started.value.candidates.map((item, index) => ({ evidence_candidate_id: index ? item.evidence_candidate_id : 'unknown', action: 'accept' }))]) { const response = await json(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions }) }); assert.equal(response.response.status, 400); assert.match(response.value.error, /Accept or Skip exactly once/); }
}));

test('shipped LLM-first page exposes the complete visible state flow and memory-only provider controls', async () => withServer(async ({ base }) => {
  const page = await (await fetch(`${base}/`)).text(); for (const text of ['Provider connection (memory only)', 'Understanding and exclusions', 'Evidence Review', 'Draft and validation', 'Career Review', 'Approve and export', 'Export complete', 'busy(', 'role="alert"']) assert.match(page, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); assert.match(page, /evidence_candidate_id/); assert.match(page, /outputs\/.*View\/download/); assert.doesNotMatch(page, /provider:'mock'/);
}));

test('shipped LLM-first client executes canonical payloads, errors, blocked drafts, review, and export', async () => {
  const elements = new Map(['f', 'j', 'p', 'm', 'k', 'b', 'check', 'go', 'error', 'readiness', 'progress', 'diagnostics', 'counts', 'exclusions', 'cards', 'state', 'input', 'understanding', 'evidence', 'make', 'r', 'validation', 'draft', 'reviews', 'career', 'approve', 'result', 'links', 'output'].map((id) => [id, { id, value: id === 'p' ? 'mock' : '', files: id === 'f' ? [{ name: 'resume.txt' }] : [], hidden: false, disabled: false, textContent: '', innerHTML: '' }]));
  const requests = []; let next = [];
  const response = (value, ok = true) => ({ ok, json: async () => value });
  const document = { getElementById: (id) => elements.get(id), querySelector: (selector) => ({ value: selector.startsWith('[data-c=') ? 'accept' : 'approve' }) };
  class FileReader { readAsDataURL() { this.result = 'data:text/plain;base64,YQ=='; this.onload(); } }
  const fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); if (url.endsWith('/preflight')) return response({ state: 'ready', diagnostics: { provider: 'openai-compatible', model: 'safe-model', counts: {} } }); const item = next.shift(); return item instanceof Promise ? item : response(item.value, item.ok); };
  const script = BETA_PAGE.match(/<script>([\s\S]*)<\/script>/)[1]; vm.runInNewContext(script, { document, FileReader, fetch, String, JSON, Promise, Error, setTimeout: (fn) => { fn(); return 1; }, clearTimeout: () => {} });
  const candidate = { evidence_candidate_id: 'candidate-7', requirement: 'SQL', claim: 'Used SQL' };
  const started = { sessionId: 'session-1', provider: { provider: 'openai-compatible', model: 'safe-model' }, candidates: [candidate], validation: { counts: { extracted: 2, valid: 1, excluded: 1, reviewable: 1 }, validation_reason_categories: ['exact_source_text_not_found'], exclusions: [{ source_text: 'Unmapped headline', message: 'Exact source text must map to the resume input.' }] } };
  next = [{ ok: false, value: { error: 'Server rejected the input.', category: 'invalid_structured_response', diagnostics: { provider: 'openai-compatible', model: 'safe-model', counts: { extracted: 0, valid: 0, excluded: 0, reviewable: 0 }, validation_reason_categories: ['invalid_structured_response'] } } }, { ok: true, value: started }];
  await elements.get('go').onclick(); assert.doesNotMatch(elements.get('error').textContent, /connection/i); assert.match(elements.get('diagnostics').textContent, /invalid_structured_response.*openai-compatible.*safe-model.*Extracted: 0.*Validation reasons: invalid_structured_response/);
  await elements.get('go').onclick(); assert.match(elements.get('cards').innerHTML, /candidate-7/); assert.match(elements.get('diagnostics').textContent, /success.*openai-compatible.*safe-model.*Extracted: 2.*Reviewable: 1.*exact_source_text_not_found/); assert.match(elements.get('exclusions').innerHTML, /Unmapped headline/); assert.match(elements.get('exclusions').innerHTML, /Exact source text/);
  let release; const pending = new Promise((resolve) => { release = resolve; }); next = [pending]; const first = elements.get('make').onclick(); const duplicate = elements.get('make').onclick(); assert.equal(elements.get('make').disabled, true); await duplicate; assert.equal(requests.filter((item) => item.url.endsWith('/confirm')).length, 1);
  release(response({ resumeMarkdown: '## Skills\n\n- SQL', validation: 'passed', blocked: false, careerReview: [{ section: 'Skills', ai_version: { statements: [{ text: 'SQL' }] } }] })); await first; assert.equal(elements.get('career').hidden, false); assert.match(elements.get('diagnostics').textContent, /Category: success.*openai-compatible.*safe-model.*Extracted: 2.*Reviewable: 1/);
  next = [{ ok: true, value: { resumeMarkdown: '## Skills\n\n- SQL', outputs: ['final-resume.md', 'final-resume.json', 'career-review-report.html'] } }]; await elements.get('approve').onclick(); assert.equal(requests.at(-1).body.decisions[0].section, 'Skills'); assert.match(elements.get('links').innerHTML, /final-resume\.json/); assert.match(elements.get('diagnostics').textContent, /Category: success.*openai-compatible.*safe-model.*Extracted: 2.*Reviewable: 1/); assert.doesNotMatch(elements.get('diagnostics').textContent, /startup_failure/);
  next = [{ ok: true, value: started }, { ok: true, value: { resumeMarkdown: '', validation: 'failed', blocked: true, message: 'Validation blocked.', careerReview: null } }]; await elements.get('go').onclick(); await elements.get('make').onclick(); assert.equal(elements.get('career').hidden, true); assert.match(elements.get('validation').textContent, /Validation blocked/);
  const confirmation = requests.find((item) => item.url.endsWith('/confirm')); assert.deepEqual(confirmation.body.decisions, [{ evidence_candidate_id: 'candidate-7', action: 'accept' }]);
});

test('LLM-first export gate blocks Career Review when deterministic draft validation fails', async () => withServer(async ({ app, base }) => {
  const source = `Aira Candidate\nSkills\nPython, SQL\nExperience\nData Analyst\n- Built Python reporting workflows for stakeholders.`; const job = `Company: Acme\nRole Title: Analyst\n\nRequired Qualifications:\nPython required.\nSQL required.`;
  const started = await json(`${base}/api/llm-first/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: { name: 'resume.txt', data: Buffer.from(source).toString('base64') }, jobText: job, provider: 'mock' }) }); const session = app.sessions.get(started.value.sessionId); session.providerConfig = { provider: 'openai-compatible', model: 'unavailable', apiKey: 'memory-only', baseUrl: 'http://127.0.0.1:9' };
  const confirmed = await json(`${base}/api/llm-first/sessions/${session.id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: started.value.candidates.map((item) => ({ evidence_candidate_id: item.evidence_candidate_id, action: 'accept' })) }) }); assert.equal(confirmed.response.status, 200); assert.equal(confirmed.value.blocked, true); assert.equal(confirmed.value.careerReview, null); assert.equal(session.draftValidation.validation_status, 'failed');
  const blocked = await json(`${base}/api/llm-first/sessions/${session.id}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [] }) }); assert.equal(blocked.response.status, 400); assert.match(blocked.value.error, /blocked until deterministic draft validation passes/); assert.equal(session.exported, undefined);
}));