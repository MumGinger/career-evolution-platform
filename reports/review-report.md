# Review Report

**Date:** 2026-08-02  
**Status:** Pending human review

## Self-review

- Product principles are explicit review gates and align with the Candidate Knowledge and evidence model.
- ADRs distinguish resume from candidate, unknown from missing, and acquisition from generation.
- Capability 003 is limited to information acquisition; job discovery, auto-apply, resume rewriting, cover letters, and interview coaching remain out of scope.
- Existing valid Career-first documentation was retained and moved to the canonical ADR location.
- No runtime code was changed.

## Pull-request review gates

1. **Does this violate product principles?** No identified conflict.
2. **Does this require a new ADR?** The three new durable decisions are recorded as ADR-001 through ADR-003; the existing Career-first ADR is retained as ADR-000.
3. **Does this change a PRD?** Yes. Capability 003 is newly defined in `docs/prd/capability-003-information-acquisition.md`.
4. **Does this change the roadmap?** Yes. It records Capabilities 001 and 002 as complete and Capability 003 as in progress.

## Requested reviewer focus

- Confirm the local application-to-interview workflow is the right first validation slice.
- Confirm the desired review authority and privacy/retention boundaries before any skill update is allowed.
- Confirm that the deterministic artifact is sufficient for the MVP, without introducing a model integration prematurely.
- Confirm that resume parsing remains limited to explicit text and that ambiguous structured entries are appropriately marked for confirmation.
