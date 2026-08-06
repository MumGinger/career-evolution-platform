#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const core = require('./beta-ui-core');
const applicant = require('./applicant-resume');

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
        return send(res, 200, BETA_PAGE, 'text/html; charset=utf-8');
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
      req.on('end', () => {
        const proxy = http.request({
          hostname: coreAddress.address,
          port: coreAddress.port,
          method: req.method,
          path: url.pathname + url.search,
          headers: {
            ...req.headers,
            host: `${coreAddress.address}:${coreAddress.port}`,
            'content-length': Buffer.concat(chunks).length,
          },
        }, (proxied) => {
          const responseChunks = [];
          proxied.on('data', (chunk) => responseChunks.push(chunk));
          proxied.on('end', () => {
            const body = Buffer.concat(responseChunks);
            const contentType = String(proxied.headers['content-type'] || 'application/octet-stream');
            if (!contentType.includes('application/json')) {
              const headers = { ...proxied.headers };
              delete headers['transfer-encoding'];
              delete headers['content-length'];
              if (outputMatch) headers['Content-Disposition'] = `inline; filename="${path.basename(outputMatch[1])}"`;
              return send(res, proxied.statusCode || 500, body, contentType, headers);
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
            value = normalizeApplicantResponse(value);
            return send(res, proxied.statusCode || 500, value, 'application/json; charset=utf-8');
          });
        });
        proxy.on('error', () => send(res, 502, { error: 'The local resume service could not be reached.' }));
        if (chunks.length) proxy.write(Buffer.concat(chunks));
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

const BETA_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Career Evolution Beta</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f4f6f9;line-height:1.5}
*{box-sizing:border-box}body{margin:0}.shell{max-width:1120px;margin:auto;padding:28px 20px 64px}.topbar{display:flex;gap:18px;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.eyebrow{font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#53637b}.topbar h1{font-size:2rem;line-height:1.1;margin:.2rem 0}.stage-pill{background:#e7eefb;color:#244d91;border-radius:999px;padding:8px 14px;font-weight:750;white-space:nowrap}.panel{background:#fff;border:1px solid #d9e0ea;border-radius:15px;padding:22px;margin:16px 0;box-shadow:0 8px 24px rgba(26,39,63,.05)}.panel h2{margin-top:0}.muted{color:#5c687b}.callout{border-left:4px solid #315f9f;background:#eef4ff;padding:14px 16px;border-radius:8px;margin:14px 0}.warning{border-left-color:#ba7714;background:#fff8e8}.success{border-left-color:#2e7d4f;background:#edf8f1}.error{color:#9b1c1c;background:#fff0f0;border-radius:8px;padding:12px 14px;display:none}.error:not(:empty){display:block}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.metric,.evidence-card,.review-card{border:1px solid #dce3ed;border-radius:11px;padding:15px;background:#fff}.metric strong{display:block;font-size:1.55rem}.evidence-card h3,.review-card h3{margin:.1rem 0 .5rem}.label{display:block;font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#607089;margin-top:10px}.source{background:#f6f8fb;border-radius:8px;padding:10px;white-space:pre-wrap}.decision{display:flex;align-items:center;gap:10px;margin-top:12px}.decision select{flex:1}.review-check{display:flex;gap:9px;align-items:flex-start;background:#f7f9fc;padding:10px;border-radius:8px;margin-top:12px}input,select,textarea,button{font:inherit}input,select,textarea{width:100%;border:1px solid #aeb9c9;border-radius:8px;padding:10px;margin:5px 0 12px}textarea{min-height:160px;resize:vertical}button,.button{display:inline-block;border:0;border-radius:9px;background:#244f91;color:#fff;padding:11px 17px;font-weight:800;cursor:pointer;text-decoration:none}button.secondary,.button.secondary{background:#e8eef7;color:#24436e}button:disabled{opacity:.45;cursor:not-allowed}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.resume-frame{background:#e7ebf1;border-radius:12px;padding:18px;overflow:auto}.resume-paper{width:min(8.5in,100%);min-height:10in;margin:auto;background:#fff;padding:.5in .62in;box-shadow:0 6px 24px rgba(16,31,56,.13);line-height:1.35}.resume-header{text-align:center;border-bottom:2px solid #253858;padding-bottom:10px;margin-bottom:15px}.resume-header .resume-line:first-child{font-size:24px;font-weight:800}.resume-line{margin:3px 0;font-size:10.5pt}.resume-section{margin:13px 0}.resume-section>h2{font-size:12pt;text-transform:uppercase;letter-spacing:.04em;color:#253858;border-bottom:1px solid #9aa7ba;margin:0 0 5px}.resume-entry-heading{font-size:10.8pt;margin:7px 0 2px}.resume-section ul{margin:4px 0;padding-left:19px}.resume-section li{font-size:10.2pt;margin:2px 0}.technical{margin-top:18px}.technical pre{white-space:pre-wrap;overflow:auto;font-size:.82rem}.hidden{display:none!important}@media(max-width:650px){.topbar{display:block}.stage-pill{display:inline-block}.panel{padding:16px}.resume-frame{padding:7px}.resume-paper{padding:24px 20px}}
</style></head><body><main class="shell">
<header class="topbar"><div><div class="eyebrow">Applicant Beta</div><h1>Build and verify your tailored resume</h1><p class="muted">Your source resume remains intact unless a supported, validated replacement is used.</p></div><div id="state" class="stage-pill">1 of 5 · Input</div></header>
<div id="error" class="error" role="alert"></div><p id="progress" aria-live="polite"></p>
<section id="input" class="panel"><h2>Resume and job description</h2><p>Upload a PDF or text resume, then paste the complete job description. Nothing is exported until you review every resume section.</p><label class="label" for="f">Resume file</label><input id="f" type="file" accept=".pdf,.txt"><label class="label" for="j">Job description</label><textarea id="j" placeholder="Paste the complete job description"></textarea><details><summary>Provider connection — kept in memory only</summary><label class="label" for="p">Provider</label><select id="p"><option value="openai-compatible">OpenAI-compatible</option><option value="mock">Mock testing provider</option></select><label class="label" for="m">Model</label><input id="m" placeholder="Model"><label class="label" for="k">API key</label><input id="k" type="password" placeholder="API key"><label class="label" for="b">Base URL</label><input id="b" placeholder="Base URL"></details><p id="readiness" class="muted">Connection setup is required before you can continue.</p><div class="actions"><button id="check" class="secondary" type="button">Check connection</button><button id="go" disabled>Understand my resume</button></div></section>
<section id="understanding" class="panel hidden"><h2>Understanding and exclusions</h2><p>These counts show what the system could safely align to your uploaded resume. Excluded text is not used as evidence.</p><div id="counts" class="grid"></div><div id="exclusions"></div></section>
<section id="evidence" class="panel hidden"><h2>Evidence Review</h2><div id="accept-help" class="callout"></div><p>Choose once for every item. <strong>Accept</strong> allows this evidence to support tailored wording; <strong>Skip</strong> keeps it out of Candidate Knowledge Integration.</p><div id="cards" class="grid"></div><div class="actions"><button id="make">Create readable resume draft</button></div></section>
<section id="draft" class="panel hidden"><h2>Draft and validation</h2><div id="validation"></div><p>Read the complete resume as an applicant would see it. Technical validation records remain available in Developer View, not as the main review surface.</p><div id="preview" class="resume-frame"></div></section>
<section id="career" class="panel hidden"><h2>Career Review</h2><p>Verify every section below. Approval remains blocked until you confirm that you reviewed each populated section.</p><div id="reviews"></div><div class="actions"><button id="approve" disabled>Approve complete resume and export</button></div></section>
<section id="output" class="panel hidden"><h2>Export complete</h2><div class="callout success"><strong>Your approved resume is ready.</strong><br>The PDF is the primary applicant-facing file. The review report explains what you approved without raw identifiers.</div><div id="primary-link" class="actions"></div><div id="links"></div><details class="technical"><summary>Additional technical files</summary><div id="technical-links"></div></details></section>
<details class="panel technical"><summary>Developer View</summary><p class="muted">Technical diagnostics are separated from applicant review and do not determine Beta acceptance.</p><pre id="diagnostics"></pre></details>
</main><script>
let session,candidates=[],review=[],progressTimers=[];const READY='Ready to create your tailored resume.';const q=x=>document.getElementById(x);const clean=x=>String(x??'').replace(/â€¢|ï‚·|/g,'•').replace(/â€“/g,'–').replace(/â€”/g,'—').replace(/â€™/g,'’').replace(/Â/g,'').replace(/\uFFFD/g,'').trim();const esc=x=>clean(x).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function showDiagnostics(d){if(!d)return;let c=d.counts||{};q('diagnostics').textContent='Category: '+(d.category||'success')+'\nProvider: '+(d.provider||'unavailable')+'\nModel: '+(d.model||'unavailable')+'\nExtracted: '+(c.extracted||0)+'\nValid: '+(c.valid||0)+'\nExcluded: '+(c.excluded||0)+'\nReviewable: '+(c.reviewable||0)+'\nValidation reasons: '+((d.validation_reason_categories||[]).join(', ')||'none')}
function clearProgress(){for(let t of progressTimers)clearTimeout(t);progressTimers=[];q('progress').textContent=''}function startProgress(){clearProgress();let steps=['Reading your resume…','Finding source-backed evidence…','Preparing items for your review…'];q('progress').textContent=steps[0];progressTimers=steps.slice(1).map((step,index)=>setTimeout(()=>q('progress').textContent=step,(index+1)*600))}function busy(x,b){q(x).disabled=b}
function fail(e,stage='startup'){if(e==null||e===''){q('error').textContent='';return}clearProgress();let c=e.category||'',m=String(e.message||e);if(/Select a resume/.test(m))q('error').textContent='Select your resume before continuing.';else if(/Paste a job description/.test(m))q('error').textContent='Paste the job description before continuing.';else if(c==='provider_api_failure'||stage==='connection'){q('readiness').textContent='The resume service is temporarily unavailable. Retry.';q('go').disabled=true;q('error').textContent='The resume service is temporarily unavailable. Check your connection and try again.'}else if(c==='career_review_failure')q('error').textContent='We couldn’t save your resume review. Your selections are still here. Try again.';else if(c==='export_failure')q('error').textContent='We couldn’t create your resume files. Your approved resume is still here. Try again.';else if(stage==='draft')q('error').textContent='We couldn’t prepare your resume draft. Your evidence decisions are still visible; try again.';else if(['invalid_structured_response','zero_extracted_blocks','all_blocks_excluded','zero_reviewable_candidates'].includes(c))q('error').textContent='We couldn’t identify enough usable information from this resume. Review the file and try again.';else q('error').textContent='The current step could not be completed. Try again.';showDiagnostics({category:c||'client_error',...(e.diagnostics||{})})}
async function call(u,b){let r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}),v=await r.json();if(!r.ok){let e=Error(v.error||'Request failed');e.category=v.category;e.diagnostics=v.diagnostics;throw e}return v}function fileData(f){return new Promise((ok,no)=>{let r=new FileReader;r.onload=()=>ok(r.result.split(',')[1]);r.onerror=no;r.readAsDataURL(f)})}
function renderStatement(s){let text=esc(s.text);if(s.display_style==='heading')return '<h3 class="resume-entry-heading">'+text+'</h3>';if(s.display_style==='line'||s.display_style==='inline')return '<p class="resume-line">'+text+'</p>';return '<li>'+text+'</li>'}
function renderSection(z){let statements=(z.ai_version?.statements||[]).map(renderStatement),blocks=[],bullets=[];for(let item of statements){if(item.startsWith('<li>'))bullets.push(item);else{if(bullets.length)blocks.push('<ul>'+bullets.splice(0).join('')+'</ul>');blocks.push(item)}}if(bullets.length)blocks.push('<ul>'+bullets.join('')+'</ul>');return z.section==='Applicant Header'?'<header class="resume-header">'+blocks.join('')+'</header>':'<section class="resume-section"><h2>'+esc(z.section)+'</h2>'+blocks.join('')+'</section>'}
function validationHtml(s){if(!s)return '';let warnings=(s.warnings||[]).map(w=>'<div class="callout warning"><strong>'+esc(w.title)+'</strong><br>'+esc(w.message)+'<br><span class="muted">What to do: '+esc(w.action)+'</span></div>').join('');return '<div class="callout '+(s.tone==='success'?'success':s.tone==='warning'?'warning':'')+'"><strong>'+esc(s.title)+'</strong><br>'+esc(s.message)+'</div>'+warnings}
function refreshApproval(){let checks=[...document.querySelectorAll('[data-reviewed]')];q('approve').disabled=!checks.length||checks.some(x=>!x.checked)}
async function preflight(){let x=await call('/api/llm-first/preflight',{provider:q('p').value,model:q('m').value,apiKey:q('k').value,baseUrl:q('b').value});showDiagnostics({category:x.state,...x.diagnostics});let ready=x.state==='ready';q('go').disabled=!ready;q('readiness').textContent=ready?READY:x.state==='temporarily_unavailable'?'The resume service is temporarily unavailable. Retry.':'Connection setup is required before you can continue.';q('error').textContent=x.state==='temporarily_unavailable'?'The resume service is temporarily unavailable. Check your connection and try again.':'';return ready}
q('check').onclick=async()=>{try{await preflight()}catch(e){fail(e,'connection')}};preflight().catch(e=>fail(e,'connection'));
q('go').onclick=async()=>{if(q('go').disabled)return;try{fail('');busy('go',true);startProgress();let f=q('f').files[0];if(!f)throw Error('Select a resume file.');let x=await call('/api/llm-first/start',{resume:{name:f.name,data:await fileData(f)},jobText:q('j').value,provider:q('p').value,model:q('m').value,apiKey:q('k').value,baseUrl:q('b').value});clearProgress();q('k').value='';showDiagnostics({category:'success',...x.provider,...x.validation});session=x.sessionId;candidates=x.candidates;q('counts').innerHTML=[['Extracted',x.validation.counts.extracted],['Safe to use',x.validation.counts.valid],['Excluded',x.validation.counts.excluded],['Reviewable',x.validation.counts.reviewable]].map(v=>'<div class="metric"><strong>'+v[1]+'</strong>'+v[0]+'</div>').join('');q('exclusions').innerHTML=(x.validation.exclusions||[]).map(z=>'<div class="callout warning"><strong>Excluded source text</strong><div class="source">'+esc(z.source_text||'Source text was not retained for display.')+'</div><span class="label">Why excluded</span>'+esc(z.message||'It could not be safely aligned to the uploaded resume.')+'</div>').join('')||'<div class="callout success">No source blocks were excluded.</div>';q('accept-help').textContent=x.acceptExplanation||'Accept allows this source-backed evidence to support the tailored draft after Candidate Knowledge Integration and validation.';q('cards').innerHTML=candidates.map(z=>'<article class="evidence-card"><h3>'+esc(z.requirement)+'</h3><span class="label">Source text</span><div class="source">'+esc(z.sourceText)+'</div><span class="label">Proposed resume use</span><p>'+esc(z.claim)+'</p><span class="label">Why it may help</span><p class="muted">'+esc(z.rationale)+'</p><label class="decision"><span class="label">Decision</span><select aria-label="Decision for '+esc(z.requirement)+'" data-c="'+esc(z.evidence_candidate_id)+'"><option value="accept">Accept as evidence</option><option value="skip">Skip</option></select></label></article>').join('');q('state').textContent='2 of 5 · Evidence Review';q('input').classList.add('hidden');q('understanding').classList.remove('hidden');q('evidence').classList.remove('hidden')}catch(e){fail(e,'startup')}finally{q('go').disabled=q('readiness').textContent!==READY}};
q('make').onclick=async()=>{if(q('make').disabled)return;try{fail('');busy('make',true);let x=await call('/api/llm-first/sessions/'+session+'/confirm',{decisions:candidates.map(z=>({evidence_candidate_id:z.evidence_candidate_id,action:document.querySelector('[data-c="'+z.evidence_candidate_id+'"]').value}))});q('validation').innerHTML=validationHtml(x.validationSummary);q('preview').innerHTML=x.resumeHtml||'<article class="resume-paper"><pre>'+esc(x.resumeMarkdown)+'</pre></article>';q('evidence').classList.add('hidden');q('draft').classList.remove('hidden');q('state').textContent='3 of 5 · Draft and validation';if(x.blocked||!x.careerReview)return;review=x.careerReview;q('reviews').innerHTML=review.map((z,i)=>'<article class="review-card"><h3>'+esc(z.section)+'</h3><div class="resume-frame"><article class="resume-paper">'+renderSection(z)+'</article></div><p><strong>Where this came from:</strong> '+esc(z.applicant_origin||'Source-linked resume content.')+'</p><label class="review-check"><input type="checkbox" data-reviewed="'+i+'"><span>I reviewed this complete section and confirm that it is accurate for export.</span></label></article>').join('');document.querySelectorAll('[data-reviewed]').forEach(x=>x.onchange=refreshApproval);refreshApproval();q('career').classList.remove('hidden');q('state').textContent='4 of 5 · Career Review'}catch(e){fail(e,'draft')}finally{busy('make',false)}};
q('approve').onclick=async()=>{if(q('approve').disabled||!review.length)return;try{fail('');busy('approve',true);let x=await call('/api/llm-first/sessions/'+session+'/career-review',{decisions:review.map(z=>({section:z.section,action:'approve'}))});let base='/api/llm-first/sessions/'+session+'/outputs/';q('primary-link').innerHTML='<a class="button" target="_blank" href="'+base+'final-resume.pdf">Open submission-ready PDF</a>';q('links').innerHTML='<p><a class="button secondary" target="_blank" href="'+base+'career-review-report.html">Open readable Career Review report</a></p>';q('technical-links').innerHTML=(x.outputs||[]).filter(n=>!['final-resume.pdf','career-review-report.html'].includes(n)).map(n=>'<p><a target="_blank" href="'+base+n+'">View '+esc(n)+'</a></p>').join('');q('state').textContent='5 of 5 · Export complete';q('career').classList.add('hidden');q('output').classList.remove('hidden')}catch(e){fail(e,'career-review')}finally{busy('approve',false)}};
</script></body></html>`;

if (require.main === module) {
  const app = createBetaUiServer({ port: Number(process.env.PORT || 3000) });
  app.listen().then((address) => console.log(`Career Evolution Beta UI: http://${address.address}:${address.port}`));
}

module.exports = { createBetaUiServer, BETA_PAGE, qualityReady: core.qualityReady };
