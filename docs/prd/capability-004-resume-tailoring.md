# Capability 004 — Resume Tailoring

**Status:** 004.1 implemented (planning only)

## Mission

Create truthful, role-specific resume plans from one immutable Job Requirement Profile and committed Candidate Knowledge. A plan selects and maps facts; it is not prose or a rendered artifact.

## 004.1 Tailoring Planning

Each immutable Resume Tailoring Plan Run retains the exact candidate profile, committed Candidate Knowledge snapshot, Job Requirement Profile/version, optional source-resume artifact snapshot, policy version, timestamp, selections, coverage, section plan, source-analysis flags, and limitations. Re-runs always create a new run.

Resume Content Selections retain the Candidate Fact/revision, requirement mappings, inherited decision provenance reference, rationale, section, emphasis, permitted scope, blocked stronger scopes, and one of `include`, `deprioritize`, `omit`, or `blocked`. Requirement Coverage records every requirement as `covered`, `partially_covered`, `uncovered`, or `not_resume_relevant`.

The deterministic policy ranks explicit, confirmed facts matched to high-importance/high-resume-value requirements. It favors concrete context and deprioritizes generic language unless role context makes it central. It never infers proficiency, duration, ownership, leadership, or impact. Uncovered requirements remain gaps, never claims. Source-resume text is retained only as a reference and may be flagged for validation; it never overrides Candidate Knowledge or is modified.

## Boundary

004.1 performs no prose generation, DOCX/PDF/HTML rendering, LLM use, Candidate Knowledge write, evidence acquisition, apply recommendation, or source-resume edit. 004.2 may render an approved plan; 004.3 may validate generated artifacts.
