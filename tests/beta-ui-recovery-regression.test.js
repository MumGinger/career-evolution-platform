const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createBetaUiServer, BETA_PAGE } = require('../src/beta-ui');

function response(value, ok = true) {
  return { ok, json: async () => value };
}

async function json(url, options = {}) {
  const result = await fetch(url, options);
  return { response: result, value: await result.json() };
}

async function withServer(run) {
  const app = createBetaUiServer({ port: 0 });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  try { await run({ app, base }); } finally { await app.close(); }
}

function safeDiagnostics(category = 'client_error') {
  return {
    category,
    provider: 'openai-compatible',
    model: 'safe-model',
    counts: { extracted: 2, valid: 2, excluded: 0, reviewable: 1 },
    validation_reason_categories: [],
  };
}

function createClientHarness() {
  const ids = ['f', 'j', 'p', 'm', 'k', 'b', 'check', 'go', 'error', 'readiness', 'progress', 'diagnostics', 'counts', 'exclusions', 'cards', 'state', 'input', 'understanding', 'evidence', 'make', 'r', 'validation', 'draft', 'reviews', 'career', 'approve', 'result', 'links', 'output'];
  const elements = new Map(ids.map((id) => [id, {
    id,
    value: id === 'p' ? 'openai-compatible' : id === 'm' ? 'safe-model' : id === 'k' ? 'memory-only-key' : id === 'j' ? 'Required Qualifications: SQL' : '',
    files: id === 'f' ? [{ name: 'resume.txt' }] : [],
    hidden: false,
    disabled: id === 'go',
    textContent: '',
    innerHTML: '',
  }]));
  const requests = [];
  const queue = [];
  const preflightQueue = [];
  const timers = new Map();
  let timerId = 0;

  const document = {
    getElementById: (id) => elements.get(id),
    querySelector: (selector) => ({ value: selector.startsWith('[data-c=') ? 'accept' : 'approve' }),
  };
  class FileReader {
    readAsDataURL() { this.result = 'data:text/plain;base64,YQ=='; this.onload(); }
  }
  const setTimeoutFake = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; };
  const clearTimeoutFake = (id) => { timers.delete(id); };
  const fetchFake = async (url, options) => {
    requests.push({ url, body: options?.body ? JSON.parse(options.body) : undefined });
    if (url.endsWith('/preflight')) {
      const item = preflightQueue.length ? preflightQueue.shift() : response({ state: 'ready', diagnostics: safeDiagnostics('ready') });
      if (item instanceof Error) throw item;
      return item instanceof Promise ? item : item;
    }
    const item = queue.shift();
    if (!item) throw new Error(`No queued response for ${url}`);
    return item instanceof Promise ? item : item;
  };

  const script = BETA_PAGE.match(/<script>([\s\S]*)<\/script>/)[1];
  vm.runInNewContext(script, {
    document,
    FileReader,
    fetch: fetchFake,
    String,
    JSON,
    Promise,
    Error,
    setTimeout: setTimeoutFake,
    clearTimeout: clearTimeoutFake,
  });

  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const runNextTimer = () => {
    const next = [...timers.entries()].sort((a, b) => a[1].delay - b[1].delay)[0];
    assert.ok(next, 'expected a queued progress timer');
    timers.delete(next[0]);
    next[1].fn();
  };
  return { elements, requests, queue, preflightQueue, timers, flush, runNextTimer };
}

function startedPayload() {
  const candidate = { evidence_candidate_id: 'candidate-7', requirement: 'SQL', claim: 'Used SQL' };
  return {
    sessionId: 'session-1',
    provider: { provider: 'openai-compatible', model: 'safe-model' },
    candidates: [candidate],
    validation: {
      counts: { extracted: 2, valid: 2, excluded: 0, reviewable: 1 },
      validation_reason_categories: [],
      exclusions: [],
    },
  };
}

function draftPayload() {
  return {
    resumeMarkdown: '## Skills\n\n- SQL',
    validation: 'passed',
    blocked: false,
    careerReview: [{ section: 'Skills', ai_version: { statements: [{ text: 'SQL' }] } }],
  };
}

test('Career Review and export use safe phases and retry export without duplicating the Human Review run', async () => {
  await withServer(async ({ app, base }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-export-retry-'));
    let reviewCalls = 0;
    let exportCalls = 0;
    const store = {
      createHumanReviewRun() {
        reviewCalls += 1;
        return { id: 'review-1', review_complete: true, section_reviews: [] };
      },
      exportResumeArtifact() {
        exportCalls += 1;
        if (exportCalls === 1) throw new Error('private export detail');
        return { markdown: '# Approved resume' };
      },
      getCommittedCandidateKnowledge() { return []; },
      close() {},
    };
    const session = {
      id: 'retry-session',
      mode: 'llm-first',
      stage: 'career-review',
      dir,
      store,
      artifact: { id: 'artifact-1' },
      presentation: { id: 'presentation-1' },
      draftValidation: { validation_status: 'passed' },
      provider: { provider: 'openai-compatible', model: 'safe-model' },
    };
    app.sessions.set(session.id, session);
    const endpoint = `${base}/api/llm-first/sessions/${session.id}/career-review`;
    const first = await json(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [{ section: 'Skills', action: 'approve' }] }) });
    assert.equal(first.response.status, 400);
    assert.equal(first.value.category, 'export_failure');
    assert.doesNotMatch(JSON.stringify(first.value), /private export detail|beta-export-retry/);
    assert.equal(session.stage, 'export-pending');
    assert.equal(reviewCalls, 1);
    assert.equal(exportCalls, 1);
    assert.equal(session.run.id, 'review-1');

    const second = await json(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [{ section: 'Skills', action: 'approve' }] }) });
    assert.equal(second.response.status, 200);
    assert.equal(session.stage, 'complete');
    assert.equal(reviewCalls, 1, 'export retry must reuse the existing Human Review run');
    assert.equal(exportCalls, 2);
    for (const name of ['final-resume.md', 'final-resume.json', 'career-review-report.html']) assert.equal(fs.existsSync(path.join(dir, name)), true);
  });
});

test('a failed PDF render leaves the session recoverable instead of stuck at complete', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-pdf-retry-'));
  let renderCalls = 0;
  const app = createBetaUiServer({
    port: 0,
    renderPdf: async () => {
      renderCalls += 1;
      if (renderCalls === 1) throw new Error('renderer unavailable');
      return Buffer.from('%PDF-1.4\n%%EOF\n', 'latin1');
    },
  });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const store = {
      createHumanReviewRun() { return { id: 'review-1', review_complete: true, section_reviews: [] }; },
      exportResumeArtifact() { return { markdown: '# Approved resume' }; },
      getCommittedCandidateKnowledge() { return []; },
      close() {},
    };
    const session = {
      id: 'pdf-retry-session',
      mode: 'llm-first',
      stage: 'career-review',
      dir,
      store,
      semantic: { id: 'semantic-1' },
      artifact: { id: 'artifact-1' },
      presentation: { id: 'presentation-1' },
      draftValidation: { validation_status: 'passed' },
      provider: { provider: 'openai-compatible', model: 'safe-model' },
    };
    app.sessions.set(session.id, session);
    const endpoint = `${base}/api/llm-first/sessions/${session.id}/career-review`;

    const first = await json(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [{ section: 'Skills', action: 'approve' }] }) });
    assert.equal(first.response.status, 400);
    assert.equal(first.value.category, 'export_failure');
    assert.doesNotMatch(JSON.stringify(first.value), /renderer unavailable/);
    assert.equal(session.stage, 'export-pending', 'a PDF render failure must not leave the session stuck at complete');
    assert.equal(fs.existsSync(path.join(dir, 'final-resume.pdf')), false);

    const outputAttempt = await fetch(`${base}/api/llm-first/sessions/${session.id}/outputs/final-resume.pdf`);
    assert.equal(outputAttempt.status, 409, 'export must stay blocked until a retry actually succeeds');

    const second = await json(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [{ section: 'Skills', action: 'approve' }] }) });
    assert.equal(second.response.status, 200);
    assert.equal(second.value.stage, 'complete');
    assert.equal(session.stage, 'complete');
    assert.equal(renderCalls, 2);
    assert.equal(fs.existsSync(path.join(dir, 'final-resume.pdf')), true);
  } finally {
    await app.close();
  }
});

test('Career Review persistence failure is safely categorized without changing readiness state', async () => {
  await withServer(async ({ app, base }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beta-review-failure-'));
    const session = {
      id: 'review-failure-session',
      mode: 'llm-first',
      stage: 'career-review',
      dir,
      store: {
        createHumanReviewRun() { throw new Error('private persistence detail'); },
        getCommittedCandidateKnowledge() { return []; },
        close() {},
      },
      artifact: { id: 'artifact-1' },
      presentation: { id: 'presentation-1' },
      draftValidation: { validation_status: 'passed' },
      provider: { provider: 'openai-compatible', model: 'safe-model' },
    };
    app.sessions.set(session.id, session);
    const result = await json(`${base}/api/llm-first/sessions/${session.id}/career-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions: [] }) });
    assert.equal(result.response.status, 400);
    assert.equal(result.value.category, 'career_review_failure');
    assert.doesNotMatch(JSON.stringify(result.value), /private persistence detail|beta-review-failure/);
    assert.equal(session.stage, 'career-review');
    assert.equal(session.run, undefined);
  });
});

test('shipped client preserves later-stage state and maps safe failure categories to customer messages', async () => {
  const h = createClientHarness();
  await h.flush();
  assert.equal(h.elements.get('readiness').textContent, 'Ready to create your tailored resume.');
  assert.equal(h.elements.get('go').disabled, false);

  h.queue.push(response(startedPayload()));
  await h.elements.get('go').onclick();
  assert.equal(h.elements.get('evidence').hidden, false);
  const cardsBeforeDraft = h.elements.get('cards').innerHTML;

  h.queue.push(response({ error: 'internal draft detail', category: 'draft_failure', diagnostics: safeDiagnostics('draft_failure') }, false));
  await h.elements.get('make').onclick();
  assert.equal(h.elements.get('error').textContent, 'We couldn’t prepare your resume draft. Try again.');
  assert.equal(h.elements.get('readiness').textContent, 'Ready to create your tailored resume.');
  assert.equal(h.elements.get('cards').innerHTML, cardsBeforeDraft);
  assert.doesNotMatch(h.elements.get('error').textContent, /draft_failure|internal draft detail/);

  h.queue.push(response(draftPayload()));
  await h.elements.get('make').onclick();
  const draftBeforeReview = h.elements.get('r').textContent;
  assert.equal(h.elements.get('career').hidden, false);

  h.queue.push(response({ error: 'private review exception', category: 'career_review_failure', diagnostics: safeDiagnostics('career_review_failure') }, false));
  await h.elements.get('approve').onclick();
  assert.equal(h.elements.get('error').textContent, 'We couldn’t save your resume review. Your selections are still here. Try again.');
  assert.equal(h.elements.get('readiness').textContent, 'Ready to create your tailored resume.');
  assert.equal(h.elements.get('career').hidden, false);
  assert.equal(h.elements.get('r').textContent, draftBeforeReview);
  assert.doesNotMatch(h.elements.get('error').textContent, /career_review_failure|private review exception/);

  h.queue.push(response({ error: 'private output path', category: 'export_failure', diagnostics: safeDiagnostics('export_failure') }, false));
  await h.elements.get('approve').onclick();
  assert.equal(h.elements.get('error').textContent, 'We couldn’t create your resume files. Your approved resume is still here. Try again.');
  assert.equal(h.elements.get('readiness').textContent, 'Ready to create your tailored resume.');
  assert.equal(h.elements.get('career').hidden, false);
  assert.equal(h.elements.get('r').textContent, draftBeforeReview);
  assert.doesNotMatch(h.elements.get('error').textContent, /export_failure|private output path/);

  h.queue.push(response({ resumeMarkdown: '# Approved resume', outputs: ['final-resume.md', 'final-resume.json', 'career-review-report.html'] }));
  await h.elements.get('approve').onclick();
  assert.equal(h.elements.get('output').hidden, false);
  assert.match(h.elements.get('links').innerHTML, /final-resume\.json/);
});

test('shipped client shows ordered cancellable progress and provider recovery without stale timers', async () => {
  const h = createClientHarness();
  await h.flush();

  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  h.queue.push(pending);
  const firstStart = h.elements.get('go').onclick();
  assert.equal(h.elements.get('progress').textContent, 'Reading your resume…');
  assert.equal(h.timers.size, 2);
  h.runNextTimer();
  assert.equal(h.elements.get('progress').textContent, 'Finding relevant experience…');
  assert.doesNotMatch(h.elements.get('progress').textContent, /Reading.*Finding|Finding.*Preparing/);
  h.runNextTimer();
  assert.equal(h.elements.get('progress').textContent, 'Preparing items for your review…');
  release(response(startedPayload()));
  await firstStart;
  assert.equal(h.elements.get('progress').textContent, '');
  assert.equal(h.timers.size, 0);

  h.elements.get('input').hidden = false;
  h.elements.get('go').disabled = false;
  h.queue.push(response({ error: 'provider detail', category: 'provider_api_failure', diagnostics: safeDiagnostics('provider_api_failure') }, false));
  await h.elements.get('go').onclick();
  assert.equal(h.elements.get('progress').textContent, '');
  assert.equal(h.timers.size, 0);
  assert.equal(h.elements.get('readiness').textContent, 'The resume service is temporarily unavailable. Retry.');
  assert.equal(h.elements.get('go').disabled, true);
  assert.doesNotMatch(h.elements.get('error').textContent, /provider_api_failure|provider detail/);

  h.preflightQueue.push(response({ state: 'ready', diagnostics: safeDiagnostics('ready') }));
  await h.elements.get('check').onclick();
  assert.equal(h.elements.get('readiness').textContent, 'Ready to create your tailored resume.');
  assert.equal(h.elements.get('go').disabled, false);

  h.preflightQueue.push(new Error('transport detail'));
  await h.elements.get('check').onclick();
  assert.doesNotMatch(h.elements.get('error').textContent, /Career Review|resume files|transport detail/);
});
