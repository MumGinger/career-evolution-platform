# Project Context

This repository, not chat history, is the durable source of truth for the Career Evolution Platform.

Use this file as the fast entry point for ChatGPT, Codex, and human contributors.

## Layer 1 — durable project truth

Layer 1 contains evidence and decisions that should survive every conversation:

- `README.md` — product and runnable workflow overview.
- `docs/vision/` — mission and long-term direction.
- `docs/principles/` — non-negotiable product rules.
- `docs/roadmap/` — intended delivery sequence.
- `docs/architecture/` — accepted system boundaries and information flow.
- `docs/adr/` — durable architecture and product decisions.
- `docs/prd/` — capability-level product behavior and scope.
- `docs/current-state.md` — detailed delivery history and current product focus.
- `ENGINEERING_LEAD.md` and `AGENTS.md` — repository working agreements.
- GitHub issues, pull requests, commits, checks, and review threads — implementation and acceptance evidence.

When a summary conflicts with these sources, Layer 1 wins.

## Layer 2 — compact working context

Read [`docs/context/project-snapshot.md`](docs/context/project-snapshot.md) for the smallest useful current project state.

The snapshot is intentionally concise. It should answer:

1. What is the product now?
2. What is proven, pending, or unknown?
3. What is the active objective?
4. What boundaries must not change?
5. What should happen next?

The snapshot does not replace issues, PRs, ADRs, PRDs, tests, or source code. Every important claim should point back to Layer 1 evidence.

## Conversation startup

For a new Engineering Lead conversation, use:

> Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, and `docs/context/project-snapshot.md`. Then inspect current GitHub issues, pull requests, recent merges, and checks before acting.

For Product or Beta conversations, read the same project context, then the relevant PRD, issue, or beta record.

## Conversation handoff

Before retiring a long or slow conversation:

1. Finish or truthfully stop the active unit of work.
2. Update the relevant Layer 1 record if a durable decision or implementation state changed.
3. Update `docs/context/project-snapshot.md` only when the active objective, verified state, key boundary, or next action changed.
4. Commit the update through a reviewed pull request.
5. Start the new conversation from the startup message above.

See [`docs/context/README.md`](docs/context/README.md) for the update rules.