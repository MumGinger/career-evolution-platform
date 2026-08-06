# Project Snapshot

**As of:** 2026-08-06  
**Repository:** `MumGinger/career-evolution-platform`  
**Primary branch:** `chore/project-foundation`

## State

- The representative evidence-to-export engineering flow remains **Implemented, Integrated, and Proven** for its specified behavior.
- **Beta #1 / Issue #73:** FAIL.
- **Beta #2 / Issue #82:** FAIL.
- **Beta Accepted:** NO.

Beta #2 completed the browser flow and exported all files, but produced a one-project resume missing identity/contact, Experience, Skills, Education, and other essential source content. The user would not submit it, saw no time savings, and would not reuse the product.

## Active objective

Resolve Issue #83 by producing a complete recognizable tailored resume.

Issue #83 now accepts a source-resume shell with dual-lane Capability 004 composition:

- exact validated source content remains verbatim `source_resume_passthrough` and never writes Candidate Knowledge;
- generated or materially rewritten claims remain `candidate_knowledge_generated` and require Evidence Review → 003.6 → included selection and deterministic claim validation.

Draft PR #87 implements this boundary. Current direct evidence is focused composition regression **6/6 PASS** and an independently inspected six-section draft. Full `npm test`, the shipped server regression, GitHub checks, complete diff review, and final export inspection remain **UNKNOWN / pending**.

## Next

Engineering completes PR #87 proof against the accepted boundary. Another Beta starts only after the complete applicant-facing draft, full regression state, and final exports are independently verified.

## Boundaries

- Candidate Knowledge and 003.6 remain authoritative for generated or materially rewritten facts.
- Source passthrough must remain exact, source-linked, and unable to create Candidate Knowledge.
- Preserve provenance, source order and hierarchy, uncertainty, deterministic validation, complete Career Review, and human authority.
- Passing tests, successful execution, or available exports do not equal Beta Accepted.
- Do not commit private inputs, credentials, provider responses, or local paths.

Current GitHub and Layer 1 records override this snapshot.
