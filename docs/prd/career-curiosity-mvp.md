# Career Curiosity MVP

## Goal

Using the read-only Current Career Snapshot, introduce exactly one adjacent career possibility when the snapshot has enough supported understanding. This is perspective expansion, not a job recommendation or career decision.

## Flow

Current Career Understanding leads to one plain-language possibility, then one user response: `interesting`, `not_for_me`, or `maybe_later`. The interaction stops.

The possibility says, “Based on what we've explored together” and “Here's one path you may not have considered.” Its explanation names the supporting Career Understanding items and retains those items in its supporting snapshot.

## Confidence and boundaries

If there is no supported direction, strength, or curated adjacent path, the run is suppressed with an explicit insufficient-confidence message. It never invents a possibility, ranks careers, claims a best match, or says the user should become something.

Each response is an immutable observation containing only a possibility ID, supporting snapshot, user response, and timestamp. It does not update Candidate Knowledge, Career Understanding, preferences, goals, hypotheses, or the next possibility.

## Out of scope

Job search, job boards, salary, market ranking, auto-apply, learning plans, coaching dialogue, multi-turn chat, and skill-gap analysis.
