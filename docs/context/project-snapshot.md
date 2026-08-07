# Project Snapshot

**As of:** 2026-08-06 — after Beta #4 engineering recovery
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`

## State

- The representative evidence-to-export engineering flow remains **Implemented and Integrated** for its specified behavior.
- **Beta #1 / Issue #73:** FAIL.
- **Beta #2 / Issue #82:** FAIL.
- **Issue #83 / PR #87:** complete-resume composition engineering complete.
- **Beta #3 / Issue #93:** FAIL.
- **Issues #95 and #97 / PR #99:** applicant-readable review/export and proof-tier engineering merged.
- **Beta #4 / Issue #100:** **FAIL** at the first Evidence Review candidate. This historical result is unchanged.
- **Issues #101, #102, #103 / PR #104:** engineering recovery merged at `3ee73fa1c03b9ec59e21397af6dff06acf2e5ca5`; all three issues are closed after direct regression/browser proof.
- **Beta Accepted:** **NO**.

The next product gate must be a fresh Beta from Landing/Input. It must not continue Beta #4 or reinterpret the Beta #4 FAIL.

## What PR #104 changed

Evidence Review now presents an ordinary-language applicant decision before every Accept/Skip choice:

- Decide whether the item is **accurate evidence about you and may be used to support tailored wording for this application**.
- `Why it may help` explains job relevance separately from the decision itself.
- **Accept** may support new/tailored wording after later checks, but does not guarantee that the item will appear in the resume and does not automatically rewrite unrelated content.
- **Skip** prevents the item from supporting new/rewritten wording for this application and does not delete source-resume text.
- The applicant no longer needs internal `Candidate Knowledge Integration` / `003.6` terminology to make the decision.
- Every Evidence Review candidate remains individually reviewable.

The same small presentation/navigation change also resolves the two supplemental Beta #4 findings:

- Draft **Step 3 of 5** now exposes a visible **Continue to Career Review** action and advances to Step 4 only after the applicant clicks it.
- Earlier **Understanding and exclusions / Evidence Review** panels are hidden after the applicant reaches Draft, so stale workflow stages are no longer emphasized.

## Protected capability boundary

The Beta #4 engineering recovery does **not** change the truth or authority model:

- 003.6 remains the sole Candidate Knowledge integration/write authority.
- Exact source content remains source-resume passthrough, source-linked, and unable to create Candidate Knowledge.
- Generated or materially rewritten claims remain Candidate-Knowledge-backed with existing provenance and validation requirements.
- Complete-resume composition and source-passthrough guarantees from Issue #83 / PR #87 remain intact.
- Deterministic validation remains authoritative.
- Every populated Career Review section still requires explicit human review before export.
- `final-resume.pdf` remains the intended primary applicant-facing output; readable Career Review HTML, Markdown, and structured JSON remain available.
- Provider keys remain memory-only/private.
- The unresolved complete-source/no-core-tailoring-selection policy recorded from Issue #95 remains unchanged.

## Engineering proof

Regression-only commit: `ac45aa3f520c5a0b3186aba3e97567f5927030e6`.

PR #104 final-head CI run `31141269245`:

- unit tests: **PASS**;
- full integration tests: **PASS**;
- patch whitespace: **PASS**;
- HTTP and representative-PDF contract: **PASS**;
- pre-fix Chromium RED proof: **PASS**;
- PR-head Chromium GREEN proof: **PASS**;
- all Evidence candidates remain reviewable: **PASS**;
- explicit Draft → Career Review progression: **PASS**;
- stale earlier-stage panels hidden after advancement: **PASS**;
- review threads: **none**;
- primary branch synchronization at merge gate: **PASS**.

The pre-fix browser run fails exactly on the old applicant-visible `Candidate Knowledge Integration (003.6)` explanation. The current browser run passes the ordinary-language decision, negative internal-terminology assertions, all-candidate review, Draft/Career Review transition, Career Review, and export path.

The CI historical-red step is now scoped to PRs that actually change the browser regression, so future documentation-only checkpoints can validate the fixed baseline without a false expected-failure requirement.

## Product evidence that remains unresolved

Engineering recovery does not establish product acceptance. After the repair, these are still **UNKNOWN** until a new real-user Beta reaches them credibly:

- whether the applicant understands the repaired Evidence Review decision without prompting;
- whether the full Evidence Review burden is reasonable;
- whether Draft/validation and Career Review are understandable end to end;
- whether the applicant would submit `final-resume.pdf`;
- whether the final resume is complete and polished enough for a real application;
- whether warnings and `Where this came from` increase trust without excess burden;
- whether meaningful time is saved;
- whether the applicant would use the product again.

The manual secret-gated real-provider smoke for PR #104 is **UNKNOWN / non-blocking for this presentation-only change** because provider execution behavior was not modified.

## Next cross-room action

1. Complete and merge the durable engineering checkpoint PR containing this snapshot, `docs/context/engineering-handoff.md`, and the durable current-state update.
2. Only after that checkpoint is merged, create a **fresh Beta issue**.
3. Run the next Beta from Landing/Input with a real resume and real job description, one visible stage at a time.
4. At the first Evidence Review candidate, require the applicant to explain what Accept and Skip mean before choosing and determine whether accuracy, relevance, and guaranteed inclusion are now distinguishable.
5. Continue through every later stage and final artifact before recording submission, time/value, burden, trust, and reuse judgments.

Current GitHub and Layer 1 records override this snapshot.
