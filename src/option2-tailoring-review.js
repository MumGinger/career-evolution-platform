const evidenceReview = require('./evidence-review');
const humanReview = require('./human-review');
const { providerFromConfig: draftProviderFromConfig } = require('./resume-draft');

function normal(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function cleanSourceClaim(value) {
  return String(value || '').replace(/^\s*[-*•▪◦]+\s*/, '').trim();
}

function validationExportSafe(run) {
  return ['passed', 'passed_with_warnings'].includes(run?.validation_status);
}

function qualityReady(artifactRun, review, tailoringPlan) {
  const artifact = artifactRun.resume_artifacts.find((item) => item.artifact_type === 'structured_resume');
  const sections = artifact?.content?.sections || [];
  const populated = new Set(sections.filter((section) => section.statements?.length).map((section) => section.section));
  const rendered = new Map();
  for (const section of sections) for (const statement of section.statements || []) {
    for (const selectionId of statement.resume_content_selection_ids || []) {
      rendered.set(selectionId, [...(rendered.get(selectionId) || []), section.section]);
    }
  }
  const required = (tailoringPlan?.resume_content_selections || []).filter((selection) =>
    selection.selection_state === 'include' && ['Experience', 'Projects'].includes(selection.recommended_section));
  return review.length > 0
    && required.length > 0
    && required.every((selection) => (rendered.get(selection.id) || []).includes(selection.recommended_section))
    && (populated.has('Experience') || populated.has('Projects'));
}

function markdownFromArtifact(artifactRun) {
  const artifact = artifactRun.resume_artifacts.find((item) => item.artifact_type === 'structured_resume');
  return (artifact?.content?.sections || [])
    .filter((section) => section.statements?.length)
    .map((section) => `${section.section === 'Applicant Header' ? '' : `## ${section.section}\n\n`}${section.statements.map((statement) => statement.display_style === 'heading' ? `### ${statement.text}` : statement.display_style === 'line' ? statement.text : `- ${statement.text}`).join('\n')}`)
    .filter(Boolean)
    .join('\n\n');
}

function markdownFromReview(review) {
  return review.map((section) => {
    const version = section.ai_version || {};
    const lines = (version.statements || []).map((statement) => {
      if (statement.display_style === 'heading') return `### ${statement.text}`;
      if (statement.display_style === 'line') return statement.text;
      return `- ${statement.text}`;
    });
    if (!lines.length) return '';
    if (section.section === 'Applicant Header') return lines.join('\n');
    return `## ${section.section}\n\n${lines.join('\n')}`;
  }).filter(Boolean).join('\n\n');
}

function installEffectiveKnowledgeBoundary(store) {
  if (store.__option2EffectiveKnowledgeBoundary) return;
  const baseGetCommitted = store.getCommittedCandidateKnowledge.bind(store);
  store.getCommittedCandidateKnowledge = function getEffectiveCandidateKnowledge(profileId) {
    const facts = baseGetCommitted(profileId);
    const superseded = new Set(this.db.prepare(`SELECT revisions.prior_fact_id
      FROM candidate_fact_revisions revisions
      JOIN candidate_knowledge_facts prior ON prior.id = revisions.prior_fact_id
      WHERE prior.candidate_profile_id = ? AND revisions.relation = 'supersedes'`).all(profileId).map((row) => row.prior_fact_id));
    return facts.filter((fact) => !superseded.has(fact.id));
  };
  Object.defineProperty(store, '__option2EffectiveKnowledgeBoundary', { value: true });
}

function sourceForFact(session) {
  const reviewByCandidate = new Map((session.reviewRun?.review_decisions || []).map((decision) => [
    decision.evidence_candidate_id,
    decision,
  ]));
  const integrationById = new Map((session.integration?.integration_decisions || []).map((decision) => [decision.id, decision]));
  const factMap = new Map();
  for (const fact of session.integration?.applied_facts || []) {
    const decision = integrationById.get(fact.integration_decision_id);
    const evidenceRef = decision?.source_evidence_refs?.find((ref) => ref.type === 'evidence_candidate');
    const reviewed = evidenceRef ? reviewByCandidate.get(evidenceRef.id) : null;
    if (!reviewed) continue;
    factMap.set(fact.id, {
      candidateFactId: fact.id,
      evidenceCandidateId: reviewed.evidence_candidate_id,
      originalText: reviewed.original_claim,
      sourceEvidenceRefs: decision.source_evidence_refs,
    });
  }
  for (const [factId, source] of session.correctionFactSources || []) factMap.set(factId, source);
  return factMap;
}

function buildTailoringReview(session) {
  const sourceByFact = sourceForFact(session);
  const job = session.store.getJobRequirementProfile(session.jobId);
  const requirements = new Map(job.requirements.map((requirement) => [requirement.id, requirement.normalized_name]));
  const artifact = session.artifact.resume_artifacts.find((item) => item.artifact_type === 'structured_resume');
  const seen = new Set();
  const items = [];
  for (const section of artifact?.content?.sections || []) {
    for (const statement of section.statements || []) {
      if (statement.content_origin !== 'candidate_knowledge_generated') continue;
      const factIds = statement.provenance?.candidate_fact_ids || [statement.provenance?.candidate_fact_id].filter(Boolean);
      const source = factIds.map((id) => sourceByFact.get(id)).find(Boolean);
      if (!source?.originalText || seen.has(statement.statement_id)) continue;
      seen.add(statement.statement_id);
      const originalText = String(source.originalText).trim();
      const tailoredText = String(statement.text || '').trim();
      items.push({
        id: statement.statement_id,
        section: section.section,
        originalText,
        tailoredText,
        materialRewrite: normal(originalText) !== normal(tailoredText),
        evidenceCandidateId: source.evidenceCandidateId,
        candidateFactId: source.candidateFactId,
        whyTailored: (statement.provenance?.job_requirement_ids || []).map((id) => requirements.get(id)).filter(Boolean),
      });
    }
  }
  return items;
}

function sourceAttestationDecisions(session) {
  return session.queue.flatMap((group) => group.candidates.map((item) => evidenceReview.decisionFrom(item.candidate, {
    action: 'accepted',
    rationale: 'V1 source attestation: this item is traceable to exact text in the applicant-uploaded resume. The source text is trusted; any later materially changed wording remains separately reviewable.',
  })));
}

function sourceAttestedProposal(source, reviewDecision, reviewRun) {
  const candidate = source.candidate;
  const exactRaw = String(candidate.provenance?.exact_source_text || candidate.supporting_text || '').trim();
  const exact = cleanSourceClaim(exactRaw);
  if (!exact) return null;
  const sourceReference = candidate.provenance?.evidence_span_id || candidate.source_reference;
  const entityType = source.entity_type;
  let value;
  if (entityType === 'skill') value = { name: exact };
  else if (['responsibility', 'achievement', 'domain_knowledge'].includes(entityType)) value = { text: exact };
  else if (entityType === 'credential') value = { name: exact };
  else if (entityType === 'project') {
    const parentRaw = cleanSourceClaim(candidate.provenance?.semantic?.raw_text || '');
    const contextualText = cleanSourceClaim(candidate.provenance?.contextual_match?.matched_source_text || '');
    const name = parentRaw || exact;
    value = { name, source_reference: sourceReference };
    if (contextualText && normal(contextualText) !== normal(name)) value.text = contextualText;
  } else return null;
  return {
    entityType,
    value,
    displayValue: entityType === 'project' && value.text ? `${value.name}: ${value.text}` : exact,
    confirmationStatus: 'confirmed',
    confidenceLevel: candidate.confidence_level,
    sourceEvidenceRefs: reviewDecision.source_evidence_refs,
    relatedReferences: [reviewRun.id],
  };
}

function integrateSourceAttestedEvidence({ store, candidateProfileId, discoveryRunId, reviewRun }) {
  const proposals = reviewRun.review_decisions
    .filter((decision) => decision.action === 'accepted')
    .map((decision) => sourceAttestedProposal(
      store.getEvidenceReviewCandidate(discoveryRunId, decision.evidence_candidate_id),
      decision,
      reviewRun,
    ))
    .filter(Boolean);
  return proposals.length ? store.createCandidateKnowledgeIntegrationRun({
    candidateProfileId,
    evidenceDiscoveryRunId: discoveryRunId,
    proposals,
  }) : null;
}

function correctedSourceSnapshot(session) {
  const source = session.baseSourceResumeSnapshot || session.tailoring?.source_resume_snapshot;
  if (!source || !(session.correctedSourceKeys?.size)) return source || null;
  const sections = source.sections.map((section) => ({
    ...section,
    statements: (section.statements || []).filter((statement) => !session.correctedSourceKeys.has(normal(statement.text))),
  })).filter((section) => section.statements.length);
  return {
    ...source,
    sections,
    content: sections.flatMap((section) => section.statements.map((statement) => statement.text)).join('\n'),
  };
}

function draftProvider(session) {
  try {
    return draftProviderFromConfig(session.providerConfig);
  } catch {
    return draftProviderFromConfig({ provider: 'mock' });
  }
}

async function generateTailoring(session) {
  const sourceResumeArtifact = correctedSourceSnapshot(session);
  const tailoring = session.store.createResumeTailoringPlanRun({
    candidateProfileId: session.profileId,
    jobRequirementProfileId: session.jobId,
    ...(sourceResumeArtifact ? { sourceResumeArtifact } : {}),
  });
  if (!session.baseSourceResumeSnapshot && tailoring.source_resume_snapshot) {
    session.baseSourceResumeSnapshot = JSON.parse(JSON.stringify(tailoring.source_resume_snapshot));
  }
  const snapshot = session.store.createCareerUnderstandingSnapshotRun({ candidateProfileId: session.profileId });
  const presentation = session.store.createPresentationStrategyRun({
    candidateProfileId: session.profileId,
    jobRequirementProfileId: session.jobId,
    resumeTailoringPlanRunId: tailoring.id,
    careerUnderstandingSnapshotRunId: snapshot.id,
  });
  const artifact = await session.store.createResumeArtifactDraftRun({
    resumeTailoringPlanRunId: tailoring.id,
    presentationStrategyRunId: presentation.id,
    provider: draftProvider(session),
  });
  const validation = session.store.createResumeValidationRun({ resumeArtifactRunId: artifact.id });
  const generatedReview = humanReview.createDraft({ artifactRun: artifact, presentationStrategyRun: presentation });
  const exportSafe = validationExportSafe(validation) && qualityReady(artifact, generatedReview, tailoring);
  const message = !validationExportSafe(validation)
    ? 'Tailoring Review and export are blocked until deterministic draft validation passes.'
    : !exportSafe
      ? 'Tailoring Review is blocked because required included evidence did not render in its planned Experience or Projects section.'
      : null;
  Object.assign(session, {
    tailoring,
    presentation,
    artifact,
    draftValidation: validation,
    generatedReview,
    stage: exportSafe ? 'tailoring-review' : 'draft-blocked',
  });
  const tailoringReview = exportSafe ? buildTailoringReview(session) : [];
  session.tailoringReview = tailoringReview;
  session.option2PreparedResult = {
    stage: exportSafe ? 'Tailoring Review' : 'Draft blocked',
    tailoringReview,
    resumeMarkdown: markdownFromArtifact(artifact),
    draftValidation: validation.validation_status,
    draftValidationFindings: validation.validation_findings,
    blocked: !exportSafe,
    message,
  };
  return session.option2PreparedResult;
}

async function prepare(session) {
  if (session.stage !== 'evidence') throw new Error('Tailoring preparation requires a newly validated source-resume session.');
  installEffectiveKnowledgeBoundary(session.store);
  session.correctedSourceKeys ||= new Set();
  session.correctionFactSources ||= new Map();
  session.correctionIntegrations ||= [];
  const reviewRun = session.store.createEvidenceReviewRun({
    candidateProfileId: session.profileId,
    jobRequirementProfileId: session.jobId,
    evidenceDiscoveryRunId: session.discoveryId,
    decisions: sourceAttestationDecisions(session),
    reviewActor: 'source_resume_attestation',
  });
  const integration = integrateSourceAttestedEvidence({
    store: session.store,
    candidateProfileId: session.profileId,
    discoveryRunId: session.discoveryId,
    reviewRun,
  });
  Object.assign(session, { reviewRun, integration });
  return generateTailoring(session);
}

function restoredStatement(statement, item) {
  return {
    ...statement,
    text: item.originalText,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    provenance: {
      source_kind: 'validated_resume_tailoring_restore',
      evidence_candidate_id: item.evidenceCandidateId,
      exact_source_text: item.originalText,
      replaced_generated_statement_id: statement.statement_id,
    },
  };
}

function correctionValue(priorFact, item, answer, acquisitionResultId) {
  const prior = priorFact?.value || priorFact?.canonical_value || {};
  const sourceText = cleanSourceClaim(item.originalText);
  const combined = `${sourceText} ${String(answer || '').trim()}`.trim();
  if (priorFact.entity_type === 'project') {
    return {
      value: {
        name: prior.name || sourceText,
        text: combined,
        source_reference: `acquisition_result:${acquisitionResultId}`,
      },
      displayValue: `${prior.name || sourceText}: ${combined}`,
    };
  }
  if (['responsibility', 'achievement', 'domain_knowledge'].includes(priorFact.entity_type)) {
    return { value: { text: combined }, displayValue: combined };
  }
  if (priorFact.entity_type === 'skill') return { value: { name: String(answer).trim() }, displayValue: String(answer).trim() };
  if (priorFact.entity_type === 'credential') return { value: { name: String(answer).trim() }, displayValue: String(answer).trim() };
  throw new Error(`Tailoring correction is not yet supported for ${priorFact.entity_type}. Use Career Review to edit this section for the current application.`);
}

function integrateCorrection(session, item, correction) {
  const answer = String(correction || '').trim();
  if (!answer) throw new Error('Tell us what is inaccurate or missing before continuing.');
  const store = session.store;
  const priorFact = store.getCommittedCandidateKnowledge(session.profileId).find((fact) => fact.id === item.candidateFactId);
  if (!priorFact) throw new Error('The correction must reference the Candidate Knowledge fact that supported this proposal.');
  const candidate = store.getEvidenceReviewCandidate(session.discoveryId, item.evidenceCandidateId).candidate;
  const discovery = store.getEvidenceDiscoveryRun(session.discoveryId);
  const planRun = store.createAcquisitionPlanRun({
    informationNeedRunId: discovery.information_need_run_id,
    evidenceDiscoveryRunId: session.discoveryId,
  });
  const targetPlan = planRun.acquisition_plans.find((plan) =>
    plan.information_needs.some((need) => need.id === candidate.information_need_id));
  const targetAction = targetPlan?.acquisition_actions?.[0];
  if (!targetAction) throw new Error('The correction could not be routed through the existing evidence acquisition boundary.');
  const captures = planRun.acquisition_plans.flatMap((plan) => plan.acquisition_actions).map((action) =>
    action.id === targetAction.id
      ? {
        actionId: action.id,
        executionStatus: 'captured',
        rawCapturedEvidence: {
          correction: answer,
          original_source_text: item.originalText,
          proposed_tailored_text: item.tailoredText,
        },
        sourceType: 'candidate_tailoring_correction',
        provenance: {
          adapter: 'candidate_tailoring_review',
          actor: 'user',
          evidence_candidate_id: item.evidenceCandidateId,
          prior_candidate_fact_id: priorFact.id,
        },
        limitations: 'Applicant-supplied correction is raw evidence until 003.6 accepts a bounded proposal.',
      }
      : { actionId: action.id, executionStatus: 'skipped', sourceType: 'candidate_tailoring_correction' });
  const acquisition = store.createAcquisitionResultRun({ acquisitionPlanRunId: planRun.id, captures });
  const captured = acquisition.acquisition_results.find((result) => result.acquisition_action_id === targetAction.id);
  if (!captured || captured.execution_status !== 'captured') throw new Error('The correction evidence was not captured.');
  const corrected = correctionValue(priorFact, item, answer, captured.id);
  const integration = store.createCandidateKnowledgeIntegrationRun({
    candidateProfileId: session.profileId,
    acquisitionResultRunId: acquisition.id,
    proposals: [{
      entityType: priorFact.entity_type,
      value: corrected.value,
      displayValue: corrected.displayValue,
      confirmationStatus: 'confirmed',
      confidenceLevel: 'high',
      sourceEvidenceRefs: [{ type: 'acquisition_result', id: captured.id, positiveConfirmation: true }],
      relatedReferences: [priorFact.id, item.evidenceCandidateId],
      relation: 'supersedes',
      priorFactId: priorFact.id,
    }],
  });
  const applied = integration.applied_facts[0];
  if (!applied) throw new Error('003.6 did not accept the bounded correction, so the draft was not regenerated from it.');
  const observation = store.createCareerConversationObservation({
    question: `What is inaccurate or missing in the proposed tailoring for ${item.section}?`,
    answer,
    workflowSource: `tailoring_review:${session.id}:${item.id}`,
  });
  session.correctedSourceKeys.add(normal(item.originalText));
  session.correctionFactSources.set(applied.id, {
    candidateFactId: applied.id,
    evidenceCandidateId: item.evidenceCandidateId,
    originalText: item.originalText,
    sourceEvidenceRefs: [{ type: 'acquisition_result', id: captured.id }],
  });
  session.correctionIntegrations.push({ acquisition, integration, observation, itemId: item.id });
  return {
    id: item.id,
    section: item.section,
    correction: answer,
    status: 'integrated_and_regenerated',
    message: 'Your correction was saved as confirmed context and the tailored wording was regenerated. Review the new before/after proposal again.',
  };
}

async function apply(session, supplied = []) {
  if (session.stage !== 'tailoring-review') throw new Error('Tailoring Review is not available for this session.');
  const reviewable = (session.tailoringReview || []).filter((item) => item.materialRewrite);
  const allowedIds = new Set((session.tailoringReview || []).map((item) => item.id));
  const decisions = new Map();
  for (const decision of supplied || []) {
    if (!allowedIds.has(decision.id) || decisions.has(decision.id)) throw new Error('Tailoring Review contains an unknown or duplicate decision.');
    if (!['use_tailored', 'keep_original', 'needs_correction'].includes(decision.action)) throw new Error('Choose Use tailored version, Keep original wording, or Needs correction.');
    decisions.set(decision.id, decision);
  }
  if (reviewable.some((item) => !decisions.has(item.id))) throw new Error('Choose one outcome for every materially changed tailoring proposal.');

  const corrections = [];
  for (const item of reviewable) {
    const decision = decisions.get(item.id);
    if (decision.action === 'needs_correction') corrections.push(integrateCorrection(session, item, decision.correction));
  }
  if (corrections.length) {
    const regenerated = await generateTailoring(session);
    session.correctionObservations = session.correctionIntegrations.map((entry) => entry.observation);
    return { ...regenerated, corrections, regenerated: true };
  }

  const byId = new Map((session.tailoringReview || []).map((item) => [item.id, item]));
  const finalReview = (session.generatedReview || []).map((section) => ({
    ...section,
    ai_version: {
      ...section.ai_version,
      statements: (section.ai_version?.statements || []).map((statement) => {
        const item = byId.get(statement.statement_id);
        if (!item || !item.materialRewrite) return statement;
        const decision = decisions.get(item.id);
        return decision.action === 'use_tailored' ? statement : restoredStatement(statement, item);
      }),
    },
  }));
  session.tailoringReviewDecisions = [...decisions.values()];
  session.tailoringFinalReview = finalReview;
  session.stage = 'career-review';
  return {
    stage: 'Career Review',
    careerReview: finalReview,
    resumeMarkdown: markdownFromReview(finalReview),
    validation: session.draftValidation.validation_status,
    validationFindings: session.draftValidation.validation_findings,
    corrections: [],
  };
}

function translateCareerReviewDecisions(session, supplied = []) {
  if (!session.tailoringFinalReview) return supplied;
  const finalBySection = new Map(session.tailoringFinalReview.map((section) => [section.section, section.ai_version]));
  const generatedBySection = new Map((session.generatedReview || []).map((section) => [section.section, section.ai_version]));
  return supplied.map((decision) => {
    if (decision.action !== 'approve') return decision;
    const finalVersion = finalBySection.get(decision.section);
    const generatedVersion = generatedBySection.get(decision.section);
    if (!finalVersion || JSON.stringify(finalVersion) === JSON.stringify(generatedVersion)) return decision;
    return { section: decision.section, action: 'edit', finalVersion };
  });
}

module.exports = {
  prepare,
  apply,
  translateCareerReviewDecisions,
  buildTailoringReview,
  sourceAttestationDecisions,
  integrateSourceAttestedEvidence,
  sourceAttestedProposal,
  integrateCorrection,
  installEffectiveKnowledgeBoundary,
};
