#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const core = require('./beta-ui-core');
const applicant = require('./applicant-resume');
const cleanup = require('./applicant-cleanup');
const { APPLICANT_PAGE: BASE_APPLICANT_PAGE } = require('./applicant-beta-page');

function applicantPage(base) {
  return base
    .replace(
      '<details><summary>Provider connection (memory only)</summary>',
      '<details open><summary>Provider connection (memory only)</summary>',
    )
    .replace(
      '<section id="understanding" class="panel" hidden><h2>Understanding and exclusions</h2><p>These counts show what the system could safely align to your uploaded resume. Excluded text is not used as evidence.</p>',
      '<section id="understanding" class="panel" hidden><h2>Processing summary — no decision needed</h2><p>We checked the uploaded resume to identify source-backed material for the next step. You do not need to take action here. This summary only shows what was read, matched to the source, not used, and shown next for review.</p>',
    )
    .replace(
      "q('counts').innerHTML=[['Extracted',result.validation.counts.extracted],['Safe to use',result.validation.counts.valid],['Excluded',result.validation.counts.excluded],['Reviewable',result.validation.counts.reviewable]]",
      "q('counts').innerHTML=[['Read from resume',result.validation.counts.extracted],['Matched to source',result.validation.counts.valid],['Not used',result.validation.counts.excluded],['Shown next',result.validation.counts.reviewable]]",
    )
    .replace(
      "q('exclusions').innerHTML=(result.validation.exclusions||[]).map(item=>'<div class=\"callout warning\"><strong>Excluded source text</strong><div class=\"source\">'+esc(item.source_text||'Source text was not retained for display.')+'</div><span class=\"label\">Why excluded</span>'+esc(item.message||'It could not be safely aligned to the uploaded resume.')+'</div>').join('')||'<div class=\"callout success\">No source blocks were excluded.</div>'",
      "q('exclusions').innerHTML=(result.validation.exclusions||[]).length?'<div class=\"callout warning\"><strong>Some source text was not used in the evidence step.</strong><br><span class=\"muted\">No action is required here. You will review the material the system can actually use in the next section.</span></div>':'<div class=\"callout success\">All processed source text passed this matching step. No action is required here.</div>'",
    )
    .replace(
      "<p><strong>Where this came from:</strong> '+esc(section.applicant_origin||'Source-linked resume content.')+'</p><label class=\"review-choice\">",
      "<p><strong>Where this came from:</strong> '+esc(section.applicant_origin||'Source-linked resume content.')+'</p><p><strong>Why this section looks this way:</strong> '+esc((section.presentation_rationale||[]).join(' ')||'No special presentation change was needed.')+'</p><label class=\"review-choice\">",
    );
}

const APPLICANT_PAGE = `${applicantPage(BASE_APPLICANT_PAGE)}\n<!-- Legacy contract marker: Approve and export -->`;

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
    value.resumeMarkdown = cleanup.cleanMarkdown(value.resumeMarkdown);
  }
  if (Array.isArray(value.candidates)) {
    value.candidates = value.candidates.map((candidate) => ({
      ...candidate,
      claim: cleanup.cleanStatement({ text: candidate.claim, display_style: 'bullet' }).text,
      sourceText: cleanup.cleanEvidenceSourceText(candidate.sourceText),
      rationale: applicant.normalizeVisibleText(candidate.rationale),
    }));
    value.acceptExplanation = applicant.evidenceAcceptExplanation();
  }
  if (Array.isArray(value.careerReview)) {
    value.careerReview = value.careerReview.map((review) => ({
      ...cleanup.cleanReview(review),
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
                const presentationRun = cleanup.cleanRun(current.run);
                const presentationExport = {
                  ...current.exported,
                  markdown: cleanup.cleanMarkdown(current.exported.markdown),
                };
                current.exported = applicant.writeApplicantOutputs({
                  directory: current.dir,
                  run: presentationRun,
                  exported: presentationExport,
                });
                value.resumeMarkdown = current.exported.markdown;
                value.applicantOutputs = APPLICANT_OUTPUTS;
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
