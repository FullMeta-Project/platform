/** Controlled form composition and pure value declaration compatibility checks. */
import {renderWidgetDesignEditor} from '../shared/design-editor.js';
import {schemaWidget} from '../shared/schema-widget.js';
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const structuredFieldTypes=new Set(['json','choices','stringMap','stringList']);
const mounts=new WeakMap();
function readField(field) {
  field.validateDraft?.();
  const text = field.input.value;
  if (text === field.original) return { changed: false };
  let value = text === "" ? undefined : structuredFieldTypes.has(field.type) ? JSON.parse(text)
    : field.type === "number" || field.type === "count" ? Number(text)
    : field.type === "boolean" ? text === "true" : text;
  if (value !== undefined) {
    if (["number", "count"].includes(field.type) && !Number.isFinite(value)) {
      throw new Error(`${field.label} must be a finite number.`);
    }
    if (field.keys.at(-1) === "enum" && !Array.isArray(value)) {
      throw new Error("Allowed values must be a JSON array.");
    }
    // The default must be checked against the resulting enum and type after
    // all widget fields are applied, rather than the values captured at mount.
    if (!(field.keys.length === 1 && field.keys[0] === "default")) field.validate?.(value);
  }
  return { changed: true, value };
}

function putField(target, keys, value) {
  if (!keys.length) throw new Error("Widget fields must have a declaration path.");
  let owner = target;
  for (const key of keys.slice(0, -1)) {
    if (!isObject(owner[key])) {
      if (value === undefined) return;
      owner[key] = {};
    }
    owner = owner[key];
  }
  if (value === undefined) delete owner[keys.at(-1)];
  else owner[keys.at(-1)] = value;
}

function sameJsonValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => sameJsonValue(value, right[index]));
  }
  if (!isObject(left) || !isObject(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every(key => Object.hasOwn(right, key) && sameJsonValue(left[key], right[key]));
}

function matchesType(value, type) {
  if (Array.isArray(type)) return type.some(part => matchesType(value, part));
  switch (type) {
    case "null": return value === null;
    case "array": return Array.isArray(value);
    case "object": return isObject(value);
    case "integer": return Number.isInteger(value);
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "string": return typeof value === "string";
    case "boolean": return typeof value === "boolean";
    default: return true;
  }
}

function matchesArrayDeclaration(value, declaration) {
  if (!Array.isArray(value)) return true;
  if (Number.isInteger(declaration.minItems) && value.length < declaration.minItems) return false;
  if (Number.isInteger(declaration.maxItems) && value.length > declaration.maxItems) return false;
  const itemType = isObject(declaration.items) ? declaration.items.type : undefined;
  return value.every(item => matchesType(item, itemType));
}

export function validateSchemaValueDeclarationCompatibility(previous, next) {
  if (!isObject(next) || !["type", "items", "enum", "default", "minItems", "maxItems"]
    .some(key => !sameJsonValue(previous?.[key], next[key]))) return;
  if (Array.isArray(next.enum) && next.enum.some(value =>
    !matchesType(value, next.type) || !matchesArrayDeclaration(value, next))) {
    throw new Error("Allowed values must match the field type.");
  }
  if (!Object.hasOwn(next, "default")) return;
  if (!matchesType(next.default, next.type) || !matchesArrayDeclaration(next.default, next)) {
    throw new Error("Default value must match the field type and array limits.");
  }
  if (Array.isArray(next.enum) && !next.enum.some(value => sameJsonValue(value, next.default))) {
    throw new Error("Choose one of the allowed default values.");
  }
}
export const validateValueControlDeclarationCompatibility=validateSchemaValueDeclarationCompatibility;

/** Adapt controlled descriptor state to the existing source-anchored commit contract. */
export function mountValueControlDesignAuthoring({ container, declaration, state, onDraftChange } = {}) {
  if (!container || typeof container.replaceChildren !== 'function') throw new Error('Choose a container for the value-control design editor.');
  if (!isObject(declaration) || schemaWidget(declaration) !== 'valueControl') throw new Error('Value-control design requires a value-control schema declaration.');
  mounts.get(container)?.dispose();
  const values = state instanceof Map ? new Map(state) : new Map(Object.entries(isObject(state?.fields) ? state.fields : isObject(state) ? state : {}));
  if (Array.isArray(state?.numericDefaults)) {
    const previous = values.get('Value control default'); values.set('Value control default', { value: typeof previous === 'string' ? previous : previous?.value,
      numericTexts: state.numericDefaults });
  }
  if (state?.typedMapTexts || state?.siblingMatches) {
    const previous = values.get('Value control');
    if (typeof previous === 'string') values.set('Value control', { value: previous, legacyRaw: { typedMap: state.typedMapTexts, siblingMatches: state.siblingMatches } });
  }
  const layer = document.createElement('div'); layer.className = 'schema-value-control-design'; layer.dataset.schemaValueControlDesign = ''; container.replaceChildren(layer);
  const editor = renderWidgetDesignEditor(layer, 'valueControl', declaration, { source: declaration, draftState: values });
  if (!editor) throw new Error('Could not open the value-control design editor.');
  const snapshot = () => ({ fields: Object.fromEntries(editor.fields.map(field => [field.label, field.snapshotState ? field.snapshotState() : field.snapshot ? field.snapshot() : field.input.value])) });
  const changed = () => onDraftChange?.(snapshot()); layer.addEventListener('input', changed); layer.addEventListener('change', changed);
  let disposed = false;
  const api = { snapshot, ownedUiAnnotations: editor.ownedUiAnnotations || [], handlesChoices: editor.handlesChoices === true, handlesDefault: editor.handlesDefault === true,
    dispose() { if (disposed) return; disposed = true; mounts.delete(container); layer.removeEventListener('input', changed); layer.removeEventListener('change', changed);
      try { editor.dispose?.(); } finally { layer.remove(); } },
    commit(source = declaration) {
      if (!isObject(source)) throw new Error('Value-control design requires a schema object.');
      const next = structuredClone(source);
      for (const field of [...editor.fields.filter(field => structuredFieldTypes.has(field.type)), ...editor.fields.filter(field => !structuredFieldTypes.has(field.type))]) {
        const result = readField(field); if (result.changed) putField(next, field.keys, result.value);
      }
      validateValueControlDeclarationCompatibility(source, next); return next;
    } };
  mounts.set(container, api); return api;
}
