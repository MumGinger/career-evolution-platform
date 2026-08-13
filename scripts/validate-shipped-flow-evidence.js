const fs = require('node:fs');
const path = require('node:path');
const { shippedFlowEvidenceErrors } = require('../src/pre-beta-quality-gate');

const target = process.argv[2] || process.env.CEP_RUNTIME_EVIDENCE_PATH;
if (!target) {
  console.error('Usage: node scripts/validate-shipped-flow-evidence.js <runtime-evidence.json>');
  process.exit(2);
}

const resolved = path.resolve(target);
if (!fs.existsSync(resolved)) {
  console.error(`Natural shipped-flow evidence was not produced: ${resolved}`);
  process.exit(1);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(resolved, 'utf8'));
} catch (error) {
  console.error(`Runtime evidence is not valid JSON: ${error.message}`);
  process.exit(1);
}

const scorecardIdentity = { candidate_id: evidence.candidate_id };
const errors = shippedFlowEvidenceErrors(scorecardIdentity, evidence);
if (errors.length) {
  console.error('Runtime evidence is invalid:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  candidate_id: evidence.candidate_id,
  artifact_run_id: evidence.artifact_run_id,
  provider: evidence.shipped_flow.provider,
  completed_stages: evidence.shipped_flow.completed_stages,
  runtime_evidence_valid: true,
}, null, 2));
