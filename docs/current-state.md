# Current State

**Phase:** Version 1 fresh-Beta readiness after Beta #4 engineering recovery  
**Last updated:** 2026-08-06  
**Beta Accepted:** **NO / NOT YET**

Repository evidence and the context handoffs are authoritative if this summary becomes stale.

## Latest durable state — Beta #4 engineering recovery

Beta #4 / Issue #100 remains the authoritative product result: **FAIL**. The run stopped credibly at the first Evidence Review candidate because the applicant could not determine whether Accept/Skip meant truth verification, job relevance, or resume inclusion. That historical result must not be converted into PASS after engineering repair.

PR #104, **Clarify Evidence Review decisions and Beta progression**, merged to `chore/project-foundation` at `3ee73fa1c03b9ec59e21397af6dff06acf2e5ca5`.

The merged engineering recovery resolves the three Beta #4 follow-up issues:

- Issue #101 — **CLOSED / engineering PASS**. Evidence Review now states, before the choice, that the applicant is deciding whether an item is accurate evidence about them and may support tailored wording for this application. Accept may support later wording but does not guarantee inclusion or rewrite unrelated content. Skip prevents the item from supporting new/rewritten wording and does not delete source-resume text. Job relevance remains separately explained by `Why it may help`; internal Candidate Knowledge / 003.6 terminology is not required to decide.
- Issue #102 — **CLOSED / engineering PASS**. Draft remains Step 3 of 5 until the applicant uses a visible **Continue to Career Review** action; Career Review then becomes Step 4.
- Issue #103 — **CLOSED / engineering PASS** after direct browser verification. Earlier Understanding/Evidence panels are hidden after advancing to Draft so stale stages are no longer emphasized.

Every Evidence Review candidate remains individually reviewable.

## Regression and proof status

Regression-only commit: `ac45aa3f520c5a0b3186aba3e97567f5927030e6`.

PR #104 final-head CI run `31141269245`:

- Unit: **PASS**
- Full integration: **PASS**
- Patch whitespace: **PASS**
- HTTP / representative PDF contract: **PASS**
- Real Chromium pre-fix RED proof: **PASS**
- Real Chromium current GREEN proof: **PASS**
- Every Evidence candidate reviewable: **PASS**
- Draft → Career Review navigation: **PASS**
- Earlier-stage cleanup after advancement: **PASS**
- Review threads: **none**
- Branch synchronization at merge gate: **PASS**

The pre-fix Chromium run fails specifically because the Beta #4 baseline exposes `Candidate Knowledge Integration (003.6)` instead of an applicant-readable decision. The merged state passes the ordinary-language decision and consequence assertions, negative internal-terminology coverage, all-candidate review path, Draft/Career Review transition, Career Review, and final export flow.

The CI historical-red step now runs only when a pull request actually changes the applicant browser regression. This keeps regression-first proof meaningful without causing later documentation-only checkpoint PRs to fail after the repaired behavior becomes the new baseline.

Manual secret-gated real-provider smoke for PR #104 is **UNKNOWN / non-blocking for this presentation-only change**; the provider execution path did not change.

## Protected truth and authority boundaries

The Beta #4 engineering recovery is applicant presentation/navigation only. It does not create a new knowledge, provenance, validation, composition, review, export, or privacy path.

The following remain authoritative:

- 003.6 is the sole Candidate Knowledge integration/write path.
- Accepted working evidence does not become committed Candidate Knowledge except through the existing 003.6 boundary.
- Skipped evidence creates no Candidate Knowledge fact.
- Exact validated source-resume content may survive as `source_resume_passthrough`; source passthrough remains source-linked and cannot create Candidate Knowledge.
- Generated or materially rewritten content remains Candidate-Knowledge-backed and provenance-linked.
- The complete-resume composition boundary from Issue #83 / PR #87 remains intact.
- Resume Content Selection, provenance inheritance, claim scope, duplication, coverage, completeness, and deterministic validation rules remain unchanged.
- Every populated Career Review section requires explicit human review before export.
- Human review decisions do not silently rewrite Candidate Knowledge.
- Provider credentials stay memory-only/private and are not written into local session data or generated artifacts.
- The unresolved complete-source/no-core-tailoring-selection policy recorded from Issue #95 remains unchanged; do not relax `qualityReady()` or invent source-only fallback without a Product decision and regressions.

## Applicant-facing Version 1 workflow

The local Beta path is available through `node src/beta-ui.js`. It remains a temporary local testing wrapper around the existing LLM-first resume/evidence/tailoring/validation/review/export capabilities, not production frontend architecture.

The visible path is:

1. Landing / Input and provider readiness.
2. Understanding and exclusions.
3. Evidence Review with an explicit applicant-readable decision for every candidate.
4. Draft and applicant-readable validation.
5. Explicit continuation to Career Review; every populated section must be reviewed.
6. Export, with `final-resume.pdf` as the primary applicant-facing artifact plus readable Career Review HTML, Markdown, and structured JSON.

Passing this workflow technically does not equal Beta acceptance.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL** — the generated artifact was not a complete resume.
- Issue #83 / PR #87: complete-resume composition engineering repair completed.
- Beta #3 / Issue #93: **FAIL** — the resume became recognizable and complete, but applicant review/output quality remained too technical and not submission-ready.
- Issues #95 and #97 / PR #99: applicant-readable review/export, PDF output, and independent proof tiers merged.
- Beta #4 / Issue #100: **FAIL** — Evidence Review decision meaning was not understandable; supplemental findings #102 and #103 were recorded.
- Issues #101–#103 / PR #104: engineering recovery completed after regression-first and real-browser proof.

Beta #4 later-stage judgments — complete Evidence Review burden, Draft/validation quality, Career Review quality, all final artifacts, real submission readiness, time saved, trust, and reuse intent — remain **UNKNOWN** because the run failed before those stages were credibly reached.

## Existing platform capability baseline

The project already contains the implemented Version 1 career/resume foundation documented in architecture and context records, including:

- immutable source-resume versions and Resume AST / semantic evidence boundaries;
- semantic graph and bounded Evidence Discovery working evidence;
- deterministic Job Intelligence, Information Need, Acquisition Planning/Execution, and 003.6 Candidate Knowledge Integration;
- immutable Resume Tailoring Plan, Resume Artifact, Presentation Strategy, and Resume Validation runs;
- Evidence Review and complete Career Review / Human Review gates;
- source-resume passthrough plus Candidate-Knowledge-generated composition;
- Career Conversation, Career Understanding, Shared Understanding, Career Curiosity, and Decision Companion thinking-layer records that do not silently write Candidate Knowledge;
- integrated applicant-facing Markdown/JSON/HTML/PDF output paths and the local Beta UI.

Detailed capability definitions remain in the architecture, vision, issue, PR, and context records; this file records current project state rather than replacing those specifications.

## Current focus

The engineering blocker recovery is complete. The next gate is **fresh product acceptance**, not additional routine implementation.

After the durable engineering checkpoint is merged, create a new Beta issue and start from Landing/Input with a real resume and real job description. It must be a fresh run, not a continuation of Beta #4.

At the first Evidence Review candidate, verify that the applicant can explain before choosing:

- what the decision is asking;
- what Accept permits and does not guarantee;
- what Skip does and does not remove;
- why job relevance is separate from the accuracy/support decision.

If that is clear, continue through every Evidence candidate, Draft/validation, Career Review, `final-resume.pdf`, `career-review-report.html`, `final-resume.md`, `final-resume.json`, final submission decision, time/value decision, review burden, trust, and whether the applicant would use the product again.

## Next decision

No new architecture or product-direction choice is required from Issues #101–#103. The next decision is the applicant’s fresh product judgment: is the repaired Version 1 workflow understandable and valuable enough that they would seriously consider submitting the final PDF and using the product again?

Engineering evidence must not answer that question on the applicant’s behalf.

## Open questions

- What evidence sources are useful, consented, and ethically appropriate beyond local user-entered data?
- What makes available evidence sufficient for each bounded artifact or decision?
- Which recovery actions should be available before a user request, and how should their privacy cost be compared?
- What confirmation and conflict threshold must Candidate Knowledge Integration meet before it accepts a fact?
- What review authority and corroboration threshold are required before outcome evidence changes a priority or skill?
- What is the smallest applicant-readable review and export experience that preserves truth boundaries without exposing implementation detail?
- Product policy remains unresolved for a complete source-preserved resume with no included Experience or Projects tailoring selection; do not change this without Product direction.

## Test tiers

The repository exposes independent proof tiers:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:http-contract`
- `npm run test:browser-e2e`
- `npm run test:provider-smoke`
- `npm run test:all`

Mock-provider contract evidence, real-browser evidence, real-provider smoke, and real-user Beta acceptance must remain distinct. A green CI total is never sufficient to mark Beta Accepted.
