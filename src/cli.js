#!/usr/bin/env node
const { Store } = require('./store');
const { generateApplicationPackage, recordUserEdit } = require('./service');
const { importResume } = require('./resume');

function options(args) { const result = {}; for (let i = 0; i < args.length; i += 1) if (args[i].startsWith('--')) result[args[i].slice(2)] = args[i + 1]; return result; }
function required(value, name) { if (!value) throw new Error(`Missing --${name}`); return value; }
function print(value) { console.log(JSON.stringify(value, null, 2)); }
const [command, ...args] = process.argv.slice(2);
const input = options(args);
const store = new Store(input.db || 'career-evolution.db');
try {
  switch (command) {
    case 'profile-create': print(store.createProfile({ name: required(input.name, 'name'), email: input.email, headline: input.headline, skills: (input.skills || '').split(',').map((v) => v.trim()).filter(Boolean) })); break;
    case 'resume-import': print(importResume(store, required(input['pdf-path'], 'pdf-path'))); break;
    case 'profile-show': print(store.getCandidateKnowledge(required(input['profile-id'], 'profile-id'))); break;
    case 'application-create': print(store.createApplication({ profileId: required(input['profile-id'], 'profile-id'), company: required(input.company, 'company'), roleTitle: required(input['role-title'], 'role-title'), location: input.location, jobDescription: required(input['job-description'], 'job-description'), jobCategory: input['job-category'], applicationDate: input['application-date'] || new Date().toISOString().slice(0, 10) })); break;
    case 'application-generate': print(generateApplicationPackage(store, required(input['application-id'], 'application-id'))); break;
    case 'outcome-record': print(store.recordOutcome(required(input['application-id'], 'application-id'), required(input.outcome, 'outcome'), input.source)); break;
    case 'edit-record': print(recordUserEdit(store, required(input['application-id'], 'application-id'), required(input.description, 'description'))); break;
    case 'application-show': print(store.getApplication(required(input['application-id'], 'application-id'))); break;
    case 'job-profile-create': print(store.createJobRequirementProfile({ company: required(input.company, 'company'), roleTitle: required(input['role-title'], 'role-title'), jobDescription: required(input['job-description'], 'job-description'), location: input.location, sourceUrl: input['source-url'], sourceMetadata: input['source-metadata'] ? JSON.parse(input['source-metadata']) : {} })); break;
    case 'job-profile-show': print(store.getJobRequirementProfile(required(input['job-profile-id'], 'job-profile-id'))); break;
    case 'information-needs-create': print(store.createInformationNeedRun({ candidateProfileId: required(input['candidate-profile-id'], 'candidate-profile-id'), jobRequirementProfileId: required(input['job-profile-id'], 'job-profile-id') })); break;
    case 'information-needs-show': print(store.getInformationNeedRun(required(input['information-need-run-id'], 'information-need-run-id'))); break;
    case 'evidence-discovery-create': print(store.createEvidenceDiscoveryRun({ informationNeedRunId: required(input['information-need-run-id'], 'information-need-run-id'), informationNeedId: input['information-need-id'] })); break;
    case 'evidence-discovery-show': print(store.getEvidenceDiscoveryRun(required(input['evidence-discovery-run-id'], 'evidence-discovery-run-id'))); break;
    default: console.error('Commands: profile-create, resume-import, profile-show, application-create, application-generate, outcome-record, edit-record, application-show, job-profile-create, job-profile-show, information-needs-create, information-needs-show, evidence-discovery-create, evidence-discovery-show'); process.exitCode = 1;
  }
} catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; } finally { store.close(); }
