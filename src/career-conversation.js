const QUESTION = 'Which direction feels most interesting to you right now?';
const OPTIONS = ['Data Analytics', 'AI / ML', 'Finance', "I'm still exploring"];

function workflowSource(reviewRun) { return `evidence_review:${reviewRun.id}`; }
function observe({ store, reviewRun, answer, skipped = false }) { return store.createCareerConversationObservation({ question: QUESTION, answer, skipped, workflowSource: workflowSource(reviewRun) }); }

module.exports = { QUESTION, OPTIONS, workflowSource, observe };
