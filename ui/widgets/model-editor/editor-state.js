/** Serializable editor surfaces. Restoration uses existing control handlers, never action clicks. */
import {validateDialogPrivateState} from './dialog-private-state.js';
import {validateInlineUiWorkspaceState} from './inline-ui-state.js';
const controlsSelector = 'input,textarea,select';
const focusSelector = `${controlsSelector},button,a[href],[contenteditable="true"],[tabindex]`;
const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const attribute = (node, name) => node?.getAttribute?.(name) ?? null;
const tag = node => String(node?.tagName || '').toLowerCase();
const inputType = node => tag(node) === 'input' ? String(node.type || 'text').toLowerCase() : null;
const allowedControl = node => !['file', 'password', 'submit', 'reset', 'button', 'image'].includes(inputType(node));
const nodes = (container, selector) => [...(container?.querySelectorAll?.(selector) || [])].filter(node=>!node.closest?.('[data-editor-debug]'));
const serializable = value => {
  const seen = new Set();
  const visit = entry => {
    if (entry === undefined) return undefined;
    if (entry === null || typeof entry === 'string' || typeof entry === 'boolean') return entry;
    if (typeof entry === 'number' && Number.isFinite(entry)) return entry;
    if (typeof entry !== 'object' || ![Object.prototype, null, Array.prototype].includes(Object.getPrototypeOf(entry)))
      throw new Error('Editor state may contain plain serializable data only; DOM, functions and graphics resources stay external.');
    if (seen.has(entry)) throw new Error('Editor state cannot contain cyclic references.');
    seen.add(entry);
    const result = Array.isArray(entry) ? entry.map(item => visit(item) ?? null)
      : Object.fromEntries(Object.entries(entry).filter(([, item]) => item !== undefined).map(([key, item]) => [key, visit(item)]));
    seen.delete(entry); return result;
  };
  return visit(value);
};

function bindings(node, container) {
  const result = {};
  for (let current = node; current && current !== container?.parentElement; current = current.parentElement) {
    for (const item of [...(current.attributes || [])]) {
      if (/^data-.*(?:path|pointer|source|schema|diagnostic|validation|rule|action|command|binding|scope|target)/.test(item.name)
        && !Object.hasOwn(result, item.name)) result[item.name] = item.value;
    }
    if (current === container) break;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function baseAnchor(container, node) {
  const row = node.closest?.('tr'), firstCell = row?.querySelector?.('th,td');
  const rowKey = firstCell?.querySelector?.('code') || firstCell;
  const context = bindings(node, container);
  return { tag: tag(node), type: inputType(node), id: node.id || null,
    label: attribute(node, 'aria-label') || (node.labels?.length ? text([...node.labels].map(label => label.textContent).join(' ')) : null),
    name: attribute(node, 'name'), settingPath: attribute(node, 'data-setting-path'),
    row: rowKey ? text(rowKey.textContent).slice(0,200) : null,
    text: tag(node) === 'details' ? text(node.querySelector?.('summary')?.textContent)
      : ['button', 'summary'].includes(tag(node)) ? text(node.textContent) : null,
    bindings: context };
}
const sameAnchor = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function indexedAnchors(container, selector) {
  const result = new WeakMap(), counts = new Map();
  for (const node of nodes(container, selector)) {
    const base = baseAnchor(container, node), key = JSON.stringify(base), ordinal = counts.get(key) || 0;
    result.set(node, { ...base, ordinal }); counts.set(key, ordinal + 1);
  }
  return result;
}

function anchorFor(container, node, selector = focusSelector) {
  const base = baseAnchor(container, node);
  const matches = nodes(container, selector).filter(candidate => sameAnchor(baseAnchor(container, candidate), base));
  return { ...base, ordinal: Math.max(0, matches.indexOf(node)) };
}

function resolveAnchor(container, anchor, selector = focusSelector) {
  if (!anchor || typeof anchor !== 'object') return null;
  const candidates = nodes(container, selector).filter(node => tag(node) === anchor.tag && inputType(node) === anchor.type);
  const exact = candidates.filter(node => sameAnchor(baseAnchor(container, node), Object.fromEntries(Object.entries(anchor).filter(([key]) => key !== 'ordinal'))));
  if (exact[anchor.ordinal || 0]) return exact[anchor.ordinal || 0];
  // React-generated IDs may change across mounts; semantic anchors remain usable.
  if (anchor.id) {
    const identified = candidates.find(node => node.id === anchor.id);
    if (identified) return identified;
  }
  const semantic = candidates.filter(node => {
    const current = baseAnchor(container, node);
    if (anchor.label) return current.label === anchor.label && (!anchor.settingPath || current.settingPath === anchor.settingPath)
      && (!anchor.row || current.row === anchor.row);
    if (anchor.settingPath) return current.settingPath === anchor.settingPath && current.row === anchor.row;
    return !anchor.id && current.row === anchor.row && current.name === anchor.name && current.text === anchor.text
      && JSON.stringify(current.bindings) === JSON.stringify(anchor.bindings || {});
  });
  return semantic[anchor.ordinal || 0] || null;
}

function selectionFor(node) {
  try {
    return Number.isInteger(node.selectionStart) && Number.isInteger(node.selectionEnd)
      ? { start: node.selectionStart, end: node.selectionEnd, direction: node.selectionDirection || 'none' } : null;
  } catch { return null; }
}

export function captureEditorFocus(container) {
  const active = container?.ownerDocument?.activeElement;
  if (!active || active === container || active.closest?.('[data-editor-debug]') || !container.contains?.(active) || !allowedControl(active) || !visible(active)) return null;
  return { anchor: anchorFor(container, active), selection: selectionFor(active) };
}

export function restoreEditorFocus(container, state) {
  const node = resolveAnchor(container, state?.anchor);
  if (!node || node.disabled || !visible(node)) return false;
  try {
    node.focus({ preventScroll: true });
    if (state.selection && typeof node.setSelectionRange === 'function')
      node.setSelectionRange(state.selection.start, state.selection.end, state.selection.direction || 'none');
    return true;
  } catch { return false; }
}

function controlValue(node) {
  if (inputType(node) === 'checkbox' || inputType(node) === 'radio') return { checked: Boolean(node.checked) };
  if (tag(node) === 'select' && node.multiple) return { values: [...node.options].filter(option => option.selected).map(option => String(option.value)) };
  return { value: String(node.value ?? '') };
}

function diagnostics(container, anchors = indexedAnchors(container, '*')) {
  return nodes(container, '[role="alert"],[aria-invalid="true"],.schema-validation-dialog-status,.schema-ui-annotation-feedback')
    .filter(node => !node.hidden && !node.closest?.('[hidden]'))
    .map(node => ({ anchor: anchors.get(node), text: text(node.textContent || node.validationMessage),
      invalid: attribute(node, 'aria-invalid') === 'true', bindings: bindings(node, container) }));
}

function captureEditorControlState(dialog, { format, toolId = null, path = [], privateState } = {}) {
  const controlAnchors = indexedAnchors(dialog, controlsSelector), detailAnchors = indexedAnchors(dialog, 'details'),
    allAnchors = indexedAnchors(dialog, '*');
  const controls = nodes(dialog, controlsSelector).filter(allowedControl).map(node => ({
    anchor: controlAnchors.get(node), ...controlValue(node),
    disabled: Boolean(node.disabled), readOnly: Boolean(node.readOnly), selection: selectionFor(node),
    ...(tag(node) === 'select' ? { choices: [...node.options].filter(option => node.multiple ? option.selected : String(option.value) === String(node.value))
      .map(option => ({ value: String(option.value), label: text(option.label || option.textContent || option.value) })) } : {}),
  }));
  const details = nodes(dialog, 'details').map(node => ({ anchor: detailAnchors.get(node),
    summary: text(node.querySelector?.('summary')?.textContent), open: Boolean(node.open) }));
  const scroll = [dialog, ...nodes(dialog, '*')].filter(node => node.scrollTop || node.scrollLeft
    || Number(node.scrollHeight) > Number(node.clientHeight) || Number(node.scrollWidth) > Number(node.clientWidth))
    .map(node => ({ anchor: node === dialog ? { root: true } : allAnchors.get(node),
      top: Number(node.scrollTop) || 0, left: Number(node.scrollLeft) || 0 }));
  return serializable({ format, ...(format === 'fullmeta-editor-dialog-state/1' ? { toolId, path, open: Boolean(dialog.open) } : {}),
    controls, details, scroll, focus: captureEditorFocus(dialog), diagnostics: diagnostics(dialog, allAnchors),
    ...(privateState === undefined ? {} : { privateState }) });
}

export function captureEditorDialogState(dialog, options = {}) {
  if (tag(dialog) !== 'dialog') throw new Error('Choose an editor dialog to capture.');
  return captureEditorControlState(dialog, { ...options, format: 'fullmeta-editor-dialog-state/1' });
}

/** Raw text remains a draft, including temporarily invalid JSON and numbers. */
export function captureEditorPanelState(panel) {
  if (!panel?.querySelectorAll) throw new Error('Choose an editor panel to capture.');
  return captureEditorControlState(panel, { format: 'fullmeta-editor-panel-state/1' });
}

function setNativeProperty(node, name, value) {
  const view = node.ownerDocument?.defaultView;
  const prototype = tag(node) === 'input' ? view?.HTMLInputElement?.prototype
    : tag(node) === 'textarea' ? view?.HTMLTextAreaElement?.prototype : view?.HTMLSelectElement?.prototype;
  const setter = prototype && Object.getOwnPropertyDescriptor(prototype, name)?.set;
  if (setter) setter.call(node, value); else node[name] = value;
}

function dispatchEvents(node, eventTypes) {
  const EventType = node.ownerDocument?.defaultView?.Event || globalThis.Event;
  for (const type of eventTypes) node.dispatchEvent(new EventType(type, { bubbles: true, composed: true }));
}

const recordObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const dataPath = value => Array.isArray(value) && value.every(part => typeof part === 'string' || Number.isInteger(part) && part >= 0);
const nullableString = value => value === null || typeof value === 'string';
const requireState = (valid, message) => { if (!valid) throw new Error(message); };
function validateAnchor(anchor, { root = false } = {}) {
  requireState(recordObject(anchor), 'Editor control anchor is invalid.');
  if (root && anchor.root === true) return;
  requireState(typeof anchor.tag === 'string' && /^[a-z][a-z0-9-]*$/.test(anchor.tag)
    && nullableString(anchor.type) && Number.isInteger(anchor.ordinal) && anchor.ordinal >= 0, 'Editor control anchor is invalid.');
  for (const key of ['id', 'label', 'name', 'settingPath', 'row', 'text'])
    if (anchor[key] !== undefined) requireState(nullableString(anchor[key]), `Editor anchor ${key} is invalid.`);
  if (anchor.bindings !== undefined) requireState(recordObject(anchor.bindings)
    && Object.values(anchor.bindings).every(value => typeof value === 'string'), 'Editor anchor bindings are invalid.');
}
function validateFocus(state) {
  if (state == null) return;
  requireState(recordObject(state), 'Editor focus state is invalid.'); validateAnchor(state.anchor);
  validateCaret(state.selection);
}
function validateCaret(selection) {
  if (selection == null) return;
  requireState(recordObject(selection) && Number.isInteger(selection.start) && selection.start >= 0
    && Number.isInteger(selection.end) && selection.end >= selection.start
    && ['none', 'forward', 'backward'].includes(selection.direction), 'Editor caret state is invalid.');
}
function validateEditorControlState(state) {
  serializable(state);
  for (const key of ['controls', 'details', 'scroll']) if (!Array.isArray(state[key])) throw new Error(`Dialog ${key} must be an array.`);
  for (const record of state.controls) {
    if (!record?.anchor || !['input', 'textarea', 'select'].includes(record.anchor.tag)
      || ['file', 'password', 'submit', 'reset', 'button', 'image'].includes(record.anchor.type)) throw new Error('Dialog state contains an unsupported control.');
    validateAnchor(record.anchor);
    if (Object.hasOwn(record, 'checked') ? typeof record.checked !== 'boolean'
      : Object.hasOwn(record, 'values') ? !Array.isArray(record.values) || record.values.some(value => typeof value !== 'string')
        : typeof record.value !== 'string') throw new Error('Dialog control values are invalid.');
    if (record.choices !== undefined && (!Array.isArray(record.choices)
      || record.choices.some(choice => !choice || typeof choice.value !== 'string' || typeof choice.label !== 'string')))
      throw new Error('Dialog saved choices are invalid.');
    for (const key of ['disabled', 'readOnly']) if (record[key] !== undefined)
      requireState(typeof record[key] === 'boolean', `Dialog control ${key} is invalid.`);
    validateCaret(record.selection);
  }
  for (const record of state.details) {
    requireState(typeof record?.open === 'boolean' && record.anchor?.tag === 'details', 'Dialog disclosure state is invalid.');
    validateAnchor(record.anchor);
  }
  for (const record of state.scroll) {
    requireState(record?.anchor && Number.isFinite(record.top) && Number.isFinite(record.left), 'Dialog scroll state is invalid.');
    validateAnchor(record.anchor, { root: true });
  }
  validateFocus(state.focus);
  if (state.diagnostics !== undefined) requireState(Array.isArray(state.diagnostics)
    && state.diagnostics.every(record => recordObject(record) && typeof record.text === 'string' && typeof record.invalid === 'boolean'), 'Editor diagnostics are invalid.');
}

export function validateEditorDialogState(state) {
  if (state?.format !== 'fullmeta-editor-dialog-state/1') throw new Error('Unsupported editor dialog state.');
  if (!dataPath(state.path)) throw new Error('Dialog source path is invalid.');
  if (state.toolId !== null && typeof state.toolId !== 'string') throw new Error('Dialog tool ID is invalid.');
  if (typeof state.open !== 'boolean') throw new Error('Dialog open state is invalid.');
  validateEditorControlState(state);
}

function validateEditorPanelState(state) {
  if (state?.format !== 'fullmeta-editor-panel-state/1') throw new Error('Unsupported editor panel state.');
  validateEditorControlState(state);
}

function validatePairs(value, label, validValue) {
  requireState(Array.isArray(value), `${label} must be an array of key/value pairs.`);
  const keys = new Set();
  for (const pair of value) {
    requireState(Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string'
      && !keys.has(pair[0]) && validValue(pair[1]), `${label} contains an invalid or duplicate key/value pair.`);
    keys.add(pair[0]);
  }
}
function pathExists(source, path) {
  if (!dataPath(path)) return false;
  let current = source;
  for (const part of path) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, part)) return false;
    current = current[part];
  }
  return true;
}
function stringMap(value, label) {
  requireState(recordObject(value) && Object.values(value).every(item => typeof item === 'string'), `${label} must contain draft strings.`);
}
function validateTableState(value, source) {
  requireState(value?.format === 'fullmeta-validation-table-state/1' && recordObject(value.source)
    && JSON.stringify(value.source) === JSON.stringify(source), 'The validation dialog belongs to a different document snapshot.');
  validatePairs(value.programs, 'Validation programs', program => recordObject(program));
  requireState(value.programs.length > 0 && typeof value.activeKey === 'string'
    && value.programs.some(([key]) => key === value.activeKey), 'Validation active program is unavailable.');
  const ids = new Set();
  const draftFields = fields => recordObject(fields) && Object.entries(fields).every(([key, entry]) =>
    typeof entry === (['haltOnErrors', 'hasChildren'].includes(key) ? 'boolean' : 'string'));
  const draft = item => {
    requireState(recordObject(item) && Number.isSafeInteger(item.id) && item.id > 0 && !ids.has(item.id)
      && ['assert', 'let', 'check', 'forEach', 'forEachTree', 'if', 'other'].includes(item.kind)
      && ['rules', 'then', 'else'].includes(item.branch) && typeof item.expanded === 'boolean'
      && draftFields(item.fields) && draftFields(item.initialFields) && recordObject(item.children)
      && (item.parent === undefined || item.parent === null), 'Validation rule draft structure is invalid.');
    ids.add(item.id);
    for (const branch of ['rules', 'then', 'else']) {
      requireState(Array.isArray(item.children[branch]), 'Validation rule child branches must be arrays.');
      item.children[branch].forEach(draft);
    }
    requireState(Object.keys(item.children).every(branch => ['rules', 'then', 'else'].includes(branch)), 'Validation rule child branch is unknown.');
    if (item.address !== undefined) requireState(typeof item.address === 'string', 'Validation rule address is invalid.');
  };
  for (const [key, program] of value.programs) {
    requireState(key === 'x-fullmeta-rules' || /^x-fullmeta-.+Validation$/.test(key), 'Validation program key is invalid.');
    requireState(Array.isArray(program.roots) && Number.isFinite(program.maximumErrors)
      && typeof program.maxErrorsChanged === 'boolean'
      && (program.selected === null || Number.isInteger(program.selected)), 'Validation program draft structure is invalid.');
    const before = new Set(ids); program.roots.forEach(draft);
    requireState(program.selected === null || ids.has(program.selected) && !before.has(program.selected), 'Validation selected rule is unavailable.');
    if (program.authoredProgram !== undefined) requireState(recordObject(program.authoredProgram), 'Validation authored program is invalid.');
  }
  const primary = value.primary;
  requireState(primary?.format === 'fullmeta-declarative-authoring-state/1' && recordObject(primary.original)
    && Array.isArray(primary.records) && nullableString(primary.selectedId) && primary.programKey === value.activeKey,
  'Declarative authoring state is invalid or belongs to a different program.');
  for (const key of ['dirty', 'convertLegacy', 'resolveStale']) requireState(typeof primary[key] === 'boolean', `Declarative ${key} state is invalid.`);
  for (const key of ['idDrafts', 'literalDrafts']) if (primary[key] !== undefined) stringMap(primary[key], `Declarative ${key}`);
  requireState(typeof primary.feedback === 'string', 'Declarative feedback is invalid.');
  const operand = entry => {
    if (entry === undefined) return;
    requireState(recordObject(entry), 'Declarative operand draft structure is invalid.');
    for (const key of ['field', 'source', 'path']) if (entry[key] !== undefined)
      requireState(typeof entry[key] === 'string', `Declarative operand ${key} must be text.`);
  };
  const constraint = entry => {
    if (entry == null || !recordObject(entry)) return;
    if (entry.type !== undefined) requireState(typeof entry.type === 'string', 'Declarative constraint type must be text.');
    operand(entry.subject); operand(entry.other);
  };
  const condition = entry => {
    if (!recordObject(entry)) return;
    constraint(entry);
    for (const key of ['all', 'any']) if (entry[key] !== undefined) {
      requireState(Array.isArray(entry[key]), 'Declarative condition branches must be arrays.'); entry[key].forEach(condition);
    }
    if (entry.not !== undefined) condition(entry.not);
  };
  for (const item of primary.records) {
    // The authoring UI deliberately retains malformed imported rows for explicit removal.
    if (!recordObject(item)) continue;
    for (const key of ['id', 'name', 'stage']) if (item[key] !== undefined)
      requireState(typeof item[key] === 'string', `Declarative ${key} draft must be text.`);
    if (item.scope != null) {
      requireState(recordObject(item.scope), 'Declarative scope draft structure is invalid.');
      for (const key of ['source', 'path']) if (item.scope[key] !== undefined)
        requireState(typeof item.scope[key] === 'string', `Declarative scope ${key} must be text.`);
      if (item.scope.nested !== undefined) requireState(Array.isArray(item.scope.nested)
        && item.scope.nested.every(scope => recordObject(scope) && typeof scope.path === 'string'), 'Declarative nested scope draft structure is invalid.');
    }
    constraint(item.constraint); condition(item.when);
    if (item.diagnostic != null) requireState(recordObject(item.diagnostic)
      && ['message', 'path'].every(key => item.diagnostic[key] === undefined || typeof item.diagnostic[key] === 'string'), 'Declarative diagnostic draft structure is invalid.');
  }
  for (const key of ['batchAreas', 'stagedText']) requireState(Array.isArray(value[key]) && value[key].length === 3
    && value[key].every(item => typeof item === 'string'), `Validation ${key} must contain three draft strings.`);
  requireState(['append', 'replace'].includes(value.importMode), 'Validation import mode is invalid.');
  for (const key of ['nativeOpen', 'open', 'hadPreview']) requireState(typeof value[key] === 'boolean', `Validation ${key} state is invalid.`);
  requireState(typeof value.status === 'string', 'Validation status is invalid.');
  if (value.recipe !== undefined) {
    requireState(recordObject(value.recipe) && typeof value.recipe.dirty === 'boolean' && typeof value.recipe.open === 'boolean'
      && Array.isArray(value.recipe.controls) && value.recipe.controls.every(control => recordObject(control)
        && nullableString(control.label) && typeof control.value === 'string'), 'Validation recipe draft structure is invalid.');
  }
}

/** Validate restoration containers, never the semantic validity of pending edits. */
export function validateEditorWorkspaceState(value, { applicationId, schemaPath, toolIds = [], builtinToolIds = [] } = {}) {
  serializable(value);
  requireState(value?.format === 'fullmeta-editor-state/1' && recordObject(value.document), 'Unsupported editor workspace state.');
  const source = value.document;
  requireState(recordObject(source.model) && typeof source.path === 'string' && source.path.length > 0
    && !/[\\:\u0000]/.test(source.path) && !source.path.split('/').some(part => !part || part === '.' || part === '..'),
  'State needs a canonical workspace document path and JSON model.');
  requireState(typeof source.applicationId === 'string' && typeof source.schemaPath === 'string'
    && (applicationId === undefined || source.applicationId === applicationId)
    && (schemaPath === undefined || source.schemaPath === schemaPath), 'Open the state’s interpreting schema/application before restoring its editor state.');
  if (source.loadedSnapshot !== undefined && source.loadedSnapshot !== null) {
    requireState(typeof source.loadedSnapshot === 'string', 'Saved document snapshot must be JSON text.');
    let saved; try { saved = JSON.parse(source.loadedSnapshot); } catch { throw new Error('Saved document snapshot must be JSON text.'); }
    requireState(recordObject(saved), 'Saved document snapshot must contain a JSON object.');
  }
  if (source.contentHash !== undefined) requireState(nullableString(source.contentHash), 'Document content hash is invalid.');
  if (value.selection !== undefined) {
    requireState(recordObject(value.selection), 'Editor selection state is invalid.');
    const selected = value.selection;
    if (selected.path !== undefined && selected.path !== null) requireState(pathExists(source.model, selected.path), 'The saved selection path is unavailable in this document.');
    if (selected.collection !== undefined) requireState(nullableString(selected.collection), 'Editor collection selection is invalid.');
    if (selected.label !== undefined) requireState(typeof selected.label === 'string', 'Editor selection label is invalid.');
    if (selected.projection != null) {
      requireState(recordObject(selected.projection), 'Editor selection projection is invalid.');
      if (selected.projection.treeTrail !== undefined) requireState(Array.isArray(selected.projection.treeTrail)
        && selected.projection.treeTrail.every(entry => recordObject(entry) && typeof entry.label === 'string'), 'Editor source trail is invalid.');
      if (selected.projection.treeLocation !== undefined) requireState(dataPath(selected.projection.treeLocation), 'Editor source location is invalid.');
    }
  }
  if (value.tree !== undefined) {
    requireState(recordObject(value.tree), 'Editor tree state is invalid.');
    if (value.tree.view !== undefined) {
      const view = value.tree.view;
      requireState(recordObject(view) && view.format === 'fullmeta-tree-state/1'
        && nullableString(view.selectedId) && nullableString(view.focusedId)
        && (view.selectedPath === null || pathExists(source.model, view.selectedPath))
        && recordObject(view.expanded) && Object.values(view.expanded).every(entry => typeof entry === 'boolean'), 'Editor tree view state is invalid.');
    }
    for (const key of ['rootCollapsed', 'sections']) if (value.tree[key] !== undefined)
      validatePairs(value.tree[key], `Tree ${key}`, entry => typeof entry === 'boolean');
    if(value.tree.rename!=null){const rename=value.tree.rename,action=rename.sourceAction;
      requireState(recordObject(rename)&&typeof rename.nodeId==='string'&&pathExists(source.model,rename.path)
        &&typeof rename.value==='string'&&typeof rename.original==='string'&&typeof rename.error==='string'
        &&['name','title'].includes(rename.fieldLabel)&&recordObject(action)&&['name','declared-title'].includes(action.kind)
        &&dataPath(action.path)&&JSON.stringify(action.path)===JSON.stringify(rename.path),'Tree rename draft or source action is invalid.');
      const item=rename.path.reduce((value,key)=>value?.[key],source.model);
      requireState(recordObject(item)&&(action.kind==='name'?typeof item.name==='string'&&rename.fieldLabel==='name'
        :typeof action.action==='string'&&action.action.length>0&&rename.fieldLabel==='title'),'Tree rename action does not address an editable source field.');
      if(action.projection!=null){requireState(recordObject(action.projection)&&action.projection.readOnly!==true,'Tree rename source projection is invalid or read only.');
        if(action.projection.path!==undefined)requireState(dataPath(action.projection.path)&&JSON.stringify(action.projection.path)===JSON.stringify(rename.path),'Tree rename projection belongs to a different source path.');}
    }
  }
  if (value.drafts !== undefined) {
    const drafts = value.drafts; requireState(recordObject(drafts), 'Editor draft state is invalid.');
    for (const key of ['settingsPresent', 'settingsDirty', 'jsonDirty']) if (drafts[key] !== undefined)
      requireState(typeof drafts[key] === 'boolean', `Editor draft ${key} is invalid.`);
    if (drafts.settingsPresent === true) requireState(Object.hasOwn(drafts, 'settings'), 'The pending settings draft is missing.');
    if (drafts.json !== undefined) requireState(typeof drafts.json === 'string', 'The JSON draft must remain raw text.');
    if (drafts.tab !== undefined) requireState(['settings', 'json'].includes(drafts.tab), 'Editor draft tab is invalid.');
    if (drafts.surface !== undefined) validateEditorPanelState(drafts.surface);
  }
  if (value.graphics !== undefined) {
    requireState(recordObject(value.graphics), 'Editor graphics state is invalid.');
    if (value.graphics.controls !== undefined) validatePairs(value.graphics.controls, 'Graphics controls', entry => typeof entry === 'boolean');
    if (value.graphics.camera !== undefined) requireState(recordObject(value.graphics.camera)
      && Object.entries(value.graphics.camera).every(([key, entry]) => ['yaw', 'pitch', 'zoom', 'panX', 'panY'].includes(key)
        && Number.isFinite(entry) && (key !== 'zoom' || entry > 0)), 'Editor camera state is invalid.');
    if (value.graphics.sceneId !== undefined) requireState(nullableString(value.graphics.sceneId), 'Editor graphics scene is invalid.');
  }
  if (value.validation !== undefined) {
    requireState(recordObject(value.validation), 'Editor validation state is invalid.');
    for (const key of ['snapshot', 'summary', 'resolved']) if (value.validation[key] !== undefined)
      requireState(key === 'snapshot' ? nullableString(value.validation[key]) : typeof value.validation[key] === 'string', `Editor validation ${key} is invalid.`);
    if (value.validation.document != null) requireState(recordObject(value.validation.document), 'Editor document validation state is invalid.');
  }
  if (value.operation != null) {
    requireState(recordObject(value.operation), 'Editor operation state is invalid.');
    for (const key of ['id', 'kind', 'state', 'label', 'message', 'detail', 'detailTitle']) if (value.operation[key] !== undefined)
      requireState(typeof value.operation[key] === 'string', `Editor operation ${key} is invalid.`);
    for (const key of ['progress', 'completed', 'total', 'startedAt', 'finishedAt']) if (value.operation[key] != null)
      requireState(Number.isFinite(value.operation[key]), `Editor operation ${key} is invalid.`);
    for (const key of ['cancellable', 'stopRequested']) if (value.operation[key] !== undefined)
      requireState(typeof value.operation[key] === 'boolean', `Editor operation ${key} is invalid.`);
  }
  if (value.status !== undefined) requireState(recordObject(value.status) && typeof value.status.text === 'string', 'Editor status state is invalid.');
  validateFocus(value.focus);
  if(value.designers?.inline!=null)validateInlineUiWorkspaceState(value.designers.inline,{source:source.model,documentPath:source.path,selectionPath:value.selection?.path,pendingSettings:value.drafts?.settingsPresent?value.drafts.settings:undefined});
  if (value.dialogs !== undefined) {
    requireState(Array.isArray(value.dialogs), 'Dialog snapshots must be an array.');
    const tools = new Set([...toolIds,...builtinToolIds.filter(id=>['schema-authoring','schema-structure'].includes(id))]);
    for (const dialog of value.dialogs) {
      validateEditorDialogState(dialog);
      requireState(dialog.toolId && tools.has(dialog.toolId), 'Only declared schema authoring dialogs can be restored.');
      requireState(pathExists(source.model, dialog.path), 'The saved dialog source path is unavailable in this document.');
      if(['schema-authoring','schema-structure'].includes(dialog.toolId))requireState(recordObject(dialog.privateState),'Built-in schema dialogs require their semantic source state.');
      if (dialog.toolId === 'bulk-validation' && dialog.privateState != null) validateTableState(dialog.privateState, source.model);
      if(dialog.privateState!=null)validateDialogPrivateState(dialog.privateState,{source:source.model,toolId:dialog.toolId,provider:{applicationId:source.applicationId,schemaPath:source.schemaPath}});
    }
  }
  return value;
}

/** Restore controls only through their existing input/change handlers. Normal
 * handlers may rerender a dialog, so every subsequent anchor is resolved again.
 * Private factory state is returned for the host adapter; it is not interpreted here.
 */
async function restoreEditorControlState(dialog, state, { dispatchControl, restoreControls = true, skipControl } = {}) {
  const snapshot = serializable(state), restored = [], unchanged = [], blocked = [];
  if (snapshot.format === 'fullmeta-editor-dialog-state/1') validateEditorDialogState(snapshot);
  else validateEditorPanelState(snapshot);
  const settled = async () => {
    await Promise.resolve();
    const view = dialog.ownerDocument?.defaultView;
    if (view?.requestAnimationFrame) await new Promise(resolve => view.requestAnimationFrame(resolve));
  };
  // Structured children are mounted on first expansion. Recreate previously
  // visited descendants before restoring their disclosures and raw controls.
  const records = snapshot.details || [], temporarilyOpened = [];
  const structuredPath = anchor => {
    try { const path = JSON.parse(anchor?.bindings?.['data-structured-path']); return Array.isArray(path) ? path : null; }
    catch { return null; }
  };
  for (const record of records) {
    const node = resolveAnchor(dialog, record.anchor, 'details');
    if (!node) continue;
    const path = structuredPath(record.anchor);
    const hasSavedDescendant = path && records.some(other => {
      const child = structuredPath(other.anchor);
      return child && child.length > path.length && path.every((part, index) => part === child[index])
        && other.anchor.bindings?.['data-authoring-path'] === record.anchor.bindings?.['data-authoring-path'];
    });
    const open = Boolean(record.open || hasSavedDescendant);
    if (node.open !== open) { node.open = open; if (open && path) await settled(); }
    if (!record.open && open) temporarilyOpened.push(record.anchor);
  }
  for (const anchor of temporarilyOpened.reverse()) {
    const node = resolveAnchor(dialog, anchor, 'details');
    if (node) node.open = false;
  }
  await settled();
  let pending = restoreControls ? [...(snapshot.controls || [])] : [];
  for (let pass = 0; pass < 3 && pending.length; pass++) {
    const missing = []; let progress = 0;
    for (const record of pending) {
      const node = resolveAnchor(dialog, record.anchor, controlsSelector);
      if (!node || !allowedControl(node)) { missing.push(record); continue; }
      if(skipControl?.(node)){unchanged.push(record.anchor);progress++;continue;}
      const desired = Object.hasOwn(record, 'checked') ? { checked: Boolean(record.checked) }
        : Object.hasOwn(record, 'values') ? { values: record.values.map(String) } : { value: String(record.value ?? '') };
      if (tag(node) === 'select' && Array.isArray(record.choices)) {
        const resolveChoice = value => {
          if ([...node.options].some(option => String(option.value) === value)) return value;
          const saved = record.choices.find(choice => choice.value === value);
          const matches = saved ? [...node.options].filter(option => text(option.label || option.textContent || option.value) === saved.label) : [];
          return matches.length === 1 ? String(matches[0].value) : value;
        };
        if (desired.values) desired.values = desired.values.map(resolveChoice); else desired.value = resolveChoice(desired.value);
      }
      if (JSON.stringify(controlValue(node)) === JSON.stringify(desired)) { unchanged.push(record.anchor); progress++; continue; }
      if (node.disabled || node.readOnly) { blocked.push({ anchor: record.anchor, reason: 'The current control is disabled or read only.' }); progress++; continue; }
      if (tag(node) === 'select' && (desired.values || [desired.value]).some(value => ![...node.options].some(option => String(option.value) === value))) {
        blocked.push({ anchor: record.anchor, reason: 'The saved choice is unavailable in this control.' }); progress++; continue;
      }
      if (Object.hasOwn(desired, 'checked')) setNativeProperty(node, 'checked', desired.checked);
      else if (desired.values) for (const option of node.options) option.selected = desired.values.includes(String(option.value));
      else setNativeProperty(node, 'value', desired.value);
      const eventTypes = ['input', 'change'];
      if (dispatchControl) await dispatchControl(node, record, eventTypes); else dispatchEvents(node, eventTypes);
      restored.push(record.anchor); progress++;
      if (tag(node) === 'select') await settled(); else await Promise.resolve();
    }
    pending = missing;
    if (!progress) break;
    if (pending.length) await settled();
  }
  const focused = restoreEditorFocus(dialog, snapshot.focus);
  for (const record of snapshot.scroll || []) {
    const node = record.anchor?.root ? dialog : resolveAnchor(dialog, record.anchor, '*');
    if (node) { node.scrollTop = record.top || 0; node.scrollLeft = record.left || 0; }
  }
  return { restored, unchanged, blocked, missing: pending.map(record => record.anchor), focused,
    ...(snapshot.privateState === undefined ? {} : { privateState: snapshot.privateState }) };
}

export async function restoreEditorDialogState(dialog, state, options) {
  if (tag(dialog) !== 'dialog' || state?.format !== 'fullmeta-editor-dialog-state/1') throw new Error('Unsupported editor dialog state.');
  return restoreEditorControlState(dialog, state, options);
}

export async function restoreEditorPanelState(panel, state, options) {
  if (!panel?.querySelectorAll || state?.format !== 'fullmeta-editor-panel-state/1') throw new Error('Unsupported editor panel state.');
  return restoreEditorControlState(panel, state, options);
}

const bounds = node => {
  const box = node.getBoundingClientRect?.();
  return box ? Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number.isFinite(box[key]) ? box[key] : 0])) : null;
};
const visible = node => {
  if (node.hidden || node.closest?.('[hidden],[inert]') || node.closest?.('dialog') && !node.closest('dialog').open) return false;
  for (let current = node.parentElement; current; current = current.parentElement) {
    if (tag(current) === 'details' && !current.open) {
      const summary = current.querySelector?.('summary');
      if (!summary?.contains?.(node)) return false;
    }
  }
  if (node.getClientRects && !node.getClientRects().length) return false;
  return true;
};

export function inspectEditorSurface(container) {
  if (!container?.querySelectorAll) throw new Error('Choose an editor surface to inspect.');
  const anchors = indexedAnchors(container, focusSelector), allAnchors = indexedAnchors(container, '*');
  const controls = nodes(container, `${controlsSelector},button,a,[role="button"]`).filter(node => allowedControl(node) && visible(node))
    .map(node => ({ anchor: anchors.get(node) || allAnchors.get(node), tag: tag(node), type: inputType(node),
      label: attribute(node, 'aria-label') || text(node.textContent || node.labels?.[0]?.textContent),
      ...(tag(node) === 'button' || tag(node) === 'a' || attribute(node, 'role') === 'button' ? {} : controlValue(node)),
      disabled: Boolean(node.disabled) || attribute(node, 'aria-disabled') === 'true', readOnly: Boolean(node.readOnly),
      invalid: attribute(node, 'aria-invalid') === 'true', bindings: bindings(node, container), bounds: bounds(node) }));
  const canvases = nodes(container, 'canvas').filter(visible).map(node => ({ id: node.id || null,
    label: attribute(node, 'aria-label'), width: Number(node.width) || 0, height: Number(node.height) || 0,
    clientWidth: Number(node.clientWidth) || 0, clientHeight: Number(node.clientHeight) || 0,
    bindings: bindings(node, container), bounds: bounds(node) }));
  const dialogs = nodes(container, 'dialog').filter(node => node.open).map(node => ({ id: node.id || null,
    title: text(node.querySelector?.('h1,h2,h3')?.textContent), bounds: bounds(node) }));
  return serializable({ format: 'fullmeta-editor-surface/1', controls, diagnostics: diagnostics(container, allAnchors),
    canvases, dialogs, focus: captureEditorFocus(container) });
}
