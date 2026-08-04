# Evidence Review MVP

**Status:** Implemented for local CLI beta

## Product flow

`Resume → Resume AST → Requirement-driven Evidence Retrieval → Evidence Review → 003.6 Candidate Knowledge Integration → Tailoring → Artifact → Validation`.

The MVP reviews only `needs_confirmation` candidates. A person sees a requirement and ranked evidence with source text, source type, extraction state, score, retrieval rationale, and provenance. They may accept, skip, or edit. An edit is accepted only when it is an exact, bounded representation of the selected source evidence; otherwise it is recorded as blocked.

## Boundaries

Each run records immutable snapshots of the profile, job profile, discovery run, decisions, action, source references, actor, timestamp, and notes. The review queue never writes Candidate Knowledge. It produces explicit proposals for 003.6, the only Candidate Knowledge writer. Unreviewed, skipped, and blocked evidence creates no fact.

After integration the CLI creates a fresh tailoring plan, truthful Markdown resume artifact, and membership validation report. It writes portable JSON, Markdown, and HTML outputs. The leading KPI is user review effort and committed coverage, not parser accuracy.

## Beta exit criteria

- A first-time user can run a real resume and real job description in about ten minutes.
- Only reviewed, source-supported content is committed.
- Supported decisions regenerate and validate an updated resume.
- Fixture mode is reproducible and stdin-free; interactive mode remains available.
