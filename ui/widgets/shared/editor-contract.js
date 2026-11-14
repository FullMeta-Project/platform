import { loadWidgetCatalogs } from './catalog.js';
import { validateUiContractValue } from '../../schemas/contract-validation.js';

/** Resolve an editor ID to a catalog public interface; schema data never supplies executable code. */
export async function resolveEditorWidget({ schema, schemaUrl, defaultWidget = 'modelEditor', loadJson } = {}) {
  const catalog = await loadWidgetCatalogs({ schema, schemaUrl, loadJson });
  const declaration = schema?.['x-fullmeta-ui-editor'] ?? { widget: defaultWidget };
  return { ...editorWidgetSelection(declaration, catalog), catalog };
}

export function editorWidgetSelection(declaration, catalog) {
  if (!declaration || typeof declaration !== 'object' || Array.isArray(declaration)
    || typeof declaration.widget !== 'string'
    || Object.keys(declaration).some(key => !['widget', 'options'].includes(key))) {
    throw new Error('Editor declaration requires a widget ID and optional configuration.');
  }
  const widget = catalog.widgets.find(entry => entry.id === declaration.widget);
  if (!widget?.editor || !widget.exports.includes(widget.editor.mount)) {
    throw new Error(`Widget ${declaration.widget} does not declare an editor mount interface.`);
  }
  const options = declaration.options ?? {};
  const contract = widget.editor.options || { type: 'object', additionalProperties: false };
  const issues = validateUiContractValue(options, contract, contract, 'editor/options');
  if (issues.length) throw new Error(issues[0]);
  return { widget, options: structuredClone(options) };
}
