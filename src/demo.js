#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('./store');
const { extractPdfText, parseResumeText } = require('./resume');
const { runResumeSemanticUnderstanding } = require('./resume-semantic');
const { runResumeSemanticGraphConstruction } = require('./resume-semantic-graph');

const OUTPUT_FILES = ['candidate-knowledge.json', 'resume-semantic-run.json', 'resume-semantic-graph-run.json', 'job-requirement-profile.json', 'information-needs.json', 'evidence-discovery.json', 'acquisition-plan.json', 'integration-run.json', 'tailoring-plan.json', 'resume-artifact.json', 'validation-report.json', 'resume.md', 'report.html'];

function options(args) { const result = {}; for (let i = 0; i < args.length; i += 1) if (args[i].startsWith('--')) result[args[i].slice(2)] = args[i + 1]; return result; }
function required(value, name) { if (!value) throw new Error(`Missing --${name}. Run node src/demo.js --help for an example.`); return value; }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function countBy(items, key) { return items.reduce((counts, item) => ({ ...counts, [item[key]]: (counts[item[key]] || 0) + 1 }), {}); }

function readResume(store, resumePath) {
  if (!fs.existsSync(resumePath)) throw new Error(`Resume file not found: ${resumePath}`);
  const extension = path.extname(resumePath).toLowerCase();
  if (!['.pdf', '.txt'].includes(extension)) throw new Error('Unsupported resume input. Use a PDF resume, or a UTF-8 .txt fixture for the deterministic local demo.');
  const parsedText = extension === '.pdf' ? extractPdfText(resumePath) : fs.readFileSync(resumePath, 'utf8');
  const parsed = parseResumeText(parsedText);
  // Parsed resume content remains working evidence. Only 003.6 may write Candidate Knowledge.
  return { knowledge: store.createResumeProfile({ sourcePath: resumePath, basic: parsed.basic, facts: [] }), parsedText };
}

function readJob(jobInput) {
  if (fs.existsSync(jobInput)) return fs.readFileSync(jobInput, 'utf8');
  if (/^(?:[A-Za-z]:)?[\\/]/.test(jobInput) || /\.(?:txt|md)$/i.test(jobInput)) throw new Error(`Job description file not found: ${jobInput}`);
  if (!jobInput.trim()) throw new Error('Job description must contain text.');
  return jobInput;
}

function jobIdentity(description) {
  const lines = description.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const companyHeader = lines.find((line) => /^company\s*:/i.test(line))?.replace(/^company\s*:\s*/i, '');
  const roleHeader = lines.find((line) => /^(role( title)?|title)\s*:/i.test(line))?.replace(/^(role( title)?|title)\s*:\s*/i, '');
  if (companyHeader || roleHeader) return { company: companyHeader || 'Unspecified company', roleTitle: roleHeader || 'Target role' };
  const opening = lines.slice(0, 6).filter((line) => !/^(posted|job id|apply|full[- ]time|part[- ]time)/i.test(line));
  const atLine = opening.find((line) => /\bat\s+.+/i.test(line));
  if (!atLine && opening.length >= 3 && /(?:,\s*[A-Z]{2}\b|\b(?:canada|remote|hybrid|on-site)\b)/i.test(opening[2])) return { company: opening[0], roleTitle: opening[1], location: opening[2] };
  const roleTitle = atLine ? atLine.split(/\bat\s+/i)[0].trim() : opening[0] || 'Target role';
  const company = atLine ? atLine.split(/\bat\s+/i)[1].trim() : opening[1] || 'Unspecified company';
  return { company, roleTitle };
}

function loadFixture(filePath) {
  if (!filePath) return { outcomes: [] };
  if (!fs.existsSync(filePath)) throw new Error(`Capture fixture file not found: ${filePath}`);
  let fixture;
  try { fixture = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { throw new Error('Capture fixture must be valid JSON.'); }
  if (!fixture || !Array.isArray(fixture.outcomes)) throw new Error('Capture fixture must contain an outcomes array.');
  return fixture;
}

function createCaptures(planRun, fixture) {
  const actions = planRun.acquisition_plans.flatMap((plan) => plan.acquisition_actions);
  const used = new Set();
  const captures = actions.map((action) => {
    const outcome = fixture.outcomes.find((item, index) => !used.has(index) && item && item.actionType === action.action_type);
    if (!outcome) return { actionId: action.id, executionStatus: 'skipped', sourceType: 'demo_policy', provenance: { adapter: 'milestone_1_demo', policy: 'unresolved_actions_skipped_without_capture' }, limitations: 'No optional capture fixture supplied for this action. The deterministic demo records this unresolved action as skipped and does not invent evidence.' };
    used.add(fixture.outcomes.indexOf(outcome));
    if (outcome.executionStatus && outcome.executionStatus !== 'captured') return { actionId: action.id, executionStatus: outcome.executionStatus, sourceType: 'demo_fixture', provenance: { adapter: 'milestone_1_demo', fixture: true }, limitations: outcome.limitations || 'Fixture explicitly records that this acquisition action did not produce evidence.' };
    if (outcome.rawCapturedEvidence === undefined) throw new Error(`Capture fixture outcome for ${action.action_type} requires rawCapturedEvidence when captured.`);
    return { actionId: action.id, rawCapturedEvidence: outcome.rawCapturedEvidence, sourceType: 'demo_fixture', provenance: { adapter: 'milestone_1_demo', fixture: true, supplied_by: 'user_or_synthetic_fixture' }, limitations: outcome.limitations || 'Raw fixture evidence is caller-supplied and remains subject to Candidate Knowledge Integration policy.' };
  });
  return { captures, actions };
}

function proposalsFor(resultRun, fixture) {
  const proposals = [];
  for (const outcome of fixture.outcomes) {
    if (!Array.isArray(outcome.proposals)) continue;
    const result = resultRun.acquisition_results.find((item) => item.action_type === outcome.actionType && item.execution_status === 'captured');
    if (!result) continue;
    for (const proposal of outcome.proposals) proposals.push({ ...proposal, sourceEvidenceRefs: [{ type: 'acquisition_result', id: result.id, positiveConfirmation: proposal.positiveConfirmation === true }] });
  }
  return proposals;
}

function markdown(artifact) {
  return artifact.content.sections.map((section) => {
    const statements = section.statements.map((statement) => `- ${statement.text}`).join('\n');
    return `## ${section.section}\n\n${section.placeholder || statements || '_No supported content selected._'}`;
  }).join('\n\n') + '\n';
}

function reportHtml({ knowledge, semantic, graph, job, needs, discovery, acquisition, integration, tailoring, artifact, validation }) {
  const resumeArtifact = artifact.resume_artifacts[0];
  const coverage = tailoring.requirement_coverage.map((item) => `<li><code>${escapeHtml(item.job_requirement_id)}</code>: ${escapeHtml(item.coverage_status)} — ${escapeHtml(item.coverage_rationale)}</li>`).join('');
  const selections = tailoring.resume_content_selections.map((item) => `<li>${escapeHtml(item.selection_state)}: <code>${escapeHtml(item.candidate_fact_id)}</code> (${escapeHtml(item.recommended_section)})</li>`).join('');
  const blocked = resumeArtifact.metadata.blocked_claims.map((item) => `<li><code>${escapeHtml(item.candidate_fact_id)}</code>: ${escapeHtml(item.blocked_claim_scopes.join(', '))}</li>`).join('') || '<li>None</li>';
  const findings = validation.validation_findings.map((item) => `<li>${escapeHtml(item.severity)} — ${escapeHtml(item.message)} (<code>${escapeHtml(item.rule_code)}</code>)</li>`).join('') || '<li>None</li>';
  const resume = resumeArtifact.content.sections.map((section) => `<section><h3>${escapeHtml(section.section)}</h3>${section.placeholder ? `<p>${escapeHtml(section.placeholder)}</p>` : `<ul>${section.statements.map((item) => `<li>${escapeHtml(item.text)} <small>${escapeHtml(item.statement_id)}</small></li>`).join('')}</ul>`}</section>`).join('');
  const semanticRows = semantic.entities.map((entity) => {
    const span = semantic.spans.find((item) => item.id === entity.evidence_span_id);
    return `<tr><td>${escapeHtml(entity.name)}</td><td>${escapeHtml(entity.entity_type)}</td><td>${escapeHtml(entity.decision_state)}</td><td>${escapeHtml(span?.section_name || 'unsectioned')}</td><td>${escapeHtml(span?.raw_text || '')}</td><td><details><summary>Provenance</summary><small>candidate: ${escapeHtml(entity.id)}<br>span: ${escapeHtml(entity.evidence_span_id)}<br>artifact version: ${escapeHtml(entity.artifact_version_id)}</small></details></td></tr>`;
  }).join('') || '<tr><td colspan="6">No semantic candidates.</td></tr>';
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const graphRows = graph.edges.map((edge) => `<tr><td>${escapeHtml(nodeById.get(edge.from_node_candidate_id)?.label || '')}</td><td>${escapeHtml(edge.edge_type)}</td><td>${escapeHtml(nodeById.get(edge.to_node_candidate_id)?.label || '')}</td><td>${escapeHtml(edge.decision_state)}</td><td><details><summary>Provenance</summary><small>${escapeHtml(edge.evidence_span_ids.join(', '))}: ${escapeHtml(edge.rationale)}</small></details></td></tr>`).join('') || '<tr><td colspan="5">No graph relationships.</td></tr>';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Career Evolution Platform Demo</title><style>body{font:16px system-ui;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#18212f}main{display:grid;grid-template-columns:1fr 1fr;gap:2rem}section{margin:1rem 0}code,small{color:#475569}h1{grid-column:1/-1}.status{padding:.4rem .7rem;background:#e2f3eb;border-radius:.4rem;display:inline-block}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:.45rem;text-align:left;vertical-align:top}</style><h1>Career Evolution Platform — Milestone 1 Demo</h1><p class="status">Validation: ${escapeHtml(validation.validation_status)}</p><p>${escapeHtml(knowledge.profile.name || 'Unnamed candidate')} · ${escapeHtml(job.snapshot.role_title)} at ${escapeHtml(job.snapshot.company)}</p><main><div><h2>Rendered resume preview</h2>${resume}</div><div><h2>Committed Candidate Knowledge coverage</h2><ul>${coverage}</ul><h2>Working resume evidence available</h2><p>${needs.available_working_evidence_summary.length} graph candidates are searchable working evidence, not committed coverage.</p><h2>Selections (included, omitted, deprioritized, blocked)</h2><ul>${selections}</ul><h2>Blocked claim scopes</h2><ul>${blocked}</ul><h2>Validation findings</h2><ul>${findings}</ul></div></main><section><h2>Resume Semantic Understanding</h2><p>${semantic.spans.length} evidence spans, ${semantic.entities.length} entity candidates, and ${semantic.relations.length} relation candidates.</p><table><thead><tr><th>Name</th><th>Entity type</th><th>Decision state</th><th>Source section</th><th>Evidence text</th><th>Details</th></tr></thead><tbody>${semanticRows}</tbody></table></section><section><h2>Resume Semantic Graph</h2><p>${graph.nodes.length} nodes and ${graph.edges.length} relationship candidates. Labels are primary; UUIDs remain secondary provenance.</p><table><thead><tr><th>From</th><th>Relationship</th><th>To</th><th>State</th><th>Provenance</th></tr></thead><tbody>${graphRows}</tbody></table></section><h2>Provenance and run references</h2><ul><li>Candidate profile: <code>${escapeHtml(knowledge.profile.id)}</code></li><li>Resume Semantic Run: <code>${escapeHtml(semantic.id)}</code></li><li>Resume Semantic Graph Run: <code>${escapeHtml(graph.id)}</code></li><li>Job Requirement Profile: <code>${escapeHtml(job.id)}</code></li><li>Information Need Run: <code>${escapeHtml(needs.id)}</code></li><li>Evidence Discovery Run: <code>${escapeHtml(discovery.id)}</code></li><li>Acquisition Plan Run: <code>${escapeHtml(acquisition.id)}</code></li><li>Integration Run: <code>${escapeHtml(integration.id)}</code></li><li>Tailoring Plan Run: <code>${escapeHtml(tailoring.id)}</code></li><li>Artifact Run: <code>${escapeHtml(artifact.id)}</code></li><li>Validation Run: <code>${escapeHtml(validation.id)}</code></li></ul></html>`;
}

function writeOutputs(outputDirectory, models) {
  const json = { 'candidate-knowledge.json': models.knowledge, 'resume-semantic-run.json': models.semantic, 'resume-semantic-graph-run.json': models.graph, 'job-requirement-profile.json': models.job, 'information-needs.json': models.needs, 'evidence-discovery.json': models.discovery, 'acquisition-plan.json': models.acquisition, 'integration-run.json': models.integration, 'tailoring-plan.json': models.tailoring, 'resume-artifact.json': models.artifact, 'validation-report.json': models.validation };
  for (const [name, value] of Object.entries(json)) fs.writeFileSync(path.join(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDirectory, 'resume.md'), markdown(models.artifact.resume_artifacts[0]));
  fs.writeFileSync(path.join(outputDirectory, 'report.html'), reportHtml(models));
}

function runDemo({ resumePath, jobInput, outputDirectory, capturePath }) {
  if (fs.existsSync(outputDirectory) && fs.readdirSync(outputDirectory).length) throw new Error(`Output directory must be empty for a new immutable run set: ${outputDirectory}`);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'career-evolution-demo-'));
  const store = new Store(path.join(temporaryDirectory, 'demo.db'));
  try {
    const resume = readResume(store, resumePath); const knowledge = resume.knowledge;
    const sourceArtifact = store.createSourceResumeArtifactVersion({ profileId: knowledge.profile.id, sourcePath: resumePath, parsedText: resume.parsedText });
    const semantic = runResumeSemanticUnderstanding(store, { profileId: knowledge.profile.id, artifactId: sourceArtifact.artifact.id });
    const graph = runResumeSemanticGraphConstruction(store, { semanticRunId: semantic.id });
    const jobDescription = readJob(jobInput); const identity = jobIdentity(jobDescription);
    const job = store.createJobRequirementProfile({ ...identity, jobDescription, sourceMetadata: { source: fs.existsSync(jobInput) ? 'local_job_file' : 'direct_text', demo: true } });
    const needs = store.createInformationNeedRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
    const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
    const acquisition = store.createAcquisitionPlanRun({ informationNeedRunId: needs.id, evidenceDiscoveryRunId: discovery.id });
    const fixture = loadFixture(capturePath); const { captures } = createCaptures(acquisition, fixture);
    const result = store.createAcquisitionResultRun({ acquisitionPlanRunId: acquisition.id, captures });
    const integration = store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: knowledge.profile.id, acquisitionResultRunId: result.id, proposals: proposalsFor(result, fixture) });
    const tailoring = store.createResumeTailoringPlanRun({ candidateProfileId: knowledge.profile.id, jobRequirementProfileId: job.id });
    const artifact = store.createResumeArtifactRun({ resumeTailoringPlanRunId: tailoring.id });
    const validation = store.createResumeValidationRun({ resumeArtifactRunId: artifact.id });
    const models = { knowledge: store.getCandidateKnowledge(knowledge.profile.id), semantic, graph, job, needs, discovery, acquisition, integration, tailoring, artifact, validation };
    writeOutputs(outputDirectory, models);
    return { ...models, outputDirectory };
  } finally { store.close(); fs.rmSync(temporaryDirectory, { recursive: true, force: true }); }
}

function summary(result) {
  const requirementNames = result.job.requirements.slice(0, 5).map((item) => item.normalized_name).join(', ') || 'none parsed';
  const coverage = countBy(result.tailoring.requirement_coverage, 'coverage_status');
  const selections = countBy(result.tailoring.resume_content_selections, 'selection_state');
  const findings = countBy(result.validation.validation_findings, 'severity');
  const semanticStates = countBy(result.semantic.entities, 'decision_state');
  const graphStates = countBy([...result.graph.nodes, ...result.graph.edges], 'decision_state');
  return [`Career Evolution Platform — Milestone 1 Demo`, `Candidate/profile import: imported (${result.knowledge.profile.name || 'unnamed profile'})`, `Resume semantic understanding: spans ${result.semantic.spans.length}, entities ${result.semantic.entities.length}, relations ${result.semantic.relations.length}; explicit ${semanticStates.explicit || 0}, possible ${semanticStates.possible || 0}`, `Resume semantic graph: nodes ${result.graph.nodes.length}, edges ${result.graph.edges.length}; explicit ${graphStates.explicit || 0}, derived_structurally ${graphStates.derived_structurally || 0}, possible ${graphStates.possible || 0}`, `Job: ${result.job.snapshot.role_title} at ${result.job.snapshot.company}`, `Requirements: ${result.job.requirements.length}; top: ${requirementNames}`, `Coverage: committed covered ${coverage.covered || 0}, partial ${coverage.partially_covered || 0}, uncovered ${coverage.uncovered || 0}; working resume evidence ${result.needs.available_working_evidence_summary.length}`, `Facts: included ${selections.include || 0}, deprioritized ${selections.deprioritize || 0}, omitted ${selections.omit || 0}, blocked ${selections.blocked || 0}`, `Validation: ${result.validation.validation_status}; findings: errors ${(findings.error || 0) + (findings.critical || 0)}, warnings ${findings.warning || 0}`, `Output directory: ${result.outputDirectory}`].join('\n');
}

function main() {
  const input = options(process.argv.slice(2));
  if (input.help) { console.log('Example: node src/demo.js --resume examples/synthetic-resume.txt --job examples/synthetic-job.txt --captures examples/synthetic-capture.json --output demo-output'); return; }
  const result = runDemo({ resumePath: required(input.resume, 'resume'), jobInput: required(input.job, 'job'), outputDirectory: required(input.output, 'output'), capturePath: input.captures });
  console.log(summary(result));
}

if (require.main === module) { try { main(); } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; } }

function extensionText(resumePath) { const extension = path.extname(resumePath).toLowerCase(); return extension === '.pdf' ? extractPdfText(resumePath) : fs.readFileSync(resumePath, 'utf8'); }
module.exports = { OUTPUT_FILES, runDemo, summary, jobIdentity };
