---
name: project-status
description: Use only when explicitly asked to report the verified delivery status of the current repository, milestone, issue, or pull request. Compare completion claims against Git, GitHub, tests, artifacts, acceptance evidence, and user-visible outcomes. This is read-only and must not modify project state.
---

# Project Status

Produce a verified, read-only report of where the project actually stands.

Do not modify code, tests, documentation, issues, pull requests, branches, or labels.

## Process

1. Read the repository `AGENTS.md`.
2. Identify the target in this order:
   - an issue or pull request explicitly named by the user
   - the current branch and its associated pull request
   - the current milestone or active project objective
3. Inspect the strongest available evidence:
   - originating issue or spec
   - pull request description and diff
   - CI and test results
   - executable acceptance evidence
   - generated user-visible artifacts
   - recorded human beta evidence
   - roadmap and current-state documents
4. Treat roadmap, current-state, PR descriptions, test counts, and implementation reports as claims, not proof by themselves.
5. Classify the current stage:
   - `Specified`: the problem, scope, and acceptance criteria are defined.
   - `Prototyped`: the highest-risk assumption has been tested with a minimal experiment.
   - `Implemented`: the code exists and engineering tests pass.
   - `Integrated`: the change is connected to the intended end-to-end workflow.
   - `Proven`: all required acceptance criteria have representative execution evidence.
   - `Beta Accepted`: a real user completed the workflow and explicitly confirmed the result was useful.
6. Never promote a stage because a document or PR calls the work complete.
7. If evidence is unavailable, mark it `UNKNOWN`. Do not infer success.

## Output

# Project Status

**Current objective:**  
What user problem the project is currently trying to solve.

**Current stage:**  
Specified / Prototyped / Implemented / Integrated / Proven / Beta Accepted

**Active issue:**  
Issue number and title, or `None identified`.

**Active pull request:**  
PR number and title, or `None identified`.

**What is implemented:**  
The concrete behavior that exists.

**Last proven user outcome:**  
The most recent user-visible outcome demonstrated with representative execution evidence.

**Acceptance status:**  
PASS / FAIL / UNKNOWN

**Evidence:**  
Commands, tests, artifacts, PRs, or beta reports that support the assessment.

**Current blocker:**  
The smallest concrete condition preventing advancement to the next stage.

**Not yet proven:**  
Claims that remain unsupported by representative or human evidence.

**Next smallest action:**  
Exactly one bounded action that would produce the most valuable new evidence.
