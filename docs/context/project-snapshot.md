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
- **Beta #4 / Issue #100:** prepared as the next real-user product gate.
- **Beta Accepted:** NO.

Beta #3 confirmed that complete-resume composition was restored, but product acceptance still failed because the applicant-facing review and outputs were dominated by implementation detail and lacked a credible submission-ready document.

## Current capability boundary

PR #99 adds an applicant-facing presentation boundary while preserving the existing complete-resume and truth boundaries:

- Evidence Review explains what Accept authorizes before the decision and explicitly preserves the 003.6 boundary.
- Exact source content remains `source_resume_passthrough`, keeps source authority, and never writes Candidate Knowledge.
- Generated or materially rewritten claims remain `candidate_knowledge_generated` and require Evidence Review → 003.6 → included Resume Content Selection and deterministic validation.
- Whole-resume validation and complete Career Review remain mandatory before export.
- Draft and Career Review are presented as a readable resume rather than raw JSON or identifiers.
- Visible PDF/Unicode bullet and dash artifacts are normalized only at the applicant presentation/export boundary.
- `final-resume.pdf` is the primary applicant-facing output; readable Career Review HTML, Markdown, and structured JSON remain available.

## Engineering proof boundary

PR #99 final-head CI run `31133523801` passed independently reported:

- unit tests;
- full integration tests;
- patch whitespace;
- HTTP and representative-PDF complete-resume contracts;
- the required pre-fix browser red proof;
- a real Chromium shipped-flow green proof.

The manual, secret-gated real-provider smoke is **UNKNOWN** until executed. The primary-branch push workflow for the merge commit is also **UNKNOWN** until independently visible; absence of a status is not PASS.

Mock-provider HTTP tests and fake-DOM client tests remain contract evidence, not real browser/provider E2E. Passing engineering proof does not establish Beta acceptance.

## Active objective

Verify the primary-branch CI run for the merged state, then execute Beta #4 / Issue #100 using a real resume and real job description through the shipped localhost UI.

Beta #4 must decide whether the user would submit the PDF, saved meaningful time, found the review burden reasonable, trusted the workflow, and would use the product again.

## Boundaries

- Candidate Knowledge and 003.6 remain authoritative for generated or materially rewritten facts.
- Source passthrough must remain exact, source-linked, and unable to create Candidate Knowledge.
- Preserve provenance, source order and hierarchy, uncertainty, deterministic validation, complete Career Review, privacy, and human authority.
- Passing tests, successful execution, complete composition, readable outputs, or available PDF export do not equal Beta Accepted.
- The unresolved complete-source/no-core-tailoring-selection policy remains unchanged until Product makes the decision recorded in Issue #95.
- Do not commit private inputs, credentials, provider responses, local paths, or generated private artifacts.

Current GitHub and Layer 1 records override this snapshot.
