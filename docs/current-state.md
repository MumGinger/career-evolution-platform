# Current State

**Phase:** Version 1 post-Beta #7 layout recovery — fresh Beta #8 next
**Last updated:** 2026-08-12
**Beta Accepted:** **NO / NOT YET**

Repository and GitHub evidence are authoritative if this document becomes stale.

## Latest product result

Beta #7 / Issue #121 is complete and closed as **FAIL**.

The fresh applicant reached the final resume and judged:

- would submit `final-resume.pdf`: **NO**;
- time saved versus manual tailoring: **NO**;
- content might be acceptable, but the formatting/layout was not credible enough for a serious application;
- the next-use decision was to wait for a product update rather than use the current output again.

The decisive blocker is Issue #122: **Make final resume layout submission-ready**. The secondary Beta #7 watch item is that Tailoring Review often felt like title-level changes with limited perceived substantive tailoring value.

No subsequent engineering work reinterprets Beta #7 as PASS. Beta Accepted remains **NO**.

## Repository recovery on 2026-08-12

After the repository history rewrite, authoritative `chore/project-foundation` had regressed to the Beta #5 checkpoint even though the rewritten Option 2 implementation/checkpoint branches still existed.

Engineering verified that `docs/option2-tailoring-review-checkpoint` was a clean fast-forward of primary and restored `chore/project-foundation` to rewritten Option 2 checkpoint commit `b40f8a624289c5986ae7f75f019153211faa65fa` with no force and no loss of primary commits before addressing Beta #7.

## Beta #7 layout engineering recovery

PR #123 — `Recover Beta 7 professional resume layout` — merged to `chore/project-foundation` at `2fa1f084f8e06cc8f9ee095d406aa6c0033c95af`.

Applicant-visible recovery:

- browser/review and final PDF use one shared professional presentation model;
- Professional Summary is presented independently from Experience;
- categorized Skills render as readable label/value groups and flat skills remain scan-friendly items;
- Experience, Projects, and Education render with conventional entry hierarchy;
- entry dates render in the heading/date position instead of trailing after content;
- Project trailing dates are associated with the corresponding project heading before bullets;
- Education school/date/degree/detail runs are separated into readable hierarchy;
- conservative date detection prevents date-like achievement prose from being incorrectly moved into metadata;
- Career Review section copy remains populated and applicant-readable.

The renderer uses a restrained ATS-friendly single-column presentation rather than decorative multi-column/template complexity.

## Regression-first proof for PR #123

Regression-only commit: `211069fab6665b10d4e9563d5b17eca09961143d`.

Regression-only CI `31596052613` proved the new Beta #7 layout unit contract was **RED as expected** against the prior shipped renderer. That run also surfaced an unrelated stale legacy `/api/start` discovery-ranking assumption; the authoritative Option 2 complete-source and representative-PDF contracts remained the relevant source-preservation authority.

Final merge-candidate CI `31597221430`:

- unit: **PASS**;
- full integration: **PASS**;
- patch whitespace: **PASS**;
- HTTP / representative PDF contract: **PASS**;
- pre-fix Chromium RED proof: **PASS**;
- current Chromium GREEN proof: **PASS**;
- review threads: **none**;
- branch sync at merge gate: **behind 0**.

## Issue state

- Issue #121 — Beta #7: **CLOSED / historical FAIL**.
- Issue #122 — final resume layout submission-ready: **OPEN / engineering recovery merged, fresh-user acceptance pending**.
- Issue #97 — applicant-readable review/export acceptance: **OPEN / fresh-user submission and value acceptance pending**.

Issue #122 must not be closed from engineering proof alone because its acceptance criteria require a fresh applicant to judge the PDF submission-ready and meaningfully time-saving.

## Protected truth and authority boundaries

Preserved:

- 003.6 remains the sole Candidate Knowledge integration/write path.
- Uploaded source-resume evidence may be source-attested for V1, but AI interpretation of source text is not automatically truth.
- Source-resume passthrough remains source-linked and cannot create Candidate Knowledge.
- Generated/materially rewritten claims remain Candidate-Knowledge-backed and provenance-linked.
- Issue #83 complete-resume composition/source-passthrough guarantees remain intact.
- Resume Content Selection, provenance inheritance, claim scope, coverage, completeness, duplication, and deterministic validation authority remain intact.
- Career Review / Human Review remains the final explicit human authority before export.
- Manual Career Review edits do not silently rewrite Candidate Knowledge.
- Provider credentials remain memory-only/private.
- The unresolved complete-source/no-core-tailoring-selection policy from Issue #95 remains unchanged.

The Beta #7 recovery is a presentation boundary. It does not rewrite source evidence or knowledge authority.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Beta #3 / Issue #93: **FAIL**.
- Beta #4 / Issue #100: **FAIL**.
- Beta #5 / Issue #106: **FAIL**.
- Beta #6 / Issue #113: **FAIL**.
- Beta #7 / Issue #121: **FAIL**.
- Beta Accepted: **NO**.

## Current focus

1. Merge the durable Beta #7 layout-recovery checkpoint.
2. Create fresh Beta #8 with initial result **UNKNOWN**.
3. Begin Beta #8 from Landing/Input using a real resume and real job description.
4. Primary retest: professional submission quality of `final-resume.pdf`, especially Summary, Skills, Experience, Projects, Education, spacing, hierarchy, and date placement.
5. Keep Tailoring Review perceived value as a secondary watch item.
6. Keep Issues #122 and #97 open unless fresh applicant evidence actually satisfies their acceptance bars.
