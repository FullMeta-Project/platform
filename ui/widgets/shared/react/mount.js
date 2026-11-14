/** Synchronous adapters for existing widget.js hosts; React owns each container. */
import React, { createRoot, flushSync } from './react-runtime.js';

const mounted = new WeakMap();
const ownedRoots = new Set();
/** Dispose child roots before their host removes a surface. */
export function disposeReactChildren(container,{retain=[]}={}) {
  for(const entry of [...ownedRoots])if(entry.container!==container&&container.contains(entry.container)&&!retain.some(node=>node===entry.container||node?.contains(entry.container)))entry.adapter.dispose();
}

export function mountReactComponent(container, Component, initialProps = {}, options = {}) {
  if (!container || container.nodeType !== 1) throw new Error('A React widget needs an element container.');
  if (mounted.has(container)) throw new Error('A React widget is already mounted in this container.');
  let props = initialProps, disposed = false;
  const root = createRoot(container, {
    identifierPrefix: options.identifierPrefix || 'fullmeta-',
    ...(options.onError ? { onUncaughtError: options.onError, onCaughtError: options.onError } : {}),
  });
  const render = () => flushSync(() => root.render(React.createElement(Component, props)));
  const adapter = {
    update(nextProps) { if (disposed) throw new Error('The React widget is disposed.'); props = nextProps; render(); return adapter; },
    inspect() { return { mounted: !disposed, component: Component.displayName || Component.name || 'Component' }; },
    dispose() { if (disposed) return; disposeReactChildren(container);disposed = true; flushSync(() => root.unmount()); mounted.delete(container);ownedRoots.delete(entry); },
  };
  const entry={container,adapter};ownedRoots.add(entry);
  mounted.set(container, adapter);
  try { render(); } catch (error) { adapter.dispose(); throw error; }
  return Object.freeze(adapter);
}
