# Context OS

This directory stores non-durable working context. [`PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) defines the authority model.

## Files

- [`project-snapshot.md`](project-snapshot.md) — Layer 2 cross-room state.
- `engineering-handoff.md`, `product-handoff.md`, `research-handoff.md`, `beta-handoff.md` — Layer 3 room state; each room owns only its file.

## Maintain

- Put durable decisions and evidence in Layer 1 first.
- Change the snapshot only for cross-room state.
- Keep handoffs to active work, verified evidence, unknowns, and one next action.
- Replace stale content; do not append a diary.
- Preserve PASS, FAIL, UNKNOWN, hypothesis, pending, and accepted distinctions.
- Engineering proof is not Beta Accepted.
- A checkpoint is complete only after its PR is merged.

Start the next room from its handoff's `Start` section, then inspect current repository and GitHub evidence.
