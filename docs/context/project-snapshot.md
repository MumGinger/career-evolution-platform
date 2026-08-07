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
- **Issues #95 and #97 / PR #99:** engineering change set for test-integrity hardening and applicant-readable review/export.
- **Beta #4 / Issue #100:** queued as the next real-user product gate after PR #99 is merged and primary CI is independently green.
- **Beta Accepted:** NO.

Beta #3 confirmed that Issue #83 materially restored complete-resume composition, but product acceptance still failed because the applicant-facing review and outputs were dominated by implementation detail and lacked a credible submission-ready document.

## Current capability boundary

PR #99 preserves the existing complete-resume and truth boundaries while adding an applicant-facing presentation boundary:

- Evidence Review explains what Accept authorizes before the decision and explicitly preserves the 003.6 boundary.
- Exact source content remains `source_resume_passthrough`, keeps source authority, and never writes Candidate Knowledge.
- Generated or materially rewritten claims remain `candidate_knowledge_generated` and require Evidence Review → 003.6 → included Resume Content Selection and deterministic validation.
- Whole-resume validation and complete Career Review remain mandatory before export.
- Draft and Career Review are presented as a readable resume rather than raw JSON or identifiers.
- Visible PDF/Unicode bullet and dash artifacts are normalized only at the applicant presentation/export boundary.
- `final-resume.pdf` is the primary applicant-facing output; readable Career Review HTML, Markdown, and structured JSON remain available.

## Engineering proof boundary

PR #99 separates and reports:

- unit tests;
- integration tests;
- HTTP and representative-PDF complete-resume contracts;
- a real Chromium shipped-flow test;
- a manual, secret-gated real-provider smoke path.

The browser regression must fail against the pre-fix base and pass against the change set. Mock-provider HTTP tests and fake-DOM client tests remain contract evidence, not real browser/provider E2E.

A missing workflow, provider smoke, or Beta judgment is **UNKNOWN**, never PASS.

## Active objective

Complete independent PR and primary-branch CI for PR #99, then execute Beta #4 / Issue #100 using a real resume and real job description through the shipped localhost UI.

Beta #4 must decide whether the user would submit the PDF, saved meaningful time, found the review burden reasonable, trusted the workflow, and would use the product again.

## Boundaries

- Candidate Knowledge and 003.6 remain authoritative for generated or materially rewritten facts.
- Source passthrough must remain exact, source-linked, and unable to create Candidate Knowledge.
- Preserve provenance, source order and hierarchy, uncertainty, deterministic validation, complete Career Review, privacy, and human authority.
- Passing tests, successful execution, complete composition, readable outputs, or available PDF export do not equal Beta Accepted.
- The unresolved complete-source/no-core-tailoring-selection policy remains unchanged until Product makes the decision recorded in Issue #95.
- Do not commit private inputs, credentials, provider responses, local paths, or generated private artifacts.

Current GitHub and Layer 1 records override this snapshot.
