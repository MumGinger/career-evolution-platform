const test = require('node:test'); const assert = require('node:assert/strict');
const beta = require('../src/llm-resume-understanding');
const text = `Aira Candidate\nSkills\nPython, SQL\nExperience\nAcme — Analyst\n- Built reporting workflows using Python and SQL.\nProjects\nForecast Dashboard\n- Created a dashboard for stakeholders.`;

test('LLM-first understanding preserves grouped hierarchy and excludes only an invalid block', () => {
  const understood = beta.mockUnderstand({ text }); const responsibility = understood.blocks.find((item) => item.type === 'responsibility'); const experience = understood.blocks.find((item) => item.type === 'experience'); assert.equal(responsibility.parent_id, experience.id);
  understood.blocks.push({ ...understood.blocks[0], id: 'bad', exact_source_text: 'invented source' }); const result = beta.validateUnderstanding({ understanding: understood, text }); assert.ok(result.valid_blocks.length >= 5); assert.equal(result.findings.length, 1); assert.equal(beta.grouped(result.valid_blocks).cards.some((item) => item.type === 'project'), true);
});

test('OpenAI-compatible understanding requests the strict supported-block schema', async () => {
  const originalFetch = global.fetch; let request;
  global.fetch = async (_url, options) => { request = JSON.parse(options.body); return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(beta.mockUnderstand({ text })) } }] }) }; };
  try {
    const provider = new beta.OpenAiCompatibleResumeUnderstandingProvider({ apiKey: 'synthetic-key', model: 'synthetic-model' }); const result = await provider.understand({ text });
    assert.deepEqual(result.understanding, beta.mockUnderstand({ text })); assert.equal(request.response_format.type, 'json_schema'); assert.equal(request.response_format.json_schema.strict, true); assert.deepEqual(request.response_format.json_schema.schema, beta.RESUME_UNDERSTANDING_JSON_SCHEMA); assert.equal(request.response_format.json_schema.schema.properties.blocks.items.properties.type.enum.includes('project'), true);
  } finally { global.fetch = originalFetch; }
});

test('OpenAI-compatible bounded connection check uses safe completion limits and maps failures', async () => {
  const originalFetch = global.fetch; let url; let options;
  try {
    global.fetch = async (value, request) => { url = value; options = request; return { ok: true, json: async () => ({ choices: [{ message: { content: 'READY' } }] }) }; };
    const provider = new beta.OpenAiCompatibleResumeUnderstandingProvider({ apiKey: 'synthetic-key', model: 'synthetic-model', baseUrl: 'https://provider.test/v1' }); await provider.checkConnection(); const body = JSON.parse(options.body);
    assert.equal(url, 'https://provider.test/v1/chat/completions'); assert.ok(options.headers.Authorization); assert.equal(body.max_completion_tokens, 16); assert.equal('max_tokens' in body, false); assert.equal(body.messages[0].content, 'Reply exactly READY.'); assert.doesNotMatch(JSON.stringify(body), /Aira Candidate|Forecast Dashboard/);
    for (const response of [async () => ({ ok: false, json: async () => ({}) }), async () => { throw new Error('network'); }, async () => ({ ok: true, json: async () => { throw new Error('bad json'); } }), async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) })]) { global.fetch = response; await assert.rejects(() => provider.checkConnection({ timeoutMs: 5 }), (error) => error.category === 'provider_api_failure'); }
  } finally { global.fetch = originalFetch; }
});

test('deterministic alignment copies unique canonical PDF-style text and rejects ambiguous matches', () => {
  const canonical = 'Experience\n• Built  data-driven dashboards\n  for stakeholders — using Python.\n\n• Built data-driven dashboards for stakeholders — using Python.';
  const unique = { blocks: [{ id: 'work-1', type: 'responsibility', title: 'Built dashboards', label: 'Built dashboards', exact_source_text: '- Built data-driven dashboards for stakeholders - using Python.', source_location: null, parent_id: null, normalized_meaning: 'Built dashboards', confidence: 'medium', state: 'confirmed', provenance: { source: 'resume_input', exact_source_text: '- Built data-driven dashboards for stakeholders - using Python.' }, limitations: [] }] };
  const aligned = beta.alignUnderstanding({ understanding: unique, text: canonical }); assert.equal(aligned.findings.length, 1); assert.equal(aligned.findings[0].category, 'source_alignment_ambiguous');
  const one = beta.alignUnderstanding({ understanding: unique, text: canonical.replace('\n\n• Built data-driven dashboards for stakeholders — using Python.', '') }); assert.equal(one.findings.length, 0); assert.equal(one.understanding.blocks[0].exact_source_text, '• Built  data-driven dashboards\n  for stakeholders — using Python.'); assert.deepEqual(one.understanding.blocks[0].source_location, { start: 11, end: canonical.indexOf('\n\n') }); assert.equal(one.understanding.blocks[0].provenance.source_alignment.method, 'normalized_unique_match');
});

test('aligned parent and child retain canonical spans together while unsupported alignment leaves no valid evidence', () => {
  const canonical = 'Data Analyst\n• Built SQL dashboards\n'; const blocks = [
    { id: 'experience-1', type: 'experience', title: 'Data Analyst', label: 'Data Analyst', exact_source_text: 'Data Analyst', source_location: null, parent_id: null, normalized_meaning: 'Data Analyst', confidence: 'medium', state: 'confirmed', provenance: { source: 'resume_input', exact_source_text: 'Data Analyst' }, limitations: [] },
    { id: 'responsibility-2', type: 'responsibility', title: 'Built SQL dashboards', label: 'Built SQL dashboards', exact_source_text: '- Built SQL dashboards', source_location: null, parent_id: 'experience-1', normalized_meaning: 'Built SQL dashboards', confidence: 'medium', state: 'confirmed', provenance: { source: 'resume_input', exact_source_text: '- Built SQL dashboards' }, limitations: [] },
  ]; const aligned = beta.alignUnderstanding({ understanding: { blocks }, text: canonical }); const validated = beta.validateUnderstanding({ understanding: aligned.understanding, text: canonical, alignmentFindings: aligned.findings });
  assert.equal(validated.valid_blocks.length, 2); assert.deepEqual(validated.valid_blocks[1].source_location, { start: canonical.indexOf('•'), end: canonical.indexOf('\n', canonical.indexOf('•')) }); assert.equal(validated.valid_blocks[1].parent_id, 'experience-1');
  const unsupported = beta.alignUnderstanding({ understanding: { blocks: [{ ...blocks[0], id: 'unsupported', exact_source_text: 'Invented achievement' }] }, text: canonical }); const excluded = beta.validateUnderstanding({ understanding: unsupported.understanding, text: canonical, alignmentFindings: unsupported.findings }); assert.equal(excluded.valid_blocks.length, 0); assert.deepEqual(excluded.findings.map((finding) => finding.category), ['source_alignment_not_found']);
});

test('only accepted grouped evidence reaches drafting and responsibility evidence creates prose', () => {
  const blocks = beta.validateUnderstanding({ understanding: beta.mockUnderstand({ text }), text }).valid_blocks; const approved = beta.approvedBlocks(blocks, blocks.map((item) => ({ id: item.id, action: item.type === 'skill' ? 'remove' : 'accept' }))); const result = beta.draft({ approved, jobText: 'Python required.' }); const summary = result.sections.find((item) => item.section === 'Professional Summary').statements[0]; assert.match(summary.text, /Candidate with experience/); assert.ok(summary.supporting_evidence_block_ids.every((item) => approved.some((block) => block.id === item))); assert.ok(result.sections.find((item) => item.section === 'Experience').statements.some((item) => /Built reporting/.test(item.text)));
});

test('unsupported draft claims are blocked', () => {
  const approved = beta.validateUnderstanding({ understanding: beta.mockUnderstand({ text }), text }).valid_blocks; const value = beta.draft({ approved, jobText: '' }); value.sections[0].statements[0].text = 'Improved reporting by 40%.'; assert.equal(beta.validateDraft({ draft: value, approved }).status, 'failed');
});

test('an evidence edit cannot introduce a claim absent from exact source text', () => {
  const blocks = beta.validateUnderstanding({ understanding: beta.mockUnderstand({ text }), text }).valid_blocks;
  assert.throws(() => beta.approvedBlocks(blocks, [{ id: blocks[0].id, action: 'edit', value: 'Led enterprise AI transformation' }]), /source-bound/);
});
