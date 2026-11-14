/** Own application panel mounts without retaining DOM or application semantics. */
export function createApplicationPanelLifecycle({ removePanels = () => {} } = {}) {
  if (typeof removePanels !== 'function') throw new TypeError('Application panel removal must be a function.');
  let current = null, disposed = false, changing = false;
  const syncDispose = callback => () => {
    const result = callback();
    if (result && typeof result.then === 'function') throw new TypeError('Application panel disposal must be synchronous.');
  };
  const normalize = handle => {
    if (handle === undefined) return null;
    if (typeof handle === 'function') return syncDispose(handle);
    if (handle && typeof handle === 'object' && typeof handle.then !== 'function' && typeof handle.dispose === 'function')
      return syncDispose(() => handle.dispose());
    throw new TypeError('mountEditorPanels must return undefined, a disposer function, or an object with dispose().');
  };
  const removeAfterError = original => {
    try { removePanels(); }
    catch (error) { throw new AggregateError([original, error], 'Application panel mount and removal failed.'); }
    throw original;
  };
  const release = () => {
    // Release ownership before invoking application code: throwing disposers are
    // never called twice, and stale panel nodes are still removed on failure.
    const callback = current; current = null;
    let failure;
    try { callback?.(); } catch (error) { failure = error; }
    try { removePanels(); }
    catch (error) {
      if (failure) throw new AggregateError([failure, error], 'Application panel disposal and removal failed.');
      throw error;
    }
    if (failure) throw failure;
  };
  return Object.freeze({
    replace(mount, context) {
      if (disposed) throw new Error('The application panel lifecycle is disposed.');
      if (changing) throw new Error('An application panel transition is already running.');
      if (mount !== undefined && typeof mount !== 'function') throw new TypeError('Application panel mount must be a function.');
      changing = true;
      try {
        release();
        if (!mount) return undefined;
        let handle;
        try { handle = mount(context); current = normalize(handle); }
        catch (error) { removeAfterError(error); }
        return handle;
      } finally { changing = false; }
    },
    dispose() {
      if (disposed) return;
      if (changing) throw new Error('An application panel transition is already running.');
      disposed = true; changing = true;
      try { release(); } finally { changing = false; }
    },
  });
}
