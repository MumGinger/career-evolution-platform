const fs = require('node:fs');
const path = require('node:path');
const applicant = require('../src/applicant-resume');

function statement(text, style = 'line') {
  return { text, display_style: style };
}
function review(section, statements) {
  const version = { placeholder: null, statements };
  return { section, action: 'approve', ai_version: version, final_version: version };
}

const reviews = [
  review('Applicant Header', [
    statement('Taylor Chen'),
    statement('Toronto, ON | +1 416 555 0199 | taylor@example.com'),
  ]),
  review('Professional Summary', [
    statement('Data analysis and visualization work combined with automation experience building structured-data and document-generation workflows.'),
  ]),
  review('Skills', [
    statement('Programming & Data: Python, SQL', 'inline'),
    statement('Data Visualization & BI: Power BI, D3.js, Interactive Dashboards, Data Storytelling', 'inline'),
    statement('Statistical & Machine Learning: Linear & Logistic Regression, GLMs, Time Series Modeling, Model Evaluation & Diagnostics', 'inline'),
    statement('Tools & Workflow: LLM APIs, Workflow Automation', 'inline'),
  ]),
  review('Projects', [
    statement('Workflow Automation & Document Generation System\n(n8n, JavaScript, LLM APIs, Notion, HTML/CSS)', 'heading'),
    statement('Built a local workflow automation pipeline to ingest web URLs, extract structured information from unstructured career pages, and generate formatted PDF documents.', 'bullet'),
    statement('Integrated JavaScript, LLM APIs, and n8n workflow orchestration to handle multi-step data extraction and document generation.', 'bullet'),
    statement('Designed reusable workflow nodes and structured outputs to support repeatable application tracking.', 'bullet'),
    statement('Global AI Job Salaries Visualization', 'heading'),
    statement('Developed an interactive salary analytics dashboard to analyze global AI job compensation by location, experience level, job category, and industry.', 'bullet'),
    statement('Cleaned and structured CSV data, implemented dynamic filters and city-level summaries, and built coordinated D3.js visualizations.', 'bullet'),
    statement('Built a global map and box plot to compare salary distributions and surface compensation trends.', 'bullet'),
    statement('Data Analysis and Model Building', 'heading'),
    statement('Developed a linear regression model to identify socio-economic factors correlated with average annual cancer cases across U.S. counties.', 'bullet'),
    statement('Implemented Generalized Linear Models (GLMs) to predict consumer purchasing behavior based on demographics and purchasing patterns.', 'bullet'),
    statement('Applied time-series analysis techniques to model and forecast time-dependent trends.', 'bullet'),
  ]),
  review('Education', [
    statement('University of Toronto St. George, Toronto, ON\nSeptember 2023 – June 2027\nMajor: Statistics; Computer Science\nMinor: Economics\nCumulative GPA: 3.48'),
    statement('University of Western Ontario, London, ON\nSeptember 2022 – August 2023\nMajor: Statistics\nGrade: A (87/100)\nHonors: Dean’s Honor List; Math Scholars'),
  ]),
  review('Certifications', [
    statement('CFA Program (CFA Institute)\nLevel I Passed | Level II Candidate (2026)'),
  ]),
];

const output = process.argv[2] || path.join(process.cwd(), 'reports', 'quality-evidence', 'issue138-real-input.pdf');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, applicant.resumePdf(reviews));
console.log(output);
