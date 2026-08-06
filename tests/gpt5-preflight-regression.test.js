const test = require('node:test');
const assert = require('node:assert/strict');
const {
  OpenAiCompatibleResumeUnderstandingProvider,
} = require('../src/llm-resume-understanding');

test('GPT-5 preflight retries a valid empty bounded response without the brittle low token cap', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  const urls = [];
  const authorizations = [];
  try {
    global.fetch = async (url, options) => {
      urls.push(url);
      authorizations.push(options.headers.Authorization);
      requests.push(JSON.parse(options.body));
      return requests.length === 1
        ? { ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) }
        : { ok: true, json: async () => ({ choices: [{ message: { content: 'READY' } }] }) };
    };

    const provider = new OpenAiCompatibleResumeUnderstandingProvider({
      apiKey: 'synthetic-key',
      model: 'gpt-5-mini',
      baseUrl: 'https://provider.test/v1',
    });

    await provider.checkConnection();

    assert.equal(requests.length, 2);
    assert.deepEqual(urls, [
      'https://provider.test/v1/chat/completions',
      'https://provider.test/v1/chat/completions',
    ]);
    assert.deepEqual(authorizations, ['Bearer synthetic-key', 'Bearer synthetic-key']);
    assert.equal(requests[0].max_completion_tokens, 16);
    assert.equal('max_completion_tokens' in requests[1], false);
    assert.deepEqual(requests[0].messages, [{ role: 'user', content: 'Reply exactly READY.' }]);
    assert.deepEqual(requests[1].messages, requests[0].messages);
    assert.doesNotMatch(JSON.stringify(requests), /resume|Zurich|job description|synthetic-key/i);
  } finally {
    global.fetch = originalFetch;
  }
});
