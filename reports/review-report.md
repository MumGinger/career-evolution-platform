# Review Report

**Date:** 2026-08-03
**Status:** Pending human review of Capability 003.6 Candidate Knowledge Integration

## Self-review

- Only accepted Integration Decisions write Candidate Facts. Duplicate decisions add valid evidence links without creating a fact; all other decisions retain uncertainty outside committed knowledge.
- Integration Runs, Decisions, Evidence Observations, fact links, and revisions are immutable. Superseding facts preserve their predecessor.

- Acquisition Actions remain first-class planning entities; execution references their persisted IDs and does not recreate or reinterpret them.
- Acquisition Results and Acquisition Result Runs are append-only SQLite records. Every run includes a plan/action snapshot, adapter version, timestamps, action reference, status, provenance, limitations, and raw captured evidence.
- Re-running the same plan creates a new result run and leaves prior result runs untouched.
- The only adapter is deterministic and local. It does not plan, discover, call connectors, resolve or evaluate evidence, infer acceptance/confidence, or modify Candidate Knowledge.
- Each planned action must receive exactly one explicit outcome. `captured` requires raw evidence; `skipped` and `unavailable` preserve uncertainty instead of inventing a negative candidate claim.

## Pull-request review gates

1. **Does this violate product principles?** No. It preserves provenance and uncertainty and never turns raw or weak evidence into a fact.
2. **Does this require a new ADR?** Yes. ADR-006 narrows the append-only commit and revision model without changing ADR-004 or ADR-005.
3. **Does this change a PRD?** Yes. The Capability 003 PRD now specifies 003.6's finalized integration policy.
4. **Does this change the roadmap?** Yes, status only. 003.6 is marked Complete; scope and sequence remain unchanged.

## Requested reviewer focus

- Confirm that requiring one explicit outcome per planned action is the appropriate completeness boundary for a local execution run.
- Review whether the initial `captured`, `skipped`, and `unavailable` vocabulary is sufficient before user-interaction or connector adapters are introduced.
