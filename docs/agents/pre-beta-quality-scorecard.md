# Pre-Beta Resume Quality Scorecard

## Purpose

Fresh Beta is not the first professional QA pass.

Before a resume candidate can be called Beta-ready, the Career Evolution Platform must run an internal specialist repair-and-review loop against one frozen candidate until an independent reviewer records:

- **overall score >= 90/100**; and
- **every critical must-pass criterion = PASS**; and
- **machine-bound runtime evidence proves the same frozen candidate completed the natural shipped applicant flow**.

A score below 90, any critical FAIL, any material critical UNKNOWN, or missing/mismatched runtime evidence keeps the candidate inside the internal loop.

A polished PDF is not enough. The exact frozen candidate must also complete the **shipped applicant flow**. Representative fixture output, renderer-only proof, manually reconstructed artifacts, or a scorecard that merely writes `PASS` cannot substitute for start-to-export product proof.

## Frozen candidate rule

Every review cycle evaluates one immutable candidate artifact set. At minimum, record the exact versions of:

- source resume;
- target job description / requirement profile;
- tailoring decisions;
- composed structured resume;
- Career Review state;
- applicant review surface;
- final PDF;
- final HTML / Markdown / JSON when applicable;
- machine-bound shipped-flow runtime evidence for the same candidate.

Once independent review begins, the candidate is frozen. Any repair creates a **new candidate version** and requires a new scorecard from scratch.

Scores are not cumulative. Fixing a previous defect does not automatically add points to the next cycle, and a later regression may reduce the score.

## 100-point scorecard

Score each dimension from `0` to `10`.

### 1. Job-specific targeting — 10

Does the resume present a clear application-specific direction instead of a broad master-resume identity?

Check role alignment, Summary focus, relevance of selected projects/experience, and whether high-value evidence is emphasized for this job.

### 2. Content coherence and prioritization — 10

Does the resume select and order the strongest evidence rather than trying to preserve every possible item?

Check section balance, project/experience proportion, relevance hierarchy, and whether low-value learning/activity text crowds out stronger evidence.

### 3. Concision and duplication control — 10

Is wording tight and proportionate?

Check repeated concepts, repeated coursework/projects, source+tailored duplication, parent-container+child duplication, unnecessary roadmap/future-work language, verbose bullets, and unexplained expansion.

### 4. Evidence strength and supported meaning — 10

Do claims communicate the strongest supported evidence without inflation or invention?

Check factual support, claim scope, specificity, outcome/impact where genuinely supported, and whether weak activity descriptions are being presented as stronger achievements than the evidence permits.

### 5. Section and entry integrity — 10

Does every section and Experience/Project/Education entry remain coherent end to end?

Check section identity, source-entry grouping, parent/child continuity, no raw-container leakage, no cross-entry bleed, no accidental concatenation, and applicant decisions applied to the intended entry.

### 6. Summary and Skills quality — 10

Are Professional Summary and Skills useful, separated, prioritized, and easy to scan?

Check Summary placement/focus, Skills density, grouping, category clarity, duplication, and whether the Skills inventory is appropriately selective.

### 7. Experience / Projects / Education hierarchy — 10

Do entries read like a professionally structured resume?

Check title/company/school/project hierarchy, dates, location, degree/details, bullet nesting, spacing, and recognizable entry boundaries.

### 8. Typography, spacing, density, and page composition — 10

Does the rendered document look intentionally typeset?

Check font hierarchy, line height, spacing rhythm, alignment, wrapping, crowded blocks, awkward page breaks, orphan bullets, whitespace balance, and one/two-page composition as appropriate.

### 9. Final PDF professional credibility — 10

Would the frozen PDF itself be credible as a serious application artifact without rebuilding it elsewhere?

This is a professional QA judgment, not the applicant's final Beta submission decision. The reviewer must inspect rendered pages rather than infer from unit tests or text extraction alone.

### 10. Review-to-final equivalence and decision preservation — 10

Does the final PDF represent the same resume the applicant reviewed and approved?

Check Tailoring Review decisions, Career Review decisions, source-preserved wording, final section/entry structure, and whether export introduces new duplication, loss, compression, or hierarchy changes.

## Scoring anchors

- **9–10:** polished, professionally credible, no meaningful internal repair needed for this dimension.
- **7–8:** generally good but still has visible or material issues worth fixing before Beta.
- **5–6:** functional but clearly under-polished; this is the kind of 60-point candidate that must remain internal.
- **3–4:** major quality problems materially reduce trust or usability.
- **0–2:** broken, misleading, unusable, or not meaningfully reviewable.

The reviewer must explain every dimension below 9 and identify concrete deductions rather than giving an unexplained number.

## Beta-ready score bands

- **0–84:** `NOT BETA READY` — continue specialist repair loop.
- **85–89:** `NEAR READY` — continue internal refinement; do not open fresh Beta.
- **90–100:** eligible for `BETA READY` only when all critical must-pass criteria are PASS **and matching runtime evidence validates the exact candidate/run**.

There is no exception that allows an 89-point candidate into Beta because it is "close enough."

## Critical must-pass criteria

These are separate from the numerical score and cannot be averaged away:

1. **Truth / support integrity** — no unsupported or invented applicant claims; Candidate Knowledge, provenance, claim scope, 003.6, and deterministic validation boundaries remain intact.
2. **Section identity** — no Summary/Skills/Experience/Projects/Education content rendered under the wrong section.
3. **Entry integrity** — no cross-entry bleed or content attached to the wrong Experience/Project/Education entry.
4. **Duplication / expansion integrity** — no accidental source+tailored duplication, parent-container+child duplication, duplicate alternatives, or unexplained content expansion.
5. **Applicant decision integrity** — Tailoring Review and Career Review decisions are applied to the intended content and preserved through export.
6. **Professional readability** — Summary, Skills, Experience, Projects, Education, dates, bullets, and major boundaries are readable as a professional resume.
7. **Final PDF usability** — the rendered PDF is technically usable and professionally credible enough to deserve real-user Beta evaluation.
8. **Review / export equivalence** — the final PDF represents the same approved resume as the review surface.
9. **Shipped flow completion** — the same frozen candidate completes the actual applicant product path from start through Tailoring Review or explicit no-change handling, Draft, Career Review, and export without dead-end stages, hidden manual intervention, post-validation state mutation, or bypassing deterministic validation.

For critical criteria:

- `FAIL` => `NOT BETA READY` regardless of score.
- material `UNKNOWN` => `NOT BETA READY` until evidence resolves it.
- only all `PASS` plus matching runtime evidence allows a 90+ score to become `BETA READY`.

### Shipped-flow proof requirements

`shipped_flow_completion = PASS` requires evidence from the natural shipped server/UI boundary, not a direct helper invocation alone. The same frozen candidate must prove:

```text
resume + job input
  -> source understanding succeeds
  -> Tailoring Review if material changes exist
     OR explicit no-change path with no unnecessary applicant decision
  -> deterministic-valid Draft
  -> Career Review is reachable
  -> applicant decisions can complete
  -> export succeeds
  -> exported PDF/HTML/Markdown/JSON correspond to reviewed content
```

The proof must not mutate session, artifact, validation, or stage after the natural pipeline produces them. Provider responses may be deterministically replayed at the provider boundary, but product state after provider return must be produced by the real application path.

A valid runtime-evidence manifest must record at minimum:

```json
{
  "candidate_id": "candidate-v4",
  "source_resume_sha256": "<64-char sha256>",
  "job_description_sha256": "<64-char sha256>",
  "final_pdf_sha256": "<64-char sha256>",
  "artifact_run_id": "<artifact-run-id>",
  "shipped_flow": {
    "status": "PASS",
    "natural_pipeline": true,
    "post_validation_state_mutation": false,
    "provider": "openai-compatible/provider-replay-model",
    "test_id": "<test-id>",
    "run_id": "<ci-or-local-run-id>",
    "completed_stages": [
      "Resume Input",
      "Tailoring Review",
      "Draft",
      "Career Review",
      "Export"
    ]
  }
}
```

The source-resume hash, job-description hash, final-PDF hash, candidate ID, and artifact run ID bind the proof to one exact run. Evidence for another candidate cannot authorize the scorecard.

A dead-end stage with no applicant action is a critical FAIL. A candidate that has only representative PDF/render evidence is `UNKNOWN` for shipped-flow completion.

## Machine-readable scorecard contract

Every independent review cycle must produce one JSON scorecard for the exact frozen candidate:

```json
{
  "candidate_id": "candidate-v4",
  "dimensions": {
    "job_specific_targeting": 9,
    "content_coherence_prioritization": 9,
    "concision_duplication_control": 9,
    "evidence_strength_supported_meaning": 9,
    "section_entry_integrity": 10,
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

The scorecard and runtime-evidence manifest are separate authorities. The scorecard records reviewer judgment; runtime evidence records machine-observed product completion. `shipped_flow_completion: PASS` written only in the scorecard is not sufficient evidence.

The deterministic gate validates the required dimensions, required critical criteria, score range, total threshold, critical states, candidate identity, runtime hashes, artifact/run identity, natural-pipeline flag, state-mutation flag, provider path, and completed shipped stages. Missing fields are invalid readiness evidence rather than assumed PASS.

Run it with:

```powershell
npm run pre-beta:gate -- path\to\scorecard.json path\to\runtime-evidence.json
```

Exit semantics:

- exit `0`: `BETA READY`;
- exit `1`: valid scorecard/evidence but `NEAR READY` or `NOT BETA READY`, including a scorecard that claims shipped-flow PASS without matching runtime evidence;
- exit `2`: malformed/incomplete scorecard or unreadable input.

The deterministic gate does not create the professional judgment. The independent reviewer creates the scores and critical findings from actual artifacts and the shipped product run; the runtime manifest proves the exact product completion; the gate enforces both so the Lead cannot reinterpret an 89, average away a critical FAIL, accept a self-reported shipped-flow PASS, or substitute a renderer fixture for a functioning product.

## Independent reviewer output

Every review cycle returns:

1. frozen candidate/version identifiers;
2. the ten dimension scores;
3. total score out of 100;
4. all nine critical must-pass criteria as PASS / FAIL / UNKNOWN;
5. point deductions with concrete evidence;
6. owning specialist for every repair item;
7. earliest failure boundary for each critical FAIL;
8. `BETA READY`, `NEAR READY`, or `NOT BETA READY`;
9. whether another internal loop is required;
10. machine-bound shipped-flow runtime evidence for the same frozen candidate;
11. the machine-readable JSON scorecard matching the contract above.

The reviewer does not repair the candidate during the same independent review run.

## Repair routing

Default ownership:

- parsing, raw-evidence/visible-structure projection, section identity, entry grouping, parent/child duplication, cross-entry bleed -> **Career Resume Structure Engineer**;
- targeting, wording, concision, prioritization, low-value content, semantic duplication -> **Career Resume Content Specialist**;
- Tailoring Review grouping, comprehension, decision burden, dead-end applicant stages -> **Career Resume Review UX Designer**;
- typography, spacing, density, Skills presentation, page composition -> **Career Resume Visual Designer**;
- UI/PDF implementation, stage transitions, or shipped-flow behavior not matching the approved product contract -> **Career Frontend Presentation Engineer**.

The Engineering Lead owns the repair ledger, specialist handoff enforcement, and integration decision.

## Mandatory internal loop

```text
freeze candidate v1
  -> run same candidate through natural shipped applicant flow
  -> emit machine-bound runtime evidence
  -> independent reviewer scores candidate + inspects artifacts
  -> validate scorecard + matching runtime evidence
  -> if score < 90 or any critical criterion FAIL/materially UNKNOWN or runtime evidence invalid:
       route deductions to specialists
       repair
       freeze a new candidate
       repeat shipped-flow proof
       run a new independent review from scratch
  -> repeat until score >= 90, all nine critical criteria PASS, and runtime evidence is valid
  -> deterministic gate confirms BETA READY
  -> only now begin fresh Beta
```

If the same failure class survives two repair cycles, follow the repository repeated-failure rule: stop incremental patching and investigate the underlying product, architecture, state, or ownership model before another repair attempt.

## Boundary with Beta

Internal score is **not** Beta acceptance.

A 90+ candidate with validated natural shipped-flow completion has earned the right to be tested by a real applicant. Fresh Beta still owns human judgments that internal agents cannot establish reliably, including trust, review burden, time saved, practical usefulness, willingness to submit the resume, and willingness to use the product again.

The goal is that Beta discovers real user-experience/product learning, not obvious professional QA defects or basic workflow dead ends that specialist agents should have already caught.