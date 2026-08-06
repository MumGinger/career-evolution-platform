# Project Snapshot

**Snapshot date:** 2026-08-06  
**Repository:** `MumGinger/career-evolution-platform`  
**Primary branch:** `chore/project-foundation`

## Product now

The Career Evolution Platform is a local, evidence-driven Career Companion. Its current Version 1 Beta workflow accepts a real resume and job description, performs bounded LLM understanding, exposes Evidence Review, integrates accepted evidence through 003.6, creates a job-specific draft, runs deterministic validation, requires Career Review, and exports Markdown, JSON, and HTML artifacts.

The platform must explain what it believes, preserve uncertainty, and keep the user as the final authority. A resume, LLM output, conversation answer, reflection, curiosity response, or generated artifact must not silently become Candidate Knowledge.

## Verified delivery state

### Engineering flow

- **Implemented:** PASS.
- **Integrated:** PASS.
- **Proven:** PASS for the representative real-provider engineering workflow recorded in PR #68.
- Startup recovery, GPT-5 preflight, and placement-aware draft-gate repairs were merged through PRs #75, #78, and #80.

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

The immediate product objective is not another Beta and not the first Intelligent Execution artifact. The system must first compose a coherent applicant-facing resume that preserves source identity/contact information and essential source-resume sections while applying job-specific, evidence-backed tailoring.

## Next action

1. Diagnose where source-resume structure and unchanged essential content are dropped between intake, tailoring, artifact generation, and export.
2. Define the smallest truth-preserving complete-resume composition boundary.
3. Preserve Candidate Knowledge and 003.6 as the authority for newly generated factual claims.
4. Add regression evidence showing that Projects-only tailored evidence does not collapse the rest of the source resume.
5. Independently inspect a complete applicant-facing draft before scheduling another real-user Beta.

Applicant-facing workflow clarity and Career Review readability remain verified blockers from Beta #2, but the first gate is complete-resume output. Wording and review quality cannot be accepted while the product emits only a resume fragment.

## Non-negotiable boundaries

- Candidate Knowledge is the only committed fact source for newly generated factual claims.
- 003.6 is the sole accepted-only Candidate Knowledge writer.
- LLM understanding and drafting are bounded proposals, not truth.
- Exact provenance and source support must survive every transformation.
- Deterministic validation must block unsupported or misplaced generated output.
- Career Review is mandatory before export.
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
- Active blocker: GitHub Issue #83
- Relevant merged repairs: PRs #75, #78, and #80

## Handoff instruction

A new Engineering Lead must inspect GitHub before acting because open issues, recent merges, branch state, and CI may be newer than this snapshot. The next Engineering Lead should begin with Issue #83 and must not schedule another Beta until a complete applicant-facing resume has been independently verified.
