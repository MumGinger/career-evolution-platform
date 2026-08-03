# Current State

**Phase:** Product foundation governance; Capability 003 specification
**Last updated:** 2026-08-02

## Completed

- Capability 001 — Application Evidence Loop: local SQLite applications, versioned artifacts, and traceable outcome/preference evidence with automatic learning disabled.
- Capability 002 — Resume Intake & Candidate Knowledge Bootstrap: imported explicit PDF-resume text with `resume` provenance, `parsed` confidence, and `needs_confirmation` for unsafe structure.
- Product documentation and governance foundation: vision, principles, capability roadmap, ADR index, PRD conventions, system overview, glossary, and pull-request review gates.
- Recorded the durable decisions that resume is not the candidate, unknown is not missing, and material information should be acquired before generation.

## Current focus

Capability 003 — Information Acquisition is specified but not implemented. The next implementation work should validate evidence sufficiency, source-first retrieval, question ranking, and stopping behavior against the local Candidate Knowledge model.

## Next decision

Define the privacy, consent, and retention boundary for connected sources and user-question acquisition before implementing any source integration.

## Open questions

- What evidence sources are useful, consented, and ethically appropriate beyond local user-entered data?
- What makes available evidence "sufficient" for each bounded artifact or decision?
- What review authority and corroboration threshold are required before outcome evidence changes a priority or skill?
- What experiment can measure whether acquisition improves decision quality without making a causal claim from a single interview outcome?
