---
name: prove-it
description: Use only when explicitly asked to independently verify whether an implemented issue or pull request satisfies its acceptance criteria. Run the highest-level representative workflow available, inspect the resulting artifacts, and report PASS, FAIL, or UNKNOWN for every criterion. Do not fix the implementation during the verification run.
---

# Prove It

Independently verify a completed implementation against its originating acceptance criteria.

This is a verification workflow, not an implementation workflow.

Do not modify product code, tests, specs, issues, pull requests, or acceptance criteria during this run. Temporary execution outputs are allowed but must not be committed unless the user explicitly requests it.

## Process

1. Determine the verification target:
   - explicit issue or pull request
   - current branch pull request
   - most recently implemented ticket
2. Read:
   - repository `AGENTS.md`
   - originating issue or spec
   - pull request description and diff
   - relevant tests and execution instructions
3. Extract every required acceptance criterion into a verification matrix.
4. Identify the highest practical testing seam:
   - prefer the complete user journey
   - then public API or CLI boundary
   - then integration boundary
   - use unit tests only for behavior that cannot be verified at a higher seam
5. Select representative inputs.

For user-facing product behavior, use real or realistically representative inputs. User-owned private inputs may be used locally but must never be copied into the repository, logs, fixtures, reports, or responses.

6. Execute the workflow.

Record:
   - command or interaction
   - environment
   - relevant inputs by safe label only
   - exit status
   - resulting artifacts
   - visible behavior
   - errors and warnings
7. Inspect the actual output, not only the exit code or test count.
8. Classify every criterion:
   - `PASS`: directly demonstrated by evidence
   - `FAIL`: directly contradicted by evidence
   - `UNKNOWN`: not executed, not observable, or insufficiently evidenced
9. Automated tests are engineering evidence. They do not by themselves prove usability, usefulness, clarity, visual quality, or human satisfaction.
10. The overall result is `PASS` only when every required criterion passes and none remain unknown.
11. On failure, report the smallest reproducible failure and stop. Do not repair it in the same run.

## Output

# Proof Report

**Target:**  
Issue or pull request.

**Overall result:**  
PASS / FAIL / UNKNOWN

**Representative scenario:**  
The input and workflow used, without exposing private content.

## Acceptance Matrix

For each criterion:

### Criterion N — concise name

**Status:** PASS / FAIL / UNKNOWN

**Evidence:**  
Exact command, interaction, output, artifact, or observation.

**Notes:**  
Relevant limitations.

## User-visible result

Describe what a user actually receives or experiences.

## Engineering validation

List tests, checks, CI, and execution status.

## Not proven

List all behavior that remains unverified.

## Smallest next action

State the smallest action required to turn the first FAIL or UNKNOWN into evidence.
