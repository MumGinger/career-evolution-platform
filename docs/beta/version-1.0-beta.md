# Version 1.0 Beta

## Scope

Version 1.0 Beta ships one bounded capability: an evidence-driven, job-specific resume that the candidate explicitly reviews before final export. It does not add job discovery, interview preparation, LinkedIn, networking, application submission, or automated outcome learning.

## Product promise

The platform helps the candidate understand and choose how to present their supported experience. It does not decide for them. No career artifact is finalized without explicit human review.

## Beta checklist

- [ ] Resume source is uploaded and preserved as evidence.
- [ ] Job description is supplied and a requirement profile is created.
- [ ] Existing evidence is understood and any material unknowns are handled through the existing bounded acquisition flow.
- [ ] Shared candidate/job understanding is available in the immutable artifacts.
- [ ] Presentation Strategy explains included and withheld evidence, coverage, and limitations.
- [ ] Resume Draft passes structural truth validation (warnings are visible).
- [ ] Candidate completes Career Review by explicitly approving every resume section.
- [ ] Final export is available only after completed Career Review and passing validation.
- [ ] `report.html`, `presentation-strategy.json`, `career-review.json`, and `final-export.json` are retained with the run.
- [ ] Regression suite passes before a beta build is shared.

## Running the beta fixture

Run the command in the root README with the supplied resume, job, capture, and Career Review fixtures. Omit `--review` to exercise the intended blocked-export state.
