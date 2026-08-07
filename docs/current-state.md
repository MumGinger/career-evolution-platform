# Current State

**Phase:** Version 1 product-quality recovery after Beta #5 FAIL
**Last updated:** 2026-08-06
**Beta Accepted:** **NO / NOT YET**

Repository evidence and the context handoffs are authoritative if this summary becomes stale.

## Latest durable state — Beta #5

Beta #5 / Issue #106 is the latest authoritative product result: **FAIL at Evidence Review Candidate 1**.

The run was fresh from Landing/Input with a real resume and real job description after the Beta #4 engineering recovery in PR #104 and its durable checkpoint PR #105. The applicant still understood Accept/Skip as deciding whether the reviewed material should be included in the tailored resume.

Direct user evidence:

> “ask me to whether put this on my resume”

> “skip means doesn't put on my resume for this job?”

> “i upload my resume and these are all true i don't need to verify again right … so what i think is that this is whether i want to put it on my resume”

Because the applicant could not make the first Evidence Review decision with the product's intended consequence in mind, continuing would have required guessing. Beta #5 therefore stopped credibly at Candidate 1. Later-stage observations are supplemental only.

Issue #106 is closed with the Beta result recorded. **Beta Accepted remains NO.**

## Current product blockers and findings

- **Issue #107 — OPEN / decisive blocker:** Evidence Review still reads as a resume-inclusion decision. The applicant did not understand Accept/Skip as an evidence-support permission despite the applicant-facing copy shipped in PR #104.
- **Issue #97 — OPEN / applicant-readable review objective:** Beta #5 supplemental evidence shows Draft/validation remains hard to read because of duplicated paragraph/bullet content, stray bullet markers, compressed headings/dates, and repeated project/experience wording.
- **Issue #108 — OPEN / supplemental blocker:** Career Review asks the applicant to approve correctness without a discoverable correction path. The applicant believed every section had to be approved before PDF export and did not know what to do when content was wrong.

Earlier Beta #5 observations remain relevant:

- Landing/Input was generally clear, but **Base URL** was not understandable to the applicant.
- **Understanding and exclusions** still lacked a clear applicant purpose. The applicant did not understand what was being extracted or what “safe to use” / “safely align” meant and chose to move on.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL** — generated artifact was not a complete resume.
- Issue #83 / PR #87: complete-resume composition engineering repair completed.
- Beta #3 / Issue #93: **FAIL** — resume became recognizable and complete, but review/output quality remained too technical and not submission-ready.
- Issues #95 and #97 / PR #99: applicant-readable review/export, PDF output, and independent proof tiers merged.
- Beta #4 / Issue #100: **FAIL** at Evidence Review Candidate 1.
- Issues #101–#103 / PR #104: engineering recovery completed after regression-first and real-browser proof.
- PR #105: durable checkpoint of the Beta #4 engineering recovery, merged at `40ad92315105b04bc1911f23c8f9daaeb77971f3`.
- Beta #5 / Issue #106: **FAIL** at Evidence Review Candidate 1 after the repaired copy still produced the wrong applicant interpretation.

Closed engineering issues #101–#103 remain valid engineering results, but they do not establish product acceptance.

## Engineering baseline

PR #104 merged at `3ee73fa1c03b9ec59e21397af6dff06acf2e5ca5` with final-head CI run `31141269245` green for:

- unit tests;
- full integration tests;
- patch whitespace;
- HTTP / representative PDF contract;
- real Chromium pre-fix RED proof;
- real Chromium current GREEN proof;
- every Evidence candidate reviewable;
- Draft → Career Review navigation;
- earlier-stage cleanup after advancement.

The merged engineering behavior remains implemented. Beta #5 demonstrates that product comprehension still fails despite that proof.

Manual secret-gated real-provider smoke for PR #104 remains **UNKNOWN / non-blocking for that presentation-only change**.

## Protected truth and authority boundaries

No Beta #5 finding changes the platform's truth, provenance, validation, composition, review, export, or privacy authority model.

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

## Applicant-facing workflow baseline

The local Beta path remains available through `node src/beta-ui.js`. It is a temporary local testing wrapper around the existing resume/evidence/tailoring/validation/review/export capabilities, not production frontend architecture.

The intended visible path remains:

1. Landing / Input and provider readiness.
2. Understanding and exclusions.
3. Evidence Review for every candidate.
4. Draft and applicant-readable validation.
5. Explicit continuation to Career Review; every populated section must be reviewed.
6. Export, with `final-resume.pdf` as the primary applicant-facing artifact plus Career Review HTML, Markdown, and structured JSON.

Technical completion of this path does not equal Beta acceptance.

## Beta #5 acceptance status

Because the credible run stopped at Evidence Review Candidate 1, the following remain **UNKNOWN / not credibly reached**:

- later Evidence Review candidates and full review burden;
- Draft progression and validation as a clean first-time-user stage;
- every Career Review section as a clean first-time-user stage;
- `final-resume.pdf` submission readiness;
- `career-review-report.html` usefulness;
- `final-resume.md` equivalence;
- `final-resume.json` equivalence;
- final submission decision;
- time saved versus manual tailoring;
- practical value;
- end-to-end trust and transparency;
- whether the applicant would use the product again.

No prior work was reported lost.

## Existing platform capability baseline

The implemented Version 1 foundation remains available, including:

- immutable source-resume versions and Resume AST / semantic evidence boundaries;
- semantic graph and bounded Evidence Discovery working evidence;
- deterministic Job Intelligence, Information Need, Acquisition Planning/Execution, and 003.6 Candidate Knowledge Integration;
- immutable Resume Tailoring Plan, Resume Artifact, Presentation Strategy, and Resume Validation runs;
- Evidence Review and complete Career Review / Human Review gates;
- source-resume passthrough plus Candidate-Knowledge-generated composition;
- Career Conversation, Career Understanding, Shared Understanding, Career Curiosity, and Decision Companion thinking-layer records that do not silently write Candidate Knowledge;
- integrated applicant-facing Markdown/JSON/HTML/PDF output paths and the local Beta UI.

Detailed capability definitions remain in architecture, vision, issue, PR, and context records.

## Current focus

The next blocking product finding is **Issue #107**. Issue #97 and Issue #108 remain active supporting findings on applicant-readable Draft quality and Career Review correction behavior.

Do not create another Beta merely because engineering checks are green. Resolve and durably checkpoint the active product findings first. The next Beta must then begin fresh from Landing/Input with a real resume and real job description; do not continue Beta #5.

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
