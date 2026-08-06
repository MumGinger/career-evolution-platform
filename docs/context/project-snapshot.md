# Project Snapshot

**Snapshot date:** 2026-08-06  
**Repository:** `MumGinger/career-evolution-platform`  
**Primary branch:** `chore/project-foundation`

## Product now

The Career Evolution Platform is a local, evidence-driven Career Companion. Its current Version 1 Beta workflow accepts a real resume and job description, performs bounded LLM understanding, exposes Evidence Review, integrates accepted evidence through 003.6, creates a job-specific draft, runs deterministic validation, requires Career Review, and exports Markdown, JSON, and HTML artifacts.

The platform must explain what it believes, preserve uncertainty, and keep the user as the final authority. A resume, LLM output, conversation answer, reflection, curiosity response, or generated artifact must not silently become Candidate Knowledge.

## Verified delivery state

### Engineering flow

- The representative real-provider engineering workflow recorded in PR #68 remains **Implemented, Integrated, and Proven** for its specified evidence-to-export behavior.
- Startup recovery, GPT-5 preflight, and placement-aware draft-gate repairs were merged through PRs #75, #78, and #80.
- Issue #83 recovery is **diagnosed and prototyped, not Proven**. Draft PR #87 identifies the loss after Evidence Review and implements one candidate dual-lane composition boundary, but it is not merge-ready or accepted product behavior.
- At the latest Engineering checkpoint, PR #87 had focused synthetic proof only, no GitHub checks or workflow runs, and a branch 11 commits ahead and 2 behind the current base.

### Product acceptance

- **Beta #1 / Issue #73:** FAIL and closed.
- **Beta #2 / Issue #82:** FAIL and closed.
- **Beta Accepted:** NO / NOT YET.

Beta #2 completed the full browser workflow and produced all three exports, but technical completion did not produce a usable product outcome. The user would not submit the generated resume, reported no meaningful time savings, and would not use the product again in its current state.

## Verified Beta #2 findings

- Landing and connection feedback were unclear; the user could not tell whether Check connection worked or whether to wait or click again.
- Understanding counts and exclusions were not applicant-readable.
- Evidence Review did not clearly distinguish truth confirmation, relevance, and inclusion in the final resume.
- The generated draft and `final-resume.md` contained only one project statement rather than a complete resume.
- Personal information and necessary source-resume sections such as Experience, Skills, Education, and other essential content were missing.
- Career Review and `career-review-report.html` exposed structured fields and long identifiers instead of an understandable applicant-facing explanation.
- `final-resume.json` existed but was not useful to the user.
- The complete run took about ten minutes and delivered less value than manual tailoring.

Successful execution, deterministic validation, and export availability therefore remain distinct from Beta Accepted.

## Active objective

Resolve Issue #83: **Produce a complete recognizable tailored resume.**

Repository diagnosis now shows that validated source-resume structure survives understanding but is dropped after Evidence Review because downstream tailoring, artifact generation, Career Review, and export operate only on included Candidate Knowledge selections.

The immediate cross-room objective is to record the smallest truth-preserving complete-resume composition decision. Draft PR #87 currently prototypes the dual-lane option (`source_resume_passthrough` plus `candidate_knowledge_generated`), but Product has not yet accepted that option over the other recorded alternatives.

## Next action

1. Product records a **Complete Resume Composition Decision** in Layer 1, defining authority, provenance, validation, review burden, Career Review, and applicant-facing behavior for source-preserved versus generated or materially rewritten content.
2. Engineering rebases or updates draft PR #87 onto the latest `chore/project-foundation` and aligns or replaces its prototype against the accepted decision.
3. Engineering runs the full suite, GitHub checks, shipped LLM-first complete-export regression, complete diff review, and independent artifact inspection.
4. Only after a complete applicant-facing draft is Proven should another real-user Beta be prepared.

Applicant-facing workflow clarity and Career Review readability remain verified blockers from Beta #2, but the first gate is complete-resume output. Wording and review quality cannot be accepted while the product emits only a resume fragment.

## Non-negotiable boundaries

- Candidate Knowledge is the only committed fact source.
- 003.6 is the sole accepted-only Candidate Knowledge writer.
- LLM understanding and drafting are bounded proposals, not truth.
- Exact provenance and source support must survive every transformation.
- Deterministic validation must block unsupported or misplaced output and must not confuse claim safety with whole-resume completeness.
- Career Review is mandatory before export and must operate on the complete applicant-facing artifact.
- Human edits do not automatically update Candidate Knowledge or trigger regeneration.
- Passing tests, a real-provider engineering run, completed workflow, or available exports do not equal Beta Accepted.
- Private resumes, job descriptions, credentials, provider responses, and local paths must not be committed or exposed.

## Authoritative references

- Product entry: `README.md`
- Project context entry: `PROJECT_CONTEXT.md`
- Detailed delivery history: `docs/current-state.md`
- Engineering ownership: `ENGINEERING_LEAD.md`
- Repository-wide agent rules: `AGENTS.md`
- Product intent: `docs/vision/` and `docs/principles/`
- Architecture: `docs/architecture/system-overview.md`
- Beta #1 result: GitHub Issue #73
- Beta #2 result: GitHub Issue #82
- Active blocker and product question: GitHub Issue #83
- Active engineering prototype: draft PR #87
- Product Room checkpoint: merged PR #89

## Handoff instruction

A new room must inspect GitHub before acting because open issues, recent merges, branch state, and CI may be newer than this snapshot. Product owns the unresolved complete-resume composition decision. Engineering must keep PR #87 draft until that decision is recorded and must not schedule another Beta until complete-resume engineering proof passes.
