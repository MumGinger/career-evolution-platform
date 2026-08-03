# Product Roadmap

| Capability | Status | Purpose |
| --- | --- | --- |

For 002.7, “Complete” means the offline/mock path now validates nested AST leaves, preserves `structurally_grouped` placement, retrieves ranked AST blocks directly, and keeps all but explicit skill/tool evidence behind confirmation; it does not modify Candidate Knowledge outside 003.6.
| 002.7 — LLM-Assisted Resume AST | Complete (offline/mock) | Preferred blocking path with provenance validation and direct retrieval. |
| 002.5 — Resume Semantic Understanding | Complete | Create immutable, traceable resume semantic candidates before Information Acquisition. |
| 002.6 — Resume Semantic Graph Construction | Complete | Build immutable, provenance-preserving graph candidates from 002.5 working evidence before Information Acquisition. |
| 001 — Application Evidence Loop | Complete | Record applications, artifacts, and outcome/preference evidence without automatic learning. |
| 002 — Resume Intake & Candidate Knowledge Bootstrap | Complete | Import explicit resume evidence into traceable Candidate Knowledge facts; ambiguous facts remain `needs_confirmation`. |
| 003.1 — Job Intelligence | Complete | Create deterministic, explainable Requirement Profiles from job context. |
| 003.2 — Information Need Prioritization | Complete | Identify and prioritize material unresolved candidate information. |
| 003.3 — Evidence Discovery | Complete | Search bounded, consented evidence and record candidates, resolutions, and sufficiency. |
| 003.4 — Acquisition Planning | Complete | Produce an Acquisition Plan that selects the highest-value permitted strategy for each unresolved Information Need. |
| 003.5 — Acquisition Execution | Complete | Execute immutable plans through deterministic local actions and capture raw evidence without integration. |
| 003.6 — Candidate Knowledge Integration | Complete | Deterministically commit only accepted bounded evidence into append-only Candidate Knowledge through its sole Capability 003 write path. |
| 004.1 — Resume Tailoring Planning | Complete | Create immutable, truth-preserving selection and coverage plans from committed Candidate Knowledge and job requirements. |
| 004.2 — Resume Artifact Generation | Complete | Deterministically render structured, provenance-preserving intermediate resume artifacts from immutable tailoring plans. |
| 004.3 — Truthfulness & Quality Validation | Complete | Deterministically validate immutable artifacts against plan, fact provenance, claim scopes, and traceability before output. |
| 005 — Job Discovery | Planned | Discover and evaluate job opportunities. |
| 006 — Application Automation | Planned | Support bounded, reviewable application workflows. |
| 007 — Outcome Learning | Planned | Learn priorities and guidance from reviewed application and interview outcomes. |

Capabilities are delivered in order only when their evidence, privacy, review, and product boundaries are ready. A roadmap item is not authorization to implement it.

Milestone 1 Demo — End-to-End Resume Tailoring Pipeline is complete. It integrates existing 002, 003, and 004 slices into one deterministic local demo with fixture-supported confirmation, exported outputs, and no new domain capability.
