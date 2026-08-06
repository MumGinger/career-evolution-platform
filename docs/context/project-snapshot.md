# Project Snapshot

**Snapshot date:** 2026-08-06  
**Repository:** `MumGinger/career-evolution-platform`  
**Primary branch:** `chore/project-foundation`

## Product now

The Career Evolution Platform is a local, evidence-driven Career Companion. Its current Version 1 Beta workflow uses a real resume and job description to produce source-backed working evidence, explicit Evidence Review, accepted-only Candidate Knowledge integration through 003.6, job-specific tailoring, a provenance-constrained resume draft, deterministic validation, mandatory Career Review, and final exports.

The platform must explain what it believes, preserve uncertainty, and keep the user as the final authority. A resume, LLM output, conversation answer, reflection, curiosity response, or generated artifact must not silently become Candidate Knowledge.

## Current delivery state

### Version 1 end-to-end engineering flow

- **Implemented:** PASS.
- **Integrated:** PASS.
- **Proven:** PASS for the representative real-provider engineering workflow recorded in PR #68.
- **Beta Accepted:** PENDING through Issue #73.

Recent merged repairs:

- PR #75 added privacy-safe provider preflight, customer-readable recovery, and idempotent export retry; its recorded GitHub Actions run passed 175 tests.
- PR #78 repaired GPT-5 preflight false failures after an empty bounded response; focused proof passed, while a full repository run was not created.
- PR #80 repaired the Beta quality gate so omitted historical facts do not block a valid Projects-only draft; focused proof passed 3/3, while the full repository suite remains unverified for that PR.

Do not infer Beta acceptance from these engineering results. The current decisive evidence is the user's fresh-process Beta #1 run.

## Active objective

Complete Issue #73 as a first-time user using the real resume, Zurich Data Analytics & AI job description, shipped Beta UI, and real OpenAI-compatible provider.

The immediate flow is:

1. Restart from the latest `chore/project-foundation` state.
2. Complete the full workflow without engineering guidance.
3. Inspect Understanding, exclusions, Evidence Review, draft, Career Review, and all exports.
4. Record usability, trust, review burden, output quality, and whether the resume is acceptable for a real application.
5. Mark Issue #73 PASS, FAIL, or UNKNOWN from user evidence.

## Next product decision after Beta

The Thinking Layer is complete through Decision Companion. After the Version 1 Beta outcome is recorded, choose the first Intelligent Execution artifact and define its validation and human-authority boundary before implementation.

## Non-negotiable boundaries

- Candidate Knowledge is the only committed fact source.
- 003.6 is the sole accepted-only Candidate Knowledge writer.
- LLM understanding and drafting are bounded proposals, not truth.
- Exact provenance and source support must survive every transformation.
- Deterministic validation must block unsupported or misplaced output.
- Career Review is mandatory before export.
- Human edits do not automatically update Candidate Knowledge or trigger regeneration.
- Passing tests or a real-provider engineering run does not equal Beta Accepted.
- Private resumes, job descriptions, credentials, provider responses, and local paths must not be committed or exposed.

## Authoritative references

- Product entry: `README.md`
- Project context entry: `PROJECT_CONTEXT.md`
- Detailed delivery state: `docs/current-state.md`
- Engineering ownership: `ENGINEERING_LEAD.md`
- Repository-wide agent rules: `AGENTS.md`
- Product intent: `docs/vision/` and `docs/principles/`
- Architecture: `docs/architecture/system-overview.md`
- Active beta acceptance: GitHub Issue #73
- Latest relevant merged repairs: PRs #75, #78, and #80

## Handoff instruction

A new Engineering Lead must inspect GitHub before acting, because open issues, recent merges, branch state, and CI may be newer than this snapshot. Update this file after the Beta #1 result or any change to the active objective, verified delivery state, key boundary, or next action.