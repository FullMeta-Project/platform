/** Execute a schema-declared storage cleanup through the editor's shared services. */
export async function runStorageCleanup(services, readInputs, execution) {
  const workflow = execution?.workflow;
  if (workflow?.kind !== 'storageCleanup') {
    throw new Error('The action does not declare a storage cleanup workflow.');
  }

  const { document, draft, model, network, operation, preview, result, ui } = services;
  const { preconditions = {}, confirmation, transport, progress, messages = {} } = workflow;
  const inputs = readInputs();
  const render = (message, values = {}) => {
    if (message && typeof message === 'object' && typeof message.copy === 'string') {
      return ui.copy(message.copy, values);
    }
    if (typeof message !== 'string') return '';
    return Object.entries(values).reduce((text, [name, value]) =>
      text.replaceAll(`{${name}}`, String(value)), message);
  };
  const inputValue = (name, values) => typeof name === 'string' ? values?.[name] : undefined;
  const identityOf = (value, transform) => transform === 'basename'
    ? String(value || '').split('/').at(-1)
    : value;

  if (preconditions.selectionLoaded && (!document.isLoaded() || !inputValue(preconditions.input, inputs))) {
    throw new Error(render(messages.missingSelection));
  }
  if (preconditions.idle === 'document' ? operation.busyWithDocument() :
    preconditions.idle === 'operation' && operation.busy()) {
    throw new Error(render(messages.busy));
  }
  if (preconditions.model && !model.exists()) throw new Error(render(messages.missingModel));
  if (preconditions.commitDraft) draft.commit();

  if (confirmation) {
    const folder = inputValue(confirmation.folderInput, inputs);
    const identity = identityOf(inputValue(confirmation.identityInput, inputs), confirmation.identityTransform);
    if (!await result.confirmClear(identity, folder,confirmation.copy)) return;
    const currentInputs = readInputs();
    if (!document.isLoaded() || identityOf(inputValue(confirmation.guardInput, currentInputs),
      confirmation.identityTransform) !== identity || inputValue(confirmation.folderInput,currentInputs)!==folder || operation.busyWithDocument()) {
      throw new Error(render(messages.changed));
    }
  }

  if (!transport || !['actionApi', 'endpoint'].includes(transport.kind)) {
    throw new Error(render(messages.incompleteContract) || 'The action has no storage endpoint.');
  }
  if (transport.storageKind && execution.storageOperation?.kind !== transport.storageKind) {
    throw new Error(render(messages.incompleteContract) || 'The storage operation does not match its declaration.');
  }

  const operationId = operation.createId();
  const folder = inputValue(workflow.path?.folderInput, inputs);
  const directory = workflow.path?.directory ? result.storageDirectory(workflow.path.directory) : '';
  if (workflow.path?.directory && !directory) {
    throw new Error(`The action has no storage directory ${workflow.path.directory}.`);
  }
  const path = directory ? `${folder}/${directory}` : folder;
  const values = { ...inputs, folder, directory, path };
  let operationStarted = false;
  let progressStarted = false;
  let requestSucceeded = false;

  if (workflow.busyIndicator === 'resultCleanup') result.setCleanupBusy(true);
  if (messages.starting) ui.setStatus(render(messages.starting, values));
  try {
    if (progress) {
      operation.start(progress.kind, operationId);
      operationStarted = true;
      operation.beginProgress({
        id: operationId,
        kind: progress.kind,
        label: render(progress.label, values),
        message: render(progress.startMessage, values),
        cancellable: progress.cancellable === true,
      });
      progressStarted = true;
      if (progress.previewStatus) preview.updateStatus('running', render(progress.startMessage, values));
    }

    const endpoint = transport.kind === 'actionApi'
      ? network.actionEndpoint(execution, transport.binding)
      : network.endpoint(transport.name);
    const body = { operationId };
    if (transport.includeOperation) body.operation = execution.operation;
    for(const [name,input]of Object.entries(transport.bodyInputs||{})){
      if(['operation','operationId','__proto__','constructor','prototype'].includes(name)||!Object.hasOwn(execution.inputs,input)||!Object.hasOwn(inputs,input))throw new Error('Cleanup request fields must bind declared action inputs.');
      body[name]=inputs[input];
    }
    const response = await network.requestJson(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    requestSucceeded = true;
    if (progress && operation.stopRequested(progress.kind)) {
      throw new Error(render(messages.stoppedThrow, values));
    }
    const count = workflow.countField?response?.[workflow.countField]:0;
    if(!Number.isSafeInteger(count)||count<0)throw new Error('The cleanup response has an invalid removal count.');
    if (workflow.clearPreview) preview.clear();
    if(workflow.refreshResults){result.invalidateCurrent();await result.reloadActive();}
    const countValues = { ...values, count, plural: count === 1 ? '' : 's' };
    if (progress) {
      if (progress.previewStatus) {
        preview.updateStatus('success', render(count ? messages.progressWithCount : messages.progressEmpty, countValues));
      }
      ui.setStatus(render(messages.complete, countValues), 'good');
    } else {
      ui.setStatus(render(count ? messages.completeWithCount : messages.completeEmpty, countValues), 'good');
    }
  } catch (error) {
    if (!progress) throw error;
    const stopped = operation.stopRequested(progress.kind);
    if (progressStarted && progress.previewStatus) {
      preview.updateStatus(stopped ? 'cancelled' : 'error',
        render(stopped ? messages.stopped : messages.failure, values), error.message);
    }
    if (stopped) ui.setStatus(render(messages.stopped, values));
    else throw error;
  } finally {
    if (operationStarted) operation.finish(progress.kind, operationId);
    if (progressStarted) operation.finishProgress(operationId);
    if (requestSucceeded && progress?.clearOnSuccess) operation.clearProgress(progress.kind);
    if (progress) ui.updateWorkflowPanels();
    if (workflow.busyIndicator === 'resultCleanup') result.setCleanupBusy(false);
  }
}
