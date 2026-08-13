# Current State

**Phase:** Milestone 1 — Reliable Resume Tailoring
**Last updated:** 2026-08-13
**Milestone 1 Accepted:** **NO / NOT YET**
**Beta Accepted:** **NO / NOT YET**

Repository and current GitHub evidence are authoritative if this document becomes stale.

Read `MILESTONE_1.md` before acting on resume product work.

## Product reset

The project is intentionally narrowing back to the basic resume vertical slice.

Milestone 1 exists to prove one simple product outcome:

> real resume PDF + real job description -> understandable correction/review workflow -> professional, job-relevant, normal 1–2 page final resume PDF that the applicant can reasonably submit.

The project must not advance broader career-platform scope while this basic outcome is still unreliable.

## Current evidence

Beta #1 through Beta #9 are historical **FAIL** results. They repeatedly exposed basic workflow, structure, duplication, review, content-selection, and final-PDF quality failures.

PR #144 (`Pre-Beta complex golden shipped-flow gate`) merged on 2026-08-13. It establishes a useful engineering floor:

- a complex deidentified master-resume-shaped candidate completes the natural shipped browser flow;
- real PDF intake, provider boundaries, targeting, validation, Draft, Career Review, and export are exercised;
- the frozen candidate produces a one-page PDF without known clipping, blank bullets, parent/child duplication, or structural corruption;
- current CI passed on the merged head;
- the representative frozen candidate scored 91/100.

This proof is **not Milestone 1 acceptance and not Beta acceptance**. The scorecard itself still recorded a broad Summary, utilitarian typography, unused lower-page whitespace, and room for visual refinement.

## New priority order

For Milestone 1, prioritize:

1. natural end-to-end completion;
2. final PDF structural correctness;
3. professional typography/layout/page composition;
4. no duplication or malformed resume content;
5. applicant correction persistence;
6. credible JD relevance and content prioritization;
7. deeper career-content intelligence only after the basic product is stable.

The final PDF is the primary product artifact.

## Hard blockers before Beta

Do not start a fresh Beta while any of these are present:

- natural E2E cannot complete;
- PDF export fails;
- blank or orphan bullets;
- wrong section identity;
- wrong entry ownership or cross-entry bleed;
- title/body or parent/child duplication;
- obvious repeated source/tailored content;
- broken wrapping, glyphs, clipping, spacing, or pagination;
- user corrections not reflected in later review/export;
- unsupported/invented claims;
- final PDF visibly incomplete or not recognizable as a normal professional resume.

The internal quality score target remains about 90/100, but it is a professional QA target rather than an inflexible mathematical law. Hard blockers are absolute.

## Architecture direction

Substantial restructuring is allowed if it simplifies and stabilizes the basic resume product.

Preferred long-lived Milestone 1 boundary:

```text
Source Resume PDF + Job Description
  -> Resume Parser
  -> Canonical Resume Document
  -> Targeting / Edit Operations
  -> Reviewed Resume Document
  -> Professional Renderer
  -> Final PDF
```

The canonical resume document should own artifact structure. Source evidence should own factual support. Candidate Knowledge and persistent long-term career memory are not Milestone 1 blocking requirements.

Do not preserve a fragmented architecture merely because code already exists. If the same failure class survives two repair cycles, stop patching and repair/restructure the earliest broken boundary.

## Development proof

Primary development golden: Ya-Ching master-resume shape + Zurich Data Analytics & AI job-description shape, deidentified where committed fixtures are required.

Milestone exit requires at least three materially different resume shapes to complete the natural shipped E2E flow and produce professional 1–2 page PDFs without structural breakage.

Only after the internal artifact is credible should the real applicant run the next fresh Beta.

## Out of scope until Milestone 1 exits

Freeze expansion of:

- persistent Candidate Knowledge database / long-term user memory;
- proactive career-information acquisition;
- multiple resume templates;
- generic agent-framework development;
- Career Reflection / Curiosity workflows;
- autonomous outcome learning;
- cover letters;
- job discovery;
- automatic application;
- quantified time-savings optimization.

## Active execution rhythm

One active Milestone blocker at a time:

```text
real-shaped regression
  -> earliest-boundary repair
  -> natural E2E
  -> actual final PDF inspection
  -> specialist structure/content/design review
  -> independent score
  -> internal repair loop
  -> Milestone Exit Candidate
  -> fresh human Beta
```

Fresh Beta should discover genuine applicant-product learning, not obvious structural or PDF QA defects.
