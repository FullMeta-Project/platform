/** Semantic adapters over the same guarded controllers used by human controls. */
import { structuredValueDraft, validateStructuredValueDraftShape } from '../../shared/structured-value-editor.js';
import { validateDialogPrivateState } from '../dialog-private-state.js';
import { coreSchemaDialogIds } from '../schema-core-dialog-state.js';
import { changeTreeRename, commitTreeRename, cancelTreeRename } from './tree-controller-actions.js';
const clone = value => structuredClone(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const dataPath = value => Array.isArray(value) && value.every(part => typeof part === 'string' || Number.isSafeInteger(part) && part >= 0);
const descriptions = {
  'tree.actions': 'Inspect declared tree actions and their current availability at an existing node.',
  'tree.action': 'Perform an available declared tree action, insertion, duplication, removal, enable toggle, selection or inline rename through its normal controller.',
  'tree.rename.update': 'Change the current inline rename text without committing it.',
  'tree.rename.commit': 'Commit the pending inline rename through the same validation as Enter.',
  'tree.rename.cancel': 'Cancel the pending inline rename through the same handler as Escape.',
  'tree.reorder': 'Reorder two visible draggable siblings through the normal tree reorder transaction.',
  'tree.move': 'Use the application-declared special-item move transaction.',
  'schema.tool.state': 'Inspect the active registered authoring tool, raw draft and semantic control anchors.',
  'schema.tool.update': 'Update only the active tool draft or currently writable controls; preserve its trusted source and invalidate Preview.',
  'schema.tool.preview': 'Invoke the active authoring tool normal Preview and return its guarded readiness.',
  'schema.tool.apply': 'Invoke the active authoring tool normal Apply, requiring its current successful Preview.',
  'document.newDialog': 'Open the normal New model/project dialog and preserve its unsaved-change choice.',
  'document.saveAsDialog': 'Open the normal Save As dialog without submitting it.',
  'document.openPicker': 'Open the in-app FullMeta workspace document picker; no operating-system file dialog is used.',
  'workspace.picker.state': 'Inspect the active workspace picker, including its current listing, selection, owner and raw destination.',
  'workspace.picker.import': 'Open an available workspace import action in the current authoring dialog without clicking or reading a file.',
  'workspace.picker.navigate': 'Browse a canonical FullMeta workspace folder in the currently active picker.',
  'workspace.picker.more': 'Load the next offered workspace listing page through the visible More entries action.',
  'workspace.picker.update': 'Retain raw folder text or change the visible folder filter without accepting or reading a file.',
  'workspace.picker.select': 'Select an offered file or folder in the active workspace picker without accepting it.',
  'workspace.picker.accept': 'Accept the active workspace picker through the same owning Open, destination or import handler as its visible button.',
  'workspace.picker.cancel': 'Cancel the active workspace picker without opening, creating, saving or importing.',
  'document.fileDialog.state': 'Inspect the active New or Save As form, including raw fields and currently offered choices.',
  'document.fileDialog.update': 'Update raw fields of the active New or Save As form through its normal controller.',
  'document.fileDialog.browse': 'Open the normal in-app destination folder picker for the active New or Save As form.',
  'document.fileDialog.submit': 'Submit the active New or Save As form through its ordinary validation, unsaved-change and save guards.',
  'view.layout.state': 'Inspect the current workspace pane layout without changing document data.',
  'view.layout.set': 'Choose stacked or columns for the same Tree, Settings and Graphics panes; this changes presentation only.',
  'edit.inspect': 'Inspect the current normal text-editing target and menu availability without reading the system clipboard.',
  'edit.copy': 'Copy the selected text through the shared editor menu and return it without privileged clipboard access.',
  'edit.cut': 'Cut the current editable text selection through normal input events; preserve read-only and disabled guards.',
  'edit.paste': 'Paste explicit text into the current editable target through normal input events; never read the system clipboard from a tool.',
  'edit.selectAll': 'Select all text in the current normal editing target.',
  'help.open': 'Open the in-app documentation or About view without changing document data.',
  'help.close': 'Close the in-app Help view and restore its normal focus target.',
};
const pathSchema = { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'integer', minimum: 0 }] } };
const requiredArguments = { 'tree.action': ['action'], 'tree.rename.update': ['value'], 'tree.reorder': ['targetPath'], 'tree.move': ['destinationPath', 'index'], 'workspace.picker.import': ['key'], 'workspace.picker.navigate': ['folder'], 'workspace.picker.update': ['fields'], 'workspace.picker.select': ['path'], 'document.fileDialog.update': ['kind', 'fields'], 'document.fileDialog.browse': ['kind'], 'document.fileDialog.submit': ['kind'], 'view.layout.set': ['layout'], 'edit.paste': ['text'] };
export function describeAdditionalEditorCommands(names = Object.keys(descriptions)) {
  return names.filter(name => Object.hasOwn(descriptions, name)).map(name => ({ name, description: descriptions[name], inputSchema: { type: 'object', properties: {
    ...(['tree.actions','tree.action','tree.reorder','tree.move'].includes(name) ? { path: pathSchema, nodeId: { type: 'string' } } : {}),
    ...(name === 'tree.action' ? { action: { type: 'string' }, input: { type: 'object' } } : {}),
    ...(name === 'tree.rename.update' ? { value: { type: 'string' } } : {}),
    ...(name === 'tree.reorder' ? { targetPath: pathSchema, after: { type: 'boolean' } } : {}),
    ...(name === 'tree.move' ? { destinationPath: pathSchema, index: { type: 'integer', minimum: 0 } } : {}),
    ...(name.startsWith('schema.tool.') ? { id: { type: 'string' } } : {}),
    ...(name === 'schema.tool.update' ? { value: {}, draft: { type: 'object' }, controls: { type: 'array', items: { type: 'object' } } } : {}),
    ...(name === 'document.newDialog' ? { fromSchema: { type: 'boolean' } } : {}), expectedRevision: { type: 'integer', minimum: 0 },
    ...(name === 'document.openPicker' || name === 'workspace.picker.navigate' ? { folder: { type: 'string' } } : {}),
    ...(name === 'workspace.picker.select' ? { path: { type: 'string' } } : {}),
    ...(name === 'workspace.picker.import' ? { key: { type: 'string' }, folder: { type: 'string' } } : {}),
    ...(name === 'workspace.picker.update' ? { fields: { type: 'object', properties: { pathDraft: { type: 'string' }, filter: { type: 'string' } }, additionalProperties: false } } : {}),
    ...(name.startsWith('document.fileDialog.') && name !== 'document.fileDialog.state' ? { kind: { type: 'string', enum: ['new', 'saveAs'] } } : {}),
    ...(name === 'document.fileDialog.update' ? { fields: { type: 'object', properties: Object.fromEntries(['id', 'choice', 'folder', 'file'].map(name => [name, { type: 'string' }])), additionalProperties: false } } : {}),
    ...(name === 'view.layout.set' ? { layout: { type: 'string', enum: ['stacked', 'columns'] } } : {}),
    ...(name === 'edit.paste' ? { text: { type: 'string' } } : {}),
    ...(name === 'help.open' ? { section: { type: 'string', enum: ['docs', 'about'] } } : {}),
  }, ...(requiredArguments[name] ? { required: requiredArguments[name] } : {}), additionalProperties: false } }));
}

function assertIdle(context, { rename = false, dialog = null, parents = [] } = {}) {
  if (!context.model && !dialog) throw new Error('Open a document before editing.');
  if (context.operationProgress?.isBusy() || context.modelLoading || context.modelSaving || context.modelValidating) throw new Error('Finish the active editor transaction first.');
  if (context.treeRename && !rename) throw new Error('Commit or cancel the current tree rename first.');
  const open = [...(context.container?.ownerDocument || globalThis.document)?.querySelectorAll('dialog[open]') || []];
  const structureParent = dialog && context.schemaStructureDialogState ? context.schemaDialogControllers?.['schema-structure']?.dialog : null;
  if (open.some(node => node !== dialog && !parents.includes(node) && !(dialog !== structureParent && node === structureParent))) throw new Error('Complete or cancel the visible dialog first.');
}

const workspacePicker = context => context.workspacePicker;
const closedFileDialog = Object.freeze({ open: false });
export function inspectEditorFiles(context) {
  return clone({ path: context.openedDocumentPath?.() || null,
    picker: workspacePicker(context)?.inspect?.() || { open: false },
    dialog: context.inspectFileDialog?.() || closedFileDialog });
}
function canonicalWorkspacePath(value, { folder = false } = {}) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || value.startsWith('/') || value.split('/').some(part => !part || part === '..' || part === '.' && !(folder && value === '.'))) throw new Error('Use a canonical path relative to the FullMeta workspace.');
  return value;
}
function checkedWorkspacePicker(context) {
  const picker = workspacePicker(context), state = picker?.inspect?.();
  if (!picker?.dialog?.open || !state?.open) throw new Error('Open the in-app workspace picker first.');
  assertIdle(context, { dialog: picker.dialog, parents: [picker.ownerDialog].filter(Boolean) });
  return picker;
}
function pickerCommandState(context) {
  const state = inspectEditorFiles(context).picker;
  if (state.error) throw new Error(state.error);
  return state;
}
function fileCommandResult(result) {
  if (!record(result)) return clone(result);
  const { text, ...summary } = result;
  // Imported text is already staged in the owner's visible raw draft.
  return clone(summary);
}
function standardMenuCommand(context, name, args = {}) {
  if (typeof context.standardMenus?.dispatch !== 'function') throw new Error('This editor has no standard menu controller.');
  const allowed = name === 'edit.paste' ? ['text'] : name === 'help.open' ? ['section'] : [];
  if (!record(args) || Object.keys(args).some(key => !allowed.includes(key))) throw new Error('Use only the documented public menu arguments.');
  if (name === 'edit.paste' && typeof args.text !== 'string') throw new Error('Supply explicit paste text; tool commands do not read the system clipboard.');
  if (name === 'help.open' && args.section !== undefined && !['docs', 'about'].includes(args.section)) throw new Error('Choose docs or about.');
  return context.standardMenus.dispatch(name, args);
}
function checkedFileDialog(context, kind) {
  if (!['new', 'saveAs'].includes(kind)) throw new Error('Choose the active new or saveAs file form.');
  const state = context.inspectFileDialog?.(), dialog = context.$(kind === 'new' ? '#new-model-dialog' : '#save-as-dialog');
  if (!state?.open || state.kind !== kind || !dialog?.open) throw new Error('Open this file form first.');
  assertIdle(context, { dialog });
  if (state.busy) throw new Error('Wait for the current file transaction to finish.');
  return state;
}
function targetFor(context, { path = context.selectedPath, nodeId } = {}) {
  if (!dataPath(path) && !(typeof nodeId === 'string' && nodeId)) throw new Error('Choose an existing tree item path or node ID.');
  const node = context.debugTreeNode?.(path, nodeId);
  if (!node || node.enabled === false || node.readOnly || node.projection?.readOnly) throw new Error(node?.disabledReason || 'This tree item is unavailable or read only.');
  path = node.path || path;
  if (!dataPath(path) || context.valueAt(path) === undefined) throw new Error('The tree item no longer exists.');
  const element = context.schemaTreeButtonForSelection(path, node.projection || null);
  const collection=node.kind==='group'&&node.heading&&Array.isArray(context.valueAt(path));
  const arrayPath = collection?path:element?.dataset.arrayPath ? JSON.parse(element.dataset.arrayPath) : node.arrayPath || null;
  const target = context.treeActionPlans().menuTarget(collection?null:path, arrayPath);
  if (!target) throw new Error('The active application has no actions for this tree item.');
  return { node, element, path, target: { ...target, schemaProjection: node.projection || null } };
}
function actionEntries(context, target) {
  return context.treeActionPlans().menuEntries(target).filter(entry => !entry.separator).map(entry => {
    const availability = entry.available === false ? { disabled: false, reason: '' } : context.addActionAvailability(entry.action, target);
    return { action: entry.action, label: entry.label, disabled: Boolean(availability?.disabled), reason: availability?.reason || '' };
  });
}
function checkedTool(context, id) {
  if (context.activeApplicationPackage?.kind !== 'schemaDocument') throw new Error('Open a schema document before using an authoring tool.');
  if (!id) {
    const active = context.activeAuthoringTool?.id;
    id = context.schemaDialogControllers?.[active]?.dialog?.open ? active : Object.entries(context.schemaDialogControllers || {}).find(([, controller]) => controller.dialog?.open)?.[0];
  }
  const declared = coreSchemaDialogIds.includes(id) || context.schemaAuthoringTools().some(tool => tool.id === id);
  const controller = declared && context.schemaDialogControllers?.[id];
  if (!controller?.dialog?.open) throw new Error('Open this declared authoring tool first.');
  assertIdle(context, { dialog: controller.dialog });
  let state = controller.snapshot?.();
  if (state && !Object.hasOwn(state, 'source') && !Object.hasOwn(state.model || {}, 'source')) state = { ...state, source: clone(context.model) };
  if (state) validateDialogPrivateState(state, { source: context.model, toolId: id, provider: { applicationId: context.activeApplicationPackage.id, schemaPath: context.activeApplicationPackage.schemaPath } });
  return { id, controller, state };
}
function button(context, selector) {
  const node = context.$(selector);
  if (!node || node.disabled || node.hidden || node.closest('[hidden],.hidden,[inert]') || node.getAttribute('aria-disabled') === 'true') throw new Error('This file action is unavailable in the current editor state.');
  return node;
}

export function inspectAdditionalEditorAvailability(context, args = {}) {
  let treeReason = '', fileReason = '';
  try { assertIdle(context); if (context.jsonDraftDirty) treeReason = 'Apply or discard the current JSON draft before changing the tree.'; } catch (error) { treeReason = error.message; }
  try { assertIdle(context, { dialog: true }); } catch (error) { fileReason = error.message; }
  let tree;
  try { const { path, target } = targetFor(context, args); tree = { path, actions: actionEntries(context, target).map(action => treeReason ? { ...action, disabled: true, reason: treeReason } : action), ...(treeReason ? { reason: treeReason } : {}) }; }
  catch (error) { tree = { actions: [], reason: error.message }; }
  return { tree, rename: context.treeRename ? { path: clone(context.treeRename.path), value: context.treeRename.value, error: context.treeRename.error || '' } : null,
    tools: Object.entries(context.schemaDialogControllers || {}).filter(([, controller]) => controller.dialog?.open).map(([id, controller]) => { let reason = ''; try { assertIdle(context, { dialog: controller.dialog }); } catch (error) { reason = error.message; } return { id, open: true, preview: typeof controller.preview === 'function' || id === 'schema-authoring', apply: typeof controller.apply === 'function' || coreSchemaDialogIds.includes(id), available: !reason, ...(reason ? { reason } : {}) }; }),
    files: Object.fromEntries([['new', '#new-model'], ['saveAs', '#save-as'], ['open', '#open-project']].map(([id, selector]) => { let available = !fileReason; try { button(context, selector); } catch { available = false; } return [id, available]; })),
  };
}

export function createAdditionalEditorCommands(context) {
  const toolState = args => { const { id, controller, state } = checkedTool(context, args?.id); return { id, state: clone(state), surface: context.captureEditorDialogState(controller.dialog, { toolId: id }), readOnly: id === 'branch-audit' }; };
  return {
    'tree.actions': args => { assertIdle(context); return inspectAdditionalEditorAvailability(context, args); },
    'tree.action': args => {
      assertIdle(context); if (context.jsonDraftDirty) throw new Error('Apply or discard the current JSON draft before changing the tree.');
      const { target, path } = targetFor(context, args), entry = actionEntries(context, target).find(entry => entry.action === args.action);
      if (!entry || entry.disabled) throw new Error(entry?.reason || 'This action is not offered for the tree item.');
      context.applyCurrentSettingsDraft({ refresh: false, announce: true });
      const fresh = targetFor(context, args), current = actionEntries(context, fresh.target).find(entry => entry.action === args.action);
      if (!current || current.disabled) throw new Error(current?.reason || 'The tree action changed after committing Settings.');
      const action = args.action, input = args.input || {}; if (!record(input)) throw new Error('Tree action input must be an object.');
      if (action === 'schema.addChildItem' && context.activeApplicationPackage?.kind === 'schemaDocument') context.openSchemaAuthoringDialog(fresh.target);
      else {
        const inline = context.treeActionPlans().inlineEditForAction?.(action, fresh.target);
        if (inline) { if (context.startDeclaredTreeInlineEdit(action, fresh.target, inline) === false) throw new Error('This inline edit is unavailable.'); }
        else if (!context.performDeclaredTreeAction(action, fresh.target, input)) {
          if (action === 'rename') { if (!context.startRenameTreeItem(path)) throw new Error('This item has no editable name.'); }
          else if (action === 'delete') context.deleteTreeItem(path);
          else if (action === 'toggle-enabled') context.toggleTreeItemEnabled(path);
          else if (action === 'select-item') context.selectItem(fresh.node.label, path, fresh.element, fresh.node.projection || null);
          else context.performTreeInsertionAction(action, fresh.target);
        }
      }
      return { performed: action, path: clone(context.selectedPath), renamePending: Boolean(context.treeRename) };
    },
    'tree.rename.update': ({ value }) => { assertIdle(context, { rename: true }); if (!context.treeRename || typeof value !== 'string') throw new Error('Start a tree rename and supply its raw text.'); changeTreeRename(context, value); return { value }; },
    'tree.rename.commit': () => { assertIdle(context, { rename: true }); if (!context.treeRename) throw new Error('Start a tree rename first.'); commitTreeRename(context); if (context.treeRename) throw new Error(context.treeRename.error || 'The rename could not be committed.'); return { renamed: true, path: clone(context.selectedPath) }; },
    'tree.rename.cancel': () => { assertIdle(context, { rename: true }); if (!context.treeRename) throw new Error('There is no pending tree rename.'); cancelTreeRename(context); return { cancelled: true }; },
    'tree.reorder': ({ path, nodeId, targetPath, after = false }) => {
      assertIdle(context); const source = targetFor(context, { path, nodeId }), target = targetFor(context, { path: targetPath });
      if (!source.element?.classList.contains('tree-reorderable') || !target.element?.classList.contains('tree-reorderable') || typeof after !== 'boolean') throw new Error('Choose two visible draggable sibling items.');
      const section = source.element.closest('.tree-group'), arrayPath = context.treeArrayPathForItem(source.path);
      if (!section || target.element.closest('.tree-group') !== section || !same(arrayPath, context.treeArrayPathForItem(target.path))) throw new Error('Reorder only visible items in the same collection and tree section.');
      if (!context.reorderTreeItem({ sourcePath: source.path, arrayPath, section, sourceLabel: source.node.label }, target.element, after)) throw new Error('The normal reorder transaction did not move this item.');
      return { reordered: true, path: clone(context.selectedPath) };
    },
    'tree.move': ({ path, nodeId, destinationPath, index }) => {
      assertIdle(context); const source = targetFor(context, { path, nodeId }); if (!dataPath(destinationPath) || context.valueAt(destinationPath) === undefined || !Number.isSafeInteger(index) || index < 0) throw new Error('Choose an existing destination and nonnegative insertion index.');
      if (!context.moveSpecialTreeItem(source.path, destinationPath, index)) throw new Error('The active application does not allow this item move.'); return { moved: true, path: clone(context.selectedPath) };
    },
    'schema.tool.state': toolState,
    'schema.tool.update': async ({ id, value, draft, controls }) => {
      const current = checkedTool(context, id); if (current.id === 'branch-audit') throw new Error('The branch audit is read only.');
      const inputs = [value !== undefined, draft !== undefined, controls !== undefined].filter(Boolean).length; if (inputs !== 1) throw new Error('Supply exactly one value, structured draft or control update list.');
      if (controls !== undefined) {
        if (!Array.isArray(controls) || !controls.length) throw new Error('Supply at least one current control anchor.');
        const surface = context.captureEditorDialogState(current.controller.dialog, { toolId: current.id }), updates = [], used = new Set();
        const liveControls = [...current.controller.dialog.querySelectorAll('input,textarea,select')].filter(node => !node.closest('[data-editor-debug]') && !['file', 'password', 'submit', 'reset', 'button', 'image'].includes(node.tagName === 'INPUT' ? node.type : null));
        for (const change of controls) {
          if (!record(change) || !record(change.anchor)) throw new Error('Each control update needs a current semantic anchor.');
          const key = JSON.stringify(change.anchor), existing = surface.controls.find(control => same(control.anchor, change.anchor));
          const live = existing && liveControls[surface.controls.indexOf(existing)];
          if (!existing || !live || live.hidden || live.closest('[hidden],[inert]') || existing.disabled || existing.readOnly || used.has(key)) throw new Error('A requested control is missing, duplicated, hidden, disabled or read only.');
          used.add(key); const fields = ['value', 'checked', 'values'].filter(key => Object.hasOwn(change, key));
          if (fields.length !== 1 || !Object.hasOwn(existing, fields[0])) throw new Error('Use the current control value type.');
          if (fields[0] === 'checked' ? typeof change.checked !== 'boolean' : fields[0] === 'values' ? !Array.isArray(change.values) || !change.values.every(value => typeof value === 'string') : typeof change.value !== 'string') throw new Error('Control values must preserve their current raw type.');
          if (live.tagName === 'SELECT' && (fields[0] === 'values' ? change.values : [change.value]).some(value => ![...live.options].some(option => option.value === value && !option.disabled))) throw new Error('Choose an enabled option offered by the current control.');
          if (controls.length > 1 && !same(existing[fields[0]], change[fields[0]]) && (live.tagName === 'SELECT' || ['checkbox', 'radio'].includes(live.type) || live.classList.contains('structured-value-key'))) throw new Error('Change a structural choice, toggle or property name separately, then inspect its current control anchors; use value or draft for an atomic record update.');
          updates.push({ ...existing, [fields[0]]: clone(change[fields[0]]) });
        }
        const result = await context.restoreEditorDialogState(current.controller.dialog, { ...surface, controls: updates, details: [], scroll: [], focus: null });
        if (result.blocked?.length || result.missing?.length) throw new Error('One or more controls became unavailable during the normal update.');
      } else {
        if (current.state?.format !== 'fullmeta-schema-candidate-dialog/1') throw new Error('Use the current semantic controls or the validation batch commands for this tool.');
        const next = clone(current.state); next.draft = draft === undefined ? structuredValueDraft(value) : clone(draft); validateStructuredValueDraftShape(next.draft); next.hadPreview = false; next.status = ''; next.error = '';
        validateDialogPrivateState(next, { source: context.model, toolId: current.id });
        if (current.controller.updateDraft) current.controller.updateDraft(next.draft); else current.controller.restore(next);
      }
      return { updated: current.id, ...toolState({ id: current.id }) };
    },
    'schema.tool.preview': async ({ id } = {}) => {
      const current = checkedTool(context, id);
      if (current.id === 'schema-authoring') { await context.previewSchemaAuthoringOperation(); if (!context.schemaAuthoringDialogState?.preview) throw new Error(context.$('#schema-authoring-status')?.textContent || 'Preview failed.'); return { ready: true }; }
      if (typeof current.controller.preview !== 'function') throw new Error('This tool does not provide Preview.'); return await current.controller.preview();
    },
    'schema.tool.apply': async ({ id } = {}) => {
      const current = checkedTool(context, id);
      if (current.id === 'schema-authoring') { if (!context.schemaAuthoringDialogState?.preview) throw new Error('Preview the current schema operation first.'); await context.applySchemaAuthoringOperation(); if (current.controller.dialog.open) throw new Error(context.$('#schema-authoring-status')?.textContent || 'The schema operation was not applied.'); return { applied: true }; }
      if (current.id === 'schema-structure') { if (!context.finishSchemaStructureDialog({ apply: true })) throw new Error('The current structure draft could not be applied.'); return { applied: true }; }
      if (typeof current.controller.apply !== 'function') throw new Error('This tool does not provide Apply.'); return await current.controller.apply();
    },
    'document.newDialog': async ({ fromSchema = false } = {}) => { assertIdle(context, { dialog: true }); if (typeof fromSchema !== 'boolean') throw new Error('fromSchema must be a boolean.'); if (!fromSchema) button(context, '#new-model'); await context.openNewModelDialog({ fromSchema }); return { open: Boolean(context.$('#new-model-dialog')?.open), requiresUserSelection: !context.activeApplicationPackage }; },
    'document.saveAsDialog': () => { assertIdle(context); button(context, '#save-as'); context.openSaveAsDialog(); return { open: Boolean(context.$('#save-as-dialog')?.open) }; },
    'document.openPicker': async ({ folder } = {}) => { assertIdle(context, { dialog: true }); button(context, '#open-project'); if (folder !== undefined) canonicalWorkspacePath(folder, { folder: true }); await context.openWorkspaceModelPicker({ ...(folder === undefined ? {} : { folder }) }); return pickerCommandState(context); },
    'workspace.picker.state': () => inspectEditorFiles(context).picker,
    'workspace.picker.import': async ({key,folder}={})=>{
      const picker=workspacePicker(context),owner=[...(context.container?.ownerDocument||globalThis.document).querySelectorAll('dialog[open]')].filter(dialog=>dialog!==picker?.dialog).at(-1);
      if(!picker?.openImport||!owner)throw new Error('Open an authoring dialog with a registered workspace import action first.');
      assertIdle(context,{dialog:owner});
      if(typeof key!=='string'||!picker.inspect().availableImports?.some(entry=>entry.key===key&&entry.available))throw new Error('Choose an available import key from the current dialog.');
      if(folder!==undefined)canonicalWorkspacePath(folder,{folder:true});
      await picker.openImport(key,...(folder===undefined?[]:[{folder}]));return pickerCommandState(context);
    },
    'workspace.picker.navigate': async ({ folder }) => { const picker = checkedWorkspacePicker(context); canonicalWorkspacePath(folder, { folder: true }); await picker.navigate(folder); return pickerCommandState(context); },
    'workspace.picker.more': async () => { const picker = checkedWorkspacePicker(context); if (typeof picker.more !== 'function') throw new Error('This workspace picker has no next-page action.'); await picker.more(); return pickerCommandState(context); },
    'workspace.picker.update': ({ fields }) => { const picker = checkedWorkspacePicker(context); if (!record(fields) || !Object.keys(fields).length || Object.entries(fields).some(([key, value]) => !['pathDraft', 'filter'].includes(key) || typeof value !== 'string')) throw new Error('Use raw folder text or the current folder filter.'); for (const [key, value] of Object.entries(fields)) { if (typeof picker[key] !== 'function') throw new Error('This workspace picker does not offer that presentation field.'); picker[key](value); } return inspectEditorFiles(context).picker; },
    'workspace.picker.select': async ({ path }) => { const picker = checkedWorkspacePicker(context); canonicalWorkspacePath(path, { folder: true }); await picker.select(path); return inspectEditorFiles(context).picker; },
    'workspace.picker.accept': async () => { const picker = checkedWorkspacePicker(context); const result = await picker.accept(); return { ...(result === undefined ? {} : { result: fileCommandResult(result) }), ...inspectEditorFiles(context) }; },
    'workspace.picker.cancel': () => { const picker = checkedWorkspacePicker(context); picker.cancel(); return inspectEditorFiles(context).picker; },
    'document.fileDialog.state': () => inspectEditorFiles(context).dialog,
    'document.fileDialog.update': async ({ kind, fields }) => {
      checkedFileDialog(context, kind);
      const names = kind === 'new' ? ['id', 'choice', 'folder', 'file'] : ['file'];
      if (!record(fields) || !Object.keys(fields).length || Object.entries(fields).some(([key, value]) => !names.includes(key) || typeof value !== 'string')) throw new Error('Supply raw string fields offered by this file form.');
      await context.updateFileDialog({ kind, fields: clone(fields) }); return inspectEditorFiles(context).dialog;
    },
    'document.fileDialog.browse': async ({ kind }) => { checkedFileDialog(context, kind); if (kind !== 'new') throw new Error('Save As keeps the current document folder.'); await context.browseFileDialog({ kind }); return inspectEditorFiles(context).picker; },
    'document.fileDialog.submit': async ({ kind }) => { checkedFileDialog(context, kind); const result = await context.submitFileDialog({ kind }); const files = inspectEditorFiles(context); if (files.dialog.open) throw new Error(files.dialog.error || 'The file form did not complete; inspect its current validation.'); return { ...(result === undefined ? {} : { result: clone(result) }), ...files }; },
    'view.layout.state': () => clone(context.workspaceLayout?.inspect?.() || { available: false }),
    'view.layout.set': ({ layout }) => { if (!['stacked', 'columns'].includes(layout)) throw new Error('Choose the stacked or columns workspace layout.'); if (!context.workspaceLayout?.set) throw new Error('This editor has no workspace layout controller.'); context.workspaceLayout.set(layout); return clone(context.workspaceLayout.inspect()); },
    ...Object.fromEntries(['edit.inspect','edit.copy','edit.cut','edit.paste','edit.selectAll','help.open','help.close'].map(name=>[name,(args={})=>standardMenuCommand(context,name,args)])),
  };
}
