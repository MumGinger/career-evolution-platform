# Project Snapshot

**As of:** 2026-08-06  
**Repository:** `MumGinger/career-evolution-platform`  
**Primary branch:** `chore/project-foundation`

## State

- The representative evidence-to-export engineering flow remains **Implemented, Integrated, and Proven** for its specified behavior.
- **Beta #1 / Issue #73:** FAIL.
- **Beta #2 / Issue #82:** FAIL.
- **Issue #83 / PR #87:** engineering complete and merged at `cf6ea94f1641095e08ca15766c90cfe7d1f76560`.
- **Beta #3 / Issue #93:** FAIL.
- **Beta Accepted:** NO.

Beta #3 confirmed that Issue #83 materially restored complete-resume composition: the applicant-facing draft and Markdown export contained recognizable identity/contact and multiple source-resume sections rather than the Beta #2 one-project fragment. Product acceptance still failed because the applicant-facing review and final output were not practical to use.

## Current capability

- Exact validated source content is preserved verbatim as `source_resume_passthrough` and never writes Candidate Knowledge.
- Generated or materially rewritten claims remain `candidate_knowledge_generated` and require Evidence Review → 003.6 → included Resume Content Selection and deterministic claim validation.
- Whole-resume validation independently enforces source statement and section preservation or an explicit supported replacement.
- Career Review and export operate on every populated composed section.
- The complete-resume composition guarantee did not visibly regress in Beta #3.

## Active objective

Make the approved complete resume practical for a normal applicant to review and submit without reading raw JSON, identifiers, escaped text, or technical validation language.

The next product gate is a human-readable applicant review and polished submission-ready resume export. Evidence Review must also make the meaning of Accept understandable within that applicant-facing experience.

## Next

Product/Engineering should take the single active Beta #3 blocker issue, preserve the complete-resume and truth boundaries, and return to Beta only after an applicant-facing complete resume and review are independently inspected.

## Boundaries

- Candidate Knowledge and 003.6 remain authoritative for generated or materially rewritten facts.
- Source passthrough must remain exact, source-linked, and unable to create Candidate Knowledge.
- Preserve provenance, source order and hierarchy, uncertainty, deterministic validation, complete Career Review, privacy, and human authority.
- Passing tests, successful execution, complete composition, or available exports do not equal Beta Accepted.
- Do not commit private inputs, credentials, provider responses, local paths, or generated private artifacts.

Current GitHub and Layer 1 records override this snapshot.
