/** Data configuration for the shared controlled JSX annotation form. */
import { renderWidgetAnnotationEditor } from '../shared/design-annotation.js';
export const scanTableDesignLabel = 'Scan table';
export function renderScanTableDesignEditor(parent, schema, options = {}) {
  return renderWidgetAnnotationEditor(parent, schema, { ...options, source: options.source ?? schema, annotationKey: 'x-fullmeta-ui-scanTable', label: scanTableDesignLabel, heading: 'Scan table labels', ownedUiAnnotations: ['labels'], note: 'Each row uses scan. Open Item structure to edit its source and bindings.', fields: [
    { key: 'labels', label: 'Scan table labels', type: 'namedLabels', entries: [['addParameter', 'Add row button'], ['removeParameter', 'Remove row button'], ['parameterRemoveAriaLabelTemplate', 'Remove row accessibility label']] },
  ], validate(value) { if (value.labels !== undefined && (typeof value.labels !== 'object' || Array.isArray(value.labels) || Object.values(value.labels).some(text => typeof text !== 'string'))) throw new Error('Scan table labels must be text.'); } });
}
