# Issue #83 — Complete Resume Composition Proof

## Root cause

The source resume was not primarily lost during Resume Understanding. Validated source-bound blocks and their hierarchy still existed in the immutable Resume Semantic Run. The loss occurred after Evidence Review:

1. `createResumeTailoringPlanRun` received only committed Candidate Knowledge.
2. Resume Draft and Resume Artifact generation rendered only `include` selections.
3. Career Review reviewed and exported only those rendered generated sections.

A job-specific selection set containing one Projects fact therefore became a one-statement “resume,” even though unrelated source Experience, Skills, Education, identity, and contact evidence still existed upstream.

## Composition boundary

The complete applicant-facing resume has two explicit content authorities:

- `candidate_knowledge_generated`: generated or materially rewritten claims. These still require Evidence Review, Candidate Knowledge Integration (003.6), an included Resume Content Selection, inherited provenance, and deterministic claim-scope validation.
- `source_resume_passthrough`: unchanged text from a validated source-resume span or exact source profile intake field. It carries exact source provenance, has zero Resume Content Selection references, and never writes Candidate Knowledge.

At Resume Artifact composition, source statements remain in source order and hierarchy. A source statement may be superseded only when a visible generated statement in the same section cites an included Candidate Knowledge fact whose bounded source value exactly matches that source statement. Every unrelated source statement must remain verbatim.

Deterministic validation treats these as separate rule families:

- generated factual-claim safety;
- source passthrough exactness;
- whole-resume completeness.

Validation does not trust composition metadata by itself. For every claimed source replacement it independently resolves the visible generated statement, its section, Candidate Knowledge fact IDs, and the bounded source values permitted by the statement template. A generated statement cannot replace unrelated source text or be reused to account for multiple source statements.

Career Review receives every populated composed section, and export uses the complete reviewed artifact.

## Executed regression proof

The focused regression deliberately commits only a Projects fact through the Candidate Knowledge path. It verifies that the artifact and final export still contain:

- applicant name;
- email and phone;
- Skills;
- Experience;
- Projects;
- Education;
- Certifications.

It also verifies that unchanged sections remain `source_resume_passthrough`, have no selection references, and equal their exact source text; the tailored Projects statement remains `candidate_knowledge_generated` and retains Candidate Knowledge and requirement citations.

Executed in an isolated Node.js 22 environment:

```text
node --test tests/complete-resume-composition.test.js
tests 7
pass 7
fail 0
```

The negative regressions prove three failure classes:

1. removing Education after composition fails with `whole_resume_completeness`;
2. falsely claiming that a Project-generated statement replaced the source `Power BI` skill fails `source-statement-preserved-or-supported-replacement`, even when the generated statement has otherwise valid Candidate Knowledge provenance;
3. employment or education date ranges such as `2022 - 2023` are not retained as phone contact spans.

The shipped LLM-first server regression is also retained in `tests/complete-resume-beta-regression.test.js`. It exercises the real local Beta route, accepts only Projects evidence, verifies Candidate Knowledge remains Projects-only, approves every composed Career Review section, and checks the exported `final-resume.md` for identity/contact, Skills, Experience, Projects, Education, and Certifications.

## Independent applicant-facing inspection

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

## Repository check state

The repository CI workflow runs `npm test` and `git diff --check` on `pull_request`. GitHub App / connector-created branch updates did not instantiate a workflow run, including synchronize and reopen events. The final head therefore has no remote workflow result or commit status; this infrastructure state is recorded as **UNKNOWN**, not PASS.

The merge decision uses the repository's established connector-hotfix precedent: actual focused execution, complete changed-file review, branch synchronization, syntax and whitespace review, negative boundary regressions, and independent artifact inspection are required, while unavailable remote CI remains explicitly UNKNOWN. This exception does not weaken Candidate Knowledge, 003.6, provenance, validation, Career Review, or privacy boundaries.

This proof is an engineering gate only. It does not mark Beta Accepted. It establishes that the complete-resume blocker is ready for the next real-user Beta acceptance run.
