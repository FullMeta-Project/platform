/** Run a schema-declared command and load its verified preview artifact. */
export async function runCommandPreview(services, readInputs, execution) {
  const { model: modelService, draft, operation, network, ui, preview } = services;
  const workflow = execution.workflow;
  if (workflow?.kind !== 'commandPreview') throw new Error('The action has no command preview workflow.');

  const { operationKind, runIdSuffix, api, response, copy: copyKeys, inputs: inputKeys, messages } = workflow;
  if (typeof operationKind !== 'string' || !operationKind
    || typeof runIdSuffix !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(runIdSuffix)
    || typeof api?.command !== 'string' || !api.command
    || typeof api?.artifact !== 'string' || !api.artifact
    || !copyKeys || typeof copyKeys !== 'object'
    || !inputKeys || typeof inputKeys !== 'object'
    || !['model', 'folder', 'file', 'storageDirectory', 'previewTarget']
      .every((name) => typeof inputKeys[name] === 'string' && inputKeys[name])
    || !messages || typeof messages !== 'object') {
    throw new Error('The command preview workflow is incomplete.');
  }
  const copy = (name, values) => {
    const key = copyKeys[name];
    if (typeof key !== 'string' || !key) throw new Error(`The command preview workflow has no ${name} message.`);
    return ui.copy(key, values);
  };
  const atPath = (value, path) => Array.isArray(path)
    ? path.reduce((part, key) => part?.[key], value)
    : undefined;
  const message = (name, values = {}) => {
    const template = messages[name];
    if (typeof template !== 'string' || !template) {
      throw new Error(`The command preview workflow has no ${name} message.`);
    }
    return Object.entries(values).reduce((text, [key, value]) =>
      text.replaceAll(`{${key}}`, String(value)), template);
  };

  if (operation.busy()) throw new Error(message('busy'));
  if (!modelService.exists()) throw new Error(message('noDocument'));
  draft.commit();
  const values = readInputs();
  const model = values[inputKeys.model];
  const folder = values[inputKeys.folder];
  const file = values[inputKeys.file];
  const storageDirectory = values[inputKeys.storageDirectory];
  const previewTarget = values[inputKeys.previewTarget];
  const { command, output } = execution;
  if (!command?.registryId || !command?.entry || command.stdin !== execution.inputs?.[inputKeys.model]
    || !Array.isArray(command.args) || !Array.isArray(command.expectedOutputs)
    || !output?.previewArtifact || !storageDirectory) {
    throw new Error(message('incompleteContract'));
  }
  if (!response || !Array.isArray(response.report) || !Array.isArray(response.geometryName)
    || typeof response.reportRequiredInteger !== 'string'
    || !Array.isArray(response.runId)) {
    throw new Error('The command preview workflow has an incomplete response contract.');
  }

  const operationId = operation.createId();
  const runId = new Date().toISOString().replace(/[.:]/g, '-')
    + '-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12) + '-' + runIdSuffix;
  const modelFile = [folder === '.' ? '' : folder, file].filter(Boolean).join('/');
  const cwd = [folder === '.' ? '' : folder, storageDirectory, runId].filter(Boolean).join('/');
  const commandInputs = { ...values, runId, modelFile, operationId };
  const args = command.args.map((argument) => {
    if (typeof argument?.value === 'string') return argument.value;
    if (typeof argument?.input === 'string' && typeof commandInputs[argument.input] === 'string') {
      return commandInputs[argument.input];
    }
    throw new Error(message('unresolvedArgument'));
  });
  if (!command.expectedOutputs.some((expected) =>
    (typeof expected === 'string' ? expected : expected?.path) === output.previewArtifact)) {
    throw new Error(message('missingExpectedOutput'));
  }

  operation.start(operationKind, operationId);
  operation.beginProgress({ id: operationId, kind: operationKind,
    label: copy('progressLabel'), message: copy('preparing'), cancellable: true });
  preview.updateStatus('running', copy('preparing'));
  ui.setStatus(copy('validation'));
  try {
    preview.updateStatus('running', copy('running'), cwd);
    ui.setStatus(copy('runningStatus'));
    const commandResult = await network.requestJson(network.endpoint(api.command), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        registryId: command.registryId,
        entry: command.entry,
        args,
        cwd,
        createCwd: true,
        stdin: JSON.stringify(model),
        expectedOutputs: command.expectedOutputs,
        operationId,
      }),
    });
    if (operation.stopRequested(operationKind)) throw new Error(copy('stopped'));
    if (!commandResult.success) {
      const detail = commandResult.error || commandResult.stderr?.trim() || commandResult.stdout?.trim();
      throw new Error(detail || message('commandFailed', { exitCode: commandResult.exitCode ?? 'unknown' }));
    }
    const result = JSON.parse(commandResult.stdout);
    const geometryName = atPath(result, response.geometryName);
    const report = atPath(result, response.report);
    if (typeof geometryName !== 'string' || !report
      || !Number.isSafeInteger(report[response.reportRequiredInteger])) {
      throw new Error(message('incompleteResponse'));
    }
    const verifiedOutput = commandResult.outputs?.find((item) => item.path === output.previewArtifact);
    if (!verifiedOutput) throw new Error(message('unverifiedArtifact'));
    preview.setGeometry(geometryName);
    if (operation.stopRequested(operationKind)) throw new Error(copy('stopped'));
    const artifactUrl = new URL(network.endpoint(api.artifact), location.origin);
    artifactUrl.searchParams.set('path', `${cwd}/${output.previewArtifact}`);
    const artifactResponse = await fetch(artifactUrl, { cache: 'no-store' });
    if (!artifactResponse.ok) throw new Error(copy('artifactFailed'));
    if (operation.stopRequested(operationKind)) throw new Error(copy('stopped'));
    preview.updateStatus('running', copy('previewPreparing'), cwd);
    const previewData = await preview.parse(await artifactResponse.text());
    if (operation.stopRequested(operationKind)) throw new Error(copy('stopped'));
    preview.show(previewData, previewTarget, model);
    const detail = preview.reportSummary(report);
    const generatedMessage = copy('generated');
    preview.updateStatus('success', generatedMessage, detail, preview.reportTooltip(report));
    ui.setStatus(copy('complete', {
      message: generatedMessage, file: output.previewArtifact.split('/').at(-1), detail,
      run: atPath(result, response.runId) || runId,
    }), 'good');
  } catch (error) {
    const stopped = operation.stopRequested(operationKind);
    preview.updateStatus(stopped ? 'cancelled' : 'error',
      copy(stopped ? 'stopped' : 'failed'), error.message);
    if (stopped) ui.setStatus(copy('stopped'));
    else throw error;
  } finally {
    operation.finish(operationKind, operationId);
    operation.finishProgress(operationId);
    ui.updateWorkflowPanels();
  }
}
