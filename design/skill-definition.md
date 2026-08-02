# Skill Definition

## Purpose

A skill is a versioned unit of approved guidance or capability that influences future career outputs. It is not a raw prompt fragment and not an unreviewed memory.

## Minimum definition

| Field | Description |
| --- | --- |
| `id` | Stable skill identifier. |
| `version` | Immutable version label. |
| `purpose` | The intended career outcome or decision it supports. |
| `scope` | Roles, users, workflows, and contexts where it applies. |
| `guidance` | The actionable behavior or policy. |
| `evidence_refs` | Evidence and review records supporting this version. |
| `rationale` | Why the change was accepted and what remains uncertain. |
| `evaluation` | Expected signal, comparison method, and success threshold. |
| `owner` | Accountable person or review policy. |
| `status` | Draft, active, deprecated, or rejected. |

## Update policy

Every new version must cite reviewed evidence, state its scope, and include a way to assess its effect. If evidence only supports a narrow Career situation, the skill must remain narrow.
