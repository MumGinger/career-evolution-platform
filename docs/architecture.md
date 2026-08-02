# Architecture

## Product-first boundary

The system is organized around the Career Evolution Platform, not around a prebuilt framework. Product capabilities drive architecture; abstractions must earn their place through repeated use.

## Evolution loop

```text
Career action or artifact
        ↓
Evidence capture
        ↓
Contextual review
        ↓
Skill update decision
        ↓
Improved future output
```

## Principles

- **Evidence is contextual.** Store source, timing, affected artifact or action, and relevant conditions.
- **Feedback is not truth.** Feedback is one evidence type; it may be incomplete, biased, contradictory, or out of date.
- **Updates are deliberate.** A review step determines whether evidence warrants a skill change.
- **Traceability matters.** A material output or skill update should be explainable through the evidence and decision that informed it.
- **Abstractions follow validation.** Components remain Career-specific until evidence supports extraction.

## Initial conceptual components

1. Career workflow and artifacts
2. Evidence records
3. Review and decision records
4. Versioned skill definitions
5. Output generation informed by approved skills

Interfaces and runtime choices are intentionally deferred until Phase 0 validation produces concrete requirements.
