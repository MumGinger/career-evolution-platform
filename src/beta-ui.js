#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const core = require('./beta-ui-core');
const applicant = require('./applicant-resume');
const { APPLICANT_PAGE } = require('./applicant-beta-page');

const APPLICANT_OUTPUTS = [
  'final-resume.pdf',
  'career-review-report.html',
  'final-resume.md',
  'final-resume.json',
];

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

function normalizeApplicantResponse(value) {
  if (!value || typeof value !== 'object') return value;
  if (typeof value.resumeMarkdown === 'string') {
    value.resumeMarkdown = applicant.normalizeVisibleText(value.resumeMarkdown);
  }
  if (Array.isArray(value.candidates)) {
    value.candidates = value.candidates.map((candidate) => ({
      ...candidate,
      claim: applicant.normalizeVisibleText(candidate.claim),
      sourceText: applicant.normalizeVisibleText(candidate.sourceText),
      rationale: applicant.normalizeVisibleText(candidate.rationale),
    }));
    value.acceptExplanation = applicant.evidenceAcceptExplanation();
  }
  if (Array.isArray(value.careerReview)) {
    value.careerReview = value.careerReview.map((review) => ({
      ...review,
      applicant_origin: applicant.sectionOriginExplanation(review),
    }));
    value.resumeHtml = applicant.resumeHtml(value.careerReview, { standalone: false });
  }
  if (value.validation) {
    value.validationSummary = applicant.validationSummary(
      value.validation,
      value.validationFindings || [],
    );
  }
  return value;
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
        return send(res, 200, APPLICANT_PAGE, 'text/html; charset=utf-8');
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

      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('error', () => send(res, 400, { error: 'The request could not be read.' }));
      req.on('end', () => {
        const requestBody = Buffer.concat(chunks);
        const proxy = http.request({
          hostname: coreAddress.address,
          port: coreAddress.port,
          method: req.method,
          path: url.pathname + url.search,
          headers: {
            'content-type': req.headers['content-type'] || 'application/json; charset=utf-8',
            'content-length': requestBody.length,
          },
        }, (proxied) => {
          const responseChunks = [];
          proxied.on('data', (chunk) => responseChunks.push(chunk));
          proxied.on('end', () => {
            const body = Buffer.concat(responseChunks);
            const contentType = String(proxied.headers['content-type'] || 'application/octet-stream');
            if (!contentType.includes('application/json')) {
              return send(res, proxied.statusCode || 500, body, contentType, outputMatch
                ? { 'Content-Disposition': `inline; filename="${path.basename(outputMatch[1])}"` }
                : {});
            }

            let value;
            try { value = body.length ? JSON.parse(body.toString('utf8')) : {}; }
            catch { return send(res, proxied.statusCode || 500, body, contentType); }

            const isCareerReview = req.method === 'POST' && /\/career-review$/.test(url.pathname);
            if ((proxied.statusCode || 500) < 300 && isCareerReview) {
              const current = sessionId ? coreApp.sessions.get(sessionId) : null;
              if (current?.run && current?.exported) {
                current.exported = applicant.writeApplicantOutputs({
                  directory: current.dir,
                  run: current.run,
                  exported: current.exported,
                });
                value.resumeMarkdown = current.exported.markdown;
                value.outputs = APPLICANT_OUTPUTS;
                value.primaryOutput = 'final-resume.pdf';
              }
            }
            return send(
              res,
              proxied.statusCode || 500,
              normalizeApplicantResponse(value),
              'application/json; charset=utf-8',
            );
          });
        });
        proxy.on('error', () => send(res, 502, { error: 'The local resume service could not be reached.' }));
        if (requestBody.length) proxy.write(requestBody);
        proxy.end();
      });
    } catch (error) {
      return send(res, 500, { error: error.message });
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
  APPLICANT_PAGE,
  qualityReady: core.qualityReady,
};
