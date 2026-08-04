function markdown(artifact) {
  return artifact.content.sections.map((section) => {
    const statements = section.statements.map((statement) => `- ${statement.text}`).join('\n');
    return `## ${section.section}\n\n${section.placeholder || statements || '_No supported content selected._'}`;
  }).join('\n\n') + '\n';
}

function createFinalExport({ artifact, validation, careerReview }) {
  if (!careerReview?.completed) throw new Error('Final export is blocked until Career Review is completed with explicit approval for every section.');
  if (!['passed', 'passed_with_warnings'].includes(validation.validation_status)) throw new Error(`Final export is blocked because resume validation is ${validation.validation_status}.`);
  return {
    artifact_type: 'final_resume_export', format_version: '1.0.0', export_status: 'ready',
    rendered_resume_markdown: markdown(artifact.resume_artifacts[0]),
    statement: 'Final export is ready after Career Review. The candidate had the final word.',
    traceability: { resume_artifact_run_id: artifact.id, validation_run_id: validation.id, career_review_required: true, career_review_completed: true },
  };
}

module.exports = { markdown, createFinalExport };
