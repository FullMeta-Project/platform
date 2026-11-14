/** Data-only presentation projections; validation and operations are host services. */
import { fieldUiBehavior } from '../../../annotation-language.js';
import { jsonPointerFromPath } from '../../../../js/services.js';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const serializable = value => {
  if (value === undefined) return undefined;
  const ancestors = new Set();
  const copy = entry => {
    if (entry === undefined) return undefined;
    if (['function', 'symbol', 'bigint'].includes(typeof entry)) throw new Error('View state must contain only serializable data.');
    if (typeof entry === 'number' && !Number.isFinite(entry)) throw new Error('View state numbers must be finite.');
    if (entry === null || typeof entry !== 'object') return entry;
    if (ancestors.has(entry)) throw new Error('View state cannot contain cyclic references.');
    if (!Array.isArray(entry) && ![Object.prototype, null].includes(Object.getPrototypeOf(entry)))
      throw new Error('DOM nodes, services and graphics resources do not belong in view state.');
    ancestors.add(entry);
    const result = Array.isArray(entry) ? entry.map(copy) : Object.fromEntries(Object.entries(entry)
      .filter(([, value]) => value !== undefined).map(([key, value]) => [key, copy(value)]));
    ancestors.delete(entry); return result;
  };
  return copy(value);
};
const scalarType = (declaration, value) => {
  const types = Array.isArray(declaration.type) ? declaration.type : [declaration.type];
  if (types.length === 1 && ['string', 'number', 'integer', 'boolean'].includes(types[0])) return types[0];
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'json';
};
const keyLabel = value => String(value).replace(/([a-z])([A-Z])/g, '$1 $2');

/** Resolve primitive/default field presentation without mutating absent values.
 * Specialized widgets retain their declared ID/settings for their own mount adapter.
 */
export function projectSettingsFields(schema = {}, value = {}, { path = [], schemaPath = [], diagnostics = [], context = 'projectEditing' } = {}) {
  const required = new Set(schema.required || []);
  return Object.entries(schema.properties || {}).map(([key, declaration]) => {
    if (!record(declaration)) declaration = {};
    const present = record(value) && Object.hasOwn(value, key), actual = present ? value[key] : undefined;
    const dataPath = [...path, key], sourcePath = [...schemaPath, 'properties', key];
    const behavior = fieldUiBehavior(declaration, { context }), presentation = behavior?.payload?.presentation || {};
    const type = scalarType(declaration, actual);
    const matches = diagnostics.filter(diagnostic => {
      const target = diagnostic?.path ?? diagnostic?.dataPath;
      return Array.isArray(target) ? same(target, dataPath)
        : typeof target === 'string' && [jsonPointerFromPath(dataPath), jsonPointerFromPath(sourcePath)].includes(target);
    });
    const error = matches.filter(diagnostic => diagnostic.severity !== 'warning').map(diagnostic => diagnostic.message || String(diagnostic)).join('\n');
    const field = { key, id: `field-${encodeURIComponent(JSON.stringify(dataPath))}`, label: declaration.title || keyLabel(key),
      type, value: type === 'json' ? actual === undefined ? '' : JSON.stringify(actual, null, 2) : actual ?? '', rawValue: serializable(actual),
      present, required: required.has(key), path: dataPath, dataPath, schemaPath: sourcePath,
      dataPointer: jsonPointerFromPath(dataPath), schemaPointer: jsonPointerFromPath(sourcePath),
      readOnly: declaration.readOnly === true || Object.hasOwn(declaration, 'const'), hidden: presentation.hidden === true,
      help: declaration.description || '', error: error || undefined, minimum: declaration.minimum, maximum: declaration.maximum,
      step: declaration.multipleOf, defaultHint: Object.hasOwn(declaration, 'default') ? serializable(declaration.default) : undefined,
      placeholder: presentation.placeholder || (Object.hasOwn(declaration, 'default') ? `Default: ${JSON.stringify(declaration.default)}` : ''),
      multiline: presentation.multiline === true, widget: serializable(behavior?.payload?.widget),
      reference: serializable(declaration['x-fullmeta-modelReference']), diagnostics: serializable(matches) };
    if (Array.isArray(declaration.enum)) field.choices = declaration.enum.map(option => ({ value: serializable(option),
      label: String(presentation.choiceLabels?.[String(option)] ?? (record(option) || Array.isArray(option) ? JSON.stringify(option) : option)) }));
    return serializable(field);
  });
}

/** A dialog's state and action bindings are inspectable without mounting it. */
export function projectDialogView({ id, title, description = '', open = false, phase = 'draft', targetPath = [],
  actions = [], diagnostics = [], preview } = {}) {
  return serializable({ format: 'fullmeta-dialog-view/1', id, title, description, open: Boolean(open), phase,
    targetPath, targetPointer: jsonPointerFromPath(targetPath), actions: actions.map(action => ({ id: action.id,
      label: action.label, description: action.description, disabled: Boolean(action.disabled), primary: Boolean(action.primary),
      binding: action.binding || action.command || action.id })), diagnostics, preview });
}

/** Projection of declared graphics controls. Canvas and operation services stay external. */
export function projectGraphicsControlView({ controls = [], values = {}, availability = {}, path = [], schemaPath = [],
  serviceMode = 'live', operation = null } = {}) {
  if (!['live', 'fixture'].includes(serviceMode)) throw new Error('Graphics controls require an explicit live or fixture service mode.');
  return serializable({ format: 'fullmeta-graphics-controls/1', serviceMode, operation,
    controls: controls.map(control => ({ ...control, id: control.id || control.key,
      kind: control.kind || (control.action || control.command ? 'action' : 'field'),
      path: [...path, control.key || control.id], schemaPath: [...schemaPath, control.key || control.id],
      value: Object.hasOwn(values, control.key || control.id) ? values[control.key || control.id] : control.value,
      disabled: availability[control.id]?.disabled ?? Boolean(control.disabled),
      binding: control.binding || control.command || control.action || null })) });
}
