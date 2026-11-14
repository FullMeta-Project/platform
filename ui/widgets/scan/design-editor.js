/** Widget configuration; the shared annotation form owns the JSX presentation. */
import { renderWidgetAnnotationEditor } from '../shared/design-annotation.js';
export const scanDesignLabel = 'Scan';
export function renderScanDesignEditor(parent, schema, options = {}) {
  return renderWidgetAnnotationEditor(parent, schema, { ...options, source: options.source ?? schema, annotationKey: 'x-fullmeta-ui-scan', label: scanDesignLabel, heading: 'Scan source and bindings', ownedUiAnnotations: ['labels'], fields: [
    { key: 'choiceSource', label: 'Choice', type: 'source', required: true, scopes: ['root', 'document', 'model', 'component', 'engine', 'runtime'], pathSegmentLabel: 'Choice path segment' },
    { key: 'choiceValueProperty', label: 'Choice value property', required: true },
    { key: 'rowChoiceProperty', label: 'Row choice property', required: true },
    { key: 'rowValuesProperty', label: 'Row values property', required: true },
    { key: 'sourceExpressionProperty', label: 'Source expression property (optional)' },
    { key: 'sourceUnitProperty', label: 'Source unit property (optional)' },
    { key: 'rangeStartProperty', label: 'Range start quantity property (optional)' },
    { key: 'rangeEndProperty', label: 'Range end quantity property (optional)' },
    { key: 'rangeCountProperty', label: 'Range count property (optional)' },
    { key: 'choiceLabelTemplate', label: 'Choice label template (optional)' },
    { key: 'labels', label: 'Scan labels', type: 'namedLabels', entries: [['parameterAriaLabelTemplate', 'Choice accessibility label'], ['valueRemoveAriaLabelTemplate', 'Remove value accessibility label'], ['removeValue', 'Remove value button'], ['addValuesTemplate', 'Add value button template']] },
  ], validate(value) {
    const range = [value.rangeStartProperty, value.rangeEndProperty, value.rangeCountProperty];
    if (range.some(name => name !== undefined) && (range.some(name => typeof name !== 'string' || !name.trim()) || new Set(range).size !== 3)) throw new Error('Complete all three distinct range property bindings.');
    if (!['root', 'document', 'model', 'component', 'engine', 'runtime'].includes(value.choiceSource?.scope) || !Array.isArray(value.choiceSource?.path) || !value.choiceSource.path.length || value.choiceSource.path.some(part => typeof part !== 'string' || !part.trim()) || ['choiceValueProperty', 'rowChoiceProperty', 'rowValuesProperty'].some(key => typeof value[key] !== 'string' || !value[key].trim())) throw new Error('Choose a source scope and path, and complete the scan property bindings.');
  } });
}
