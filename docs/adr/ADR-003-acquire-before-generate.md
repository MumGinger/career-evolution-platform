# ADR-003: Acquire Before Generate

**Status:** Accepted
**Date:** 2026-08-02

## Context

Generating a recommendation, resume, or other career artifact from incomplete evidence can make the output polished but materially wrong. Asking users every possible question is also costly and reduces trust.

## Decision

Before a material decision or generation step, assess unresolved information value and acquire only the highest-value evidence through existing sources, connected sources, or a focused user question. Generation proceeds when evidence is sufficient for the bounded purpose.

## Alternatives Considered

- Generate immediately from the resume or current profile.
- Require complete data collection before every generation.

The first risks unsupported output; the second turns the product into an endless form.

## Consequences

- Information priority and stopping rules are product behavior.
- Source lookup precedes questions whenever it is lower effort and appropriate.
- The system must explain material evidence gaps and avoid inventing facts when proceeding with partial evidence.
