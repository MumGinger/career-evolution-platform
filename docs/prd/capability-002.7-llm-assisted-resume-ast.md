# Capability 002.7 — LLM-Assisted Resume AST

**Status:** Implemented for explicit offline/mock and OpenAI-compatible paths | **Policy:** `resume-ast-validation/1.1.0`

The preferred blocking path is provider-proposed canonical Resume AST followed by deterministic source-span validation, immutable run persistence, and direct requirement-driven evidence retrieval. Each run records the source artifact/version, provider/model/version, prompt/schema version, raw-response hash, normalized AST, findings, and timestamp.

Resume AST is working evidence only. It never infers proficiency, years, leadership, ownership, impact, or outcomes, and only existing 003.6 integration may write Candidate Knowledge. Structurally grouped and possible evidence requires confirmation. 002.5 and 002.6 remain compatible optional/lazy fallback and explainability paths.

Exit criteria: source identity and grouping correct; provenance passes; expected evidence matches rank; and no unconfirmed Candidate Knowledge writes.

The canonical JSON Schema is sent using strict structured output and independently enforced locally before provenance validation. Provider timeout/rejection fails safely; invalid provider JSON/schema creates a blocked immutable run. Exact leaves may be accepted by Discovery while possible/structurally grouped leaves remain confirmation-required.
