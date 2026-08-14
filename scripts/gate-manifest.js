#!/usr/bin/env node
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { classifyChangeScope, generateGateManifest, validateGateManifest } = require('../src/delivery-gates');

function options(argv) {
  const result = { outcomes: {}, artifacts: {}, changedFiles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    index += 1;
    if (key === '--outcome') {
      const [name, status] = value.split('=', 2);
      result.outcomes[name] = status;
    } else if (key === '--artifact') {
      const [name, filePath] = value.split('=', 2);
      result.artifacts[name] = filePath;
    } else if (key === '--changed-file') result.changedFiles.push(value);
    else result[key.slice(2)] = value;
  }
  return result;
}

function changedFiles(base, head) {
  return childProcess.execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean);
}

function main() {
  const [command, ...argv] = process.argv.slice(2);
  const input = options(argv);
  if (command === 'scope') {
    if (!input.base || !input.head) throw new Error('scope requires --base and --head');
    console.log(classifyChangeScope(changedFiles(input.base, input.head)));
    return;
  }
  if (command === 'generate') {
    if (!input.output || !input.revision) throw new Error('generate requires --output and --revision');
    const files = input.changedFiles.length ? input.changedFiles : changedFiles(input.base, input.head || input.revision);
    const manifest = generateGateManifest({
      revision: input.revision,
      runId: input['run-id'] || process.env.GITHUB_RUN_ID,
      repository: input.repository || process.env.GITHUB_REPOSITORY,
      changedFiles: files,
      outcomes: input.outcomes,
      artifacts: input.artifacts,
    });
    fs.mkdirSync(path.dirname(path.resolve(input.output)), { recursive: true });
    fs.writeFileSync(input.output, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify({ scope: manifest.scope, revision: manifest.revision, output: input.output }, null, 2));
    return;
  }
  if (command === 'validate') {
    if (!input.input) throw new Error('validate requires --input');
    const manifest = JSON.parse(fs.readFileSync(input.input, 'utf8'));
    const errors = validateGateManifest(manifest, { expectedRevision: input['expected-revision'] });
    if (errors.length) {
      for (const error of errors) console.error(`Gate Manifest validation failed: ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ revision: manifest.revision, scope: manifest.scope, gate_manifest: 'valid' }, null, 2));
    return;
  }
  throw new Error('Usage: gate-manifest.js <scope|generate|validate>');
}

try { main(); }
catch (error) { console.error(error.message); process.exit(2); }
