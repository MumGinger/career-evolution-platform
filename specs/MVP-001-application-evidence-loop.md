# MVP-001: Application-to-Interview Evidence Loop

## User problem and scope

A candidate needs to prepare one traceable application and record its later outcome without treating that outcome as automatic learning. The local MVP supports one candidate profile, pasted job-description content, a deterministic tailored application note, and application evidence history.

## Records and behavior

- Applications store the candidate link, company, role, location, pasted description, category, date, and current status.
- Each generated artifact stores its version, exact `application-tailoring@0.1.0` skill version, and model metadata.
- Outcomes are stored as evidence: `interview_invited` is primary outcome evidence; `rejected` and `no_response` are weak negative evidence; `withdrawn` and `unknown` remain contextual or unknown.
- User edits are stored separately as preference evidence. Rubric scores are internal diagnostic evidence.
- Every evidence row records source, confidence, and limitations. All rows explicitly disallow automatic skill updates in v0.1.

## Evaluation and privacy

The MVP makes no causal claim from a single outcome. It retains only the local data supplied to the CLI; users should avoid entering sensitive information they do not wish to store locally. Later work must define consent, retention, and review policy before broader collection.

## Acceptance criteria

- The CLI completes profile creation, job input, artifact creation, outcome recording, and history display against a local SQLite database.
- Tests cover record creation, skill-version linkage, and evidence classification.
- No scraping, application submission, automatic skill update, orchestration, or framework extraction is included.
