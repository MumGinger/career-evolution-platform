---
name: beta-gate
description: Use only when explicitly asked to decide whether the Career Evolution Platform is ready to enter or pass beta. Run the complete real-user workflow, combine technical proof with explicit human feedback, and return BETA ACCEPTED, BETA REJECTED, or INCONCLUSIVE. Do not modify or repair the product during the gate.
---

# Beta Gate

Determine whether the Career Evolution Platform has demonstrated a useful end-to-end user outcome.

This is a release gate, not a development or debugging session.

Do not modify product code, tests, acceptance criteria, or architecture during the gate. Record defects separately after the assessment.

## Required scenario

Use:

- one real user-owned resume
- one real target job description
- the product interface intended for the beta user
- a first-time-user perspective

Private resume and job-description content must not be committed, copied into fixtures, or included verbatim in the report.

## Technical criteria

Verify that:

1. The resume can be submitted successfully.
2. The job description can be submitted successfully.
3. Experience, projects, skills, education, and certifications are retained when supported by the source.
4. Evidence Review shows understandable source-backed candidates.
5. Accepting or rejecting evidence changes downstream behavior correctly.
6. Only reviewed, source-supported evidence reaches Candidate Knowledge.
7. The generated resume contains meaningful, non-empty supported content.
8. Empty or invalid core content blocks success and export.
9. Career Review is required before final export.
10. The final resume can be opened or downloaded in its promised formats.
11. Unsupported claims are blocked.
12. No private source data or credentials are persisted unexpectedly.

## Human criteria

Obtain explicit user evidence for:

1. Could the user understand what to do next?
2. Could the user complete the workflow without developer knowledge?
3. Did the review process require reasonable effort?
4. Did the final resume feel like the user?
5. Did the final resume clearly fit the target job?
6. Did the system increase or decrease trust, and why?
7. Did the workflow save time compared with doing the task manually?
8. Would the user use the result for a real application?

Do not infer satisfaction from task completion. Record explicit answers.

## Decision rules

Return `BETA ACCEPTED` only when:

- all required technical criteria pass
- no critical privacy, truthfulness, export, or workflow blocker exists
- the human criteria have explicit evidence
- the user confirms the result is useful enough for real use

Return `BETA REJECTED` when any critical criterion fails.

Return `INCONCLUSIVE` when required execution or human evidence is missing.

Automated tests cannot satisfy human criteria.

## Durable report

Write the result to:

`reports/beta/YYYY-MM-DD-<scenario>.md`

The report may include safe filenames, artifact paths, commands, timings, statuses, and paraphrased user feedback. It must not include private source content, credentials, or raw model responses.

Do not commit the report automatically.

## Output

# Beta Gate

**Decision:**  
BETA ACCEPTED / BETA REJECTED / INCONCLUSIVE

**Scenario:**  
Safe description of resume, job, environment, and interface.

**Completion time:**  
Observed user completion time.

## Technical Criteria

For every criterion:

- PASS
- FAIL
- UNKNOWN
- supporting evidence

## Human Evidence

Record the user's explicit answers and major trust changes.

## Critical blockers

List only blockers that prevent beta acceptance.

## Non-blocking friction

List usability or quality problems that do not invalidate the core flow.

## User-visible result

Describe and inspect the actual final resume.

## Next decision

State exactly one of:

- Proceed with beta
- Repair the named blocker and rerun the gate
- Gather the missing evidence and rerun the gate
