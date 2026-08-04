#!/usr/bin/env node
const { Store } = require('./store');
const { generateApplicationPackage, recordUserEdit } = require('./service');
const { importResume } = require('./resume');
const { runResumeSemanticUnderstanding } = require('./resume-semantic');
const { runResumeSemanticGraphConstruction } = require('./resume-semantic-graph');
const understanding = require('./career-understanding');

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
    case 'resume-artifact-import': {
      const { extractPdfText } = require('./resume');
      const pdfPath = required(input['pdf-path'], 'pdf-path');
      print(store.createSourceResumeArtifactVersion({ profileId: required(input['candidate-profile-id'], 'candidate-profile-id'), sourcePath: pdfPath, parsedText: extractPdfText(pdfPath) })); break;
    }
    case 'resume-semantic-understand': print(runResumeSemanticUnderstanding(store, { profileId: required(input['candidate-profile-id'], 'candidate-profile-id'), artifactId: required(input['resume-artifact-id'], 'resume-artifact-id') })); break;
    case 'resume-semantic-show': print(store.getResumeSemanticRun(required(input['resume-semantic-run-id'], 'resume-semantic-run-id'))); break;
    case 'resume-semantic-graph-create': print(runResumeSemanticGraphConstruction(store, { semanticRunId: required(input['resume-semantic-run-id'], 'resume-semantic-run-id') })); break;
    case 'resume-semantic-graph-show': print(store.getResumeSemanticGraphRun(required(input['resume-semantic-graph-run-id'], 'resume-semantic-graph-run-id'))); break;
    case 'profile-show': print(store.getCandidateKnowledge(required(input['profile-id'], 'profile-id'))); break;
    case 'career-snapshot-show': { const run = input['snapshot-run-id'] ? store.getCareerUnderstandingSnapshotRun(input['snapshot-run-id']) : store.createCareerUnderstandingSnapshotRun({ candidateProfileId: required(input['candidate-profile-id'], 'candidate-profile-id') }); if (input.format === 'text') console.log(understanding.readable(run)); else print(run); break; }
    case 'career-snapshot-feedback': print(store.recordCareerUnderstandingFeedback({ snapshotRunId: required(input['snapshot-run-id'], 'snapshot-run-id'), action: required(input.action, 'action'), note: input.note })); break;
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
    case 'acquisition-plan-create': print(store.createAcquisitionPlanRun({ informationNeedRunId: required(input['information-need-run-id'], 'information-need-run-id'), evidenceDiscoveryRunId: required(input['evidence-discovery-run-id'], 'evidence-discovery-run-id') })); break;
    case 'acquisition-plan-show': print(store.getAcquisitionPlanRun(required(input['acquisition-plan-run-id'], 'acquisition-plan-run-id'))); break;
    case 'acquisition-execution-create': print(store.createAcquisitionResultRun({ acquisitionPlanRunId: required(input['acquisition-plan-run-id'], 'acquisition-plan-run-id'), captures: JSON.parse(required(input.captures, 'captures')) })); break;
    case 'acquisition-execution-show': print(store.getAcquisitionResultRun(required(input['acquisition-result-run-id'], 'acquisition-result-run-id'))); break;
    case 'candidate-knowledge-integrate': print(store.createCandidateKnowledgeIntegrationRun({ candidateProfileId: required(input['candidate-profile-id'], 'candidate-profile-id'), evidenceDiscoveryRunId: input['evidence-discovery-run-id'], acquisitionResultRunId: input['acquisition-result-run-id'], proposals: JSON.parse(required(input.proposals, 'proposals')) })); break;
    case 'candidate-knowledge-integration-show': print(store.getCandidateKnowledgeIntegrationRun(required(input['integration-run-id'], 'integration-run-id'))); break;
    case 'resume-tailoring-plan-create': print(store.createResumeTailoringPlanRun({ candidateProfileId: required(input['candidate-profile-id'], 'candidate-profile-id'), jobRequirementProfileId: required(input['job-profile-id'], 'job-profile-id'), sourceResumeArtifact: input['source-resume-artifact'] ? JSON.parse(input['source-resume-artifact']) : null })); break;
    case 'resume-tailoring-plan-show': print(store.getResumeTailoringPlanRun(required(input['resume-tailoring-plan-run-id'], 'resume-tailoring-plan-run-id'))); break;
    case 'resume-artifact-create': print(store.createResumeArtifactRun({ resumeTailoringPlanRunId: required(input['resume-tailoring-plan-run-id'], 'resume-tailoring-plan-run-id') })); break;
    case 'resume-artifact-show': print(store.getResumeArtifactRun(required(input['resume-artifact-run-id'], 'resume-artifact-run-id'))); break;
    case 'resume-artifact-validate': print(store.createResumeValidationRun({ resumeArtifactRunId: required(input['resume-artifact-run-id'], 'resume-artifact-run-id'), validationPolicyVersion: input['validation-policy-version'] })); break;
    case 'resume-validation-show': print(store.getResumeValidationRun(required(input['resume-validation-run-id'], 'resume-validation-run-id'))); break;
    default: console.error('Commands include career-snapshot-show and career-snapshot-feedback.'); process.exitCode = 1;
  }
} catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; } finally { store.close(); }
