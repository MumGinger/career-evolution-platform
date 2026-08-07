# Current State

## Beta #4 product acceptance result (2026-08-06)

Beta #4 used the shipped localhost UI with a real resume and real job description to retest the applicant-readable review and final-output experience delivered after PR #99. The product result is **FAIL** and **Beta Accepted remains NO / NOT YET**.

The run stopped at **Evidence Review — Candidate 1**. The applicant could not determine whether **Accept** or **Skip** meant verifying truth, judging relevance to the target job, or deciding whether the item should appear in the resume. The phrase **Candidate Knowledge Integration** did not make that decision understandable to a first-time applicant, so continuing would have required guessing rather than informed approval.

Earlier stages were easy to operate but still contained applicant-facing ambiguity. Landing/Input was generally clear, while **Check connection** and provider **Base URL** were not understood. **Understanding and exclusions** was easy to scan, but the applicant did not understand its purpose, what exclusion meant for the final resume, or why source text had been excluded.

After the Beta had already failed, the applicant continued exploring and recorded two supplemental findings. **Ready for review** showed the resume in a more readable presentation, but the UI still showed **Step 3 of 5** with no discoverable action to reach the next stage. The earlier **Understanding and exclusions** section also remained visible at the top of later screens, which was not blocking by itself but felt repetitive and annoying and weakened the sense of progression.

Durable Beta #4 records:

- Issue #100 — Beta #4: **FAIL**.
- Issue #101 — active blocker: Evidence Review does not tell applicants what Accept or Skip means.
- Issue #102 — active blocker: Step 3 of 5 shows no clear way to continue after Ready for review.
- Issue #103 — active supplemental UX finding: Understanding and exclusions remains visible after moving to later steps.

Later Evidence Review candidates, Draft/validation judgment, Career Review, `final-resume.pdf`, `career-review-report.html`, `final-resume.md`, `final-resume.json`, final submission readiness, time/value, and reuse intent remain **UNKNOWN / not credibly reached** in Beta #4.

This does not reverse the existing engineering evidence for PR #99. It establishes that applicant-readable presentation alone is not sufficient when the required decision semantics and visible workflow progression are still unclear.

## Beta #3 product acceptance result (2026-08-06)

Beta #3 completed the real-provider browser workflow and produced `final-resume.md`, `final-resume.json`, and `career-review-report.html`, but the product result is **FAIL** and **Beta Accepted remains NO / NOT YET**.

The complete-resume composition blocker from Beta #2 is materially improved: the applicant-facing draft and Markdown export now contain recognizable identity/contact information and multiple source-resume sections rather than a one-project fragment. Issue #83's merged composition guarantee did not visibly regress.

The user still would not treat the result as a practical submission-ready resume. Evidence Review did not make the consequence of Accept clear; broken characters appeared; `passed_with_warnings` was unexplained; Career Review and the HTML report remained dominated by raw JSON, identifiers, and technical labels; `final-resume.json` was not useful to the applicant; and `final-resume.md` was recognizable but not a polished human-facing final format. The user expected a PDF or equivalent submission-ready document and declined repeated final questions because the negative judgment was already clear.

Durable acceptance records:

- Issue #73 — Beta #1: FAIL and closed.
- Issue #82 — Beta #2: FAIL and closed.
- Issue #83 / PR #87 — complete-resume composition engineering work complete.
- Issue #93 — Beta #3: FAIL and closed.
- Issue #97 — applicant-readable review/export engineering requirement implemented through PR #99; Beta #4 product acceptance still failed on later applicant-facing blockers.

This does not reverse the existing engineering result: the representative real-provider flow remains **Proven**. It establishes that complete composition, successful execution, deterministic validation, and available exports still do not equal product acceptance.

## Beta #2 product acceptance result (2026-08-06)

Beta #2 completed the full real-provider browser workflow and produced `final-resume.md`, `final-resume.json`, and `career-review-report.html`, but the product result is **FAIL** and **Beta Accepted remains NO / NOT YET**.

The user would not submit the generated resume, reported no meaningful time savings, and would not use the product again in its current state. The applicant-facing resume contained only one project statement and omitted personal information, Experience, Skills, Education, and other essential source-resume content. Understanding counts, Evidence Review decisions, Career Review, and the HTML/JSON exports were not sufficiently understandable to a normal applicant.

This does not reverse the existing engineering result: the representative real-provider flow remains **Proven**. It establishes that successful execution, deterministic validation, and export generation do not equal product acceptance.

Durable acceptance records:

- Issue #73 — Beta #1: FAIL and closed.
- Issue #82 — Beta #2: FAIL and closed.
- Issue #83 — complete-resume composition blocker, now engineering-complete through PR #87.

## PR #68 validation repair (2026-08-05)

The local Beta UI now executes an evidence-to-export client flow covered by an executable minimal-DOM regression, rather than an HTML string check. Understanding validation visibly lists each excluded source block and its reason. The semantic-graph demo fixture gives every reviewable candidate an explicit fixture decision, and deterministic drafts intentionally omit Professional Summary until a dedicated summary claim scope exists. Full regression: `npm.cmd test` (156 passing).

## Real-resume section-evidence repair (2026-08-04)

The Resume AST-to-Evidence Review bridge now retains retrieved project and experience bullets as reviewable working evidence instead of reducing the path to standalone skill tokens. After explicit acceptance, the existing 003.6 integration path alone evaluates bounded project, responsibility, and skill proposals with their AST span provenance. The local Beta UI now calls the existing structured Resume Draft provider after integration. Candidate Knowledge and Career Review/export boundaries are unchanged.

## Version 1.0 Beta workflow

Career Review is the product-facing name for the existing immutable Human Review capability. The primary demo requires Evidence Review before it creates the final Career Review: accepted or supported edits flow through existing 003.6, then tailoring, strategy, artifact, and validation rerun. No new capability or Candidate Knowledge write path was added.

The local Beta UI is available through `node src/beta-ui.js`. It is a temporary, plain-HTML testing wrapper around the existing Resume AST, Evidence Review/003.6, tailoring, presentation, artifact, validation, Career Review, and export APIs; it is not production frontend architecture. API keys stay in request memory and never enter the local session database or generated outputs.

**Phase:** Version 1 applicant-facing product-quality recovery after Beta #4 FAIL  
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
- Completed Issue #83 / PR #87 complete-resume composition boundary: exact source-resume passthrough survives alongside evidence-backed generated content without writing passthrough into Candidate Knowledge.
- Completed Issues #95 and #97 / PR #99 engineering change set for applicant-readable review surfaces, proof separation, and PDF-oriented final output; Beta #4 remains the authoritative product-quality judgment and failed on #101/#102.

## Current focus

Resolve Issue #101 so a first-time applicant can understand exactly what Evidence Review is asking before making Accept/Skip decisions, and Issue #102 so visible workflow progression has a discoverable next action. Issue #103 records additional repetitive-stage UX friction that should be addressed as part of the same recovery where appropriate.

The product must remain understandable without requiring internal terminology. A fresh Beta must begin from Landing / Input after the fixes are merged; later-stage submission quality, time saved, review burden, trust, and reuse intent remain unknown until that run reaches them credibly.

## Next decision

No product direction change is required from Beta #4. The next gate is whether the applicant-facing decision meaning and workflow progression are clear enough to permit a fresh end-to-end Beta while preserving complete composition, Candidate Knowledge, provenance, deterministic validation, privacy, and human authority. Intelligent Execution work remains deferred until Version 1 is submission-evaluable.

## Open questions

- What evidence sources are useful, consented, and ethically appropriate beyond local user-entered data?
- What makes available evidence sufficient for each bounded artifact or decision?
- Which recovery actions should be available before a user request, and how should their privacy cost be compared?
- What confirmation and conflict threshold must Candidate Knowledge Integration meet before it accepts a fact?
- What review authority and corroboration threshold are required before outcome evidence changes a priority or skill?
- What is the smallest applicant-readable review and export experience that preserves truth boundaries without exposing implementation detail?

## Milestone 1 Demo update

Milestone 1 Demo is implemented as an integration-only local command. It versions the source resume, runs 002.5, then runs 002.6 before Job Requirements, Information Needs, and Evidence Discovery. It exports immutable semantic and graph runs, terminal decision-state counts, and static HTML graph relationships with readable labels and secondary provenance. Graph evidence is working evidence, not committed Candidate Knowledge coverage; Candidate Knowledge Integration remains the sole accepted-only write path.

# LLM-first Beta path

The preferred real-resume Beta path is LLM-first with deterministic trust boundaries. The Resume AST pipeline remains legacy/diagnostic for offline and synthetic coverage. Beta Accepted remains blocked by the Beta #4 evidence recorded in Issue #100 and the active applicant-facing blockers in Issues #101 and #102. Issue #103 records additional UX friction. Complete composition, engineering proof, and the ability to technically complete the flow do not establish product acceptance.
