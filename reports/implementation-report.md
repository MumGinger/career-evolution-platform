# Implementation Report — Capability 004.3

## AI Career Companion Manifesto (2026-08-04)

Added durable product documentation for the platform's long-term philosophy: helping people discover, develop, and realize the value they can create in the world. The manifesto records the transition from resume artifacts to a life-long career companion and supplies principles for user agency, explainability, gradual learning, and productive uncertainty. This is a documentation-only change; no implementation behavior changed.

Validation: reviewed Markdown links and repository documentation structure.

## Career Conversation MVP

Added one optional post-resume question to the Evidence Review CLI. Its answer or explicit skip is recorded once per completed review workflow in a small observation table containing only the question, answer, timestamp, workflow source, and skipped state. The HTML report and fixture output display it. The path does not call Candidate Knowledge Integration or write Candidate Knowledge.

Validation: `npm.cmd test` (full suite).

## Evidence Review MVP (Issue #39)

Added the end-to-end local review slice: an interactive and fixture-driven CLI for `needs_confirmation` evidence, immutable review decisions, strict source-bounded edits, 003.6-only integration, and regenerated tailoring, artifact, validation, JSON, Markdown, and HTML outputs.

## Capability 002.7 Resume AST refactor (2026-08-03)

Implemented async immutable Resume AST runs, strict nested local validation, `structurally_grouped` source-layout state, direct ranked `resume_ast` retrieval, and complete confirmation proposals. The real-failure regression covers a project title, technology subtitle, wrapped bullet, and structurally inferred grouping. Candidate Knowledge integration remains unchanged: 003.6 is the only writer. `npm.cmd test`: 89 passing.

## Capability 002.5 update (2026-08-03)

Added immutable source-resume artifact versions, semantic runs, exact evidence spans, and traceable entity/relation candidates under `resume-semantic-policy/1.0.0`. The implementation preserves the existing 004.2 generated-resume schema and adds bounded `resume_semantic` retrieval to the established 003.3 Evidence Discovery flow. It never writes Candidate Knowledge.

## Real Input Parsing Hardening (2026-08-03)

Implemented integration hardening under `resume-semantic-policy/1.1.0`, `job-intelligence-parser/1.1.0`, and `job-requirement-policy/1.1.0`. Resume parsing normalizes real uppercase compound headings, drops standalone PDF bullets, preserves merged line ranges for wrapped bullets, and creates only anchor-supported `performed_in`, `used_in`, and explicit-result `produced` relations. Job parsing accepts raw LinkedIn-style opening lines, prioritizes role sections, excludes defined noise sections, and prevents history copy from yielding experience requirements. No LLM, external API, Candidate Knowledge write path, or artifact-version mutation was introduced.

## Scope

Implemented the deterministic Truth Firewall for Resume Artifacts. Immutable Resume Validation Runs snapshot one artifact run and its linked tailoring plan, persist first-class findings, and report `passed`, `passed_with_warnings`, or `failed`. Checks cover provenance integrity, bounded claim wording, selection state and placement, uncovered requirements, duplicates, ordering, and traceability completeness.

Capability 003.6 remains complete and unchanged: Candidate Knowledge Integration is the accepted-only, append-only write boundary. This change reads its committed facts; it does not alter the integration model.

## Changed

- `src/resume-validation.js`, `src/resume-artifact.js`, `src/store.js`, `src/cli.js`, and `tests/resume-validation.test.js`
- Capability 004 PRD, roadmap, current state, reports, and deterministic tests

## Validation

`npm.cmd test` (full suite).

## Open questions

Broader semantic equivalence, prose synthesis, DOCX/PDF output, and final-renderer release gating remain intentionally out of scope.

## Milestone 1 Demo update

Implemented `src/demo.js`, an integration command that invokes the completed 002, 002.5, 003, and 004 pipeline in order: source resume artifact versioning, Resume Semantic Understanding, Job Requirement Profile, Information Needs, Evidence Discovery, Acquisition Planning, explicit Acquisition Execution outcomes, Candidate Knowledge Integration, Tailoring Plan, Resume Artifact, and Validation Run. It exports `resume-semantic-run.json`, stage snapshots, Markdown, and a static HTML report. The report makes semantic names, types, decision states, source sections, and evidence text readable while keeping UUID provenance in details. This is a demo integration update, not a domain capability.

Unresolved actions are recorded as `skipped` unless an optional caller-supplied capture fixture supplies raw evidence. Fixture proposals remain explicit and are subject to the existing accepted-only, append-only Candidate Knowledge Integration policy; the demo never promotes parsed resume text, semantic candidates, skipped actions, or inferred claims. Added end-to-end coverage for semantic-run ordering, semantic output/report presence, no-capture safety, and clean-output re-run behavior.
# Capability 002.6 regression hardening (2026-08-03)

Graph construction now reconstructs anchors, responsibilities, exact narrow-vocabulary tools, and bounded graph edges directly from immutable 002.5 spans and explicit entities. It does not read source document bytes and no longer depends on semantic relation candidates or pre-existing responsibility candidates. A real-style regression fixture covers flat explicit entities, zero semantic relations, missing bullet glyph/index data, wrapped bullets, derived/possible evidence states, and the requirement that derived responsibility evidence stays `needs_confirmation`. The complex demo fixture asserts non-zero graph edges, derived structural evidence, and working-evidence availability.

Validation: `npm.cmd test` — 85 passed, 0 failed.

# Capability 002.6 implementation

Implemented immutable Resume Semantic Graph Construction from the latest 002.5 run. The graph preserves artifact/version/span provenance on nodes and edges, adds bounded relationship types, and deliberately leaves Candidate Knowledge unchanged. Evidence Discovery now searches `resume_semantic_graph` separately without treating graph and flat semantic evidence from the same resume as independent corroboration. Demo output includes `resume-semantic-graph-run.json`, graph counts, readable relationship examples, and separate committed versus working-evidence language. Zurich identity parsing now uses one canonical object for three-line LinkedIn and `Role at Company` openings.

Validation: `npm.cmd test` — 83 passed, 0 failed.
# Career Understanding MVP implementation

Added immutable Snapshot Runs, immutable user feedback, a bounded deterministic policy, CLI commands, Evidence Review JSON/HTML integration, and synthetic policy tests. The slice reads Candidate Knowledge and evidence but never writes Candidate Knowledge.

# Career Reflection / Shared Understanding MVP (Issue #46)

Added a small snapshot-first reflection slice: three bounded actions, one optional short note, an immutable source-linked Career Reflection Run, and deterministic idempotency for duplicate submissions. The CLI reviews the latest snapshot, and the demo exports `career-reflection-run.json`, a Shared Understanding HTML section, and terminal state. No Candidate Knowledge, Career Understanding, preference, goal, or hypothesis write path was added. Validation: full automated suite and whitespace check.
