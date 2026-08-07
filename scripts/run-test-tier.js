#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TESTS = path.join(ROOT, 'tests');
const HTTP_CONTRACT_ROOT_FILES = new Set([
  'beta-ui.test.js',
  'complete-resume-beta-regression.test.js',
]);

function testFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory()
      ? testFiles(path.join(directory, entry.name))
      : entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js')
        ? [path.join(directory, entry.name)]
        : [])
    .sort();
}

function rootTests() {
  return fs.readdirSync(TESTS, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.js'))
    .map((entry) => path.join(TESTS, entry.name))
    .sort();
}

function run(command, args, label, env = process.env) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(`${label} could not start: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

function runNodeTests(files, label) {
  if (!files.length) {
    console.error(`${label} has no test files.`);
    return 1;
  }
  return run(process.execPath, ['--test', ...files], label);
}

function unit() {
  return runNodeTests(testFiles(path.join(TESTS, 'unit')), 'Unit tests');
}

function integration() {
  const files = rootTests().filter((file) => !HTTP_CONTRACT_ROOT_FILES.has(path.basename(file)));
  return runNodeTests(files, 'Integration tests');
}

function httpContract() {
  const legacyContracts = rootTests().filter((file) => HTTP_CONTRACT_ROOT_FILES.has(path.basename(file)));
  const independentContracts = testFiles(path.join(TESTS, 'http-contract'));
  return runNodeTests([...legacyContracts, ...independentContracts], 'HTTP and applicant contract tests');
}

function browserE2e() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return run(npx, [
    'playwright',
    'test',
    '--config=playwright.config.js',
    '--workers=1',
  ], 'Real browser end-to-end tests');
}

function providerSmoke() {
  return runNodeTests(testFiles(path.join(TESTS, 'provider-smoke')), 'Real-provider operational smoke');
}

const runners = {
  unit,
  integration,
  'http-contract': httpContract,
  'browser-e2e': browserE2e,
  'provider-smoke': providerSmoke,
};

function main() {
  const tier = process.argv[2];
  if (tier === 'all') {
    for (const name of ['unit', 'integration', 'http-contract', 'browser-e2e']) {
      const status = runners[name]();
      if (status) process.exit(status);
    }
    return;
  }
  if (!runners[tier]) {
    console.error(`Unknown test tier: ${tier || '(missing)'}`);
    console.error(`Choose one of: ${[...Object.keys(runners), 'all'].join(', ')}`);
    process.exit(2);
  }
  process.exit(runners[tier]());
}

main();
