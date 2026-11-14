/** Shared presentation adapter: reorders existing panes without remounting editors. */
const layouts = new Set(['stacked', 'columns']);
export function assertWorkspaceLayout(value) {
  if (!layouts.has(value)) throw new Error('Choose stacked or columns for the workspace layout.');
  return value;
}
export function validateWorkspaceLayoutState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved workspace layout.');
  assertWorkspaceLayout(value.layout);
  if (value.defaultLayout !== undefined) assertWorkspaceLayout(value.defaultLayout);
  if (value.override !== undefined && typeof value.override !== 'boolean') throw new Error('Invalid saved workspace layout override.');
  for (const key of ['treeWidthPx', 'settingsWidthPx', 'graphicsRatio']) {
    if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] <= 0)) throw new Error(`Invalid saved workspace ${key}.`);
  }
  return value;
}

export function createWorkspaceLayoutController({root, onResize = () => {}, defaultLayout = 'stacked', bindMenu = true}) {
  const workspace = root.querySelector('.workspace'), right = root.querySelector('#right-workspace');
  const tree = root.querySelector('#tree-splitter'), split = root.querySelector('#right-splitter');
  const view = root.querySelector('#view-menu');
  if (!workspace || !right || !tree || !split) throw new Error('Workspace layout requires its three panes and two separators.');
  root.classList.add('fullmeta-workspace');
  let layout = assertWorkspaceLayout(defaultLayout), schemaDefault = layout, applicationKey = '', override = false;
  let treeWidth = 260, settingsWidth = 330, graphicsRatio = .5, disposed = false, drag = null;
  const overrides = new Map(), listeners = [];
  const listen = (node, type, handler) => {node.addEventListener(type, handler); listeners.push(() => node.removeEventListener(type, handler));};
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(value, Math.max(minimum, maximum)));
  const dimensions = () => ({width: workspace.clientWidth || 1000, height: right.clientHeight || workspace.clientHeight || 700});
  function resize() {
    if (disposed) return;
    const {width, height} = dimensions();
    treeWidth = Math.round(clamp(treeWidth, 150, width - (layout === 'columns' ? 400 : 250) - 26));
    workspace.style.setProperty('--tree-width', `${treeWidth}px`);
    tree.setAttribute('aria-valuemin', '150'); tree.setAttribute('aria-valuemax', String(Math.max(150, width - (layout === 'columns' ? 426 : 276))));
    tree.setAttribute('aria-valuenow', String(treeWidth));
    tree.setAttribute('aria-orientation', 'vertical');
    tree.setAttribute('aria-label', layout === 'columns' ? 'Resize Tree and Settings panels' : 'Resize model tree and Graphics Console/Settings panes');
    const available = Math.max(320, width - treeWidth - 26);
    settingsWidth = Math.round(clamp(settingsWidth, 160, available - 160));
    workspace.style.setProperty('--settings-width', `${settingsWidth}px`);
    const graphicsHeight = Math.round(Math.max(160, height - 14) * graphicsRatio);
    right.style.setProperty('--graphics-height', `${graphicsHeight}px`);
    split.setAttribute('aria-orientation', layout === 'columns' ? 'vertical' : 'horizontal');
    split.setAttribute('aria-label', layout === 'columns' ? 'Resize Settings and Graphics Console panels' : 'Resize Graphics Console and Settings panels');
    split.setAttribute('aria-valuemin', layout === 'columns' ? '160' : '80');
    split.setAttribute('aria-valuemax', String(layout === 'columns' ? available - 160 : Math.max(80, height - 94)));
    split.setAttribute('aria-valuenow', String(layout === 'columns' ? settingsWidth : graphicsHeight));
    onResize();
  }
  function paint() {
    root.dataset.workspaceLayout = layout;
    for (const item of root.querySelectorAll('[data-workspace-layout]')) {
      if (item !== root) item.setAttribute('aria-checked', String(item.dataset.workspaceLayout === layout));
    }
    resize();
  }
  const inspect = () => ({layout, defaultLayout: schemaDefault, applicationKey, override, treeWidthPx: treeWidth, settingsWidthPx: settingsWidth, graphicsRatio});
  function set(value) {
    layout = assertWorkspaceLayout(value); override = true; overrides.set(applicationKey, layout); paint();
    if (view) view.open = false;
    return inspect();
  }
  function useSchemaDefault(key, value = 'stacked') {
    const nextDefault = assertWorkspaceLayout(value), nextKey = String(key || '');
    schemaDefault = nextDefault; applicationKey = nextKey;
    override = overrides.has(applicationKey); layout = overrides.get(applicationKey) || schemaDefault; paint();
    return inspect();
  }
  function restore(value) {
    validateWorkspaceLayoutState(value);
    override = value.override !== false; layout = override ? value.layout : schemaDefault;
    if (override) overrides.set(applicationKey, layout); else overrides.delete(applicationKey);
    treeWidth = value.treeWidthPx ?? treeWidth; settingsWidth = value.settingsWidthPx ?? settingsWidth;
    graphicsRatio = clamp(value.graphicsRatio ?? graphicsRatio, .2, .8); paint(); return inspect();
  }
  function bind(handle, first) {
    listen(handle, 'pointerdown', event => {
      if (event.button !== 0 || disposed) return;
      event.preventDefault();
      drag = {handle, id:event.pointerId, x:event.clientX, y:event.clientY, treeWidth, settingsWidth, graphicsRatio, layout};
      handle.classList.add('dragging'); handle.setPointerCapture?.(event.pointerId);
    });
    listen(handle, 'pointermove', event => {
      if (!drag || drag.handle !== handle || drag.id !== event.pointerId || drag.layout !== layout) return;
      if (first) treeWidth = drag.treeWidth + event.clientX - drag.x;
      else if (layout === 'columns') settingsWidth = drag.settingsWidth + event.clientX - drag.x;
      else graphicsRatio = clamp(drag.graphicsRatio + (event.clientY - drag.y) / Math.max(1, dimensions().height - 14), .2, .8);
      resize();
    });
    const finish = event => {
      if (!drag || drag.handle !== handle || drag.id !== event.pointerId) return;
      drag = null; handle.classList.remove('dragging');
      if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    listen(handle, 'pointerup', finish); listen(handle, 'pointercancel', finish);
    listen(handle, 'keydown', event => {
      const horizontal = first || layout === 'columns';
      const negative = horizontal ? 'ArrowLeft' : 'ArrowUp', positive = horizontal ? 'ArrowRight' : 'ArrowDown';
      if (![negative, positive].includes(event.key)) return;
      event.preventDefault(); const delta = event.key === positive ? 12 : -12;
      if (first) treeWidth += delta; else if (layout === 'columns') settingsWidth += delta;
      else graphicsRatio = clamp(graphicsRatio + delta / Math.max(1, dimensions().height - 14), .2, .8);
      resize();
    });
  }
  bind(tree, true); bind(split, false);
  if (bindMenu) for (const item of root.querySelectorAll('button[data-workspace-layout]')) listen(item, 'click', () => set(item.dataset.workspaceLayout));
  paint();
  return {inspect, set, restore, useSchemaDefault, resize,
    dispose() {disposed = true; for (const remove of listeners) remove(); if (drag) drag.handle.classList.remove('dragging'); drag = null; overrides.clear();}};
}
