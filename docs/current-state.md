# Current State

**Phase:** Version 1 post-Beta #6 recovery — product decision required
**Last updated:** 2026-08-07
**Beta Accepted:** **NO / NOT YET**

Repository evidence and context handoffs are authoritative if this summary becomes stale.

## Latest durable product result

Beta #6 / Issue #113 remains **FAIL at Evidence Review Candidate 1**.

The applicant interpreted:

- **Accept** = reword this resume material to fit the job better;
- **Skip** = keep the applicant's original wording;
- both choices = material that remains on the resume.

That did not match the shipped evidence-reuse permission model, so the clean Beta failed at the required Candidate 1 comprehension gate. Supplemental later-stage exploration also found applicant presentation/export defects and ended with the applicant rejecting both the system and final resume.

No engineering result may reinterpret Beta #6 as PASS. Beta Accepted remains **NO**.

## Engineering recovery after Beta #6

PR #116 — `Recover Beta 6 resume presentation and review clarity` — merged to `chore/project-foundation` at `b0efc92aa390799627e35e9c9d163dab1d6f88d6`.

It addresses the independent presentation/export findings recorded under Issue #97:

- private-use PDF/icon glyphs are removed at the applicant presentation/export boundary while ordinary Unicode remains intact;
- multiline Experience headings no longer repeat exact following bullet prose while distinct title/company/date/location metadata is preserved;
- plain Skills lists render as separated resume items rather than one crammed line;
- Understanding/exclusions is presented as a no-decision processing summary, with applicant-readable counts and without raw source-alignment/parent-reference messages;
- Career Review visibly shows applicant-readable presentation rationale alongside source/origin explanation;
- the Career Review report explains that it represents the final application artifact, is not a deletion log, and does not alter the uploaded resume;
- final PDF hierarchy, spacing, header treatment, section treatment, and Skills presentation are strengthened;
- the existing Career Review correction/edit path remains intact.

Issue #97 remains **OPEN** because fresh-user submission/readability/value acceptance is still required.

## Repeated Evidence Review failure — Product Issue #115

Evidence Review Candidate 1 comprehension has now failed in three fresh Betas (#4, #5, and #6), despite separate applicant-facing engineering recoveries in PR #104 and PR #111.

Per `ENGINEERING_LEAD.md`, engineering has stopped copy-level patching of the same problem and opened Issue #115: **Product decision — Evidence Review meaning has failed three fresh Betas**.

No new Beta should be prepared until #115 is decided and the resulting behavior is implemented and independently proven.

The current intended model remains unchanged until that decision: Accept permits reviewed evidence to support later new/materially rewritten wording after existing checks; Skip blocks that reuse; neither decision is itself a final-resume inclusion/removal decision.

## Regression-first proof for PR #116

Regression-only CI run `31150317802`:

- new unit presentation regressions: expected **RED**;
- new current-browser applicant regression: expected **RED**;
- unrelated HTTP / representative PDF contract: **PASS**.

Final merge-candidate CI run `31150697393`:

- unit: **PASS**;
- full integration: **PASS**;
- patch whitespace: **PASS**;
- HTTP / representative PDF contract: **PASS**;
- historical Chromium RED proof: **PASS**;
- current Chromium GREEN proof: **PASS**;
- review threads: **PASS / none**;
- current-primary synchronization: **PASS**.

Real-provider smoke remains **UNKNOWN / non-blocking** because provider execution did not change.

## Protected truth and authority boundaries

Unchanged:

- 003.6 is the sole Candidate Knowledge integration/write path.
- Accepted working evidence does not become Candidate Knowledge outside 003.6.
- Skipped evidence creates no Candidate Knowledge fact.
- Exact validated source-resume content may survive as source-resume passthrough and cannot create Candidate Knowledge.
- Generated/materially rewritten claims remain Candidate-Knowledge-backed and provenance-linked.
- Issue #83 complete-resume composition and source-passthrough guarantees remain intact.
- Resume Content Selection, provenance inheritance, claim scope, coverage, completeness, duplication, and deterministic validation authority remain unchanged.
- Career Review / Human Review remains the final explicit human authority before export.
- Human edits do not silently rewrite Candidate Knowledge.
- Provider credentials remain memory-only/private.
- The unresolved complete-source/no-core-tailoring-selection policy from Issue #95 remains unchanged.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Beta #3 / Issue #93: **FAIL**.
- Beta #4 / Issue #100: **FAIL**.
- Beta #5 / Issue #106: **FAIL**.
- Beta #6 / Issue #113: **FAIL**.
- Beta Accepted: **NO**.

## Current focus

1. Durably checkpoint the merged PR #116 engineering recovery.
2. Resolve Product Issue #115 before any further Evidence Review implementation.
3. Keep Issue #97 open for the eventual fresh-user resume/submission acceptance gate.
4. Do **not** open Beta #7 until #115 is decided, implemented, regression-proven, and checkpointed.
