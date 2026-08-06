# Context Maintenance

This directory is the repository-local Context OS v0. It keeps AI conversations small without turning summaries into a second source of truth.

## Context layers

### Layer 1 — durable truth

Durable product, architecture, engineering, research, and Beta evidence belongs in the repository's normal records: PRDs, ADRs, roadmap documents, research reports, issues, pull requests, commits, tests, checks, artifacts, and `docs/current-state.md`.

### Layer 2 — cross-room project snapshot

- `project-snapshot.md` — the compact current state shared by every room.

It contains only the product stage, cross-room objective, verified delivery state, major blockers or unknowns, non-negotiable boundaries, and next project action.

### Layer 3 — room-specific working handoffs

- `engineering-handoff.md` — active implementation state.
- `product-handoff.md` — active product decision state.
- `research-handoff.md` — active research state.
- `beta-handoff.md` — active user-testing state.

Each room updates only its own handoff. A room may also update `project-snapshot.md` when its result changes the cross-room project state.

## What belongs in a handoff

Include only information that materially changes how the next room should act:

- the current bounded objective or question;
- accepted or directly verified state;
- unresolved blockers, options, conflicts, or unknowns;
- role-specific evidence needed for the next action;
- the next concrete action.

Do not copy full architecture, PR descriptions, issue histories, test logs, research transcripts, or chat transcripts into a handoff. Link to their durable Layer 1 records instead.

## Update triggers

Update a room handoff when at least one of these changes:

1. The room's active objective or question changes.
2. The active issue, PR, Beta, research question, or product decision changes.
3. New verified evidence changes the next action.
4. A blocker, conflict, option, or unknown materially changes.
5. A long-running conversation is being replaced.

Update `project-snapshot.md` only when at least one of these cross-room states changes:

1. A milestone or user-visible end-to-end flow becomes Proven or Beta Accepted.
2. The project-wide active objective changes.
3. A blocker changes the next project action.
4. A durable product or architecture decision is accepted.
5. A truth boundary or authority rule changes.

Do not update snapshots or handoffs after every commit. Ordinary details belong in Layer 1.

## Room ownership rules

- Engineering Room owns `engineering-handoff.md`.
- Product Room owns `product-handoff.md`.
- Research Room owns `research-handoff.md`.
- Beta Room owns `beta-handoff.md`.
- Any room may propose a `project-snapshot.md` update when its accepted result affects every room.
- One checkpoint PR may update multiple handoffs only when a single accepted event genuinely changes multiple rooms.
- A room must not rewrite another room's unresolved working state from assumptions.

## Required truth language

Engineering delivery uses the repository states exactly:

- **Specified**
- **Prototyped**
- **Implemented**
- **Integrated**
- **Proven**
- **Beta Accepted**

Never convert passing tests into Beta Accepted. Never describe missing CI, private execution, user acceptance, unsupported research, or an undecided product option as PASS or accepted. Record it as FAIL, UNKNOWN, pending, hypothesis, advisory, or under consideration as appropriate.

## Checkpoint procedure

At the end of a long room:

1. Inspect the current authoritative Layer 1 records for that role.
2. Finish or truthfully stop the active unit of work.
3. Update Layer 1 first when durable truth changed.
4. Replace stale handoff state rather than appending a diary.
5. Update `project-snapshot.md` only for a cross-room change.
6. Open a documentation PR and inspect the complete diff.
7. Merge the checkpoint when accurate.
8. Start the new room from the reusable prompt at the end of its handoff file.

A checkpoint is complete only after the relevant PR is merged. The old conversation may contain useful reasoning, but it is not authoritative after the handoff.

## Initial migration from existing rooms

The role handoff files begin with `_not checkpointed_` placeholders. For each existing long-running room:

1. Ask that room to inspect the current repository and its own relevant history.
2. Have it update only its handoff plus any necessary Layer 1 and Layer 2 records.
3. Review and merge the checkpoint PR.
4. Open a new room using the stored startup prompt.

The migrations do not need to happen simultaneously. Each room can checkpoint when its current unit of work is complete or the conversation becomes slow.

## Future extraction rule

Keep Context OS inside this repository while it is specific to this product. Extract shared tooling into a separate repository only after at least two real repositories need the same schema, updater, validation, or automation. Until then, avoid creating a generic platform before the workflow is proven.
