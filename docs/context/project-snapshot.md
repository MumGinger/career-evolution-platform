# Project Snapshot

**As of:** 2026-08-06 — after Beta #5 engineering recovery
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`

## State

- The representative evidence-to-export engineering flow remains **Implemented and Integrated** for its specified behavior.
- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Issue #83 / PR #87: complete-resume composition engineering complete.
- Beta #3 / Issue #93: **FAIL**.
- Issues #95 and #97 / PR #99: applicant-readable review/export and proof-tier engineering merged; Issue #97 remains open for fresh-user product acceptance.
- Beta #4 / Issue #100: **FAIL**.
- Issues #101–#103 / PR #104: engineering recovery merged and checkpointed by PR #105.
- Beta #5 / Issue #106: **FAIL at Evidence Review Candidate 1**. This historical result is unchanged.
- Issues #107 and #108 / PR #111: engineering recovery merged at `f06ce4633799e1e938d267a29b1aba9cf9851281`; both issues are closed after regression and shipped-browser proof.
- Beta Accepted: **NO**.

The next product gate must be a fresh Beta. Engineering proof does not convert Beta #5 into PASS.

## What PR #111 changed

### Evidence Review

The applicant-facing decision now separates three concepts that Beta #5 conflated:

- **uploaded source evidence** — what came from the applicant's resume;
- **possible evidence reuse** — how that evidence may support new or rewritten tailored wording;
- **job relevance** — why the evidence was surfaced.

Accept permits the reviewed evidence to support new/rewritten wording after later checks. It does not guarantee final-resume inclusion and does not decide whether source-resume text remains. Skip prevents that evidence from being reused for new/rewritten wording and does not delete the uploaded source text.

The old `Proposed resume use` framing and applicant-visible Candidate Knowledge / 003.6 terminology are removed from the primary decision surface. Every Evidence Review candidate remains individually reviewable.

### Draft presentation

Applicant presentation cleanup now:

- removes unexplained source bullet glyphs;
- collapses adjacent duplicate visible statements caused by alternate presentation forms;
- removes a repeated entry/project heading prefix from the following bullet;
- preserves identical legitimate source wording when it occurs under separate jobs or headings;
- preserves negative values such as `-5%`;
- keeps existing date-range and mojibake cleanup at the presentation boundary only.

### Career Review

Every populated section now presents a visible human choice:

- `Looks correct — approve this section`; or
- `Needs changes — edit this section before export`.

An applicant can correct reviewed text before export instead of approving incorrect content merely to continue. Manual edits use the existing Human Review edit authority, preserve the original AI version separately, do not write Candidate Knowledge, and flow through PDF, Career Review HTML, Markdown, and JSON.

## Protected capability boundary

PR #111 did not introduce a new knowledge, provenance, composition, validation, provider, review, export, or privacy authority path.

- 003.6 remains the sole Candidate Knowledge integration/write authority.
- Source-resume passthrough remains source-linked and cannot create Candidate Knowledge.
- Generated or materially rewritten claims retain existing Candidate Knowledge, provenance, and validation requirements.
- Complete-resume composition and source-passthrough guarantees remain unchanged.
- Deterministic validation remains authoritative.
- Career Review / Human Review remains the human authority before export.
- Manual Career Review edits do not silently rewrite Candidate Knowledge.
- Provider credentials remain memory-only/private.
- The unresolved complete-source/no-core-tailoring-selection policy recorded from Issue #95 remains unchanged.

## Engineering proof

Regression-first browser and unit changes were committed before production behavior changed.

PR #111 final merge-candidate CI run `31146301364`:

- unit tests: **PASS**;
- full integration tests: **PASS**;
- patch whitespace: **PASS**;
- HTTP / representative PDF contract: **PASS**;
- pre-change Chromium RED proof: **PASS**;
- current Chromium GREEN proof: **PASS**;
- every Evidence candidate remains reviewable: **PASS**;
- Career Review correction path: **PASS**;
- applicant edit reaches PDF/HTML/Markdown/JSON: **PASS**;
- source-completeness counterexamples: **PASS**;
- review threads: **none**;
- current-primary merge candidate: **PASS**.

The final CI checkout tested the PR merge ref combining #111 with the Beta #5 failure checkpoint on primary (`07420fe2216c25bbfbb369c14e8a640978f342aa`).

Manual secret-gated real-provider smoke for this presentation/human-review change is **UNKNOWN / non-blocking** because the provider execution path did not change.

## Product acceptance still unresolved

Issue #97 remains open. A fresh Beta must determine whether a first-time applicant:

- understands Evidence Review without interpreting Accept/Skip as final inclusion;
- can complete every Evidence candidate with reasonable burden;
- finds the Draft readable and free of material repetition/artifacts;
- discovers how to correct a Career Review section without coaching;
- trusts the review/source explanations;
- would submit `final-resume.pdf` without rebuilding it elsewhere;
- saves meaningful time;
- would use the product again.

Beta #5 later-stage judgments remain **UNKNOWN** because the credible run stopped at Evidence Review Candidate 1.

## Next cross-room action

1. Merge the durable Beta #5 engineering recovery checkpoint containing this snapshot, `docs/context/engineering-handoff.md`, `docs/context/beta-handoff.md`, and `docs/current-state.md`.
2. Only after the checkpoint is merged, create a fresh Beta #6 issue.
3. Beta #6 must start from Landing/Input with a real resume and real job description; do not continue Beta #5.
4. Retest Evidence Review Candidate 1 comprehension before the applicant chooses.
5. If that blocker is cleared, continue through every Evidence candidate, Draft/validation, Career Review, all final artifacts, submission readiness, time/value, burden, trust, and reuse intent.

Current GitHub and Layer 1 records override this snapshot.
