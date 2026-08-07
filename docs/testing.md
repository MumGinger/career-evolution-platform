# Test Integrity and Proof Tiers

Engineering tests protect product behavior, but they do not determine whether a real applicant finds the product understandable, useful, trustworthy, or worth using. Beta acceptance remains a separate human judgment.

## Commands

| Command | What it executes | What it proves | What it does not prove |
| --- | --- | --- | --- |
| `npm run test:unit` | Pure applicant-presentation and bounded function tests under `tests/unit/` | Local transformations, warning language, readable report rendering, and PDF structure | Persistence, HTTP behavior, a browser, a provider, or applicant usefulness |
| `npm run test:integration` | Existing repository tests under `tests/*.test.js`, excluding the two shipped-UI contract files | Store, immutable-run, Candidate Knowledge, provenance, validation, CLI, and service integration boundaries | A real browser, a current provider, PDF extraction, or Beta acceptance |
| `npm run test:http-contract` | `beta-ui.test.js`, `complete-resume-beta-regression.test.js`, and `tests/http-contract/` | Shipped HTTP contracts, fake-client contract behavior, representative PDF extraction, complete-resume composition, Career Review, and export equivalence | A real browser, a current provider, visual quality, time saved, or submission confidence |
| `npm run test:browser-e2e` | Playwright Chromium tests under `tests/browser-e2e/` | The shipped localhost page can recover from an input failure and complete file selection, Understanding, every Evidence Review decision, readable draft validation, every Career Review section, and output access in a real browser engine | Current provider compatibility or human product acceptance |
| `npm run test:provider-smoke` | Secret-gated tests under `tests/provider-smoke/` | The configured provider/model currently accepts the shipped Resume Understanding and draft schemas using synthetic non-private content | Resume quality, real-user usefulness, or Beta acceptance |
| `npm run test:all` | Unit, integration, HTTP/PDF contract, and browser E2E tiers | All non-secret engineering tiers pass independently | Provider compatibility or Beta acceptance |

The provider smoke is intentionally excluded from `test:all` because it requires a credential, may incur provider cost, and is operational compatibility evidence rather than a deterministic regression.

## Naming rules

- A test that uses a mock provider is not a real-provider test.
- A test that runs the client script in a fake DOM is a client contract test, not browser E2E.
- A test that injects a Store or mutates SQLite directly is a unit or integration boundary test, not a user-flow test.
- A successful HTTP workflow is not applicant product acceptance.
- The complete-resume regressions prove composition and authority boundaries; they do not independently prove coherence, submission readiness, review burden, time savings, or reuse intent.

## Representative complete-resume contract

`tests/http-contract/representative-pdf-complete-resume.test.js` authors its expected contract from the product requirement rather than copying generated output. Its sanitized PDF includes:

- identity and contact;
- multiple Experience entries and bullets;
- multiple Projects;
- Skills;
- Education;
- Certifications;
- date ranges that must not become phone numbers;
- PDF/Unicode bullet and dash variants.

The contract verifies that required source items survive exactly once unless a same-section replacement is independently supported, source passthrough never changes authority into Candidate Knowledge, generated statements retain their selection and Candidate Knowledge provenance, and Markdown, JSON, readable Career Review HTML, and PDF represent the same approved resume.

`pdftotext` from Poppler is required for this tier. CI installs it explicitly.

## Real browser contract

The browser tier uses Chromium through Playwright. It must verify the actual shipped page rather than execute the inline client in a VM. CI installs Chromium explicitly with Playwright's dependency installer.

## Real-provider smoke

Run the manual `Real Provider Smoke` workflow with:

- repository secret `CEP_LLM_API_KEY`;
- workflow input `model`;
- optional `provider` and `base_url` inputs.

The smoke uses only synthetic non-private resume and job content. Credentials, raw provider responses, source files, and local temporary paths must not be persisted. Failure output must not echo the credential or private transport details.

## Regression red/green requirement

When production behavior and its regression assertion change in the same pull request, the pull request must record:

1. the linked user-visible requirement or accepted issue;
2. the new regression failing on the pre-fix commit;
3. the same regression passing after the production fix;
4. at least one negative or counterexample case;
5. why any expected output changed;
6. independent review of the production behavior and assertion.

Changing an expected value only to match new output is not proof. If a pre-fix run cannot be executed, mark red evidence `UNKNOWN`; do not describe it as PASS.

## CI and UNKNOWN states

Pull-request CI reports these jobs separately:

- Unit and integration
- HTTP and representative PDF contract
- Real browser shipped flow

The real-provider smoke has a separate manual workflow. A tier is `UNKNOWN` when no workflow, status, or direct execution exists. The absence of a status is never a pass.

## Product boundary intentionally unchanged

Issue #95 records an unresolved policy choice for a complete source-preserved resume with no included Experience or Projects tailoring selection. The current `qualityReady()` tailoring requirement remains unchanged until Product accepts either tailoring-required behavior or complete-source fallback behavior and defines positive and counterexample regressions.
