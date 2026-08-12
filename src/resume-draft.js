const DRAFT_SCHEMA_VERSION = 'resume-draft/1.0.0';
const DRAFT_PROMPT_VERSION = 'resume-draft-generation/1.1.0';

const STATEMENT_SCHEMA = { type: 'object', additionalProperties: false, required: ['text', 'candidate_fact_ids', 'job_requirement_ids'], properties: {
  text: { type: 'string', minLength: 1 }, candidate_fact_ids: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } }, job_requirement_ids: { type: 'array', items: { type: 'string', minLength: 1 } },
} };
const RESUME_DRAFT_JSON_SCHEMA = { type: 'object', additionalProperties: false, required: ['sections'], properties: { sections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['section', 'statements'], properties: { section: { type: 'string', enum: ['Professional Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Certifications'] }, statements: { type: 'array', items: STATEMENT_SCHEMA } } } } } };

function display(fact) { return fact.display_value || fact.value?.name || fact.value?.title || fact.value?.text || Object.values(fact.value || {}).filter((value) => typeof value === 'string').join(' — '); }
function projectAwareDisplay(fact) { const value = fact?.value || {}; return fact?.entity_type === 'project' && value.name && value.text && value.name !== value.text ? `${value.name}: ${value.text}` : null; }
function deterministicDraft({ selections, facts }) {
  const bySection = new Map();
  for (const selection of selections.filter((item) => item.selection_state === 'include')) {
    const fact = facts.get(selection.candidate_fact_id); const text = projectAwareDisplay(fact) || display(fact); if (!text) continue;
    const item = { text, candidate_fact_ids: [selection.candidate_fact_id], job_requirement_ids: selection.mapped_requirement_ids || [] };
    bySection.set(selection.recommended_section, [...(bySection.get(selection.recommended_section) || []), item]);
  }
  // Deterministic fallback preserves selected facts without synthesizing a new
  // cross-section Summary. Target-specific Summary synthesis remains provider-only
  // and is bounded by the cross_section_summary claim scope.
  return { sections: [...bySection].map(([section, statements]) => ({ section, statements })) };
}

class MockResumeDraftProvider {
  constructor() { this.name = 'mock'; this.model = 'deterministic-test-fixture'; }
  async draft(input) { const draft = deterministicDraft(input); return { provider: this.name, model: this.model, version: DRAFT_SCHEMA_VERSION, rawResponse: JSON.stringify(draft), draft }; }
}
class OpenAiCompatibleResumeDraftProvider {
  constructor({ apiKey = process.env.CEP_LLM_API_KEY, baseUrl = process.env.CEP_LLM_BASE_URL, model = process.env.CEP_LLM_MODEL } = {}) { if (!apiKey || !model) throw new Error('OpenAI-compatible resume draft provider unavailable: set CEP_LLM_API_KEY and CEP_LLM_MODEL.'); this.apiKey = apiKey; this.baseUrl = baseUrl || 'https://api.openai.com/v1'; this.model = model; this.name = 'openai-compatible'; }
  async draft({ facts, selections, requirements, presentationStrategy }) {
    const committed = selections.filter((item) => item.selection_state === 'include').map((selection) => { const fact = facts.get(selection.candidate_fact_id); return {
      candidate_fact_id: selection.candidate_fact_id,
      recommended_section: selection.recommended_section,
      permitted_claim_scope: selection.permitted_claim_scope,
      mapped_job_requirement_ids: selection.mapped_requirement_ids,
      emphasis_level: selection.emphasis_level,
      priority_score: selection.priority_score,
      value: projectAwareDisplay(fact) || display(fact),
    }; });
    const payload = {
      committed_facts: committed,
      target_requirements: requirements.map((item) => ({
        id: item.id,
        name: item.normalized_name,
        excerpt: item.supporting_excerpts,
        importance_score: item.importance_score,
        resume_value_score: item.resume_value_score,
      })),
      target_job: presentationStrategy?.target_job || null,
      presentation_strategy: presentationStrategy ? { ordered_resume_content_selection_ids: presentationStrategy.ordered_resume_content_selection_ids, limitations: presentationStrategy.limitations } : null,
    };
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: this.model, response_format: { type: 'json_schema', json_schema: { name: 'resume_draft', strict: true, schema: RESUME_DRAFT_JSON_SCHEMA } }, messages: [{ role: 'system', content: `Draft a tightly edited, target-job-specific resume using ONLY the provided included committed facts and their mapped job requirements. Every statement must cite one or more candidate_fact_ids and only the job_requirement_ids mapped to those same facts. Prefer higher-priority and high-emphasis evidence; do not preserve broad master-resume career directions merely because they appeared in the source resume. Do not mention unrelated career fields, desired roles, or generic aspirations unless they are explicitly part of the target requirements and supported by the cited facts. Professional Summary is optional and may contain AT MOST ONE concise statement; every fact cited by a Professional Summary statement must include cross_section_summary in permitted_claim_scope. The Summary should synthesize the strongest target-relevant evidence rather than repeat a bullet verbatim. Keep Experience and Projects concise and proportionate. Avoid future roadmaps, learning-process narration, and low-value activity wording when stronger mapped evidence is available. Omit a section if evidence is insufficient. Never claim metrics, seniority, ownership, leadership, years, proficiency, impact, or preferences unless the exact committed fact supports it.` }, { role: 'user', content: JSON.stringify(payload) }] }) });
    if (!response.ok) throw new Error(`Resume draft provider failed: ${response.status}`); const json = await response.json(); const rawResponse = json.choices?.[0]?.message?.content; if (!rawResponse) throw new Error('Resume draft provider returned no structured content.');
    try { return { provider: this.name, model: this.model, version: DRAFT_SCHEMA_VERSION, rawResponse, draft: JSON.parse(rawResponse) }; } catch { return { provider: this.name, model: this.model, version: DRAFT_SCHEMA_VERSION, rawResponse, draft: null, parseError: 'Provider returned invalid JSON.' }; }
  }
}
function providerFromConfig(config = {}) { const provider = config.provider || process.env.CEP_LLM_PROVIDER || 'mock'; if (provider === 'mock') return new MockResumeDraftProvider(); if (provider === 'openai-compatible') return new OpenAiCompatibleResumeDraftProvider(config); throw new Error(`Resume draft provider unavailable: ${provider}. Use mock or openai-compatible.`); }
module.exports = { DRAFT_SCHEMA_VERSION, DRAFT_PROMPT_VERSION, RESUME_DRAFT_JSON_SCHEMA, MockResumeDraftProvider, OpenAiCompatibleResumeDraftProvider, providerFromConfig, deterministicDraft };
