#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { Store } = require('./store');
const humanReview = require('./human-review');

function options(args) { const result = {}; for (let i = 0; i < args.length; i += 1) if (args[i].startsWith('--')) result[args[i].slice(2)] = args[i + 1] || true; return result; }
function required(value, name) { if (!value) throw new Error(`Missing --${name}`); return value; }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function html(run, exported) { return `<!doctype html><meta charset="utf-8"><title>Human Review</title><style>body{font:16px system-ui;max-width:900px;margin:2rem auto;line-height:1.5}section{border:1px solid #ddd;padding:1rem;margin:1rem 0}pre{white-space:pre-wrap}</style><h1>Human Review — Resume</h1><p><strong>Completion:</strong> ${run.review_complete ? 'Complete — export allowed' : 'Incomplete — export blocked'}</p><p>The AI prepares. The human decides. Every presentation decision is transparent and reviewable before export.</p>${run.section_reviews.map((review) => `<section><h2>${escapeHtml(review.section)}</h2><p><strong>Action:</strong> ${escapeHtml(review.action)} at ${escapeHtml(review.reviewed_at)}</p><h3>AI version</h3><pre>${escapeHtml(JSON.stringify(review.ai_version, null, 2))}</pre><h3>Supporting evidence / provenance</h3><pre>${escapeHtml(JSON.stringify(review.supporting_evidence, null, 2))}</pre><h3>Why this presentation</h3><ul>${review.presentation_rationale.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul><h3>Final approved version</h3><pre>${escapeHtml(JSON.stringify(review.final_version, null, 2))}</pre></section>`).join('')}<h2>Export</h2><pre>${escapeHtml(exported.markdown)}</pre>`; }
async function promptForDecisions(drafts, io) {
  const rl = readline.createInterface({ input: io.stdin, output: io.stdout });
  try { const decisions = []; for (const draft of drafts) { io.stdout.write(`\n${draft.section}\nAI version: ${JSON.stringify(draft.ai_version)}\nEvidence: ${JSON.stringify(draft.supporting_evidence)}\nWhy: ${draft.presentation_rationale.join(' ')}\n[A]pprove or [E]dit: `); const choice = (await rl.question('')).trim().toLowerCase(); if (choice === 'a' || choice === 'approve') decisions.push({ section: draft.section, action: 'approve' }); else if (choice === 'e' || choice === 'edit') decisions.push({ section: draft.section, action: 'edit', finalVersion: JSON.parse(await rl.question('Final section JSON: ')) }); else throw new Error('Choose A or E; every section requires an explicit review.'); } return decisions; } finally { rl.close(); }
}
async function main(argv = process.argv.slice(2), io = process) {
  const input = options(argv); const store = new Store(input.db || 'career-evolution.db');
  try {
    const artifactRun = store.getResumeArtifactRun(required(input['resume-artifact-run-id'], 'resume-artifact-run-id'));
    const strategyRun = input['presentation-strategy-run-id'] ? store.getPresentationStrategyRun(input['presentation-strategy-run-id']) : null;
    const fixture = input['review-fixture'] ? JSON.parse(fs.readFileSync(input['review-fixture'], 'utf8')) : null;
    const decisions = fixture?.decisions || (input['non-interactive'] ? (() => { throw new Error('--non-interactive requires --review-fixture with every section decision'); })() : await promptForDecisions(humanReview.createDraft({ artifactRun, presentationStrategyRun: strategyRun }), io));
    const run = store.createHumanReviewRun({ resumeArtifactRunId: artifactRun.id, presentationStrategyRunId: strategyRun?.id, decisions });
    const exported = store.exportReviewedResume({ humanReviewRunId: run.id });
    const outputDir = path.resolve(input['output-dir'] || 'human-review-output'); fs.mkdirSync(outputDir, { recursive: true });
    for (const [name, value] of Object.entries({ 'human-review-run.json': run, 'final-resume.json': exported, 'final-resume.md': exported.markdown, 'human-review-report.html': html(run, exported) })) fs.writeFileSync(path.join(outputDir, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
    io.stdout.write(`Human Review complete: ${run.section_reviews.length}/${humanReview.REQUIRED_SECTIONS.length} required sections explicitly reviewed.\nExport allowed: yes\nOutputs: ${outputDir}\n`);
    return { run, exported, outputDir };
  } finally { store.close(); }
}
if (require.main === module) main().catch((error) => { console.error(`Error: ${error.message}`); process.exitCode = 1; });
module.exports = { main, html, promptForDecisions };
