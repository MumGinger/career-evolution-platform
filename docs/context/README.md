# Context OS

This directory holds the non-durable context layers defined in [`PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md).

## Files

- [`project-snapshot.md`](project-snapshot.md) — Layer 2 shared state.
- `engineering-handoff.md`, `product-handoff.md`, `research-handoff.md`, `beta-handoff.md` — Layer 3 room handoffs; each room owns only its file.

## Maintain

- Put durable decisions and evidence in Layer 1 first.
- Change the snapshot only for cross-room state.
- Keep handoffs to the next room's active work, evidence, unknowns, and next action.
- Replace stale content; do not append a diary.
- Treat a checkpoint as complete only after its PR is merged.

Use the delivery-state and proof rules in [`AGENTS.md`](../../AGENTS.md) and [`ENGINEERING_LEAD.md`](../../ENGINEERING_LEAD.md). Engineering proof is not Beta Accepted.
