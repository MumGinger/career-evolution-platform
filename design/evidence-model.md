# Evidence Model

## Purpose

Evidence makes evolution accountable. It records what was observed without assuming the observation is correct, representative, or actionable.

## Minimum record

| Field | Description |
| --- | --- |
| `id` | Stable evidence identifier. |
| `type` | Outcome, user feedback, recruiter feedback, interview observation, or other defined category. |
| `source` | Who or what produced the evidence. |
| `captured_at` | When it was collected. |
| `context` | Role, company, workflow, artifact, and relevant conditions. |
| `claim` | The observation or feedback, preserved faithfully. |
| `confidence` | Estimated reliability or quality of the record. |
| `limitations` | Bias, missing context, conflicts, or uncertainty. |
| `provenance` | Link or reference to the underlying source when available. |
| `review_status` | Unreviewed, accepted, rejected, deferred, or superseded. |

## Rule

Feedback must be stored as feedback. It cannot become a skill change merely because it is explicit or strongly worded. Review evaluates relevance, corroboration, confidence, and likely generalizability.
