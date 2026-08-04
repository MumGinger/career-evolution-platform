# Career Evolution Platform

The platform explains every belief it presents about a user. Career Evolution Loop v1 is the primary demo: it joins Resume Intelligence, one optional Career Conversation, Current Career Understanding, Shared Understanding, and one supported Career Curiosity possibility into a single bounded journey. It never turns the user's answers, a resume, or a possibility into Candidate Knowledge automatically.

Evidence-driven career intelligence: acquire the highest-value missing information before making career decisions or generating career artifacts. The platform treats a resume as one source and snapshot—not the candidate—and improves recommendations from traceable evidence and outcomes.

## Decision Companion MVP

Decision Companion is the final Thinking Layer MVP. It helps a user organize one bounded career choice without choosing for them: 2–4 options, up to 3 criteria, explicit trade-offs/unknowns/provenance, one reflection question, and an immutable user-owned final state. Intelligent Execution is the next milestone.

```powershell
node src/cli.js decision-companion-create --db career-evolution.db --candidate-profile-id <profile-id> --snapshot-run-id <snapshot-id> --decision '{"title":"Which direction?","decisionType":"career_direction","options":[{"id":"a","label":"Option A"},{"id":"b","label":"Option B"}],"criteria":[{"type":"learning"}]}' --response '{"final_state":"undecided"}' --format text
```

## Current capabilities

- **Capability 001 — Application Evidence Loop:** record applications, generated artifacts, and outcome/preference evidence without automatic learning.
- **Capability 002 — Resume Intake & Candidate Knowledge Bootstrap:** import explicit resume content into traceable Candidate Knowledge facts; ambiguous facts remain `needs_confirmation`.
- **Capability 003 — Information Acquisition:** in progress. It will find and acquire the most valuable unresolved candidate information before decisions or generation.

Start with the [product documentation](docs/README.md): the [vision](docs/vision/vision.md), [principles](docs/principles/product-principles.md), [roadmap](docs/roadmap/roadmap.md), [system overview](docs/architecture/system-overview.md), and [current state](docs/current-state.md). Read [AGENTS.md](AGENTS.md) before contributing.

## Local use

Capability 002.7 is the preferred working-evidence path: the Resume AST preserves exact source text and marks layout/order-inferred attachment as `structurally_grouped`. Requirement-driven retrieval ranks validated AST blocks with rank, score, exactness, block kind, section, and rationale. Only exact, validated explicit `skill` or `tool` blocks may satisfy a need automatically; all project, organization, role, bullet, `structurally_grouped`, and `possible` blocks remain confirmation-required. It never writes Candidate Knowledge.

The current MVP is a local SQLite CLI with no external packages. It creates a candidate profile, imports a PDF resume, stores a job-specific application, generates a traceable application note, and records outcome or preference evidence without changing the active skill.

Experiment 002 also imports a PDF resume into a persisted Candidate Knowledge profile. Imported facts retain `resume` provenance and `parsed` confidence; entries whose fields cannot be structured safely are marked `needs_confirmation`.

```powershell
node src/cli.js profile-create --db career-evolution.db --name "Aira" --skills "JavaScript,SQL"
node src/cli.js resume-import --db career-evolution.db --pdf-path "C:\path\to\resume.pdf"
node src/cli.js resume-artifact-import --db career-evolution.db --candidate-profile-id <profile-id> --pdf-path "C:\path\to\resume.pdf"
node src/cli.js resume-semantic-understand --db career-evolution.db --candidate-profile-id <profile-id> --resume-artifact-id <artifact-id>
node src/cli.js resume-semantic-show --db career-evolution.db --resume-semantic-run-id <run-id>
node src/cli.js profile-show --db career-evolution.db --profile-id <profile-id>
node src/cli.js application-create --db career-evolution.db --profile-id <profile-id> --company "Acme" --role-title "Product Engineer" --job-description "..."
node src/cli.js application-generate --db career-evolution.db --application-id <application-id>
node src/cli.js outcome-record --db career-evolution.db --application-id <application-id> --outcome interview_invited
node src/cli.js application-show --db career-evolution.db --application-id <application-id>
node src/cli.js job-profile-create --db career-evolution.db --company "Acme" --role-title "Data Analyst" --job-description "Required: SQL" --source-url "https://example.com/job/1"
node src/cli.js job-profile-show --db career-evolution.db --job-profile-id <job-profile-id>
node src/cli.js information-needs-create --db career-evolution.db --candidate-profile-id <profile-id> --job-profile-id <job-profile-id>
node src/cli.js evidence-discovery-create --db career-evolution.db --information-need-run-id <information-need-run-id>
node src/cli.js evidence-discovery-show --db career-evolution.db --evidence-discovery-run-id <evidence-discovery-run-id>
node src/cli.js acquisition-plan-create --db career-evolution.db --information-need-run-id <information-need-run-id> --evidence-discovery-run-id <evidence-discovery-run-id>
node src/cli.js acquisition-execution-create --db career-evolution.db --acquisition-plan-run-id <acquisition-plan-run-id> --captures '[{"actionId":"<action-id>","rawCapturedEvidence":{"response":"..."}}]'
node src/cli.js acquisition-execution-show --db career-evolution.db --acquisition-result-run-id <acquisition-result-run-id>
```

Run `npm test` to execute the automated tests. Node.js 22.5+ is required for its built-in SQLite module.

## Career Evolution Loop v1

Run the complete first-time companion journey with one command:

```powershell
node src/demo.js `
  --resume "examples\synthetic-resume.txt" `
  --job "examples\synthetic-job.txt" `
  --captures "examples\synthetic-capture.json" `
  --output "demo-output" `
  --career-direction "Data Analytics" `
  --reflection-action "looks_right" `
  --curiosity-response "interesting"
```

The interaction flags represent three existing, bounded user inputs: one optional direction, one reflection response, and one curiosity response. Omit `--career-direction` to record a skip; the direction remains unknown and Career Curiosity may explicitly be suppressed. The output includes one integrated `report.html` and `career-evolution-loop-summary.json`, with uncertainty retained rather than filled with a claim.

## Evidence Review beta

Use the local review CLI to review `needs_confirmation` evidence with Accept, Skip, or Edit. Keep the database, resume, job description, and output directory private.

```powershell
node src/evidence-review-cli.js --db C:\private\career.db --candidate-profile-id <profile-id> --job-profile-id <job-profile-id> --output-dir C:\private\evidence-review-output
```

For a repeatable non-interactive run, add `--review-fixture C:\private\review-fixture.json --non-interactive`.

After a successful review produces the validated resume, the interactive CLI asks one optional Career Conversation question. Choose a direction or `S` to skip; either response is non-blocking. A fixture may include `"careerConversation": { "answer": "Data Analytics" }` or `"careerConversation": { "skipped": true }`. The HTML report shows the question, answer, and skipped state. This observation is separate from Candidate Knowledge and never creates a fact.

## Required Human Review before resume export

Human Review is the Version 1.0 release blocker: the AI prepares, and the human decides. Before exporting, the user must explicitly approve or edit Professional Summary, Skills, Experience, and Projects. The review output preserves the AI draft, provenance, rationale, final approved content, and timestamps in an immutable JSON run; edits never write Candidate Knowledge or trigger regeneration.

```powershell
node src/human-review-cli.js --db C:\private\career.db --resume-artifact-run-id <artifact-run-id> --presentation-strategy-run-id <strategy-run-id> --output-dir C:\private\human-review-output
```

For repeatable testing, provide `--review-fixture <file> --non-interactive`; its `decisions` array must include every required section with `action` `approve` or `edit`. The CLI writes `human-review-run.json`, `final-resume.json`, `final-resume.md`, and `human-review-report.html`, and prints review completion in the terminal. `node src/cli.js resume-export --resume-artifact-run-id <artifact-run-id>` is blocked until a matching `--human-review-run-id` is supplied.

## Milestone 1 Demo — end-to-end resume tailoring

The preferred Demo path is asynchronous. It emits `resume-ast-run.json`, `resume-ast-validation.json`, and `confirmation-proposals.json`; request semantic graph explainability explicitly with `--build-semantic-graph`. Terminal and HTML always state `mock/offline` or `openai-compatible/<model>`.

For an OpenAI-compatible provider, configure `CEP_LLM_PROVIDER=openai-compatible`, `CEP_LLM_MODEL`, `CEP_LLM_API_KEY`, and optional `CEP_LLM_BASE_URL`. Never commit keys, private inputs, or raw provider responses.

```powershell
node src/demo.js `
  --resume "examples\synthetic-resume.txt" `
  --job "examples\synthetic-job.txt" `
  --captures "examples\synthetic-capture.json" `
  --output "demo-output"
```

For a real PDF, select a provider explicitly. The Demo refuses an implicit mock fallback for PDF inputs:

```powershell
$env:CEP_LLM_PROVIDER='openai-compatible'; $env:CEP_LLM_MODEL='your-model'; $env:CEP_LLM_API_KEY='...'
node src/demo.js --resume "my-test\resume.pdf" --job "my-test\job.txt" --output "my-test\real-output" --provider openai-compatible
```

Use `--provider mock` only for explicit offline/synthetic testing; its output carries a prominent offline warning.

This copy-paste PowerShell example runs the full deterministic local pipeline. `--resume` accepts a PDF (using the existing local `pdftotext` dependency) or a UTF-8 `.txt` fixture. `--job` accepts a text file or direct description text. `--captures` is optional: without it, every unresolved acquisition action is explicitly recorded as `skipped`, no evidence is invented, and no unconfirmed fact is integrated.

For a private local PDF, quote Windows paths that contain spaces and keep the file outside version control:

```powershell
node src/demo.js `
  --resume "my-test\Ya-Ching Tang Resume.pdf" `
  --job "my-test\cibc-qa-job.txt" `
  --output "my-test\real-output-1"
```

The output directory must be absent or empty, so each invocation is a new immutable run set; use a new path to run it again. The demo versions the source resume, runs 002.5 Resume Semantic Understanding before Information Needs and Evidence Discovery, and keeps parsed content plus semantic candidates as working evidence only. It contains `candidate-knowledge.json`, `resume-semantic-run.json`, `job-requirement-profile.json`, `information-needs.json`, `evidence-discovery.json`, `acquisition-plan.json`, `integration-run.json`, `tailoring-plan.json`, `resume-artifact.json`, `validation-report.json`, `resume.md`, and `report.html`. It accepts explicit job metadata headers when supplied and otherwise deterministically infers LinkedIn-style role/company opening lines. The demo uses no external connectors or LLMs and does not render DOCX/PDF.
