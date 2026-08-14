# Current State

**Phase:** Milestone 1 — Fresh applicant Beta ready
**Last updated:** 2026-08-13
**Engineering Beta Ready:** **YES**
**Milestone 1 Accepted:** **NO**
**Beta Accepted:** **NO**

Repository and current GitHub evidence are authoritative if this document becomes stale.

Read `MILESTONE_1.md` before acting on resume product work.

## Issue #147 resolved

The applicant reproduced `Draft blocked` after fully restarting the server, pulling current primary, switching/hard-refreshing the browser, and starting a fresh session. That disproved the stale-runtime hypothesis.

Engineering found a real internal contract mismatch: the drafting provider is allowed to be selective and concise, but validation/readiness had effectively required every included selection to become generated output. The earlier replay fixture was more exhaustive than real provider behavior, so it could pass while a real provider response blocked.

PR **#148** repaired the product boundary:

- source-backed included evidence can remain exact source `KEEP` content in its original resume structure when it is not materially rewritten;
- new/corrected/non-source included facts still require supported generated placement;
- invalid provider selection/requirement citation metadata is dropped per statement rather than invalidating an otherwise complete source-backed resume;
- duplicate Tailoring readiness logic no longer reinterprets a deterministic-valid complete review document;
- a selective/imperfect OpenAI-compatible provider replay now has to complete the natural PDF shipped flow through Export.

PR **#149** then removed a cold-run test timing false negative by increasing Playwright assertion patience from 5 seconds to 15 seconds. It keeps zero retries, the 60-second test ceiling, and all product/validation/PDF assertions unchanged.

Merged primary commits:

- #148: `94a453e90225e11407fb53969f7557ee31fc3c28`
- #149: `a3f43cbee5dd157db2b6d4a124b4b0f6ee6c2d67`

## Final primary gate

Post-merge primary CI run **#326** is fully green:

- Unit and integration — PASS
- HTTP and representative PDF contract — PASS
- Real browser shipped flow — PASS
- machine-bound natural shipped-flow evidence — PASS
- frozen complex pre-Beta candidate — PASS
- machine-bound pre-Beta quality evidence — PASS
- independent Milestone 1 scorecard materialization — PASS
- reviewed PDF quality gate — PASS

**Engineering Beta Ready is restored.**

## Next product action

Run exactly one fresh applicant Beta on current `chore/project-foundation` using the real Ya-Ching resume and Zurich Data Analytics & AI job description.

This Beta is the Milestone 1 acceptance test, not an engineering smoke test. Judge the real flow and final PDF: structural correctness, professional readability, absence of duplicate/broken content, reasonable review burden, target-job relevance, and whether the final resume is genuinely submission-worthy.

If a new hard blocker appears, stop the Beta and revoke Engineering Beta Ready. Do not ask the applicant to diagnose implementation; route the failure back through the engineering/specialist loop and re-gate before another Beta.

## Frozen scope

Do not expand persistent Candidate Knowledge, long-term memory, proactive information acquisition, multiple templates, generic agent-framework work, Career Reflection, Curiosity, autonomous outcome learning, cover letters, job discovery, auto-application, or quantified time-saving optimization until Milestone 1 applicant acceptance is recorded.
