# Milestone 1 — Reliable Resume Tailoring

## Purpose

Milestone 1 proves the most basic product promise before any broader career-intelligence work continues:

> Given a real resume PDF and a real job description, produce a normal, professional, application-specific resume PDF that the applicant can review, correct, and reasonably submit.

Milestone 1 is intentionally narrow. It does not prove the full Career Evolution Platform vision.

## Primary product artifact

The primary artifact is `final-resume.pdf`.

A Milestone 1 candidate is not credible unless the final PDF is a complete professional resume at first glance.

Required characteristics:

- at least 1 page and at most 2 pages;
- one restrained professional template only;
- conventional, professional typography;
- ATS-safe, single-column or equivalently conservative structure;
- clear section and entry hierarchy;
- clean spacing, dates, bullets, wrapping, and page composition;
- no decorative complexity for its own sake;
- no obvious duplication;
- no malformed, empty, orphaned, or misplaced content;
- visibly targeted to the supplied job description;
- weakly relevant source content may be reduced or omitted;
- enough supported content must remain for the resume to feel complete rather than artificially sparse;
- substantial restructuring is allowed;
- unsupported or invented applicant claims are never allowed.

For Milestone 1, PDF structure/design quality is the first product-quality priority. Content optimization must be credible and job-related, but deeper career-information acquisition belongs to later milestones.

## Required shipped workflow

The minimum applicant workflow is:

```text
Resume PDF + Job Description
  -> System Understanding
  -> User Correction
  -> Tailored Draft / Review
  -> Final PDF
```

The exact UI labels may evolve, but these product responsibilities must remain clear.

### Review behavior

Review exists to let the applicant correct or steer the system, not to force approval of every micro-decision.

Milestone 1 should prefer grouped review and natural-language correction over statement-by-statement Accept/Skip burden.

Examples of valid applicant correction intent:

- "This is coursework, not Experience."
- "Shorten this project; it is not important for this role."
- "Emphasize the Python/dashboard work in this experience."
- "Put SQL before the other skills."

A correction made earlier in the workflow must reliably persist into later review and the final exported PDF.

## Tailoring behavior

The system may:

- reorder sections when the target role makes another hierarchy more useful;
- omit weakly relevant projects, skills, bullets, or other source content;
- shorten low-value content;
- prioritize stronger JD-relevant supported evidence;
- substantially restructure the source resume.

The system must not:

- invent experience, skills, outcomes, metrics, ownership, seniority, or other unsupported facts;
- delete so aggressively that the resume becomes visibly incomplete or under-filled;
- turn one source item into repeated or expanded duplicate content;
- reconstruct a resume by guessing broken section/entry relationships.

## Professional template scope

Milestone 1 implements one professional visual system well rather than multiple templates poorly.

Target style: between traditional banking/consulting and modern technical resumes, slightly toward modern technical presentation while remaining conservative and ATS-safe.

The renderer owns presentation, not semantic content decisions.

Future template families are out of scope.

## Hard blockers — absolute

Any item below blocks Beta regardless of numerical quality score:

1. Natural shipped end-to-end flow cannot complete.
2. Final PDF export fails.
3. Blank bullets, empty resume items, or orphan bullets appear.
4. Section identity is wrong.
5. Entry ownership is wrong or content bleeds across entries.
6. Title/heading text is duplicated as body content.
7. Parent/container content is duplicated with child content.
8. Obvious semantic or source+tailored duplication remains.
9. Wrapping, clipping, glyph, spacing, or pagination defects make the PDF look broken.
10. Applicant corrections do not persist into later review/export.
11. Unsupported or invented applicant claims appear.
12. The final PDF is visibly incomplete, malformed, or not recognizable as a normal professional resume.

Hard blockers cannot be averaged away by a score.

## Internal quality target

The internal quality score remains a useful professional QA instrument, but **90/100 is a target, not an inflexible mathematical product law**.

Default expectation:

- 90+ with all hard/critical criteria PASS: eligible for Beta;
- 85–89 with all hard/critical criteria PASS: normally continue internal repair, but the Engineering Lead may approve a documented exception when remaining deductions are genuinely non-material;
- below 85: remain internal;
- any hard/critical FAIL or material UNKNOWN: remain internal regardless of score.

Because Milestone 1 prioritizes the final PDF, an override below 90 is not acceptable when the remaining deduction is a material typography, layout, PDF usability, structural, duplication, or E2E problem.

## Development proof

### Primary development golden

Use the Ya-Ching master resume shape + Zurich Data Analytics & AI job-description shape as the primary development golden.

Private applicant data does not need to be committed; deidentified fixtures may reproduce the same structural seams.

### Milestone exit breadth

Before Milestone 1 exit, at least three materially different resume shapes must complete the natural shipped E2E path without structural breakage and produce professional 1–2 page PDFs.

Synthetic fixtures alone are insufficient if they do not reproduce real source shapes.

### Final human acceptance

After internal gates pass, the real applicant performs a fresh run using a real resume + real JD.

Milestone 1 human acceptance is:

- the user would reasonably submit the final PDF; and
- the workflow is not painful or unreasonably burdensome.

Milestone 1 does not require proving a quantified time-saving percentage.

## Architecture direction

Milestone 1 permits substantial restructuring when the current architecture blocks the simple product contract.

Preferred durable boundaries:

```text
Source Resume PDF + Job Description
  -> Resume Parser
  -> Canonical Resume Document
  -> Targeting / Edit Operations
  -> Reviewed Resume Document
  -> Professional Renderer
  -> Final PDF
```

### Canonical Resume Document

The canonical resume document is the structural/artifact truth for Milestone 1. It must preserve recognizable resume hierarchy such as:

```text
Resume
  Summary
  Skills
  Experience[]
    title / company / location / dates / bullets[]
  Projects[]
    name / dates / metadata / bullets[]
  Education[]
    school / degree / dates / details[]
  Certifications[]
```

Tailoring should operate on explicit structured document edits such as KEEP, OMIT, REWRITE, and REORDER rather than destroying hierarchy and later trying to infer it from disconnected semantic statements.

### Truth boundary

The resume document is artifact/structure truth. Source evidence remains the authority for factual support.

Candidate Knowledge, long-term user knowledge storage, and a general career-memory architecture are not Milestone 1 blocking requirements. Existing Candidate Knowledge machinery may remain where useful, but Milestone 1 must not become dependent on expanding that system before the basic resume product works.

Any restructure must preserve the non-invention rule and auditable source support for materially rewritten claims.

## Explicitly out of scope

Freeze the following until Milestone 1 is complete unless a minimal compatibility change is required to keep the current product working:

- persistent Candidate Knowledge database / long-term user memory;
- proactive information acquisition for missing career details;
- deeper interview-style questioning to enrich weak evidence;
- multiple resume templates;
- generic agent framework work;
- autonomous learning from outcomes;
- Career Reflection;
- Curiosity workflows;
- cover-letter generation;
- job discovery;
- automatic job application;
- quantified time-savings optimization;
- broader career-platform abstractions not required by the resume vertical slice.

## Development rhythm

Milestone 1 development follows one-blocker, artifact-driven delivery:

```text
identify highest Milestone blocker
  -> reproduce with real-shaped regression
  -> fix the earliest broken boundary
  -> run natural E2E
  -> inspect actual final PDF
  -> specialist structure/content/design review
  -> independent quality score
  -> repair loop while hard blockers/material defects remain
  -> freeze Milestone Exit Candidate
  -> fresh human Beta
```

Rules:

- one active Milestone blocker at a time;
- real-shaped regression before patching repeated failures;
- E2E and final artifact inspection outrank green unit tests as product proof;
- do not send an obviously broken PDF to Beta;
- if the same failure class survives two repair cycles, stop patching and restructure the underlying boundary;
- do not add new platform scope while Milestone 1 is still failing its basic vertical slice.

## Milestone 1 exit

Milestone 1 is complete only when all of the following are true:

1. natural real-shaped E2E works;
2. all hard blockers are PASS;
3. the internal quality review is professionally credible (target ~90, with any exception explicitly documented and non-material);
4. three materially different resume shapes pass the structural/product gate;
5. the real applicant completes a fresh run;
6. the applicant would reasonably submit the resulting PDF;
7. the workflow is not painful.

Until then, the project remains in Milestone 1. Do not advance scope merely because individual PRs or representative scorecards are green.
