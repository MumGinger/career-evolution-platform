# Milestone 1 Resume Pipeline Consolidation

**Execution state:** ACTIVE. PR #144 is the preserved shipped-flow regression floor. The six migration slices below are the only active Milestone 1 engineering program until exit.

## Decision

Milestone 1 should restructure the resume artifact pipeline rather than continue stacking local repairs on the existing statement-reconstruction path.

This is a targeted consolidation, not a full-platform rewrite.

## Repository evidence

The current implementation spreads resume-structure responsibility across multiple layers:

- `src/source-structure-projection.js` repairs parent/container structure immediately before tailoring by wrapping `Store.createResumeTailoringPlanRun`;
- `src/resume-composition.js` owns source composition plus source-section inference, source Skills targeting, source/fact mapping, validation helpers, and additional downstream concerns;
- `src/applicant-resume.js` re-parses statements into headings/dates/Skills/entries at presentation time, promotes Summary content, owns HTML/CSS, and separately implements a handwritten PDF text-layout engine.

This means section/entry structure can be inferred or repaired more than once. Repeated Beta failures around parent/child duplication, section identity, dense Skills, orphan entries, wrapping, and PDF hierarchy are consistent with that responsibility overlap.

Per the repeated-failure rule, the next step is to repair the earliest durable boundary rather than add another presentation cleanup.

## Target boundary

```text
Source Resume PDF + Job Description
  -> Resume Parser
  -> Canonical Resume Document
  -> Targeting / Edit Operations
  -> Reviewed Resume Document
  -> Professional Renderer
  -> Final PDF
```

The goal is that downstream code no longer needs to reconstruct a resume from disconnected semantic statements.

## Canonical Resume Document

The document owns artifact structure, not applicant factual truth.

Minimum model:

```text
ResumeDocument
  id
  source
  header
    name
    contact[]
  summary
  skills
    groups[]
      label
      items[]
  experience[]
    id
    title
    organization
    location
    dates
    bullets[]
  projects[]
    id
    name
    metadata[]
    dates
    bullets[]
  education[]
    id
    school
    degree
    location
    dates
    details[]
  certifications[]
    id
    name
    issuer
    date
    details[]
  provenance
```

Every content-bearing node should carry enough source references to verify support. Provenance is a sidecar of the document node, not a replacement for structure.

### Structural invariants

Before tailoring/rendering:

- every bullet belongs to exactly one entry;
- every entry belongs to exactly one section;
- headings are metadata, not repeated body content;
- no parent container may also contain a rendered copy of child bullet text;
- section labels are structural metadata, not resume body text;
- date/location/title/company/school fields remain typed rather than inferred by the renderer;
- grouped Skills remain grouped Skills rather than becoming aggregate factual claims;
- source order is preserved unless an explicit later edit changes it.

## Edit model

Tailoring acts through explicit operations against stable document node IDs:

```text
KEEP(node_id)
OMIT(node_id)
REWRITE(node_id, supported_text, support_refs)
REORDER(node_id, before|after target_id)
MOVE_SECTION(section_id, position)
```

Milestone 1 may later add more operation types only when a real workflow requires them.

Operations should be auditable and deterministic to apply.

Applicant natural-language corrections are translated into the same edit model rather than modifying an unrelated review representation.

## Reviewed Resume Document

After system tailoring and applicant correction, materialize one Reviewed Resume Document.

Both:

- applicant final review; and
- final export

must consume that same document version.

This makes review/export equivalence a structural property instead of a best-effort comparison between separately reconstructed surfaces.

## Renderer boundary

The renderer receives only a validated Reviewed Resume Document.

It must not:

- infer entry ownership;
- deduplicate semantic claims;
- move content between sections;
- promote Summary text out of Experience;
- split Skills by guessing delimiter semantics after the document is reviewed;
- repair parent/child source structure;
- strengthen or rewrite applicant claims.

### Template scope

Milestone 1 uses one professional ATS-safe template.

Target style:

- conservative single-column layout;
- black/near-black text;
- restrained rules/separators;
- professional font stack;
- clear name/contact hierarchy;
- compact but readable Summary;
- scanable Skills groups;
- conventional title/organization/date hierarchy;
- consistent bullet indent and spacing;
- credible one- or two-page pagination.

### PDF strategy

Prefer one visual source of truth for preview and PDF.

The current handwritten PDF engine in `applicant-resume.js` independently approximates wrapping and typography using character counts and Type1 Helvetica. That creates a second layout system beside the HTML/CSS preview.

Milestone 1 should migrate toward HTML/CSS -> browser/print PDF (or an equivalently single-source renderer) so preview and final PDF share typography, wrapping, spacing, and pagination logic.

Do not remove the legacy PDF path until the replacement passes natural E2E and artifact regressions.

## Candidate Knowledge boundary

Candidate Knowledge is not the structural document model.

For Milestone 1:

- source resume evidence is sufficient factual authority for preserved source content;
- materially rewritten content must retain auditable support from source evidence and/or explicit applicant correction;
- existing Candidate Knowledge / 003.6 machinery may be used as a compatibility/support source where already integrated;
- do not expand persistent Candidate Knowledge simply to complete the resume artifact pipeline;
- document hierarchy must not depend on Candidate Knowledge reconstruction.

A later milestone may make Candidate Knowledge the durable long-term factual memory without changing the Resume Document responsibility.

## Migration plan

### Slice 1 — Canonical document core

Add:

- document types/builders;
- structural validation;
- deterministic IDs;
- provenance attachment;
- adapter from current source semantic/snapshot output.

Regression shapes must include:

1. parent container containing child text + explicit child bullets;
2. grouped multi-skill source blocks;
3. Experience with title/company/location/date/bullets;
4. multiple Projects;
5. at least two Education entries;
6. Certifications;
7. existing section-marker/glyph edge cases.

Exit: document passes invariants before applicant presentation code runs.

### Slice 2 — Renderer v2

Build one professional renderer that consumes only Resume Document.

Prove:

- one/two-page PDF;
- no empty/orphan bullets;
- no clipping/overlap;
- no title/body or parent/child duplication;
- professional spacing/hierarchy;
- preview/PDF equivalence;
- PDF text remains extractable.

Visual Designer and independent Quality Reviewer inspect the actual rendered artifact.

### Slice 3 — Targeting operations

Translate current targeting into explicit document operations.

Prove:

- weakly relevant content can be omitted;
- strong JD-relevant content can be prioritized;
- section order may change;
- resume remains complete rather than sparse;
- no unsupported rewriting.

### Slice 4 — Applicant correction persistence

Support grouped natural-language corrections through the same edit/document boundary.

Required regression examples:

- "This is coursework, not Experience.";
- "Shorten this project.";
- "Emphasize Python/dashboard work here.";
- "Put SQL first in Skills.".

Exit: the corrected document is the document shown in later review and exported PDF.

### Slice 5 — Shipped-flow cutover

Move the natural applicant flow onto the canonical document + renderer path.

Keep PR #144 complex shipped-flow coverage as a regression floor, but update it to assert the new authoritative artifact path.

After current and new real-shaped regressions pass, remove/bypass obsolete presentation-time structural reconstruction and Store monkey-patch repair seams.

Do not maintain two independent final-resume architectures.

### Slice 6 — Milestone exit gate

Run the same shipped canonical-document path across the primary Ya-Ching + Zurich-shaped golden and at least two materially different resume shapes. Freeze the exact reviewed PDFs, run hard-blocker checks first, then independent quality review. Keep the candidate internal until hard blockers all pass and professional quality is credible under `MILESTONE_1.md`.

## Milestone proof matrix

Before human Beta:

| Proof | Requirement |
|---|---|
| Primary golden | Ya-Ching + Zurich-shaped natural E2E |
| Structural breadth | 3 materially different resume shapes |
| E2E | natural shipped path completes |
| Correction | user corrections persist to final PDF |
| Structure | all Milestone hard blockers PASS |
| Visual | actual PDF inspected; no material design defect |
| Score | target ~90; any sub-90 exception must satisfy guarded policy |
| Human | only after internal candidate is credible |

## Non-goals

Do not use this consolidation to redesign:

- persistent Candidate Knowledge;
- generic agent infrastructure;
- Career Reflection / Curiosity;
- proactive information acquisition;
- multiple templates;
- cover letters;
- job discovery;
- outcome learning;
- auto-application.

## Definition of done

The restructure is done when the shipped resume vertical slice has one authoritative structural document path and one authoritative professional presentation path, the natural E2E and three-shape artifact gates pass, and legacy repair layers no longer determine final resume hierarchy/layout.
