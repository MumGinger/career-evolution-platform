# ADR-002: Unknown Is Not Missing

**Status:** Accepted
**Date:** 2026-08-02

## Context

Career evidence is incomplete by default. A resume may not mention a skill, project, credential, or outcome even when it exists. Collapsing an unknown field to `false`, absent, or missing produces unsupported negative claims and prevents useful discovery.

## Decision

Model unknown as a first-class state, distinct from a confirmed absence or missing required field. Unknown may trigger bounded information acquisition; it must not be emitted as a negative candidate claim.

## Alternatives Considered

- Treat fields absent from a source as `false`.
- Use a single nullable field without state semantics.

These alternatives lose the distinction between lack of evidence, confirmed absence, and evidence requiring confirmation.

## Consequences

- Data and UI behavior must preserve uncertainty and provenance.
- Recommendations may describe evidence gaps but cannot claim the candidate lacks the attribute.
- Acquisition stops when evidence is sufficient, not when every unknown is eliminated.
