# Engineering Handoff

**Owner:** Engineering Room  
**Checkpoint:** 2026-08-06

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, and current GitHub state.

## Active work

- Issue #83 — produce a complete recognizable tailored resume.
- Draft PR #87 — source-resume shell with dual-lane Capability 004 composition.
- PR #87 head: `683f0a15f29364d23a2c5404b88ac119e9626a1d`; synchronized to base `f16d577cabfd787331e50251db231c8b68597802`.
- Accepted boundary: exact source passthrough never writes Candidate Knowledge; generated or materially rewritten claims still require Evidence Review → 003.6 → included selection.

## Evidence and gaps

- Root-cause diagnosis: **PASS** — source structure survives understanding and is lost after Evidence Review when downstream stages render only included Candidate Knowledge selections.
- Focused composition regression: **6/6 PASS**.
- Independent six-section draft inspection: **PASS**.
- Full `npm test`, shipped server regression, GitHub checks, complete diff review, and final export inspection: **UNKNOWN / pending**.
- PR #87 is not merge-ready, Proven for the shipped complete-resume flow, or Beta Accepted.

## Protect

Preserve Candidate Knowledge, 003.6, exact source passthrough, provenance, source order/hierarchy, separate claim-safety and whole-resume validation, complete Career Review, privacy, and the engineering-proof/Beta-acceptance distinction.

## Next action

Run the full repository suite and shipped complete-export regression for PR #87, inspect the complete diff and final Markdown/JSON/HTML artifacts, record check state truthfully, and merge only if every engineering gate passes. Do not prepare another Beta before that proof.
