# Decision Companion MVP

## Goal

Help a person think clearly about one bounded career choice without deciding for them. The user supplies two to four options, up to three criteria, and a final state; the platform records an immutable, source-linked comparison.

## Guardrails

This MVP follows the Manifesto: **guide, do not decide; explain why; preserve uncertainty; user independence**. Comparisons use only explicit user input and the referenced Career Understanding Snapshot. They show supports, trade-offs, unknowns, selected criteria, and provenance. They never score, rank, recommend, infer a goal or preference, make market claims, or create an action plan.

## Flow

Decision title/type/context → 2–4 options → up to 3 criteria (including named custom criteria) → comparison → exactly one reflection question → leaning, undecided, need-more-information, or stopped.

## Persistence and boundaries

Each immutable Decision Companion Run contains the candidate profile, source Career Understanding Snapshot, definition, options, criteria, entries, unknowns, reflection question, response, timestamps, policy version, and provenance. It never writes Candidate Knowledge or mutates Career Understanding. Stopping without deciding is valid.

## Out of scope

Job search, salary/market APIs, school rankings, coaching chat, weighted scoring, optimization, prediction, recommendation, and execution. Decision Companion is the final Thinking Layer MVP; Intelligent Execution is next.
