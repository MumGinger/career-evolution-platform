# Engineering Handoff

**Owner:** Engineering Room
**Checkpoint:** 2026-08-06 — Beta #5 engineering recovery

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, `docs/context/beta-handoff.md`, Beta #5 / Issue #106, closed Issues #107 and #108, open Issue #97, merged PR #111, and current GitHub state.

Repository evidence is authoritative over this handoff.

## Current state

- Beta #5 / Issue #106 remains the authoritative product result: **FAIL at Evidence Review Candidate 1**.
- PR #111 merged to `chore/project-foundation` at `f06ce4633799e1e938d267a29b1aba9cf9851281`.
- Issue #107 is **CLOSED / engineering PASS** after regression-first and real-browser proof of the Evidence Review reuse/inclusion distinction.
- Issue #108 is **CLOSED / engineering PASS** after direct browser proof of an applicant correction/edit path through Career Review and export.
- Issue #97 remains **OPEN** because full applicant-readable resume quality and real-user submission acceptance still require a fresh Beta.
- Beta Accepted remains **NO**.

No product or architecture decision is currently required before the next fresh Beta.

## Applicant-visible contract after PR #111

### Evidence Review

The primary review surface distinguishes:

- what came from the uploaded resume;
- how that evidence may support new or rewritten tailored wording;
- why the evidence was surfaced for this job.

Accept permits evidence reuse for new/rewritten wording after later checks. It does not guarantee final-resume inclusion. Skip blocks evidence reuse for new/rewritten wording and does not remove original source-resume text.

Applicant-visible Candidate Knowledge / 003.6 terminology and the old `Proposed resume use` framing are absent from the primary decision surface. Every candidate remains individually reviewable.

### Draft presentation

Presentation cleanup is intentionally bounded:

- leading source bullet glyphs may be removed for display;
- adjacent duplicate display statements may collapse to one structured copy;
- a heading repeated immediately at the start of its following bullet may be removed from that bullet;
- identical legitimate source statements separated by distinct jobs/headings must remain separate;
- negative values such as `-5%` must remain intact;
- stored source authority, provenance, and Candidate Knowledge are not modified by presentation cleanup.

### Career Review

Every populated section exposes two applicant choices:

- approve the section as correct; or
- mark it as needing changes and edit the exported section text.

The edit path uses the existing Human Review `edit` authority. The original AI version remains separately stored. Manual edits are not learned as Candidate Knowledge and are applied to the approved export set.

## Protected truth and authority boundary

PR #111 does not alter:

- 003.6 as the sole Candidate Knowledge integration/write authority;
- Candidate Knowledge acceptance/conflict rules;
- source-resume passthrough authority;
- complete-resume composition;
- Resume Content Selection or provenance inheritance;
- claim-scope, coverage, completeness, duplication, or deterministic validation rules;
- provider execution or credential privacy;
- Career Review as the final human review authority before export;
- the unresolved complete-source/no-core-tailoring-selection policy from Issue #95.

Manual Career Review edits remain human-authority changes to the reviewed artifact, not new profile knowledge.

## Regression-first proof

Regression changes preceded production behavior changes. The regression-only phase demonstrated expected failure on the shipped pre-change behavior before the applicant-facing fix was implemented.

PR #111 final merge-candidate CI run `31146301364`:

- Unit: **PASS**
- Full integration: **PASS**
- Patch whitespace: **PASS**
- HTTP / representative PDF contract: **PASS**
- Pre-change Chromium RED proof: **PASS**
- Current Chromium GREEN proof: **PASS**
- Every Evidence Review candidate reviewable: **PASS**
- Source/reuse/relevance labels and consequences: **PASS**
- Source bullet cleanup: **PASS**
- Adjacent duplicate presentation cleanup: **PASS**
- Repeated heading-prefix cleanup: **PASS**
- Legitimate repeated source text across separate entries preserved: **PASS**
- Negative-value counterexample preserved: **PASS**
- Career Review correction path: **PASS**
- Manual edit propagated to PDF, Career Review HTML, Markdown, and JSON: **PASS**
- Review threads: **PASS / none**
- Current-primary merge candidate: **PASS**

The final Actions checkout used the PR merge ref combining head `8c81775fef46ca1397a06aaddf9d1508254fefc8` with primary Beta #5 checkpoint `07420fe2216c25bbfbb369c14e8a640978f342aa`.

## Explicit UNKNOWN / non-acceptance evidence

- Manual secret-gated real-provider smoke for PR #111: **UNKNOWN / non-blocking** because provider execution did not change.
- Fresh-user comprehension of the repaired Evidence Review: **UNKNOWN** until Beta #6.
- Draft readability with the user's real resume: **UNKNOWN** until Beta #6.
- Career Review correction discoverability for a fresh applicant: **UNKNOWN** until Beta #6.
- Submission readiness, review burden, trust, time saved, practical value, and reuse intent: **UNKNOWN** until Beta #6.

Engineering proof must not substitute for those product judgments.

## Next action

1. Merge the durable Beta #5 engineering recovery checkpoint.
2. Only after that checkpoint is merged, create a **fresh Beta #6 issue**.
3. Start Beta #6 from Landing/Input with a real resume and real job description.
4. At Evidence Review Candidate 1, ask the applicant to explain the decision, Accept, Skip, source-text preservation, relevance, and final-inclusion consequence before choosing; do not coach the answer.
5. If Candidate 1 is understandable, continue through every Evidence candidate.
6. Inspect Draft readability/repetition and Career Review correction discoverability.
7. Inspect PDF, Career Review HTML, Markdown, and JSON directly.
8. Record submission, time/value, burden, trust, and reuse judgments from the applicant.
9. Keep Beta #5 / Issue #106 as FAIL regardless of Beta #6 outcome.
