/** Centralized enablement rules for model-editing and engine actions. */
export function modelEditorAvailability({
  loaded = false,
  dirty = false,
  busy = false,
  saving = false,
  serverReady = false,
  repairMode = false,
  jsonDraftInvalid = false,
  modelValid = true,
  pendingSettingsValid = true,
  pendingSettingsError = '',
  pendingSettingsLabel = 'value',
  renamePending = false,
} = {}) {
  const structurallyInvalid = repairMode || jsonDraftInvalid || !modelValid;
  const actionDraftInvalid = structurallyInvalid || !pendingSettingsValid;
  const saveDisabled = !loaded || !dirty || saving || actionDraftInvalid || !serverReady || renamePending;
  const saveAsDisabled = !loaded || saving || actionDraftInvalid || !serverReady || renamePending;
  const saveDisabledReason = !loaded ? 'No writable document is open.'
    : !dirty ? 'No unsaved changes to save.'
      : saving ? 'A save is already in progress.'
        : actionDraftInvalid ? 'Resolve the invalid document or settings draft before saving.'
          : !serverReady ? 'The FullMeta server is unavailable or incompatible.'
            : renamePending ? 'Complete or cancel the pending tree rename before saving.' : '';
  const saveAsDisabledReason = !loaded ? 'No writable document is open.'
    : saving ? 'A save is already in progress.'
      : actionDraftInvalid ? 'Resolve the invalid document or settings draft before saving.'
        : !serverReady ? 'The FullMeta server is unavailable or incompatible.'
          : renamePending ? 'Complete or cancel the pending tree rename before saving.' : '';
  return {
    saveDisabled,
    saveDisabledReason,
    saveAsDisabled,
    saveAsDisabledReason,
    validateDisabled: !loaded || saving || !serverReady || renamePending,
    // A pending item can be applied before the whole model is valid. Invalid
    // drafts stay editable, but expose the reason Apply item is unavailable.
    applySettingsDisabled: !loaded || saving || repairMode || jsonDraftInvalid || !pendingSettingsValid || renamePending,
    applySettingsDisabledReason: pendingSettingsValid || !pendingSettingsError ? '' : `Cannot apply ${pendingSettingsLabel}: ${pendingSettingsError}`,
    applyModelDisabled: !loaded || saving || renamePending,
  };
}
