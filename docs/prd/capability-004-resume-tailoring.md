# Capability 004 — Resume Tailoring

**Status:** 004.1, 004.2, and 004.3 implemented

## Mission

Create truthful, role-specific resume plans from one immutable Job Requirement Profile and committed Candidate Knowledge. A plan selects and maps facts; it is not prose or a rendered artifact.

## 004.1 Tailoring Planning

Each immutable Resume Tailoring Plan Run retains the exact candidate profile, committed Candidate Knowledge snapshot, Job Requirement Profile/version, optional source-resume artifact snapshot, policy version, timestamp, selections, coverage, section plan, source-analysis flags, and limitations. Re-runs always create a new run.

Resume Content Selections retain the Candidate Fact/revision, requirement mappings, inherited decision provenance reference, rationale, section, emphasis, permitted scope, blocked stronger scopes, and one of `include`, `deprioritize`, `omit`, or `blocked`. Requirement Coverage records every requirement as `covered`, `partially_covered`, `uncovered`, or `not_resume_relevant`.

The deterministic policy ranks explicit, confirmed facts matched to high-importance/high-resume-value requirements. It favors concrete context and deprioritizes generic language unless role context makes it central. It never infers proficiency, duration, ownership, leadership, or impact. Uncovered requirements remain gaps, never claims. Source-resume text is retained only as a reference and may be flagged for validation; it never overrides Candidate Knowledge or is modified.

## 004.2 Resume Artifact Generation

An immutable Resume Artifact Run renders one structured Resume Artifact from exactly one immutable Resume Tailoring Plan Run. It reads only the plan, its Candidate Knowledge snapshot, and its Job Requirement Profile reference. It never reads mutable current Candidate Knowledge to augment a plan.

Every visible rendered statement references one or more persisted Resume Content Selections and retains Candidate Fact ID/revision plus inherited Integration Decision provenance. Deterministic templates render only selection-permitted values. The structured intermediate model contains the ordered Summary placeholder, Skills, Experience, Projects, Education, and Certifications sections. It is neither a DOCX nor a PDF.

Omitted selections, coverage gaps, blocked claim scopes, and rendering limitations are metadata, never visible resume claims. The Summary remains a placeholder in this capability because it would otherwise require synthesis beyond a bounded selection value.

## 004.3 Truthfulness & Quality Validation

An immutable Resume Validation Run validates exactly one immutable Resume Artifact Run and its linked Tailoring Plan Run using a versioned deterministic policy. It snapshots both inputs, persists first-class Validation Findings, and is independently re-runnable; every re-run creates a new Validation Run.

Artifact-level statuses are `passed`, `passed_with_warnings`, and `failed`. Finding severities are `info`, `warning`, `error`, and `critical`; errors or critical findings fail the artifact, warnings without errors pass with warnings, and no findings above info pass.

Validation checks provenance integrity (visible statements, selections, committed facts, integration decisions, and evidence links), claim-scope compliance, plan placement/state, uncovered-requirement assertions, duplication/consistency, and required traceability metadata. It deterministically blocks unbounded wording such as unsupported proficiency, years, ownership, leadership, and quantified outcomes. It does not use LLM judgment or semantic rewriting.

The CLI commands are `resume-artifact-validate --db ... --resume-artifact-run-id ...` and `resume-validation-show --db ... --resume-validation-run-id ...`.

## Boundary

004.1 performs no prose generation, DOCX/PDF/HTML rendering, LLM use, Candidate Knowledge write, evidence acquisition, apply recommendation, or source-resume edit. 004.2 only renders deterministic structured intermediate artifacts from an approved plan; it performs no tailoring decisions, Candidate Knowledge write, acquisition, validation, LLM use, or final-document rendering. 004.3 validates only; it never generates or rewrites content, changes Candidate Knowledge, performs acquisition, uses an LLM, or renders final documents.
