# Beta Handoff

**Owner:** Beta Room
**Checkpoint:** 2026-08-07 — Option 2 engineering-ready; fresh Beta #7 next

## Start

Read `PROJECT_CONTEXT.md`, `docs/context/project-snapshot.md`, this file, Beta #6 / Issue #113, open Issue #97, closed Product Issue #115, merged PR #118, and current shipped GitHub state.

Act only as a neutral first-time applicant and Beta Product Tester during a Beta. Do not discuss code, architecture, schemas, prompts, APIs, provider internals, implementation solutions, or engineering test design.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Beta #3 / Issue #93: **FAIL**.
- Beta #4 / Issue #100: **FAIL**.
- Beta #5 / Issue #106: **FAIL**.
- Beta #6 / Issue #113: **FAIL at the old Evidence Review Candidate 1**.
- Beta Accepted: **NO**.

## Beta #6 historical result

The applicant interpreted the old Evidence Review as Accept = reword for the job, Skip = keep original, while expecting both choices to remain on the resume. That did not match the shipped model, so Beta #6 failed. Supplemental later-stage exploration also rejected the final resume/system for real use.

Do not reinterpret or continue Beta #6 after engineering changes.

## Product model changed after Beta #6

Product Issue #115 is now closed after Option 2 was explicitly approved and implemented in PR #118, merged at `49b8ae0ac705d7d3bd22c19857aabaaa0c3ae9c5`.

The next fresh Beta will no longer test the old abstract Accept/Skip Evidence Review. The applicant-visible stage is now **Tailoring Review**:

- show the applicant's original wording;
- show the proposed tailored wording;
- ask **Use tailored version**, **Keep original wording**, or **Needs correction**;
- do not require a decision when there is no material wording change.

The uploaded resume should feel like source material the applicant already supplied, not something they must repeatedly prove.

## Correction experience that must be tested

At least once in Beta #7, use **Needs correction** on a materially changed proposal and provide realistic missing/incorrect context.

Expected applicant-visible behavior:

1. the product accepts the explanation;
2. it does not silently proceed to Career Review;
3. it regenerates the tailoring proposal;
4. the applicant returns to Tailoring Review and sees a new before/after proposal;
5. the applicant makes a new concrete wording decision;
6. only then does the workflow proceed to Draft and Career Review.

Judge this only as a user experience. Do not inspect or discuss internal engineering boundaries in the Beta Room.

## Engineering readiness evidence

Engineering regression-first RED CI: `31155025138`.

Final merge-candidate CI: `31157897591`, with unit, full integration, whitespace, HTTP/representative-PDF, pre-fix browser RED proof, and current browser GREEN all PASS. Review threads were empty and the branch was synchronized with primary at merge.

This is engineering evidence only. It does not establish product acceptance.

PR #116's presentation/export repairs also remain shipped: contact glyph cleanup, safer Experience dedupe, separated Skills, applicant-readable processing summary, Career Review rationale, clearer report explanation, stronger PDF hierarchy, and Career Review correction/edit propagation.

## Fresh Beta #7 requirements

After this checkpoint is merged and the Beta #7 issue is created, begin from Landing/Input with a real resume and real job description. Treat the applicant as completely fresh to the new model.

Do not coach the applicant on what Tailoring Review is supposed to mean before observing their interpretation.

Test, in order:

- Landing/Input;
- Processing summary / understanding stage;
- every materially changed Tailoring Review proposal;
- at least one Needs correction → regenerated Tailoring Review loop;
- Draft and validation;
- Career Review, including whether section rationale and correction remain understandable;
- `final-resume.pdf` as the primary submission artifact;
- `career-review-report.html`;
- `final-resume.md` and `final-resume.json` as secondary artifacts;
- final real-submission decision;
- time saved / practical value;
- trust and review burden;
- whether the applicant would use the product again.

Beta Accepted requires fresh applicant evidence. Green engineering checks are not sufficient.

## Room state

Beta #6 is complete and closed. Beta Accepted is **NO**. Once this engineering-readiness checkpoint merges, a fresh Beta #7 may be created with initial result **UNKNOWN**. Do not reuse Beta #6 judgments as Beta #7 evidence.
