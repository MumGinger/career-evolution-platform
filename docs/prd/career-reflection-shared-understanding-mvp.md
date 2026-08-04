# Career Reflection / Shared Understanding MVP

After a Current Career Snapshot, show its plain-language summary and ask exactly: **Does this feel accurate right now?** The user selects `looks_right`, `not_quite`, or `missing_something`, may add one short note, and the interaction stops.

Each response is an immutable, source-linked Career Reflection Run. It records the candidate profile, source snapshot/version reference, user actor, action, optional note, and timestamp. Matching duplicate submissions are idempotent and return the original run with an audit flag.

This slice does not change Candidate Knowledge, Career Understanding items, preferences, goals, or hypotheses. It does not ask a follow-up question, regenerate the snapshot, infer meaning, coach, or recommend. It supports the Manifesto: we never pretend to know the user, explain why, guide rather than decide, and help the user understand themselves a little better.
