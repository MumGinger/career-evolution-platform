# Career Evolution Platform

An AI-powered career platform that improves through real-world evidence rather than one-time prompt engineering.

## Current status

**Phase 0 — Research & Architecture**

Our first goal is to validate the Evolution Loop: capture evidence, review it with context, update skills deliberately, and produce better future outcomes.

Career is the first validation domain. A reusable adaptive framework may be extracted only after product work demonstrates durable patterns.

## Repository guide

- `docs/` — product direction and shared project state
- `design/` — domain models and evolution-loop design
- `decisions/` — architecture decision records
- `specs/` — implementation-ready specifications
- `reports/` — implementation and review records

Read [AGENTS.md](AGENTS.md) before contributing.

## Local MVP

Issue #1 is implemented as a local SQLite CLI with no external packages. It creates a candidate profile, stores a job-specific application, generates a traceable application note, and records outcome or preference evidence without changing the active skill.

Experiment 002 also imports a PDF resume into a persisted Candidate Knowledge profile. Imported facts retain `resume` provenance and `parsed` confidence; entries whose fields cannot be structured safely are marked `needs_confirmation`.

```powershell
node src/cli.js profile-create --db career-evolution.db --name "Aira" --skills "JavaScript,SQL"
node src/cli.js resume-import --db career-evolution.db --pdf-path "C:\path\to\resume.pdf"
node src/cli.js profile-show --db career-evolution.db --profile-id <profile-id>
node src/cli.js application-create --db career-evolution.db --profile-id <profile-id> --company "Acme" --role-title "Product Engineer" --job-description "..."
node src/cli.js application-generate --db career-evolution.db --application-id <application-id>
node src/cli.js outcome-record --db career-evolution.db --application-id <application-id> --outcome interview_invited
node src/cli.js application-show --db career-evolution.db --application-id <application-id>
```

Run the automated tests with `node --test tests/*.test.js`. Node.js 22.5+ is required for its built-in SQLite module.
