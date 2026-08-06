# Context Maintenance

This directory is the repository-local Context OS v0. It keeps AI conversations small without turning summaries into a second source of truth.

## Files

- `project-snapshot.md` — the compact, current handoff shared across roles.
- Future role-specific handoffs may be added only when one shared snapshot is no longer sufficient.

## What belongs in the snapshot

Include only information that materially changes how the next contributor should act:

- current product stage;
- active user-visible objective;
- verified delivery state;
- unresolved blockers or unknowns;
- non-negotiable truth and authority boundaries;
- latest relevant issue, PR, test, or beta evidence;
- next concrete action.

Do not copy full architecture, PR descriptions, issue histories, test logs, or chat transcripts into the snapshot. Link to their durable repository records instead.

## Update triggers

Update `project-snapshot.md` when at least one of these changes:

1. A milestone or user-visible end-to-end flow becomes Proven or Beta Accepted.
2. The active objective changes.
3. A blocker changes the next action.
4. A durable product or architecture decision is accepted.
5. A truth boundary or authority rule changes.
6. A long-running conversation is being replaced and its current state is not already represented.

Do not update the snapshot after every commit. Ordinary implementation details belong in the issue, pull request, commit, tests, or `docs/current-state.md`.

## Required status language

Use the repository delivery states exactly:

- **Specified**
- **Prototyped**
- **Implemented**
- **Integrated**
- **Proven**
- **Beta Accepted**

Never convert passing tests into Beta Accepted. Never describe missing CI, private execution, or user acceptance as PASS. Record it as UNKNOWN or pending.

## Handoff procedure

At the end of a long Engineering room:

1. Inspect the merged PRs, open issues, current branch, and latest checks.
2. Update Layer 1 records first when durable truth changed.
3. Replace stale snapshot statements rather than appending a diary.
4. Keep the snapshot readable in a few minutes.
5. Open a documentation PR and review the resulting diff.
6. Start the new room from `PROJECT_CONTEXT.md`.

The old conversation may contain useful reasoning, but it is not authoritative after the handoff.

## Future extraction rule

Keep Context OS inside this repository while it is specific to this product. Extract shared tooling into a separate repository only after at least two real repositories need the same schema, updater, validation, or automation. Until then, avoid creating a generic platform before the workflow is proven.