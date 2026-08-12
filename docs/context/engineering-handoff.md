# Engineering Handoff

**Owner:** Engineering Room
**Checkpoint:** 2026-08-12 — Beta #7 layout recovery merged; fresh Beta #8 next

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, `docs/context/beta-handoff.md`, closed Beta #7 / Issue #121, open Issues #122 and #97, merged PR #123, and current GitHub state.

Repository evidence is authoritative over this handoff.

## Current state

- Beta #7 / Issue #121 is the latest completed product result: **FAIL**.
- Beta Accepted remains **NO**.
- Issue #122 is **OPEN**. Engineering recovery is merged, but its acceptance criteria require fresh applicant evidence.
- Issue #97 remains **OPEN** for the broader submission/readability/value gate.
- PR #123 merged to `chore/project-foundation` at `2fa1f084f8e06cc8f9ee095d406aa6c0033c95af`.
- After this durable checkpoint merges, create fresh Beta #8 with result **UNKNOWN**.

## Repository-state recovery on 2026-08-12

Because of the repository history rewrite, authoritative primary was discovered at rewritten Beta #5 checkpoint `45597862bb7fbdd05b563b53bd9db8617d21d39a` even though later rewritten Option 2 branches still existed.

Engineering compared primary to `docs/option2-tailoring-review-checkpoint` and verified that the latter was ahead with no divergence. Primary was fast-forwarded without force to rewritten Option 2 checkpoint `b40f8a624289c5986ae7f75f019153211faa65fa` before Beta #7 remediation.

Do not regress primary back behind that restored Option 2 state.

## Beta #7 product evidence

The user reached the final resume but would not submit it and reported no time savings. The decisive blocker was visual layout:

- dense Skills;
- Summary visually under Experience;
- compressed Education;
- collapsed field boundaries;
- Project dates after bullets;
- final PDF presentation below a professional resume bar.

Tailoring Review appearing to make mostly title-level changes is a secondary product-quality watch item, not the primary blocker addressed by PR #123.

## PR #123 implementation boundary

PR #123 changes applicant presentation/export only.

`src/applicant-resume.js` now builds one shared `resumePresentationModel` for browser/review HTML and PDF output:

- deterministic presentation section order;
- standalone Summary presentation;
- category/value Skills presentation;
- conventional structured entries for Experience, Projects, and Education;
- bounded standalone-date detection;
- dates associated with entry headings;
- Education field separation;
- restrained single-column typography and spacing;
- Career Review section presentation preserved.

The model reads final reviewed statements and rearranges only their visual presentation. It does not write source evidence, Candidate Knowledge, selections, validation state, or Human Review decisions.

## Regression-first proof

Regression-only commit: `211069fab6665b10d4e9563d5b17eca09961143d`.

Regression-only CI `31596052613`:

- new Beta #7 layout unit contract: **RED as expected** on the prior shipped renderer;
- prior browser flow remained green;
- a latent legacy `/api/start` test assumption about discovery rank was exposed separately.

The stale legacy test was narrowed to the actual legacy endpoint responsibility. Authoritative Option 2 HTTP contracts continue to prove complete source preservation and representative PDF export.

Final merge-candidate CI `31597221430`:

- Unit: **PASS**
- Full integration: **PASS**
- Patch whitespace: **PASS**
- HTTP / representative PDF contract: **PASS**
- Pre-fix Chromium RED proof: **PASS**
- Current Chromium GREEN proof: **PASS**
- Review threads: **none**
- Current-primary synchronization: **behind 0**

New layout regression coverage proves:

- Summary is independent;
- categorized Skills are grouped;
- Experience/Project/Education dates occupy entry metadata positions;
- Project date precedes the project bullet visually;
- Education content remains present after separation;
- embedded Summary promotion does not mutate original final-version statements;
- date-like achievement prose remains body text;
- PDF right-aligns entry dates and contains the same core entry hierarchy.

Real-provider smoke remains **UNKNOWN / non-blocking** because provider execution was not the changed boundary.

## Protected truth and authority boundary

Do not weaken:

- 003.6 as sole Candidate Knowledge integration/write authority;
- source-resume passthrough authority and provenance;
- distinction between source truth and AI interpretation;
- generated/materially rewritten claim backing and provenance;
- complete-resume composition / Issue #83 guarantees;
- Resume Content Selection, claim scope, coverage, completeness, duplication, and deterministic validation authority;
- Career Review / Human Review as final human authority;
- manual-edit non-learning boundary;
- provider credential privacy;
- unresolved complete-source/no-core-tailoring-selection policy from Issue #95.

## Issue handling

- #121: closed as historical Beta #7 FAIL.
- #122: keep OPEN through Beta #8 because engineering proof alone cannot satisfy the submission-readiness/time-saving acceptance criteria.
- #97: keep OPEN unless Beta #8 establishes its broader applicant acceptance criteria.

## Next action

1. Merge this durable checkpoint.
2. Create fresh Beta #8 with initial result **UNKNOWN**.
3. Beta #8 starts from Landing/Input; user personally operates shipped localhost UI.
4. Primary retest is #122 final-PDF quality: Summary, Skills, Experience, Projects, Education, spacing, hierarchy, boundaries, and date placement.
5. Compare review-surface readability with final PDF; PDF must not regress below review quality.
6. Continue through real submission decision, time saved, practical value, trust, burden, and reuse intent.
7. Watch whether Tailoring Review provides meaningful tailoring beyond title-level changes, but do not let this secondary item obscure the #122 acceptance gate.
