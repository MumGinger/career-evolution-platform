const ADAPTER_VERSION = 'deterministic-local-acquisition-execution/1.0.0';

const STATUSES = new Set(['captured', 'skipped', 'unavailable']);

function normalizeCaptures(actions, captures) {
  if (!Array.isArray(captures)) throw new Error('captures must be an array with one outcome for each Acquisition Action');
  const actionIds = new Set(actions.map((action) => action.id));
  const byActionId = new Map();
  for (const capture of captures) {
    if (!capture || typeof capture !== 'object') throw new Error('Each action outcome must be an object');
    if (!actionIds.has(capture.actionId)) throw new Error('Action outcome must reference an Acquisition Action in the supplied Acquisition Plan Run');
    if (byActionId.has(capture.actionId)) throw new Error('An Acquisition Action may have only one outcome in an Acquisition Result Run');
    const executionStatus = capture.executionStatus || (capture.rawCapturedEvidence === undefined ? 'skipped' : 'captured');
    if (!STATUSES.has(executionStatus)) throw new Error(`Unsupported execution status: ${executionStatus}`);
    if (executionStatus === 'captured' && capture.rawCapturedEvidence === undefined) throw new Error('Captured outcomes require rawCapturedEvidence');
    byActionId.set(capture.actionId, {
      execution_status: executionStatus,
      raw_captured_evidence: capture.rawCapturedEvidence === undefined ? null : capture.rawCapturedEvidence,
      source_type: capture.sourceType || 'local_execution_input',
      provenance: capture.provenance || { adapter: 'deterministic_local', capture_mode: 'caller_supplied_raw_evidence' },
      limitations: capture.limitations || 'Raw captured evidence is unreviewed and has not been resolved, evaluated, or integrated into Candidate Knowledge.',
    });
  }
  if (byActionId.size !== actions.length) throw new Error('Each Acquisition Action in the supplied Acquisition Plan Run requires exactly one recorded outcome');
  return byActionId;
}

module.exports = { ADAPTER_VERSION, normalizeCaptures };
