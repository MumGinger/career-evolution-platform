# Current State

**Phase:** Capability 003.3 Evidence Discovery Engine
**Last updated:** 2026-08-03

## Completed

- Established project foundation and working agreement.
- Documented the product-first vision, architecture principles, and initial design models.
- Recorded the decision to validate Career before extracting a framework.
- Implemented MVP-001: a local application-to-interview evidence loop with SQLite persistence, versioned artifacts, and non-learning outcome evidence.
- Implemented Experiment 002: PDF resume intake that bootstraps traceable Candidate Knowledge facts without inferred content.
- Implemented Capability 003.1: deterministic, versioned Job Intelligence profiles with immutable job-description snapshots, requirement excerpts, policy rationale, and parser/policy metadata.
- Implemented Capability 003.2: deterministic, persisted, immutable Information Need prioritization runs that retain the job-profile version, candidate-evidence snapshot, policy inputs, evidence references, uncertainty, and rationale.
- Implemented Capability 003.3: deterministic local Evidence Discovery Runs that search bounded snapshot sources, retain candidate provenance and resolutions, stop when evidence is sufficient, and leave unresolved needs without asking a user or updating Candidate Knowledge.

## Current focus

Review Evidence Discovery source ordering, confirmation thresholds, and conflict rules against representative, consented local evidence before adding acquisition interaction.

## Next decision

Define Capability 003.4: ask focused user questions only for high-value Information Needs that remain unresolved after evidence discovery.

## Open questions

- What evidence sources are useful, consented, and ethically appropriate beyond local user-entered data?
- What makes available evidence "sufficient" for each bounded artifact or decision?
- What review authority and corroboration threshold are required before outcome evidence changes a priority or skill?
- What experiment can measure whether acquisition improves decision quality without making a causal claim from a single interview outcome?
- Which job-description synonyms and section formats should be added only after observed product evidence?
