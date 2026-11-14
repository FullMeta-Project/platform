// @ts-check
/**
 * Native WebMCP producer lifecycle, with an isolated legacy compatibility path.
 * Current draft (2 Nov 2026): https://webmachinelearning.github.io/webmcp/#model-context-container
 * Chrome API: https://developer.chrome.com/docs/ai/webmcp/imperative-api
 * registerTool resolves undefined in the current IDL; RegisteredTool is discovery
 * metadata. Registration abort removes availability, not an in-flight operation.
 */
import { serializableEditorValue } from '../../js/editor-debug.js';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const webMcpRegistrationFormat = 'fullmeta-webmcp-registration/1';
const toolError = (code, message) => ({ format: 'fullmeta-tool-error/1', isError: true, error: { code, message } });
const messageOf = error => String(error?.message || error || 'WebMCP request failed.');

function prepareTool(tool) {
  if (!record(tool) || typeof tool.name !== 'string' || !/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)) throw new Error('A tool needs a unique ASCII name of 1–128 letters, digits, underscores, hyphens or dots.');
  if (typeof tool.description !== 'string' || !tool.description.trim() || typeof tool.execute !== 'function') throw new Error(`Tool ${tool.name} needs a description and execute handler.`);
  /** @type {Record<string, any>} */ const descriptor = { name: tool.name, description: tool.description };
  for (const key of ['inputSchema', 'outputSchema']) if (tool[key] !== undefined) {
    if (!record(tool[key])) throw new Error(`${tool.name}.${key} must be a JSON Schema object.`);
    descriptor[key] = serializableEditorValue(tool[key]);
  }
  if (tool.title !== undefined) { if (typeof tool.title !== 'string') throw new Error(`${tool.name}.title must be text.`); descriptor.title = tool.title; }
  if (tool.annotations !== undefined) {
    if (!record(tool.annotations)) throw new Error(`${tool.name}.annotations must be a record.`);
    descriptor.annotations = serializableEditorValue(tool.annotations);
    for (const key of ['readOnlyHint', 'untrustedContentHint', 'consequentialHint', 'debugging']) if (descriptor.annotations[key] !== undefined && typeof descriptor.annotations[key] !== 'boolean') throw new Error(`${tool.name}.annotations.${key} must be boolean.`);
  }
  return { descriptor, execute: tool.execute };
}

/**
 * Register supplied native descriptors around the existing public controller.
 * `ready` always resolves a truthful data-only status, including unsupported and
 * rejected registration. The page owns business guards, confirmations and modes.
 * @param {{document?:any,navigator?:any,tools:any[],onStatus?:(status:any)=>void,signal?:AbortSignal}} options
 */
export function registerWebMcpTools({ document = globalThis.document, navigator = globalThis.navigator, tools, onStatus = () => {}, signal } = { tools: [] }) {
  let context = null, api = null, detectionError = null;
  try {
    if (typeof document?.modelContext?.registerTool === 'function') { context = document.modelContext; api = 'document.modelContext'; }
    else if (typeof navigator?.modelContext?.registerTool === 'function') { context = navigator.modelContext; api = 'navigator.modelContext'; }
  } catch (error) { detectionError = messageOf(error); }
  const current = api === 'document.modelContext';
  const AbortControllerClass = document?.defaultView?.AbortController || globalThis.AbortController;
  const available = Boolean(context), cleanup = current ? 'registration-signal' : context && typeof context.unregisterTool === 'function' ? 'legacy-unregister' : 'unavailable';
  const entries = [], failures = [], requested = Array.isArray(tools) ? tools.map(tool => typeof tool?.name === 'string' ? tool.name : '(unnamed)') : [];
  let disposed = false, resolveReady, settled = false;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const status = () => serializableEditorValue({ format: webMcpRegistrationFormat, api, available, experimental: true,
    state: disposed ? 'disposed' : !available || cleanup === 'unavailable' || current && !AbortControllerClass ? 'unsupported' : entries.some(entry => entry.pending) ? 'registering' : failures.length ? entries.some(entry => entry.registered) ? 'partial' : 'error' : 'ready',
    requested, registered: entries.filter(entry => entry.registered && !disposed).map(entry => entry.name), pending: entries.filter(entry => entry.pending && !disposed).map(entry => entry.name), failed: failures,
    cleanup, disposed, externalAgentVerified: false,
    ...(detectionError ? { reason: detectionError } : !available ? { reason: 'This browser exposes no native WebMCP registration API.' } : cleanup === 'unavailable' ? { reason: 'The legacy API has no unregisterTool lifecycle; no tools were registered.' } : {}) });
  const notify = () => { try { onStatus(status()); } catch { /* Status observers never strand registration or cleanup. */ } };
  const finish = () => { if (!settled && (disposed || !entries.some(entry => entry.pending))) { settled = true; resolveReady(status()); } };
  function release(entry) {
    if (entry.released || !entry.registered) return;
    entry.released = true; entry.registered = false;
    if (!current) {
      try { const result = context.unregisterTool(entry.name); Promise.resolve(result).catch(error => { failures.push({ name: entry.name, phase: 'cleanup', error: messageOf(error) }); notify(); }); }
      catch (error) { failures.push({ name: entry.name, phase: 'cleanup', error: messageOf(error) }); }
    }
  }
  const dispose = () => {
    if (disposed) return; disposed = true;
    signal?.removeEventListener('abort', dispose);
    for (const entry of entries) { entry.controller?.abort(); release(entry); }
    notify(); finish();
  };
  const resultFor = value => current ? value : { content: [{ type: 'text', text: JSON.stringify(value) }], ...(value?.isError === true ? { isError: true } : {}) };
  const wrapExecute = execute => async (input = {}, options = {}) => {
    if (disposed) return resultFor(toolError('TOOL_UNAVAILABLE', 'This page tool registration has been disposed.'));
    if (options?.signal?.aborted) return resultFor(toolError('ABORTED', 'This invocation was cancelled before execution.'));
    let argumentsValue;
    try { if (!record(input)) throw new Error('Tool input must be a JSON object.'); argumentsValue = serializableEditorValue(input); }
    catch (error) { return resultFor(toolError('INVALID_INPUT', messageOf(error))); }
    let result;
    try { result = await execute(argumentsValue, { signal: options?.signal }); }
    catch (error) { return resultFor(toolError(options?.signal?.aborted ? 'ABORTED' : 'EXECUTION_FAILED', messageOf(error))); }
    try { return resultFor(serializableEditorValue(result === undefined ? null : result)); }
    catch (error) { return resultFor(toolError('UNSERIALIZABLE_RESULT', messageOf(error))); }
  };
  const adapter = Object.freeze({ ready, status, dispose });
  if (signal?.aborted) { dispose(); return adapter; }
  signal?.addEventListener('abort', dispose, { once: true });
  if (!available || cleanup === 'unavailable' || current && !AbortControllerClass) { notify(); finish(); return adapter; }
  const prepared = [];
  if (!Array.isArray(tools)) failures.push({ name: '(tool set)', phase: 'definition', error: 'Provide a tool descriptor array.' });
  else for (const tool of tools) {
    const name = typeof tool?.name === 'string' ? tool.name : '(unnamed)';
    try { if (prepared.some(entry => entry.descriptor.name === tool.name)) throw new Error(`Tool ${tool.name} appears twice in this registration set.`); prepared.push(prepareTool(tool)); }
    catch (error) { failures.push({ name, phase: 'definition', error: messageOf(error) }); }
  }
  // Validate the whole definition set before registering any tool. Never clear or
  // overwrite a different owner's registration to resolve a duplicate name.
  if (failures.length) { notify(); finish(); return adapter; }
  for (const tool of prepared) entries.push({ name: tool.descriptor.name, descriptor: tool.descriptor, execute: tool.execute, pending: true, registered: false, released: false, controller: current ? new AbortControllerClass() : null });
  notify();
  for (const entry of entries) void (async () => {
    try {
      await context.registerTool({ ...entry.descriptor, execute: wrapExecute(entry.execute) }, ...(current ? [{ signal: entry.controller.signal }] : []));
      entry.registered = true;
      if (disposed) release(entry);
    } catch (error) {
      if (!disposed) failures.push({ name: entry.name, phase: 'registration', error: messageOf(error) });
    } finally { entry.pending = false; notify(); finish(); }
  })();
  finish(); return adapter;
}
