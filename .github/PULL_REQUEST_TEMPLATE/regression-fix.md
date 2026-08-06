## User-visible requirement

- Issue / accepted requirement:
- User-visible failure:
- Expected corrected behavior:

## Regression integrity

- [ ] New regression demonstrably fails on the pre-fix commit.
- [ ] The same regression passes after the production fix.
- [ ] At least one negative or counterexample case exists.
- [ ] Any changed expected output is explained from the requirement, not copied from new output.
- [ ] A reviewer independently inspected both the production behavior and the acceptance assertion.

### Red evidence

Command, commit, and result. Use `UNKNOWN` when this could not be executed; do not infer failure or pass.

### Green evidence

Command, commit, and result.

### Counterexample

Describe the adjacent state that must remain rejected or unchanged.

## Proof tiers

- Unit:
- Integration:
- HTTP / representative PDF contract:
- Real browser E2E:
- Real-provider smoke:
- Whitespace / diff:

Mark each tier `PASS`, `FAIL`, `NOT APPLICABLE`, or `UNKNOWN`. Do not combine missing statuses into an overall pass.

## Truth and authority boundaries

- Candidate Knowledge / 003.6:
- Source passthrough:
- Provenance and uncertainty:
- Deterministic validation:
- Career Review and human authority:
- Privacy:

## Applicant-facing inspection

What did an applicant actually see, read, approve, and download?

## Beta acceptance

Engineering proof does not establish Beta acceptance. Record the separate real-user Beta issue and leave submission confidence, time saved, review burden, trust, and reuse intent `UNKNOWN` until the user judges them.
