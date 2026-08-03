# ADR-004: Decision Operations Produce Immutable Runs

**Status:** Accepted
**Date:** 2026-08-03

## Context

Information Need prioritization and Evidence Discovery both make bounded policy decisions from changing evidence. Recomputing in place would make it impossible to explain a past result after sources, parsers, or policies change.

## Decision

Every decision-producing operation persists an immutable Run containing exact inputs or stable snapshots, policy and adapter versions, outputs, provenance, rationale, limitations, and creation timestamp. A re-run creates a new record and never rewrites historical output.

## Alternatives Considered

- Recompute decisions in place from current evidence.
- Store only final recommendations without their inputs or policy versions.

Both alternatives make historical explanations unreliable when sources or rules change.

## Consequences

- Historical decisions remain explainable and reproducible against their recorded inputs.
- Candidate Knowledge updates remain separate acceptance operations; a discovery decision cannot promote a candidate automatically.
- New decision capabilities must explicitly retain their bounded snapshots and policy versions.
