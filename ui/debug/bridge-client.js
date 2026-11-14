// @ts-check
import { editorBridgeFormat, assertEditorBridgeRequest } from './bridge-protocol.js';
/**
 * Opt-in transport for the same visible page. No application API or document store
 * is exposed: mutations call the same guarded controller used by the debug dock.
 * @param {any} controller
 * @param {{window?:any,revision:string|(()=>string),url?:string,onStatus?:(message:string)=>void,retryMs?:number}} options
 */
export function connectEditorDebugBridge(controller, { window = globalThis.window, revision, url = 'http://127.0.0.1:8766', onStatus = () => {}, retryMs = 1000 }) {
  const page = new URL(window.location.href), bridge = new URL(url);
  if (page.origin !== 'http://127.0.0.1:8765' || page.searchParams.get('debug') !== '1') throw new Error('The local bridge requires the visible FullMeta page at http://127.0.0.1:8765 with ?debug=1.');
  if (bridge.hostname !== '127.0.0.1' || bridge.protocol !== 'http:' || bridge.username || bridge.password || bridge.pathname !== '/' || bridge.search || bridge.hash) throw new Error('Use an HTTP loopback bridge origin.');
  const loadedRevision = () => typeof revision === 'function' ? revision() : revision;
  let disposed = false, registration = null, abort = new AbortController(), timer = null, firstReady;
  const ready = new Promise(resolve => { firstReady = resolve; });
  const storageKey = 'fullmeta.editor.local-bridge.v1';
  const request = async (path, options = {}) => {
    const response = await window.fetch(new URL(path, bridge).href, { ...options, signal: abort.signal, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(registration ? { Authorization: `Bearer ${registration.token}` } : {}), ...options.headers } });
    const value = await response.json(); if (!response.ok) throw new Error(value.error || `Bridge request failed (${response.status}).`); return value;
  };
  const delay = () => new Promise(resolve => { timer = window.setTimeout(resolve, retryMs); });
  const mode = args => {
    const next = args.serviceMode ?? 'fixture';
    if (!['fixture', 'live'].includes(next)) throw new Error('Declare fixture or live services.');
    if (controller.serviceMode !== next || args.fixture) controller.setServiceMode(next, next === 'fixture' ? args.fixture ?? { responses: {} } : null);
  };
  const execute = async input => {
    const value = assertEditorBridgeRequest(input);
    if (value.revision !== loadedRevision()) throw new Error('The visible frontend revision changed. Inspect sessions and retry.');
    const args = value.args;
    if (value.action === 'inspect') return controller.inspect();
    if (value.action === 'state') return controller.exportState();
    if (value.action === 'command') { mode(args); return controller.dispatch(args.command, args.args || {}); }
    if (value.action === 'restore') return controller.importState(args.state, { serviceMode: args.serviceMode ?? 'fixture', ...(args.fixture ? { responses: args.fixture } : {}) });
    if (value.action === 'replay') return controller.replay(args.scenario || args);
    if (value.action === 'checkpoint') return controller.checkpoint(args.name || 'Local bridge checkpoint', args.panel || null);
    if (value.action === 'mode') { mode(args); return { serviceMode: controller.serviceMode }; }
    throw new Error('Unsupported bridge action.');
  };
  async function run() {
    while (!disposed) {
      try {
        let previous = null; try { previous = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null'); } catch {}
        registration = await request('/browser/register', { method: 'POST', body: JSON.stringify({ format: editorBridgeFormat, pageUrl: page.href, revision: loadedRevision(), serviceMode: controller.serviceMode, ...previous }) });
        window.sessionStorage.setItem(storageKey, JSON.stringify({ sessionId: registration.sessionId, token: registration.token }));
        onStatus(`Local command bridge connected to this visible session (${registration.sessionId}).`); firstReady?.(registration.sessionId); firstReady = null;
        while (!disposed) {
          const response = await request(`/browser/${encodeURIComponent(registration.sessionId)}/commands`, { method: 'POST', body: JSON.stringify({ revision: loadedRevision(), serviceMode: controller.serviceMode }) });
          if (!response.request) continue;
          const start = performance.now(); let result;
          try { result = { ok: true, value: (await execute(response.request)) ?? null }; }
          catch (error) { result = { ok: false, error: String(error.message || error) }; }
          await request(`/browser/${encodeURIComponent(registration.sessionId)}/result`, { method: 'POST', body: JSON.stringify({ format: editorBridgeFormat, requestId: response.request.requestId, revision: loadedRevision(), serviceMode: controller.serviceMode, elapsedMs: performance.now() - start, ...result }) });
        }
      } catch (error) { if (disposed) break; registration = null; onStatus(`Local command bridge unavailable: ${error.message}`); await delay(); }
    }
  }
  void run();
  return { ready, get sessionId() { return registration?.sessionId || null; }, dispose() { if (disposed) return; disposed = true; abort.abort(); if (timer !== null) window.clearTimeout(timer); firstReady?.(null); firstReady = null; } };
}
