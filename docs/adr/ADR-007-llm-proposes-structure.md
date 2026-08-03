# ADR-007: LLM proposes structure; deterministic validation establishes admissible working evidence

Provider output is a proposal, not a candidate fact. Providers are a deterministic mock or OpenAI-compatible API configured exclusively through environment variables. The system persists a response hash, not raw private responses. Deterministic validation removes any leaf that cannot be reconstructed from its exact source spans.

The Demo defaults to graph-free `resume_ast` retrieval. Semantic graph construction is explicit/lazy (`--build-semantic-graph`). This preserves 003.6 as the sole Candidate Knowledge writer. Provider execution is asynchronous and the OpenAI-compatible request carries the complete canonical JSON Schema with strict structured output; the returned JSON is locally schema-validated before provenance validation. Invalid JSON/schema is persisted as a blocked immutable run. Real PDF imports require explicit provider selection and never silently fall back to mock.
