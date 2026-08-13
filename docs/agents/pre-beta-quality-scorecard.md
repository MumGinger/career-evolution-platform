# Pre-Beta Resume Quality Scorecard

## Purpose

Fresh Beta is not the first professional QA pass.

For Milestone 1, the internal scorecard is a professional review instrument for the exact frozen resume candidate. It does not replace natural shipped-flow proof and it does not replace final human Beta acceptance.

Read `MILESTONE_1.md` first. Where older scorecard language conflicts with the Milestone 1 contract, the Milestone 1 contract governs.

## Readiness rule

The target is approximately **90/100**, but 90 is a quality target rather than an inflexible mathematical law.

Default behavior:

- **90–100 + every critical criterion PASS + matching runtime evidence:** eligible for `BETA READY`;
- **85–89 + every critical criterion PASS:** `NEAR READY` by default and remains internal;
- **85–89 may become `BETA READY` only with an explicit Engineering Lead override** documenting why the remaining deductions are non-material;
- **below 85:** `NOT BETA READY`;
- **any critical FAIL/material UNKNOWN or invalid shipped-flow evidence:** `NOT BETA READY` regardless of score.

A sub-90 override is not allowed when the remaining defect is material PDF design/typography/layout, structural integrity, duplication, correction persistence, truth/support, or shipped-flow quality.

The deterministic gate additionally requires both `typography_spacing_density_page_composition` and `final_pdf_professional_credibility` to remain at least 8/10 for a sub-90 override.

## Frozen candidate rule

One independent review cycle evaluates one immutable candidate:

- source resume;
- job description;
- system-understanding/tailoring result;
- applicant corrections/decisions;
- reviewed resume structure;
- final PDF;
- other exports when applicable;
- machine-bound shipped-flow evidence.

Any repair creates a new candidate version and requires a new review.

The final PDF reviewed by the human/agent reviewer must be the same PDF hash proved by the shipped-flow evidence.

## 100-point scorecard

Each dimension is 0–10.

### 1. Job-specific targeting

Is the final resume clearly directed at the supplied JD rather than reading like an untouched master resume?

### 2. Content coherence and prioritization

Are stronger and more relevant supported items kept/promoted while lower-value material is shortened or omitted without making the resume sparse?

### 3. Concision and duplication control

No source+tailored duplication, title/body duplication, parent/child duplication, repeated alternatives, needless roadmap text, or uncontrolled expansion.

### 4. Evidence strength and supported meaning

Claims remain supported and appropriately bounded. No invention or unsupported inflation.

### 5. Section and entry integrity

Summary, Skills, Experience, Projects, Education, Certifications, headings, metadata, and bullets remain attached to the correct structural owner.

### 6. Summary and Skills quality

Summary and Skills are separated, readable, appropriately selective, and useful for the target role.

### 7. Experience / Projects / Education hierarchy

Entries look like normal professional resume entries with coherent title/company/school/project/date/detail/bullet hierarchy.

### 8. Typography, spacing, density, and page composition

The rendered document is intentionally typeset: professional font choices, spacing rhythm, alignment, wrapping, whitespace balance, no orphan bullets, and credible 1–2 page composition.

### 9. Final PDF professional credibility

Would a reasonable applicant see this as a serious application artifact rather than a prototype or generated report?

The reviewer must inspect rendered pages, not infer this score from text extraction or unit tests.

### 10. Review-to-final equivalence and decision preservation

Does the final PDF reflect the same corrections and resume state that the applicant reviewed?

## Scoring anchors

- **9–10:** professionally credible; no meaningful internal repair needed for this dimension.
- **7–8:** generally good but still visibly improvable.
- **5–6:** functional/prototype quality; keep internal.
- **3–4:** major trust or usability problem.
- **0–2:** broken or not meaningfully reviewable.

Explain every dimension below 9 with concrete evidence and an owning repair boundary.

## Critical must-pass criteria

These cannot be averaged away:

1. **Truth / support integrity** — no unsupported or invented applicant claims.
2. **Section identity** — no content under the wrong resume section.
3. **Entry integrity** — no cross-entry bleed or wrong entry ownership.
4. **Duplication / expansion integrity** — no accidental source+tailored, title/body, parent/child, or alternative duplication.
5. **Applicant decision integrity** — corrections and review decisions persist to export.
6. **Professional readability** — the resume reads like a normal professional document.
7. **Final PDF usability** — no broken rendering, clipping, glyph, bullet, pagination, or obviously unprofessional layout defect.
8. **Review / export equivalence** — export represents the approved/reviewed resume.
9. **Shipped flow completion** — the same candidate naturally completes the shipped applicant path without hidden state mutation or dead end.

Any critical `FAIL` blocks Beta. A material `UNKNOWN` also blocks Beta until resolved.

## Natural shipped-flow proof

For Milestone 1 the conceptual product flow is:

```text
Resume PDF + Job Description
  -> System Understanding
  -> User Correction / Tailoring Review as needed
  -> Draft / final review
  -> Final PDF export
```

The current implementation may expose more named stages, but runtime proof must show the real product path completes naturally and applicant corrections are preserved.

Provider responses may be deterministically replayed at the provider boundary for committed regression proof. Product session/artifact/validation state after provider return must come from the real application path rather than test mutation.

Runtime evidence must identify the candidate and exact input/output artifacts, including source-resume SHA-256, job-description SHA-256, final-PDF SHA-256, artifact/run identity, provider path, completed shipped stages, `natural_pipeline: true`, and `post_validation_state_mutation: false`.

## Machine-readable scorecard

A normal 90+ candidate needs the standard fields:

```json
{
  "candidate_id": "candidate-v1",
  "reviewed_final_pdf_sha256": "<64-char sha256>",
  "dimensions": {
    "job_specific_targeting": 9,
    "content_coherence_prioritization": 9,
    "concision_duplication_control": 9,
    "evidence_strength_supported_meaning": 9,
    "section_entry_integrity": 9,
    "summary_skills_quality": 9,
    "experience_projects_education_hierarchy": 9,
    "typography_spacing_density_page_composition": 9,
    "final_pdf_professional_credibility": 9,
    "review_final_equivalence_decision_preservation": 9
  },
  "critical": {
    "truth_support_integrity": "PASS",
    "section_identity": "PASS",
    "entry_integrity": "PASS",
    "duplication_expansion_integrity": "PASS",
    "applicant_decision_integrity": "PASS",
    "professional_readability": "PASS",
    "final_pdf_usability": "PASS",
    "review_export_equivalence": "PASS",
    "shipped_flow_completion": "PASS"
  }
}
```

A sub-90 exception additionally requires:

```json
{
  "engineering_override": {
    "approved": true,
    "approved_by": "Engineering Lead",
    "reason": "Specific explanation of why every remaining deduction is non-material."
  }
}
```

An override is a recorded judgment, not a way to waive hard blockers.

## Repair routing

Default ownership:

- parser, section/entry structure, parent-child boundaries, cross-entry bleed -> **Resume Structure Engineer**;
- JD relevance, selection, wording, concision -> **Resume Content Specialist**;
- correction/review clarity and burden -> **Resume Review UX Designer**;
- typography, spacing, density, pagination, final-PDF visual credibility -> **Resume Visual Designer**;
- shipped UI/review/export implementation -> **Frontend Presentation Engineer**;
- independent final score -> **Resume Quality Reviewer**.

The Engineering Lead owns integration and decides whether repeated failures require architecture restructuring.

## Internal loop

```text
freeze exact candidate
  -> natural shipped E2E
  -> inspect actual final PDF
  -> independent score + critical matrix
  -> if hard/material issue remains:
       route to owner
       repair/restructure
       freeze new candidate
       repeat
  -> only then request fresh human Beta
```

If the same failure class survives two repair cycles, stop incremental patching and inspect the underlying parser/document/edit/composition/rendering/state boundary.

## Boundary with Beta

Internal readiness only earns the right to use the applicant's time for a fresh Beta.

Milestone 1 human acceptance remains:

- the applicant would reasonably submit the final PDF; and
- the workflow is not painful.
