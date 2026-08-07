# Project Snapshot

**As of:** 2026-08-07 — Option 2 Tailoring Review implementation merged
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`

## State

- The representative evidence-to-export engineering flow remains **Implemented and Integrated** for its specified behavior.
- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Issue #83 / PR #87: complete-resume composition engineering complete.
- Beta #3 / Issue #93: **FAIL**.
- Issues #95 and #97 / PR #99: applicant-readable review/export foundation merged; Issue #97 remains open for product acceptance.
- Beta #4 / Issue #100: **FAIL**.
- Issues #101–#103 / PR #104: recovery merged; PR #105 checkpoint.
- Beta #5 / Issue #106: **FAIL**.
- Issues #107/#108 / PR #111: recovery merged; PR #112 checkpoint.
- Beta #6 / Issue #113: **FAIL at Evidence Review Candidate 1**.
- PR #116: Beta #6 presentation/export recovery merged at `b0efc92aa390799627e35e9c9d163dab1d6f88d6`.
- Product Issue #115: **CLOSED / COMPLETED** after explicit approval and implementation of Option 2.
- PR #118: Option 2 implementation merged at `49b8ae0ac705d7d3bd22c19857aabaaa0c3ae9c5`.
- Beta Accepted: **NO** pending a fresh Beta.

Repository and GitHub evidence override stale context.

## Beta #6 historical result

Beta #6 remains FAIL. The applicant understood the old Evidence Review as Accept = reword for the job, Skip = keep original, with both expected to remain on the resume. Later exploration also judged the final output not professionally submission-ready and not worth reusing.

Do not reinterpret Beta #6 after engineering changes.

## Option 2 product model now shipped

The uploaded V1 resume is treated as applicant-provided source material. The applicant is not asked to repeatedly verify resume evidence before tailoring.

Applicant-visible review occurs only when the system proposes a concrete material rewrite or interpretation:

- **Original wording**
- **Proposed tailored wording**
- **Use tailored version**
- **Keep original wording**
- **Needs correction**

No material wording change means no wording decision is required.

If the applicant chooses Needs correction, the supplied context flows through the existing acquisition boundary and Candidate Knowledge integration / 003.6. An accepted correction creates a bounded superseding revision, then tailoring, composition, and deterministic validation run again. The applicant returns to Tailoring Review and reviews the regenerated proposal before proceeding.

AI-only interpretation of a source span is not automatically trusted. Regression coverage explicitly rejects promotion of an unsupported AI-only normalized meaning into Candidate Knowledge.

## PR #118 engineering proof

Regression-first RED CI: `31155025138`.

Final merge-candidate CI: `31157897591`:

- Unit: **PASS**
- Full integration: **PASS**
- Patch whitespace: **PASS**
- HTTP / representative PDF: **PASS**
- Pre-fix Chromium RED proof: **PASS**
- Current Chromium GREEN proof: **PASS**
- Review threads: **none**
- Branch sync at merge gate: **behind 0**

The representative browser flow includes correction → acquisition → 003.6 → regeneration → second Tailoring Review → Draft → Career Review → final PDF/report/Markdown/JSON.

Real-provider smoke is **UNKNOWN / non-blocking** for this checkpoint.

## Protected capability boundary

Preserved:

- 003.6 remains the Candidate Knowledge integration/write authority.
- Source-resume passthrough remains source-linked and cannot create Candidate Knowledge.
- Source attestation is bounded to source-backed resume material; AI interpretation is not source truth.
- Generated/materially rewritten claims retain Candidate Knowledge, provenance, and validation requirements.
- Complete-resume composition/source-passthrough guarantees remain intact.
- Resume Content Selection and deterministic validation authority remain intact.
- Career Review / Human Review remains final human authority before export.
- Manual Career Review edits do not silently update Candidate Knowledge.
- Provider credentials remain memory-only/private.
- The unresolved complete-source/no-core-tailoring-selection policy from Issue #95 remains unchanged.

## Next cross-room action

1. Merge the Option 2 durable checkpoint.
2. Create a fresh Beta #7 with initial result **UNKNOWN**.
3. Begin Beta #7 from Landing/Input with a real resume and real job description.
4. Test Tailoring Review comprehension without coaching and exercise at least one Needs correction → regeneration loop.
5. Continue through Draft, Career Review, PDF/report/secondary artifacts, submission judgment, time/value, trust, burden, and reuse intent.
6. Keep Issue #97 open until fresh-user product acceptance is established.
