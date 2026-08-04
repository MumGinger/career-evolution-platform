# Current State

**Phase:** Milestone 1 Demo — End-to-End Resume Tailoring Pipeline implemented
**Last updated:** 2026-08-03

## Completed

- Version 1.0 Beta integration: a complete local Intelligent Resume journey from resume/job intake through understanding, evidence acquisition, draft, presentation explanation, Career Review, and final-export decision.
- Mandatory Career Review: every rendered resume section needs explicit candidate approval; export remains blocked without it or without a passing validation run.
- Explainable beta artifacts: presentation strategy, Career Review state, final-export state, and a final HTML report are exported beside the existing immutable pipeline artifacts.

- Established project foundation and working agreement.
- Documented the product-first vision, architecture principles, and initial design models.
- Recorded the decision to validate Career before extracting a framework.
- Implemented MVP-001: a local application-to-interview evidence loop with SQLite persistence, versioned artifacts, and non-learning outcome evidence.
- Implemented Experiment 002: PDF resume intake that bootstraps traceable Candidate Knowledge facts without inferred content.
- Implemented Capability 002.5: immutable source-resume versions and semantic runs with exact spans, working entity/relation candidates, and a narrow versioned deterministic policy. Semantic candidates remain outside Candidate Knowledge and are available only as bounded Evidence Discovery input.
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

## Current focus

Run the Version 1.0 Beta checklist with real candidates and collect reviewed feedback without expanding product scope.

## Next decision

Use beta feedback to decide whether a later release needs a DOCX/PDF renderer; Version 1.0 retains a traceable Markdown final export.

## Open questions

- What evidence sources are useful, consented, and ethically appropriate beyond local user-entered data?
- What makes available evidence sufficient for each bounded artifact or decision?
- Which recovery actions should be available before a user request, and how should their privacy cost be compared?
- What confirmation and conflict threshold must Candidate Knowledge Integration meet before it accepts a fact?
- What review authority and corroboration threshold are required before outcome evidence changes a priority or skill?

## Milestone 1 Demo update

Milestone 1 Demo is implemented as an integration-only local command. It creates and exports a distinct sequence of immutable runs from resume evidence and job description through validation, with terminal and static HTML summaries. Unresolved acquisition is explicitly skipped unless an optional caller-supplied capture fixture provides raw evidence; Candidate Knowledge Integration remains the sole accepted-only write path. The next decision remains final-document rendering and its release gate.
