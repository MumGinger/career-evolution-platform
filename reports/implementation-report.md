# Implementation Report — Capability 004.2

## Scope

Implemented deterministic Resume Artifact Generation: immutable artifact runs and first-class structured intermediate resume artifacts sourced solely from immutable tailoring plans. Every visible statement carries Resume Content Selection and Candidate Fact/revision provenance. The fixed model provides a Summary placeholder plus Skills, Experience, Projects, Education, and Certifications sections; omissions, blocked claims, coverage, and limitations stay in metadata.

Capability 003.6 remains complete and unchanged: Candidate Knowledge Integration is the accepted-only, append-only write boundary. This change reads its committed facts; it does not alter the integration model.

## Changed

- `src/resume-artifact.js`, `src/store.js`, and `src/cli.js`
- Capability 004 PRD, roadmap, current state, reports, and deterministic tests

## Validation

`npm.cmd test` (full suite).

## Open questions

Broader semantic matching, prose synthesis, DOCX/PDF output, and independent artifact validation remain intentionally out of scope.
