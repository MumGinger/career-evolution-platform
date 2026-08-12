#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { evaluateScorecard } = require('../src/pre-beta-quality-gate');

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/check-pre-beta-quality.js <scorecard.json>');
    process.exit(2);
  }

  let scorecard;
  try {
    scorecard = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  } catch (error) {
    console.error(`Could not read scorecard: ${error.message}`);
    process.exit(2);
  }

  let result;
  try {
    result = evaluateScorecard(scorecard);
  } catch (error) {
    console.error(`Invalid scorecard: ${error.message}`);
    process.exit(2);
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.beta_ready ? 0 : 1);
}

main();
