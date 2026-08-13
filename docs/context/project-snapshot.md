# Project Snapshot

**As of:** 2026-08-13 — Milestone 1 product/development reset
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`
**Milestone 1 Accepted:** **NO**
**Beta Accepted:** **NO**

Repository and current GitHub evidence override stale context.

## Product state

Beta #1 through Beta #9 are historical **FAIL** results. The repeated failure pattern is that the project has not yet made the basic resume vertical slice consistently trustworthy enough for a real applicant.

The project is now explicitly frozen on **Milestone 1 — Reliable Resume Tailoring**. Read `MILESTONE_1.md` for the authoritative product/exit contract.

Milestone 1 is intentionally basic:

```text
real resume PDF + real job description
  -> system understanding
  -> applicant correction
  -> tailored review
  -> professional 1–2 page final PDF
```

The final PDF is the primary product artifact.

## Latest merged engineering floor

PR #144 (`Pre-Beta complex golden shipped-flow gate`) merged on 2026-08-13.

It provides a valuable regression floor:

- complex deidentified master-resume-shaped PDF input;
- natural shipped browser flow;
- real provider classes against deterministic replay;
- targeting, validation, Draft, Career Review, and export;
- Skills narrowing and project prioritization;
- no known parent/child duplication or blank/glyph bullets in the frozen candidate;
- one-page final PDF;
- exact runtime-evidence/final-PDF hash binding;
- current CI green;
- representative independent score 91/100.

This is engineering evidence only. It does **not** establish Milestone 1 or Beta acceptance. The reviewed candidate still recorded a broad Summary, utilitarian typography, unused page whitespace, and remaining visual refinement.

## New Milestone 1 priority

Priority order:

1. natural end-to-end completion;
2. final-PDF structural correctness;
3. professional typography/layout/page composition;
4. no duplication or malformed content;
5. applicant correction persistence;
6. credible JD relevance and supported prioritization;
7. deeper content intelligence later.

90/100 remains the internal quality target, not an inflexible mathematical law. Hard blockers are absolute. A documented sub-90 exception is allowed only when every critical criterion passes and remaining deductions are non-material; material PDF/design/structure/E2E defects cannot be overridden.

## Architecture direction

Substantial restructuring is authorized when it simplifies the vertical slice.

Preferred durable Milestone 1 boundary:

```text
Source Resume PDF + Job Description
  -> Resume Parser
  -> Canonical Resume Document
  -> Targeting / explicit edit operations
  -> Reviewed Resume Document
  -> Professional Renderer
  -> Final PDF
```

The resume document owns artifact structure. Source evidence owns factual support. Candidate Knowledge / persistent career memory is not a Milestone 1 blocking requirement.

Do not keep patching a fragmented boundary merely because prior code exists. If the same failure class survives two repair cycles, restructure the earliest broken boundary.

## Development evidence required before human Beta

- primary Ya-Ching + Zurich-shaped development golden;
- natural E2E PASS;
- all hard blockers PASS;
- actual final PDF inspected by design/quality review;
- professionally credible internal score;
- at least three materially different resume shapes complete the natural E2E without structural breakage.

Only then start the next fresh human Beta.

## Frozen scope

Do not expand persistent Candidate Knowledge, long-term memory, proactive information acquisition, multiple templates, generic agent-framework work, Career Reflection, Curiosity, autonomous outcome learning, cover letters, job discovery, auto-application, or quantified time-saving optimization until Milestone 1 exits.

## Active execution rhythm

One Milestone blocker at a time:

```text
real-shaped regression
  -> earliest-boundary repair/restructure
  -> natural E2E
  -> final PDF inspection
  -> specialist review
  -> independent score
  -> internal repair loop
  -> Milestone Exit Candidate
  -> fresh human Beta
```
