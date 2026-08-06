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
