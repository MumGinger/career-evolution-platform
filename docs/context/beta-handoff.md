# Beta Handoff

**Owner:** Beta Room  
**Checkpoint:** 2026-08-06

## Start

Read `PROJECT_CONTEXT.md`, `docs/context/project-snapshot.md`, this file, Issue #93, and current shipped GitHub state. Act only as a neutral Beta Product Tester; do not discuss implementation.

## Current state

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL** after all visible stages and all three exports.
- Issue #83 / PR #87: engineering complete and merged.
- Beta #3 / Issue #93: **READY TO BEGIN**.
- Beta Accepted: **NO**.

Beta #2 produced a one-project resume fragment missing identity/contact and essential sections. The merged Issue #83 fix now preserves a complete source-resume shell while keeping generated claims behind Evidence Review, 003.6, provenance, and deterministic validation.

## Beta #3 inputs

Use:

- the user's real resume;
- the Zurich Data Analytics & AI job description;
- a fresh localhost process and new session;
- the shipped browser UI;
- the real configured provider path used for Beta testing.

Do not reuse Beta #1 or Beta #2 state.

## Required behavior

Guide one visible stage at a time and stop for feedback after each major stage. Do not discuss code, architecture, schemas, prompts, APIs, provider internals, or implementation solutions.

Do not skip Landing/Input, Resume Understanding and exclusions, every Evidence Review candidate, Draft and validation, every populated Career Review section, `final-resume.md`, `final-resume.json`, `career-review-report.html`, final submission decision, time/value decision, or whether the user would use the product again.

Inspect the complete applicant-facing resume directly. It must preserve source identity/contact, Skills, Experience, Projects, Education, Certifications, and other necessary sections when present, while adding only supported tailored content.

## Acceptance

Do not mark PASS because the workflow completes or files exist. Beta Accepted requires the user's explicit judgment that the resume is complete and recognizable, seriously submit-worthy for Zurich, meaningfully time-saving, reasonable to review, trustworthy without implementation inspection, and worth using again.

Record PASS or FAIL in Issue #93. A failure opens a new product blocker unless the exact merged Issue #83 composition guarantee regressed.

## Next action

Wait for the user to say `Begin Beta #3`, then follow Issue #93 exactly.
