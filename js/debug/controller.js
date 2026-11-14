/** Development-only, serializable state and normal-command replay. No renderer dependency. */
export const editorStateFormat = 'fullmeta-editor-state/1';
export const editorScenarioFormat = 'fullmeta-editor-scenario/1';
export const editorDebugContract = 'fullmeta-editor-debug/1';

export function serializableEditorValue(value) {
  const ancestors = new Set();
  function visit(node, path) {
    if (node === null || typeof node === 'string' || typeof node === 'boolean') return;
    if (typeof node === 'number' && Number.isFinite(node)) return;
    if (!node || typeof node !== 'object') throw new Error(`${path}: editor state must contain only JSON data.`);
    if (ancestors.has(node)) throw new Error(`${path}: circular editor state is not serializable.`);
    if (!Array.isArray(node) && ![Object.prototype, null].includes(Object.getPrototypeOf(node)))
      throw new Error(`${path}: functions, DOM nodes and resource objects belong outside editor state.`);
    ancestors.add(node);
    for (const [key, child] of Object.entries(node)) visit(child, `${path}/${key}`);
    ancestors.delete(node);
  }
  visit(value, '#'); return structuredClone(value);
}

export function createEditorDebugController({ snapshot, restore, commands, inspect, settle = async () => {},
  capture = async () => null, onMode = () => {}, assertIdle = () => {}, now = () => performance.now(), interruptCommands = [] }) {
  if (!Array.isArray(interruptCommands) || interruptCommands.some(command => typeof command !== 'string')) throw new Error('Interrupt commands must be an explicit command-name array.');
  const interrupts = new Set(interruptCommands);
  let mode = 'live', fixture = null, running = false, interrupting = false, activeCommand = null, interruptCompletion = null, finishInterrupt = null, trace = [], lastScenario = null;
  const listeners = new Set();
  const notify = () => {
    for (const listener of listeners) {
      // Inspection subscribers must not interrupt a command or strand its activity lock.
      try { listener({ mode, running: running || interrupting, interrupting, trace: serializableEditorValue(trace) }); } catch {}
    }
  };
  const state = () => serializableEditorValue({ ...snapshot(), format: editorStateFormat,
    ...(mode === 'fixture' ? { fixture } : {}) });
  const commitMode = (next, responses = null) => {
    if (!['live', 'fixture'].includes(next)) throw new Error('Choose live or fixture services explicitly.');
    const nextFixture = next === 'fixture' ? serializableEditorValue(responses ?? { responses: {} }) : null;
    mode = next; fixture = nextFixture;
    onMode(mode); notify(); return mode;
  };
  const setMode = (next, responses = null) => {
    if (running || interrupting) throw new Error('Wait for the current editor operation before changing services.');
    assertIdle();
    return commitMode(next, responses);
  };
  async function exclusive(operation, requireIdle = true, context = {}) {
    if (running || interrupting) throw new Error('An editor operation is already running.');
    if (requireIdle) assertIdle(context);
    running = true; notify();
    try { return await operation(); }
    finally { running = false; notify(); }
  }
  async function dispatchCommand(command, args) {
    if (!running || !interrupts.has(command)) return exclusive(() => runCommand(command, args), true, { kind: 'command', command });
    if (interrupting || interrupts.has(activeCommand)) throw new Error('An interrupt command is already running.');
    if (activeCommand === null) throw new Error('An editor operation is already running; only a pending command can be interrupted.');
    assertIdle({ kind: 'command', command, interrupt: true });
    interruptCompletion = new Promise(resolve => { finishInterrupt = resolve; });
    interrupting = true; notify();
    try { return await runCommand(command, args); }
    finally { interrupting = false; const complete = finishInterrupt; finishInterrupt = null; interruptCompletion = null; notify(); complete(); }
  }
  async function restoreState(value, { serviceMode = 'fixture', responses } = {}) {
    const next = serializableEditorValue(value);
    if (next?.format !== editorStateFormat) throw new Error(`Use ${editorStateFormat} state.`);
    commitMode(serviceMode, responses ?? next.fixture ?? { responses: {} });
    await restore(next, { serviceMode: mode }); await settle(); notify(); return state();
  }
  const knownCommand = command => typeof command === 'string' && Object.hasOwn(commands, command) && typeof commands[command] === 'function';
  async function runCommand(command, args = {}) {
    if (!knownCommand(command)) throw new Error(`Unknown normal editor command ${command}.`);
    const input = serializableEditorValue(args), start = now();
    const record = { command, args: input, serviceMode: mode, status: 'running' }; trace.push(record);
    const main = !interrupting; if (main) activeCommand = command; notify();
    try {
      const result = await commands[command](input);
      record.commandMs = now() - start;
      const settling = now(); await settle(); record.settleMs = now() - settling; record.status = 'passed';
      record.result = result === undefined ? null : serializableEditorValue(result);
      notify(); return record.result;
    } catch (error) {
      record.commandMs = now() - start; record.status = 'failed'; record.error = String(error.message || error);
      notify(); throw error;
    } finally { if (main) activeCommand = null; }
  }
  async function captureCheckpoint(name = 'checkpoint', panel = null) {
    await settle();
    return serializableEditorValue({ name, serviceMode: mode, settled: true,
      inspection: await inspect(), capture: await capture(panel) });
  }
  async function runScenario(value) {
    const scenario = serializableEditorValue(value);
    if (scenario?.format !== editorScenarioFormat || !Array.isArray(scenario.commands))
      throw new Error(`Use a ${editorScenarioFormat} scenario with commands.`);
    if (!['fixture', 'live'].includes(scenario.serviceMode)) throw new Error('The scenario must declare fixture or live services.');
    for (const step of scenario.commands) {
      if (!step || typeof step !== 'object' || Array.isArray(step) || (step.command !== 'checkpoint' && !knownCommand(step.command)))
        throw new Error(`Unknown normal editor command ${step?.command}.`);
    }
    // Retain a baseline so watch replay cannot apply an add/delete again to the final document.
    const initialState = scenario.initialState ?? state();
    if (initialState.format !== editorStateFormat) throw new Error(`Use ${editorStateFormat} state.`);
    const responses = scenario.fixture ?? initialState.fixture ?? fixture ?? { responses: {} };
    const prepared = serializableEditorValue({ ...scenario, initialState,
      ...(scenario.serviceMode === 'fixture' ? { fixture: responses } : {}) });
    if (scenario.initialState != null) await restoreState(initialState, { serviceMode: scenario.serviceMode, responses });
    else commitMode(scenario.serviceMode, responses);
    trace = []; lastScenario = prepared; notify();
    const start = now(), checkpoints = [];
    for (const step of scenario.commands) {
      if (interruptCompletion) await interruptCompletion;
      if (step.command === 'checkpoint') checkpoints.push(await captureCheckpoint(step.args?.name, step.args?.panel));
      else await runCommand(step.command, step.args ?? {});
    }
    if (interruptCompletion) await interruptCompletion;
    return serializableEditorValue({ format: 'fullmeta-editor-replay-result/1', name: scenario.name || 'Scenario',
      serviceMode: mode, passed: true, elapsedMs: now() - start, commands: trace,
      commandMs: trace.reduce((sum, entry) => sum + (entry.commandMs || 0), 0),
      settleMs: trace.reduce((sum, entry) => sum + (entry.settleMs || 0), 0), checkpoints });
  }
  async function request(url, options = {}) {
    if (mode === 'live') return { handled: false };
    const parsed = new URL(url, 'http://fixture.local'), method = String(options.method || 'GET').toUpperCase();
    const exact = `${method} ${parsed.pathname}${parsed.search}`, key = `${method} ${parsed.pathname}`;
    const responses = fixture?.responses || {};
    const response = Object.hasOwn(responses, exact) ? responses[exact] : responses[key];
    if (response === undefined) throw new Error(`Fixture mode blocked unregistered request ${exact}. No live request was sent.`);
    const envelope = response !== null && typeof response === 'object';
    if (envelope && response.error) throw new Error(response.error);
    return { handled: true, value: serializableEditorValue(envelope && Object.hasOwn(response, 'body') ? response.body : response) };
  }
  return Object.freeze({ contract: editorDebugContract, exportState: state,
    importState: (value, options) => exclusive(() => restoreState(value, options)),
    dispatch: dispatchCommand,
    replay: value => exclusive(() => runScenario(value)),
    checkpoint: (name, panel) => exclusive(() => captureCheckpoint(name, panel), false),
    inspect: async () => serializableEditorValue(await inspect()), setServiceMode: setMode, request,
    get serviceMode() { return mode; }, get running() { return running || interrupting; }, get interrupting() { return interrupting; },
    get trace() { return serializableEditorValue(trace); }, get scenario() { return lastScenario && serializableEditorValue(lastScenario); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  });
}

/** Same-origin watcher uses a full reload and explicit fixture replay, not React HMR. */
export function installEditorWatch(controller, { window, manifestUrl = '/platform/ui/frontend-build.json',
  fetchManifest = () => window.fetch(manifestUrl, { cache: 'no-store' }).then(response => response.json()),
  intervalMs = 1000, onStatus = () => {}, reload = () => window.location.reload(),
  storageKey = 'fullmeta.editor.watch-replay.v1', canReload = () => true } = {}) {
  let revision = null, busy = false, disposed = false, armed = false, buildFailed=false;
  let sourceRevisions = null;
  const changedSources = manifest => Object.keys(manifest.sourceRevisions || {}).filter(path => sourceRevisions?.[path] !== manifest.sourceRevisions[path]);
  const sourceChange = paths => paths.some(path => path.endsWith('.json') || /applications\/.*\/(?:package|schema-document)[^/]*\.js$/.test(path));
  const pendingDrafts = state => Boolean(state.drafts?.settingsDirty || state.drafts?.jsonDirty || state.dialogs?.length
    || state.files?.dialog?.open || state.files?.picker?.open
    || state.document?.loadedSnapshot && JSON.stringify(state.document.model) !== JSON.stringify(JSON.parse(state.document.loadedSnapshot)));
  const poll = async () => {
    if (disposed || busy) return; busy = true;
    try {
      const manifest = await fetchManifest();
      if (manifest.status !== 'ready') { buildFailed=true;onStatus(`Build error: ${manifest.error || 'see watcher output'}`); return; }
      if(buildFailed){buildFailed=false;onStatus('Build recovered. The current successful view is available.');}
      const next = manifest.revision || manifest.lastGoodRevision;
      if (revision === null) { revision = next; sourceRevisions = manifest.sourceRevisions || null; return; }
      if (!armed) { revision = next; sourceRevisions = manifest.sourceRevisions || null; return; }
      if (next === revision || controller.running || !canReload()) return;
      const changed = sourceRevisions && manifest.sourceRevisions ? changedSources(manifest) : [];
      const reinterpret = sourceChange(changed), state = controller.exportState();
      if (reinterpret && pendingDrafts(state)) {
        onStatus('Source revision conflict: save, apply or discard the visible drafts and close authoring dialogs before reloading changed schema/package files. The current document and drafts are retained.'); return;
      }
      revision = next;
      sourceRevisions = manifest.sourceRevisions || null;
      const scenario = controller.scenario;
      if (scenario && scenario.serviceMode !== 'fixture') { onStatus('Build ready. Automatic live replay is blocked; run it manually.'); return; }
      window.sessionStorage.setItem(storageKey, JSON.stringify({ state, scenario, ...(reinterpret ? {reinterpret:true,changedSources:changed} : {}) }));
      onStatus('Build ready. Reloading this visible session and restoring fixture state…'); reload();
    } catch (error) { onStatus(`Watcher unavailable: ${error.message}`); }
    finally { busy = false; }
  };
  const timer = window.setInterval(poll, intervalMs);
  const restorePending = async () => {
    const text = window.sessionStorage.getItem(storageKey); if (!text) return null;
    window.sessionStorage.removeItem(storageKey);
    const value = serializableEditorValue(JSON.parse(text));
    if (value.scenario && value.scenario.serviceMode !== 'fixture')
      throw new Error('Automatic watch replay requires explicit fixture services.');
    let result;
    if (value.reinterpret) {
      // The host has just loaded the new disk source and its current interpreter.
      // Never overlay it with an older checkpoint or document fixture response.
      if (value.scenario) {
        const current = controller.exportState();
        const fixture = {responses:{...(value.scenario.fixture?.responses || value.state?.fixture?.responses || {}),...(current.fixture?.responses || {})}};
        result = await controller.replay({...value.scenario,initialState:current,fixture});
      } else result = await controller.checkpoint('Loaded changed schema/package source');
    } else if (value.scenario) {
      // New scenarios carry their own baseline. Retain compatibility with older
      // stored sessions while still restoring their fixture mappings.
      const scenario = { ...value.scenario, initialState: value.scenario.initialState ?? value.state,
        fixture: value.scenario.fixture ?? value.state?.fixture ?? { responses: {} } };
      result = await controller.replay(scenario);
    } else {
      await controller.importState(value.state, { serviceMode: 'fixture' });
      result = await controller.checkpoint('Restored after build');
    }
    onStatus('Visible state restored; fixture replay completed after build.'); return result;
  };
  void poll();
  return { setEnabled(value) { armed = Boolean(value); onStatus(armed ? 'Watch/reload and fixture replay armed.' : 'Watch replay paused.'); },
    poll, restorePending, dispose() { disposed = true; window.clearInterval(timer); } };
}
