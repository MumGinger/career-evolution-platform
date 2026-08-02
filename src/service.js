const { SKILL } = require('./store');

function requirementsFrom(description) {
  const stopWords = new Set(['with', 'that', 'this', 'will', 'from', 'have', 'your', 'role', 'team', 'work', 'years', 'experience', 'required', 'preferred']);
  return [...new Set((description.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) || []).filter((word) => !stopWords.has(word)))].slice(0, 12);
}
function generateApplicationPackage(store, applicationId) {
  const application = store.getApplication(applicationId);
  const skills = application.profile.skills.map((skill) => skill.toLowerCase());
  const requirements = requirementsFrom(application.job_description);
  const matched = requirements.filter((requirement) => skills.some((skill) => skill.includes(requirement) || requirement.includes(skill)));
  const missing = requirements.filter((requirement) => !matched.includes(requirement)).slice(0, 5);
  const assessment = { explanation: 'This diagnostic compares candidate-provided skills with job-description terms; it is not a hiring prediction.', matched_skills: matched, gaps_to_address: missing, rubric_score: requirements.length ? Math.round((matched.length / requirements.length) * 100) : 0 };
  const artifact = { title: `Application note for ${application.role_title} at ${application.company}`, body: `Dear ${application.company} hiring team,\n\nI am interested in the ${application.role_title} role. My background in ${application.profile.skills.join(', ') || 'the experience in my profile'} aligns with the role's stated needs. I would welcome the opportunity to discuss how I can contribute.\n\nSincerely,\n${application.profile.name}`, assessment };
  const modelMetadata = { provider: 'local', model: 'deterministic-mvp-template', generated_at: new Date().toISOString() };
  const saved = store.createArtifact({ applicationId, artifactType: 'tailored_application_note', content: artifact, modelMetadata });
  store.recordEvidence({ applicationId, evidenceType: 'rubric_score', value: String(assessment.rubric_score), classification: 'internal_diagnostic', source: 'local_rubric', confidence: 'low', limitations: 'A keyword rubric is diagnostic only and is not evidence of hiring effectiveness.' });
  return saved;
}
function recordUserEdit(store, applicationId, description) {
  return store.recordEvidence({ applicationId, evidenceType: 'user_edit', value: description, classification: 'preference', source: 'user', confidence: 'medium', limitations: 'An edit indicates preference or usability; it is not proof of hiring effectiveness.' });
}
module.exports = { generateApplicationPackage, recordUserEdit, SKILL };
