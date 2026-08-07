# Engineering Handoff

**Owner:** Engineering Room
**Checkpoint:** 2026-08-07 — Option 2 Tailoring Review merged; fresh Beta next

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, `docs/context/beta-handoff.md`, Beta #6 / Issue #113, open Issue #97, closed Product Issue #115, merged PR #118, and current GitHub state.

Repository evidence is authoritative over this handoff.

## Current state

- Beta #6 / Issue #113 remains the latest completed product result: **FAIL**.
- Beta Accepted remains **NO** until a fresh Beta.
- Product Issue #115 is **CLOSED / COMPLETED** after Product approved Option 2 and Engineering merged the implementation.
- PR #118 merged to `chore/project-foundation` at `49b8ae0ac705d7d3bd22c19857aabaaa0c3ae9c5`.
- Issue #97 remains **OPEN** because professional submission readiness, value, trust, burden, and reuse require fresh applicant evidence.
- After this checkpoint merges, Engineering may create a fresh Beta #7 issue with initial result **UNKNOWN**.

## Shipped Option 2 behavior

The old applicant-visible Evidence Review Accept/Skip decision is replaced by concrete **Tailoring Review**.

V1 source model:

- the uploaded resume is applicant-provided source material;
- source-backed material can be internally source-attested rather than re-challenged in the applicant UI;
- source attestation does not make AI interpretation of that source automatically true;
- AI-only normalized or strengthened meaning cannot enter Candidate Knowledge merely because the source span is real.

Applicant-visible review:

- Original wording → Proposed tailored wording;
- Use tailored version;
- Keep original wording;
- Needs correction;
- unchanged wording requires no meaningless review decision.

## Correction path

Needs correction is a real evidence/regeneration path, not a presentation note:

1. applicant supplies missing/incorrect context;
2. the context is captured through the existing acquisition boundary;
3. Candidate Knowledge integration / 003.6 evaluates a bounded proposal;
4. an accepted correction creates a `supersedes` revision linked to the prior fact;
5. the effective current Candidate Knowledge snapshot excludes the superseded prior fact while preserving history;
6. the application-specific source composition suppresses only the corrected old source line; the uploaded source artifact itself remains immutable;
7. tailoring, presentation strategy, artifact generation, complete-resume composition, and deterministic validation run again;
8. the applicant returns to Tailoring Review for a second concrete decision before Draft/Career Review.

Career Review remains mandatory and remains the final human authority before export. Manual Career Review edits remain application-local and do not silently write Candidate Knowledge.

## Regression-first proof

Regression-only CI `31155025138`:

- new Option 2 applicant/HTTP contract: **RED as expected** on the prior shipped abstract Evidence Review model;
- unrelated existing unit/integration: **PASS**;
- then-current browser flow: **PASS**.

Final merge-candidate CI `31157897591`:

- Unit: **PASS**
- Full integration: **PASS**
- Patch whitespace: **PASS**
- HTTP / representative PDF contract: **PASS**
- Pre-fix Chromium RED proof: **PASS**
- Current Chromium GREEN proof: **PASS**
- Review threads: **none**
- Current-primary synchronization: **behind 0**

The browser regression explicitly exercises Needs correction → acquisition → 003.6 → regeneration → second Tailoring Review → Draft → Career Review → PDF/report/Markdown/JSON.

Representative PDF and complete-resume regressions prove source sections survive composition and Keep original can preserve source wording without weakening Candidate Knowledge/provenance boundaries.

Real-provider smoke remains **UNKNOWN / non-blocking** for this checkpoint.

## Protected truth and authority boundary

Do not weaken:

- 003.6 as Candidate Knowledge integration/write authority;
- source-resume passthrough authority and provenance;
- the distinction between source truth and AI interpretation;
- generated/materially rewritten claim backing and provenance;
- complete-resume composition / Issue #83 guarantees;
- Resume Content Selection, claim scope, coverage, completeness, duplication, and deterministic validation authority;
- Career Review / Human Review as final human authority;
- manual-edit non-learning boundary;
- provider credential privacy;
- the unresolved complete-source/no-core-tailoring-selection policy from Issue #95.

## Historical product state

Beta #4, #5, and #6 all failed the old Evidence Review comprehension model. Those historical failures remain authoritative for those shipped versions. PR #118 changes the product model; it does not retroactively make any prior Beta pass.

## Next action

1. Merge this durable Option 2 checkpoint.
2. Create a fresh Beta #7 issue with result **UNKNOWN**.
3. Beta #7 starts from Landing/Input; user personally operates the shipped localhost UI.
4. Beta #7 must judge Tailoring Review meaning without coaching and exercise at least one correction/regeneration loop.
5. Continue through complete Draft, Career Review, final PDF/report/secondary artifacts, final submission decision, time/value, trust, burden, and reuse intent.
6. Keep Issue #97 open unless the fresh applicant evidence actually satisfies its product acceptance bar.
