# Product Handoff

**Owner:** Product Room  
**Checkpoint:** 2026-08-06

## Start

Read `PROJECT_CONTEXT.md`, `docs/context/project-snapshot.md`, this file, Issue #83, relevant PRDs/roadmap/principles, and current GitHub state.

## Accepted decision

Issue #83 adopts a **source-resume shell with dual-lane Capability 004 composition**:

- `source_resume_passthrough` preserves exact validated source identity/contact, order, hierarchy, and essential unchanged sections; it never writes Candidate Knowledge.
- `candidate_knowledge_generated` covers every generated or materially rewritten factual claim and still requires Evidence Review → 003.6 → included selection and deterministic claim validation.
- Validation separately checks generated-claim safety and whole-resume completeness.
- Career Review and export operate on the complete composed resume.

## Evidence

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL** after a complete browser run and all exports.
- The output was a one-project fragment missing identity/contact, Experience, Skills, Education, and other essential content; the user would not submit it, saw no time savings, and would not reuse the product.
- Repository diagnosis places the loss after Evidence Review, not in source understanding.

## Constraints

Do not weaken Candidate Knowledge, 003.6, provenance, deterministic validation, Career Review, privacy, or applicant authority. Do not start another Beta or another Intelligent Execution artifact until a complete applicant-facing resume is independently proven.

## Next action

Engineering proves draft PR #87 against the accepted boundary. Product revisits the decision only if implementation evidence exposes a real authority, provenance, review-burden, or applicant-readability conflict. Workflow clarity and Career Review readability remain later Beta blockers after complete-resume output is restored.
