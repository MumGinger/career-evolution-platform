# ADR-001: Resume Is Not the Candidate

**Status:** Accepted
**Date:** 2026-08-02

## Context

A resume is curated for a purpose and may omit, compress, or predate relevant experience. Treating it as the complete candidate makes omissions appear negative and causes later sources to overwrite the person rather than enrich their knowledge.

## Decision

Candidate Knowledge is the source of truth for candidate facts. A resume is a source and snapshot within that knowledge, with provenance, confidence, and confirmation state retained for imported facts.

## Alternatives Considered

- Use the latest resume as the candidate record.
- Regenerate a canonical resume and use it as the candidate record.

Both alternatives collapse source-specific omissions and uncertainty into a false complete profile.

## Consequences

- Resume intake may bootstrap Candidate Knowledge but cannot invent or silently normalize facts.
- Later sources may corroborate, extend, or conflict with resume evidence without erasing provenance.
- Artifact generation must draw from Candidate Knowledge and state unresolved material uncertainty.
