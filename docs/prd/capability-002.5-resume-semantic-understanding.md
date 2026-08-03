# Capability 002.5 — Resume Semantic Understanding

**Status:** Complete | **Policy:** `resume-semantic-policy/1.0.0`

## Mission

Transform one imported, versioned resume artifact into deterministic, traceable semantic working evidence. A run creates candidates only, never Candidate Knowledge.

## Model and boundaries

Each immutable run persists evidence spans (artifact/version, section, bullet, line, raw text), entity candidates, and relation candidates. Candidate states are `explicit`, `derived_structurally`, `possible`, and `blocked`. Ambiguous bullet associations remain `possible`.

The v1 policy recognizes only a narrow transparent vocabulary: regression model → regression analysis; workflow automation → automation; data ingestion; caching; and visualization → data visualization. It does not infer QA, testing, ETL, proficiency, years, leadership, ownership, impact, or unstated outcomes. Capability 003.3 may retrieve candidates as bounded evidence; 003.6 is the sole Candidate Knowledge integration path.
