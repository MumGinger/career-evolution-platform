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

## Layer 2 — compact project snapshot

Read [`docs/context/project-snapshot.md`](docs/context/project-snapshot.md) for the smallest useful cross-room project state.

The snapshot is intentionally concise. It should answer:

1. What is the product now?
2. What is proven, pending, or unknown?
3. What is the active cross-room objective?
4. What boundaries must not change?
5. What should happen next?

The snapshot does not replace issues, PRs, ADRs, PRDs, tests, or source code. Every important claim should point back to Layer 1 evidence.

## Layer 3 — room-specific handoffs

Each long-running room owns one compact working handoff:

- [`engineering-handoff.md`](docs/context/engineering-handoff.md) — active issue or PR, verification, blockers, and next engineering action.
- [`product-handoff.md`](docs/context/product-handoff.md) — active product question, accepted decisions, options, evidence, and next decision.
- [`research-handoff.md`](docs/context/research-handoff.md) — bounded research question, evidence, hypotheses, limitations, and next research action.
- [`beta-handoff.md`](docs/context/beta-handoff.md) — active Beta stage, direct user observations, artifact judgment, and PASS, FAIL, or UNKNOWN result.

Layer 3 records working state only. Accepted decisions and durable evidence must be written to Layer 1 first. Only changes that affect every room belong in Layer 2.

## Conversation startup

Choose the startup set for the room:

- Engineering: `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `project-snapshot.md`, and `engineering-handoff.md`, followed by live GitHub inspection.
- Product: `PROJECT_CONTEXT.md`, `project-snapshot.md`, and `product-handoff.md`, followed by relevant PRDs, roadmap, issues, decisions, and user evidence.
- Research: `PROJECT_CONTEXT.md`, `project-snapshot.md`, and `research-handoff.md`, followed by research reports, sources, open questions, and accepted product decisions.
- Beta: `PROJECT_CONTEXT.md`, `project-snapshot.md`, and `beta-handoff.md`, followed by the active Beta issue and current shipped repository state.

The exact reusable startup prompt for each room is stored at the end of its handoff file.

## Conversation handoff

Before retiring a long or slow conversation:

1. Finish or truthfully stop the active unit of work.
2. Update the relevant Layer 1 record if durable truth changed.
3. Update that room's Layer 3 handoff with the current working state.
4. Update `docs/context/project-snapshot.md` only when the cross-room objective, verified state, key boundary, blocker, or next project action changed.
5. Commit the update through a reviewed pull request.
6. Start the new room from its stored startup prompt.

See [`docs/context/README.md`](docs/context/README.md) for the update rules.
