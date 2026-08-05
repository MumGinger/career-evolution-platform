# LLM-first Resume Beta Path

This is an efficiency-driven architecture pivot, not feature expansion. For real resumes, the preferred Beta path asks an LLM for bounded, source-backed understanding blocks and for a structured resume draft. The legacy deterministic Resume AST chain remains available for synthetic and offline diagnostic tests.

Every block retains exact source text, a span, explicit confidence/state, provenance, limitations, and hierarchy. Deterministic validation excludes an invalid block without discarding valid evidence. Only accepted or user-edited blocks can reach drafting. Every draft statement carries approved evidence IDs, requirement IDs where applicable, and a rationale; deterministic validation blocks unsupported claims. Career Review still gates export.

Companion View uses grouped evidence and readable resume sections. Developer View exposes the pipeline, provider/model, payload flow, findings, provenance, and export readiness.
