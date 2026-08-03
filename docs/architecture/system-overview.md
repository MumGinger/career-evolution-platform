# System Overview

The system is product-led: Career is the validation domain, and abstractions earn extraction only through repeated product evidence.

## Information flow

```text
Sources
  -> Information Acquisition
  -> Candidate Knowledge
  -> Decision / Generation
  -> Application
  -> Outcomes
  -> Learning
```

| Stage | Responsibility | Boundary |
| --- | --- | --- |
| Sources | Resume snapshots, user-provided information, connected sources, jobs, applications, and outcomes. | Preserve provenance, confidence, and limitations. |
| Information Acquisition | Finds material unknowns, checks existing evidence first, and asks focused questions only when useful. | Does not turn unknown into a negative claim or invent facts. |
| Candidate Knowledge | Durable, traceable source of truth for candidate facts and their certainty. | A resume is a source, never the complete candidate. |
| Decision / Generation | Produces explainable recommendations or bounded artifacts using candidate and job evidence. | Acquires material missing information before output when practical. |
| Application | Records the candidate's job-specific action and generated artifact version. | Submission automation is not part of the current capability. |
| Outcomes | Captures recruiter, interview, user, and application results as contextual evidence. | Feedback is evidence, not automatic truth. |
| Learning | Reviews evidence and outcomes to improve future priorities and guidance. | Changes are deliberate, traceable, scoped, and reversible. |

## Current implementation boundary

Capability 001 implements local application and evidence records. Capability 002 imports explicit PDF-resume text into Candidate Knowledge with provenance and confirmation state. Capability 003 specifies information acquisition; it does not yet implement job discovery, artifact rewriting, automated applications, or outcome-driven learning.
