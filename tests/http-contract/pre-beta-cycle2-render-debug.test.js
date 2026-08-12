const test = require('node:test');
const assert = require('node:assert/strict');
const applicant = require('../../src/applicant-resume');

test('temporary Cycle 2 rendered PDF evidence', () => {
  const reviews = [
    { section: 'Applicant Header', statements: [
      { text: 'Taylor Chen', display_style: 'line' },
      { text: 'Toronto, ON | taylor@example.com | +1 416 555 0199', display_style: 'line' },
    ] },
    { section: 'Professional Summary', statements: [
      { text: 'Data analytics candidate with Power BI dashboard and reporting automation experience.', display_style: 'line' },
    ] },
    { section: 'Skills', statements: [
      { text: 'Python', display_style: 'bullet' },
      { text: 'SQL', display_style: 'bullet' },
      { text: 'Power BI', display_style: 'bullet' },
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
  console.log(`__CYCLE2_PDF_BASE64__${pdf.toString('base64')}__END_CYCLE2_PDF_BASE64__`);
});
