const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const { PARSER_VERSION, POLICY_VERSION, hash, parseJobDescription } = require('./job-intelligence');

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
    const skills = facts.filter((fact) => fact.entity_type === 'skill').map((fact) => fact.value.name);
    const profile = this.createProfile({ name: basic.name || '', email: basic.email || '', headline: basic.headline || '', skills });
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
