const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const { PARSER_VERSION, POLICY_VERSION, hash, parseJobDescription } = require('./job-intelligence');
const { POLICY_VERSION: INFORMATION_NEEDS_POLICY_VERSION, evaluateRequirement, normalize } = require('./information-needs');
const discovery = require('./evidence-discovery');

const SKILL = {
  id: 'application-tailoring', version: '0.1.0',
  purpose: 'Create a transparent, job-specific application artifact.',
  scope: 'Single candidate application tailoring in the local MVP.',
  guidance: 'Match only candidate-provided experience to stated job requirements.', status: 'active',
};

class Store {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS candidate_profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, headline TEXT, skills TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), company TEXT NOT NULL, role_title TEXT NOT NULL, location TEXT, job_description TEXT NOT NULL, job_category TEXT, application_date TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS skill_definitions (id TEXT NOT NULL, version TEXT NOT NULL, purpose TEXT NOT NULL, scope TEXT NOT NULL, guidance TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (id, version)) STRICT;
      CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id), artifact_type TEXT NOT NULL, content TEXT NOT NULL, version INTEGER NOT NULL, skill_id TEXT NOT NULL, skill_version TEXT NOT NULL, model_metadata TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(application_id, artifact_type, version), FOREIGN KEY (skill_id, skill_version) REFERENCES skill_definitions(id, version)) STRICT;
      CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id), evidence_type TEXT NOT NULL, value TEXT NOT NULL, classification TEXT NOT NULL, captured_at TEXT NOT NULL, source TEXT NOT NULL, confidence TEXT NOT NULL, limitations TEXT NOT NULL, supports_skill_update INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_imports (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), source_path TEXT NOT NULL, imported_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS candidate_facts (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), resume_import_id TEXT NOT NULL REFERENCES resume_imports(id), entity_type TEXT NOT NULL, value TEXT NOT NULL, source TEXT NOT NULL, confidence TEXT NOT NULL, confirmation_status TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS job_description_snapshots (id TEXT PRIMARY KEY, company TEXT NOT NULL, role_title TEXT NOT NULL, location TEXT NOT NULL, description TEXT NOT NULL, description_hash TEXT NOT NULL, source_url TEXT NOT NULL, source_metadata TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS job_requirement_profiles (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES job_description_snapshots(id), version INTEGER NOT NULL, parser_version TEXT NOT NULL, policy_version TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(snapshot_id, version)) STRICT;
      CREATE TABLE IF NOT EXISTS job_requirements (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES job_requirement_profiles(id), normalized_name TEXT NOT NULL, supporting_excerpts TEXT NOT NULL, category TEXT NOT NULL, explicitness TEXT NOT NULL, importance_level TEXT NOT NULL, importance_score INTEGER NOT NULL, importance_rationale TEXT NOT NULL, resume_value_level TEXT NOT NULL, resume_value_score INTEGER NOT NULL, resume_value_rationale TEXT NOT NULL, source_metadata TEXT NOT NULL, parser_version TEXT NOT NULL, policy_version TEXT NOT NULL, uncertainty TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS information_need_runs (id TEXT PRIMARY KEY, candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), job_requirement_profile_id TEXT NOT NULL REFERENCES job_requirement_profiles(id), job_requirement_profile_version INTEGER NOT NULL, policy_version TEXT NOT NULL, candidate_evidence_snapshot TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS information_needs (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES information_need_runs(id), job_requirement_id TEXT NOT NULL REFERENCES job_requirements(id), status TEXT NOT NULL CHECK(status IN ('supported', 'needs_confirmation', 'unknown')), priority_level TEXT NOT NULL CHECK(priority_level IN ('none', 'low', 'medium', 'high')), priority_score INTEGER NOT NULL, importance TEXT NOT NULL, resume_value TEXT NOT NULL, discoverability TEXT NOT NULL, acquisition_cost TEXT NOT NULL, existing_evidence TEXT NOT NULL, matched_fact_ids TEXT NOT NULL, rationale TEXT NOT NULL, uncertainty TEXT NOT NULL, policy_version TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(run_id, job_requirement_id)) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_discovery_runs (id TEXT PRIMARY KEY, information_need_run_id TEXT NOT NULL REFERENCES information_need_runs(id), discovery_policy_version TEXT NOT NULL, source_snapshot TEXT NOT NULL, selected_information_need_ids TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_source_searches (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), source_type TEXT NOT NULL CHECK(source_type IN ('candidate_fact', 'profile_skill', 'resume_import')), source_reference TEXT NOT NULL, availability_status TEXT NOT NULL, search_order INTEGER NOT NULL, adapter_version TEXT NOT NULL, result_status TEXT NOT NULL, rationale TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_candidates (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), job_requirement_id TEXT NOT NULL REFERENCES job_requirements(id), source_type TEXT NOT NULL, source_reference TEXT NOT NULL, normalized_claim TEXT NOT NULL, supporting_value TEXT NOT NULL, supporting_text TEXT NOT NULL, extraction_method TEXT NOT NULL, confidence_level TEXT NOT NULL CHECK(confidence_level IN ('high', 'medium', 'low')), parser_version TEXT NOT NULL, provenance TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_resolutions (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), evidence_candidate_id TEXT NOT NULL UNIQUE REFERENCES evidence_candidates(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), state TEXT NOT NULL CHECK(state IN ('accepted_for_need', 'needs_confirmation', 'rejected', 'conflicting')), rationale TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_need_results (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), sufficient INTEGER NOT NULL, terminal_status TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(discovery_run_id, information_need_id)) STRICT;
    `);
    this.seedSkill();
  }
  now() { return new Date().toISOString(); }
  id() { return randomUUID(); }
  seedSkill() {
    this.db.prepare('INSERT OR IGNORE INTO skill_definitions (id, version, purpose, scope, guidance, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(SKILL.id, SKILL.version, SKILL.purpose, SKILL.scope, SKILL.guidance, SKILL.status, this.now());
  }
  createProfile({ name, email = '', headline = '', skills = [] }) {
    const profile = { id: this.id(), name, email, headline, skills: JSON.stringify(skills), created_at: this.now() };
    this.db.prepare('INSERT INTO candidate_profiles VALUES (?, ?, ?, ?, ?, ?)').run(profile.id, profile.name, profile.email, profile.headline, profile.skills, profile.created_at);
    return this.getProfile(profile.id);
  }
  getProfile(id) {
    const profile = this.db.prepare('SELECT * FROM candidate_profiles WHERE id = ?').get(id);
    if (!profile) throw new Error(`Candidate profile not found: ${id}`);
    return { ...profile, skills: JSON.parse(profile.skills) };
  }
  createApplication(input) {
    this.getProfile(input.profileId);
    const app = { id: this.id(), profile_id: input.profileId, company: input.company, role_title: input.roleTitle, location: input.location || '', job_description: input.jobDescription, job_category: input.jobCategory || '', application_date: input.applicationDate, status: 'prepared', created_at: this.now() };
    this.db.prepare('INSERT INTO applications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(app.id, app.profile_id, app.company, app.role_title, app.location, app.job_description, app.job_category, app.application_date, app.status, app.created_at);
    return this.getApplication(app.id);
  }
  createResumeProfile({ sourcePath, basic = {}, facts = [] }) {
    const profile = this.createProfile({ name: basic.name || '', email: basic.email || '', headline: basic.headline || '', skills: [] });
    const resumeImport = { id: this.id(), profile_id: profile.id, source_path: sourcePath, imported_at: this.now() };
    this.db.prepare('INSERT INTO resume_imports VALUES (?, ?, ?, ?)').run(resumeImport.id, resumeImport.profile_id, resumeImport.source_path, resumeImport.imported_at);
    for (const fact of facts) {
      this.db.prepare('INSERT INTO candidate_facts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), profile.id, resumeImport.id, fact.entity_type, JSON.stringify(fact.value), 'resume', 'parsed', fact.confirmation_status, this.now());
    }
    return this.getCandidateKnowledge(profile.id);
  }
  getCandidateKnowledge(profileId) {
    const profile = this.getProfile(profileId);
    const facts = this.db.prepare('SELECT * FROM candidate_facts WHERE profile_id = ? ORDER BY entity_type, created_at').all(profileId).map((row) => ({ ...row, value: JSON.parse(row.value) }));
    return { profile, facts };
  }
  getCandidateEvidenceSnapshot(profileId) {
    const knowledge = this.getCandidateKnowledge(profileId);
    const profileSkills = knowledge.profile.skills
      .map((name, index) => ({ name, index }))
      .map(({ name, index }) => ({
      id: `profile_skill:${knowledge.profile.id}:${index}`,
      entity_type: 'skill',
      value: { name },
      source: 'profile_skill',
      confidence: 'explicit',
      confirmation_status: 'confirmed',
      }));
    return { ...knowledge, facts: [...knowledge.facts, ...profileSkills] };
  }
  createJobRequirementProfile({ company, roleTitle, jobDescription, location = '', sourceUrl = '', sourceMetadata = {} }) {
    const snapshotMetadata = JSON.stringify(sourceMetadata);
    let snapshot = this.db.prepare('SELECT * FROM job_description_snapshots WHERE company = ? AND role_title = ? AND location = ? AND description_hash = ? AND source_url = ? AND source_metadata = ?').get(company, roleTitle, location, hash(jobDescription), sourceUrl, snapshotMetadata);
    if (!snapshot) {
      snapshot = { id: this.id(), company, role_title: roleTitle, location, description: jobDescription, description_hash: hash(jobDescription), source_url: sourceUrl, source_metadata: snapshotMetadata, created_at: this.now() };
      this.db.prepare('INSERT INTO job_description_snapshots VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(snapshot.id, snapshot.company, snapshot.role_title, snapshot.location, snapshot.description, snapshot.description_hash, snapshot.source_url, snapshot.source_metadata, snapshot.created_at);
    }
    const version = this.db.prepare('SELECT COALESCE(MAX(version), 0) + 1 AS version FROM job_requirement_profiles WHERE snapshot_id = ?').get(snapshot.id).version;
    const profile = { id: this.id(), snapshot_id: snapshot.id, version, parser_version: PARSER_VERSION, policy_version: POLICY_VERSION, created_at: this.now() };
    this.db.prepare('INSERT INTO job_requirement_profiles VALUES (?, ?, ?, ?, ?, ?)').run(profile.id, profile.snapshot_id, profile.version, profile.parser_version, profile.policy_version, profile.created_at);
    for (const requirement of parseJobDescription({ roleTitle, jobDescription })) {
      const explicit = requirement.explicitness.includes('required') ? 'required' : requirement.explicitness.includes('preferred') ? 'preferred' : requirement.explicitness.includes('responsibility-derived') ? 'responsibility-derived' : 'contextual';
      this.db.prepare('INSERT INTO job_requirements VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), profile.id, requirement.normalized_name, JSON.stringify(requirement.excerpts), requirement.category, explicit, requirement.importance_level, requirement.importance_score, requirement.importance_rationale, requirement.resume_value_level, requirement.resume_value_score, requirement.resume_value_rationale, JSON.stringify({ snapshot_id: snapshot.id, description_hash: snapshot.description_hash, source_url: sourceUrl, source_metadata: sourceMetadata }), PARSER_VERSION, POLICY_VERSION, requirement.uncertainty, this.now());
    }
    return this.getJobRequirementProfile(profile.id);
  }
  getJobRequirementProfile(id) {
    const profile = this.db.prepare('SELECT * FROM job_requirement_profiles WHERE id = ?').get(id);
    if (!profile) throw new Error(`Job requirement profile not found: ${id}`);
    const snapshot = this.db.prepare('SELECT * FROM job_description_snapshots WHERE id = ?').get(profile.snapshot_id);
    const requirements = this.db.prepare('SELECT * FROM job_requirements WHERE profile_id = ? ORDER BY importance_score DESC, normalized_name').all(id).map((row) => ({ ...row, supporting_excerpts: JSON.parse(row.supporting_excerpts), source_metadata: JSON.parse(row.source_metadata) }));
    return { ...profile, snapshot: { ...snapshot, source_metadata: JSON.parse(snapshot.source_metadata) }, requirements };
  }
  createInformationNeedRun({ candidateProfileId, jobRequirementProfileId }) {
    const knowledge = this.getCandidateEvidenceSnapshot(candidateProfileId);
    const jobProfile = this.getJobRequirementProfile(jobRequirementProfileId);
    const run = { id: this.id(), candidate_profile_id: candidateProfileId, job_requirement_profile_id: jobRequirementProfileId, job_requirement_profile_version: jobProfile.version, policy_version: INFORMATION_NEEDS_POLICY_VERSION, candidate_evidence_snapshot: JSON.stringify(knowledge.facts), created_at: this.now() };
    this.db.prepare('INSERT INTO information_need_runs VALUES (?, ?, ?, ?, ?, ?, ?)').run(run.id, run.candidate_profile_id, run.job_requirement_profile_id, run.job_requirement_profile_version, run.policy_version, run.candidate_evidence_snapshot, run.created_at);
    for (const requirement of jobProfile.requirements) {
      const result = evaluateRequirement(requirement, knowledge.facts);
      const rationale = `Importance: ${result.importance.rationale} Resume Value: ${result.resume_value.rationale} Discoverability: ${result.discoverability.rationale} Acquisition Cost: ${result.acquisition_cost.rationale} Existing Evidence: ${result.existing_evidence.rationale}`;
      this.db.prepare('INSERT INTO information_needs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, requirement.id, result.status, result.priority_level, result.priority_score, JSON.stringify(result.importance), JSON.stringify(result.resume_value), JSON.stringify(result.discoverability), JSON.stringify(result.acquisition_cost), JSON.stringify(result.existing_evidence), JSON.stringify(result.matched_fact_ids), rationale, result.uncertainty, INFORMATION_NEEDS_POLICY_VERSION, this.now());
    }
    return this.getInformationNeedRun(run.id);
  }
  getInformationNeedRun(id) {
    const run = this.db.prepare('SELECT * FROM information_need_runs WHERE id = ?').get(id);
    if (!run) throw new Error(`Information need run not found: ${id}`);
    const needs = this.db.prepare(`SELECT information_needs.*, job_requirements.normalized_name, job_requirements.category FROM information_needs JOIN job_requirements ON job_requirements.id = information_needs.job_requirement_id WHERE run_id = ? ORDER BY CASE priority_level WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END DESC, priority_score DESC, normalized_name`).all(id).map((row) => ({ ...row, importance: JSON.parse(row.importance), resume_value: JSON.parse(row.resume_value), discoverability: JSON.parse(row.discoverability), acquisition_cost: JSON.parse(row.acquisition_cost), existing_evidence: JSON.parse(row.existing_evidence), matched_fact_ids: JSON.parse(row.matched_fact_ids) }));
    return { ...run, candidate_evidence_snapshot: JSON.parse(run.candidate_evidence_snapshot), candidate_profile: this.getProfile(run.candidate_profile_id), job_requirement_profile: this.getJobRequirementProfile(run.job_requirement_profile_id), information_needs: needs };
  }
  createEvidenceDiscoveryRun({ informationNeedRunId, informationNeedId }) {
    const informationNeedRun = this.getInformationNeedRun(informationNeedRunId);
    const allNeeds = informationNeedRun.information_needs;
    const selected = informationNeedId
      ? allNeeds.filter((need) => need.id === informationNeedId && need.status !== 'supported')
      : allNeeds.filter((need) => need.status === 'unknown' || need.status === 'needs_confirmation');
    if (informationNeedId && !selected.length) throw new Error('Focused Information Need must exist in the run and remain unresolved');
    if (!informationNeedId && !selected.length) throw new Error('Information Need Run has no unresolved needs to discover');
    const snapshot = informationNeedRun.candidate_evidence_snapshot;
    const run = { id: this.id(), information_need_run_id: informationNeedRunId, discovery_policy_version: discovery.POLICY_VERSION, source_snapshot: JSON.stringify(snapshot), selected_information_need_ids: JSON.stringify(selected.map((need) => need.id)), created_at: this.now() };
    this.db.prepare('INSERT INTO evidence_discovery_runs VALUES (?, ?, ?, ?, ?, ?)').run(run.id, run.information_need_run_id, run.discovery_policy_version, run.source_snapshot, run.selected_information_need_ids, run.created_at);
    const requirements = new Map(informationNeedRun.job_requirement_profile.requirements.map((requirement) => [requirement.id, requirement]));
    for (const need of selected) {
      const requirement = requirements.get(need.job_requirement_id);
      let sufficient = false;
      let resultRationale = 'No sources have been searched.';
      for (const [index, sourceType] of discovery.SOURCE_ORDER.entries()) {
        const sourceFacts = snapshot.filter((fact) => discovery.sourceFor(fact) === sourceType);
        const search = { id: this.id(), discovery_run_id: run.id, information_need_id: need.id, source_type: sourceType, source_reference: `${sourceType}:snapshot`, availability_status: sourceFacts.length ? 'available' : 'available_empty', search_order: index + 1, adapter_version: discovery.ADAPTER_VERSION, result_status: sufficient ? 'skipped_sufficient' : 'completed', rationale: sufficient ? 'Skipped because higher-priority source evidence already satisfied the bounded need.' : 'Searched only the immutable Information Need Run evidence snapshot using deterministic exact matching and explicit aliases.', limitations: 'No external connector, semantic inference, or Candidate Knowledge update is performed.', created_at: this.now() };
        if (!sufficient) {
          const candidates = discovery.matches(requirement, sourceFacts).map((fact) => discovery.candidateFor(need, fact, sourceType));
          const resolutions = discovery.resolve(candidates);
          const resolved = candidates.map((candidate, candidateIndex) => ({ candidate, resolution: resolutions[candidateIndex] }));
          for (const item of resolved) {
            const candidateId = this.id();
            this.db.prepare('INSERT INTO evidence_candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(candidateId, run.id, item.candidate.information_need_id, item.candidate.job_requirement_id, item.candidate.source_type, item.candidate.source_reference, item.candidate.normalized_claim, JSON.stringify(item.candidate.supporting_value), item.candidate.supporting_text, item.candidate.extraction_method, item.candidate.confidence_level, item.candidate.parser_version, JSON.stringify(item.candidate.provenance), item.candidate.limitations, this.now());
            this.db.prepare('INSERT INTO evidence_resolutions VALUES (?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, candidateId, need.id, item.resolution.state, item.resolution.rationale, this.now());
          }
          const current = this.getDiscoveryCandidates(run.id, need.id);
          const evaluation = discovery.sufficiency(current);
          sufficient = evaluation.sufficient;
          resultRationale = evaluation.rationale;
          search.result_status = candidates.length ? 'completed_with_candidates' : 'completed_no_candidates';
        }
        this.db.prepare('INSERT INTO evidence_source_searches VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(search.id, search.discovery_run_id, search.information_need_id, search.source_type, search.source_reference, search.availability_status, search.search_order, search.adapter_version, search.result_status, search.rationale, search.limitations, search.created_at);
      }
      this.db.prepare('INSERT INTO evidence_need_results VALUES (?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, need.id, sufficient ? 1 : 0, sufficient ? 'sufficient' : 'unresolved_after_search', resultRationale, this.now());
    }
    return this.getEvidenceDiscoveryRun(run.id);
  }
  getDiscoveryCandidates(runId, informationNeedId) {
    return this.db.prepare(`SELECT evidence_candidates.*, evidence_resolutions.state AS resolution_state, evidence_resolutions.rationale AS resolution_rationale FROM evidence_candidates JOIN evidence_resolutions ON evidence_resolutions.evidence_candidate_id = evidence_candidates.id WHERE evidence_candidates.discovery_run_id = ? AND evidence_candidates.information_need_id = ? ORDER BY evidence_candidates.created_at, evidence_candidates.id`).all(runId, informationNeedId).map((row) => ({ candidate: { ...row, supporting_value: JSON.parse(row.supporting_value), provenance: JSON.parse(row.provenance) }, resolution: { state: row.resolution_state, rationale: row.resolution_rationale } }));
  }
  getEvidenceDiscoveryRun(id) {
    const run = this.db.prepare('SELECT * FROM evidence_discovery_runs WHERE id = ?').get(id);
    if (!run) throw new Error(`Evidence Discovery Run not found: ${id}`);
    const sourceSearches = this.db.prepare('SELECT * FROM evidence_source_searches WHERE discovery_run_id = ? ORDER BY information_need_id, search_order').all(id);
    const results = this.db.prepare('SELECT * FROM evidence_need_results WHERE discovery_run_id = ? ORDER BY created_at, id').all(id).map((result) => ({ ...result, sufficient: Boolean(result.sufficient), candidates: this.getDiscoveryCandidates(id, result.information_need_id) }));
    return { ...run, source_snapshot: JSON.parse(run.source_snapshot), selected_information_need_ids: JSON.parse(run.selected_information_need_ids), source_searches: sourceSearches, need_results: results, information_need_run: this.getInformationNeedRun(run.information_need_run_id) };
  }
  createArtifact({ applicationId, artifactType, content, modelMetadata }) {
    const version = this.db.prepare('SELECT COALESCE(MAX(version), 0) + 1 AS version FROM artifacts WHERE application_id = ? AND artifact_type = ?').get(applicationId, artifactType).version;
    const artifact = { id: this.id(), applicationId, artifactType, content: JSON.stringify(content), version, skill_id: SKILL.id, skill_version: SKILL.version, model_metadata: JSON.stringify(modelMetadata), created_at: this.now() };
    this.db.prepare('INSERT INTO artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(artifact.id, artifact.applicationId, artifact.artifactType, artifact.content, artifact.version, artifact.skill_id, artifact.skill_version, artifact.model_metadata, artifact.created_at);
    return this.getArtifact(artifact.id);
  }
  getArtifact(id) {
    const artifact = this.db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
    if (!artifact) throw new Error(`Artifact not found: ${id}`);
    return { ...artifact, content: JSON.parse(artifact.content), model_metadata: JSON.parse(artifact.model_metadata) };
  }
  recordEvidence({ applicationId, evidenceType, value, classification, source, confidence, limitations }) {
    this.getApplication(applicationId);
    const evidence = { id: this.id(), applicationId, evidenceType, value, classification, source, confidence, limitations, captured_at: this.now(), created_at: this.now() };
    this.db.prepare('INSERT INTO evidence VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)').run(evidence.id, evidence.applicationId, evidence.evidenceType, evidence.value, evidence.classification, evidence.captured_at, evidence.source, evidence.confidence, evidence.limitations, evidence.created_at);
    return this.getEvidence(evidence.id);
  }
  getEvidence(id) {
    const evidence = this.db.prepare('SELECT * FROM evidence WHERE id = ?').get(id);
    if (!evidence) throw new Error(`Evidence not found: ${id}`);
    return { ...evidence, supports_skill_update: Boolean(evidence.supports_skill_update) };
  }
  recordOutcome(applicationId, value, source = 'user') {
    const policy = {
      interview_invited: ['primary_outcome', 'medium', 'A first-stage invitation is a signal, not proof that this artifact caused it.'],
      rejected: ['weak_negative', 'low', 'Hiring decisions have many unobserved causes.'],
      no_response: ['weak_negative', 'low', 'Silence is ambiguous and may reflect timing or process changes.'],
      withdrawn: ['contextual_outcome', 'medium', 'The candidate withdrew; it does not measure hiring effectiveness.'],
      unknown: ['unknown_outcome', 'low', 'No interpretable application outcome is available.'],
    };
    if (!policy[value]) throw new Error(`Unsupported outcome: ${value}`);
    const [classification, confidence, limitations] = policy[value];
    this.db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(value, applicationId);
    return this.recordEvidence({ applicationId, evidenceType: 'application_outcome', value, classification, source, confidence, limitations });
  }
  getApplication(id) {
    const application = this.db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    if (!application) throw new Error(`Application not found: ${id}`);
    const artifacts = this.db.prepare('SELECT * FROM artifacts WHERE application_id = ? ORDER BY artifact_type, version').all(id).map((row) => ({ ...row, content: JSON.parse(row.content), model_metadata: JSON.parse(row.model_metadata) }));
    const evidence = this.db.prepare('SELECT * FROM evidence WHERE application_id = ? ORDER BY captured_at').all(id).map((row) => ({ ...row, supports_skill_update: Boolean(row.supports_skill_update) }));
    return { ...application, profile: this.getProfile(application.profile_id), artifacts, evidence };
  }
  close() { this.db.close(); }
}
module.exports = { Store, SKILL };
