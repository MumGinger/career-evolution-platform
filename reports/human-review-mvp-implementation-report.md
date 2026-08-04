# Human Review MVP implementation report

## Career Review naming integration

Career Review is the product-facing name of this existing Human Review capability. The Version 1.0 integration routes the primary demo through `createHumanReviewRun()` and `exportResumeArtifact()` without adding a second module, schema, or gate.

Date: 2026-08-04

## Scope

Implemented the mandatory final review step for Resume only. A Human Review Run requires explicit approve or edit decisions for Professional Summary, Skills, Experience, and Projects before export. It snapshots the AI draft, provenance, and presentation rationale, and preserves edited final text alongside the draft.

## Boundary and validation

Runs and section decisions have database immutability triggers. Export requires a completed matching review run. Human Review never writes Candidate Knowledge and does not regenerate an artifact. The CLI emits a JSON artifact, HTML report, final reviewed Markdown, and a terminal completion summary. Validation: `npm test`.

## Open question

PDF/DOCX rendering remains outside this CLI MVP. A future renderer must call `exportResumeArtifact` to preserve the review gate.
