const test = require('node:test');
const assert = require('node:assert/strict');
const applicant = require('../../src/applicant-resume');

test('temporary Cycle 1 rendered PDF evidence for visual inspection', () => {
  const reviews = [
    { section: 'Applicant Header', statements: [
      { text: 'Taylor Chen', display_style: 'line' },
      { text: 'Toronto, ON | taylor@example.com | +1 416 555 0199', display_style: 'line' },
    ] },
    { section: 'Professional Summary', statements: [
      { text: 'Data analytics candidate with Power BI dashboard and reporting automation experience.', display_style: 'line' },
    ] },
    { section: 'Skills', statements: [
      { text: 'Programming & Data', display_style: 'inline' },
      { text: 'Python, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB', display_style: 'inline' },
      { text: 'Data Visualization & BI', display_style: 'inline' },
      { text: 'Power BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling', display_style: 'inline' },
      { text: 'Statistical & Machine Learning', display_style: 'inline' },
      { text: 'Linear & Logistic Regression, GLMs, PCA, Time Series Modeling, Model Evaluation & Diagnostics', display_style: 'inline' },
      { text: 'Tools & Workflow', display_style: 'inline' },
      { text: 'Git, APIs, n8n, Notion, LLM APIs, Workflow Automation', display_style: 'inline' },
      { text: 'Languages', display_style: 'inline' },
      { text: 'Mandarin (Native), English (Fluent), Japanese (Basic)', display_style: 'inline' },
    ] },
    { section: 'Experience', statements: [
      { text: 'Data Analyst — Example Co.\nToronto, ON | May 2023 – Aug 2024', display_style: 'heading' },
      { text: 'Built Power BI dashboards and automated reporting workflows for business analysis.', display_style: 'bullet' },
      { text: 'Automated recurring analysis and prepared decision-ready reporting for business stakeholders.', display_style: 'bullet' },
    ] },
    { section: 'Projects', statements: [
      { text: 'Analytics Dashboard', display_style: 'heading' },
      { text: 'Built reporting views that connected business questions to decision-ready metrics.', display_style: 'bullet' },
      { text: 'Stock Pattern Label Platform', display_style: 'heading' },
      { text: 'Built an interface for labeling market patterns and reviewing hourly price/volume behavior.', display_style: 'bullet' },
    ] },
    { section: 'Education', statements: [
      { text: 'University of Toronto | Sep 2024 – Present | BSc, Statistics & Computer Science | Minor in Economics', display_style: 'line' },
    ] },
    { section: 'Certifications', statements: [
      { text: 'CFA Level I', display_style: 'line' },
    ] },
  ];

  const pdf = applicant.resumePdf(reviews);
  assert.equal(pdf.subarray(0, 8).toString('latin1'), '%PDF-1.4');
  console.log(`__CYCLE1_PDF_BASE64__${pdf.toString('base64')}__END_CYCLE1_PDF_BASE64__`);
});
