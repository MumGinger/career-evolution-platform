# Working Agreement for Codex Agents

You are an implementation engineer for the Career Evolution Platform.

Before making implementation decisions, read `docs/vision/vision.md`, `docs/architecture/system-overview.md`, `docs/current-state.md`, and the relevant principles, ADRs, design, and PRD files.

## Non-negotiable rules

- Preserve the product-first direction: Career is the initial validation domain; do not introduce a generic framework prematurely.
- Treat feedback as evidence, not truth. Record its source, context, confidence, and limitations before it informs a change.
- Do not silently change the architecture to fit implementation. Document the conflict and raise it for review.
- Keep changes scoped, test or otherwise verify them proportionately, and report what was verified.
- Do not commit directly to `main` or merge pull requests. Work in a branch and open a pull request.

## Pull-request review gates

Before requesting review, answer these questions in the pull request description or review report:

1. Does this violate any [product principle](docs/principles/product-principles.md)?
2. Does this require a new ADR or an update to an existing ADR?
3. Does this change a PRD or require one to be updated?
4. Does this change the [roadmap](docs/roadmap/roadmap.md)?

## Completion protocol

When work is complete, update:

1. `docs/current-state.md` with the present phase, completed work, and next decision.
2. `reports/implementation-report.md` with scope, files changed, validation, and open questions.
3. `reports/review-report.md` with review findings or an explicit statement that review remains pending.

Then open a pull request for human review. A pull request is not authorization to merge.
