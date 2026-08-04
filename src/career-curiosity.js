const POLICY_VERSION = 'career-curiosity/1.0.0';
const RESPONSES = ['interesting', 'not_for_me', 'maybe_later'];

const ADJACENT_PATHS = [
  { id: 'business-intelligence-analyst', directions: ['data analytics', 'data analyst'], label: 'Business Intelligence Analyst', reason: 'This path often builds on turning data into clear reporting and decision support.' },
  { id: 'product-analyst', directions: ['business analysis', 'business analyst'], label: 'Product Analyst', reason: 'This path often connects analysis with how people use a product.' },
  { id: 'data-analytics', directions: ['business intelligence', 'business intelligence analyst'], label: 'Data Analytics', reason: 'This path can extend reporting work into broader investigation and analysis.' }
];

function eligibleItems(snapshotRun) {
  return snapshotRun.understanding_items.filter((item) => ['strength', 'domain'].includes(item.category) && ['high', 'medium'].includes(item.confidence));
}

function generate(snapshotRun) {
  const direction = snapshotRun.current_direction;
  const supportingItems = eligibleItems(snapshotRun);
  const path = direction.label && supportingItems.length
    ? ADJACENT_PATHS.find((entry) => entry.directions.includes(direction.label.toLowerCase()))
    : null;
  if (!path) return { status: 'insufficient_confidence', message: 'Based on what we have explored together, there is not enough supported understanding yet to introduce a career possibility.' };
  const items = [snapshotRun.understanding_items.find((item) => item.category === 'direction'), ...supportingItems.slice(0, 2)];
  const labels = supportingItems.slice(0, 2).map((item) => item.label).join(' and ');
  return {
    status: 'available',
    possibility: {
      id: path.id,
      label: path.label,
      introduction: `Based on what we've explored together, here's one path you may not have considered: ${path.label}.`,
      explanation: `${path.reason} Your snapshot includes ${labels}.`,
      supporting_snapshot: { snapshot_run_id: snapshotRun.id, items }
    }
  };
}

function readable(result, observation = null) {
  const lines = ['Career Curiosity', ''];
  if (result.status !== 'available') return lines.concat(result.message, '', 'No possibility was recorded.').join('\n');
  const { possibility } = result;
  lines.push(possibility.introduction, '', possibility.explanation, '', 'Why this appeared');
  lines.push(...possibility.supporting_snapshot.items.map((item) => `- ${item.label}: ${item.rationale}`));
  lines.push('', 'Choose one: Interesting | Not for me | Maybe later', '', `Response: ${observation?.user_response || 'Not recorded'}`);
  return lines.join('\n');
}

module.exports = { POLICY_VERSION, RESPONSES, generate, readable };
