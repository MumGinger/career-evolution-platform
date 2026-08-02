#!/usr/bin/env node
const { Store } = require('./store');
const { generateApplicationPackage, recordUserEdit } = require('./service');

function options(args) { const result = {}; for (let i = 0; i < args.length; i += 1) if (args[i].startsWith('--')) result[args[i].slice(2)] = args[i + 1]; return result; }
function required(value, name) { if (!value) throw new Error(`Missing --${name}`); return value; }
function print(value) { console.log(JSON.stringify(value, null, 2)); }
const [command, ...args] = process.argv.slice(2);
const input = options(args);
const store = new Store(input.db || 'career-evolution.db');
try {
  switch (command) {
    case 'profile-create': print(store.createProfile({ name: required(input.name, 'name'), email: input.email, headline: input.headline, skills: (input.skills || '').split(',').map((v) => v.trim()).filter(Boolean) })); break;
    case 'application-create': print(store.createApplication({ profileId: required(input['profile-id'], 'profile-id'), company: required(input.company, 'company'), roleTitle: required(input['role-title'], 'role-title'), location: input.location, jobDescription: required(input['job-description'], 'job-description'), jobCategory: input['job-category'], applicationDate: input['application-date'] || new Date().toISOString().slice(0, 10) })); break;
    case 'application-generate': print(generateApplicationPackage(store, required(input['application-id'], 'application-id'))); break;
    case 'outcome-record': print(store.recordOutcome(required(input['application-id'], 'application-id'), required(input.outcome, 'outcome'), input.source)); break;
    case 'edit-record': print(recordUserEdit(store, required(input['application-id'], 'application-id'), required(input.description, 'description'))); break;
    case 'application-show': print(store.getApplication(required(input['application-id'], 'application-id'))); break;
    default: console.error('Commands: profile-create, application-create, application-generate, outcome-record, edit-record, application-show'); process.exitCode = 1;
  }
} catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; } finally { store.close(); }
