const test = require('node:test');
const assert = require('node:assert/strict');

const applicant = require('../../src/applicant-resume');

test('real source skill category lines remain grouped instead of becoming one flat skills wall', () => {
  const model = applicant.resumePresentationModel([{
    section: 'Skills',
    statements: [
      { text: 'Programming & Data', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Python, Java, C++, JavaScript, SQL, VBA, HTML/CSS, MATLAB', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Data Visualization & BI', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Power BI, D3.js, Excel (Advanced), Interactive Dashboards, Data Storytelling', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Statistical & Machine Learning', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Linear & Logistic Regression, GLMs, PCA, Time Series Modeling, Model Evaluation & Diagnostics', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Tools & Workflow', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Git, APIs, n8n, Notion, LLM APIs, Workflow Automation', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Languages', display_style: 'inline', content_origin: 'source_resume_passthrough' },
      { text: 'Mandarin (Native), English (Fluent), Japanese (Basic)', display_style: 'inline', content_origin: 'source_resume_passthrough' },
    ],
  }]);

  const skills = model.find((section) => section.section === 'Skills');
  assert.deepEqual(skills.groups.map((group) => group.label), [
    'Programming & Data',
    'Data Visualization & BI',
    'Statistical & Machine Learning',
    'Tools & Workflow',
    'Languages',
  ]);
  assert.equal(skills.items.length, 0);
  assert.match(skills.groups[0].values, /Python/);
  assert.match(skills.groups[2].values, /Time Series Modeling/);

  const html = applicant.resumeHtml([{
    section: 'Skills',
    statements: [
      { text: 'Programming & Data', display_style: 'inline' },
      { text: 'Python, SQL, VBA', display_style: 'inline' },
      { text: 'Data Visualization & BI', display_style: 'inline' },
      { text: 'Power BI, D3.js, Excel', display_style: 'inline' },
    ],
  }], { standalone: false });
  assert.equal((html.match(/resume-skill-group/g) || []).length >= 2, true);
  assert.doesNotMatch(html, /Programming &amp; Data<\/li>/);
});
