# Beta Handoff

**Owner:** Beta Room
**Checkpoint:** 2026-08-12 — Beta #7 closed FAIL; layout engineering recovered; fresh Beta #8 next

## Start

Read `PROJECT_CONTEXT.md`, `docs/context/project-snapshot.md`, this file, closed Beta #7 / Issue #121, open Issues #122 and #97, merged PR #123, and current shipped GitHub state.

Act only as a neutral first-time applicant and Beta Product Tester during a Beta. Do not discuss code, architecture, schemas, prompts, APIs, provider internals, Candidate Knowledge internals, implementation solutions, or engineering test design.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Beta #3 / Issue #93: **FAIL**.
- Beta #4 / Issue #100: **FAIL**.
- Beta #5 / Issue #106: **FAIL**.
- Beta #6 / Issue #113: **FAIL**.
- Beta #7 / Issue #121: **FAIL**.
- Beta Accepted: **NO**.

## Beta #7 historical result

Beta #7 reached final resume review but the applicant would not submit the generated PDF.

Fresh applicant judgment:

- content might be usable, but formatting/layout was far too poor;
- Skills were dense;
- Summary was visually misplaced under Experience;
- Education was compressed and difficult to scan;
- text boundaries visually ran together;
- Project dates appeared after bullets;
- final PDF looked worse than a credible professional resume;
- time saved versus manual tailoring: **NO**;
- the applicant would wait for the next product update rather than use the current output again.

A secondary finding was that Tailoring Review sometimes appeared to change mainly titles rather than deliver obvious substantive tailoring value.

Do not reinterpret or continue Beta #7 after engineering changes.

## Engineering recovery after Beta #7

PR #123 merged at `2fa1f084f8e06cc8f9ee095d406aa6c0033c95af`.

Engineering proof now exists for a shared professional resume presentation model across Draft/review and final PDF:

- standalone Professional Summary;
- categorized Skills shown as readable label/value groups;
- flat skills remain separate scan-friendly items;
- conventional Experience, Projects, and Education entry hierarchy;
- dates placed with the corresponding entry heading;
- trailing Project dates moved into the project header position;
- Education fields separated into readable school/date/degree/detail hierarchy;
- date-like achievement prose remains body text;
- Career Review section copy remains populated;
- source content and approved wording remain intact at the presentation boundary.

Regression-only CI `31596052613` proved the prior renderer failed the new layout contract. Final merge-candidate CI `31597221430` passed unit, full integration, whitespace, HTTP/representative PDF, pre-fix browser RED proof, and current browser GREEN.

This is engineering readiness evidence only. It does not establish applicant submission acceptance.

## Issue state for the next Beta

Issue #122 remains **OPEN** because its acceptance criteria explicitly require fresh-user judgment that the final PDF is submission-ready and saves meaningful time.

Issue #97 also remains **OPEN** for the broader applicant-readable review/export/value acceptance gate.

## Fresh Beta #8 primary retest

After the durable checkpoint is merged and the Beta #8 issue is created, begin from Landing/Input with a real resume and real job description. Treat the applicant as fresh to this shipped version and do not coach around the repaired layout.

The primary retest is the actual applicant-facing resume presentation, especially `final-resume.pdf`:

- Is Professional Summary clearly separate and appropriately placed?
- Are Skills easy to scan rather than dense or concatenated?
- Do Experience entries have normal title/company/location/date/bullet hierarchy?
- Do Projects have normal heading/date/bullet hierarchy, with dates beside the heading rather than after bullets?
- Is Education readable with school, dates, degree/major/minor/GPA/honors clearly separated?
- Do section and field boundaries look intentional rather than concatenated?
- Is the final PDF at least as readable and credible as the Draft/Career Review surface?
- Does all expected source/approved content remain present without duplication?
- Would the applicant seriously consider submitting the PDF without rebuilding it elsewhere?

## Secondary watch item

Continue to observe Tailoring Review without coaching:

- does the proposed wording feel materially useful for the job rather than mostly title-level edits?
- can the applicant tell what actually changed and why?

This is secondary to the #122 final-layout acceptance gate unless it independently becomes a credible blocker.

## Required visible stages

A fresh Beta #8 should still cover:

1. Landing / Input
2. Processing summary / understanding
3. every materially changed Tailoring Review proposal
4. correction/regeneration if a genuine correction is needed
5. Draft and applicant-readable validation
6. Career Review — every populated section
7. `final-resume.pdf`
8. `career-review-report.html`
9. `final-resume.md`
10. `final-resume.json` as secondary artifact
11. final real-submission decision
12. time/value decision
13. review-burden and trust decision
14. whether the applicant would use the product again

Do not invent false information solely to exercise a correction path.

## Required final judgments

Record as PASS, FAIL, or UNKNOWN using the applicant's own evidence:

- final PDF professional credibility;
- Summary placement/readability;
- Skills scanability;
- Experience hierarchy;
- Projects hierarchy/date placement;
- Education hierarchy;
- section/field boundary clarity;
- complete resume confidence;
- Tailoring Review usefulness;
- Career Review usefulness/burden;
- trust/transparency;
- submission readiness;
- would submit `final-resume.pdf`;
- time saved versus manual tailoring;
- practical value;
- would use the product again.

Beta Accepted still requires fresh applicant evidence. Green engineering checks are not sufficient.

## Room state

Beta #7 is complete and closed as **FAIL**. Beta Accepted is **NO**. Once the Beta #7 layout-recovery checkpoint merges, a fresh Beta #8 may be created with initial result **UNKNOWN**. Do not reuse Beta #7 judgments as Beta #8 evidence.
