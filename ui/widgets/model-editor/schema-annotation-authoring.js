/** Compose controlled widget authoring and lossless declaration transactions. No field DOM reads. */
import { renderWidgetDesignEditor } from '../shared/design-editor.js';
import { validateSchemaValueDeclarationCompatibility } from './schema-value-control-authoring.js';
import { FIELD_UI_BEHAVIOR_KEY, fieldUiBehavior, legacyFieldUiView, writeFieldUiBehavior } from '../../annotation-language.js';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const structured = new Set(['json', 'choices', 'stringMap', 'stringList']), mounts = new WeakMap();
function putField(target, keys, value) {
  if (!keys.length) throw new Error('Widget fields must have a declaration path.');
  let owner = target;
  for (const key of keys.slice(0, -1)) { if (!object(owner[key])) { if (value === undefined) return; owner[key] = {}; } owner = owner[key]; }
  if (value === undefined) delete owner[keys.at(-1)]; else owner[keys.at(-1)] = value;
}
export function mountSchemaAnnotationAuthoring({ container, declaration, widget, state, context, configuration, fieldContext, onDraftChange } = {}) {
  if (!container || typeof container.replaceChildren !== 'function' || !object(declaration)) throw new Error('Choose a schema declaration for the widget designer.');
  mounts.get(container)?.dispose();
  const layer = document.createElement('div'); layer.className = 'schema-annotation-design'; layer.dataset.schemaAnnotationDesign = widget; container.replaceChildren(layer);
  const draftState = state instanceof Map ? state : new Map(Object.entries(object(state) ? state : {})), view = legacyFieldUiView(declaration);
  const legacyRaw = object(state?.__schemaAnnotationRawInputs) ? state.__schemaAnnotationRawInputs : null;
  if (legacyRaw) for (const [label, value] of draftState) if (typeof value === 'string') draftState.set(label, { value, legacyRaw });
  const editor = renderWidgetDesignEditor(layer, widget, view, { source: view, draftState, context, configuration });
  if (!editor) throw new Error('The ' + widget + ' designer cannot edit this declaration.');
  const snapshot = () => Object.fromEntries(editor.fields.map(field => [field.label,
    field.snapshotState ? field.snapshotState() : field.snapshot ? field.snapshot() : field.input.value]));
  const changed = () => onDraftChange?.(snapshot()); layer.addEventListener('input', changed); layer.addEventListener('change', changed);
  let disposed = false;
  const api = { annotationKey: 'widget', annotationPath: [FIELD_UI_BEHAVIOR_KEY, 'payload', 'widget'],
    ownedUiAnnotations: editor.ownedUiAnnotations || [], handlesDefault: editor.handlesDefault === true, handlesChoices: editor.handlesChoices === true, snapshot,
    dispose() { if (disposed) return; disposed = true; layer.removeEventListener('input', changed); layer.removeEventListener('change', changed);
      if (mounts.get(container) === api) mounts.delete(container);
      try { editor.dispose?.(); } finally { layer.remove(); } },
    commit(source = declaration) {
      if (!object(source)) throw new Error('The schema declaration is no longer an object.');
      const next = legacyFieldUiView(source);
      for (const field of [...editor.fields.filter(field => structured.has(field.type)), ...editor.fields.filter(field => !structured.has(field.type))]) {
        field.validateDraft?.(); const text = field.input.value; if (text === field.original) continue;
        let value; try { value = text === '' ? undefined : structured.has(field.type) ? JSON.parse(text) : text; } catch { throw new Error(field.label + ' must be valid JSON.'); }
        if (value !== undefined) field.validate?.(value); putField(next, field.keys, value);
      }
      if (configuration?.authoring?.declarationValidator === 'schemaValue') validateSchemaValueDeclarationCompatibility(source, next);
      return writeFieldUiBehavior(next, { context: fieldUiBehavior(source)?.context || fieldContext || 'projectEditing' });
    } };
  mounts.set(container, api); return api;
}
