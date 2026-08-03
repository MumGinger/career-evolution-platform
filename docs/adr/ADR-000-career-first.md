# ADR-001: Validate Career First

**Status:** Accepted  
**Date:** 2026-08-02

## Context

The project began with interest in an adaptive AI framework. A framework designed before a real product risks solving imagined problems and encoding abstractions that do not survive contact with users.

## Decision

Build the Career Evolution Platform as the first product and validation domain. Design only the components needed to test its evidence-based evolution loop. Extract a reusable framework later, from patterns observed repeatedly in product implementation and validation.

## Consequences

- Early code and documentation may be explicitly Career-specific.
- Reuse is evaluated through demonstrated patterns, not anticipated ones.
- Framework work is deferred until product evidence supports clear boundaries and interfaces.
- Architecture decisions must favor traceability of evidence, review, and skill updates.
