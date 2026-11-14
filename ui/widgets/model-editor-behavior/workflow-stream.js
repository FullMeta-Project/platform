/** Run a schema-declared, newline-delimited JSON operation against the active document. */
export async function runStreamAction(services, readInputs, execution) {
  const workflow = execution?.workflow || {};
  if (workflow.kind !== 'streamRun') throw new Error('The action does not declare a stream workflow.');

  const { model, document, draft, validation, operation, network, ui, preview, result } = services;
  const kind = workflow.operationKind;
  const role = workflow.selectionRole;
  const depth = workflow.selectionDepth;
  const indexPosition = workflow.selectionIndex;
  const apiRole = workflow.apiRole;
  const copyKeys = workflow.copy || {};
  const messages = workflow.messages || {};
  const eventTypes = workflow.eventTypes || {};
  const eventFields = workflow.eventFields || {};
  const resultCopyFields = workflow.resultCopyFields || {};
  const requestHeaders = workflow.requestHeaders || {};
  const inputNames = workflow.inputs || {};
  const required = [kind, role, apiRole, copyKeys.label, copyKeys.starting, copyKeys.running,
    copyKeys.preparing, copyKeys.stopped, copyKeys.complete, copyKeys.completeFallback, copyKeys.failed,
    copyKeys.previewReady, copyKeys.resultStatus];
  if (required.some((value) => typeof value !== 'string' || !value)) {
    throw new Error('The stream workflow is missing an operation, role, API role, or message key.');
  }
  for (const key of ['model', 'folder', 'file', 'selection']) {
    if (typeof inputNames[key] !== 'string' || !inputNames[key]) throw new Error(`The stream workflow is missing its ${key} input.`);
  }
  if (!Number.isInteger(depth) || depth < 1 || !Number.isInteger(indexPosition) || indexPosition < 0 || indexPosition >= depth) {
    throw new Error('The stream workflow has an invalid selection path.');
  }
  for (const key of ['preview', 'cancelled', 'complete', 'error']) {
    if (typeof eventTypes[key] !== 'string' || !eventTypes[key]) throw new Error(`The stream workflow is missing its ${key} event type.`);
  }
  for (const key of ['previewPayload', 'artifactRoot', 'totalPoints', 'completedPoints']) {
    if (typeof eventFields[key] !== 'string' || !eventFields[key]) throw new Error(`The stream workflow is missing its ${key} event field.`);
  }
  if (!Object.keys(resultCopyFields).length || Object.values(resultCopyFields).some((value) => typeof value !== 'string' || !value)) {
    throw new Error('The stream workflow is missing its result copy fields.');
  }
  const copy = (key, values) => ui.copy(copyKeys[key], values);
  const message = (key, fallback, values = {}) => {
    const template = messages[key] || fallback;
    return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
  };
  const field = (event, key) => event?.[eventFields[key]];
  const input = (values, key) => values?.[inputNames[key]];
  const initial = readInputs();
  if (!document.isFilename(input(initial, 'file'))) throw new Error(message('openDocument', 'Open a JSON document before running this action.'));
  if (!network.compatible()) throw new Error(message('serverMismatch', 'The editor has not confirmed that the local server matches this version. Restart the server, then refresh this page.'));
  const initialSelection = input(initial, 'selection');
  const itemIndex = model.selectionHasRole(role, initialSelection) && initialSelection.length === depth
    ? Number(initialSelection[indexPosition]) : 0;
  if (!model.valueAtRole(role)?.[itemIndex]) throw new Error(message('missingSelection', 'Select an action before running it.'));
  if (operation.busy()) throw new Error(message('busy', 'Wait for the current operation to finish.'));
  if (document.saving()) throw new Error(message('saving', 'A document save is already in progress. Wait for it to finish.'));

  draft.commit();
  const committed = readInputs();
  if (draft.settingsDirty()) throw new Error(message('settingsDirty', 'The current settings have not been applied.'));
  if (draft.jsonDirty()) throw new Error(message('jsonDirty', 'The JSON editor has unapplied changes.'));
  const structureErrors = validation.structure(input(committed, 'model'));
  validation.setRepairErrors(structureErrors);
  if (structureErrors.length) {
    validation.invalidate();
    validation.renderRepairMode();
    throw new Error(message('structureInvalid', 'JSON document structure is invalid: {error}', { error: structureErrors[0] }));
  }
  const validationErrors = validation.model(input(committed, 'model'));
  validation.record(validationErrors);
  if (validationErrors.length) throw new Error(message('modelInvalid', 'JSON document is invalid: {error}', { error: validationErrors[0] }));

  const needsSave = document.snapshot() === null || document.hasUnsavedChanges();
  let savedModel;
  if (needsSave) {
    ui.setStatus(message('beforeSave', 'JSON document structure checked. Saving before execution…'));
    savedModel = await document.save();
  } else {
    savedModel = JSON.parse(document.snapshot());
    ui.setStatus(message('beforeRequest', 'JSON document structure checked. Starting execution…'), 'good');
  }
  if (document.hasUnsavedChanges()) throw new Error(message('changedWhileSaving', 'The document changed while its JSON was being saved. Save the latest edits and try again.'));
  const item = model.valueAtRole(role, savedModel)?.[itemIndex];
  if (!item) throw new Error(message('missingSavedSelection', 'The selected action is not present in the saved document.'));
  const totalPoints = workflow.pointCountWorkflow ? ui.workflow(workflow.pointCountWorkflow, item) : 1;
  const itemName = item[workflow.nameProperty || 'name'] || copy('label');
  const operationId = operation.createId();
  operation.start(kind, operationId);
  let lastEvent = {};
  if (workflow.invalidateResultOnStart) result.invalidateCurrent();
  const startingMessage = copy('starting', { name: itemName });
  operation.beginProgress({ id: operationId, kind, label: itemName, message: startingMessage,
    total: totalPoints, completed: 0, progress: 0, cancellable: true });
  const updateRunbar = (event) => {
    lastEvent = { ...lastEvent, ...event };
    const total = Number(field(lastEvent, 'totalPoints'));
    const completed = Number(field(lastEvent, 'completedPoints')) || 0;
    operation.updateProgress(operationId, {
      state: lastEvent.state || 'running',
      message: lastEvent.message || copy('preparing'),
      completed,
      total,
      progress: Number.isFinite(total) && total > 0 && completed > 0 ? completed / total * 100 : null,
    });
    ui.updateBuildButtons();
  };
  updateRunbar({
    state: 'running', message: startingMessage,
    [eventFields.totalPoints]: totalPoints,
    [eventFields.completedPoints]: 0,
  });
  ui.setResultSaveBusy(true);
  ui.setStatus(copy('running', { name: itemName }));

  let cancelled = false;
  let completed = false;
  try {
    const headers = { 'content-type': 'application/json' };
    const headerValues = {
      operationId,
      itemId: item[workflow.idProperty || 'id'],
      folder: encodeURIComponent(input(committed, 'folder')),
      file: encodeURIComponent(input(committed, 'file')),
    };
    for (const [key, name] of Object.entries(requestHeaders)) {
      if (typeof name === 'string' && name && key in headerValues) headers[name] = headerValues[key];
    }
    const response = await fetch(network.actionEndpoint(execution, apiRole), {
      method: 'POST', headers, body: JSON.stringify(savedModel),
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || message('requestFailed', 'The request failed ({status}).', { status: response.status }));
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    const handle = (event) => {
      if (event.type === eventTypes.preview) {
        const report = field(event, 'previewPayload');
        operation.updateProgress(operationId, {
          detail: copy('previewReady', { summary: preview.reportSummary(report) }),
          detailTitle: preview.reportTooltip(report),
        });
        return;
      }
      if (event.type === eventTypes.cancelled) {
        cancelled = true;
        updateRunbar(event);
        ui.setStatus(event.message || copy('stopped'));
        return;
      }
      updateRunbar(event);
      if (event.type === eventTypes.complete) {
        completed = true;
        ui.setResultSaveBusy(true);
        const root = field(event, 'artifactRoot');
        const prefix = root ? `${root}/` : '';
        const values = { message: event.message || copy('completeFallback') };
        for (const [name, eventKey] of Object.entries(resultCopyFields)) {
          values[name] = `${prefix}${event[eventKey] || ''}`;
        }
        ui.setStatus(copy('resultStatus', values), 'good');
      } else if (event.type === eventTypes.error) {
        ui.setStatus(event.message || copy('failed'), 'error');
      }
    };
    const handleLine = (line) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      handle(event);
      if (event.type === eventTypes.error) throw new Error(event.message || message('eventError', 'The action failed.'));
    };
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() || '';
      for (const line of lines) handleLine(line);
      if (done) break;
    }
    if (pending.trim()) handleLine(pending);
    if (cancelled) return;
    if (!completed) throw new Error(message('noCompletion', 'The server ended the operation without a completion message.'));
    if (workflow.reloadResultAfterComplete) await result.reloadActive();
  } catch (error) {
    if (operation.stopRequested(kind)) {
      updateRunbar({ state: 'cancelled', message: copy('stopped') });
      ui.setStatus(copy('stopped'));
    } else {
      updateRunbar({ state: 'error', message: error.message });
      ui.setStatus(error.message, 'error');
      if (workflow.reloadResultAfterError) await result.reloadActive();
    }
  } finally {
    await operation.finishCancelable(operationId);
    operation.finish(kind, operationId);
    const finalState = cancelled ? 'cancelled' : completed ? 'success' : 'error';
    const finalMessage = completed
      ? lastEvent.message || copy('complete', { name: itemName })
      : cancelled ? copy('stopped') : lastEvent.message || copy('failed');
    operation.finishProgress(operationId, {
      state: finalState, message: finalMessage, progress: completed ? 100 : undefined, stopRequested: false,
    });
    ui.setResultSaveBusy(false);
    ui.updateWorkflowPanels();
    ui.updateActionAvailability();
  }
}
