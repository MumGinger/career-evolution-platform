# Capability 003 — Information Acquisition

**Status:** In progress — runtime implementation is complete through 003.3 only  
**Runtime status:** Implemented through Capability 003.4 Acquisition Planning
**Owner:** Product  
**Related ADRs:** [ADR-001](../adr/ADR-001-resume-is-not-candidate.md), [ADR-002](../adr/ADR-002-unknown-is-not-missing.md), [ADR-003](../adr/ADR-003-acquire-before-generate.md), [ADR-005](../adr/ADR-005-candidate-knowledge-single-write-path.md)

## Mission

Acquire the highest-value missing information before making career decisions or generating artifacts, while preserving evidence provenance, uncertainty, and user effort.

## Product model

- Candidate Knowledge is the durable source of truth. A resume is one partial source and snapshot, not the candidate.
- Job Intelligence creates a Requirement Profile from a selected job context. It identifies which candidate evidence could be material to a bounded decision or artifact.
- Unknown is a valid evidence state. Absence from a source must never become a statement that the candidate lacks a skill, experience, result, or qualification.
- Candidate Knowledge has one write path: Candidate Knowledge Integration (003.6). Discovery, planning, and acquisition create traceable intermediate records; none may directly promote a fact.
- Questions are not domain entities. They are one possible Acquisition Action selected and executed under an Acquisition Plan.

## End-to-end architecture

```text
Job
  -> Requirement Profile
  -> Candidate Knowledge (read-only snapshot)
  -> Information Need
  -> Evidence Discovery
  -> Acquisition Planning
  -> Acquisition Execution
  -> Candidate Knowledge Integration
  -> Candidate Knowledge
```

The first Candidate Knowledge node is a read boundary: 003.2 and 003.3 use a traceable snapshot to identify and evaluate evidence. The final node is the only durable-write boundary: 003.6 integrates resolved, accepted evidence with provenance, confidence, limitations, and confirmation state.

```text
Information Need + Evidence Discovery result
  -> Acquisition Plan
  -> Acquisition Action(s)
  -> acquired evidence / user response / connector result
  -> Evidence Resolution
  -> Candidate Knowledge Integration
```

## Capability roadmap and boundaries

| Capability | Purpose | Inputs | Outputs | Boundary |
| --- | --- | --- | --- | --- |
| **003.1 Job Intelligence** | Derive a deterministic, explainable Requirement Profile for the selected job context. | Job description or selected job context; parsing and policy version. | Immutable Requirement Profile and rationale. | Does not assess the candidate, acquire evidence, or write Candidate Knowledge. |
| **003.2 Information Need Prioritization** | Identify and rank material candidate information needed for a bounded decision or artifact. | Requirement Profile; traceable Candidate Knowledge snapshot; priority policy. | Immutable Information Need Run with ranked needs, evidence state, rationale, and limitations. | Does not search new sources, ask the user, or write Candidate Knowledge. |
| **003.3 Evidence Discovery** | Search available, consented evidence and resolve whether it supports each prioritized need. | Information Need Run; its candidate-evidence snapshot; bounded source adapters and discovery policy. | Immutable Evidence Discovery Run, source-search records, Evidence Candidates, resolutions, and sufficiency result. | Does not contact unavailable sources, generate questions, infer facts, or write Candidate Knowledge. |
| **003.4 Acquisition Planning** | Choose the highest-value, lowest-friction strategy for each unresolved Information Need after discovery. | Information Need Run; Evidence Discovery Run; deterministic policy version. | Immutable **Acquisition Plan Run** with grouped Acquisition Plans, separate Acquisition Actions, expected information gain, estimated cost, rationale, and stop conditions. | Produces plans, **not user questions**; does not execute an action, contact a source, or write Candidate Knowledge. The local runtime is deterministic and has no LLMs or connectors. |
| **003.5 Acquisition Execution** | Execute the chosen Acquisition Plan and capture the resulting evidence. | Acquisition Plan; authorized Acquisition Action; applicable consent and interaction context. | Action results and Evidence Candidates with source, provenance, confidence, limitations, and confirmation state. | Executes the selected strategy rather than re-prioritizing it; does not directly write Candidate Knowledge. A question is only one possible action. |
| **003.6 Candidate Knowledge Integration** | Resolve acquired evidence and deliberately integrate accepted facts into durable candidate knowledge. | Resolved evidence from discovery or execution; integration policy; confirmation and conflict state. | Candidate Knowledge updates plus auditable integration record, or an explicit non-integration decision. | **The only Capability 003 operation allowed to modify Candidate Knowledge.** It never treats discovery, a plan, an unanswered question, or weak evidence as an accepted fact. |

## Information Need priority

Each potential fact is evaluated using:

| Factor | Question |
| --- | --- |
| Importance | Would this materially affect the career decision or artifact? |
| Discoverability | Can it be recovered from an available source without burdening the user? |
| Resume Value | Is it likely to support a truthful, role-relevant resume claim or artifact detail? |
| Acquisition Cost | What user time, friction, or privacy cost is required? |
| Existing Evidence | What evidence already exists, how reliable is it, and is it sufficient? |

Prioritize low-cost, high-information, resume-relevant facts. Search existing, consented evidence before requesting anything new. When evidence exists but is fragmented, hard to locate, or not yet organized, recover it before asking the user to restate it.

## First-class domain entity: Acquisition Plan

An **Acquisition Plan** is the durable decision record for how to obtain enough evidence for one unresolved Information Need. It connects the need to its Evidence Discovery result and selects the best next strategy before any interaction occurs.

An Acquisition Plan records:

- the Information Need, Requirement Profile reference, and Evidence Discovery result it addresses;
- the unresolved reason, sufficiency and conflict state, and evidence already considered;
- the selected strategy and ordered Acquisition Actions;
- estimated user/privacy cost, expected information gain, consent requirements, rationale, and limitations;
- stop conditions, fallback actions, and the policy/action-adapter versions used.

An Information Need may have no plan when discovery found sufficient evidence, the need is not material, or no permitted action is available. A plan may contain actions such as recovering a known project from a connected source, requesting a document upload, asking the candidate to describe a QA project, or requesting confirmation of a specific evidence candidate.

A **Question** is presentation and interaction wording for one Acquisition Action. It is not a top-level domain entity and is never created merely because a need is unresolved. The planner first decides whether recovery, a connector operation, a request, confirmation, or another permitted action has the best value.

## Acquisition flow

1. 003.1 derives the Requirement Profile for the stated decision or artifact.
2. 003.2 prioritizes material Information Needs using the Candidate Knowledge snapshot.
3. 003.3 searches available, consented evidence and records candidates, resolutions, conflicts, and sufficiency.
4. 003.4 creates an Acquisition Plan only for a material need that remains unresolved after discovery.
5. 003.5 executes the plan's chosen Acquisition Action(s), including a focused user question only when that is the selected action.
6. Evidence is resolved with its source, confidence, limitations, and confirmation state.
7. 003.6 is the sole path that may integrate accepted evidence into Candidate Knowledge.
8. Stop when evidence is sufficient for the bounded goal; disclose any remaining material uncertainty.

## User experience requirements

- Explain why a requested action matters to the selected role or artifact.
- Prefer recovery and reuse over asking the user to repeat information.
- Prefer a small number of focused actions over a long questionnaire.
- Let the user skip, correct, or qualify an action result without treating the skip as a negative answer.
- Distinguish a candidate assertion, imported text, inferred relevance, and verified evidence.

## Capability 003.3 — Evidence Discovery

Before planning acquisition, turn unresolved Information Needs into an immutable Evidence Discovery Run. This completed slice discovers and evaluates possible evidence only: it never updates Candidate Knowledge, creates an Acquisition Plan, asks a question, generates wording, performs LLM inference, or contacts an external service.

**Search Before Ask** requires existing, consented evidence to be searched before user interaction. The local MVP searches bounded snapshot sources only: `candidate_fact`, `profile_skill`, and `resume_import`. Each source search records its stable reference, availability, order, adapter version, result, rationale, and limitations. Evidence Candidates remain distinct from Candidate Knowledge and receive deterministic resolutions.

When discovery remains insufficient, it returns `unresolved_after_search`. Capability 003.4 may plan an acquisition strategy; 003.5 may execute it; neither may directly modify Candidate Knowledge.

## Learning and measurement

Importance and Resume Value are initial policy signals. They should later learn from reviewed application and interview outcomes, with context, limitations, and no causal claim from a single result. Outcome Learning remains a separate capability.

## Capability 003.4 implementation policy

The local 003.4 implementation persists immutable Plan Runs, Plans, Plan-to-Need links, and Acquisition Actions. Strategy and Action are intentionally separate: a strategy captures the decision intent, while an action captures the later executable unit without generating its user-facing wording.

The versioned deterministic policy selects `resolve_conflict` when discovery reports conflicts, `confirm_existing_evidence` when relevant evidence needs confirmation, `recover_project_details` when weak resume-derived context is available, and `request_new_evidence` only after the local snapshot is exhausted. It ranks expected information gain relative to acquisition cost and groups needs with compatible action type and requirement category beneath one shared action. The planner never executes that action.

## Out of scope

- Runtime implementation of 003.5 or 003.6
- Job discovery
- Auto-apply or application submission
- Resume rewriting or tailoring
- Cover letters
- Interview coaching

## Acceptance criteria

- A material decision or generation request can identify unresolved, relevant candidate information without asserting unknowns as negatives.
- Existing evidence is evaluated and recovered before the user is asked to restate it.
- Acquisition Planning produces an Acquisition Plan, not a question.
- Acquisition Execution follows the chosen strategy and records its result.
- Only Candidate Knowledge Integration may modify Candidate Knowledge.
- The flow stops once evidence is sufficient for the bounded goal.
- Any future learning of priority weights is attributable to reviewed application or interview evidence and outcomes.
