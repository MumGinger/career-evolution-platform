# Engineering Room Handoff

**Last checkpoint:** 2026-08-06 17:15 ET  
**Room authority:** Repository evidence, current GitHub state, `ENGINEERING_LEAD.md`, and `AGENTS.md` override this handoff when they conflict.

## Purpose

This file carries only the active working state needed to replace a long Engineering Room. Durable implementation evidence belongs in issues, pull requests, commits, tests, checks, ADRs, specifications, and `docs/current-state.md`.

## Current engineering objective

Resolve Issue #83 without weakening truth boundaries. The source-loss diagnosis is complete, but the complete-resume composition boundary is still an unresolved Product decision. Keep PR #87 as a draft prototype until Product records the accepted authority, provenance, validation, Career Review, and applicant-facing behavior for source-preserved content versus generated or materially rewritten claims.

After that decision, align PR #87 to it, update the branch from the latest base, run full repository proof, and independently inspect a complete shipped applicant-facing artifact before another Beta is prepared.

## Active issue or pull request

- Active issue: Issue #83 — **Beta blocker — Produce a complete recognizable tailored resume**; open.
- Active pull request: Draft PR #87 — **Fix #83 complete resume composition boundary**.
- Current branch or base:
  - repository default/base: `chore/project-foundation`;
  - verified base tip at checkpoint: `edf27717b0726e30accf4b49a659213e6480b37d` from merged Product checkpoint PR #89;
  - PR branch: `agent/issue-83-complete-resume-composition`;
  - latest PR head at checkpoint: `f817cfce92a52b74fb7b5da88d401c5baf87ddff`;
  - branch comparison: 11 commits ahead and 2 commits behind the current base; merge base `cc77fabff2624453f6b914de36c6534d91caefca`.
- Delivery state: **Prototyped / partially Implemented only**. PR #87 is not Integrated, Proven, merge-ready, or Beta Accepted.

## Verified evidence

- Root-cause diagnosis: **PASS by repository inspection.** Validated source-resume blocks and hierarchy survive Resume Understanding. The complete document is lost after Evidence Review because tailoring, artifact generation, Career Review, and export render only included Candidate Knowledge selections. This diagnosis is recorded in PR #87 and Issue #83.
- Focused validation: PR #87 reports **5 passing** complete-resume composition fixture tests. The checkpoint did not independently rerun them.
- Synthetic artifact inspection: PR #87 records an inspected six-section draft from 11 source statements, with 10 preserved verbatim and 1 bounded project replacement. This is engineering prototype evidence, not real-user proof.
- Full regression or CI: **UNKNOWN.** The latest PR head has no GitHub status checks and no workflow runs. The PR body still lists full repository regression and pull-request checks as pending.
- Review state: PR #87 has one Engineering checkpoint review and no unresolved inline threads. The review explicitly blocks merge pending Product decision, branch update, full validation, complete diff review, shipped export proof, and post-rebase artifact inspection.
- Representative user-visible proof:
  - Beta #2 / Issue #82: **FAIL**. The shipped real-provider flow completed and exported three files, but the user received an incomplete one-project resume and would not submit or reuse it.
  - PR #87: synthetic complete-draft proof only; no current real-resume or shipped-browser acceptance proof.
- Remaining UNKNOWN claims:
  - whether Product accepts the dual-lane `source_resume_passthrough` / `candidate_knowledge_generated` boundary implemented by PR #87;
  - whether PR #87 remains correct after rebasing onto the latest base and Product checkpoint;
  - complete PR diff correctness and architecture impact;
  - full repository test suite, whitespace, and CI;
  - the shipped LLM-first Projects-only regression and final Markdown export;
  - exact Candidate Knowledge contents after the complete export path;
  - post-rebase independent inspection of the final Markdown, JSON, and Career Review report;
  - real-user usefulness and Beta acceptance.

## Boundaries relevant to the active work

- Candidate Knowledge remains the committed authority for every newly generated or materially rewritten factual claim.
- 003.6 remains the sole accepted-only Candidate Knowledge writer.
- Any source-preserved content must remain exact, source-linked, and unable to silently create or strengthen Candidate Knowledge.
- Exact provenance, source order and hierarchy, uncertainty, and parent/child relationships must survive composition.
- Deterministic validation must keep generated-claim safety distinct from whole-resume composition and completeness.
- Career Review must review the complete applicant-facing resume before export.
- No test, successful export, synthetic artifact, or engineering run may be described as Beta Accepted.
- Private resumes, job descriptions, credentials, provider responses, and local paths must not enter the repository or normal customer diagnostics.

## Blockers and decisions required

- Engineering blockers:
  - PR #87 is 2 commits behind the current base and remains draft;
  - no current CI/status checks exist;
  - full suite, shipped complete-export regression, complete diff review, and final artifact inspection remain pending.
- Product or architecture decisions required:
  - Product must accept or refine the complete-resume composition boundary before PR #87 can become merge-ready;
  - the decision must define authority, provenance, validation, review burden, Career Review, and applicant-facing treatment for unchanged source content versus generated/materially rewritten claims.
- User-only local, browser, credential, or private-input actions: none now. A private real-resume/browser run is deferred until the Product boundary is accepted and engineering proof passes.

## Next engineering action

Check Issue #83 and `docs/context/product-handoff.md` for a merged **Complete Resume Composition Decision**. Do not modify or merge PR #87 until that decision exists. Once recorded, rebase or merge the latest `chore/project-foundation` into PR #87 and perform a full acceptance-matrix review against the accepted boundary.

## Checkpoint instructions for the existing room

Before retiring the current Engineering Room:

1. Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, and `docs/context/project-snapshot.md`.
2. Inspect current issues, pull requests, recent merges, branch state, review threads, and checks.
3. Update durable Layer 1 records first when implementation truth changed.
4. Replace every `_not checkpointed_` field above with the current verified state; delete sections that are not relevant.
5. Update `project-snapshot.md` only when the cross-room objective, verified delivery state, key boundary, blocker, or next project action changed.
6. Commit the handoff through a reviewed pull request.

## New Engineering Room startup

> Read `PROJECT_CONTEXT.md`, `ENGINEERING_LEAD.md`, `AGENTS.md`, `docs/context/project-snapshot.md`, and `docs/context/engineering-handoff.md`. Then inspect current GitHub issues, pull requests, recent merges, branch state, review threads, and checks before acting. Take ownership of the active engineering state. Repository evidence is authoritative over previous chat history.
