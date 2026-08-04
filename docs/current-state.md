# Current State

**Phase:** Evidence Review MVP implemented for local CLI beta
**Last updated:** 2026-08-03

## Completed

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

## Current focus

Review the deterministic truth firewall before introducing final-document renderers. Graph construction now adds bounded project/experience-to-responsibility-to-tool relationships while keeping resume evidence separate from committed coverage; real-input hardening also fixes canonical LinkedIn job identity persistence.

## Next decision

Decide the bounded final-document renderer and whether it must require a passing 004.3 Validation Run at release time.

## Open questions

- What evidence sources are useful, consented, and ethically appropriate beyond local user-entered data?
- What makes available evidence sufficient for each bounded artifact or decision?
- Which recovery actions should be available before a user request, and how should their privacy cost be compared?
- What confirmation and conflict threshold must Candidate Knowledge Integration meet before it accepts a fact?
- What review authority and corroboration threshold are required before outcome evidence changes a priority or skill?

## Milestone 1 Demo update

Milestone 1 Demo is implemented as an integration-only local command. It versions the source resume, runs 002.5, then runs 002.6 before Job Requirements, Information Needs, and Evidence Discovery. It exports immutable semantic and graph runs, terminal decision-state counts, and static HTML graph relationships with readable labels and secondary provenance. Graph evidence is working evidence, not committed Candidate Knowledge coverage; Candidate Knowledge Integration remains the sole accepted-only write path.
