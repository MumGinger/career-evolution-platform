# Issue #83 — Complete Resume Composition Proof

## Root cause

The source resume was not primarily lost during Resume Understanding. Validated source-bound blocks and their hierarchy still existed in the immutable Resume Semantic Run. The loss occurred after Evidence Review:

1. `createResumeTailoringPlanRun` received only committed Candidate Knowledge.
2. Resume Draft and Resume Artifact generation rendered only `include` selections.
3. Career Review reviewed and exported only those rendered generated sections.

A job-specific selection set containing one Projects fact therefore became a one-statement “resume,” even though unrelated source Experience, Skills, Education, identity, and contact evidence still existed upstream.

## Composition boundary

The complete applicant-facing resume now has two explicit content authorities:

- `candidate_knowledge_generated`: generated or rewritten claims. These still require Evidence Review, Candidate Knowledge Integration (003.6), an included Resume Content Selection, inherited provenance, and deterministic claim-scope validation.
- `source_resume_passthrough`: unchanged text from a validated source-resume span or source profile intake field. It carries exact source provenance, has zero Resume Content Selection references, and never writes Candidate Knowledge.

At Resume Artifact composition, source statements remain in source order and hierarchy. A source statement may be superseded only when a visible generated statement cites an included Candidate Knowledge fact whose bounded source value exactly matches that source statement. Every other source statement must remain verbatim.

Deterministic validation now treats these as separate rule families:

- generated factual-claim safety;
- source passthrough exactness;
- whole-resume completeness.

Validation does not trust composition metadata by itself. For every claimed source replacement it independently resolves the visible generated statement, its section, Candidate Knowledge fact IDs, and the bounded source values permitted by the statement template. A generated statement cannot replace unrelated source text or be reused to account for multiple source statements.

Career Review receives every populated composed section, and export uses the complete reviewed artifact.

## Regression proof

The focused regression deliberately commits only a Projects fact through the Candidate Knowledge path. It verifies that the artifact and final export still contain:

- applicant name;
- email and phone;
- Skills;
- Experience;
- Projects;
- Education;
- Certifications.

It also verifies that unchanged sections remain `source_resume_passthrough`, have no selection references, and equal their exact source text; the tailored Projects statement remains `candidate_knowledge_generated` and retains Candidate Knowledge and requirement citations.

Focused result: **6 passing tests**.

The negative regressions prove both failure classes:

1. removing Education after composition fails with `whole_resume_completeness`;
2. falsely claiming that a Project-generated statement replaced the source `Power BI` skill fails `source-statement-preserved-or-supported-replacement`, even when the generated statement has otherwise valid Candidate Knowledge provenance.

## Independent draft inspection

The standalone inspection fixture used 11 validated source statements and one committed Projects fact. The composed draft contained six populated review sections. Ten source statements were preserved verbatim and one project bullet was superseded by a bounded generated statement.

```markdown
Ya-Ching Tang
ya.ching@example.com
+1 416 555 0123

## Skills

- Power BI
- Python

## Experience

### Data Analyst — Example Co.
- Delivered reporting for stakeholders.

## Projects

### Customer Analytics Dashboard
- Built Power BI dashboards and automation workflows.

## Education

B.Sc. Information Systems — Example University

## Certifications

Microsoft Power BI Data Analyst
```

Inspection result:

```json
{
  "sections": [
    "Applicant Header",
    "Skills",
    "Experience",
    "Projects",
    "Education",
    "Certifications"
  ],
  "sourceStatements": 11,
  "preserved": 10,
  "superseded": 1,
  "candidateKnowledgeFacts": ["project-fact"]
}
```

This proof is an engineering gate only. It does not mark Beta Accepted. Another Beta may be prepared only after the repository regression suite and pull-request checks pass and this complete draft remains independently inspectable.
