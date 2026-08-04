#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { Store } = require('./store');
const review = require('./evidence-review');

function options(args) { const result = {}; for (let i = 0; i < args.length; i += 1) if (args[i].startsWith('--')) result[args[i].slice(2)] = args[i + 1] || true; return result; }
function required(value, name) { if (!value) throw new Error(`Missing --${name}`); return value; }
function adapter(input, output) {
  const rl = readline.createInterface({ input, output });
  return { ask: async ({ requirement, candidate }) => {
    output.write(`\nRequirement: ${requirement.normalized_name}\nCandidate #${candidate.rank} (score ${candidate.score})\nEvidence: ${candidate.candidate.supporting_text}\nBlock: ${candidate.candidate.source_type}; rationale: ${candidate.why_selected}\nProvenance: ${JSON.stringify(candidate.candidate.provenance)}\n[1] Accept  [2] Skip  [3] Edit\n`);
    const choice = (await rl.question('Choice: ')).trim();
    if (choice === '1') return { action: 'accepted' };
    if (choice === '2') return { action: 'skipped' };
    if (choice === '3') { const value = JSON.parse(await rl.question('Exact source-supported JSON claim: ')); const rationale = await rl.question('Optional note: '); return { action: 'edited', value, rationale }; }
    throw new Error('Choose 1, 2, or 3');
  }, close: () => rl.close() };
}
function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function html(result) {
  const decisions = result.reviewRun.review_decisions.map((item) => `<li><strong>${escapeHtml(item.action)}</strong>: ${escapeHtml(item.original_claim)} — provenance ${item.source_evidence_refs.map((ref) => escapeHtml(ref.id)).join(', ')}</li>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>Evidence Review</title><h1>Evidence Review</h1><h2>Review queue</h2><p>Needs review: ${result.kpi.needs_review_count}; auto accepted: ${result.kpi.auto_accepted_evidence_count}</p><ul>${decisions}</ul><h2>Outcome</h2><p>Coverage: ${result.kpi.committed_coverage_before}% → ${result.kpi.committed_coverage_after}%<br>Candidate Knowledge facts: ${result.kpi.candidate_knowledge_facts_before} → ${result.kpi.candidate_knowledge_facts_after}<br>Validation: ${escapeHtml(result.validation.status)}</p><h2>Resume preview</h2><pre>${escapeHtml(result.artifact.markdown)}</pre><h2>Validation findings</h2><pre>${escapeHtml(JSON.stringify(result.validation.findings, null, 2))}</pre>`;
}
async function main(argv = process.argv.slice(2), io = process) {
  const input = options(argv); const store = new Store(input.db || 'career-evolution.db'); let prompt;
  try {
    const fixture = input['review-fixture'] ? JSON.parse(fs.readFileSync(input['review-fixture'], 'utf8')) : null;
    prompt = fixture ? null : adapter(io.stdin, io.stdout);
    const result = await review.run({ store, candidateProfileId: required(input['candidate-profile-id'], 'candidate-profile-id'), jobRequirementProfileId: required(input['job-profile-id'], 'job-profile-id'), fixture, adapter: prompt, nonInteractive: Boolean(input['non-interactive']) });
    const outputDir = path.resolve(input['output-dir'] || 'evidence-review-output'); fs.mkdirSync(outputDir, { recursive: true });
    const files = { 'evidence-review-run.json': result.reviewRun, 'review-decisions.json': result.reviewRun.review_decisions, 'candidate-knowledge-after-review.json': store.getCommittedCandidateKnowledge(result.reviewRun.candidate_profile_id), 'tailoring-plan.json': result.afterPlan, 'resume-artifact.json': result.artifact, 'validation-report.json': result.validation, 'resume-after-review.md': result.artifact.markdown, 'evidence-review-report.html': html(result) };
    for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(outputDir, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
    io.stdout.write(`${JSON.stringify(result.kpi, null, 2)}\nOutputs: ${outputDir}\n`); return result;
  } finally { if (prompt) prompt.close(); store.close(); }
}
if (require.main === module) main().catch((error) => { console.error(`Error: ${error.message}`); process.exitCode = 1; });
module.exports = { main, adapter, html };
