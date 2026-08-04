# Evidence Review Bridge Repair

## Beta failure

The real-beta demo created an Evidence Review Run with no decisions, so working Resume AST evidence never reached Candidate Knowledge. Tailoring then generated an empty draft that final Career Review could approve.

## Repair

The primary demo now accepts an Evidence Review fixture or uses the existing interactive adapter. Accepted and exact supported edits use the existing 003.6 integration path; skips and blocked edits create no facts. The demo reloads the committed snapshot by rerunning tailoring, strategy, artifact generation, and validation before final Career Review.

Export now rejects drafts without a populated core section supported by committed facts. Terminal and HTML report working evidence, reviewed evidence, committed facts, populated sections, and export readiness.

This is a bridge repair only; it adds no product capability and does not weaken Candidate Knowledge policy.
