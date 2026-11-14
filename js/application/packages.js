import { applicationProjectStorage } from "../project-storage.js";
import { normalizeNativeApiContract, nativeOperationActionContract } from '../runtime/native-operations.js';

import { schemaWidget } from "../../ui/widgets/shared/schema-widget.js";
import { graphicsConsoleIssues } from "../../ui/widgets/graphics-console/widget.js";
import { modelEditorUiIssues } from "../../ui/widgets/model-editor-behavior/widget.js";
import { isSchemaDocument } from "../schema-document.js";
import { loadSchemaDocuments, loadWorkspaceJson } from "../schema-document-loader.js";
import { loadWidgetCatalogs, sharedWidgetCatalog, loadReactWidgetProviders } from "../../ui/widgets/shared/catalog.js";
import { applicationModuleUrl, loadApplicationCatalog } from "../application-catalog.js";

const applicationIdPattern = /^[a-z][a-z0-9-]{0,47}$/;

function applicationImportUrl(path, retryKey) {
  const url = applicationModuleUrl(path);
  if (typeof retryKey === "string" && retryKey) url.searchParams.set("__fullmeta_retry", retryKey);
  return url.href;
}

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isName = value => typeof value === 'string' && Boolean(value.trim());

function conflictingEditorApiRoutes(editorApi, contracts) {
  const routes = Object.values(editorApi);
  return routes.some((route, index) => routes.indexOf(route) !== index && (
    route !== '/api/kernel/command/run'
    || Object.entries(contracts).filter(([name]) => editorApi[name] === route).some(([, contract]) =>
      !isRecord(contract) || contract.method !== 'POST'
      || !isName(contract.externalProgram?.registryId)
      || contract.externalProgram?.protocol !== 'json-stdio'
      || (!contract.operationContract && contract.handler !== 'kernel.command.run'))
  ));
}

function validWorkflowInputs(workflowInputs, executionInputs, requiredNames) {
  return isRecord(workflowInputs)
    && requiredNames.every(name => isName(workflowInputs[name]))
    && Object.values(workflowInputs).every(name => isName(name) && Object.hasOwn(executionInputs, name));
}

function validActionWorkflow(execution, editorApi, editorApiContracts, previewOperationKind) {
  const workflow = execution.workflow;
  if (!isRecord(workflow)) return false;
  switch (workflow.kind) {
    case 'documentValidation':
      return execution.command !== undefined || execution.api !== undefined;
    case 'nativeOperation': {
      try { const resolved = nativeOperationActionContract({ execution }, editorApiContracts); return Boolean(resolved && Object.hasOwn(editorApi, resolved.apiName)); }
      catch { return false; }
    }
    case 'commandPreview': {
      const artifact = execution.output?.previewArtifact;
      return execution.command !== undefined
        && isName(workflow.operationKind)
        && (!previewOperationKind || workflow.operationKind === previewOperationKind)
        && validWorkflowInputs(workflow.inputs, execution.inputs, ['model', 'folder', 'file', 'storageDirectory', 'previewTarget'])
        && isRecord(workflow.api) && isName(workflow.api.command) && isName(workflow.api.artifact)
        && isName(artifact)
        && Array.isArray(execution.command.expectedOutputs)
        && execution.command.expectedOutputs.some(output => output?.path === artifact);
    }
    case 'storageCleanup': {
      const transport = workflow.transport;
      if (!isRecord(transport)) return false;
      if (transport.kind === 'endpoint') {
        if (!isName(transport.name) || !execution.storageOperation || transport.storageKind !== execution.storageOperation.kind) return false;
      } else if (transport.kind === 'actionApi') {
        if (!isName(transport.binding) || !isName(execution.api?.[transport.binding])
          || !Object.hasOwn(editorApi, execution.api[transport.binding])) return false;
      } else return false;
      if(transport.bodyInputs!==undefined&&(!isRecord(transport.bodyInputs)||!Object.values(transport.bodyInputs).every(name=>isName(name)&&Object.hasOwn(execution.inputs,name))||Object.keys(transport.bodyInputs).some(name=>['operation','operationId','__proto__','constructor','prototype'].includes(name))))return false;
      return (!workflow.progress || (isName(workflow.progress.kind)
          && (!previewOperationKind || (!workflow.clearPreview && !workflow.progress.previewStatus)
            || workflow.progress.kind === previewOperationKind)))
        && (!workflow.preconditions?.input || Object.hasOwn(execution.inputs, workflow.preconditions.input))
        && (!workflow.confirmation?.folderInput || Object.hasOwn(execution.inputs, workflow.confirmation.folderInput))
        && (!workflow.path?.folderInput || Object.hasOwn(execution.inputs, workflow.path.folderInput));
    }
    case 'streamRun': {
      const apiName = execution.api?.[workflow.apiRole];
      return isName(workflow.operationKind)
        && isName(workflow.apiRole) && isName(apiName) && Object.hasOwn(editorApi, apiName)
        && editorApiContracts[apiName]?.output?.contentType === 'application/x-ndjson'
        && validWorkflowInputs(workflow.inputs, execution.inputs, ['model', 'folder', 'file', 'selection'])
        && isName(workflow.selectionRole)
        && Number.isInteger(workflow.selectionDepth) && workflow.selectionDepth > 0
        && Number.isInteger(workflow.selectionIndex) && workflow.selectionIndex >= 0
        && workflow.selectionIndex < workflow.selectionDepth;
    }
    default:
      return false;
  }
}

function validStorageOperation(operation, storage) {
  return operation?.kind === 'removeMatchingDirectories'
    && typeof operation.storage === 'string' && typeof storage?.[operation.storage] === 'string'
    && typeof operation.manifest === 'string' && /^[A-Za-z0-9._-]+$/.test(operation.manifest)
    && operation.match && typeof operation.match === 'object' && !Array.isArray(operation.match)
    && Object.values(operation.match).every(value => value === null || ['string', 'number', 'boolean'].includes(typeof value));
}

function validActionExecution(execution, editorApi, editorApiContracts, externalPrograms, storage, previewOperationKind) {
  if (!execution || typeof execution.operation !== 'string' || !execution.operation) return false;
  if (!execution.inputs || typeof execution.inputs !== 'object' || Array.isArray(execution.inputs)) return false;
  if (Object.values(execution.inputs).some(source => typeof source !== 'string' || !source)) return false;
  const hasApi = execution.api !== undefined;
  if (hasApi) {
    if (!execution.api || typeof execution.api !== 'object' || Array.isArray(execution.api)) return false;
    if (!Object.values(execution.api).every(name => typeof name === 'string' && Object.hasOwn(editorApi, name))) return false;
  }
  const hasCommand = execution.command !== undefined;
  if (execution.command !== undefined) {
    const { registryId, entry } = execution.command || {};
    if (typeof registryId !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(registryId)
      || typeof entry !== 'string' || !entry.trim()
      || !externalPrograms?.[registryId]?.allowedEntries?.includes(entry)) return false;
  }
  const hasStorageOperation = execution.storageOperation !== undefined;
  if (hasStorageOperation && !validStorageOperation(execution.storageOperation, storage)) return false;
  return (hasApi || hasCommand || hasStorageOperation)
    && validActionWorkflow(execution, editorApi, editorApiContracts, previewOperationKind);
}

function schemaWidgetNames(documents) {
  const names = new Set();
  const visited = new Set();
  const visit = (value) => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (!Array.isArray(value)) {
      const widget = schemaWidget(value);
      if (typeof widget === "string" && widget) names.add(widget);
    }
    for (const child of Array.isArray(value) ? value : Object.values(value)) visit(child);
  };
  for (const document of documents || []) visit(document);
  return names;
}

/** Load an application package by the discriminator stored in its model JSON. */
async function withReactProviders(value){
  const packageValue=await value;
  packageValue.widgetCatalog ||= await loadWidgetCatalogs({schema:packageValue.modelSchema,schemaUrl:new URL(packageValue.schemaPath,new URL('../../..',import.meta.url)),loadJson:loadWorkspaceJson});
  packageValue.reactWidgetProviders=await loadReactWidgetProviders(packageValue.widgetCatalog);
  const interpretingSchemas=(packageValue.schemaDocuments||[]).map(entry=>entry.document||entry.schema||entry);
  const bytes=new TextEncoder().encode(JSON.stringify([packageValue.modelSchema,interpretingSchemas]));
  packageValue.interpretingSchemaRevision=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  return packageValue;
}
export async function loadApplicationPackage(applicationId, options = {}) {
  if (isSchemaDocument(options.model)) {
    const { createSchemaDocumentPackage } = await import("../../ui/widgets/model-editor/widget.js");
    return withReactProviders(createSchemaDocumentPackage(options));
  }
  if (typeof applicationId !== "string" || !applicationIdPattern.test(applicationId)) {
    throw new Error(`Invalid or missing application identifier ${JSON.stringify(applicationId)}.`);
  }
  const catalog = await loadApplicationCatalog();
  const registration = catalog.applications.find(application => application.id === applicationId);
  if (!registration) throw new Error(`Application "${applicationId}" has no valid applications/${applicationId}/catalog.json descriptor.`);
  if (options.model && options.modelLocation) {
    const reference = options.model["x-fullmeta-schema"];
    if (typeof reference !== "string" || !reference || reference.includes("\\")
      || /[:?#]/.test(reference) || reference.startsWith("/") || !reference.endsWith(".json")) {
      throw new Error("The model must specify x-fullmeta-schema as a relative JSON schema path.");
    }
    const workspaceUrl = new URL("../../..", import.meta.url);
    const sources = await loadSchemaDocuments(new URL(reference, options.modelLocation), workspaceUrl);
    const selectedSchema = sources[0]?.document;
    if (selectedSchema?.properties?.application?.const !== applicationId) {
      throw new Error(`The selected schema does not declare application "${applicationId}".`);
    }
    const hasRegisteredRuntime = registration.runtimePackage === true
      && selectedSchema?.["x-fullmeta-runtime"]?.schema === "fullmeta-model-runtime/1";
    if (!hasRegisteredRuntime) {
      const { createSchemaProjectPackage } = await import("../../ui/widgets/model-editor/widget.js");
      return withReactProviders(createSchemaProjectPackage(options));
    }
  }
  if (!registration.schemaLoader || !registration.package) {
    throw new Error(`Application "${applicationId}" is a schema draft. Add its package and schema loader before opening project models.`);
  }
  const { __fullmetaModuleRetryKey: retryKey, ...packageOptions } = options;
  const schemaLoader = await import(applicationImportUrl(registration.schemaLoader, retryKey));
  if (options.model && options.modelLocation) {
    if (typeof schemaLoader.activateModelSchema === "function") {
      await schemaLoader.activateModelSchema(options.model, options.modelLocation);
    } else if (typeof schemaLoader.loadModelSchema === "function") {
      const reference = options.model["x-fullmeta-schema"];
      await schemaLoader.loadModelSchema(new URL(reference, options.modelLocation), applicationId);
    } else throw new Error(`Registered schema loader for "${applicationId}" cannot activate a model schema.`);
  }
  else if (options.schemaUrl) {
    if (typeof schemaLoader.loadModelSchema !== "function") {
      throw new Error(`Registered schema loader for "${applicationId}" cannot load a model schema.`);
    }
    await schemaLoader.loadModelSchema(options.schemaUrl, applicationId);
  }
  else throw new Error('Select a model schema before creating a model.');
  let packageModule;
  try {
    packageModule = await import(applicationImportUrl(registration.package, retryKey));
  } catch (error) {
    throw new Error(`Could not load application package "${applicationId}": ${error.message}`);
  }
  const applicationPackage = await packageModule.createApplicationPackage?.(packageOptions);
  if (!applicationPackage || applicationPackage.id !== applicationId) {
    throw new Error(`Application package "${applicationId}" has an invalid package contract.`);
  }
  applicationPackage.applicationRegistration = registration;
  applicationPackage.widgetCatalog = await loadWidgetCatalogs({
    schema: applicationPackage.modelSchema,
    schemaUrl: new URL(applicationPackage.schemaPath, new URL("../../..", import.meta.url)),
    loadJson: loadWorkspaceJson,
  });
  await withReactProviders(applicationPackage);
  for (const key of ["manifest", "modelSchema", "schemaDocuments", "uiProfileSchema", "modelEditorSchema", "modelEditorUi", "graphicsWidgets", "graphicsConsole", "createWidgetRenderers", "actionBindings", "treeActionPlans", "resolveResourceUrl", "prepareModelForEditor"]) {
    if (!Object.hasOwn(applicationPackage, key)) throw new Error(`Application package "${applicationId}" is missing ${key}.`);
  }
  if (applicationPackage.kind === "schemaProject") {
    if (applicationPackage.manifest?.id !== applicationId) {
      throw new Error(`Schema project package "${applicationId}" manifest id does not match its model discriminator.`);
    }
    if (applicationPackage.modelSchema?.properties?.application?.const !== applicationId) {
      throw new Error(`Schema project package "${applicationId}" model schema does not declare the same application discriminator.`);
    }
    return applicationPackage;
  }
  applicationPackage.scenarioMetadata ||= {};
  applicationPackage.engineCapabilities ||= {};
  applicationPackage.editorFactories ||= {};
  if (typeof applicationPackage.treeActionPlans !== "function") {
    throw new Error(`Application package "${applicationId}" has no tree action plan factory.`);
  }
  if (applicationPackage.manifest?.id !== applicationId) throw new Error(`Application package "${applicationId}" manifest id does not match its model discriminator.`);
  if (applicationPackage.modelSchema?.properties?.application?.const !== applicationId) {
    throw new Error(`Application package "${applicationId}" model schema does not declare the same application discriminator.`);
  }
  if (applicationPackage.modelSchema["x-fullmeta-runtime"]?.schema !== "fullmeta-model-runtime/1") {
    throw new Error(`Application package "${applicationId}" model schema has no runtime declaration.`);
  }
  applicationPackage.projectStorage = applicationProjectStorage(applicationPackage.modelSchema["x-fullmeta-runtime"]?.storage);
  const editorApiContracts = Object.fromEntries(Object.entries(applicationPackage.modelSchema["x-fullmeta-runtime"]?.editorApi || {}).map(([name, contract]) => [name, normalizeNativeApiContract(contract)]));
  const externalPrograms = applicationPackage.modelSchema["x-fullmeta-runtime"]?.externalPrograms || {};
  const editorApi = Object.fromEntries(Object.entries(editorApiContracts).map(([name, contract]) =>
    [name, typeof contract === 'string' ? contract : contract?.route]));
  if (Object.entries(editorApiContracts).some(([name, contract]) => {
    const route = editorApi[name];
    return typeof route !== 'string' || !/^\/api\/[A-Za-z0-9/_-]+$/.test(route)
      || (typeof contract !== 'string' && (!(Array.isArray(contract?.method) ? contract.method.length > 1 && contract.method.every(method => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(contract?.method))
        || typeof contract?.handler !== 'string' || !contract.handler
        || (contract?.schemaOperation !== undefined && (typeof contract.schemaOperation !== 'string' || !contract.schemaOperation))));
  }) || conflictingEditorApiRoutes(editorApi, editorApiContracts)) {
    throw new Error(`Application package "${applicationId}" has invalid model editor API routes.`);
  }
  applicationPackage.editorApi = editorApi;
  applicationPackage.editorApiContracts = editorApiContracts;
  if (applicationPackage.modelEditorUi?.newModel?.api && !Object.hasOwn(editorApi, applicationPackage.modelEditorUi.newModel.api)) {
    throw new Error(`Application package "${applicationId}" has no registered New-model API.`);
  }
  const declaredGraphicsWidgets = applicationPackage.manifest?.graphicsWidgets;
  if (!Array.isArray(declaredGraphicsWidgets) || declaredGraphicsWidgets.some((id) => typeof id !== "string" || !applicationPackage.graphicsWidgets[id])) {
    throw new Error(`Application package "${applicationId}" has invalid graphics widget declarations.`);
  }
  const graphicsIssues = graphicsConsoleIssues(applicationPackage.graphicsConsole, Object.fromEntries(declaredGraphicsWidgets.map(id => [id, applicationPackage.graphicsWidgets[id]])));
  if (graphicsIssues.length) throw new Error(`Application graphics console: ${graphicsIssues[0]}`);
  if (applicationPackage.resultPresentation !== undefined
    && (!applicationPackage.resultPresentation
      || typeof applicationPackage.resultPresentation !== 'object'
      || Array.isArray(applicationPackage.resultPresentation)
      || Object.values(applicationPackage.resultPresentation).some(method => typeof method !== 'function'))) {
    throw new Error(`Application package "${applicationId}" result presentation must be a table of functions.`);
  }
  if (Object.values(applicationPackage.graphicsConsole.scenes || {}).some(scene => scene?.onSelect)
    && typeof applicationPackage.selectionActions !== 'function') {
    throw new Error(`Application package "${applicationId}" has no Graphics selection actions.`);
  }
  const editorUiIssues = modelEditorUiIssues(applicationPackage.modelEditorUi);
  if (editorUiIssues.length) throw new Error(`Application model editor UI: ${editorUiIssues[0]}`);
  const defaultGraphicsWidget = applicationPackage.graphicsWidgets[applicationPackage.manifest?.defaultGraphicsWidget];
  if (!defaultGraphicsWidget) {
    throw new Error(`Application package "${applicationId}" has no registered default Graphics widget.`);
  }
  for (const id of declaredGraphicsWidgets) {
    const widget = applicationPackage.graphicsWidgets[id];
    if (widget.id !== id || !["geometry", "scene", "series", "scalarSurface", "table"].includes(widget.kind)) {
      throw new Error(`Application package "${applicationId}" graphics widget ${id} has an invalid descriptor.`);
    }
    if (widget.sceneRenderer && (widget.kind !== "geometry" || widget.sceneRenderer.kind !== "scene" || typeof widget.sceneRenderer.render !== "function")) {
      throw new Error(`Application package "${applicationId}" graphics widget ${id} has an invalid scene renderer.`);
    }
    if (widget.kind !== "geometry" && (typeof widget.render !== "function" || !Array.isArray(widget.dimensions))) {
      throw new Error(`Application package "${applicationId}" plot widget ${id} has no reusable renderer contract.`);
    }
  }
  if (!Array.isArray(applicationPackage.actionBindings) || applicationPackage.actionBindings.some((entry) => {
    const nativeDocumentValidation = entry?.id === "document.validate" && entry?.selector === "#validate" && entry?.execution == null;
    return typeof entry?.id !== "string" || typeof entry?.selector !== "string"
    || (!nativeDocumentValidation && !validActionExecution(entry.execution, editorApi, editorApiContracts, externalPrograms,
      applicationPackage.modelSchema["x-fullmeta-runtime"]?.storage, applicationPackage.previewOperationKind))
    || (entry.placement && entry.placement !== "selection")
    || (entry.placement === "selection" && !/^#[A-Za-z][A-Za-z0-9_-]*$/.test(entry.selector))
    || (entry.tone && !["primary", "danger"].includes(entry.tone));
  })) {
    throw new Error(`Application package "${applicationId}" has invalid action bindings.`);
  }
  const widgetRenderers = applicationPackage.createWidgetRenderers({
    getModel: () => null,
    getSettingsDraft: () => null,
    escapeHtml: (value) => String(value ?? ""),
    formatChoiceLabel: () => "",
  });
  if (!widgetRenderers || typeof widgetRenderers !== "object" || Array.isArray(widgetRenderers)) {
    throw new Error(`Application package "${applicationId}" has invalid settings widget registrations.`);
  }
  const sharedWidgets = new Set([...sharedWidgetCatalog.widgets.filter(widget=>widget.field).map(widget=>widget.id),'group']);
  for (const widget of schemaWidgetNames(applicationPackage.schemaDocuments)) {
    if (!sharedWidgets.has(widget) && !applicationPackage.reactWidgetProviders[widget] && typeof widgetRenderers[widget] !== "function") {
      throw new Error(`Application package "${applicationId}" declares settings widget "${widget}" but does not register its renderer.`);
    }
  }
  return applicationPackage;
}
