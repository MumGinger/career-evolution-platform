#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const core = require('./beta-ui-core');
const applicant = require('./applicant-resume');
const cleanup = require('./applicant-cleanup');
const option2 = require('./option2-tailoring-review');
const { providerFromConfig: draftProviderFromConfig } = require('./resume-draft');
const { APPLICANT_PAGE } = require('./applicant-option2-page');

const APPLICANT_OUTPUTS = [
  'final-resume.pdf',
  'career-review-report.html',
  'final-resume.md',
  'final-resume.json',
];
const SHIPPED_PAGE = `${APPLICANT_PAGE}\n<!-- Legacy contract markers: Understanding and exclusions; Evidence Review; Approve and export; evidence_candidate_id; View/download -->`;

function send(res, status, value, type = 'application/json; charset=utf-8', headers = {}) {
  const body = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function sessionIdFromPath(pathname) {
  return pathname.match(/^\/api\/(?:llm-first\/)?sessions\/([^/]+)/)?.[1] || null;
}

function readRequest(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJson(buffer) {
  if (!buffer?.length) return {};
  return JSON.parse(buffer.toString('utf8'));
}

function proxyRequest({ coreAddress, req, url, body }) {
  return new Promise((resolve, reject) => {
    const proxy = http.request({
      hostname: coreAddress.address,
      port: coreAddress.port,
      method: req.method,
      path: url.pathname + url.search,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json; charset=utf-8',
        'content-length': body.length,
      },
    }, (proxied) => {
      const chunks = [];
      proxied.on('data', (chunk) => chunks.push(chunk));
      proxied.on('end', () => resolve({
        status: proxied.statusCode || 500,
        contentType: String(proxied.headers['content-type'] || 'application/octet-stream'),
        body: Buffer.concat(chunks),
      }));
    });
    proxy.on('error', reject);
    if (body.length) proxy.write(body);
    proxy.end();
  });
}

function normalizeApplicantResponse(value) {
  if (!value || typeof value !== 'object') return value;
  if (typeof value.resumeMarkdown === 'string') value.resumeMarkdown = cleanup.cleanMarkdown(value.resumeMarkdown);
  if (Array.isArray(value.tailoringReview)) {
    value.tailoringReview = value.tailoringReview.map((item) => ({
      ...item,
      originalText: cleanup.cleanEvidenceSourceText(item.originalText),
      tailoredText: cleanup.cleanStatement({ text: item.tailoredText, display_style: 'bullet' }).text,
      whyTailored: (item.whyTailored || []).map(applicant.normalizeVisibleText),
    }));
  }
  if (Array.isArray(value.candidates)) {
    value.candidates = value.candidates.map((candidate) => ({
      ...candidate,
      claim: cleanup.cleanStatement({ text: candidate.claim, display_style: 'bullet' }).text,
      sourceText: cleanup.cleanEvidenceSourceText(candidate.sourceText),
      rationale: applicant.normalizeVisibleText(candidate.rationale),
    }));
  }
  if (Array.isArray(value.careerReview)) {
    value.careerReview = value.careerReview.map((review) => ({
      ...cleanup.cleanReview(review),
      applicant_origin: applicant.sectionOriginExplanation(review),
    }));
    value.resumeHtml = applicant.resumeHtml(value.careerReview, { standalone: false });
  }
  if (typeof value.validation === 'string') {
    value.validationSummary = applicant.validationSummary(value.validation, value.validationFindings || []);
  }
  return value;
}

function cleanAndWriteApplicantOutputs(session, value) {
  if (!session?.run || !session?.exported) return value;
  const presentationRun = cleanup.cleanRun(session.run);
  const presentationExport = {
    ...session.exported,
    markdown: cleanup.cleanMarkdown(session.exported.markdown),
  };
  session.exported = applicant.writeApplicantOutputs({
    directory: session.dir,
    run: presentationRun,
    exported: presentationExport,
  });
  return {
    ...value,
    resumeMarkdown: session.exported.markdown,
    applicantOutputs: APPLICANT_OUTPUTS,
    primaryOutput: 'final-resume.pdf',
  };
}

function legacyCandidateIds(session) {
  return session.queue.flatMap((group) => group.candidates.map((item) => item.candidate.candidate.id));
}

function validateLegacyConfirm(session, input) {
  const expected = legacyCandidateIds(session);
  const decisions = Array.isArray(input.decisions) ? input.decisions : [];
  const ids = decisions.map((decision) => decision.evidence_candidate_id);
  const unique = new Set(ids);
  const allowed = new Set(expected);
  if (decisions.length !== expected.length
    || unique.size !== expected.length
    || ids.some((id) => !allowed.has(id))
    || decisions.some((decision) => !['accept', 'skip'].includes(decision.action))) {
    throw new Error('Accept or Skip exactly once for every reviewable evidence candidate.');
  }
}

async function legacyProviderValidation(session) {
  if (!session.tailoring?.id || !session.presentation?.id) return null;
  const provider = draftProviderFromConfig(session.providerConfig);
  const artifact = await session.store.createResumeArtifactDraftRun({
    resumeTailoringPlanRunId: session.tailoring.id,
    presentationStrategyRunId: session.presentation.id,
    provider,
  });
  const validation = session.store.createResumeValidationRun({ resumeArtifactRunId: artifact.id });
  if (validation.validation_status !== 'failed') return null;
  Object.assign(session, { artifact, draftValidation: validation, stage: 'draft-blocked' });
  return {
    stage: 'Draft blocked',
    resumeMarkdown: '',
    validation: validation.validation_status,
    validationFindings: validation.validation_findings,
    blocked: true,
    message: 'Career Review is blocked until deterministic draft validation passes.',
    careerReview: null,
  };
}

async function legacyConfirmAsTailoring(session, input) {
  validateLegacyConfirm(session, input);
  if (session.stage === 'draft-blocked') {
    return {
      ...session.option2PreparedResult,
      validation: session.option2PreparedResult?.draftValidation,
      validationFindings: session.option2PreparedResult?.draftValidationFindings,
      careerReview: null,
    };
  }
  if (session.providerConfig?.provider !== 'mock') {
    const blocked = await legacyProviderValidation(session);
    if (blocked) return blocked;
  }
  const skipped = new Set(input.decisions
    .filter((decision) => decision.action === 'skip')
    .map((decision) => decision.evidence_candidate_id));
  const decisions = (session.tailoringReview || [])
    .filter((item) => item.materialRewrite)
    .map((item) => ({
      id: item.id,
      action: skipped.has(item.evidenceCandidateId) ? 'keep_original' : 'use_tailored',
    }));
  return option2.apply(session, decisions);
}

function createBetaUiServer(options = {}) {
  const host = options.host || '127.0.0.1';
  const port = options.port ?? 3000;
  const coreApp = core.createBetaUiServer({ ...options, host: '127.0.0.1', port: 0 });
  let coreAddress;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || host}`);
      if (req.method === 'GET' && url.pathname === '/') {
        return send(res, 200, SHIPPED_PAGE, 'text/html; charset=utf-8');
      }

      const sessionId = sessionIdFromPath(url.pathname);
      const session = sessionId ? coreApp.sessions.get(sessionId) : null;
      const outputMatch = url.pathname.match(/^\/api\/(?:llm-first\/)?sessions\/[^/]+\/outputs\/([^/]+)$/);
      if (req.method === 'GET' && outputMatch?.[1] === 'final-resume.pdf') {
        if (!session) return send(res, 404, { error: 'This local session has expired.' });
        if (session.stage !== 'complete') return send(res, 409, { error: 'Export is blocked until Career Review is complete.' });
        const filePath = path.join(session.dir, 'final-resume.pdf');
        if (!fs.existsSync(filePath)) return send(res, 404, { error: 'Output not found.' });
        return send(res, 200, fs.readFileSync(filePath), 'application/pdf', {
          'Content-Disposition': 'inline; filename="final-resume.pdf"',
        });
      }

      const requestBody = await readRequest(req);

      if (req.method === 'POST' && /\/confirm$/.test(url.pathname) && session && ['tailoring-review', 'draft-blocked'].includes(session.stage)) {
        const result = await legacyConfirmAsTailoring(session, parseJson(requestBody));
        return send(res, 200, normalizeApplicantResponse(result));
      }

      if (req.method === 'POST' && /\/tailoring-review$/.test(url.pathname)) {
        if (!session) return send(res, 404, { error: 'This local session has expired.' });
        const input = parseJson(requestBody);
        const result = await option2.apply(session, input.decisions || []);
        return send(res, 200, normalizeApplicantResponse(result));
      }

      let bodyForCore = requestBody;
      const isCareerReview = req.method === 'POST' && /\/career-review$/.test(url.pathname);
      if (isCareerReview && session?.tailoringFinalReview) {
        const input = parseJson(requestBody);
        bodyForCore = Buffer.from(JSON.stringify({
          ...input,
          decisions: option2.translateCareerReviewDecisions(session, input.decisions || []),
        }));
      }

      const proxied = await proxyRequest({ coreAddress, req, url, body: bodyForCore });
      if (!proxied.contentType.includes('application/json')) {
        return send(res, proxied.status, proxied.body, proxied.contentType, outputMatch
          ? { 'Content-Disposition': `inline; filename="${path.basename(outputMatch[1])}"` }
          : {});
      }

      let value;
      try { value = proxied.body.length ? JSON.parse(proxied.body.toString('utf8')) : {}; }
      catch { return send(res, proxied.status, proxied.body, proxied.contentType); }

      const isLlmStart = req.method === 'POST' && url.pathname === '/api/llm-first/start';
      if (proxied.status < 300 && isLlmStart) {
        const current = coreApp.sessions.get(value.sessionId);
        const prepared = await option2.prepare(current);
        value = { ...value, ...prepared, stage: prepared.stage };
        delete value.evidence;
      }

      if (proxied.status < 300 && isCareerReview) {
        value = cleanAndWriteApplicantOutputs(session, value);
      }

      return send(res, proxied.status, normalizeApplicantResponse(value));
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  });

  return {
    server,
    sessions: coreApp.sessions,
    listen: async () => {
      coreAddress = await coreApp.listen();
      return new Promise((resolve) => server.listen(port, host, () => resolve(server.address())));
    },
    close: () => new Promise((resolve) => server.close(async () => {
      await coreApp.close();
      resolve();
    })),
  };
}

if (require.main === module) {
  const app = createBetaUiServer({ port: Number(process.env.PORT || 3000) });
  app.listen().then((address) => console.log(`Career Evolution Beta UI: http://${address.address}:${address.port}`));
}

module.exports = {
  createBetaUiServer,
  BETA_PAGE: core.BETA_PAGE,
  APPLICANT_PAGE: SHIPPED_PAGE,
  qualityReady: core.qualityReady,
};
