# Product Room Handoff

**Last checkpoint:** 2026-08-06  
**Room authority:** Accepted PRDs, roadmap decisions, product principles, GitHub issues, and the current repository state override this handoff when they conflict.

## Purpose

This file carries the active product working state needed to replace a long Product Room. Durable product truth belongs in PRDs, roadmap documents, product principles, accepted decisions, issues, and user-research records.

## Current product question

What is the smallest truth-preserving complete-resume composition boundary that preserves source identity/contact information and essential source-resume sections while allowing approved job-specific claims to be selected, reordered, or rewritten without silently treating every unchanged source line as newly committed Candidate Knowledge?

This question is tracked in Issue #83 and is now the only active Product decision before another Beta.

## Accepted decisions

The following decisions are already recorded in Layer 1 through Issue #83, the Product Roadmap, Product Principles, Current State, ADRs, and merged PR evidence:

- **Complete resume first.** Version 1 is not Beta Accepted. Another Beta and additional Intelligent Execution artifacts are deferred until one complete applicant-facing draft is independently inspected. See Issue #83, `docs/roadmap/roadmap.md`, and `docs/current-state.md`.
- **A tailored artifact must remain a recognizable resume.** Identity/contact information and essential Experience, Projects, Skills, Education, Certifications, and other source sections must survive when present unless an explicit applicant-understandable decision omits them. See Issue #83.
- **Tailoring cannot collapse the document.** Approved evidence may improve, replace, reorder, or emphasize supported statements, but unrelated content required for completeness must not disappear. See Issue #83.
- **New or materially rewritten factual claims remain bounded by Candidate Knowledge.** Candidate Knowledge is the committed fact authority and 003.6 remains the sole accepted-only writer. See Product Principles, ADR-005, and Issue #83.
- **Source-preserved content and generated claims may require different composition/validation treatment.** The exact mechanism is undecided, but deterministic validation must distinguish factual-claim safety from whole-resume completeness. See Issue #83 and the Product Roadmap.
- **LLM-first is the preferred real-resume understanding path.** LLM understanding and drafting produce bounded proposals; provenance, acceptance, deterministic validation, Career Review, and export gating remain authoritative. The older Resume AST path remains legacy/diagnostic. See `docs/current-state.md`, `docs/roadmap/roadmap.md`, and PRs #66 and #68.
- **Companion and Developer views are separate.** Applicant-facing interaction should hide internal structures, while Developer View must retain provider/model, stage status, validation findings, evidence flow, provenance, and export readiness for internal Beta observability. See PR #66 and the shipped local Beta UI.
- **Career Review is mandatory before export.** Career Review is the product-facing name of the existing immutable Human Review boundary; it is not a second review architecture. See PRs #56 and #58.
- **Engineering proof is not product acceptance.** Passing tests, successful real-provider execution, deterministic validation, and available exports do not equal Beta Accepted. See Issue #82, `docs/context/project-snapshot.md`, and project delivery gates.

## Options still under consideration

These options are recorded in Issue #83 but are not accepted implementation decisions:

1. **Source-resume shell plus tailored overlays**
   - Preserve a bounded source-resume composition as the document shell.
   - Replace or add only approved tailored statements.
   - Advantage: lowest review burden and strongest document continuity.
   - Risk: requires a clear rule for when unchanged source text is safe to preserve without becoming a newly committed claim.

2. **Review and commit every retained source item**
   - Route all content retained in the final resume through Evidence Review and 003.6.
   - Advantage: one uniform fact authority.
   - Risk: high review burden, duplicate work, and conflict with the principle to minimize user effort.

3. **Dual-lane artifact composition**
   - Keep source-preserved content and generated/materially rewritten claims as separate artifact lanes with explicit provenance and different validation rules.
   - Advantage: preserves completeness without weakening the claim boundary.
   - Risk: greater artifact and review complexity; applicant-facing explanation must remain simple.

No option should be selected until repository diagnosis identifies exactly where source structure is currently dropped and the smallest composition seam that can restore it.

## User evidence

- **Beta #1 / Issue #73:** FAIL.
- **Beta #2 / Issue #82:** FAIL after a complete browser run with a real resume, real Zurich JD, real provider, Career Review, and all three exports.
- The user would not submit the generated resume, reported no meaningful time savings, and would not use the product again in its current state.
- The run took approximately ten minutes.
- The readable draft and final Markdown contained only one project statement and omitted personal information, Experience, Skills, Education, and other essential source-resume content.
- Evidence Review did not clearly distinguish truth confirmation, job relevance, and final-resume inclusion.
- Understanding/exclusion counts and Career Review provenance were not applicant-readable.
- `career-review-report.html` exposed raw structured fields and identifiers; `final-resume.json` did not provide user value.
- PR #68 proves the real-provider engineering path can retain contextual evidence and complete export, but Beta #2 proves that the current composition does not produce an acceptable product artifact.

## Constraints and non-goals

- Do not weaken Candidate Knowledge, 003.6, exact provenance, deterministic validation, Career Review, or export gating.
- Do not treat unchanged source text, LLM output, conversation answers, reflection, curiosity, or generated artifacts as committed facts automatically.
- Do not start another Beta before a complete applicant-facing draft is independently inspected.
- Do not begin cover letters, interview preparation, LinkedIn, job discovery, auto-apply, or other Intelligent Execution expansion while Issue #83 is open.
- Do not optimize the legacy parser or introduce a broad new framework unless required by the smallest complete-resume composition seam.
- Keep private resumes, job descriptions, credentials, provider responses, and local paths outside the repository and public diagnostics.
- Applicant-facing simplicity must not remove Developer View observability during internal Beta.

## Open questions and unknowns

- At what exact stage are identity, contact data, section order, and unchanged essential content dropped: understanding, tailoring, presentation strategy, artifact generation, Career Review, or export?
- Which source-resume elements can be preserved verbatim as document structure/content without passing through Candidate Knowledge as newly generated claims?
- What counts as a material rewrite that must use committed facts rather than source-preserved content?
- How should source-preserved and generated statements be distinguished in provenance, validation, Career Review, and export without burdening the applicant?
- Can the complete-resume boundary be added within Capability 004, or does accepted product behavior require a new Layer 1 PRD/ADR after diagnosis?
- What is the minimum complete-resume regression fixture that represents identity/contact, Experience, Projects, Skills, Education, Certifications, and a Projects-only tailoring case?
- Issue #46 and Issue #48 remain open despite their capabilities being recorded as complete; this is repository hygiene, not the active product blocker.

## Next product action

Produce one bounded **Complete Resume Composition Decision** for Issue #83 after repository diagnosis. The decision must:

1. identify the exact stage where source structure is lost;
2. select the smallest composition boundary;
3. define which content is source-preserved versus newly generated/materially rewritten;
4. define provenance and validation behavior for both;
5. specify one regression scenario where Projects-only tailored evidence still yields a complete resume; and
6. require independent inspection of the resulting complete draft before another Beta.

Do not open a new product capability or schedule Beta until this decision is recorded in Layer 1.

## Checkpoint instructions for the existing room

Before retiring the current Product Room:

1. Read `PROJECT_CONTEXT.md` and `docs/context/project-snapshot.md`.
2. Inspect the relevant PRDs, roadmap, accepted decisions, product issues, Beta evidence, and recent merged work.
3. Update durable Layer 1 records first for every accepted decision.
4. Replace every `_not checkpointed_` field above with the current product state; remove abandoned discussion that no longer affects action.
5. Update `project-snapshot.md` only when the cross-room objective, milestone, accepted direction, blocker, boundary, or next project action changed.
6. Commit the handoff through a reviewed pull request.

## New Product Room startup

> Read `PROJECT_CONTEXT.md`, `docs/context/project-snapshot.md`, and `docs/context/product-handoff.md`. Then inspect the relevant PRDs, roadmap, product issues, accepted decisions, and current user evidence. Act as Product Lead. Keep accepted decisions, options, evidence, hypotheses, and unknowns distinct. Repository evidence is authoritative over previous chat history.
