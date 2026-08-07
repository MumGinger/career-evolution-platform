# Project Snapshot

**As of:** 2026-08-07 — after Beta #6 engineering presentation recovery
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`

## State

- The representative evidence-to-export engineering flow remains **Implemented and Integrated** for its specified behavior.
- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Issue #83 / PR #87: complete-resume composition engineering complete.
- Beta #3 / Issue #93: **FAIL**.
- Issues #95 and #97 / PR #99: applicant-readable review/export and proof-tier engineering merged; Issue #97 remains open for product acceptance.
- Beta #4 / Issue #100: **FAIL**.
- Issues #101–#103 / PR #104: engineering recovery merged and checkpointed by PR #105.
- Beta #5 / Issue #106: **FAIL**.
- Issues #107 and #108 / PR #111: engineering recovery merged and checkpointed by PR #112.
- Beta #6 / Issue #113: **FAIL at Evidence Review Candidate 1**; later exploration identified additional presentation/export defects.
- PR #116: Beta #6 presentation/export engineering recovery merged at `b0efc92aa390799627e35e9c9d163dab1d6f88d6`.
- Issue #115: **OPEN / Product decision required** because Evidence Review meaning has failed three fresh Betas despite two prior engineering repairs.
- Beta Accepted: **NO**.

Repository and GitHub evidence override stale context.

## Beta #6 product result

At Evidence Review Candidate 1, the applicant understood Accept as rewording the selected resume material for the job and Skip as keeping the original wording, with both expected to remain on the resume. This did not match the intended evidence-reuse permission model, so the clean Beta failed at Candidate 1.

Supplemental exploration found:

- Understanding/exclusions was confusing and exposed technical source-alignment explanations without a useful applicant action;
- private-use/square glyphs in applicant contact information;
- crammed Skills presentation;
- repeated Experience prose between combined headings and bullets;
- insufficiently clear tailoring/selection rationale;
- final PDF presentation below the applicant's professional submission bar.

The applicant's final judgment remained that they would not use the system or resume. Beta #6 remains FAIL regardless of subsequent engineering fixes.

## PR #116 engineering result

PR #116 addresses the presentation/export findings without changing Evidence Review decision semantics:

- applicant-visible private-use glyph cleanup;
- safe multiline heading/bullet duplicate cleanup with metadata-preservation counterexamples;
- separated Skills presentation;
- applicant-readable no-decision processing summary instead of raw exclusion internals;
- visible Career Review presentation rationale;
- clearer Career Review report scope and non-deletion explanation;
- stronger final-PDF hierarchy and spacing;
- existing Career Review correction behavior preserved.

Regression-only CI `31150317802` demonstrated the expected RED state. Final merge-candidate CI `31150697393` passed unit, full integration, whitespace, HTTP/representative-PDF, historical Chromium RED proof, and current Chromium GREEN proof.

Issue #97 remains open because engineering proof does not establish fresh-user submission/value acceptance.

## Product decision boundary — Issue #115

The Evidence Review comprehension failure is now a repeated product problem, not another ordinary wording bug.

Fresh Betas #4, #5, and #6 all failed at Candidate 1 after two prior applicant-facing repairs. Under the project's repeated-failure rule, engineering has stopped patching this surface pending an explicit Product decision about the applicant-visible role/timing of evidence review.

No new Beta is ready until #115 is decided and the resulting behavior is implemented and independently proven.

## Protected capability boundary

Unchanged:

- 003.6 remains the sole Candidate Knowledge integration/write authority.
- Source-resume passthrough remains source-linked and cannot create Candidate Knowledge.
- Generated/materially rewritten claims retain Candidate Knowledge, provenance, and validation requirements.
- Complete-resume composition/source-passthrough guarantees remain intact.
- Resume Content Selection and deterministic validation authority remain unchanged.
- Career Review / Human Review remains the final human authority before export.
- Manual Career Review edits do not silently rewrite Candidate Knowledge.
- Provider credentials remain memory-only/private.
- The unresolved complete-source/no-core-tailoring-selection policy from Issue #95 remains unchanged.

## Next cross-room action

1. Merge this durable engineering checkpoint.
2. Resolve Product Issue #115.
3. Implement the chosen Evidence Review product model regression-first while preserving all protected truth/authority boundaries.
4. Durably checkpoint that implementation.
5. Only then prepare a fresh Beta #7 from Landing/Input. Do not continue Beta #6.
