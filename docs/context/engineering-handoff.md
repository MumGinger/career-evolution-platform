# Engineering Handoff

**Owner:** Engineering Room  
**Checkpoint:** 2026-08-06

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, Issue #93, and current GitHub state.

## Current state

- Issue #83 is completed.
- PR #87 is merged to primary at `cf6ea94f1641095e08ca15766c90cfe7d1f76560`.
- Beta #3 / Issue #93 is ready to begin from a fresh local process.
- Beta Accepted remains **NO**.

## Merged boundary

- Exact validated source content remains verbatim `source_resume_passthrough`, has zero Resume Content Selection references, and never writes Candidate Knowledge.
- Generated or materially rewritten claims remain `candidate_knowledge_generated` and require Evidence Review → 003.6 → included selection, inherited provenance, and deterministic claim-scope validation.
- A source statement may disappear only when independently validated as replaced by matching Candidate Knowledge generated content in the same section.
- Career Review and export operate on every populated composed section.

## Engineering evidence

- Root-cause diagnosis: **PASS** — source structure survived understanding and was lost after Evidence Review when downstream stages rendered only included Candidate Knowledge selections.
- Focused composition regression executed on Node.js 22: **7/7 PASS**.
- Negative regressions cover missing Education, unrelated replacement evidence, and date-range phone false positives.
- Independent six-section applicant-facing Markdown inspection: **PASS**.
- Complete seven-file diff review and branch synchronization: **PASS**.
- Remote GitHub workflow and commit status for the connector-created head: **UNKNOWN**; no run was instantiated. This remains explicitly recorded under the repository connector-hotfix exception.

## Protect

Preserve Candidate Knowledge, 003.6, exact source passthrough, provenance, source order/hierarchy, separate claim-safety and whole-resume validation, complete Career Review, privacy, and the engineering-proof/Beta-acceptance distinction.

## Next action

Do not start new implementation work. Support Beta #3 only if the shipped workflow exposes a reproducible regression or a new product blocker. Do not mark Beta Accepted without the user's explicit submission, time-savings, review-burden, trust, and reuse judgment recorded in Issue #93.
