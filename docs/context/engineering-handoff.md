# Engineering Handoff

**Owner:** Engineering Room  
**Checkpoint:** 2026-08-06

## Start

Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, this file, Issues #95, #97, and #100, PR #99, and current GitHub state.

Repository evidence is authoritative over this handoff.

## Current state

- Issue #83 / PR #87 completed the complete-resume composition boundary.
- Beta #3 / Issue #93 is closed as **FAIL**.
- PR #99 is the engineering change set for Issues #95 and #97.
- Beta #4 / Issue #100 is the next real-user product gate after PR #99 is merged and primary CI is independently green.
- Beta Accepted remains **NO**.

## Protected truth boundary

- Exact validated source content remains verbatim `source_resume_passthrough`, has zero Resume Content Selection references, and never writes Candidate Knowledge.
- Generated or materially rewritten claims remain `candidate_knowledge_generated` and require Evidence Review → 003.6 → included selection, inherited provenance, and deterministic claim-scope validation.
- A source statement may disappear only when independently validated as replaced by matching Candidate Knowledge generated content in the same section.
- Whole-resume validation, Career Review of every populated section, and explicit human approval remain mandatory before export.
- Applicant presentation cleanup may repair visible mojibake, bullet markers, and date styling; it must not mutate stored source authority, Candidate Knowledge, provenance, or validation evidence.

## PR #99 implementation

- Explains Evidence Review Accept before the decision, including the 003.6 and unrelated-content boundary.
- Presents the complete draft and Career Review as a normal resume rather than raw JSON or UUID-like identifiers.
- Translates deterministic warning states into applicant-readable, actionable language without weakening the underlying gate.
- Keeps structured JSON and Markdown as secondary outputs.
- Adds `final-resume.pdf` as the primary applicant-facing export and a readable Career Review HTML report.
- Preserves the original API/service flow behind a presentation wrapper rather than adding a new knowledge or validation path.

## Test-integrity implementation

PR #99 adds independently named proof tiers:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:http-contract`
- `npm run test:browser-e2e`
- `npm run test:provider-smoke`
- `npm run test:all`

It also adds:

- a representative real-PDF contract from extraction through all approved exports;
- a real Chromium shipped-flow test with staged recovery;
- an executable pre-fix red proof for the applicant-facing browser regression;
- a manual, secret-gated, synthetic real-provider compatibility workflow;
- separate CI jobs so one green total cannot be misreported as Beta acceptance;
- future regression red/green and counterexample documentation.

## Proof status rules

Before merging PR #99, independently verify:

- Unit: PASS
- Integration: PASS
- HTTP / representative PDF contract: PASS
- Real-browser pre-fix red proof: PASS
- Real-browser change-set green proof: PASS
- Whitespace/diff: PASS
- Review threads: resolved
- Real-provider smoke: PASS, FAIL, or UNKNOWN; do not infer PASS when not executed
- Beta acceptance: UNKNOWN / NO until Issue #100 records the user’s judgment

After merge, verify the primary-branch workflow for the merge commit. Do not rely only on pull-request CI.

## Unresolved product policy

Issue #95 records an unresolved choice when a complete source-preserved resume has no included Experience or Projects tailoring selection. The current `qualityReady()` tailoring requirement remains unchanged. Do not implement source-only fallback or relax the gate without a Product decision and positive/counterexample regressions.

## Next action

1. Finish PR #99 only after all deterministic CI tiers pass and the diff is independently reviewed.
2. Merge PR #99 and verify primary-branch CI for the merge commit.
3. Close Issue #95 when its engineering acceptance criteria are proven.
4. Keep Issue #97 tied to the fresh user judgment required by its acceptance criterion 8.
5. Execute Beta #4 / Issue #100 one visible stage at a time with a real resume and real job description.
6. Do not mark Beta Accepted without the user’s explicit submission, time-savings, review-burden, trust, and reuse judgment.
