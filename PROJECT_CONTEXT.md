# Project Context

Repository records are the durable truth for the Career Evolution Platform; chat, snapshots, and handoffs are working context.

## Layers

1. **Layer 1 — durable truth:** product and architecture docs, `docs/current-state.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, and GitHub issues, PRs, commits, checks, reviews, tests, and artifacts.
2. **Layer 2 — cross-room state:** [`docs/context/project-snapshot.md`](docs/context/project-snapshot.md). Update only when the project-wide objective, verified state, boundary, blocker, or next action changes.
3. **Layer 3 — room state:** [`docs/context/`](docs/context/README.md). Engineering, Product, Research, and Beta each own one handoff.

Write durable decisions and evidence to Layer 1 first. Current repository and GitHub evidence override stale context. A checkpoint is complete only after its PR is merged.

## Start a room

Read this file, the project snapshot, and the room handoff. Then inspect the relevant Layer 1 records and current GitHub state. Engineering Lead rooms also read `ENGINEERING_LEAD.md` and `AGENTS.md`.

## Close a room

Update Layer 1 if durable truth changed, Layer 2 only for a cross-room change, and the room's Layer 3 handoff for its active state. Merge the checkpoint PR before replacing the conversation.
