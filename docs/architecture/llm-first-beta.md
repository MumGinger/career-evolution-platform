# LLM-first Resume Beta Path

This is an efficiency-driven architecture pivot, not feature expansion. For real resumes, the preferred Beta path asks an LLM for bounded, source-backed understanding blocks and for a structured resume draft. The legacy deterministic Resume AST chain remains available for synthetic and offline diagnostic tests.

Every block retains exact source text, a span, explicit confidence/state, provenance, limitations, and hierarchy. Deterministic validation excludes an invalid block without discarding valid evidence. The validated blocks are persisted as semantic working evidence, then pass through the existing immutable Evidence Review, 003.6 Candidate Knowledge integration, Tailoring, Presentation Strategy, structured draft, draft validation, Career Review, and export gates. Only committed Candidate Knowledge supports the draft; every draft statement retains the existing evidence and requirement provenance. Career Review remains the authoritative export gate.

Companion View uses grouped evidence and readable resume sections. Developer View exposes the pipeline, provider/model, payload flow, findings, provenance, and export readiness.
