const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const composition = require('../../src/resume-composition');
const humanReview = require('../../src/human-review');
const cleanup = require('../../src/applicant-cleanup');
const applicant = require('../../src/applicant-resume');

function source(id, text, section, style, position, parent = null) {
  return {
    statement_id: id,
    source_statement_id: id,
    text,
    section,
    position,
    display_style: style,
    content_origin: 'source_resume_passthrough',
    resume_content_selection_ids: [],
    parent_source_statement_id: parent,
    provenance: { source_kind: 'validated_resume_understanding', exact_source_text: text },
  };
}

function generated(id, sourceId, text, section, selectionId) {
  return {
    statement_id: id,
    source_statement_id: sourceId,
    parent_source_statement_id: null,
    text,
    section,
    display_style: 'heading',
    content_origin: 'candidate_knowledge_generated',
    resume_content_selection_ids: [selectionId],
    provenance: {
      candidate_fact_id: `fact-${selectionId}`,
      candidate_fact_ids: [`fact-${selectionId}`],
      candidate_fact_revision: `fact-${selectionId}`,
      job_requirement_ids: [`req-${selectionId}`],
      inherited_provenance_references: [`decision-${selectionId}`],
    },
  };
}

function exactChild(id, sourceParent, text, position) {
  return source(id, text, 'Projects', 'bullet', position, sourceParent);
}

test('real-input-shaped application artifact is target-specific, de-duplicated, and no longer three pages', () => {
  const skills = [
    source('source:skills-1', 'SKILLS\nProgramming & Data\nPython, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB', 'Skills', 'inline', 1),
    source('source:skills-2', 'Data Visualization & BI\nPower BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling, CSV Data Processing', 'Skills', 'inline', 2),
    source('source:skills-3', 'Statistical & Machine Learning\nLinear & Logistic Regression, GLMs, Regularization (L1/L2), PCA, Time Series Modeling, Neural Networks (MLP, CNN, RNN), Model Evaluation & Diagnostics', 'Skills', 'inline', 3),
    source('source:skills-4', 'Finance & Markets\nEquity Analysis, Market Pattern Research, Financial Modeling, Quantitative Methods, CFA Curriculum', 'Skills', 'inline', 4),
    source('source:skills-5', 'Tools & Workflow\nGit, APIs, n8n, Notion, LLM APIs, Workflow Automation, Document Generation', 'Skills', 'inline', 5),
    source('source:skills-6', 'Languages\nMandarin (Native), English (Fluent), Japanese (Basic)', 'Skills', 'inline', 6),
  ];

  const stockBody = 'Designed and built a full-stack stock pattern labeling platform to manually tag and study intraday price/volume patterns across multiple tickers and timeframes.';
  const giftBody = 'Built a personalized gift recommendation web app using React and Tailwind CSS, integrating AI-generated recommendations and adaptive question selection.';
  const workflowBody1 = 'Built a local workflow automation pipeline to ingest web URLs, extract structured information from unstructured career pages, and generate formatted PDF documents.';
  const workflowBody2 = 'Integrated JavaScript, LLM APIs, and n8n workflow orchestration to handle multi-step data extraction and document generation.';
  const salaryBody1 = 'Developed an interactive salary analytics dashboard to analyze global AI job compensation by location, experience level, job category, and industry.';
  const salaryBody2 = 'Built coordinated D3.js visualizations, including a global map and box plot chart, to help users identify compensation trends and compare salary distributions.';
  const analysisBody1 = 'Developed a linear regression model to identify socio-economic factors correlated with average annual cancer cases across U.S. counties.';
  const analysisBody2 = 'Implemented Generalized Linear Models (GLMs) to predict consumer purchasing behavior based on demographics and purchasing patterns.';

  const projects = [
    source('source:stock', `ONGOING PROJECTS (Finance, Data & Software)\nStock Pattern Label Platform\n(React, Node.js, Market Data APIs, Time Series)\n•\n•\n${stockBody}`, 'Projects', 'heading', 10),
    exactChild('source:stock:1', 'source:stock', stockBody, 11),
    source('source:gift', `Gift Recommendation App\n(React, Tailwind CSS, AI-assisted logic)\n•\n•\nAugust 2025 – Present\nMay 2025 – Present\n${giftBody}`, 'Projects', 'heading', 12),
    exactChild('source:gift:1', 'source:gift', giftBody, 13),

    generated('draft:workflow', 'source:workflow', `Workflow Automation & Document Generation System\n(n8n, JavaScript, LLM APIs, Notion, HTML/CSS)\n•\n•\n${workflowBody1}\n${workflowBody2}`, 'Projects', 'workflow'),
    exactChild('source:workflow:1', 'source:workflow', workflowBody1, 15),
    exactChild('source:workflow:2', 'source:workflow', workflowBody2, 16),

    generated('draft:salary', 'source:salary', 'Global AI Job Salaries Visualization — developed an interactive salary analytics dashboard to analyze compensation by location, experience level, job category, and industry.', 'Projects', 'salary'),
    exactChild('source:salary:1', 'source:salary', salaryBody1, 18),
    exactChild('source:salary:2', 'source:salary', salaryBody2, 19),

    generated('draft:analysis', 'source:analysis', 'Data Analysis and Model Building — developed regression and GLM models to analyze real-world datasets.', 'Projects', 'analysis'),
    exactChild('source:analysis:1', 'source:analysis', analysisBody1, 21),
    exactChild('source:analysis:2', 'source:analysis', analysisBody2, 22),

    source('source:pagerank', 'RESEARCH EXPERIENCE\nResearch Project on PageRank (Linear Algebra and Computer Science related)\nMay 2023- May 2024\nUniversity of Western Ontario, London, ON\n•\nDeveloped a Java-based PageRank application.', 'Projects', 'heading', 23),
    exactChild('source:pagerank:1', 'source:pagerank', 'Developed a Java-based PageRank application.', 24),
  ];

  const baseArtifact = {
    format: 'resume-artifact-model/1.0.0',
    sections: [
      { section: 'Applicant Header', position: 1, statements: [source('source:header', 'Taylor Chen\n\nToronto, ON • +1 416 555 0199 • taylor@example.com', 'Applicant Header', 'line', 1)] },
      { section: 'Professional Summary', position: 2, statements: [{
        statement_id: 'draft:summary', text: 'Data analysis and visualization work combined with automation experience building structured-data and document-generation workflows.', display_style: 'bullet', content_origin: 'candidate_knowledge_generated', resume_content_selection_ids: ['selection-summary'], provenance: { candidate_fact_id: 'fact-summary', candidate_fact_ids: ['fact-summary'] },
      }] },
      { section: 'Skills', position: 3, statements: skills },
      { section: 'Projects', position: 5, statements: projects },
      { section: 'Education', position: 6, statements: [
        source('source:education-1', 'EDUCATION\n\nUniversity of Toronto St. George, Toronto, ON\n\nSeptember 2023 – June 2027\n\nMajor: Statistics; Computer Science\nMinor: Economics\nCumulative GPA: 3.48', 'Education', 'line', 30),
        source('source:education-2', 'University of Western Ontario, London, ON\n\nSeptember 2022 – August 2023\n\nMajor: Statistics\nGrade: A (87/100)\nHonors: Dean’s Honor List; Math Scholars', 'Education', 'line', 31),
      ] },
      { section: 'Certifications', position: 7, statements: [source('source:certification', 'CERTIFICATIONS\nCFA Program (CFA Institute)\nLevel I Passed | Level II Candidate (2026)', 'Certifications', 'line', 32)] },
    ],
    metadata: {},
  };

  const plan = {
    job_requirements: [
      { id: 'req-tools', normalized_name: 'power bi sql python', supporting_excerpts: ['Experience with Power BI, SQL, Python, or similar tools is considered an asset.'] },
      { id: 'req-dashboard', normalized_name: 'dashboard data visualization storytelling', supporting_excerpts: ['Assist with dashboards and reports.', 'Experience with data visualization and storytelling.'] },
      { id: 'req-automation', normalized_name: 'automation ai enabled workflows', supporting_excerpts: ['Improve workflows, automate manual processes, and apply AI-enabled solutions.'] },
      { id: 'req-ml', normalized_name: 'machine learning data quality', supporting_excerpts: ['Coursework or projects involving AI or machine learning.', 'Attention to data quality.'] },
    ],
  };

  const targeted = composition.targetSourceSkills(baseArtifact, plan);
  const drafts = humanReview.createDraft({
    artifactRun: {
      id: 'artifact-run-real-input-final',
      resume_tailoring_plan_run_id: 'plan-real-input-final',
      resume_artifacts: [{ artifact_type: 'structured_resume', content: { format: targeted.format, sections: targeted.sections }, metadata: targeted.metadata }],
    },
  });
  const run = cleanup.cleanRun({
    id: 'review-real-input-final',
    section_reviews: drafts.map((draft) => ({ ...draft, action: 'approve', final_version: draft.ai_version })),
  });

  const model = applicant.resumePresentationModel(run.section_reviews);
  const skillModel = model.find((section) => section.section === 'Skills');
  const skillText = JSON.stringify(skillModel);
  assert.match(skillText, /Python/);
  assert.match(skillText, /SQL/);
  assert.match(skillText, /Power BI/);
  assert.match(skillText, /Workflow Automation/);
  assert.doesNotMatch(skillText, /Java|C\+\+|CFA Curriculum|Japanese \(Basic\)/);

  const projectModel = model.find((section) => section.section === 'Projects');
  assert.deepEqual(projectModel.entries.map((entry) => entry.title), [
    'Workflow Automation & Document Generation System',
    'Global AI Job Salaries Visualization',
    'Data Analysis and Model Building',
  ]);
  assert.equal(projectModel.entries.every((entry) => entry.body.length >= 2), true);

  const html = applicant.resumeHtml(run.section_reviews, { standalone: false });
  assert.doesNotMatch(html, /Gift Recommendation App|Stock Pattern Label Platform|PageRank|ONGOING PROJECTS|>EDUCATION<|>CERTIFICATIONS</);
  assert.equal((html.match(/Built a local workflow automation pipeline/g) || []).length, 1);
  assert.equal((html.match(/Developed an interactive salary analytics dashboard/g) || []).length, 1);
  assert.equal((html.match(/Implemented Generalized Linear Models/g) || []).length, 1);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'issue138-real-input-final-'));
  try {
    const pdfPath = path.join(temp, 'final-resume.pdf');
    fs.writeFileSync(pdfPath, applicant.resumePdf(run.section_reviews));
    const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
    const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    assert.ok(Number.isInteger(pages) && pages <= 2, `expected at most 2 pages, got ${pages}`);
    const text = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
    assert.match(text, /PROFESSIONAL SUMMARY/);
    assert.match(text, /Python/);
    assert.match(text, /Power BI/);
    assert.match(text, /Workflow Automation & Document Generation System/);
    assert.doesNotMatch(text, /Gift Recommendation App|Stock Pattern Label Platform|CFA Curriculum|Japanese \(Basic\)|ONGOING PROJECTS/);
    assert.doesNotMatch(text, /acrossmultiple|patternanalysis|andadaptive|andsalarydistribution/);
    assert.equal(text.split(/\r?\n/).some((line) => line.trim() === '-'), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
