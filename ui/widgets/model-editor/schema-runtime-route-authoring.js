/** Typed, application-neutral authoring for x-fullmeta-runtime.editorApi routes. */
import { normalizeNativeApiContract, resolveNativeOperation } from '../../../js/services.js';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const stable = value => Array.isArray(value) ? value.map(stable)
  : object(value) ? Object.fromEntries(Object.keys(value).filter(key => value[key] !== undefined)
    .sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));






const text = value => typeof value === 'string' ? value : '';
const listText = value => Array.isArray(value) ? value.join(', ') : text(value);
const list = (value, label) => {
  const items = value.split(',').map(part => part.trim()).filter(Boolean);
  if (new Set(items).size !== items.length) throw new Error(`${label} contains a repeated value.`);
  return items;
};
const routeKey = value => /^[A-Za-z][A-Za-z0-9_.-]*$/.test(value);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
const routePath = name => ['x-fullmeta-runtime', 'editorApi', name];

function draftOf(name, contract) {
  const detailed = object(contract) || contract === undefined, route = object(contract) ? contract : {};
  const external = object(route.externalProgram) ? route.externalProgram : {};
  const completion = object(route.completionValidation) ? route.completionValidation : {};
  let effective = route;
  if (route.operationContract) { try { effective = normalizeNativeApiContract(route); } catch { /* Keep malformed existing source editable for repair. */ } }
  const effectiveExternal = effective.externalProgram || external;
  return {
    name, shape: detailed ? 'detailed' : 'route-only',
    route: detailed ? text(route.route) : text(contract), method: listText(effective.method), handler: text(effective.handler),
    operationContractId: text(route.operationContract?.id), operationContractVersion: route.operationContract?.version === undefined ? '' : String(route.operationContract.version),
    inputContentType: text(effective.input?.contentType), outputContentType: text(effective.output?.contentType),
    inputFields: Array.isArray(route.input?.fields) ? clone(route.input.fields) : [],
    outputFields: Array.isArray(route.output?.fields) ? clone(route.output.fields) : [],
    schemaOperation: text(route.schemaOperation),
    recordProjection: object(route.recordProjection) ? Object.entries(route.recordProjection) : [],
    sortBy: text(route.sortBy), sortDescending: route.sortDescending === true ? 'true'
      : route.sortDescending === false ? 'false' : '',
    externalRegistryId: text(external.registryId), externalProtocol: text(effectiveExternal.protocol),
    externalEntry: text(effectiveExternal.entry), externalEntries: listText(external.entries),
    cancellationEntry: text(external.cancellation?.entry),
    cancellationRunIdPointer: text(external.cancellation?.runIdPointer),
    requestEnvironment: Array.isArray(external.requestEnvironment) ? clone(external.requestEnvironment) : [],
    completionEventType: text(completion.eventType),
    completionOutputFilesPointer: text(completion.outputFilesPointer),
    completionMinimumBytes: Number.isInteger(completion.minimumBytes) ? String(completion.minimumBytes) : '',
  };
}

function normalizedPairs(rows, label) {
  if (!Array.isArray(rows)) throw new Error(`${label} must be a field table.`);
  return rows.map(([key, caption], index) => {
    if (!key?.trim() || !caption?.trim()) throw new Error(`${label} row ${index + 1} needs a key and a readable label.`);
    return [key.trim(), caption.trim()];
  });
}
function normalizedProjection(rows) {
  if (!Array.isArray(rows)) throw new Error('Record projection must be a table.');
  const entries = rows.map(([key, path], index) => {
    if (!key?.trim() || !path?.trim()) throw new Error(`Record projection row ${index + 1} needs a key and path.`);
    return [key.trim(), path.trim()];
  });
  if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error('Record projection keys must be unique.');
  return Object.fromEntries(entries);
}
function normalizedEnvironment(rows) {
  if (!Array.isArray(rows)) throw new Error('Request environment must be a table.');
  return rows.map((entry, index) => {
    const name = text(entry.name).trim(), source = text(entry.source).trim();
    if (!name || !source) throw new Error(`Request environment row ${index + 1} needs a name and source.`);
    const result = { name, source };
    if (source === 'header') {
      if (!text(entry.header).trim()) throw new Error(`Request environment row ${index + 1} needs a header name.`);
      result.header = entry.header.trim();
      if (entry.decode) result.decode = entry.decode;
    } else if (source === 'storage') {
      if (!text(entry.storage).trim()) throw new Error(`Request environment row ${index + 1} needs a storage location.`);
      result.storage = entry.storage.trim();
    } else throw new Error(`Request environment row ${index + 1} has an unsupported source.`);
    if (entry.required === true || entry.required === false) result.required = entry.required;
    return result;
  });
}

/** Build one route contract from typed rows while retaining unrelated existing keywords. */
export function runtimeRouteFromDraft(draft, original) {
  const baseline = original === undefined ? null : draftOf(draft.name, original);
  const operationId = text(draft.operationContractId).trim();
  let operation;
  if (operationId) {
    if (!/^\d+$/.test(text(draft.operationContractVersion).trim())) throw new Error(`${draft.name}: choose a native operation version.`);
    operation = resolveNativeOperation({ id: operationId, version: Number(draft.operationContractVersion) });
    if (text(draft.schemaOperation).trim()) throw new Error(`${draft.name}: schemaOperation cannot be mixed with an operationContract.`);
    draft = { ...draft, method: text(draft.method).trim() || 'POST', handler: text(draft.handler).trim() || operationId,
      inputContentType: text(draft.inputContentType).trim() || 'application/json', outputContentType: text(draft.outputContentType).trim() || (operation.descriptor.protocol === 'ndjson-stdio' ? 'application/x-ndjson' : 'application/json'),
      externalEntry: text(draft.externalEntry).trim() || operation.descriptor.entry, externalProtocol: text(draft.externalProtocol).trim() || operation.descriptor.protocol };
  }
  const route = text(draft.route).trim();
  if (!/^\/api\/[A-Za-z0-9/_-]+$/.test(route)) throw new Error(`${draft.name}: enter an /api/ route.`);
  if (draft.shape === 'route-only') return route;
  if (draft.shape !== 'detailed') throw new Error(`${draft.name}: choose a route contract shape.`);
  const methods = list(text(draft.method), `${draft.name} methods`);
  if (!methods.length || methods.some(method => !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method))) {
    throw new Error(`${draft.name}: choose at least one HTTP method.`);
  }
  const handler = text(draft.handler).trim();
  if (!/^[A-Za-z][A-Za-z0-9.-]*$/.test(handler)) throw new Error(`${draft.name}: enter a registered handler name.`);
  const inputContentType = text(draft.inputContentType).trim();
  const outputContentType = text(draft.outputContentType).trim();
  if (!inputContentType || !outputContentType) throw new Error(`${draft.name}: enter both content types.`);
  const result = object(original) ? clone(original) : {};
  result.route = route;result.method = methods.length === 1 ? methods[0] : methods;result.handler = handler;
  result.input = { ...(object(original?.input) ? clone(original.input) : {}), contentType: inputContentType, fields: baseline && same(draft.inputFields, baseline.inputFields) && original?.input?.fields ? clone(original.input.fields) : normalizedPairs(draft.inputFields, `${draft.name} input`) };
  result.output = { ...(object(original?.output) ? clone(original.output) : {}), contentType: outputContentType, fields: baseline && same(draft.outputFields, baseline.outputFields) && original?.output?.fields ? clone(original.output.fields) : normalizedPairs(draft.outputFields, `${draft.name} output`) };
  const schemaOperation = text(draft.schemaOperation).trim();
  if (schemaOperation) result.schemaOperation = schemaOperation;else delete result.schemaOperation;
  if (draft.recordProjection.length) result.recordProjection = normalizedProjection(draft.recordProjection);
  else delete result.recordProjection;
  if (text(draft.sortBy).trim()) result.sortBy = draft.sortBy.trim();else delete result.sortBy;
  if (draft.sortDescending === 'true' || draft.sortDescending === 'false')
    result.sortDescending = draft.sortDescending === 'true';
  else delete result.sortDescending;
  const externalRegistryId = text(draft.externalRegistryId).trim();
  const externalEntries = list(text(draft.externalEntries), `${draft.name} external entries`);
  const hasExternalDetails = [draft.externalProtocol, draft.externalEntry, draft.externalEntries,
    draft.cancellationEntry, draft.cancellationRunIdPointer].some(value => text(value).trim())
    || draft.requestEnvironment.length > 0;
  if (externalRegistryId) {
    const external = object(result.externalProgram) ? clone(result.externalProgram) : {};
    external.registryId = externalRegistryId;
    if (text(draft.externalProtocol).trim()) external.protocol = draft.externalProtocol.trim();
    else delete external.protocol;
    if (text(draft.externalEntry).trim() && externalEntries.length) {
      throw new Error(`${draft.name}: choose one external entry or an entries list.`);
    }
    if (text(draft.externalEntry).trim()) {external.entry = draft.externalEntry.trim();delete external.entries;}
    else if (externalEntries.length >= 2) {external.entries = externalEntries;delete external.entry;}
    else throw new Error(`${draft.name}: choose an external entry or at least two entries.`);
    if (text(draft.cancellationEntry).trim() || text(draft.cancellationRunIdPointer).trim()) {
      if (!text(draft.cancellationEntry).trim() || !text(draft.cancellationRunIdPointer).trim())
        throw new Error(`${draft.name}: cancellation needs an entry and run ID pointer.`);
      external.cancellation = { ...(object(external.cancellation) ? clone(external.cancellation) : {}), entry: draft.cancellationEntry.trim(),
        runIdPointer: draft.cancellationRunIdPointer.trim() };
    } else delete external.cancellation;
    if (draft.requestEnvironment.length) external.requestEnvironment = baseline && same(draft.requestEnvironment, baseline.requestEnvironment) ? clone(original.externalProgram.requestEnvironment) : normalizedEnvironment(draft.requestEnvironment);
    else delete external.requestEnvironment;
    result.externalProgram = external;
  } else {
    if (hasExternalDetails) throw new Error(`${draft.name}: enter an external program registry ID before its details.`);
    delete result.externalProgram;
  }
  const hasCompletion = [draft.completionEventType, draft.completionOutputFilesPointer,
    draft.completionMinimumBytes].some(value => text(value).trim());
  if (hasCompletion) {
    if (!text(draft.completionEventType).trim() || !text(draft.completionOutputFilesPointer).trim())
      throw new Error(`${draft.name}: completion validation needs an event type and output files pointer.`);
    const completion = { ...(object(original?.completionValidation) ? clone(original.completionValidation) : {}), eventType: draft.completionEventType.trim(),
      outputFilesPointer: draft.completionOutputFilesPointer.trim() };
    if (text(draft.completionMinimumBytes).trim()) {
      const minimum = Number(draft.completionMinimumBytes);
      if (!Number.isInteger(minimum) || minimum < 0) throw new Error(`${draft.name}: minimum bytes must be a non-negative integer.`);
      completion.minimumBytes = minimum;
    }
    result.completionValidation = completion;
  } else delete result.completionValidation;
  if (operation) {
    result.operationContract = { ...(object(original?.operationContract) ? clone(original.operationContract) : {}), id: operationId, version: operation.identity.version };
    normalizeNativeApiContract(result);
    // Omitted descriptor defaults stay omitted in authored compact source.
    if (!Object.hasOwn(original || {}, 'method') && result.method === 'POST') delete result.method;
    if (!Object.hasOwn(original || {}, 'handler') && result.handler === operationId) delete result.handler;
    for (const key of ['input', 'output']) {
      const prior = object(original?.[key]) ? original[key] : {};
      const contentType = key === 'input' || operation.descriptor.protocol === 'json-stdio' ? 'application/json' : 'application/x-ndjson';
      if (!Object.hasOwn(prior, 'contentType') && result[key].contentType === contentType) delete result[key].contentType;
      if (!Object.hasOwn(prior, 'fields') && same(result[key].fields, [])) delete result[key].fields;
      if (!Object.hasOwn(original || {}, key) && !Object.keys(result[key]).length) delete result[key];
    }
    if (!Object.hasOwn(original?.externalProgram || {}, 'entry')) delete result.externalProgram.entry;
    if (!Object.hasOwn(original?.externalProgram || {}, 'protocol')) delete result.externalProgram.protocol;
  } else delete result.operationContract;
  return result;
}

/** Replace changed routes only; all other runtime configuration remains intact. */
export function schemaWithRuntimeRoutes(schema, routeEdits) {
  const candidate = clone(schema), runtime = candidate['x-fullmeta-runtime'];
  if (!object(runtime)) throw new Error('Add a runtime root contract before editing its API routes.');
  if (runtime.editorApi !== undefined && !object(runtime.editorApi))
    throw new Error('Runtime editor API routes must be an object.');
  const routes = runtime.editorApi ||= {}, seen = new Set();
  for (const edit of routeEdits) {
    if (!object(edit) || typeof edit.originalKey !== 'string' || !object(edit.draft))
      throw new Error('An API route row is invalid.');
    const name = text(edit.draft.name).trim();
    if (!routeKey(name)) throw new Error('Every API action needs a machine key starting with a letter.');
    if (seen.has(name)) throw new Error(`API action ${name} is repeated.`);
    seen.add(name);
  }
  const originalKeys = Object.keys(routes);
  const next = {};
  for (const edit of routeEdits) {
    const name = edit.draft.name.trim();
    const original = edit.originalKey ? routes[edit.originalKey] : undefined;
    if (edit.originalKey && !Object.hasOwn(routes, edit.originalKey))
      throw new Error(`API action ${edit.originalKey} changed after the table opened.`);
    next[name] = !edit.originalKey || !same(edit.draft, draftOf(edit.originalKey, original))
      || name !== edit.originalKey ? runtimeRouteFromDraft(edit.draft, original) : clone(original);
    if (next[name]?.operationContract) normalizeNativeApiContract(next[name]);
  }
  runtime.editorApi = next;
  return { document: candidate, changedKeys: [...new Set([...originalKeys, ...Object.keys(next)])]
    .filter(key => !same(routes[key], next[key])) };
}


export { draftOf };

export { createRuntimeRouteDialog } from './schema-extra-candidate-dialogs.js';
