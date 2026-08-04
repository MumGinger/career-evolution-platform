const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const { PARSER_VERSION, POLICY_VERSION, hash, parseJobDescription } = require('./job-intelligence');
const { POLICY_VERSION: INFORMATION_NEEDS_POLICY_VERSION, evaluateRequirement, normalize } = require('./information-needs');
const discovery = require('./evidence-discovery');
const planning = require('./acquisition-planning');
const execution = require('./acquisition-execution');
const integration = require('./candidate-knowledge-integration');
const tailoring = require('./resume-tailoring');
const artifactGeneration = require('./resume-artifact');
const validation = require('./resume-validation');
const resumeAst = require('./resume-ast');

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
      CREATE TABLE IF NOT EXISTS source_resume_artifacts (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), source_path TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS source_resume_artifact_versions (id TEXT PRIMARY KEY, artifact_id TEXT NOT NULL REFERENCES source_resume_artifacts(id), version INTEGER NOT NULL, parsed_text TEXT NOT NULL, content_hash TEXT NOT NULL, parser_version TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(artifact_id, version)) STRICT;
      CREATE TABLE IF NOT EXISTS resume_semantic_runs (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), artifact_id TEXT NOT NULL REFERENCES source_resume_artifacts(id), artifact_version_id TEXT NOT NULL REFERENCES source_resume_artifact_versions(id), policy_version TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_evidence_spans (id TEXT PRIMARY KEY, semantic_run_id TEXT NOT NULL REFERENCES resume_semantic_runs(id), artifact_id TEXT NOT NULL REFERENCES source_resume_artifacts(id), artifact_version_id TEXT NOT NULL REFERENCES source_resume_artifact_versions(id), section_name TEXT, bullet_index INTEGER, line_start INTEGER, line_end INTEGER, raw_text TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_entity_candidates (id TEXT PRIMARY KEY, semantic_run_id TEXT NOT NULL REFERENCES resume_semantic_runs(id), evidence_span_id TEXT NOT NULL REFERENCES resume_evidence_spans(id), entity_type TEXT NOT NULL, name TEXT NOT NULL, decision_state TEXT NOT NULL, rationale TEXT NOT NULL, attributes TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_relation_candidates (id TEXT PRIMARY KEY, semantic_run_id TEXT NOT NULL REFERENCES resume_semantic_runs(id), from_entity_candidate_id TEXT NOT NULL REFERENCES resume_entity_candidates(id), to_entity_candidate_id TEXT NOT NULL REFERENCES resume_entity_candidates(id), relation_type TEXT NOT NULL, decision_state TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_semantic_graph_runs (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), semantic_run_id TEXT NOT NULL REFERENCES resume_semantic_runs(id), artifact_id TEXT NOT NULL REFERENCES source_resume_artifacts(id), artifact_version_id TEXT NOT NULL REFERENCES source_resume_artifact_versions(id), policy_version TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_graph_node_candidates (id TEXT PRIMARY KEY, graph_run_id TEXT NOT NULL REFERENCES resume_semantic_graph_runs(id), node_type TEXT NOT NULL, normalized_label TEXT NOT NULL, label TEXT NOT NULL, decision_state TEXT NOT NULL, confidence TEXT NOT NULL, rationale TEXT NOT NULL, evidence_span_ids TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_graph_edge_candidates (id TEXT PRIMARY KEY, graph_run_id TEXT NOT NULL REFERENCES resume_semantic_graph_runs(id), from_node_candidate_id TEXT NOT NULL REFERENCES resume_graph_node_candidates(id), to_node_candidate_id TEXT NOT NULL REFERENCES resume_graph_node_candidates(id), edge_type TEXT NOT NULL, decision_state TEXT NOT NULL, confidence TEXT NOT NULL, rationale TEXT NOT NULL, evidence_span_ids TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_ast_runs (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), artifact_id TEXT NOT NULL REFERENCES source_resume_artifacts(id), artifact_version_id TEXT NOT NULL REFERENCES source_resume_artifact_versions(id), extractor_provider TEXT NOT NULL, extractor_model TEXT NOT NULL, extractor_version TEXT NOT NULL, prompt_version TEXT NOT NULL, schema_version TEXT NOT NULL, raw_response_hash TEXT NOT NULL, normalized_ast TEXT NOT NULL, validation_status TEXT NOT NULL CHECK(validation_status IN ('passed', 'blocked')), validation_findings TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS information_need_runs (id TEXT PRIMARY KEY, candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), job_requirement_profile_id TEXT NOT NULL REFERENCES job_requirement_profiles(id), job_requirement_profile_version INTEGER NOT NULL, policy_version TEXT NOT NULL, candidate_evidence_snapshot TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS information_needs (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES information_need_runs(id), job_requirement_id TEXT NOT NULL REFERENCES job_requirements(id), status TEXT NOT NULL CHECK(status IN ('supported', 'needs_confirmation', 'unknown')), priority_level TEXT NOT NULL CHECK(priority_level IN ('none', 'low', 'medium', 'high')), priority_score INTEGER NOT NULL, importance TEXT NOT NULL, resume_value TEXT NOT NULL, discoverability TEXT NOT NULL, acquisition_cost TEXT NOT NULL, existing_evidence TEXT NOT NULL, matched_fact_ids TEXT NOT NULL, rationale TEXT NOT NULL, uncertainty TEXT NOT NULL, policy_version TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(run_id, job_requirement_id)) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_discovery_runs (id TEXT PRIMARY KEY, information_need_run_id TEXT NOT NULL REFERENCES information_need_runs(id), discovery_policy_version TEXT NOT NULL, source_snapshot TEXT NOT NULL, selected_information_need_ids TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_source_searches (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), source_type TEXT NOT NULL CHECK(source_type IN ('candidate_fact', 'profile_skill', 'resume_import', 'resume_ast', 'resume_semantic', 'resume_semantic_graph')), source_reference TEXT NOT NULL, availability_status TEXT NOT NULL, search_order INTEGER NOT NULL, adapter_version TEXT NOT NULL, result_status TEXT NOT NULL, rationale TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_candidates (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), job_requirement_id TEXT NOT NULL REFERENCES job_requirements(id), source_type TEXT NOT NULL, source_reference TEXT NOT NULL, normalized_claim TEXT NOT NULL, supporting_value TEXT NOT NULL, supporting_text TEXT NOT NULL, extraction_method TEXT NOT NULL, confidence_level TEXT NOT NULL CHECK(confidence_level IN ('high', 'medium', 'low')), parser_version TEXT NOT NULL, provenance TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_resolutions (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), evidence_candidate_id TEXT NOT NULL UNIQUE REFERENCES evidence_candidates(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), state TEXT NOT NULL CHECK(state IN ('accepted_for_need', 'needs_confirmation', 'rejected', 'conflicting')), rationale TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_need_results (id TEXT PRIMARY KEY, discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), sufficient INTEGER NOT NULL, terminal_status TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(discovery_run_id, information_need_id)) STRICT;
      CREATE TABLE IF NOT EXISTS acquisition_plan_runs (id TEXT PRIMARY KEY, information_need_run_id TEXT NOT NULL REFERENCES information_need_runs(id), evidence_discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), acquisition_policy_version TEXT NOT NULL, input_snapshot TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS acquisition_plans (id TEXT PRIMARY KEY, acquisition_plan_run_id TEXT NOT NULL REFERENCES acquisition_plan_runs(id), strategy TEXT NOT NULL, expected_information_gain TEXT NOT NULL, expected_information_gain_score INTEGER NOT NULL, estimated_acquisition_cost TEXT NOT NULL, confidence TEXT NOT NULL, rationale TEXT NOT NULL, limitations TEXT NOT NULL, stop_condition TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS acquisition_plan_needs (acquisition_plan_id TEXT NOT NULL REFERENCES acquisition_plans(id), information_need_id TEXT NOT NULL REFERENCES information_needs(id), PRIMARY KEY (acquisition_plan_id, information_need_id)) STRICT;
      CREATE TABLE IF NOT EXISTS acquisition_plan_actions (id TEXT PRIMARY KEY, acquisition_plan_id TEXT NOT NULL REFERENCES acquisition_plans(id), action_type TEXT NOT NULL, action_key TEXT NOT NULL, estimated_acquisition_cost TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS acquisition_result_runs (id TEXT PRIMARY KEY, acquisition_plan_run_id TEXT NOT NULL REFERENCES acquisition_plan_runs(id), execution_adapter_version TEXT NOT NULL, plan_snapshot TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS acquisition_results (id TEXT PRIMARY KEY, acquisition_result_run_id TEXT NOT NULL REFERENCES acquisition_result_runs(id), acquisition_action_id TEXT NOT NULL REFERENCES acquisition_plan_actions(id), execution_status TEXT NOT NULL CHECK(execution_status IN ('captured', 'skipped', 'unavailable')), raw_captured_evidence TEXT, source_type TEXT NOT NULL, provenance TEXT NOT NULL, limitations TEXT NOT NULL, captured_at TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(acquisition_result_run_id, acquisition_action_id)) STRICT;
      CREATE TABLE IF NOT EXISTS candidate_knowledge_integration_runs (id TEXT PRIMARY KEY, candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), upstream_run_type TEXT NOT NULL CHECK(upstream_run_type IN ('evidence_discovery_run', 'acquisition_result_run')), upstream_run_id TEXT NOT NULL, policy_version TEXT NOT NULL, knowledge_snapshot TEXT NOT NULL, upstream_snapshot TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS integration_decisions (id TEXT PRIMARY KEY, integration_run_id TEXT NOT NULL REFERENCES candidate_knowledge_integration_runs(id), proposed_entity_type TEXT, proposed_value TEXT, source_evidence_refs TEXT NOT NULL, related_references TEXT NOT NULL, comparison TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('accepted', 'needs_confirmation', 'rejected', 'conflicting', 'duplicate', 'deferred')), rationale TEXT NOT NULL, confirmation_status TEXT, confidence_level TEXT, policy_version TEXT NOT NULL, existing_fact_id TEXT, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_observations (id TEXT PRIMARY KEY, source_type TEXT NOT NULL, source_id TEXT NOT NULL, upstream_run_type TEXT NOT NULL, upstream_run_id TEXT NOT NULL, raw_value TEXT NOT NULL, provenance TEXT NOT NULL, positive_confirmation INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(source_type, source_id));
      CREATE TABLE IF NOT EXISTS candidate_knowledge_facts (id TEXT PRIMARY KEY, candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), entity_type TEXT NOT NULL, canonical_value TEXT NOT NULL, display_value TEXT, identity_key TEXT NOT NULL, confirmation_status TEXT NOT NULL, confidence_level TEXT NOT NULL CHECK(confidence_level IN ('high', 'medium', 'low')), validity_dates TEXT, integration_decision_id TEXT NOT NULL REFERENCES integration_decisions(id), created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS candidate_fact_evidence_links (candidate_fact_id TEXT NOT NULL REFERENCES candidate_knowledge_facts(id), evidence_observation_id TEXT NOT NULL REFERENCES evidence_observations(id), integration_decision_id TEXT NOT NULL REFERENCES integration_decisions(id), relationship TEXT NOT NULL CHECK(relationship IN ('supports', 'confirms', 'extends', 'contradicts')), created_at TEXT NOT NULL, PRIMARY KEY(candidate_fact_id, evidence_observation_id));
      CREATE TABLE IF NOT EXISTS candidate_fact_revisions (id TEXT PRIMARY KEY, prior_fact_id TEXT NOT NULL REFERENCES candidate_knowledge_facts(id), new_fact_id TEXT NOT NULL REFERENCES candidate_knowledge_facts(id), relation TEXT NOT NULL CHECK(relation IN ('confirms', 'extends', 'supersedes')), integration_decision_id TEXT NOT NULL REFERENCES integration_decisions(id), created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_tailoring_plan_runs (id TEXT PRIMARY KEY, candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), job_requirement_profile_id TEXT NOT NULL REFERENCES job_requirement_profiles(id), job_requirement_profile_version INTEGER NOT NULL, tailoring_policy_version TEXT NOT NULL, candidate_knowledge_snapshot TEXT NOT NULL, source_resume_snapshot TEXT, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_content_selections (id TEXT PRIMARY KEY, tailoring_plan_run_id TEXT NOT NULL REFERENCES resume_tailoring_plan_runs(id), candidate_fact_id TEXT NOT NULL REFERENCES candidate_knowledge_facts(id), candidate_fact_revision TEXT NOT NULL, mapped_requirement_ids TEXT NOT NULL, selection_state TEXT NOT NULL CHECK(selection_state IN ('include', 'deprioritize', 'omit', 'blocked')), relevance_rationale TEXT NOT NULL, inherited_provenance_references TEXT NOT NULL, recommended_section TEXT NOT NULL, emphasis_level TEXT NOT NULL, priority_score INTEGER NOT NULL, permitted_claim_scope TEXT NOT NULL, blocked_claim_scopes TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS requirement_coverage (id TEXT PRIMARY KEY, tailoring_plan_run_id TEXT NOT NULL REFERENCES resume_tailoring_plan_runs(id), job_requirement_id TEXT NOT NULL REFERENCES job_requirements(id), coverage_status TEXT NOT NULL CHECK(coverage_status IN ('covered', 'partially_covered', 'uncovered', 'not_resume_relevant')), supporting_candidate_fact_ids TEXT NOT NULL, coverage_rationale TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(tailoring_plan_run_id, job_requirement_id)) STRICT;
      CREATE TABLE IF NOT EXISTS resume_section_plans (id TEXT PRIMARY KEY, tailoring_plan_run_id TEXT NOT NULL REFERENCES resume_tailoring_plan_runs(id), section TEXT NOT NULL, recommended_order INTEGER NOT NULL, candidate_fact_ids TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS source_resume_analysis_flags (id TEXT PRIMARY KEY, tailoring_plan_run_id TEXT NOT NULL REFERENCES resume_tailoring_plan_runs(id), source_artifact_id TEXT NOT NULL, source_artifact_version TEXT, text TEXT NOT NULL, status TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_artifact_runs (id TEXT PRIMARY KEY, resume_tailoring_plan_run_id TEXT NOT NULL REFERENCES resume_tailoring_plan_runs(id), candidate_knowledge_snapshot TEXT NOT NULL, job_requirement_profile_reference TEXT NOT NULL, artifact_policy_version TEXT NOT NULL, limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS resume_artifacts (id TEXT PRIMARY KEY, resume_artifact_run_id TEXT NOT NULL REFERENCES resume_artifact_runs(id), artifact_type TEXT NOT NULL, format_version TEXT NOT NULL, content TEXT NOT NULL, metadata TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(resume_artifact_run_id, artifact_type)) STRICT;
      CREATE TABLE IF NOT EXISTS resume_validation_runs (id TEXT PRIMARY KEY, resume_artifact_run_id TEXT NOT NULL REFERENCES resume_artifact_runs(id), resume_tailoring_plan_run_id TEXT NOT NULL REFERENCES resume_tailoring_plan_runs(id), validation_policy_version TEXT NOT NULL, artifact_snapshot TEXT NOT NULL, plan_snapshot TEXT NOT NULL, validation_status TEXT NOT NULL CHECK(validation_status IN ('passed', 'passed_with_warnings', 'failed')), limitations TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS validation_findings (id TEXT PRIMARY KEY, resume_validation_run_id TEXT NOT NULL REFERENCES resume_validation_runs(id), category TEXT NOT NULL, rule_code TEXT NOT NULL, severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'critical')), message TEXT NOT NULL, references_json TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_review_runs (id TEXT PRIMARY KEY, candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id), job_requirement_profile_id TEXT NOT NULL REFERENCES job_requirement_profiles(id), evidence_discovery_run_id TEXT NOT NULL REFERENCES evidence_discovery_runs(id), candidate_profile_snapshot TEXT NOT NULL, job_profile_snapshot TEXT NOT NULL, discovery_snapshot TEXT NOT NULL, review_actor TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS evidence_review_decisions (id TEXT PRIMARY KEY, review_run_id TEXT NOT NULL REFERENCES evidence_review_runs(id), requirement_id TEXT NOT NULL REFERENCES job_requirements(id), evidence_candidate_id TEXT NOT NULL REFERENCES evidence_candidates(id), action TEXT NOT NULL CHECK(action IN ('accepted', 'skipped', 'edited', 'blocked')), original_claim TEXT NOT NULL, edited_claim TEXT, source_evidence_refs TEXT NOT NULL, rationale TEXT, review_actor TEXT NOT NULL, reviewed_at TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(review_run_id, evidence_candidate_id)) STRICT;
      CREATE TABLE IF NOT EXISTS career_conversation_observations (id TEXT PRIMARY KEY, question TEXT NOT NULL, answer TEXT, observed_at TEXT NOT NULL, workflow_source TEXT NOT NULL UNIQUE, skipped INTEGER NOT NULL CHECK(skipped IN (0, 1))) STRICT;
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
  createSourceResumeArtifactVersion({ profileId, sourcePath, parsedText, parserVersion = 'resume-intake-parser/1.0.0', artifactId }) {
    this.getProfile(profileId);
    let artifact = artifactId && this.db.prepare('SELECT * FROM source_resume_artifacts WHERE id = ?').get(artifactId);
    if (artifact && artifact.profile_id !== profileId) throw new Error('Source resume artifact does not belong to candidate profile');
    if (!artifact) { artifact = { id: this.id(), profile_id: profileId, source_path: sourcePath, created_at: this.now() }; this.db.prepare('INSERT INTO source_resume_artifacts VALUES (?, ?, ?, ?)').run(artifact.id, artifact.profile_id, artifact.source_path, artifact.created_at); }
    const version = this.db.prepare('SELECT COALESCE(MAX(version), 0) + 1 AS version FROM source_resume_artifact_versions WHERE artifact_id = ?').get(artifact.id).version;
    const record = { id: this.id(), artifact_id: artifact.id, version, parsed_text: parsedText, content_hash: require('node:crypto').createHash('sha256').update(parsedText).digest('hex'), parser_version: parserVersion, created_at: this.now() };
    this.db.prepare('INSERT INTO source_resume_artifact_versions VALUES (?, ?, ?, ?, ?, ?, ?)').run(record.id, record.artifact_id, record.version, record.parsed_text, record.content_hash, record.parser_version, record.created_at);
    return { ...record, artifact };
  }
  getSourceResumeArtifact(id) { const artifact = this.db.prepare('SELECT * FROM source_resume_artifacts WHERE id = ?').get(id); if (!artifact) throw new Error(`Source resume artifact not found: ${id}`); return { ...artifact, versions: this.db.prepare('SELECT * FROM source_resume_artifact_versions WHERE artifact_id = ? ORDER BY version').all(id) }; }
  createResumeSemanticRun({ profileId, artifactId, policyVersion, parsed }) {
    const artifact = this.getSourceResumeArtifact(artifactId); if (artifact.profile_id !== profileId) throw new Error('Source resume artifact does not belong to candidate profile'); const version = artifact.versions.at(-1); if (!version) throw new Error('Source resume artifact has no parsed version');
    const run = { id: this.id(), profile_id: profileId, artifact_id: artifactId, artifact_version_id: version.id, policy_version: policyVersion, created_at: this.now() };
    this.db.prepare('INSERT INTO resume_semantic_runs VALUES (?, ?, ?, ?, ?, ?)').run(run.id, run.profile_id, run.artifact_id, run.artifact_version_id, run.policy_version, run.created_at);
    const spanIds = new Map(); for (const item of parsed.spans) { const id = this.id(); spanIds.set(item.key, id); this.db.prepare('INSERT INTO resume_evidence_spans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, run.id, artifactId, version.id, item.section_name || null, item.bullet_index ?? null, item.line_start ?? null, item.line_end ?? null, item.raw_text, this.now()); }
    const entityIds = new Map(); for (const item of parsed.entities) { const id = this.id(); entityIds.set(item.key, id); this.db.prepare('INSERT INTO resume_entity_candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, run.id, spanIds.get(item.span_key), item.entity_type, item.name, item.decision_state, item.rationale, JSON.stringify(item.attributes || {}), this.now()); }
    for (const item of parsed.relations) this.db.prepare('INSERT INTO resume_relation_candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, entityIds.get(item.from_key), entityIds.get(item.to_key), item.relation_type, item.decision_state, item.rationale, this.now());
    return this.getResumeSemanticRun(run.id);
  }
  getResumeSemanticRun(id) { const run = this.db.prepare('SELECT * FROM resume_semantic_runs WHERE id = ?').get(id); if (!run) throw new Error(`Resume semantic run not found: ${id}`); const spans = this.db.prepare('SELECT * FROM resume_evidence_spans WHERE semantic_run_id = ? ORDER BY line_start, bullet_index').all(id); const entities = this.db.prepare('SELECT * FROM resume_entity_candidates WHERE semantic_run_id = ? ORDER BY entity_type, name').all(id).map((row) => ({ ...row, attributes: JSON.parse(row.attributes) })); const relations = this.db.prepare('SELECT * FROM resume_relation_candidates WHERE semantic_run_id = ? ORDER BY relation_type').all(id); return { ...run, spans, entities, relations }; }
  createResumeSemanticGraphRun({ semanticRunId, policyVersion, graph }) {
    const semantic = this.getResumeSemanticRun(semanticRunId); const run = { id: this.id(), profile_id: semantic.profile_id, semantic_run_id: semanticRunId, artifact_id: semantic.artifact_id, artifact_version_id: semantic.artifact_version_id, policy_version: policyVersion, created_at: this.now() };
    this.db.prepare('INSERT INTO resume_semantic_graph_runs VALUES (?, ?, ?, ?, ?, ?, ?)').run(run.id, run.profile_id, run.semantic_run_id, run.artifact_id, run.artifact_version_id, run.policy_version, run.created_at);
    const nodeIds = new Map();
    for (const node of graph.nodes) { const id = this.id(); nodeIds.set(node.key, id); this.db.prepare('INSERT INTO resume_graph_node_candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, run.id, node.node_type, node.normalized_label, node.label, node.decision_state, node.confidence, node.rationale, JSON.stringify(node.evidence_span_ids), this.now()); }
    for (const edge of graph.edges) { const from = nodeIds.get(edge.from_key); const to = nodeIds.get(edge.to_key); if (!from || !to) continue; this.db.prepare('INSERT INTO resume_graph_edge_candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, from, to, edge.edge_type, edge.decision_state, edge.confidence, edge.rationale, JSON.stringify(edge.evidence_span_ids), this.now()); }
    return this.getResumeSemanticGraphRun(run.id);
  }
  getResumeSemanticGraphRun(id) { const run = this.db.prepare('SELECT * FROM resume_semantic_graph_runs WHERE id = ?').get(id); if (!run) throw new Error(`Resume semantic graph run not found: ${id}`); const nodes = this.db.prepare('SELECT * FROM resume_graph_node_candidates WHERE graph_run_id = ? ORDER BY node_type, label, id').all(id).map((node) => ({ ...node, evidence_span_ids: JSON.parse(node.evidence_span_ids) })); const edges = this.db.prepare('SELECT * FROM resume_graph_edge_candidates WHERE graph_run_id = ? ORDER BY edge_type, id').all(id).map((edge) => ({ ...edge, evidence_span_ids: JSON.parse(edge.evidence_span_ids) })); return { ...run, nodes, edges }; }
  getResumeSemanticEvidenceSnapshot(profileId) { return this.db.prepare(`SELECT e.id, e.entity_type, e.name, e.decision_state, e.rationale, e.attributes, e.semantic_run_id, s.id AS evidence_span_id, s.artifact_id, s.artifact_version_id, s.raw_text, s.section_name, s.line_start, s.line_end FROM resume_entity_candidates e JOIN resume_semantic_runs r ON r.id = e.semantic_run_id JOIN resume_evidence_spans s ON s.id = e.evidence_span_id WHERE r.profile_id = ? ORDER BY e.created_at, e.id`).all(profileId).map((row) => ({ id: row.id, entity_type: row.entity_type, value: { name: row.name }, source: 'resume_semantic', confirmation_status: row.decision_state === 'explicit' ? 'confirmed' : 'needs_confirmation', provenance: { semantic_run_id: row.semantic_run_id, evidence_span_id: row.evidence_span_id, artifact_id: row.artifact_id, artifact_version_id: row.artifact_version_id, section_name: row.section_name, line_start: row.line_start, line_end: row.line_end, raw_text: row.raw_text, decision_state: row.decision_state, rationale: row.rationale, attributes: JSON.parse(row.attributes) } })); }
  getResumeSemanticGraphEvidenceSnapshot(profileId) { return this.db.prepare(`SELECT n.*, g.semantic_run_id, g.artifact_id, g.artifact_version_id FROM resume_graph_node_candidates n JOIN resume_semantic_graph_runs g ON g.id = n.graph_run_id WHERE g.profile_id = ? ORDER BY n.created_at, n.id`).all(profileId).map((row) => ({ id: row.id, entity_type: row.node_type, value: { name: row.label }, source: 'resume_semantic_graph', confirmation_status: row.decision_state === 'explicit' && ['skill', 'tool'].includes(row.node_type) ? 'confirmed' : 'needs_confirmation', provenance: { graph_run_id: row.graph_run_id, semantic_run_id: row.semantic_run_id, artifact_id: row.artifact_id, artifact_version_id: row.artifact_version_id, evidence_span_ids: JSON.parse(row.evidence_span_ids), decision_state: row.decision_state, rationale: row.rationale } })); }
  async createResumeAstRun({ profileId, artifactId, provider, promptVersion = resumeAst.PROMPT_VERSION }) {
    const artifact = this.getSourceResumeArtifact(artifactId); if (artifact.profile_id !== profileId) throw new Error('Source resume artifact does not belong to candidate profile'); const version = artifact.versions.at(-1); let result;
    try { result = await provider.extractResumeAst({ text: version.parsed_text, schema: resumeAst.RESUME_AST_JSON_SCHEMA, promptVersion }); } catch (error) { result = { provider: provider.name || 'unknown', model: provider.model || 'unknown', version: resumeAst.SCHEMA_VERSION, rawResponse: '', ast: null, parseError: `Provider execution failed: ${error.message}` }; }
    const checked = resumeAst.validateAst({ ast: result.ast, text: version.parsed_text, parseError: result.parseError }); const run = { id: this.id(), profile_id: profileId, artifact_id: artifactId, artifact_version_id: version.id, extractor_provider: result.provider || 'unknown', extractor_model: result.model || 'unknown', extractor_version: result.version || resumeAst.SCHEMA_VERSION, prompt_version: promptVersion, schema_version: resumeAst.SCHEMA_VERSION, raw_response_hash: resumeAst.hash(result.rawResponse || ''), normalized_ast: JSON.stringify(checked.normalizedAst), validation_status: checked.validation_status, validation_findings: JSON.stringify(checked.findings), created_at: this.now() };
    this.db.prepare('INSERT INTO resume_ast_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(run.id, run.profile_id, run.artifact_id, run.artifact_version_id, run.extractor_provider, run.extractor_model, run.extractor_version, run.prompt_version, run.schema_version, run.raw_response_hash, run.normalized_ast, run.validation_status, run.validation_findings, run.created_at); return this.getResumeAstRun(run.id);
  }
  getResumeAstRun(id) { const run = this.db.prepare('SELECT * FROM resume_ast_runs WHERE id = ?').get(id); if (!run) throw new Error(`Resume AST Run not found: ${id}`); return { ...run, normalized_ast: JSON.parse(run.normalized_ast), validation_findings: JSON.parse(run.validation_findings) }; }
  getResumeAstEvidenceSnapshot(profileId, requirement = null) {
    return this.db.prepare("SELECT * FROM resume_ast_runs WHERE profile_id = ? AND validation_status = 'passed' ORDER BY created_at, id").all(profileId).flatMap((run) => {
      const ast = JSON.parse(run.normalized_ast); const rows = [];
      const add = (leaf, entity_type, section) => { if (leaf) { const autoAccepted = leaf.provenance.extraction_state === 'explicit' && ['skill', 'tool'].includes(entity_type); rows.push({ id: `${run.id}:${rows.length}`, entity_type, value: { name: leaf.value, text: leaf.value }, source: 'resume_ast', confirmation_status: autoAccepted ? 'confirmed' : 'needs_confirmation', provenance: { resume_ast_run_id: run.id, artifact_id: run.artifact_id, artifact_version_id: run.artifact_version_id, block_kind: entity_type, section, ...leaf.provenance } }); } };
      (ast.skills || []).forEach((item) => add(item, 'skill', 'skills'));
      (ast.projects || []).forEach((item) => { add(item.title, 'project', 'projects'); (item.technologies || []).forEach((value) => add(value, 'tool', 'projects')); (item.bullets || []).forEach((value) => add(value, 'bullet', 'projects')); });
      (ast.experiences || []).forEach((item) => { add(item.organization, 'organization', 'experiences'); add(item.role, 'role', 'experiences'); (item.bullets || []).forEach((value) => add(value, 'bullet', 'experiences')); });
      if (!requirement) return rows;
      const ranked = resumeAst.retrieve(requirement, ast); return ranked.map((match) => { const fact = rows.find((row) => row.value.name === match.block.text && row.entity_type === match.block.kind && row.provenance.section === match.block.section); return fact && { ...fact, provenance: { ...fact.provenance, retrieval: { retriever_version: resumeAst.RETRIEVER_VERSION, rank: match.rank, score: match.score, exactness: match.exact ? 'exact' : 'term_overlap', rationale: match.rationale, matched_terms: match.matched_terms } } }; }).filter(Boolean);
    });
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
    const astEvidence = this.getResumeAstEvidenceSnapshot(run.candidate_profile_id); const graphEvidence = this.getResumeSemanticGraphEvidenceSnapshot(run.candidate_profile_id);
    const available_working_evidence_summary = [...astEvidence, ...graphEvidence].map((item) => ({ source: item.source, node_type: item.entity_type, label: item.value.name, decision_state: item.provenance.extraction_state || item.provenance.decision_state, run_id: item.provenance.resume_ast_run_id || item.provenance.graph_run_id, evidence_span_ids: item.provenance.source_span_ids || item.provenance.evidence_span_ids }));
    return { ...run, candidate_evidence_snapshot: JSON.parse(run.candidate_evidence_snapshot), available_working_evidence_summary, candidate_profile: this.getProfile(run.candidate_profile_id), job_requirement_profile: this.getJobRequirementProfile(run.job_requirement_profile_id), information_needs: needs };
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
    const astSnapshot = this.getResumeAstEvidenceSnapshot(informationNeedRun.candidate_profile_id); const semanticSnapshot = this.getResumeSemanticEvidenceSnapshot(informationNeedRun.candidate_profile_id); const graphSnapshot = this.getResumeSemanticGraphEvidenceSnapshot(informationNeedRun.candidate_profile_id);
    const run = { id: this.id(), information_need_run_id: informationNeedRunId, discovery_policy_version: discovery.POLICY_VERSION, source_snapshot: JSON.stringify({ candidate_evidence: snapshot, resume_ast: astSnapshot, resume_semantic: semanticSnapshot, resume_semantic_graph: graphSnapshot }), selected_information_need_ids: JSON.stringify(selected.map((need) => need.id)), created_at: this.now() };
    this.db.prepare('INSERT INTO evidence_discovery_runs VALUES (?, ?, ?, ?, ?, ?)').run(run.id, run.information_need_run_id, run.discovery_policy_version, run.source_snapshot, run.selected_information_need_ids, run.created_at);
    const requirements = new Map(informationNeedRun.job_requirement_profile.requirements.map((requirement) => [requirement.id, requirement]));
    for (const need of selected) {
      const requirement = requirements.get(need.job_requirement_id);
      let sufficient = false;
      let resultRationale = 'No sources have been searched.';
      for (const [index, sourceType] of discovery.SOURCE_ORDER.entries()) {
        const sourceFacts = sourceType === 'resume_ast' ? this.getResumeAstEvidenceSnapshot(informationNeedRun.candidate_profile_id, requirement) : (sourceType === 'resume_semantic' ? semanticSnapshot : sourceType === 'resume_semantic_graph' ? graphSnapshot : snapshot).filter((fact) => discovery.sourceFor(fact) === sourceType);
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
  createAcquisitionPlanRun({ informationNeedRunId, evidenceDiscoveryRunId }) {
    const informationNeedRun = this.getInformationNeedRun(informationNeedRunId);
    const discoveryRun = this.getEvidenceDiscoveryRun(evidenceDiscoveryRunId);
    if (discoveryRun.information_need_run_id !== informationNeedRunId) throw new Error('Evidence Discovery Run must belong to the supplied Information Need Run');
    const needs = new Map(informationNeedRun.information_needs.map((need) => [need.id, need]));
    const planned = discoveryRun.need_results
      .filter((result) => !result.sufficient && result.terminal_status === 'unresolved_after_search')
      .map((result) => ({ need: needs.get(result.information_need_id), discoveryResult: result }))
      .filter((item) => item.need)
      .map((item) => ({ ...planning.planFor(item), need: item.need }));
    const inputSnapshot = { information_need_run_id: informationNeedRunId, evidence_discovery_run_id: evidenceDiscoveryRunId, unresolved_need_ids: planned.map((item) => item.need.id), discovery_results: discoveryRun.need_results };
    const run = { id: this.id(), information_need_run_id: informationNeedRunId, evidence_discovery_run_id: evidenceDiscoveryRunId, acquisition_policy_version: planning.POLICY_VERSION, input_snapshot: JSON.stringify(inputSnapshot), created_at: this.now() };
    this.db.prepare('INSERT INTO acquisition_plan_runs VALUES (?, ?, ?, ?, ?, ?)').run(run.id, run.information_need_run_id, run.evidence_discovery_run_id, run.acquisition_policy_version, run.input_snapshot, run.created_at);
    for (const group of planning.groupPlans(planned)) {
      const planId = this.id();
      this.db.prepare('INSERT INTO acquisition_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(planId, run.id, group.strategy, group.information_gain, group.information_gain_score, group.acquisition_cost, group.confidence, group.rationale, group.limitations, group.stop_condition, this.now());
      for (const need of group.needs) this.db.prepare('INSERT INTO acquisition_plan_needs VALUES (?, ?)').run(planId, need.id);
      this.db.prepare('INSERT INTO acquisition_plan_actions VALUES (?, ?, ?, ?, ?, ?, ?)').run(this.id(), planId, group.action_type, group.action_key, group.acquisition_cost, `A shared ${group.action_type} action addresses ${group.needs.length} compatible unresolved Information Need(s).`, this.now());
    }
    return this.getAcquisitionPlanRun(run.id);
  }
  getAcquisitionPlanRun(id) {
    const run = this.db.prepare('SELECT * FROM acquisition_plan_runs WHERE id = ?').get(id);
    if (!run) throw new Error(`Acquisition Plan Run not found: ${id}`);
    const plans = this.db.prepare('SELECT * FROM acquisition_plans WHERE acquisition_plan_run_id = ? ORDER BY expected_information_gain_score DESC, id').all(id).map((plan) => ({
      ...plan,
      information_needs: this.db.prepare('SELECT information_needs.*, job_requirements.normalized_name, job_requirements.category FROM acquisition_plan_needs JOIN information_needs ON information_needs.id = acquisition_plan_needs.information_need_id JOIN job_requirements ON job_requirements.id = information_needs.job_requirement_id WHERE acquisition_plan_needs.acquisition_plan_id = ? ORDER BY information_needs.priority_score DESC, normalized_name').all(plan.id),
      acquisition_actions: this.db.prepare('SELECT * FROM acquisition_plan_actions WHERE acquisition_plan_id = ? ORDER BY created_at, id').all(plan.id),
    }));
    return { ...run, input_snapshot: JSON.parse(run.input_snapshot), acquisition_plans: plans, information_need_run: this.getInformationNeedRun(run.information_need_run_id), evidence_discovery_run: this.getEvidenceDiscoveryRun(run.evidence_discovery_run_id) };
  }
  createAcquisitionResultRun({ acquisitionPlanRunId, captures }) {
    const planRun = this.getAcquisitionPlanRun(acquisitionPlanRunId);
    const actions = planRun.acquisition_plans.flatMap((plan) => plan.acquisition_actions.map((action) => ({ ...action, acquisition_plan_id: plan.id })));
    if (!actions.length) throw new Error('Acquisition Plan Run contains no executable Acquisition Actions');
    const outcomes = execution.normalizeCaptures(actions, captures);
    const planSnapshot = {
      acquisition_plan_run_id: planRun.id,
      acquisition_plan_ids: planRun.acquisition_plans.map((plan) => plan.id),
      acquisition_actions: actions.map((action) => ({ id: action.id, acquisition_plan_id: action.acquisition_plan_id, action_type: action.action_type, action_key: action.action_key })),
    };
    const run = { id: this.id(), acquisition_plan_run_id: planRun.id, execution_adapter_version: execution.ADAPTER_VERSION, plan_snapshot: JSON.stringify(planSnapshot), created_at: this.now() };
    this.db.prepare('INSERT INTO acquisition_result_runs VALUES (?, ?, ?, ?, ?)').run(run.id, run.acquisition_plan_run_id, run.execution_adapter_version, run.plan_snapshot, run.created_at);
    for (const action of actions) {
      const outcome = outcomes.get(action.id);
      const timestamp = this.now();
      this.db.prepare('INSERT INTO acquisition_results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, action.id, outcome.execution_status, outcome.raw_captured_evidence === null ? null : JSON.stringify(outcome.raw_captured_evidence), outcome.source_type, JSON.stringify(outcome.provenance), outcome.limitations, timestamp, timestamp);
    }
    return this.getAcquisitionResultRun(run.id);
  }
  getAcquisitionResultRun(id) {
    const run = this.db.prepare('SELECT * FROM acquisition_result_runs WHERE id = ?').get(id);
    if (!run) throw new Error(`Acquisition Result Run not found: ${id}`);
    const results = this.db.prepare(`SELECT acquisition_results.*, acquisition_plan_actions.action_type, acquisition_plan_actions.action_key, acquisition_plan_actions.acquisition_plan_id
      FROM acquisition_results JOIN acquisition_plan_actions ON acquisition_plan_actions.id = acquisition_results.acquisition_action_id
      WHERE acquisition_results.acquisition_result_run_id = ? ORDER BY acquisition_results.created_at, acquisition_results.id`).all(id)
      .map((result) => ({ ...result, raw_captured_evidence: result.raw_captured_evidence === null ? null : JSON.parse(result.raw_captured_evidence), provenance: JSON.parse(result.provenance) }));
    return { ...run, plan_snapshot: JSON.parse(run.plan_snapshot), acquisition_results: results, acquisition_plan_run: this.getAcquisitionPlanRun(run.acquisition_plan_run_id) };
  }
  getCommittedCandidateKnowledge(profileId) {
    this.getProfile(profileId);
    return this.db.prepare('SELECT * FROM candidate_knowledge_facts WHERE candidate_profile_id = ? ORDER BY created_at, id').all(profileId)
      .map((fact) => ({ ...fact, canonical_value: JSON.parse(fact.canonical_value), value: JSON.parse(fact.canonical_value), validity_dates: fact.validity_dates ? JSON.parse(fact.validity_dates) : null }));
  }
  getEvidenceReviewCandidate(discoveryRunId, candidateId) {
    const item = this.db.prepare(`SELECT evidence_candidates.*, evidence_resolutions.state AS resolution_state, evidence_resolutions.rationale AS resolution_rationale
      FROM evidence_candidates JOIN evidence_resolutions ON evidence_resolutions.evidence_candidate_id = evidence_candidates.id
      WHERE evidence_candidates.id = ? AND evidence_candidates.discovery_run_id = ?`).get(candidateId, discoveryRunId);
    if (!item) throw new Error('Evidence Review decision must reference a candidate in its Evidence Discovery Run');
    const candidate = { ...item, supporting_value: JSON.parse(item.supporting_value), provenance: JSON.parse(item.provenance) };
    let entityType = candidate.provenance.block_kind || 'skill';
    if (candidate.source_type === 'candidate_fact' || candidate.source_type === 'resume_import') {
      const source = this.db.prepare('SELECT entity_type FROM candidate_facts WHERE id = ?').get(candidate.source_reference);
      if (source) entityType = source.entity_type;
    }
    return { candidate, entity_type: entityType, resolution: { state: item.resolution_state, rationale: item.resolution_rationale } };
  }
  createEvidenceReviewRun({ candidateProfileId, jobRequirementProfileId, evidenceDiscoveryRunId, decisions, reviewActor = 'user' }) {
    if (!Array.isArray(decisions)) throw new Error('Evidence Review decisions must be an array');
    const profile = this.getProfile(candidateProfileId);
    const job = this.getJobRequirementProfile(jobRequirementProfileId);
    const discoveryRun = this.getEvidenceDiscoveryRun(evidenceDiscoveryRunId);
    if (discoveryRun.information_need_run.candidate_profile_id !== candidateProfileId || discoveryRun.information_need_run.job_requirement_profile_id !== jobRequirementProfileId) throw new Error('Evidence Review inputs must share the same candidate, job profile, and discovery run');
    const run = { id: this.id(), candidate_profile_id: candidateProfileId, job_requirement_profile_id: jobRequirementProfileId, evidence_discovery_run_id: evidenceDiscoveryRunId, candidate_profile_snapshot: JSON.stringify(profile), job_profile_snapshot: JSON.stringify(job), discovery_snapshot: JSON.stringify(discoveryRun), review_actor: reviewActor, created_at: this.now() };
    this.db.prepare('INSERT INTO evidence_review_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(run.id, run.candidate_profile_id, run.job_requirement_profile_id, run.evidence_discovery_run_id, run.candidate_profile_snapshot, run.job_profile_snapshot, run.discovery_snapshot, run.review_actor, run.created_at);
    const seen = new Set();
    for (const submitted of decisions) {
      if (seen.has(submitted.evidenceCandidateId)) continue;
      seen.add(submitted.evidenceCandidateId);
      const item = this.getEvidenceReviewCandidate(evidenceDiscoveryRunId, submitted.evidenceCandidateId);
      if (item.resolution.state !== 'needs_confirmation') throw new Error('Only needs_confirmation evidence candidates may be reviewed');
      const action = submitted.action;
      if (!['accepted', 'skipped', 'edited', 'blocked'].includes(action)) throw new Error(`Unsupported Evidence Review action: ${action}`);
      const originalClaim = submitted.originalClaim || item.candidate.supporting_text;
      this.db.prepare('INSERT INTO evidence_review_decisions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, item.candidate.job_requirement_id, item.candidate.id, action, originalClaim, submitted.editedClaim ? JSON.stringify(submitted.editedClaim) : null, JSON.stringify([{ type: 'evidence_candidate', id: item.candidate.id, reviewedConfirmation: action === 'accepted' || action === 'edited' }]), submitted.rationale || null, reviewActor, this.now(), this.now());
    }
    return this.getEvidenceReviewRun(run.id);
  }
  getEvidenceReviewRun(id) {
    const run = this.db.prepare('SELECT * FROM evidence_review_runs WHERE id = ?').get(id);
    if (!run) throw new Error(`Evidence Review Run not found: ${id}`);
    const decisions = this.db.prepare('SELECT * FROM evidence_review_decisions WHERE review_run_id = ? ORDER BY reviewed_at, id').all(id).map((item) => ({ ...item, edited_claim: item.edited_claim ? JSON.parse(item.edited_claim) : null, source_evidence_refs: JSON.parse(item.source_evidence_refs) }));
    return { ...run, candidate_profile_snapshot: JSON.parse(run.candidate_profile_snapshot), job_profile_snapshot: JSON.parse(run.job_profile_snapshot), discovery_snapshot: JSON.parse(run.discovery_snapshot), review_decisions: decisions };
  }
  createCareerConversationObservation({ question, answer = null, workflowSource, skipped = false }) {
    if (!question || !workflowSource) throw new Error('Career Conversation observations require a question and workflow source');
    if (skipped && answer) throw new Error('A skipped Career Conversation observation cannot include an answer');
    const existing = this.db.prepare('SELECT * FROM career_conversation_observations WHERE workflow_source = ?').get(workflowSource);
    if (existing) return this.getCareerConversationObservation(existing.id);
    const observation = { id: this.id(), question, answer: answer || null, observed_at: this.now(), workflow_source: workflowSource, skipped: skipped ? 1 : 0 };
    this.db.prepare('INSERT INTO career_conversation_observations VALUES (?, ?, ?, ?, ?, ?)').run(observation.id, observation.question, observation.answer, observation.observed_at, observation.workflow_source, observation.skipped);
    return this.getCareerConversationObservation(observation.id);
  }
  getCareerConversationObservation(id) {
    const observation = this.db.prepare('SELECT * FROM career_conversation_observations WHERE id = ?').get(id);
    if (!observation) throw new Error(`Career Conversation observation not found: ${id}`);
    return { ...observation, skipped: Boolean(observation.skipped) };
  }
  createResumeTailoringPlanRun({ candidateProfileId, jobRequirementProfileId, sourceResumeArtifact = null }) {
    this.getProfile(candidateProfileId);
    const job = this.getJobRequirementProfile(jobRequirementProfileId);
    const facts = this.getCommittedCandidateKnowledge(candidateProfileId);
    const output = tailoring.plan({ facts, requirements: job.requirements, sourceResumeArtifact });
    const run = { id: this.id(), candidate_profile_id: candidateProfileId, job_requirement_profile_id: job.id, job_requirement_profile_version: job.version, tailoring_policy_version: tailoring.POLICY_VERSION, candidate_knowledge_snapshot: JSON.stringify(facts), source_resume_snapshot: sourceResumeArtifact ? JSON.stringify(sourceResumeArtifact) : null, limitations: output.limitations, created_at: this.now() };
    this.db.prepare('INSERT INTO resume_tailoring_plan_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(run.id, run.candidate_profile_id, run.job_requirement_profile_id, run.job_requirement_profile_version, run.tailoring_policy_version, run.candidate_knowledge_snapshot, run.source_resume_snapshot, run.limitations, run.created_at);
    for (const item of output.selections) this.db.prepare('INSERT INTO resume_content_selections VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, item.candidate_fact_id, item.candidate_fact_revision, JSON.stringify(item.mapped_job_requirement_ids), item.selection_state, item.relevance_rationale, JSON.stringify(item.inherited_provenance_references), item.recommended_section, item.emphasis_level, item.priority_score, JSON.stringify(item.permitted_claim_scope), JSON.stringify(item.blocked_claim_scopes), item.limitations, run.created_at);
    for (const item of output.coverage) this.db.prepare('INSERT INTO requirement_coverage VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, item.requirement_id, item.coverage_status, JSON.stringify(item.supporting_candidate_fact_ids), item.coverage_rationale, item.limitations, run.created_at);
    for (const item of output.sectionPlans) this.db.prepare('INSERT INTO resume_section_plans VALUES (?, ?, ?, ?, ?, ?)').run(this.id(), run.id, item.section, item.recommended_order, JSON.stringify(item.candidate_fact_ids), run.created_at);
    for (const item of output.sourceFlags) this.db.prepare('INSERT INTO source_resume_analysis_flags VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, item.source_artifact_id, item.source_artifact_version || null, item.text, item.status, item.rationale, run.created_at);
    return this.getResumeTailoringPlanRun(run.id);
  }
  getResumeTailoringPlanRun(id) {
    const run = this.db.prepare('SELECT * FROM resume_tailoring_plan_runs WHERE id = ?').get(id); if (!run) throw new Error(`Resume Tailoring Plan Run not found: ${id}`);
    const parse = (row, keys) => Object.assign(row, ...keys.map((key) => ({ [key]: JSON.parse(row[key]) })));
    return { ...run, candidate_knowledge_snapshot: JSON.parse(run.candidate_knowledge_snapshot), source_resume_snapshot: run.source_resume_snapshot ? JSON.parse(run.source_resume_snapshot) : null,
      resume_content_selections: this.db.prepare('SELECT * FROM resume_content_selections WHERE tailoring_plan_run_id = ? ORDER BY priority_score DESC, id').all(id).map((row) => parse(row, ['mapped_requirement_ids', 'inherited_provenance_references', 'permitted_claim_scope', 'blocked_claim_scopes'])),
      requirement_coverage: this.db.prepare('SELECT * FROM requirement_coverage WHERE tailoring_plan_run_id = ? ORDER BY job_requirement_id').all(id).map((row) => parse(row, ['supporting_candidate_fact_ids'])),
      section_plans: this.db.prepare('SELECT * FROM resume_section_plans WHERE tailoring_plan_run_id = ? ORDER BY recommended_order').all(id).map((row) => parse(row, ['candidate_fact_ids'])),
      source_resume_analysis_flags: this.db.prepare('SELECT * FROM source_resume_analysis_flags WHERE tailoring_plan_run_id = ? ORDER BY id').all(id) };
  }
  createResumeArtifactRun({ resumeTailoringPlanRunId }) {
    const plan = this.getResumeTailoringPlanRun(resumeTailoringPlanRunId);
    const generated = artifactGeneration.generate(plan);
    const run = { id: this.id(), resume_tailoring_plan_run_id: plan.id, candidate_knowledge_snapshot: JSON.stringify(plan.candidate_knowledge_snapshot), job_requirement_profile_reference: JSON.stringify({ id: plan.job_requirement_profile_id, version: plan.job_requirement_profile_version }), artifact_policy_version: artifactGeneration.POLICY_VERSION, limitations: generated.metadata.limitations, created_at: this.now() };
    this.db.prepare('INSERT INTO resume_artifact_runs VALUES (?, ?, ?, ?, ?, ?, ?)').run(run.id, run.resume_tailoring_plan_run_id, run.candidate_knowledge_snapshot, run.job_requirement_profile_reference, run.artifact_policy_version, run.limitations, run.created_at);
    generated.metadata.traceability = { resume_artifact_run_id: run.id, resume_tailoring_plan_run_id: plan.id };
    const artifact = { id: this.id(), resume_artifact_run_id: run.id, artifact_type: 'structured_resume', format_version: generated.format, content: JSON.stringify({ format: generated.format, sections: generated.sections }), metadata: JSON.stringify(generated.metadata), created_at: run.created_at };
    this.db.prepare('INSERT INTO resume_artifacts VALUES (?, ?, ?, ?, ?, ?, ?)').run(artifact.id, artifact.resume_artifact_run_id, artifact.artifact_type, artifact.format_version, artifact.content, artifact.metadata, artifact.created_at);
    return this.getResumeArtifactRun(run.id);
  }
  getResumeArtifactRun(id) {
    const run = this.db.prepare('SELECT * FROM resume_artifact_runs WHERE id = ?').get(id); if (!run) throw new Error(`Resume Artifact Run not found: ${id}`);
    const artifacts = this.db.prepare('SELECT * FROM resume_artifacts WHERE resume_artifact_run_id = ? ORDER BY artifact_type, id').all(id).map((item) => ({ ...item, content: JSON.parse(item.content), metadata: JSON.parse(item.metadata) }));
    return { ...run, candidate_knowledge_snapshot: JSON.parse(run.candidate_knowledge_snapshot), job_requirement_profile_reference: JSON.parse(run.job_requirement_profile_reference), resume_artifacts: artifacts };
  }
  candidateFactIntegrity(factIds) {
    const statement = this.db.prepare(`SELECT candidate_knowledge_facts.id, candidate_knowledge_facts.integration_decision_id,
      integration_decisions.id AS integration_id,
      EXISTS(SELECT 1 FROM candidate_fact_evidence_links WHERE candidate_fact_evidence_links.candidate_fact_id = candidate_knowledge_facts.id) AS provenance_exists
      FROM candidate_knowledge_facts LEFT JOIN integration_decisions ON integration_decisions.id = candidate_knowledge_facts.integration_decision_id WHERE candidate_knowledge_facts.id = ?`);
    return new Map(factIds.map((id) => {
      const row = statement.get(id);
      return [id, { fact_exists: Boolean(row), integration_exists: Boolean(row && row.integration_id), provenance_exists: Boolean(row && row.provenance_exists) }];
    }));
  }
  createResumeValidationRun({ resumeArtifactRunId, validationPolicyVersion = validation.POLICY_VERSION }) {
    const artifactRun = this.getResumeArtifactRun(resumeArtifactRunId);
    const plan = this.getResumeTailoringPlanRun(artifactRun.resume_tailoring_plan_run_id);
    const factIds = plan.resume_content_selections.map((selection) => selection.candidate_fact_id);
    const result = validation.validate({ artifactRun, plan, integrity: this.candidateFactIntegrity(factIds) });
    const run = { id: this.id(), resume_artifact_run_id: artifactRun.id, resume_tailoring_plan_run_id: plan.id, validation_policy_version: validationPolicyVersion, artifact_snapshot: JSON.stringify(artifactRun), plan_snapshot: JSON.stringify(plan), validation_status: validation.statusFor(result.findings), limitations: 'Validation is deterministic and structural. It does not generate, rewrite, infer semantic equivalence, update Candidate Knowledge, acquire evidence, or render final documents.', created_at: this.now() };
    this.db.prepare('INSERT INTO resume_validation_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(run.id, run.resume_artifact_run_id, run.resume_tailoring_plan_run_id, run.validation_policy_version, run.artifact_snapshot, run.plan_snapshot, run.validation_status, run.limitations, run.created_at);
    for (const item of result.findings) this.db.prepare('INSERT INTO validation_findings VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(this.id(), run.id, item.category, item.rule, item.severity, item.message, JSON.stringify(item.references), run.created_at);
    return this.getResumeValidationRun(run.id);
  }
  getResumeValidationRun(id) {
    const run = this.db.prepare('SELECT * FROM resume_validation_runs WHERE id = ?').get(id); if (!run) throw new Error(`Resume Validation Run not found: ${id}`);
    const findings = this.db.prepare('SELECT * FROM validation_findings WHERE resume_validation_run_id = ? ORDER BY created_at, id').all(id).map((item) => ({ ...item, references: JSON.parse(item.references_json) }));
    return { ...run, artifact_snapshot: JSON.parse(run.artifact_snapshot), plan_snapshot: JSON.parse(run.plan_snapshot), validation_findings: findings };
  }
  integrationSource(upstreamRunType, upstreamRunId, ref) {
    if (upstreamRunType === 'evidence_discovery_run' && ref.type === 'evidence_candidate') {
      const row = this.db.prepare(`SELECT evidence_candidates.*, evidence_resolutions.state AS resolution_state FROM evidence_candidates JOIN evidence_resolutions ON evidence_resolutions.evidence_candidate_id = evidence_candidates.id WHERE evidence_candidates.id = ? AND evidence_candidates.discovery_run_id = ?`).get(ref.id, upstreamRunId);
      return row ? { valid: true, positive: row.resolution_state === 'accepted_for_need' || ref.reviewedConfirmation === true, source_type: ref.type, source_id: ref.id, raw_value: JSON.parse(row.supporting_value), provenance: JSON.parse(row.provenance) } : { valid: false, positive: false };
    }
    if (upstreamRunType === 'acquisition_result_run' && ref.type === 'acquisition_result') {
      const row = this.db.prepare('SELECT * FROM acquisition_results WHERE id = ? AND acquisition_result_run_id = ?').get(ref.id, upstreamRunId);
      return row ? { valid: true, positive: ref.positiveConfirmation === true && row.execution_status === 'captured', source_type: ref.type, source_id: ref.id, raw_value: row.raw_captured_evidence ? JSON.parse(row.raw_captured_evidence) : null, provenance: JSON.parse(row.provenance) } : { valid: false, positive: false };
    }
    return { valid: false, positive: false };
  }
  persistObservation(source, upstreamRunType, upstreamRunId) {
    let observation = this.db.prepare('SELECT * FROM evidence_observations WHERE source_type = ? AND source_id = ?').get(source.source_type, source.source_id);
    if (!observation) {
      observation = { id: this.id(), source_type: source.source_type, source_id: source.source_id, upstream_run_type: upstreamRunType, upstream_run_id: upstreamRunId, raw_value: JSON.stringify(source.raw_value), provenance: JSON.stringify(source.provenance), positive_confirmation: source.positive ? 1 : 0, created_at: this.now() };
      this.db.prepare('INSERT INTO evidence_observations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(observation.id, observation.source_type, observation.source_id, observation.upstream_run_type, observation.upstream_run_id, observation.raw_value, observation.provenance, observation.positive_confirmation, observation.created_at);
    }
    return observation;
  }
  createCandidateKnowledgeIntegrationRun({ candidateProfileId, evidenceDiscoveryRunId, acquisitionResultRunId, proposals }) {
    if (Boolean(evidenceDiscoveryRunId) === Boolean(acquisitionResultRunId)) throw new Error('Integration requires exactly one upstream Evidence Discovery Run or Acquisition Result Run');
    if (!Array.isArray(proposals)) throw new Error('Integration proposals must be an array of explicit bounded structured proposals');
    this.getProfile(candidateProfileId);
    const upstreamRunType = evidenceDiscoveryRunId ? 'evidence_discovery_run' : 'acquisition_result_run';
    const upstreamRunId = evidenceDiscoveryRunId || acquisitionResultRunId;
    const upstream = evidenceDiscoveryRunId ? this.getEvidenceDiscoveryRun(upstreamRunId) : this.getAcquisitionResultRun(upstreamRunId);
    const currentFacts = this.getCommittedCandidateKnowledge(candidateProfileId);
    const run = { id: this.id(), candidate_profile_id: candidateProfileId, upstream_run_type: upstreamRunType, upstream_run_id: upstreamRunId, policy_version: integration.POLICY_VERSION, knowledge_snapshot: JSON.stringify(currentFacts), upstream_snapshot: JSON.stringify(upstream), limitations: 'Only explicit bounded proposals are evaluated. Raw evidence alone, unresolved evidence, and evaluative claims cannot become Candidate Knowledge.', created_at: this.now() };
    this.db.prepare('INSERT INTO candidate_knowledge_integration_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(run.id, run.candidate_profile_id, run.upstream_run_type, run.upstream_run_id, run.policy_version, run.knowledge_snapshot, run.upstream_snapshot, run.limitations, run.created_at);
    for (const proposal of proposals) {
      const sources = Array.isArray(proposal.sourceEvidenceRefs) ? proposal.sourceEvidenceRefs.map((ref) => this.integrationSource(upstreamRunType, upstreamRunId, ref)) : [];
      const result = integration.classify({ proposal, sources, existingFacts: currentFacts });
      const decision = { id: this.id(), integration_run_id: run.id, proposed_entity_type: proposal.entityType || null, proposed_value: proposal.value ? JSON.stringify(proposal.value) : null, source_evidence_refs: JSON.stringify(proposal.sourceEvidenceRefs || []), related_references: JSON.stringify(proposal.relatedReferences || []), comparison: JSON.stringify({ identity_key: proposal.value ? integration.identity(proposal.entityType, proposal.value) : null, existing_fact_ids: currentFacts.map((fact) => fact.id) }), state: result.state, rationale: result.rationale, confirmation_status: proposal.confirmationStatus || null, confidence_level: proposal.confidenceLevel || null, policy_version: integration.POLICY_VERSION, existing_fact_id: result.existingFactId || proposal.priorFactId || null, created_at: this.now() };
      this.db.prepare('INSERT INTO integration_decisions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(decision.id, decision.integration_run_id, decision.proposed_entity_type, decision.proposed_value, decision.source_evidence_refs, decision.related_references, decision.comparison, decision.state, decision.rationale, decision.confirmation_status, decision.confidence_level, decision.policy_version, decision.existing_fact_id, decision.created_at);
      if (decision.state === 'duplicate') {
        for (const source of sources.filter((item) => item.valid)) { const observation = this.persistObservation(source, upstreamRunType, upstreamRunId); this.db.prepare('INSERT OR IGNORE INTO candidate_fact_evidence_links VALUES (?, ?, ?, ?, ?)').run(result.existingFactId, observation.id, decision.id, 'confirms', this.now()); }
        continue;
      }
      if (decision.state !== 'accepted') continue;
      if (proposal.priorFactId && !currentFacts.some((fact) => fact.id === proposal.priorFactId)) throw new Error('Accepted revision must reference a Candidate Fact belonging to this profile');
      const fact = { id: this.id(), candidate_profile_id: candidateProfileId, entity_type: proposal.entityType, canonical_value: JSON.stringify(proposal.value), display_value: proposal.displayValue || null, identity_key: integration.identity(proposal.entityType, proposal.value), confirmation_status: 'confirmed', confidence_level: ['high', 'medium', 'low'].includes(proposal.confidenceLevel) ? proposal.confidenceLevel : 'medium', validity_dates: proposal.validityDates ? JSON.stringify(proposal.validityDates) : null, integration_decision_id: decision.id, created_at: this.now() };
      this.db.prepare('INSERT INTO candidate_knowledge_facts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(fact.id, fact.candidate_profile_id, fact.entity_type, fact.canonical_value, fact.display_value, fact.identity_key, fact.confirmation_status, fact.confidence_level, fact.validity_dates, fact.integration_decision_id, fact.created_at);
      for (const source of sources) { const observation = this.persistObservation(source, upstreamRunType, upstreamRunId); this.db.prepare('INSERT INTO candidate_fact_evidence_links VALUES (?, ?, ?, ?, ?)').run(fact.id, observation.id, decision.id, result.relation === 'extends' ? 'extends' : result.relation === 'confirms' ? 'confirms' : 'supports', this.now()); }
      if (result.relation !== 'new') this.db.prepare('INSERT INTO candidate_fact_revisions VALUES (?, ?, ?, ?, ?, ?)').run(this.id(), proposal.priorFactId, fact.id, result.relation, decision.id, this.now());
      currentFacts.push({ ...fact, value: proposal.value });
    }
    return this.getCandidateKnowledgeIntegrationRun(run.id);
  }
  getCandidateKnowledgeIntegrationRun(id) {
    const run = this.db.prepare('SELECT * FROM candidate_knowledge_integration_runs WHERE id = ?').get(id);
    if (!run) throw new Error(`Candidate Knowledge Integration Run not found: ${id}`);
    const decisions = this.db.prepare('SELECT * FROM integration_decisions WHERE integration_run_id = ? ORDER BY created_at, id').all(id).map((item) => ({ ...item, proposed_value: item.proposed_value ? JSON.parse(item.proposed_value) : null, source_evidence_refs: JSON.parse(item.source_evidence_refs), related_references: JSON.parse(item.related_references), comparison: JSON.parse(item.comparison) }));
    const facts = this.db.prepare('SELECT * FROM candidate_knowledge_facts WHERE integration_decision_id IN (SELECT id FROM integration_decisions WHERE integration_run_id = ?) ORDER BY created_at, id').all(id).map((item) => ({ ...item, canonical_value: JSON.parse(item.canonical_value) }));
    return { ...run, knowledge_snapshot: JSON.parse(run.knowledge_snapshot), upstream_snapshot: JSON.parse(run.upstream_snapshot), integration_decisions: decisions, applied_facts: facts };
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
