# Current State

**Phase:** Version 1 fresh-Beta readiness after Beta #5 engineering recovery
**Last updated:** 2026-08-06
**Beta Accepted:** **NO / NOT YET**

Repository evidence and context handoffs are authoritative if this summary becomes stale.

## Latest durable state

Beta #5 / Issue #106 remains the latest authoritative product result: **FAIL at Evidence Review Candidate 1**. The applicant interpreted Accept/Skip as a final-resume inclusion decision and could not continue credibly with the intended meaning.

PR #111, **Clarify evidence reuse and add Career Review correction**, merged at `f06ce4633799e1e938d267a29b1aba9cf9851281`.

Engineering follow-up status:

- Issue #107 — **CLOSED / engineering PASS**. Evidence Review now distinguishes uploaded source evidence, possible reuse for new/rewritten tailored wording, and job relevance. Accept permits reuse but does not guarantee final inclusion; Skip blocks reuse but does not delete source text.
- Issue #108 — **CLOSED / engineering PASS**. Career Review now exposes an applicant correction/edit path instead of requiring approval of incorrect content to reach export.
- Issue #97 — **OPEN**. Beta #5 Draft/presentation regressions have targeted engineering coverage, but full resume readability, PDF submission quality, review burden, trust, time saved, and reuse intent still require a fresh real-user Beta.

Beta #5 remains FAIL. Beta Accepted remains NO.

## Applicant-facing workflow after PR #111

The local Beta path remains available through `node src/beta-ui.js`.

1. Landing / Input and provider readiness.
2. Understanding and exclusions.
3. Evidence Review for every candidate, separating source evidence, possible evidence reuse, and relevance.
4. Draft and applicant-readable deterministic validation.
5. Career Review with an explicit approve-or-edit decision for every populated section.
6. Export, with `final-resume.pdf` as the primary applicant-facing artifact plus Career Review HTML, Markdown, and structured JSON.

Technical completion of this path does not equal Beta acceptance.

## Presentation behavior

Applicant presentation cleanup may:

- remove visible mojibake and unexplained bullet glyphs;
- collapse adjacent duplicate display forms of the same statement;
- remove a repeated heading prefix from its immediately following bullet;
- demote date-only heading styling where appropriate.

It must preserve:

- identical legitimate source wording under different jobs/headings;
- negative values such as `-5%`;
- stored source authority and provenance;
- Candidate Knowledge and deterministic validation evidence.

## Career Review correction authority

Career Review now exposes two explicit choices per section:

- approve as correct; or
- edit before export.

An applicant edit uses the existing Human Review authority. The original AI version is retained separately. Manual edits affect the approved artifact/export and do not silently become Candidate Knowledge.

## Engineering proof

PR #111 final merge-candidate CI run `31146301364` passed:

- unit tests;
- full integration tests;
- patch whitespace;
- HTTP / representative PDF contract;
- pre-change real-browser RED proof;
- current real-browser GREEN proof;
- all-candidate Evidence Review path;
- Career Review correction path;
- applicant edit propagation through PDF/HTML/Markdown/JSON;
- source-completeness and presentation counterexamples.

No review threads remained at merge. The merge-ref CI combined the implementation with current primary Beta #5 checkpoint `07420fe2216c25bbfbb369c14e8a640978f342aa`.

Manual secret-gated real-provider smoke for PR #111 is **UNKNOWN / non-blocking** because provider execution did not change.

## Protected truth and authority boundaries

The following remain authoritative:

- 003.6 is the sole Candidate Knowledge integration/write path.
- Accepted working evidence does not become Candidate Knowledge outside 003.6.
- Skipped evidence creates no Candidate Knowledge fact.
- Exact validated source-resume content may survive as source-resume passthrough and cannot create Candidate Knowledge.
- Generated/materially rewritten claims remain Candidate-Knowledge-backed and provenance-linked.
- The Issue #83 complete-resume composition boundary remains intact.
- Resume Content Selection, provenance inheritance, claim scope, coverage, completeness, duplication, and deterministic validation rules remain unchanged.
- Career Review remains the explicit human authority before export.
- Human edits do not silently rewrite Candidate Knowledge.
- Provider credentials remain memory-only/private.
- The unresolved complete-source/no-core-tailoring-selection policy from Issue #95 remains unchanged; do not relax `qualityReady()` without Product direction and regressions.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Beta #3 / Issue #93: **FAIL**.
- Beta #4 / Issue #100: **FAIL**.
- Beta #5 / Issue #106: **FAIL** at Evidence Review Candidate 1.

Closed engineering issues and green CI do not alter those product results.

## Fresh Beta acceptance still required

The next Beta must begin again from Landing/Input with a real resume and real job description. It must not continue Beta #5.

The fresh run must determine:

- whether Evidence Review Candidate 1 is understood before the applicant chooses;
- whether the applicant distinguishes evidence reuse from truth verification, relevance, and guaranteed final inclusion;
- whether every Evidence candidate is reasonably reviewable;
- whether Draft presentation is readable and materially free of repetition/artifacts;
- whether Career Review correction is discoverable without coaching;
- whether all four final artifacts represent the approved resume;
- whether the applicant would submit the PDF;
- whether the workflow saves meaningful time with reasonable review burden;
- whether trust is maintained or increased;
- whether the applicant would use the product again.

## Current focus

The routine engineering recovery for Issues #107 and #108 is complete. The next gate is a durable engineering checkpoint followed by **fresh Beta #6 product acceptance**.

Issue #97 remains open until its fresh-user acceptance criterion is satisfied.

Earlier Beta #5 observations about Base URL clarity and the purpose of Understanding/exclusions remain product observations to watch in the fresh run; they were not the decisive Beta #5 blocker and do not change current engineering authority boundaries.

## Test tiers

The repository exposes independent proof tiers:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:http-contract`
- `npm run test:browser-e2e`
- `npm run test:provider-smoke`
- `npm run test:all`

Mock-provider proof, browser proof, provider smoke, and real-user Beta acceptance remain distinct. A green CI total is never sufficient to mark Beta Accepted.
