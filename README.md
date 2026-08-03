# Career Evolution Platform

Evidence-driven career intelligence: acquire the highest-value missing information before making career decisions or generating career artifacts. The platform treats a resume as one source and snapshot—not the candidate—and improves recommendations from traceable evidence and outcomes.

## Current capabilities

- **Capability 001 — Application Evidence Loop:** record applications, generated artifacts, and outcome/preference evidence without automatic learning.
- **Capability 002 — Resume Intake & Candidate Knowledge Bootstrap:** import explicit resume content into traceable Candidate Knowledge facts; ambiguous facts remain `needs_confirmation`.
- **Capability 003 — Information Acquisition:** in progress. It will find and acquire the most valuable unresolved candidate information before decisions or generation.

Start with the [product documentation](docs/README.md): the [vision](docs/vision/vision.md), [principles](docs/principles/product-principles.md), [roadmap](docs/roadmap/roadmap.md), [system overview](docs/architecture/system-overview.md), and [current state](docs/current-state.md). Read [AGENTS.md](AGENTS.md) before contributing.

## Local use

The current MVP is a local SQLite CLI with no external packages. It creates a candidate profile, imports a PDF resume, stores a job-specific application, generates a traceable application note, and records outcome or preference evidence without changing the active skill.

```powershell
node src/cli.js profile-create --db career-evolution.db --name "Aira" --skills "JavaScript,SQL"
node src/cli.js resume-import --db career-evolution.db --pdf-path "C:\path\to\resume.pdf"
node src/cli.js profile-show --db career-evolution.db --profile-id <profile-id>
node src/cli.js application-create --db career-evolution.db --profile-id <profile-id> --company "Acme" --role-title "Product Engineer" --job-description "..."
node src/cli.js application-generate --db career-evolution.db --application-id <application-id>
node src/cli.js outcome-record --db career-evolution.db --application-id <application-id> --outcome interview_invited
node src/cli.js application-show --db career-evolution.db --application-id <application-id>
```

Run `npm test` to execute the automated tests. Node.js 22.5+ is required for its built-in SQLite module.
