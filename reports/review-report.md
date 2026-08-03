# Review Report

**Date:** 2026-08-03
**Status:** Pending human review of Capability 003.3

## Self-review

- The implementation reads only the existing immutable Information Need Run snapshot. It uses exact normalized values and a small explicit alias map; it does not use web sources, LLMs, fuzzy matching, or inferred candidate facts.
- Each source search retains order, availability, adapter version, result, rationale, and limitations. The only local sources are `candidate_fact`, `profile_skill`, and `resume_import`; unavailable connectors are not represented as searched.
- Every Evidence Candidate is distinct from Candidate Knowledge, has stable provenance, and receives one deterministic resolution. Confirmation-required evidence is never accepted, material structured conflicts block sufficiency, and sufficient needs record skipped lower-priority sources.
- ADR-004 makes the immutable-run requirement explicit. Evidence Discovery has no update path and does not insert, change, or delete Candidate Knowledge.
- Capability 001, 002, 003.1, and 003.2 tests remain green; the full suite passes 33 tests.

## Pull-request review gates

1. **Does this violate product principles?** No. It implements Search Before Ask, preserves Candidate Knowledge as the source of truth, never invents facts or converts unknown into absence, and retains explainable provenance, rationale, and limitations.
2. **Does this require a new ADR?** Yes. ADR-004 records the durable rule that every decision-producing operation must create an immutable Run with stable inputs and versions.
3. **Does this change a PRD?** Yes. Capability 003.3 and the Search Before Ask principle are now part of the formal Capability 003 PRD.
4. **Does this change the roadmap?** No. Capability 003 remains in progress; 003.3 is an implementation slice, not a roadmap revision.

## Requested reviewer focus

- Confirm the initial deterministic alias list and score thresholds, particularly the treatment of generic but role-central requirements.
- Confirm the retained candidate-evidence snapshot and fact-reference structure meets the desired traceability and retention boundary.
