# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo does not use the plain `CONTEXT.md` convention. It has its own layered context system — read these instead:

## Before exploring, read these

- **[`PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md)** at the repo root — the durable-truth index. Explains the three layers below and how they relate.
- **[`docs/context/project-snapshot.md`](../context/project-snapshot.md)** — cross-room state: the current project-wide objective, verified state, boundary, blocker, and next action.
- **[`docs/context/`](../context/README.md)** — room-scoped handoffs (Engineering, Product, Research, Beta). Read the handoff for the room relevant to the topic, e.g. [`engineering-handoff.md`](../context/engineering-handoff.md) for implementation work.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. This repo is single-context, so all ADRs live at `docs/adr/` (no per-context `src/<context>/docs/adr/` split).
- **`ENGINEERING_LEAD.md`** and **`AGENTS.md`** — read before implementation decisions; they define ownership, delegation, and the working agreement for agents in this repo.

If any of these files don't exist, proceed silently. Don't flag their absence; don't suggest creating them upfront.

## File structure

```
/
├── PROJECT_CONTEXT.md         ← layer index (Layer 1 pointer)
├── ENGINEERING_LEAD.md
├── AGENTS.md
├── docs/
│   ├── context/                ← Layer 2 (project-snapshot.md) and Layer 3 (room handoffs)
│   ├── adr/                    ← system-wide decisions
│   ├── vision/
│   ├── architecture/
│   ├── prd/
│   ├── principles/
│   ├── roadmap/
│   └── current-state.md
└── src/
```

## Use the glossary's vocabulary

Domain terms are recorded in [`docs/glossary.md`](../glossary.md) rather than a `CONTEXT.md`. When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined there. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-004 (decision operations produce immutable runs) — but worth reopening because…_

## Durable truth over stale context

Per `PROJECT_CONTEXT.md`: current repository and GitHub state override stale context. If `docs/context/` handoffs conflict with Layer 1 records (product/architecture docs, `docs/current-state.md`, ADRs, or current GitHub state), trust Layer 1.
