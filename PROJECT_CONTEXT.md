# Project Context

Repository records are the durable truth for the Career Evolution Platform; chat and handoffs are working context.

## Context layers

1. **Layer 1 — durable truth:** `README.md`, `docs/vision/`, `docs/principles/`, `docs/roadmap/`, `docs/architecture/`, `docs/adr/`, `docs/prd/`, `docs/current-state.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, and GitHub issues, PRs, commits, checks, and review threads.
2. **Layer 2 — cross-room snapshot:** [`docs/context/project-snapshot.md`](docs/context/project-snapshot.md). Update only when a cross-room objective, verified state, boundary, blocker, or next action changes.
3. **Layer 3 — room handoffs:** [`docs/context/`](docs/context/README.md). Each room updates only its own handoff.

Write durable decisions and evidence to Layer 1 first. A checkpoint is complete only when its PR is merged. Current repository and GitHub evidence override a stale snapshot or handoff.

## Start a room

Read this file, the snapshot, and the handoff for the room. Then inspect the Layer 1 records for the task; Engineering Lead rooms also read `ENGINEERING_LEAD.md`. Follow the room handoff's startup links.

## Handoff

Before closing a room, write durable changes to Layer 1, update Layer 2 only for a cross-room change, and update that room's Layer 3 handoff. Land the checkpoint through a merged PR.
