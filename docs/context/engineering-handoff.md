# Engineering Handoff

**Owner:** Engineering Room  
**Checkpoint:** 2026-08-06 — Beta #4 engineering recovery

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, `docs/context/beta-handoff.md`, Issue #100, closed Issues #101–#103, merged PRs #99 and #104, and current GitHub state.

Repository evidence is authoritative over this handoff.

## Current state

- Beta #4 / Issue #100 remains the authoritative product result: **FAIL**. Do not reinterpret it as PASS.
- PR #104 merged to `chore/project-foundation` at `3ee73fa1c03b9ec59e21397af6dff06acf2e5ca5`.
- Issue #101 is **CLOSED / engineering PASS**: Evidence Review now states the applicant decision and both Accept/Skip consequences in ordinary language before the choice.
- Issue #102 is **CLOSED / engineering PASS**: Draft Step 3 now has an explicit `Continue to Career Review` transition before Step 4 appears.
- Issue #103 is **CLOSED / engineering PASS** after direct browser verification that stale Understanding/Evidence panels disappear after advancing to Draft.
- Beta Accepted remains **NO**. The next product gate must be a fresh Beta from Landing/Input; it is not a continuation of Beta #4.

## Applicant-visible decision contract

Before an Evidence Review choice, the shipped UI now makes clear:

- the decision is whether the item is accurate evidence about the applicant and may support tailored wording for this application;
- `Why it may help` communicates job relevance separately from the decision;
- **Accept** permits the item to support new/tailored wording when later checks allow it, but does not guarantee resume inclusion and does not automatically rewrite unrelated content;
- **Skip** prevents the item from supporting new/rewritten wording for this application and does not delete source-resume text;
- the applicant does not need `Candidate Knowledge`, `Candidate Knowledge Integration`, `003.6`, or other internal terminology to decide.

Every Evidence Review candidate remains individually reviewable.

## Protected truth boundary

PR #104 changed applicant presentation/navigation only. The existing service still receives the same evidence candidate ID plus Accept/Skip action.

The following remain unchanged and protected:

- 003.6 remains the sole Candidate Knowledge integration/write authority;
- exact validated source content remains source-resume passthrough and cannot create Candidate Knowledge;
- generated/materially rewritten content remains Candidate-Knowledge-backed and provenance-linked;
- complete-resume composition/source-passthrough boundaries remain intact;
- deterministic validation remains authoritative;
- every populated Career Review section still requires explicit human review before export;
- provider credentials remain memory-only/private;
- the unresolved complete-source/no-core-tailoring-selection policy recorded from Issue #95 remains unchanged.

## Regression-first proof

Regression-only commit: `ac45aa3f520c5a0b3186aba3e97567f5927030e6`.

PR #104 final-head CI run `31141269245`:

- Unit: **PASS**
- Full integration: **PASS**
- Patch whitespace: **PASS**
- HTTP / representative PDF contract: **PASS**
- Real Chromium pre-fix RED proof: **PASS** — the regression fails on the Beta #4 base because the old applicant copy exposes `Candidate Knowledge Integration (003.6)` instead of an understandable decision.
- Real Chromium PR-head GREEN proof: **PASS**
- Every Evidence Review candidate reviewable: **PASS**
- Draft Step 3 → explicit Career Review Step 4 transition: **PASS**
- Earlier Understanding/Evidence state hidden after advancement: **PASS**
- Review threads: **PASS / none**
- Branch synchronization at merge gate: **PASS**

The browser regression also verifies the primary PDF/readable Career Review/export path still completes after the repaired decision and navigation states.

## CI integrity

The historical-red step in `.github/workflows/ci.yml` now runs only when the browser regression file changes in the pull request. This preserves real red/green proof for behavior-changing regressions while allowing later documentation/checkpoint PRs to validate the current baseline without an artificial expected-failure requirement.

## Explicit UNKNOWN / non-acceptance evidence

- Manual secret-gated real-provider smoke for PR #104: **UNKNOWN / non-blocking for this presentation-only change** because the provider execution path did not change.
- Fresh-user acceptance after the repair: **UNKNOWN** until the next Beta.
- Submission readiness, time saved, review burden, trust, and reuse intent after the repair: **UNKNOWN** until the next Beta reaches those stages credibly.

No engineering PASS may be substituted for those product judgments.

## Next action

1. Merge the durable engineering checkpoint containing this handoff and `docs/context/project-snapshot.md` / `docs/current-state.md`.
2. Only after that checkpoint is merged, open a **fresh Beta issue**.
3. Start that Beta from Landing/Input with a real resume and real job description.
4. At Evidence Review Candidate 1, verify the applicant can explain the Accept/Skip decision before choosing and can distinguish accuracy, relevance, and guaranteed inclusion.
5. Continue through every Evidence candidate, Draft/validation, Career Review, PDF/HTML/Markdown/JSON, final submission judgment, time/value, review burden, trust, and reuse intent.
6. Keep Beta #4 / Issue #100 as FAIL regardless of the next Beta result.
