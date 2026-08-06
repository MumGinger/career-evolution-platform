# Current State

## Beta #2 product acceptance result (2026-08-06)

Beta #2 completed the full real-provider browser workflow and produced `final-resume.md`, `final-resume.json`, and `career-review-report.html`, but the product result is **FAIL** and **Beta Accepted remains NO / NOT YET**.

The user would not submit the generated resume, reported no meaningful time savings, and would not use the product again in its current state. The applicant-facing resume contained only one project statement and omitted personal information, Experience, Skills, Education, and other essential source-resume content. Understanding counts, Evidence Review decisions, Career Review, and the HTML/JSON exports were not sufficiently understandable to a normal applicant.

This does not reverse the existing engineering result: the representative real-provider flow remains **Proven**. It establishes that successful execution, deterministic validation, and export generation do not equal product acceptance.

Durable acceptance records:

- Issue #73 — Beta #1: FAIL and closed.
- Issue #82 — Beta #2: FAIL and closed.
- Issue #83 — active blocker: produce a complete, recognizable tailored resume.

The next product action is to diagnose where source-resume structure and unchanged essential content are lost, define a truth-preserving complete-resume composition boundary without weakening Candidate Knowledge or 003.6, and independently verify a complete applicant-facing draft before another Beta.

## PR #68 validation repair (2026-08-05)

The local Beta UI now executes an evidence-to-export client flow covered by an executable minimal-DOM regression, rather than an HTML string check. Understanding validation visibly lists each excluded source block and its reason. The semantic-graph demo fixture gives every reviewable candidate an explicit fixture decision, and deterministic drafts intentionally omit Professional Summary until a dedicated summary claim scope exists. Full regression: `npm.cmd test` (156 passing).

## Real-resume section-evidence repair (2026-08-04)

The Resume AST-to-Evidence Review bridge now retains retrieved project and experience bullets as reviewable working evidence instead of reducing the path to standalone skill tokens. After explicit acceptance, the existing 003.6 integration path alone evaluates bounded project, responsibility, and skill proposals with their AST span provenance. The local Beta UI now calls the existing structured Resume Draft provider after integration. Candidate Knowledge and Career Review/export boundaries are unchanged.

## Version 1.0 Beta workflow

Career Review is the product-facing name for the existing immutable Human Review capability. The primary demo requires Evidence Review before it creates the final Career Review: accepted or supported edits flow through existing 003.6, then tailoring, strategy, artifact, and validation rerun. No new capability or Candidate Knowledge write path was added.

The local Beta UI is available through `node src/beta-ui.js`. It is a temporary, plain-HTML testing wrapper around the existing Resume AST, Evidence Review/003.6, tailoring, presentation, artifact, validation, Career Review, and export APIs; it is not production frontend architecture. API keys stay in request memory and never enter the local session database or generated outputs.

**Phase:** Version 1 product-quality recovery after Beta #2 FAIL  
**Last updated:** 2026-08-06

## Intelligent Resume v1

The resume pipeline creates an immutable Presentation Strategy Run after Career Understanding and before artifact generation. It snapshots the target job, Resume Tailoring Plan, Career Understanding, and available Reflection, Curiosity, or Decision Companion context. It may order only already-included committed facts; it cannot add facts, change selection state, strengthen wording, or turn thinking-layer context into a resume claim. The end-to-end demo exports strategy JSON and an HTML explanation beside the validated resume.

## Completed

- Completed the Human Review MVP: Professional Summary, Skills, Experience, and Projects require an explicit approve or edit decision before export. Immutable review runs preserve the AI draft, evidence/provenance, rationale, final approved text, and timestamps. Edits do not write Candidate Knowledge or trigger regeneration.

- Recorded the AI Career Companion Manifesto as durable product guidance for the platform's evolution from Resume Builder to Life-long Career Companion.

- Implemented 002.7 Resume AST: async provider runs, nested-schema/provenance firewall, exact `structurally_grouped` layout state, ranked direct `resume_ast` retrieval, and confirmation proposals. Only validated explicit skills/tools may be auto-accepted; 003.6 remains the sole Candidate Knowledge writer. 002.6 remains optional/lazy.

- Established project foundation and working agreement.
- Documented the product-first vision, architecture principles, and initial design models.
- Recorded the decision to validate Career before extracting a framework.
- Implemented MVP-001: a local application-to-interview evidence loop with SQLite persistence, versioned artifacts, and non-learning outcome evidence.
- Implemented Experiment 002: PDF resume intake that bootstraps traceable Candidate Knowledge facts without inferred content.
- Implemented Capability 002.5: immutable source-resume versions and semantic runs with exact spans, working entity/relation candidates, and a narrow versioned deterministic policy. Semantic candidates remain outside Candidate Knowledge and are available only as bounded Evidence Discovery input.
- Implemented Capability 002.6: immutable Resume Semantic Graph Runs that reconstruct bounded relationships from persisted 002.5 spans and entities even when 002.5 relations are absent, preserve artifact/version/span provenance, and expose bounded graph evidence to Discovery without writing Candidate Knowledge.
- Implemented Capability 003.1: deterministic, versioned Job Intelligence profiles with immutable job-description snapshots, requirement excerpts, policy rationale, and parser/policy metadata.
- Implemented Capability 003.2: deterministic, persisted, immutable Information Need prioritization runs that retain the job-profile version, candidate-evidence snapshot, policy inputs, evidence references, uncertainty, and rationale.
- Implemented Capability 003.3: deterministic local Evidence Discovery Runs that search bounded snapshot sources, retain candidate provenance and resolutions, stop when evidence is sufficient, and leave unresolved needs without asking a user or updating Candidate Knowledge.
- Redefined the remaining Capability 003 sequence: 003.4 is Acquisition Planning, 003.5 is Acquisition Execution, and 003.6 is Candidate Knowledge Integration.
- Implemented Capability 003.4: deterministic, immutable Acquisition Plan Runs with first-class plans, separate actions, explainable gain-versus-cost rationales, and grouping of compatible unresolved needs under shared actions.
- Implemented Capability 003.5: deterministic local Acquisition Execution with immutable Acquisition Result Runs, first-class per-action results, raw evidence capture, provenance, timestamps, and independent re-runs for the same plan.
- Implemented Capability 003.6: deterministic Candidate Knowledge Integration with immutable decisions, accepted-only writes, evidence links, and append-only revisions.
- Implemented Capability 004.1: immutable, deterministic Resume Tailoring Plan Runs that select committed facts, record requirement coverage and bounded claim scopes, and analyze source-resume wording without editing it.
- Implemented Capability 004.2: immutable Resume Artifact Runs and first-class structured Resume Artifacts rendered deterministically from one tailoring plan, with statement-level selection/fact provenance and metadata-only omissions and blocked claims.
- Implemented Capability 004.3: immutable, independently re-runnable Resume Validation Runs with first-class findings and deterministic provenance, claim-scope, plan, coverage, duplication, and completeness checks.
- Implemented Issue #39 Evidence Review MVP: immutable review runs, interactive and fixture decisions, strict source-bounded edits, 003.6-only integration, regenerated tailoring/artifact/validation, and user-review KPIs.
- Implemented Career Conversation MVP: after the validated resume workflow completes, ask at most one optional career-direction question and persist only its answer or skipped observation against that workflow. Observations never write Candidate Knowledge or create inferences.
- Implemented Career Understanding MVP: immutable, read-only Current Career Snapshot Runs explain bounded direction, committed strengths, neutral application activity, unknowns, and feedback without modifying Candidate Knowledge.
- Implemented Career Reflection / Shared Understanding MVP: a snapshot-first, one-response reflection with an optional short note. Immutable runs are source-linked, idempotently deduplicated, and never update Candidate Knowledge or Career Understanding.
- Implemented Career Curiosity MVP: after reflection, introduce one supported adjacent career possibility, explain it through snapshot items, and record one immutable response without updating Candidate Knowledge or Career Understanding.
- Completed Milestone 2 — Career Evolution Loop v1: the primary demo now connects Resume Intelligence, Career Conversation, Career Understanding, Shared Understanding, Career Curiosity, and a final return invitation. It exports one ordered HTML report and one integrated JSON summary while preserving all existing immutable-run and Candidate Knowledge boundaries.
- Completed Decision Companion as the final Thinking Layer MVP. It is a source-linked, immutable comparison flow that preserves uncertainty and user independence; no recommendation or knowledge write is added.

## Current focus

Issue #83: produce a complete, recognizable applicant-facing resume while preserving the existing Candidate Knowledge, provenance, deterministic validation, Career Review, and privacy boundaries.

Applicant-facing workflow clarity and Career Review readability are also verified Beta #2 blockers, but complete-resume output is the first gate. Another Beta must not be scheduled until a complete draft is independently inspected.

## Next decision

Define the smallest truth-preserving composition boundary between immutable source-resume content and evidence-backed tailored claims. Intelligent Execution work is deferred until Version 1 produces a complete, submission-evaluable resume.

## Open questions

- What evidence sources are useful, consented, and ethically appropriate beyond local user-entered data?
- What makes available evidence sufficient for each bounded artifact or decision?
- Which recovery actions should be available before a user request, and how should their privacy cost be compared?
- What confirmation and conflict threshold must Candidate Knowledge Integration meet before it accepts a fact?
- What review authority and corroboration threshold are required before outcome evidence changes a priority or skill?
- How can unchanged source-resume structure be preserved without silently turning source text into newly committed Candidate Knowledge?

## Milestone 1 Demo update

Milestone 1 Demo is implemented as an integration-only local command. It versions the source resume, runs 002.5, then runs 002.6 before Job Requirements, Information Needs, and Evidence Discovery. It exports immutable semantic and graph runs, terminal decision-state counts, and static HTML graph relationships with readable labels and secondary provenance. Graph evidence is working evidence, not committed Candidate Knowledge coverage; Candidate Knowledge Integration remains the sole accepted-only write path.

# LLM-first Beta path

The preferred real-resume Beta path is LLM-first with deterministic trust boundaries. The Resume AST pipeline remains legacy/diagnostic for offline and synthetic coverage. Beta Accepted remains blocked by the Beta #2 evidence recorded in Issue #82 and the active complete-resume blocker in Issue #83, not by the ability to technically complete the flow.
