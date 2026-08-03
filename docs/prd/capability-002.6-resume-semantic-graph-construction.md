# Capability 002.6 — Resume Semantic Graph Construction

**Status:** Complete | **Policy:** `resume-semantic-graph-policy/1.0.0`

## Mission

Turn a 002.5 Resume Semantic Understanding run into an immutable, provenance-preserving graph of working evidence. It does not parse the resume again and never writes Candidate Knowledge.

## Model

A graph run retains its source semantic run, artifact, artifact version, graph node candidates, and graph edge candidates. Nodes have a normalized label, decision state, confidence, rationale, and exact evidence-span references. Nodes are limited to project, experience, responsibility, achievement, skill, tool, workflow, education, credential, and domain.

Edges are bounded to `performed_in`, `used_in`, `supports`, `produced_by`, `part_of`, education/credential `supports` where wording is exact, and `mentioned_with` for co-occurrence that does not justify a stronger relationship. Every edge has state, rationale, and span provenance.

## Deterministic policy

- Project/experience anchors and responsibility associations reuse 002.5's bounded section and anchor interpretation.
- Exact tools in a bounded responsibility can be `used_in` its anchor and `supports` that responsibility.
- Workflow automation creates only a workflow node and `part_of` relation; it does not imply QA or testing.
- Achievements require both an explicit number and an explicit outcome phrase. No proficiency, years, leadership, ownership, impact, or unstated outcome is inferred.
- Ambiguous or unanchored bullets remain `possible`; no false strong anchor relation is emitted.
- Generic headings, dates, contact information, and summary marketing language cannot create project relations.

## Integration boundary

Evidence Discovery may read `resume_semantic_graph` as a distinct bounded source. An exact explicit node may be accepted for a need only under existing Discovery policy; derived and possible evidence remains `needs_confirmation`. Information Need runs expose read-only working-evidence availability, while Candidate Knowledge coverage remains separate. Capability 003.6 is the only Candidate Knowledge write path.
