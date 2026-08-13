#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { evaluateScorecard } = require('../src/pre-beta-quality-gate');

function readJson(input, label) {
  if (!input) return null;
  try {
    return JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  } catch (error) {
    console.error(`Could not read ${label}: ${error.message}`);
    process.exit(2);
  }
}

function main() {
  const scorecardPath = process.argv[2];
  const runtimeEvidencePath = process.argv[3];
  if (!scorecardPath) {
    console.error('Usage: node scripts/check-pre-beta-quality.js <scorecard.json> [runtime-evidence.json]');
    process.exit(2);
  }

  const scorecard = readJson(scorecardPath, 'scorecard');
  const runtimeEvidence = readJson(runtimeEvidencePath, 'runtime evidence');

  let result;
  try {
    result = evaluateScorecard(scorecard, runtimeEvidence);
  } catch (error) {
    console.error(`Invalid scorecard: ${error.message}`);
    process.exit(2);
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.beta_ready ? 0 : 1);
}

main();
