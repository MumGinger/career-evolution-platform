# Specialist Agent Operating Model

## Purpose

The Career Evolution Platform uses specialist agents to reduce serial debugging and prevent one implementation role from silently crossing product, resume-structure, content, review-UX, presentation, and validation boundaries.

This model is intentionally small. It borrows the role-specialization and Codex custom-agent idea from `msitarzewski/agency-agents`, but the roles below are Career Evolution Platform-specific and preserve this repository's existing truth, provenance, human-review, and delivery rules.

This is an engineering workflow change, not a product architecture change.

## Ownership model

The Engineering Lead remains the single delivery owner from diagnosis through merge. Specialist agents are bounded contributors with explicit read/write scope. They do not own the ticket, merge independently, or reinterpret product decisions.

Default topology:

```text
                         Engineering Lead
                               |
          +--------------------+--------------------+
          |                    |                    |
  Resume Structure      Resume Content      Presentation / UX
      Engineer            Specialist               |
          |                    |            Review UX Designer
          |                    |                    |
          |                    |            Resume Visual Designer
          |                    |                    |
          |                    |            Frontend Presentation
          +--------------------+--------------------+
                               |
                    Resume Quality Reviewer
                               |
                         Engineering proof
                               |
                            Fresh Beta
```

The Lead may run independent specialist analysis in parallel when the tasks do not mutate the same state or depend on each other's output.

## Specialist roster

### Career Resume Structure Engineer

Owns:

- source-resume section detection and grouping;
- experience/project/education entry boundaries;
- composition and de-duplication of source-preserved and approved tailored content;
- structural invariants needed to keep one source entry coherent end to end.

Must not:

- redesign typography, spacing, or visual hierarchy;
- decide which wording is more persuasive for a job;
- weaken Candidate Knowledge, provenance, 003.6, validation, or human-review boundaries.

Primary proof:

- source resume -> parsed/grouped representation -> composed resume entry comparison;
- regression cases for duplication, fragmentation, cross-entry bleed, empty bullets, and lost sections.

### Career Resume Content Specialist

Owns:

- job-specific wording quality;
- whether a proposed rewrite is materially useful rather than cosmetic;
- concision, relevance, and preservation of supported claims;
- preventing unexplained content expansion.

Must not:

- re-parent content between source entries;
- create unsupported claims;
- decide PDF layout or UI structure;
- bypass applicant wording decisions.

Primary proof:

- before/after wording inspection against the job description and source-backed facts;
- content-length and duplication sanity checks;
- clear separation of original wording, proposed wording, and applicant decision.

### Career Resume Review UX Designer

Owns:

- Tailoring Review information architecture and applicant-facing review units;
- mapping multiple changed lines back to one recognizable Experience or Project entry;
- original-versus-tailored comparison hierarchy;
- decision burden, correction flow, stage clarity, and the scope of each approval;
- continuity from source resume entry to Tailoring Review and later Career Review.

Must not:

- change source parsing, entry parentage, or composition semantics;
- rewrite claims or decide which wording is more persuasive;
- redesign final PDF typography or page composition;
- weaken Candidate Knowledge, provenance, 003.6, validation, or Career Review authority;
- implement UI code unless the Engineering Lead explicitly changes the task from design to implementation.

Primary proof:

- changes from one Experience or Project are visibly grouped under that entry;
- each material changed line remains understandable and controllable;
- no-change content does not create review work;
- the applicant can tell what belongs together without seeing internal fact or statement identifiers;
- review burden is lower than the previous statement-by-statement surface without hiding material decisions.

### Career Resume Visual Designer

Owns:

- resume information hierarchy as a document-design problem;
- section order and visual separation;
- typography, spacing, density, dates, bullets, alignment, line wrapping, and page composition;
- ATS-friendly professional resume presentation requirements;
- design handoff criteria for both applicant review surfaces and final PDF.

Must not:

- parse or regroup source content;
- rewrite resume claims;
- change Candidate Knowledge or provenance;
- accept a PDF merely because rendering completed.

Primary proof:

- independent inspection of rendered resume pages;
- explicit checks for Summary placement, Skills scanability, Experience/Projects/Education hierarchy, date placement, overflow, orphan bullets, and readable density;
- final PDF must not be visibly worse than the review surface.

### Career Frontend Presentation Engineer

Owns:

- implementation of approved presentation specifications in applicant-facing UI and export rendering;
- shared presentation primitives where appropriate;
- responsive behavior, accessibility, and deterministic rendering;
- keeping review and export presentation behavior aligned.

Must not:

- invent resume hierarchy when the Visual Designer or Review UX Designer has not specified it;
- change parsing/grouping to make CSS easier;
- rewrite resume content;
- broaden a ticket into unrelated frontend cleanup.

Primary proof:

- browser/rendered artifact checks against the owning design acceptance criteria;
- focused regression plus full relevant suite.

### Career Resume Quality Reviewer

Owns independent final inspection after implementation.

Checks the complete path:

```text
source resume
  -> parsed/grouped source structure
  -> tailoring decisions
  -> composed draft
  -> Career Review
  -> final PDF / HTML / Markdown / JSON
```

Must not repair findings during the same independent review run.

Records each applicable criterion as `PASS`, `FAIL`, or `UNKNOWN`, including:

- source section preservation;
- entry grouping integrity;
- no cross-entry bleed;
- no accidental duplication;
- no empty bullet artifacts;
- applicant decisions applied to the intended entry;
- content expansion remains proportionate and supported;
- Tailoring Review groups changes by recognizable source entry;
- professional visual hierarchy;
- PDF/review-surface equivalence;
- truth/provenance/validation boundaries preserved.

A reviewer PASS is engineering evidence only. It does not replace fresh-user Beta acceptance.

## Dispatch rules

The Engineering Lead should dispatch by failure type instead of asking every agent to inspect everything.

| Failure signal | First specialist | Secondary specialist |
| --- | --- | --- |
| Project/job/education boundaries wrong | Resume Structure Engineer | Quality Reviewer |
| Duplicate source + rewritten content | Resume Structure Engineer | Content Specialist |
| Tailoring too long, cosmetic, or low-value | Resume Content Specialist | Quality Reviewer |
| One resume entry becomes many confusing review cards | Resume Review UX Designer | Structure Engineer |
| Review choices are clear technically but burdensome or contextless | Resume Review UX Designer | Quality Reviewer |
| Skills wall, bad spacing, misplaced Summary, bad dates | Resume Visual Designer | Frontend Presentation Engineer |
| Review UI and PDF disagree | Frontend Presentation Engineer | Visual Designer |
| Final output looks correct technically but not trustworthy | Resume Quality Reviewer | Relevant owning specialist |

If one defect clearly crosses two boundaries, the Lead creates one task ledger with separate specialist questions and a single integration decision. Specialists do not negotiate architecture directly with each other.

## Parallelism rules

Parallel work is encouraged only when inputs are stable and outputs are independent.

Good parallel work:

- Structure Engineer traces grouping while Visual Designer defines final resume presentation criteria.
- Content Specialist reviews tailoring expansion while Review UX Designer inspects applicant decision burden.
- Frontend Presentation Engineer can implement a frozen Review UX or Visual Designer contract while the other independent branch is already settled.
- Quality Reviewer prepares an acceptance matrix while implementation is still underway, but does not issue the independent verdict until implementation is frozen.

Do not parallelize:

- two agents editing the same files without a Lead-owned merge plan;
- visual work that depends on unresolved entry grouping;
- review-UX work that depends on unresolved source-entry identity;
- content rewrite decisions that depend on unresolved source/provenance status;
- independent proof before the candidate implementation is frozen.

## Protected boundaries

All specialists inherit repository rules and must preserve:

- 003.6 as Candidate Knowledge integration/write authority;
- source-resume passthrough/source linkage;
- provenance and claim-scope requirements;
- deterministic validation authority;
- complete-resume composition guarantees;
- Career Review / Human Review as final applicant authority before export;
- no silent Candidate Knowledge mutation from manual Career Review edits;
- provider credential privacy.

A specialist must stop and return a boundary conflict instead of making a local fix that violates these rules.

## Issue #126 first trial

Issue #126 is the first trial of this operating model.

The Lead initially used bounded specialist investigations to separate four failure classes:

1. **Resume Structure Engineer** — locate where source section and entry identity were lost and caused Gift Recommendation App, duplicate paragraph/bullet content, and cross-entry bleed.
2. **Resume Content Specialist** — identify disproportionate expansion and repeated provider alternatives without changing grouping.
3. **Resume Review UX Designer** — group multiple material changes from the same source Project or Experience into one applicant-recognizable review unit without collapsing independent wording decisions.
4. **Resume Visual Designer** — verify the existing final-resume presentation contract only after structure is trustworthy rather than masking upstream corruption with CSS.

After the structural cause is known, the Lead decides the smallest coherent implementation slice. The Frontend Presentation Engineer implements only presentation changes that remain after structure is trustworthy. The Resume Quality Reviewer then performs a frozen complete-path draft/PDF comparison before another Beta.

## Codex integration

Project-specific Codex agent TOML files live under:

```text
integrations/codex/agents/
```

Install them into Codex with the provided scripts:

```powershell
./scripts/install-career-agents.ps1
```

or:

```bash
./scripts/install-career-agents.sh
```

The files follow Codex's minimal custom-agent fields: `name`, `description`, and `developer_instructions`.

## Reference

Role specialization and the Codex custom-agent packaging approach were informed by `msitarzewski/agency-agents`. The Career Evolution Platform specialist instructions are project-specific adaptations rather than a wholesale import of that roster.
