# Product Roadmap

Version 1 engineering integration is complete, but Version 1 is **not Beta Accepted**. Beta #1 and Beta #2 both failed product acceptance. Issue #83 — **Produce a complete recognizable tailored resume** — is the active release blocker.

Another real-user Beta and new Intelligent Execution work are deferred until the product independently demonstrates a complete applicant-facing resume that preserves essential source-resume structure while applying evidence-backed tailoring.

| Capability | Status | Purpose |
| --- | --- | --- |
| 002.7 — LLM-Assisted Resume AST | Complete (offline/mock) | Legacy/diagnostic blocking path with provenance validation and direct retrieval. |
| 002.5 — Resume Semantic Understanding | Complete | Create immutable, traceable resume semantic candidates before Information Acquisition. |
| 002.6 — Resume Semantic Graph Construction | Complete | Build immutable, provenance-preserving graph candidates from 002.5 working evidence before Information Acquisition. |
| 001 — Application Evidence Loop | Complete | Record applications, artifacts, and outcome/preference evidence without automatic learning. |
| 002 — Resume Intake & Candidate Knowledge Bootstrap | Complete | Import explicit resume evidence into traceable Candidate Knowledge facts; ambiguous facts remain `needs_confirmation`. |
| 003.1 — Job Intelligence | Complete | Create deterministic, explainable Requirement Profiles from job context. |
| 003.2 — Information Need Prioritization | Complete | Identify and prioritize material unresolved candidate information. |
| 003.3 — Evidence Discovery | Complete | Search bounded, consented evidence and record candidates, resolutions, and sufficiency. |
| 003.4 — Acquisition Planning | Complete | Produce an Acquisition Plan that selects the highest-value permitted strategy for each unresolved Information Need. |
| 003.5 — Acquisition Execution | Complete | Execute immutable plans through deterministic local actions and capture raw evidence without integration. |
| 003.6 — Candidate Knowledge Integration | Complete | Deterministically commit only accepted bounded evidence into append-only Candidate Knowledge through its sole Capability 003 write path. |
| 004.1 — Resume Tailoring Planning | Complete | Create immutable, truth-preserving selection and coverage plans from committed Candidate Knowledge and job requirements. |
| 004.2 — Resume Artifact Generation | Complete as an intermediate artifact boundary; product completeness remains blocked | Render structured, provenance-preserving resume artifacts from immutable tailoring plans. Issue #83 must define how complete source-resume composition survives around tailored claims. |
| 004.3 — Truthfulness & Quality Validation | Complete for claim safety; whole-resume completeness requires Issue #83 | Validate immutable artifacts against plan, fact provenance, claim scopes, traceability, and the eventual complete-resume composition contract. |
| Evidence Review MVP (Issue #39) | Complete | Review confirmation-required evidence, integrate only approved claims through 003.6, then refresh tailoring, artifact, and validation. |
| Career Conversation MVP | Complete | Ask one optional post-resume question and store its answer or skip as a bounded observation, never as Candidate Knowledge. |
| Career Reflection / Shared Understanding MVP (Issue #46) | Complete | Present the Current Career Snapshot, capture one optional-note response, and persist an immutable source-linked reflection without updating understanding or knowledge. |
| Career Curiosity MVP | Complete | Introduce exactly one supported adjacent career possibility, record one bounded response, and expand perspective without recommending a job or writing Candidate Knowledge. |
| Decision Companion MVP (Issue #51) | Complete | Final Thinking Layer slice: compare 2–4 user-provided options with provenance and uncertainty, then record the user's own state without recommendation. |
| Milestone 2 — Career Evolution Loop v1 | Engineering complete | Integrate Resume Intelligence, Career Conversation, Understanding, Reflection, Curiosity, completion, one HTML report, and one loop summary without changing truth boundaries. |
| Intelligent Resume v1 | Engineering complete; product acceptance failed | Use a provenance-preserving Presentation Strategy and mandatory Career Review. Beta evidence shows the artifact is still incomplete as a resume. |
| Human Review / Career Review MVP | Complete | Require explicit review before export; preserve drafts, edits, evidence, rationale, and timestamps in immutable runs. |
| Local dual-mode Beta UI | Complete for testing | Provide a Companion View and Developer View over the shipped local workflow; it is not production frontend architecture. |
| Issue #83 — Complete Resume Composition | **Active product blocker** | Preserve identity/contact and essential source sections, combine them with evidence-backed tailored claims, and validate both claim safety and whole-document completeness. |
| Version 1 Beta Accepted | **Blocked / NO** | Requires a complete, understandable, submission-evaluable resume and explicit real-user acceptance. |
| Intelligent Execution expansion | Deferred | Do not add new artifacts until Version 1 produces a complete resume and passes Beta. |
| 005 — Job Discovery | Planned | Discover and evaluate job opportunities. |
| 006 — Application Automation | Planned | Support bounded, reviewable application workflows. |
| 007 — Outcome Learning | Planned | Learn priorities and guidance from reviewed application and interview outcomes. |

## Current product gate

Issue #83 must answer one product question before implementation can be accepted:

> What is the smallest truth-preserving composition boundary that lets unchanged source-resume structure and essential content survive into the final artifact without silently treating all source text as newly committed Candidate Knowledge?

Accepted boundaries remain unchanged:

- Candidate Knowledge is the authority for newly generated or materially rewritten factual claims.
- 003.6 is the sole accepted-only Candidate Knowledge writer.
- LLM understanding and drafting are bounded proposals.
- Deterministic validation remains authoritative.
- Career Review is mandatory before export.
- Engineering completion and export availability do not equal Beta acceptance.

## Beta architecture direction

The preferred real-resume Beta path is LLM-first with deterministic trust boundaries. The Resume AST path remains legacy/diagnostic for offline and synthetic coverage. The local UI keeps Companion and Developer views separate so applicant-facing simplicity does not remove internal observability.

Capabilities are delivered only when their evidence, privacy, review, and product boundaries are ready. A roadmap item is not authorization to implement it.
