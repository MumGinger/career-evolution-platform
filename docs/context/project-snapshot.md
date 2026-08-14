# Project Snapshot

**As of:** 2026-08-13 — Fresh Beta regression under repair
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`
**Engineering Beta Ready:** **NO**
**Milestone 1 Accepted:** **NO**
**Beta Accepted:** **NO**

Repository and current GitHub evidence override stale context.

## Current product state

Milestone 1 remains **Reliable Resume Tailoring**. The previously recorded engineering Beta-ready checkpoint was invalidated by fresh real-applicant evidence.

Fresh Beta reached:

- `3 of 5 · Draft blocked`;
- 40 resume blocks read;
- 40 matched to source;
- 0 excluded;
- **0 concrete changes**;
- no reliable path to Career Review.

Developer View simultaneously showed source-understanding success (`Valid: 40`, `Validation reasons: none`). Those diagnostics were stale for the later Draft stage and did not explain the actual block.

Fresh Beta is stopped. Active blocker: **#147 — zero-change real resume still Draft blocked**.

## Why prior CI missed it

The same failure class had previously been addressed under #140 with a dedicated browser regression for the deterministic-valid zero-material-change path. During later restructuring, `tests/browser-e2e/issue140-no-change-flow.spec.js` disappeared from the current browser suite.

The three browser scenarios used for the previous pre-Beta gate therefore did not cover this exact path. A green 3/3 result was insufficient evidence for real zero-change input.

## Current repair direction

The no-change path is being repaired at the readiness boundary:

```text
real resume + job
  -> deterministic-valid complete draft
  -> zero material wording changes
  -> no fake Tailoring decision required
  -> Draft
  -> Career Review
  -> export
```

A deterministic-valid complete zero-change resume must not depend on brittle selection-id/source-equivalence matching merely to become reviewable.

Strict boundaries remain:

- deterministic validation failure blocks;
- material rewrite placement/support failure blocks;
- unsupported/invented claims remain forbidden;
- complete resume structure and final review/export equivalence remain protected.

A permanent current browser regression has been restored as `tests/browser-e2e/issue147-zero-change-flow.spec.js`.

## Previous internal evidence

The earlier frozen development PDF remains historical evidence only:

`SHA-256 7fc13d318695959eb25e5a0919f83bc52e548f6d80c7307e57683d97b7b7e768`

It scored 90/100 with all critical criteria PASS for that candidate, but it no longer establishes Engineering Beta Ready because fresh Beta exposed a shipped-flow path not covered by the current suite.

## Exit before Beta resumes

Do not restart human Beta until:

1. #147 current zero-change browser regression passes;
2. existing material-change/correction flows still pass;
3. HTTP/PDF, unit/integration, and all browser E2E pass on the latest primary head;
4. exact pre-Beta runtime/PDF gate passes again;
5. durable docs are returned to Engineering Beta Ready only after that evidence exists.

## Frozen scope

Do not expand persistent Candidate Knowledge, long-term memory, proactive information acquisition, multiple templates, generic agent-framework work, Career Reflection, Curiosity, autonomous outcome learning, cover letters, job discovery, auto-application, or quantified time-saving optimization while #147 remains open.