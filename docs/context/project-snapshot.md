# Project Snapshot

**As of:** 2026-08-13 — Milestone 1 engineering gate restored; fresh applicant Beta may resume
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`
**Engineering Beta Ready:** **YES**
**Milestone 1 Accepted:** **NO**
**Beta Accepted:** **NO**

Repository and current GitHub evidence override stale context.

## Current state

Issue **#147** is resolved. The fresh real-applicant `Draft blocked` reproduction was not a browser/cache problem. The owning failure was a contract mismatch between selective provider drafting and internal validation/readiness: source-backed included evidence was effectively required to become generated output even when the provider legitimately left the original resume wording unchanged.

PR **#148** repaired the boundary and merged as `94a453e90225e11407fb53969f7557ee31fc3c28`:

- exact source-backed included evidence may remain an auditable `KEEP` in its original resume structure;
- genuinely new, corrected, or otherwise non-source-backed included facts still require supported generated placement;
- malformed provider selection/requirement citation metadata is rejected per statement instead of poisoning an otherwise complete source-backed resume;
- Tailoring readiness relies on deterministic validation plus a complete applicant review document rather than a second generated-output coverage rule;
- an adversarial natural browser E2E now exercises a selective OpenAI-compatible provider response plus a malformed requirement citation and must still complete Resume Input → Tailoring Review → Draft → Career Review → Export.

Primary post-merge CI then exposed a separate cold-run quality-proof timing flaw: the same frozen candidate passed in the full browser suite but its immediate standalone rerun could hit Playwright's 5-second assertion timeout before the async PDF-to-Tailoring transition settled. PR **#149** merged as `a3f43cbee5dd157db2b6d4a124b4b0f6ee6c2d67`, increasing browser assertion patience to 15 seconds while preserving the 60-second test ceiling, zero retries, and every Draft-block/PDF assertion.

## Final engineering proof

Primary CI run **#326** on `chore/project-foundation` is green after both repairs:

- unit and integration: PASS;
- HTTP and representative PDF contract: PASS;
- real browser shipped flow: PASS;
- machine-bound natural shipped-flow evidence: PASS;
- frozen complex pre-Beta candidate: PASS;
- machine-bound pre-Beta quality evidence: PASS;
- independently reviewed Milestone 1 scorecard materialization: PASS;
- reviewed PDF quality gate: PASS.

This restores **Engineering Beta Ready = YES** for the #147 blocker.

## What remains for Milestone 1

Milestone 1 is **not accepted yet**. The next step is one fresh applicant Beta using the real Ya-Ching resume + Zurich Data Analytics & AI job description on current primary. The applicant must judge the shipped flow and final PDF, including whether the resume is structurally normal, professionally readable, non-duplicative, job-relevant, and submission-worthy.

A technical completion alone is not Beta acceptance. If the real applicant flow exposes another hard blocker, Engineering Beta Ready is revoked again and the failure stays inside the engineering/specialist loop until re-gated.

## Frozen scope

Milestone 1 remains intentionally narrow. Do not expand persistent Candidate Knowledge, long-term memory, proactive information acquisition, multiple templates, generic agent-framework work, Career Reflection, Curiosity, autonomous outcome learning, cover letters, job discovery, auto-application, or quantified time-saving optimization until the final Milestone 1 applicant acceptance decision is recorded.
