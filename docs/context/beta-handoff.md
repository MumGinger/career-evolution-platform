# Beta Handoff

**Owner:** Beta Room
**Checkpoint:** 2026-08-06 — Beta #5 engineering recovery complete

## Start

Read `PROJECT_CONTEXT.md`, `docs/context/project-snapshot.md`, this file, the fresh Beta issue, open Issue #97, merged PR #111, and current shipped GitHub state.

Act only as a neutral first-time applicant and Beta Product Tester. Do not discuss code, architecture, schemas, prompts, APIs, provider internals, implementation solutions, or engineering test design during the Beta.

## Product acceptance history

- Beta #1 / Issue #73: **FAIL**.
- Beta #2 / Issue #82: **FAIL**.
- Beta #3 / Issue #93: **FAIL**.
- Beta #4 / Issue #100: **FAIL**.
- Beta #5 / Issue #106: **FAIL at Evidence Review Candidate 1**.
- Beta Accepted: **NO**.

Beta #5 remains a historical FAIL. Engineering recovery does not convert it into PASS.

## Why Beta #5 failed

The applicant still interpreted Accept/Skip as deciding whether reviewed material should be put into the tailored resume. The applicant could not make Candidate 1's decision with the intended consequence in mind without guessing.

Direct evidence included:

> “ask me to whether put this on my resume”

> “skip means doesn't put on my resume for this job?”

> “i upload my resume and these are all true i don't need to verify again right … so what i think is that this is whether i want to put it on my resume”

The credible Beta therefore stopped at Evidence Review Candidate 1. Later Beta #5 observations were supplemental only.

## Engineering recovery now shipped

PR #111 merged at `f06ce4633799e1e938d267a29b1aba9cf9851281`.

Issue #107 is closed after engineering proof. The repaired Evidence Review separates:

- uploaded source evidence;
- how that evidence may support new or rewritten tailored wording;
- why the evidence was surfaced for the job.

Accept permits evidence reuse but does not guarantee final-resume inclusion. Skip blocks evidence reuse and does not delete uploaded source-resume text.

Issue #108 is closed after engineering proof. Career Review now visibly lets the applicant either approve a correct section or mark it as needing changes and edit it before export.

Beta #5 presentation findings recorded on Issue #97 also received targeted engineering recovery:

- source bullet artifacts are presentation-cleaned;
- adjacent duplicate display statements are reduced;
- repeated project/entry heading prefixes are removed from following bullets;
- legitimate repeated source wording across separate entries remains preserved;
- applicant edits flow through the final export set.

Issue #97 remains open because those engineering results require fresh-user product acceptance.

## Next Beta requirements

The next Beta must be **fresh from Landing/Input** with a real resume and real job description. Do not continue Beta #5 and do not reuse Beta #5 judgments as the new result.

Guide only one visible product stage at a time. After each major stage ask:

1. What did you expect?
2. What actually happened?
3. What was confusing?
4. Did your confidence increase or decrease?
5. Was the review burden reasonable?

Do not coach the applicant toward the intended interpretation.

## Primary retest — Evidence Review Candidate 1

Before the applicant chooses Accept or Skip, ask them in their own words:

- What is this step asking you to decide?
- What do you think Accept will do?
- What do you think Skip will do?
- If you Skip, what do you think happens to the original text in your uploaded resume?
- Is this choice about verifying truth, judging job relevance, deciding final-resume inclusion, permission to reuse evidence for tailored wording, or something else?

Do not explain the intended answer first.

If the applicant still interprets the choice as a final inclusion/removal decision or needs internal terminology to understand it, stop the Beta credibly at that point.

If Candidate 1 is clear, continue through every Evidence Review candidate and judge the total review burden.

## Draft and validation retest

Inspect the actual complete resume. Record:

- readability as a normal resume;
- duplicated paragraph/bullet content;
- repeated project or job headings inside bullets;
- stray bullet or encoding artifacts;
- compressed or confusing heading/date presentation;
- missing source content;
- warning clarity;
- progression discoverability.

Do not infer success from the engineering regression alone.

## Career Review retest

For every populated section, determine whether the applicant can verify it without implementation knowledge.

Before explaining the controls, ask what they would do if a section were wrong. The correction path must be discoverable from the product itself.

If a genuine correction is needed, use the visible edit path and verify the corrected content in the final artifacts. Do not introduce false information merely to exercise the edit path.

Record whether `Where this came from` increases trust without excessive burden and whether reviewing every section feels reasonable.

## Final artifacts

Inspect all four artifacts directly:

1. `final-resume.pdf` — primary applicant-facing file;
2. `career-review-report.html` — readable review record;
3. `final-resume.md` — secondary text artifact;
4. `final-resume.json` — secondary technical artifact.

Judge whether they represent the same approved resume and whether the applicant would submit the PDF without rebuilding the resume elsewhere.

## Required final judgments

Record each as **PASS, FAIL, or UNKNOWN** with the applicant's own evidence:

- Evidence Review decision understanding;
- Accept consequence understanding;
- Skip consequence/source preservation understanding;
- evidence reuse vs truth/relevance/final-inclusion distinction;
- full Evidence Review burden;
- Draft readability and presentation quality;
- warning clarity;
- progression discoverability;
- Career Review correction discoverability;
- Career Review usefulness and burden;
- complete resume confidence;
- trust and transparency;
- submission readiness;
- would submit `final-resume.pdf`;
- time saved versus manual tailoring;
- practical value;
- would use the product again.

## Beta acceptance

Beta Accepted requires the applicant to judge that:

1. they would seriously consider submitting the generated PDF;
2. the complete resume is accurate and sufficiently polished;
3. the workflow saved meaningful time;
4. the review burden was reasonable;
5. trust was maintained or increased;
6. they would use the product again for another real application.

A green CI run, a technically complete workflow, or opened files do not establish Beta acceptance.

## Watch items from Beta #5

Base URL clarity and the purpose of Understanding/exclusions were confusing in Beta #5. They were not the decisive blocker, but record them again if they cause material friction in the fresh run.
