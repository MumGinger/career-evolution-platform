# Capability 002.7 — LLM-Assisted Resume AST

**Status:** Implemented for offline/mock Demo | **Policy:** `resume-ast-validation/1.1.0`

The preferred blocking path is provider-proposed canonical Resume AST followed by deterministic source-span validation, immutable run persistence, and direct requirement-driven evidence retrieval. Each run records the source artifact/version, provider/model/version, prompt/schema version, raw-response hash, normalized AST, findings, and timestamp.

Resume AST is working evidence only. It never infers proficiency, years, leadership, ownership, impact, or outcomes, and only existing 003.6 integration may write Candidate Knowledge. `structurally_grouped` means the exact source text passed provenance validation but its parent placement was inferred from layout/order. Retrieval ranks validated blocks directly and records rank, score, exactness, block kind, section, and rationale. Only an exact explicit `skill` or `tool` with valid provenance may be accepted automatically; project, organization, role, bullet, `structurally_grouped`, and `possible` evidence requires `confirm | reject | edit`. 002.5 and 002.6 remain compatible optional/lazy fallback and explainability paths.

Exit criteria: source identity and grouping correct; provenance passes; expected evidence matches rank; and no unconfirmed Candidate Knowledge writes.
