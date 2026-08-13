const POLICY_VERSION = 'resume-tailoring-policy/1.1.0';
const DOCUMENT_OPERATION_VERSION = 'resume-document-operations/1.0.0';
const GENERIC = new Set(['communication', 'teamwork']);
const SUMMARY_ELIGIBLE = new Set(['skill', 'project', 'experience', 'achievement', 'responsibility', 'education']);

function normalize(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim().replace(/\s+/g, ' '); }
function values(fact) { const value = fact.value || fact.canonical_value || {}; return Object.values(value).filter((item) => typeof item === 'string').map(normalize); }
function matches(requirement, fact) { const target = normalize(requirement.normalized_name); return values(fact).some((value) => value === target || value.includes(target)); }
function section(fact) { return ({ skill: 'Skills', project: 'Projects', experience: 'Experience', education: 'Education', credential: 'Certifications', achievement: 'Experience', responsibility: 'Experience' })[fact.entity_type] || 'Professional Summary'; }
function claimScope(fact, supportingProject) {
  let scope;
  if (fact.entity_type === 'skill') scope = supportingProject ? ['skill_name', 'used_in_linked_project'] : ['skill_name'];
  else if (fact.entity_type === 'achievement') scope = ['accepted_achievement_detail'];
  else if (fact.entity_type === 'project') scope = ['project_name', 'bounded_project_responsibilities'];
  else if (fact.entity_type === 'responsibility') scope = ['bounded_responsibility', 'bounded_project_responsibilities'];
  else scope = ['accepted_fact_detail'];
  if (SUMMARY_ELIGIBLE.has(fact.entity_type)) scope.push('cross_section_summary');
  return scope;
}
function plan({ facts, requirements, sourceResumeArtifact }) {
  const seen = new Set();
  const selections = [];
  const coverage = [];
  for (const requirement of requirements) {
    const direct = facts.filter((fact) => matches(requirement, fact));
    const material = requirement.importance_score >= 4 && requirement.resume_value_score >= 4;
    coverage.push({ requirement_id: requirement.id, coverage_status: !material ? 'not_resume_relevant' : direct.length ? 'covered' : 'uncovered', supporting_candidate_fact_ids: direct.map((fact) => fact.id), coverage_rationale: direct.length ? 'Committed Candidate Knowledge contains an explicit deterministic match.' : 'No committed Candidate Knowledge explicitly supports this material requirement; this is not a negative candidate claim.', limitations: direct.length ? 'Coverage does not establish proficiency, ownership, duration, leadership, or impact beyond each fact.' : 'Unknown is preserved; no content is invented.' });
    for (const fact of direct) {
      if (seen.has(fact.id)) continue;
      seen.add(fact.id);
      const generic = GENERIC.has(normalize(requirement.normalized_name));
      const central = requirement.importance_score >= 7 && requirement.resume_value_score >= 5;
      const project = facts.find((item) => item.entity_type === 'project' && values(item).some((value) => values(fact).some((skill) => value.includes(skill))));
      const score = requirement.importance_score + requirement.resume_value_score + (fact.confirmation_status === 'confirmed' ? 3 : 0) + (project ? 2 : 0) - (generic && !central ? 8 : 0);
      const state = generic && !central ? 'deprioritize' : 'include';
      selections.push({ candidate_fact_id: fact.id, candidate_fact_revision: fact.id, mapped_job_requirement_ids: [requirement.id], selection_state: state, relevance_rationale: state === 'include' ? 'Explicit committed fact directly supports a material job requirement.' : 'Generic language is retained but ranked below concrete role-specific evidence.', inherited_provenance_references: [fact.integration_decision_id], recommended_section: section(fact), emphasis_level: score >= 16 ? 'high' : score >= 10 ? 'medium' : 'low', priority_score: score, permitted_claim_scope: claimScope(fact, project), blocked_claim_scopes: ['proficiency', 'years_of_experience', 'ownership', 'leadership', 'impact'], limitations: 'Selection is based only on committed accepted facts and does not authorize stronger claims. Responsibility wording remains bounded whether its source-resume parentage places it in Experience or Projects. Cross-section summary synthesis, when permitted, may only restate these selected facts in target-job context.' });
    }
  }
  for (const fact of facts) if (!seen.has(fact.id)) selections.push({ candidate_fact_id: fact.id, candidate_fact_revision: fact.id, mapped_job_requirement_ids: [], selection_state: 'omit', relevance_rationale: 'No explicit match to this Job Requirement Profile.', inherited_provenance_references: [fact.integration_decision_id], recommended_section: section(fact), emphasis_level: 'low', priority_score: 0, permitted_claim_scope: [], blocked_claim_scopes: [], limitations: 'Omission is role-specific and does not diminish Candidate Knowledge.' });
  selections.sort((a, b) => b.priority_score - a.priority_score || a.candidate_fact_id.localeCompare(b.candidate_fact_id));
  const sectionPlans = [...new Set(selections.filter((item) => item.selection_state === 'include').map((item) => item.recommended_section))].map((name, index) => ({ section: name, recommended_order: index + 1, candidate_fact_ids: selections.filter((item) => item.selection_state === 'include' && item.recommended_section === name).map((item) => item.candidate_fact_id) }));
  const sourceFlags = !sourceResumeArtifact ? [] : String(sourceResumeArtifact.content || '').split(/\r?\n/).filter((line) => /\b(advanced|expert|\d+\+? years?|led|increased|improved)\b/i.test(line)).map((line) => ({ source_artifact_id: sourceResumeArtifact.id, source_artifact_version: sourceResumeArtifact.version, text: line, status: 'requires_candidate_knowledge_validation', rationale: 'Source resume wording is not trusted over committed Candidate Knowledge and was not edited.' }));
  return { selections, coverage, sectionPlans, sourceFlags, limitations: 'No prose, rendering, acquisition, or Candidate Knowledge write is performed.' };
}

function documentOperations({ tailoringPlan, artifactRun }) {
  const artifact = artifactRun?.resume_artifacts?.find((item) => item.artifact_type === 'structured_resume');
  const composition = artifact?.content?.metadata?.composition || {};
  const operations = [];
  for (const sourceStatementId of composition.preserved_source_statement_ids || []) {
    operations.push({ operation: 'KEEP', node_id: sourceStatementId });
  }
  for (const omitted of composition.omitted_source_statements || []) {
    operations.push({
      operation: 'OMIT',
      node_id: omitted.source_statement_id,
      selection_ids: omitted.resume_content_selection_ids || [],
      reason: omitted.reason || 'role_specific_omission',
    });
  }
  for (const superseded of composition.superseded_source_statements || []) {
    operations.push({
      operation: 'REWRITE',
      node_id: superseded.source_statement_id,
      generated_node_ids: superseded.generated_statement_ids || [],
      selection_ids: superseded.resume_content_selection_ids || [],
      reason: superseded.reason || 'supported_tailored_replacement',
    });
  }
  for (const sectionPlan of tailoringPlan?.resume_section_plans || []) {
    operations.push({
      operation: 'REORDER_SECTION',
      section: sectionPlan.section,
      position: sectionPlan.recommended_order,
    });
  }
  return {
    schema: DOCUMENT_OPERATION_VERSION,
    source_resume_artifact_id: composition.source_resume_snapshot?.source_resume_artifact_id || null,
    operations,
  };
}

module.exports = { DOCUMENT_OPERATION_VERSION, POLICY_VERSION, documentOperations, plan };
