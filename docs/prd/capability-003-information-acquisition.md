# Capability 003 — Information Acquisition

**Status:** In progress
**Owner:** Product
**Related ADRs:** [ADR-001](../adr/ADR-001-resume-is-not-candidate.md), [ADR-002](../adr/ADR-002-unknown-is-not-missing.md), [ADR-003](../adr/ADR-003-acquire-before-generate.md)

## Mission

Acquire the highest-value missing information before making career decisions or generating artifacts.

## Product model

- Candidate Knowledge is the source of truth. A resume is one snapshot and source, not the candidate.
- Job Intelligence creates a requirement profile from the selected job context. It determines which candidate evidence may be material for a decision or artifact.
- Unknown is a valid evidence state. It must never become a statement that the candidate lacks a skill, experience, result, or qualification.

## Scope

For a candidate and optional job requirement profile, identify material unresolved information, reuse existing evidence, and acquire only sufficient additional evidence. Preserve provenance, confidence, and confirmation state for each acquired fact.

## Information priority

Each potential fact is evaluated using:

| Factor | Question |
| --- | --- |
| Importance | Would this materially affect the career decision or artifact? |
| Discoverability | Can it be recovered from an available source without burdening the user? |
| Resume Value | Is it likely to support a truthful, role-relevant resume claim or artifact detail? |
| Acquisition Cost | What user time, friction, or privacy cost is required? |
| Existing Evidence | What evidence already exists, how reliable is it, and is it sufficient? |

Prioritize low-cost, high-information, resume-relevant facts. Existing evidence and appropriately connected sources are always checked before a user question. Generic skills such as stakeholder management, communication, or Excel do not consume discovery budget merely because they are common; they qualify only when evidence indicates they are role-critical and resume-useful.

## Acquisition flow

1. Establish the decision or artifact purpose and, when applicable, derive the Job Intelligence requirement profile.
2. Inspect Candidate Knowledge, the resume snapshot, existing application evidence, and available connected sources for relevant evidence.
3. Mark unresolved facts as unknown, sufficient, conflicting, or needing confirmation; do not convert absence in a source to a negative claim.
4. Rank unresolved facts by Information Priority and recover evidence from the lowest-friction reliable source.
5. Ask concise user questions only when they can recover high-value evidence not otherwise available.
6. Use conversation prompts to help users recall concrete academic, internship, work, research, or side-project evidence, including context, action, tools, scope, and outcome.
7. Store acquired evidence with source, confidence, limitations, and confirmation state.
8. Stop asking when available evidence is sufficient for the stated decision or artifact; disclose any remaining material uncertainty.

## User experience requirements

- Explain why a question matters to the selected role or artifact.
- Prefer a small number of focused prompts over a long questionnaire.
- Let the user skip, correct, or qualify a fact without treating the skip as a negative answer.
- Distinguish a candidate's own assertion, imported text, inferred relevance, and verified evidence.

## Capability 003.3 — Evidence Discovery Engine

Before asking a user for new information, turn unresolved Information Needs into an immutable Evidence Discovery Run. This slice discovers and evaluates possible evidence only: it never updates Candidate Knowledge, asks a question, generates wording, performs LLM inference, or contacts an external service.

### Product principle and inputs

**Search Before Ask** requires existing, consented evidence to be searched before user interaction. A run is created from exactly one persisted Information Need Run, retains that run's evidence snapshot, discovery-policy version, selected needs, processing order, sources, candidates, resolutions, rationale, and limitations. Re-running always creates a separate historical run.

By default, process only `unknown` and `needs_confirmation` needs in descending priority. `supported` needs stay traceable and do not trigger search. An optional unresolved Information Need ID permits focused orchestration and tests.

### Local deterministic MVP sources

Sources are bounded source types, not truth. The local MVP searches only, in order:

1. `candidate_fact` already present in the Information Need Run snapshot;
2. `profile_skill` explicitly supplied in that snapshot;
3. `resume_import` evidence already persisted in that snapshot.

Each source search records its type, stable snapshot reference, availability, order, adapter version, result, rationale, and limitations. GitHub, LinkedIn, portfolios, conversation memory, uploaded documents, and other connectors are future adapters and must not be represented as searched unless a real configured source exists.

### Candidates, resolutions, and sufficiency

An Evidence Candidate is a possible bounded support item, never Candidate Knowledge. It retains its Information Need and requirement IDs, source type/reference, normalized claim, original text/value, deterministic extraction method, confidence, adapter/parser version, provenance, uncertainty, and timestamp.

Every candidate receives one deterministic resolution: `accepted_for_need`, `needs_confirmation`, `rejected`, or `conflicting`. Only explicit, positively confirmed exact or explicitly-aliased evidence can be accepted. Confirmation-required or structurally ambiguous evidence remains `needs_confirmation`; materially incompatible structured claims are `conflicting`. Complementary technologies and experiences are not conflicts.

One high-confidence accepted candidate, or multiple independently traceable medium-confidence accepted candidates, is sufficient. A weak or confirmation-required candidate is insufficient, and any unresolved material conflict blocks sufficiency. Once sufficient, lower-priority source searches are recorded as skipped. Otherwise all available local sources complete and the result is `unresolved_after_search`; Capability 003.4, not this slice, may decide whether to ask the user.

### Boundaries

003.3 does not generate questions, alter Candidate Knowledge, rewrite a resume, make recommendations, infer proficiency/depth/recency/outcomes, use an LLM, or connect to external services. It records evidence candidates and deterministic resolutions only.

## Learning and measurement

Importance and Resume Value are initial policy signals. They should later learn from reviewed application and interview outcomes, with context, limitations, and no causal claim from a single result. Outcome Learning remains a separate capability.

## Out of scope

- Job discovery
- Auto-apply or application submission
- Resume rewriting or tailoring
- Cover letters
- Interview coaching

## Acceptance criteria

- A material decision or generation request can identify unresolved, relevant candidate information without asserting unknowns as negatives.
- Existing evidence is evaluated before the user is asked for the same information.
- Question ranking considers all five Information Priority factors.
- The conversation can recover concrete evidence from academic, internship, work, research, and side-project contexts.
- The flow stops once evidence is sufficient for the bounded goal.
- Any future learning of priority weights is attributable to reviewed application or interview evidence and outcomes.
