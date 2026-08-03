# ADR-006: Candidate Knowledge Uses an Append-Only Commit Model

**Status:** Accepted
**Date:** 2026-08-03

Candidate Knowledge Integration (003.6) is the sole Capability 003 commit boundary. Immutable Integration Runs and Decisions retain input snapshots, policy version, and provenance. Only `accepted` creates a committed Candidate Fact or revision. Facts retain a many-to-many Evidence Observation link and a decision reference; `duplicate` adds a link only.

Facts are revision-based (`confirms`, `extends`, `supersedes`) and are never silently overwritten or downgraded. Raw, unconfirmed, conflicting, rejected, and deferred evidence remains outside committed Candidate Knowledge.
