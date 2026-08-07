# Current State

**Phase:** Version 1 post-Beta #6 recovery — Option 2 implemented; fresh Beta next
**Last updated:** 2026-08-07
**Beta Accepted:** **NO / NOT YET**

Repository evidence and context handoffs are authoritative if this summary becomes stale.

## Latest durable product result

Beta #6 / Issue #113 remains **FAIL at Evidence Review Candidate 1**. The applicant interpreted Accept as reword-for-JD and Skip as keep-original, while expecting both to remain on the resume. Later exploration also rejected the final resume for real use.

No engineering change reinterprets Beta #6 as PASS. Beta Accepted remains **NO** until a fresh Beta establishes product acceptance.

## Product decision and implementation

Issue #115 is **RESOLVED / COMPLETED**. Product approved Option 2: treat the uploaded V1 resume as applicant-provided source material, and move applicant review to the moment the system proposes a concrete material rewrite or interpretation.

PR #118 — `Implement Option 2 concrete tailoring review` — merged to `chore/project-foundation` at `49b8ae0ac705d7d3bd22c19857aabaaa0c3ae9c5`.

The applicant-visible flow now uses **Tailoring Review** instead of abstract Evidence Review Accept/Skip:

- Original wording → Proposed tailored wording;
- **Use tailored version**;
- **Keep original wording**;
- **Needs correction** with applicant-supplied missing/incorrect context.

Unchanged wording does not require a meaningless permission decision.

## Correction / regeneration boundary

A Tailoring Review correction is not silently learned. The implementation routes it through:

1. the existing acquisition boundary;
2. Candidate Knowledge integration / 003.6;
3. a bounded superseding Candidate Fact revision when accepted;
4. resume tailoring and complete-resume composition regeneration;
5. deterministic validation;
6. Tailoring Review again for a new concrete before/after decision.

Historical superseded facts remain traceable; the effective current knowledge snapshot excludes the superseded prior fact. The uploaded source resume itself remains immutable.

An adversarial regression proves an AI-only `normalized_meaning` cannot be promoted as source truth merely because the underlying resume span was source-attested.

## Regression-first proof for PR #118

Regression-only CI run `31155025138`:

- new Option 2 applicant/HTTP contract: expected **RED** against the prior abstract Evidence Review model;
- existing unit/integration: **PASS**;
- then-current shipped browser: **PASS**.

Final merge-candidate CI run `31157897591`:

- unit: **PASS**;
- full integration: **PASS**;
- patch whitespace: **PASS**;
- HTTP / representative PDF contract: **PASS**;
- pre-fix Chromium RED proof: **PASS**;
- current Chromium GREEN proof: **PASS**;
- review threads: **PASS / none**;
- current-primary synchronization at merge gate: **PASS / behind 0**.

The browser proof exercises correction → 003.6 integration → regeneration → second Tailoring Review decision → Draft → Career Review → PDF/report/Markdown/JSON export.

Real-provider smoke remains **UNKNOWN / non-blocking** because the proof used deterministic/mock/injected-provider contracts rather than a live external credentialed run.

## Previous presentation recovery

PR #116 remains merged at `b0efc92aa390799627e35e9c9d163dab1d6f88d6` and preserves the Beta #6 presentation/export fixes: private-use glyph cleanup, safer Experience dedupe, separated Skills, applicant-readable processing summary, Career Review rationale, clearer report scope, and stronger PDF hierarchy.

Issue #97 remains **OPEN** because fresh-user submission/readability/value acceptance is still required.

## Protected truth and authority boundaries

Preserved:

- 003.6 is the sole Candidate Knowledge integration/write path.
- Uploaded source-resume evidence may be source-attested for V1, but AI interpretation of that source is not automatically trusted.
- Exact validated source-resume passthrough cannot create Candidate Knowledge.
- Generated/materially rewritten claims remain Candidate-Knowledge-backed and provenance-linked.
- Issue #83 complete-resume composition/source-passthrough guarantees remain intact.
- Resume Content Selection, provenance inheritance, claim scope, coverage, completeness, duplication, and deterministic validation authority remain intact.
- Career Review / Human Review remains the final explicit human authority before export.
- Manual Career Review edits do not silently rewrite Candidate Knowledge.
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

1. Merge this Option 2 engineering-readiness checkpoint.
2. Keep Issue #97 open for fresh-user resume/submission acceptance.
3. After the checkpoint merges, create a fresh Beta #7 with initial result **UNKNOWN**.
4. Beta #7 must begin from Landing/Input and independently test Tailoring Review comprehension, including at least one correction/regeneration loop.
5. Do not reuse Beta #6 judgments as Beta #7 evidence.
