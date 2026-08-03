# Implementation Report — Capability 004.3

## Capability 002.5 update (2026-08-03)

Added immutable source-resume artifact versions, semantic runs, exact evidence spans, and traceable entity/relation candidates under `resume-semantic-policy/1.0.0`. The implementation preserves the existing 004.2 generated-resume schema and adds bounded `resume_semantic` retrieval to the established 003.3 Evidence Discovery flow. It never writes Candidate Knowledge.

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
