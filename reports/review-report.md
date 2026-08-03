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

- Confirm that the Information Priority factors and stopping rule provide the right boundary for Capability 003.
- Confirm the proposed handling of connected-source consent, privacy, and retention before implementation.
- Confirm that the ADR numbering and migration of the Career-first decision preserve desired project history.
