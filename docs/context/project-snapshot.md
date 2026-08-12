# Project Snapshot

**As of:** 2026-08-12 — Beta #7 layout recovery merged
**Repository:** `MumGinger/career-evolution-platform`
**Primary branch:** `chore/project-foundation`

## State

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Issue #83 / PR #87: complete-resume composition engineering complete.
- Beta #3 / Issue #93: **FAIL**.
- Issue #97: applicant-readable review/export acceptance remains **OPEN**.
- Beta #4 / Issue #100: **FAIL**.
- Beta #5 / Issue #106: **FAIL**.
- Beta #6 / Issue #113: **FAIL**.
- Product Issue #115: Option 2 product decision completed; concrete Tailoring Review is the shipped review model.
- Beta #7 / Issue #121: **FAIL** because final resume layout was not submission-ready and did not save meaningful time.
- Issue #122: **OPEN**; engineering layout recovery is merged but fresh-user product acceptance is still required.
- PR #123: layout recovery merged at `2fa1f084f8e06cc8f9ee095d406aa6c0033c95af`.
- Beta Accepted: **NO**.

Repository and current GitHub evidence override stale context.

## Repository recovery after history rewrite

On 2026-08-12, Engineering found that authoritative `chore/project-foundation` had been left at the rewritten Beta #5 checkpoint after the repository history rewrite. The rewritten Option 2 checkpoint branch still contained the later implementation and was verified to be a clean fast-forward of primary.

Primary was safely fast-forwarded, without force, to rewritten Option 2 checkpoint `b40f8a624289c5986ae7f75f019153211faa65fa` before Beta #7 remediation. PR #123 was then built and merged from that restored state.

## Beta #7 product result

The fresh applicant reached the final artifact but would not submit it. The decisive product failure was visual presentation rather than a blocked workflow:

- Skills were too dense and visually concatenated;
- Summary was visually misplaced under Experience;
- Education flattened school/date/major/minor/GPA/honors into hard-to-read runs;
- neighboring fields lacked normal visual boundaries;
- Project dates appeared after bullets instead of beside the project heading;
- the final PDF was less credible than the applicant expected from a professional resume;
- manual tailoring remained preferable, so time saved was **NO**.

A secondary watch item is that Tailoring Review sometimes appeared to provide only title-level changes, reducing perceived tailoring value.

## PR #123 engineering result

PR #123 establishes a dedicated professional resume presentation boundary shared by applicant HTML/review surfaces and PDF export.

Shipped behavior:

- standalone Professional Summary;
- category/value Skills groups plus compact flat-skill handling;
- conventional Experience, Projects, and Education entries;
- dates in entry-heading positions;
- Project trailing date recovery into the project header;
- Education field separation;
- conservative date parsing so achievement prose is not reclassified as metadata;
- ATS-friendly single-column hierarchy;
- Career Review remains readable and populated.

Regression-only CI `31596052613` demonstrated the expected RED layout state before production changes.

Final merge-candidate CI `31597221430` passed unit, full integration, whitespace, HTTP/representative-PDF, pre-fix Chromium RED proof, and current Chromium GREEN. Review threads were empty and the branch was behind primary by 0 at merge gate.

## Protected capability boundary

Preserved:

- 003.6 remains Candidate Knowledge integration/write authority.
- Source-resume passthrough remains source-linked and cannot create Candidate Knowledge.
- Source attestation does not make AI interpretation source truth.
- Generated/materially rewritten claims retain Candidate Knowledge, provenance, and validation requirements.
- Complete-resume composition/source-passthrough guarantees remain intact.
- Resume Content Selection and deterministic validation authority remain intact.
- Career Review / Human Review remains final human authority before export.
- Manual Career Review edits do not silently update Candidate Knowledge.
- Provider credentials remain memory-only/private.

The new layout model is presentation-only and cannot change stored source/knowledge truth.

## Next cross-room action

1. Merge the Beta #7 layout-recovery durable checkpoint.
2. Create a fresh Beta #8 with initial result **UNKNOWN**.
3. Start from Landing/Input with a real resume and job description; do not continue Beta #7.
4. Primary retest the final PDF against #122: professional credibility, Summary placement, Skills scanability, entry hierarchy, spacing, Education readability, and conventional date placement.
5. Compare the Draft/Career Review presentation with the final PDF so export cannot be visibly worse than review.
6. Keep Tailoring Review substantive-value perception as a secondary watch item.
7. Keep #122 and #97 open until fresh-user acceptance actually passes.
