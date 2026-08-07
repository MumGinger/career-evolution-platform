#!/usr/bin/env node
// Private, in-memory local UI adapter for the existing Version 1.0 workflow.
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Store } = require('./store');
const { extractPdfText, parseResumeText } = require('./resume');
const { providerFromConfig } = require('./resume-ast');
const { providerFromConfig: draftProviderFromConfig } = require('./resume-draft');
const evidenceReview = require('./evidence-review');
const humanReview = require('./human-review');
const { html: careerReviewHtml } = require('./human-review-cli');
const { jobIdentity } = require('./demo');
const { parseJobDescription } = require('./job-intelligence');
const llmFirst = require('./llm-resume-understanding');

const OUTPUTS = new Set(['final-resume.md', 'final-resume.json', 'career-review-report.html']);

function send(res, status, value, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let value = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      value += chunk;
      if (value.length > 15 * 1024 * 1024) reject(new Error('Request is too large.'));
    });
    req.on('end', () => {
      try { resolve(value ? JSON.parse(value) : {}); }
      catch { reject(new Error('Request must contain valid JSON.')); }
    });
    req.on('error', reject);
  });
}

function markdown(run) {
  const artifact = run.resume_artifacts.find((item) => item.artifact_type === 'structured_resume');
  return artifact.content.sections
    .filter((section) => section.statements.length)
    .map((section) => `## ${section.section}\n\n${section.statements.map((item) => `- ${item.text}`).join('\n')}`)
    .join('\n\n');
}

function closeSession(session) {
  if (!session.store) {
    if (session.dir) fs.rmSync(session.dir, { recursive: true, force: true });
    return;
  }
  try { session.store.close(); }
  finally { fs.rmSync(session.dir, { recursive: true, force: true }); }
}

function publicQueue(session) {
  return session.queue.flatMap((group) => group.candidates.map((item) => ({
    key: item.key,
    evidence_candidate_id: item.candidate.candidate.id,
    requirement: group.requirement.normalized_name,
    claim: item.candidate.candidate.supporting_text,
    sourceText: item.candidate.candidate.provenance.exact_source_text || item.candidate.candidate.supporting_text,
    section: item.candidate.candidate.provenance.section || 'Resume',
    rationale: item.candidate.why_selected,
    editableValue: item.source.candidate.supporting_value,
  })));
}

function makeQueue(store, discovery) {
  return evidenceReview.queue(discovery).map((group, groupIndex) => ({
    ...group,
    candidates: group.candidates.map((candidate, candidateIndex) => ({
      key: `${groupIndex}:${candidateIndex}`,
      candidate: {
        ...candidate,
        entity_type: store.getEvidenceReviewCandidate(discovery.id, candidate.candidate.id).entity_type,
      },
      source: store.getEvidenceReviewCandidate(discovery.id, candidate.candidate.id),
    })),
  }));
}

class LlmFirstStartupError extends Error {
  constructor(category, diagnostics, message) {
    super(message);
    this.category = category;
    this.diagnostics = diagnostics;
  }
}

function safeProvider(provider) {
  return {
    provider: String(provider?.name || provider?.provider || 'unavailable'),
    model: String(provider?.model || 'unavailable'),
  };
}

function reasonCategories(findings) {
  return [...new Set((findings || [])
    .flatMap((finding) => String(finding.category || 'validation_error').split(','))
    .filter(Boolean))];
}

function startupDiagnostics({
  provider,
  extracted = 0,
  valid = 0,
  excluded = 0,
  reviewable = 0,
  validationFindings = [],
}) {
  return {
    ...safeProvider(provider),
    counts: { extracted, valid, excluded, reviewable },
    validation_reason_categories: reasonCategories(validationFindings),
  };
}

function boundedJobSnapshot(jobText, roleTitle) {
  const requirements = parseJobDescription({ roleTitle, jobDescription: jobText });
  return ['Required Qualifications:', ...requirements.flatMap((requirement) => requirement.excerpts)].join('\n');
}

function connectionConfig(input = {}) {
  return {
    provider: input.provider || 'openai-compatible',
    model: input.model || undefined,
    apiKey: input.apiKey || undefined,
    baseUrl: input.baseUrl || undefined,
  };
}

function validationExportSafe(run) {
  return ['passed', 'passed_with_warnings'].includes(run?.validation_status);
}

function qualityReady(artifactRun, review, tailoringPlan) {
  const artifact = artifactRun.resume_artifacts
    .find((item) => item.artifact_type === 'structured_resume');
  const sections = artifact?.content?.sections || [];
  const populated = new Set(sections
    .filter((section) => Array.isArray(section.statements) && section.statements.length)
    .map((section) => section.section));
  const rendered = new Map();
  for (const section of sections) {
    for (const statement of section.statements || []) {
      for (const selectionId of statement.resume_content_selection_ids || []) {
        rendered.set(selectionId, [...(rendered.get(selectionId) || []), section.section]);
      }
    }
  }
  const requiredCoreSelections = (tailoringPlan?.resume_content_selections || [])
    .filter((selection) => selection.selection_state === 'include'
      && ['Experience', 'Projects'].includes(selection.recommended_section));
  const allRequiredCoreSelectionsRendered = requiredCoreSelections.every((selection) =>
    (rendered.get(selection.id) || []).includes(selection.recommended_section));
  return review.length > 0
    && requiredCoreSelections.length > 0
    && allRequiredCoreSelectionsRendered
    && (populated.has('Experience') || populated.has('Projects'));
}

function writeLlmOutputs(session, run, exported) {
  fs.writeFileSync(path.join(session.dir, 'final-resume.md'), exported.markdown);
  fs.writeFileSync(path.join(session.dir, 'final-resume.json'), `${JSON.stringify(exported, null, 2)}\n`);
  fs.writeFileSync(path.join(session.dir, 'career-review-report.html'), careerReviewHtml(run, exported));
}

function semanticInput(blocks) {
  return {
    spans: blocks.map((item, index) => ({
      key: `span:${item.id}`,
      section_name: item.type,
      bullet_index: index,
      raw_text: item.exact_source_text,
    })),
    entities: blocks.map((item) => ({
      key: item.id,
      span_key: `span:${item.id}`,
      entity_type: item.type,
      name: item.normalized_meaning,
      decision_state: item.state === 'uncertain' ? 'possible' : 'explicit',
      rationale: 'LLM bounded understanding; exact source text is retained in the evidence span.',
      attributes: {
        upstream_block_id: item.id,
        title: item.title,
        parent_id: item.parent_id,
        confidence: item.confidence,
        limitations: item.limitations,
      },
    })),
    relations: blocks.filter((item) => item.parent_id).map((item) => ({
      from_key: item.parent_id,
      to_key: item.id,
      relation_type: 'contains',
      decision_state: item.state === 'uncertain' ? 'possible' : 'explicit',
      rationale: 'Parent relationship returned by bounded LLM understanding.',
    })),
  };
}

function pipeline(session) {
  const validated = session.draftValidation?.validation_status || session.draftValidation?.status;
  return [
    { stage: 'Resume Input', status: 'complete' },
    { stage: 'LLM Understanding', status: 'complete', provider: session.provider },
    { stage: 'Validation', status: session.understandingValidation?.status || 'pending' },
    {
      stage: 'Evidence Confirmation',
      status: session.stage === 'evidence' ? 'in_progress' : 'complete',
      count: session.reviewRun?.review_decisions?.length || 0,
    },
    {
      stage: 'Approved Evidence',
      status: session.integration ? 'complete' : 'pending',
      count: session.store ? session.store.getCommittedCandidateKnowledge(session.profileId).length : 0,
    },
    { stage: 'LLM Draft', status: session.artifact ? 'complete' : 'pending' },
    { stage: 'Draft Validation', status: validated || 'pending' },
    {
      stage: 'Career Review',
      status: session.stage === 'complete'
        ? 'complete'
        : ['career-review', 'export-pending'].includes(session.stage) ? 'in_progress' : 'pending',
    },
    { stage: 'Export', status: session.stage === 'complete' ? 'complete' : 'blocked_pending_human_review' },
  ];
}

function developerPayload(session) {
  const artifact = session.artifact?.resume_artifacts?.[0];
  const validation = session.draftValidation?.validation_findings || [];
  return {
    provider: session.provider,
    draft_provider: artifact?.metadata?.draft_provider || null,
    pipeline: pipeline(session),
    counts: {
      extracted_blocks: session.blocks?.length || 0,
      reviewed_evidence: session.reviewRun?.review_decisions?.length || 0,
      committed_facts: session.store ? session.store.getCommittedCandidateKnowledge(session.profileId).length : 0,
      draft_sections: artifact?.content?.sections?.length || 0,
    },
    validation_findings: {
      understanding: session.understandingValidation?.findings || [],
      draft: validation,
    },
    approved_evidence_flow: {
      evidence_review_run_id: session.reviewRun?.id || null,
      integration_run_id: session.integration?.id || null,
      committed_candidate_knowledge: session.store ? session.store.getCommittedCandidateKnowledge(session.profileId) : [],
    },
    payload_sent_to_draft_provider: {
      candidate_knowledge_snapshot: session.tailoring?.candidate_knowledge_snapshot || [],
      target_requirements: session.tailoring?.requirement_coverage || [],
      presentation_strategy: session.presentation?.strategy || null,
    },
    generated_statement_provenance: artifact?.content?.sections?.flatMap((section) => section.statements) || [],
    export_readiness: session.stage === 'complete' ? 'ready' : 'awaiting Career Review',
  };
}

function createBetaUiServer({
  port = 3000,
  host = '127.0.0.1',
  tempRoot = os.tmpdir(),
  resumeUnderstandingProviderFromConfig = llmFirst.providerFromConfig,
  storeFromPath = (databasePath) => new Store(databasePath),
} = {}) {
  const sessions = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || host}`);
      if (req.method === 'GET' && url.pathname === '/') {
        return send(res, 200, BETA_PAGE, 'text/html; charset=utf-8');
      }

      if (req.method === 'POST' && url.pathname === '/api/llm-first/preflight') {
        const input = await readBody(req);
        const providerConfig = connectionConfig(input);
        try {
          const provider = resumeUnderstandingProviderFromConfig(providerConfig);
          await provider.checkConnection();
          return send(res, 200, {
            state: 'ready',
            diagnostics: startupDiagnostics({ provider }),
          });
        } catch (error) {
          const state = error?.category === 'provider_api_failure'
            ? 'temporarily_unavailable'
            : 'setup_required';
          return send(res, 200, {
            state,
            diagnostics: startupDiagnostics({
              provider: { name: providerConfig.provider, model: providerConfig.model },
            }),
          });
        }
      }

      if (req.method === 'POST' && url.pathname === '/api/llm-first/start') {
        let dir;
        let store;
        let registered = false;
        try {
          const input = await readBody(req);
          const name = path.basename(String(input.resume?.name || 'resume.txt'));
          const extension = path.extname(name).toLowerCase();
          if (!['.pdf', '.txt'].includes(extension)) throw new Error('Select a PDF resume or UTF-8 text fixture.');
          const bytes = Buffer.from(String(input.resume?.data || ''), 'base64');
          if (!bytes.length) throw new Error('Select a resume file.');
          const jobText = String(input.jobText || '').trim();
          if (!jobText) throw new Error('Paste a job description.');

          dir = fs.mkdtempSync(path.join(tempRoot, 'career-llm-first-'));
          const temporarySourcePath = path.join(dir, name);
          fs.writeFileSync(temporarySourcePath, bytes);
          const text = extension === '.pdf'
            ? extractPdfText(temporarySourcePath)
            : bytes.toString('utf8');
          fs.unlinkSync(temporarySourcePath);
          const providerConfig = connectionConfig(input);

          let provider;
          try { provider = resumeUnderstandingProviderFromConfig(providerConfig); }
          catch {
            throw new LlmFirstStartupError(
              'provider_api_failure',
              startupDiagnostics({ provider: { name: providerConfig.provider, model: providerConfig.model } }),
              'Resume Understanding provider/API request failed.',
            );
          }

          let result;
          try { result = await provider.understand({ text }); }
          catch (error) {
            if (error?.category === 'provider_api_failure') {
              throw new LlmFirstStartupError(
                error.category,
                startupDiagnostics({ provider }),
                'Resume Understanding provider/API request failed.',
              );
            }
            throw error;
          }

          const diagnostics = (extra = {}) => startupDiagnostics({
            provider: { name: result?.provider || provider.name, model: result?.model || provider.model },
            extracted: Array.isArray(result?.understanding?.blocks) ? result.understanding.blocks.length : 0,
            ...extra,
          });
          if (result?.parseError) {
            throw new LlmFirstStartupError(
              'invalid_structured_response',
              diagnostics({ validationFindings: [{ category: 'invalid_structured_response' }] }),
              'Resume Understanding returned an invalid or unparsable structured response.',
            );
          }

          const alignment = llmFirst.alignUnderstanding({ understanding: result?.understanding, text });
          const validation = llmFirst.validateUnderstanding({
            understanding: alignment.understanding,
            text,
            alignmentFindings: alignment.findings,
          });
          const extracted = Array.isArray(result?.understanding?.blocks)
            ? result.understanding.blocks.length
            : 0;
          const validationDiagnostics = diagnostics({
            extracted,
            valid: validation.valid_blocks.length,
            excluded: validation.findings.length,
            validationFindings: validation.findings,
          });
          if (validation.invalid_structure) {
            throw new LlmFirstStartupError(
              'invalid_structured_response',
              validationDiagnostics,
              'Resume Understanding returned an invalid or unparsable structured response.',
            );
          }
          if (!extracted) {
            throw new LlmFirstStartupError(
              'zero_extracted_blocks',
              validationDiagnostics,
              'Resume Understanding extracted zero blocks.',
            );
          }
          if (!validation.valid_blocks.length) {
            throw new LlmFirstStartupError(
              'all_blocks_excluded',
              validationDiagnostics,
              'All extracted Resume Understanding blocks were excluded by validation.',
            );
          }

          let knowledge;
          let job;
          let semantic;
          let discovery;
          let queue;
          let reviewable;
          try {
            const identity = jobIdentity(jobText);
            store = storeFromPath(path.join(dir, 'session.db'));
            knowledge = store.createResumeProfile({
              sourcePath: name,
              basic: parseResumeText(text).basic,
              facts: [],
            });
            const source = store.createSourceResumeArtifactVersion({
              profileId: knowledge.profile.id,
              sourcePath: name,
              parsedText: '[Private source text retained only as bounded evidence spans.]',
              parserVersion: 'llm-resume-understanding/1.0.0',
            });
            semantic = store.createResumeSemanticRun({
              profileId: knowledge.profile.id,
              artifactId: source.artifact.id,
              policyVersion: 'llm-resume-understanding/1.0.0',
              parsed: semanticInput(validation.valid_blocks),
            });
            job = store.createJobRequirementProfile({
              ...identity,
              jobDescription: boundedJobSnapshot(jobText, identity.roleTitle),
              sourceMetadata: { source: 'local_beta_ui_llm_first' },
            });
            const needs = store.createInformationNeedRun({
              candidateProfileId: knowledge.profile.id,
              jobRequirementProfileId: job.id,
            });
            discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
            queue = makeQueue(store, discovery);
            reviewable = queue.reduce((total, group) => total + group.candidates.length, 0);
          } catch {
            throw new LlmFirstStartupError(
              'session_persistence_failure',
              diagnostics({
                extracted,
                valid: validation.valid_blocks.length,
                excluded: validation.findings.length,
                validationFindings: [...validation.findings, { category: 'session_persistence_failure' }],
              }),
              'Resume Understanding session persistence failed.',
            );
          }

          if (!reviewable) {
            throw new LlmFirstStartupError(
              'zero_reviewable_candidates',
              diagnostics({
                extracted,
                valid: validation.valid_blocks.length,
                excluded: validation.findings.length,
                reviewable,
                validationFindings: validation.findings,
              }),
              'Validated Resume Understanding blocks produced zero reviewable Evidence Discovery candidates.',
            );
          }

          const session = {
            id: randomUUID(),
            dir,
            store,
            profileId: knowledge.profile.id,
            jobId: job.id,
            discoveryId: discovery.id,
            providerConfig,
            stage: 'evidence',
            mode: 'llm-first',
            provider: safeProvider({ provider: result.provider, model: result.model }),
            understanding: alignment.understanding,
            understandingValidation: validation,
            blocks: validation.valid_blocks,
            semantic,
            queue,
          };
          sessions.set(session.id, session);
          registered = true;
          const exclusions = validation.findings.map(({ block_id, severity, category, message }) => ({
            block_id,
            severity,
            category,
            message,
          }));
          return send(res, 201, {
            sessionId: session.id,
            mode: 'llm-first',
            provider: session.provider,
            stage: 'Evidence Confirmation',
            evidence: llmFirst.grouped(session.blocks),
            candidates: publicQueue(session),
            validation: {
              ...validation,
              findings: exclusions,
              exclusions,
              counts: {
                extracted,
                valid: validation.valid_blocks.length,
                excluded: validation.findings.length,
                reviewable,
              },
              validation_reason_categories: reasonCategories(validation.findings),
            },
            pipeline: pipeline(session),
          });
        } finally {
          if (!registered) {
            if (store) store.close();
            if (dir) fs.rmSync(dir, { recursive: true, force: true });
          }
        }
      }

      if (req.method === 'POST' && url.pathname.match(/^\/api\/llm-first\/sessions\/[^/]+\/confirm$/)) {
        const session = sessions.get(url.pathname.split('/')[4]);
        if (!session || session.mode !== 'llm-first') return send(res, 404, { error: 'This local session has expired.' });
        if (session.stage !== 'evidence') throw new Error('Evidence Confirmation has already been submitted.');
        const input = await readBody(req);
        const submitted = input.decisions || [];
        const expected = publicQueue(session).map((item) => item.evidence_candidate_id);
        const choices = new Map(submitted.map((item) => [item.evidence_candidate_id, item]));
        if (
          submitted.length !== expected.length
          || choices.size !== expected.length
          || expected.some((id) => !choices.has(id))
          || submitted.some((item) => !expected.includes(item.evidence_candidate_id) || !['accept', 'skip'].includes(item.action))
        ) throw new Error('Choose Accept or Skip exactly once for every known evidence candidate.');

        const decisions = session.queue.flatMap((group) => group.candidates.map((item) => {
          const choice = choices.get(item.candidate.candidate.id);
          return evidenceReview.decisionFrom(item.candidate, {
            action: choice.action === 'accept' ? 'accepted' : 'skipped',
          });
        }));
        const reviewRun = session.store.createEvidenceReviewRun({
          candidateProfileId: session.profileId,
          jobRequirementProfileId: session.jobId,
          evidenceDiscoveryRunId: session.discoveryId,
          decisions,
        });
        const integration = evidenceReview.integrateReviewedEvidence({
          store: session.store,
          candidateProfileId: session.profileId,
          discoveryRunId: session.discoveryId,
          reviewRun,
        });
        const tailoring = session.store.createResumeTailoringPlanRun({
          candidateProfileId: session.profileId,
          jobRequirementProfileId: session.jobId,
        });
        const snapshot = session.store.createCareerUnderstandingSnapshotRun({
          candidateProfileId: session.profileId,
        });
        const presentation = session.store.createPresentationStrategyRun({
          candidateProfileId: session.profileId,
          jobRequirementProfileId: session.jobId,
          resumeTailoringPlanRunId: tailoring.id,
          careerUnderstandingSnapshotRunId: snapshot.id,
        });
        const artifact = await session.store.createResumeArtifactDraftRun({
          resumeTailoringPlanRunId: tailoring.id,
          presentationStrategyRunId: presentation.id,
          provider: draftProviderFromConfig(session.providerConfig),
        });
        const validation = session.store.createResumeValidationRun({ resumeArtifactRunId: artifact.id });
        const review = humanReview.createDraft({ artifactRun: artifact, presentationStrategyRun: presentation });
        const exportSafe = validationExportSafe(validation) && qualityReady(artifact, review, tailoring);
        const message = !validationExportSafe(validation)
          ? 'Career Review and export are blocked until deterministic draft validation passes.'
          : !exportSafe
            ? 'Career Review and export are blocked because required included evidence did not render in its planned Experience or Projects section.'
            : null;
        Object.assign(session, {
          reviewRun,
          integration,
          tailoring,
          presentation,
          artifact,
          draftValidation: validation,
          stage: exportSafe ? 'career-review' : 'draft-blocked',
        });
        return send(res, 200, {
          stage: session.stage,
          resumeMarkdown: markdown(artifact),
          validation: validation.validation_status,
          validationFindings: validation.validation_findings,
          careerReview: exportSafe ? review : null,
          blocked: !exportSafe,
          message,
          pipeline: pipeline(session),
          developer: developerPayload(session),
        });
      }

      if (req.method === 'POST' && url.pathname.match(/^\/api\/llm-first\/sessions\/[^/]+\/career-review$/)) {
        const session = sessions.get(url.pathname.split('/')[4]);
        if (!session || session.mode !== 'llm-first') return send(res, 404, { error: 'This local session has expired.' });
        if (!['career-review', 'export-pending'].includes(session.stage) || !validationExportSafe(session.draftValidation)) {
          throw new Error('Career Review and export are blocked until deterministic draft validation passes.');
        }
        if (!session.run) {
          try {
            const input = await readBody(req);
            session.run = session.store.createHumanReviewRun({
              resumeArtifactRunId: session.artifact.id,
              presentationStrategyRunId: session.presentation.id,
              decisions: input.decisions,
            });
            session.stage = 'export-pending';
          } catch {
            return send(res, 400, {
              error: 'We couldn’t save your resume review. Your selections are still here. Try again.',
              category: 'career_review_failure',
            });
          }
        }
        try {
          const exported = session.store.exportResumeArtifact({
            resumeArtifactRunId: session.artifact.id,
            humanReviewRunId: session.run.id,
          });
          writeLlmOutputs(session, session.run, exported);
          Object.assign(session, { exported, stage: 'complete' });
          return send(res, 200, {
            stage: session.stage,
            exportAllowed: true,
            resumeMarkdown: exported.markdown,
            outputs: [...OUTPUTS],
            pipeline: pipeline(session),
          });
        } catch {
          session.stage = 'export-pending';
          return send(res, 400, {
            error: 'We couldn’t create your resume files. Your approved resume is still here. Try again.',
            category: 'export_failure',
          });
        }
      }

      if (req.method === 'GET' && url.pathname.match(/^\/api\/llm-first\/sessions\/[^/]+\/outputs\/[^/]+$/)) {
        const parts = url.pathname.split('/');
        const session = sessions.get(parts[4]);
        const file = parts[6];
        if (!session || session.mode !== 'llm-first') return send(res, 404, { error: 'This local session has expired.' });
        if (session.stage !== 'complete') return send(res, 409, { error: 'Export is blocked until Career Review is complete.' });
        if (!OUTPUTS.has(file)) return send(res, 404, { error: 'Output not found.' });
        return send(
          res,
          200,
          fs.readFileSync(path.join(session.dir, file)),
          file.endsWith('.html')
            ? 'text/html; charset=utf-8'
            : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
        );
      }

      if (req.method === 'GET' && url.pathname.match(/^\/api\/llm-first\/sessions\/[^/]+\/developer$/)) {
        const session = sessions.get(url.pathname.split('/')[4]);
        if (!session || session.mode !== 'llm-first') return send(res, 404, { error: 'This local session has expired.' });
        return send(res, 200, developerPayload(session));
      }

      // Legacy local Beta route retained for compatibility with the existing test suite.
      if (req.method === 'POST' && url.pathname === '/api/start') {
        let dir;
        let store;
        let initialized = false;
        try {
          const input = await readBody(req);
          dir = fs.mkdtempSync(path.join(tempRoot, 'career-beta-ui-'));
          store = new Store(path.join(dir, 'session.db'));
          const name = path.basename(String(input.resume?.name || 'resume.txt'));
          const extension = path.extname(name).toLowerCase();
          if (!['.pdf', '.txt'].includes(extension)) throw new Error('Select a PDF resume or UTF-8 text fixture.');
          const sourcePath = path.join(dir, name);
          const bytes = Buffer.from(String(input.resume?.data || ''), 'base64');
          if (!bytes.length) throw new Error('Select a resume file.');
          fs.writeFileSync(sourcePath, bytes);
          const text = extension === '.pdf' ? extractPdfText(sourcePath) : bytes.toString('utf8');
          const jobText = String(input.jobText || '').trim();
          if (!jobText) throw new Error('Paste a job description.');
          const providerConfig = {
            provider: input.provider || 'mock',
            model: input.model || undefined,
            apiKey: input.apiKey || undefined,
            baseUrl: input.baseUrl || undefined,
          };
          const parsed = parseResumeText(text);
          const knowledge = store.createResumeProfile({
            sourcePath,
            basic: parsed.basic,
            facts: parsed.facts.map((fact) => ({ ...fact, confirmation_status: 'needs_confirmation' })),
          });
          const source = store.createSourceResumeArtifactVersion({
            profileId: knowledge.profile.id,
            sourcePath,
            parsedText: text,
          });
          const ast = await store.createResumeAstRun({
            profileId: knowledge.profile.id,
            artifactId: source.artifact.id,
            provider: providerFromConfig(providerConfig),
          });
          const job = store.createJobRequirementProfile({
            ...jobIdentity(jobText),
            jobDescription: jobText,
            sourceMetadata: { source: 'local_beta_ui' },
          });
          const needs = store.createInformationNeedRun({
            candidateProfileId: knowledge.profile.id,
            jobRequirementProfileId: job.id,
          });
          const discovery = store.createEvidenceDiscoveryRun({ informationNeedRunId: needs.id });
          const session = {
            id: randomUUID(),
            dir,
            store,
            profileId: knowledge.profile.id,
            jobId: job.id,
            discoveryId: discovery.id,
            providerConfig,
            queue: makeQueue(store, discovery),
            stage: 'evidence',
          };
          sessions.set(session.id, session);
          initialized = true;
          return send(res, 201, {
            sessionId: session.id,
            stage: session.stage,
            provider: ast.extractor_provider,
            model: ast.extractor_model,
            astValidation: ast.validation_status,
            candidates: publicQueue(session),
          });
        } finally {
          if (!initialized) {
            if (store) store.close();
            if (dir) fs.rmSync(dir, { recursive: true, force: true });
          }
        }
      }

      const match = url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(review|career-review)|\/outputs\/([^/]+))?$/);
      if (!match) return send(res, 404, { error: 'Not found.' });
      const session = sessions.get(match[1]);
      if (!session) return send(res, 404, { error: 'This local session has expired.' });

      if (req.method === 'POST' && match[2] === 'review') {
        if (session.stage !== 'evidence') throw new Error('Evidence Review has already been submitted.');
        const input = await readBody(req);
        const choices = new Map((input.decisions || []).map((item) => [item.key, item]));
        const all = publicQueue(session);
        if (choices.size !== all.length) throw new Error('Choose Accept, Skip, or Edit for every evidence candidate.');
        const decisions = session.queue.flatMap((group) => group.candidates.map((item) => {
          const choice = choices.get(item.key);
          return evidenceReview.decisionFrom(item.candidate, {
            action: choice.action,
            editedClaim: choice.editedClaim,
          });
        }));
        const reviewRun = session.store.createEvidenceReviewRun({
          candidateProfileId: session.profileId,
          jobRequirementProfileId: session.jobId,
          evidenceDiscoveryRunId: session.discoveryId,
          decisions,
        });
        const integration = evidenceReview.integrateReviewedEvidence({
          store: session.store,
          candidateProfileId: session.profileId,
          discoveryRunId: session.discoveryId,
          reviewRun,
        });
        const tailoring = session.store.createResumeTailoringPlanRun({
          candidateProfileId: session.profileId,
          jobRequirementProfileId: session.jobId,
        });
        const snapshot = session.store.createCareerUnderstandingSnapshotRun({
          candidateProfileId: session.profileId,
        });
        const presentation = session.store.createPresentationStrategyRun({
          candidateProfileId: session.profileId,
          jobRequirementProfileId: session.jobId,
          resumeTailoringPlanRunId: tailoring.id,
          careerUnderstandingSnapshotRunId: snapshot.id,
        });
        const artifact = await session.store.createResumeArtifactDraftRun({
          resumeTailoringPlanRunId: tailoring.id,
          presentationStrategyRunId: presentation.id,
          provider: draftProviderFromConfig(session.providerConfig),
        });
        const validation = session.store.createResumeValidationRun({ resumeArtifactRunId: artifact.id });
        Object.assign(session, {
          reviewRun,
          integration,
          tailoring,
          presentation,
          artifact,
          validation,
          stage: 'career-review',
        });
        return send(res, 200, {
          stage: session.stage,
          committedFacts: session.store.getCommittedCandidateKnowledge(session.profileId).length,
          validation: validation.validation_status,
          resumeMarkdown: markdown(artifact),
          careerReview: humanReview.createDraft({ artifactRun: artifact, presentationStrategyRun: presentation }),
        });
      }

      if (req.method === 'POST' && match[2] === 'career-review') {
        if (session.stage !== 'career-review') {
          throw new Error('Career Review is unavailable until Evidence Review regenerates the resume.');
        }
        const input = await readBody(req);
        const run = session.store.createHumanReviewRun({
          resumeArtifactRunId: session.artifact.id,
          presentationStrategyRunId: session.presentation.id,
          decisions: input.decisions,
        });
        const exported = session.store.exportResumeArtifact({
          resumeArtifactRunId: session.artifact.id,
          humanReviewRunId: run.id,
        });
        fs.writeFileSync(path.join(session.dir, 'final-resume.md'), exported.markdown);
        fs.writeFileSync(path.join(session.dir, 'final-resume.json'), `${JSON.stringify(exported, null, 2)}\n`);
        fs.writeFileSync(path.join(session.dir, 'career-review-report.html'), careerReviewHtml(run, exported));
        Object.assign(session, { stage: 'complete', run, exported });
        return send(res, 200, {
          stage: session.stage,
          exportAllowed: true,
          resumeMarkdown: exported.markdown,
          outputs: [...OUTPUTS],
        });
      }

      if (req.method === 'GET' && match[3]) {
        if (session.stage !== 'complete') return send(res, 409, { error: 'Export is blocked until Career Review is complete.' });
        const file = match[3];
        if (!OUTPUTS.has(file)) return send(res, 404, { error: 'Output not found.' });
        return send(
          res,
          200,
          fs.readFileSync(path.join(session.dir, file)),
          file.endsWith('.html')
            ? 'text/html; charset=utf-8'
            : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
        );
      }
      return send(res, 405, { error: 'Method not allowed.' });
    } catch (error) {
      return send(
        res,
        400,
        error instanceof LlmFirstStartupError
          ? { error: error.message, category: error.category, diagnostics: error.diagnostics }
          : { error: error.message },
      );
    }
  });

  return {
    server,
    sessions,
    listen: () => new Promise((resolve) => server.listen(port, host, () => resolve(server.address()))),
    close: () => new Promise((resolve) => server.close(() => {
      for (const item of sessions.values()) closeSession(item);
      resolve();
    })),
  };
}

const BETA_PAGE = `<!doctype html>
<meta charset="utf-8">
<title>Career Evolution Beta</title>
<style>
body{font:16px system-ui;max-width:850px;margin:2rem auto;line-height:1.45}
section,.card{border:1px solid #d8dee8;border-radius:8px;padding:1rem;margin:1rem 0}
textarea,input,select,button{font:inherit;padding:.4rem;margin:.25rem}
textarea{display:block;width:100%;min-height:7rem}
pre{white-space:pre-wrap}
</style>
<h1>Career Evolution</h1>
<p id="state">1. Input</p>
<p id="error" role="alert"></p>
<p id="readiness">Connection setup is required before you can continue.</p>
<p id="progress"></p>
<details><summary>Developer View</summary><pre id="diagnostics"></pre></details>
<section id="input">
  <input id="f" type="file" accept=".pdf,.txt">
  <textarea id="j" placeholder="Paste job description"></textarea>
  <details><summary>Provider connection (memory only)</summary>
    <select id="p"><option value="openai-compatible">OpenAI-compatible</option><option value="mock">Mock</option></select>
    <input id="m" placeholder="Model">
    <input id="k" type="password" placeholder="API key">
    <input id="b" placeholder="Base URL">
  </details>
  <button id="check" type="button">Check connection</button>
  <button id="go" disabled>Start evidence review</button>
</section>
<section id="understanding" hidden><h2>Understanding and exclusions</h2><pre id="counts"></pre><div id="exclusions"></div></section>
<section id="evidence" hidden><h2>2. Evidence Review</h2><div id="cards"></div><button id="make">Create resume draft</button></section>
<section id="draft" hidden><h2>3. Draft and validation</h2><p id="validation"></p><pre id="r"></pre></section>
<section id="career" hidden><h2>4. Career Review</h2><div id="reviews"></div><button id="approve">Approve and export</button></section>
<section id="output" hidden><h2>5. Export complete</h2><pre id="result"></pre><div id="links"></div></section>
<script>
let session,candidates=[],review=[],progressTimers=[];
const READY='Ready to create your tailored resume.';
const q=x=>document.getElementById(x),esc=x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function showDiagnostics(d){if(!d)return;let c=d.counts||{};q('diagnostics').textContent='Category: '+(d.category||'success')+'; Provider: '+(d.provider||'unavailable')+'; Model: '+(d.model||'unavailable')+'; Extracted: '+(c.extracted||0)+'; Valid: '+(c.valid||0)+'; Excluded: '+(c.excluded||0)+'; Reviewable: '+(c.reviewable||0)+'; Validation reasons: '+((d.validation_reason_categories||[]).join(', ')||'none')}
function clearProgress(){for(let t of progressTimers)clearTimeout(t);progressTimers=[];q('progress').textContent=''}
function startProgress(){clearProgress();let steps=['Reading your resume…','Finding relevant experience…','Preparing items for your review…'];q('progress').textContent=steps[0];progressTimers=steps.slice(1).map((step,index)=>setTimeout(()=>q('progress').textContent=step,(index+1)*500))}
function busy(x,b){q(x).disabled=b}
function fail(e,stage='startup'){
  if(e==null||e===''){q('error').textContent='';return}
  clearProgress();
  let c=e.category||'',m=String(e.message||e);
  if(/Select a resume/.test(m))q('error').textContent='Select your resume before continuing.';
  else if(/Paste a job description/.test(m))q('error').textContent='Paste the job description before continuing.';
  else if(c==='provider_api_failure'||stage==='connection'){
    q('readiness').textContent='The resume service is temporarily unavailable. Retry.';
    q('go').disabled=true;
    q('error').textContent='The resume service is temporarily unavailable. Check your connection and try again.';
  }
  else if(c==='career_review_failure')q('error').textContent='We couldn’t save your resume review. Your selections are still here. Try again.';
  else if(c==='export_failure')q('error').textContent='We couldn’t create your resume files. Your approved resume is still here. Try again.';
  else if(stage==='draft')q('error').textContent='We couldn’t prepare your resume draft. Try again.';
  else if(stage==='career-review')q('error').textContent='We couldn’t save your resume review. Your selections are still here. Try again.';
  else if(['invalid_structured_response','zero_extracted_blocks','all_blocks_excluded','zero_reviewable_candidates'].includes(c))q('error').textContent='We couldn’t identify enough usable information from this resume. Review the file and try again.';
  else if(c==='session_persistence_failure')q('error').textContent='We couldn’t prepare your resume review. Try again.';
  else q('error').textContent='The current step could not be completed. Try again.';
  showDiagnostics({category:c||'client_error',...(e.diagnostics||{})});
}
async function call(u,b){let r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}),v=await r.json();if(!r.ok){let e=Error(v.error||'Request failed');e.category=v.category;e.diagnostics=v.diagnostics;throw e}return v}
function fileData(f){return new Promise((ok,no)=>{let r=new FileReader;r.onload=()=>ok(r.result.split(',')[1]);r.onerror=no;r.readAsDataURL(f)})}
async function preflight(){
  let x=await call('/api/llm-first/preflight',{provider:q('p').value,model:q('m').value,apiKey:q('k').value,baseUrl:q('b').value});
  showDiagnostics({category:x.state,...x.diagnostics});
  let ready=x.state==='ready';
  q('go').disabled=!ready;
  q('readiness').textContent=ready?READY:x.state==='temporarily_unavailable'?'The resume service is temporarily unavailable. Retry.':'Connection setup is required before you can continue.';
  q('error').textContent=x.state==='temporarily_unavailable'?'The resume service is temporarily unavailable. Check your connection and try again.':'';
  return ready;
}
q('check').onclick=async()=>{try{await preflight()}catch(e){fail(e,'connection')}};
preflight().catch(e=>fail(e,'connection'));
q('go').onclick=async()=>{
  if(q('go').disabled)return;
  try{
    fail('');busy('go',true);startProgress();
    let f=q('f').files[0];if(!f)throw Error('Select a resume file.');
    let x=await call('/api/llm-first/start',{resume:{name:f.name,data:await fileData(f)},jobText:q('j').value,provider:q('p').value,model:q('m').value,apiKey:q('k').value,baseUrl:q('b').value});
    clearProgress();q('k').value='';showDiagnostics({category:'success',...x.provider,...x.validation});session=x.sessionId;candidates=x.candidates;
    q('counts').textContent='Extracted: '+x.validation.counts.extracted+'; valid: '+x.validation.counts.valid+'; excluded: '+x.validation.counts.excluded;
    q('exclusions').innerHTML=(x.validation.exclusions||[]).map(z=>'<p><b>Excluded source:</b> '+esc(z.source_text||'')+'<br><b>Reason:</b> '+esc(z.message||'')+'</p>').join('')||'<p>No excluded blocks.</p>';
    q('cards').innerHTML=candidates.map(z=>'<p><b>'+esc(z.requirement)+'</b> '+esc(z.claim)+' <select data-c="'+z.evidence_candidate_id+'"><option value="accept">Accept</option><option value="skip">Skip</option></select></p>').join('');
    q('state').textContent='2. Understanding → Evidence Review';q('input').hidden=true;q('understanding').hidden=false;q('evidence').hidden=false;
  }catch(e){fail(e,'startup')}
  finally{q('go').disabled=q('readiness').textContent!==READY}
};
q('make').onclick=async()=>{
  if(q('make').disabled)return;
  try{
    fail('');busy('make',true);
    let x=await call('/api/llm-first/sessions/'+session+'/confirm',{decisions:candidates.map(z=>({evidence_candidate_id:z.evidence_candidate_id,action:document.querySelector('[data-c="'+z.evidence_candidate_id+'"]').value}))});
    q('r').textContent=x.resumeMarkdown;q('validation').textContent='Validation: '+x.validation+(x.blocked?' — '+x.message:'');q('evidence').hidden=true;q('draft').hidden=false;
    if(x.blocked||!x.careerReview)return;
    review=x.careerReview;q('reviews').innerHTML=review.map(z=>'<p><b>'+esc(z.section)+'</b></p><pre>'+esc(JSON.stringify(z.ai_version,null,2))+'</pre>').join('');q('state').textContent='4. Career Review';q('career').hidden=false;
  }catch(e){fail(e,'draft')}
  finally{busy('make',false)}
};
q('approve').onclick=async()=>{
  if(q('approve').disabled||!review.length)return;
  try{
    fail('');busy('approve',true);
    let x=await call('/api/llm-first/sessions/'+session+'/career-review',{decisions:review.map(z=>({section:z.section,action:'approve'}))});
    q('result').textContent=x.resumeMarkdown;q('links').innerHTML=x.outputs.map(n=>'<p><a target="_blank" href="/api/llm-first/sessions/'+session+'/outputs/'+n+'">View/download '+esc(n)+'</a></p>').join('');q('state').textContent='5. Export complete';q('career').hidden=true;q('output').hidden=false;
  }catch(e){fail(e,'career-review')}
  finally{busy('approve',false)}
};
</script>`;

if (require.main === module) {
  const app = createBetaUiServer({ port: Number(process.env.PORT || 3000) });
  app.listen().then((address) => console.log(`Career Evolution Beta UI: http://${address.address}:${address.port}`));
}

module.exports = { createBetaUiServer, BETA_PAGE, qualityReady };
