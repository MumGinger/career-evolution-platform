# ADR-005: Candidate Knowledge Has a Single Write Path

**Status:** Accepted
**Date:** 2026-08-03

## Context

Capability 003 separates identifying a need, discovering possible evidence, choosing an acquisition strategy, executing that strategy, and accepting durable candidate facts. If discovery, planning, or execution can each modify Candidate Knowledge, an intermediate policy decision, connector result, or unanswered request could be mistaken for a confirmed fact. That would weaken provenance, conflict handling, auditability, and the distinction between unknown and negative.

## Decision

Candidate Knowledge has one Capability 003 write path: **Candidate Knowledge Integration (003.6)**.

- 003.1 Job Intelligence, 003.2 Information Need Prioritization, and 003.3 Evidence Discovery are read-only with respect to Candidate Knowledge.
- 003.4 Acquisition Planning produces an Acquisition Plan; it does not execute actions or write facts.
- 003.5 Acquisition Execution records action results and Evidence Candidates; it does not directly write Candidate Knowledge.
- 003.6 resolves eligible evidence under integration policy and records either an auditable Candidate Knowledge update or an explicit non-integration decision.

Questions are Acquisition Actions, not domain entities or automatic facts. A user response, imported source, or connector result remains evidence until 003.6 deliberately accepts it.

## Alternatives Considered

- Let Evidence Discovery promote sufficiently strong candidates automatically.
- Let Acquisition Execution directly update Candidate Knowledge after an action succeeds.
- Treat a user question and answer as a direct profile edit.

These alternatives collapse evidence collection and fact acceptance, making it difficult to explain why a durable fact exists or to protect Candidate Knowledge from weak, conflicting, or unconfirmed evidence.

## Consequences

- Candidate Knowledge remains a durable, traceable source of truth with a clear acceptance boundary.
- All Capability 003 intermediate records can remain immutable and explainable without becoming profile writes.
- Integration policy must define confirmation, conflict, provenance, and correction rules before 003.6 runtime work begins.
- Existing resume bootstrap behavior must remain compatible with this acceptance boundary or be explicitly governed as a separate ingestion path.
