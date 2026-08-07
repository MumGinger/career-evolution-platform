# Engineering Handoff

**Owner:** Engineering Room
**Checkpoint:** 2026-08-07 — Beta #6 presentation recovery / Product decision required

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, `docs/context/beta-handoff.md`, Beta #6 / Issue #113, open Issues #97 and #115, merged PR #116, and current GitHub state.

Repository evidence is authoritative over this handoff.

## Current state

- Beta #6 / Issue #113 remains the authoritative latest product result: **FAIL at Evidence Review Candidate 1**.
- Beta Accepted remains **NO**.
- PR #116 merged to `chore/project-foundation` at `b0efc92aa390799627e35e9c9d163dab1d6f88d6` and resolves the independent Beta #6 presentation/export engineering defects.
- Issue #97 remains **OPEN** because applicant-readable resume/submission/value acceptance requires a future fresh Beta.
- Issue #115 is **OPEN / Product decision required**. It records that Evidence Review meaning has failed fresh Betas #4, #5, and #6 despite prior engineering repairs in PR #104 and PR #111.
- Do not open the next Beta until #115 is decided, the resulting behavior is implemented regression-first, and that implementation is durably checkpointed.

## Why engineering stopped patching Evidence Review copy

`ENGINEERING_LEAD.md` requires engineering to stop when the same implementation problem repeats and determine whether the underlying product/architecture/state model is wrong.

The applicant's Evidence Review interpretation has failed three times:

- Beta #4: truth verification vs job relevance vs resume inclusion was unclear.
- Beta #5: Accept/Skip was read as include/exclude from the tailored resume.
- Beta #6: Accept was read as reword-for-JD and Skip as keep-original wording, with both expected to remain in the resume.

Another wording-only repair would violate the repeated-failure rule. Issue #115 therefore requires Product to decide the applicant-visible role/timing of this decision before engineering continues that surface.

Until then, the current semantics remain unchanged and no engineering PASS should be claimed for Evidence Review comprehension.

## PR #116 applicant-visible recovery

Presentation/export changes only:

- private-use PDF/icon glyphs are removed from applicant-visible text without changing stored source authority;
- exact bullet prose embedded as a separate line inside a multiline heading is removed from that heading when the actual following bullet already carries it;
- distinct title/company/date/location metadata remains preserved;
- plain Skills lists are presented as separated resume items;
- Understanding/exclusions is reframed as **Processing summary — no decision needed**, with applicant-readable counts and no raw source-alignment/parent-reference messages;
- Career Review visibly surfaces applicant-readable presentation rationale alongside source/origin explanation;
- Career Review report explains the final application artifact and that it is not a deletion log; the uploaded source resume remains unchanged;
- final PDF hierarchy/spacing/header/Skills treatment is strengthened;
- the working Career Review correction/edit path is preserved.

## Protected truth and authority boundary

PR #116 does **not** alter:

- 003.6 as the sole Candidate Knowledge integration/write authority;
- Candidate Knowledge acceptance/conflict rules;
- source-resume passthrough authority;
- complete-resume composition or Resume Content Selection authority;
- provenance inheritance;
- claim-scope, coverage, completeness, duplication, or deterministic validation rules;
- provider execution or credential privacy;
- Career Review / Human Review as the final human authority before export;
- the unresolved complete-source/no-core-tailoring-selection policy from Issue #95;
- Evidence Review decision semantics pending #115.

Applicant cleanup is a presentation/export boundary only. Stored source evidence is not rewritten by the cleanup.

## Regression-first proof

Regression-only commit sequence culminated at head `d2b9a63047b1c559f5e2e90eebb731a791d33f72` before production implementation.

Regression-only CI run `31150317802`:

- Beta #6 unit presentation counterexamples: **RED as expected**;
- real browser current-head flow: **RED as expected**;
- unrelated HTTP / representative PDF contract: **PASS**.

Final merge-candidate CI run `31150697393`:

- Unit: **PASS**
- Full integration: **PASS**
- Patch whitespace: **PASS**
- HTTP / representative PDF contract: **PASS**
- Pre-fix Chromium RED proof: **PASS**
- Current Chromium GREEN proof: **PASS**
- Review threads: **PASS / none**
- Current-primary synchronization: **PASS**

The final browser flow covers the applicant processing summary, Evidence Review baseline behavior, separated Skills in Draft, Career Review rationale/correction path, final PDF, readable report, Markdown, and JSON.

Real-provider smoke remains **UNKNOWN / non-blocking** because provider execution did not change.

## Explicit product UNKNOWN / FAIL state

Engineering proof does not establish:

- Evidence Review product comprehension after a future product-model change;
- fresh-user understanding of meaningful tailoring/selection consequences;
- submission readiness of the repaired final PDF for the real applicant;
- end-to-end review burden, trust, time saved, practical value, or reuse intent.

Beta #6 already recorded submission readiness, practical value, and reuse intent as FAIL for that shipped version. Those historical judgments remain unchanged.

## Next action

1. Merge the durable Beta #6 engineering recovery checkpoint.
2. Product resolves Issue #115.
3. Engineering implements the chosen model regression-first without weakening Candidate Knowledge, 003.6, provenance, composition, validation, privacy, or human-authority boundaries.
4. Run all independent proof tiers and review the shipped browser path.
5. Durably checkpoint the resulting engineering state.
6. Only then create a fresh Beta #7 from Landing/Input. Do not continue Beta #6.
