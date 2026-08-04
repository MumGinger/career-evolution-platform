# Career Understanding MVP

## Goal

Show a read-only Current Career Snapshot from committed Candidate Knowledge, validated explicit Resume AST evidence, user-confirmed career-conversation answers, and recorded applications. The AI must always explain why it believes something about the user.

## Boundary

Snapshot Runs and feedback are immutable. Candidate Knowledge is read only. Applications are neutral activity signals; a single application never creates a preference. Unknowns stay visible. No coaching, recommendations, prediction, goals, personality, or preference inference is in scope.

Committed Candidate Knowledge is allowlisted: only `skill` and `tool` may appear as strengths, and only `domain_knowledge` may appear as a domain. All other entity types, including employment, education, certifications, projects, achievements, and `working_style`, are out of scope for this MVP and remain absent. Preferred work style therefore remains unknown.

## Output

The CLI, JSON, and Evidence Review HTML show direction, strengths, neutral signals, unknowns, rationale, confidence, source references, and feedback state. `Looks right` and `Not quite` persist feedback only.
