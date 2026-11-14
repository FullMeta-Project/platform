export function createOperationProgressState() {
  let active = null;
  let recent = null;

  return {
    begin(operation) {
      if (active) return null;
      active = {
        progress: null,
        completed: null,
        total: null,
        detail: '',
        detailTitle: '',
        stopRequested: false,
        ...operation,
        state: 'running',
        startedAt: Number.isFinite(operation.startedAt) ? operation.startedAt : Date.now(),
      };
      recent = null;
      return { ...active };
    },
    update(id, changes) {
      if (!active || active.id !== id) return null;
      active = { ...active, ...changes };
      return { ...active };
    },
    finish(id, changes = {}) {
      if (!active || active.id !== id) return null;
      recent = { ...active, ...changes,
        finishedAt: Number.isFinite(changes.finishedAt) ? changes.finishedAt : Date.now() };
      active = null;
      return { ...recent };
    },
    clear(kind = null) {
      if (active || (kind && recent?.kind !== kind)) return false;
      recent = null;
      return true;
    },
    current() {
      const operation = active || recent;
      return operation ? { ...operation } : null;
    },
    active() {
      return active ? { ...active } : null;
    },
    isBusy() {
      return active !== null;
    },
  };
}
