# Project Snapshot

**As of:** 2026-08-06  
**Repository:** `MumGinger/career-evolution-platform`  
**Primary branch:** `chore/project-foundation`

## State

- The representative evidence-to-export engineering flow remains **Implemented and Integrated** for its specified behavior.
- **Beta #1 / Issue #73:** FAIL.
- **Beta #2 / Issue #82:** FAIL.
- **Issue #83 / PR #87:** complete-resume composition engineering complete.
- **Beta #3 / Issue #93:** FAIL.
- **Issues #95 and #97 / PR #99:** engineering change set merged at `f08a01e1fb7b2cc6d78af46c5682b8c57c2f185b`.
- **Beta #4 / Issue #100:** FAIL at the first Evidence Review candidate.
- **Issue #101:** active product blocker — Evidence Review does not make the Accept/Skip decision understandable to a first-time applicant.
- **Issue #102:** active product blocker — Step 3 of 5 has no discoverable way to continue after Ready for review.
- **Issue #103:** active supplemental UX finding — Understanding and exclusions remains emphasized after the applicant moves forward.
- **Beta Accepted:** NO.

Beta #4 confirmed that PR #99 improved the applicant-readable presentation, but product acceptance still fails earlier in the workflow: the applicant cannot confidently determine what Evidence Review is asking them to decide, and later exploration exposed a separate progression problem.

## Current capability boundary

PR #99 remains the current shipped applicant-facing presentation boundary while preserving the existing complete-resume and truth boundaries:

- Evidence Review presents source-backed candidate evidence before integration decisions.
- Exact source content remains `source_resume_passthrough`, keeps source authority, and never writes Candidate Knowledge.
- Generated or materially rewritten claims remain `candidate_knowledge_generated` and require Evidence Review → 003.6 → included Resume Content Selection and deterministic validation.
- Whole-resume validation and complete Career Review remain mandatory before export.
- Draft and Career Review are presented as a readable resume rather than raw JSON or identifiers.
- Visible PDF/Unicode bullet and dash artifacts are normalized only at the applicant presentation/export boundary.
- `final-resume.pdf` remains the intended primary applicant-facing output; readable Career Review HTML, Markdown, and structured JSON remain available.

The Beta #4 failure does not change these truth or authority boundaries. It establishes that the current applicant-facing explanation and progression are not yet sufficient for a credible first-time-user workflow.

## Beta #4 product evidence

- Landing/Input was easy to use overall, but **Check connection** and provider **Base URL** were not understandable to the applicant.
- **Understanding and exclusions** was easy to scan but its purpose, exclusion meaning, and relationship to the resulting resume were unclear.
- At Evidence Review Candidate 1, the applicant could not tell whether Accept/Skip meant verifying truth, judging relevance, or deciding resume inclusion. Continuing would have required guessing, so the Beta stopped as **FAIL**.
- Supplemental exploration showed a more readable resume after **Ready for review**, but **Step 3 of 5** offered no discoverable next action.
- The earlier **Understanding and exclusions** section remained visible on later screens, creating repetitive UX friction and weakening the sense of progression.
- Later Evidence Review candidates, Draft/validation judgments, Career Review, all four final artifacts, submission readiness, time/value, and reuse intent remain **UNKNOWN / not credibly reached**.

## Engineering proof boundary

PR #99 final-head CI run `31133523801` passed independently reported:

- unit tests;
- full integration tests;
- patch whitespace;
- HTTP and representative-PDF complete-resume contracts;
- the required pre-fix browser red proof;
- a real Chromium shipped-flow green proof.

The manual, secret-gated real-provider smoke is **UNKNOWN** until executed. The primary-branch push workflow for the merge commit was also recorded as **UNKNOWN** when the Beta handoff was prepared; absence of a status is not PASS.

Mock-provider HTTP tests and fake-DOM client tests remain contract evidence, not real browser/provider E2E. Passing engineering proof does not establish Beta acceptance.

## Active objective

Resolve the applicant-facing decision-meaning blocker in Issue #101 and the progression/navigation blocker in Issue #102. Address Issue #103 as part of the same product-quality recovery where appropriate. Then run a fresh real-user Beta from Landing / Input with a real resume and real job description.

The next Beta must again determine whether the user would submit the PDF, saved meaningful time, found the review burden reasonable, trusted the workflow, and would use the product again. None of those outcomes may be inferred from Beta #4 because the run stopped before they were credibly reached.

## Boundaries

- Candidate Knowledge and 003.6 remain authoritative for generated or materially rewritten facts.
- Source passthrough must remain exact, source-linked, and unable to create Candidate Knowledge.
- Preserve provenance, source order and hierarchy, uncertainty, deterministic validation, complete Career Review, privacy, and human authority.
- Passing tests, successful execution, complete composition, readable outputs, or available PDF export do not equal Beta Accepted.
- The unresolved complete-source/no-core-tailoring-selection policy remains unchanged until Product makes the decision recorded in Issue #95.
- Do not commit private inputs, credentials, provider responses, local paths, or generated private artifacts.

Current GitHub and Layer 1 records override this snapshot.
