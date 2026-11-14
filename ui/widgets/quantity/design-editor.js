/** Widget-specific authoring configuration; shared JSX forms own the controls. */
import { renderWidgetAnnotationEditor } from '../shared/design-annotation.js';
import { renderConfiguredDefaultValueDesignEditor } from '../shared/configured-default-value-design-editor.js';
const annotationKey = 'x-fullmeta-ui-quantity';
export const quantityDesignLabel = 'Quantity';
export function renderQuantityDesignEditor(parent, schema, { source, state, defaultState, context } = {}) {
  const fields = [];
  const defaultField = renderConfiguredDefaultValueDesignEditor(parent, schema, { source, state: defaultState, context, annotationKey,
    configuration: { control: 'quantityValue', key: 'default', label: 'Quantity default', heading: 'Default value',
      clearLabel: 'Clear default', controlLabel: 'Default quantity', defaultUnitFromAnnotation: 'defaultUnit',
      hideWhenInheritedWithoutLocalValue: true, unitChoices: { schemaProperty: 'unit', merge: 'intersection' },
      validationMessage: 'Complete the quantity default expression and unit, or clear it.' } });
  if (defaultField) fields.push(defaultField);
  const editor = renderWidgetAnnotationEditor(parent, schema, { source, state, context, annotationKey,
    label: quantityDesignLabel, heading: 'UI annotations', advancedHeading: 'Field behavior',
    ownedUiAnnotations: ['hidden', 'optionalToggleLabel', 'createWithProperties', 'clearWithProperties'],
    fields: [
      { key: 'unitGroup', label: 'Unit group' }, { key: 'defaultUnit', label: 'Default unit' },
      { key: 'unitReadOnly', label: 'Unit read only', type: 'boolean' },
      { key: 'hidden', label: 'Hidden in the model editor', type: 'boolean', advanced: true },
      { key: 'optionalToggleLabel', label: 'Optional toggle label', advanced: true },
      { key: 'createWithProperties', label: 'Create with properties', type: 'stringList', advanced: true },
      { key: 'clearWithProperties', label: 'Clear with properties', type: 'stringList', advanced: true },
    ],
    validate(value) {
      if (value.label !== undefined && (typeof value.label !== 'string' || !value.label.trim())
        || value.unitReadOnly !== undefined && typeof value.unitReadOnly !== 'boolean'
        || value.unitGroup !== undefined && (typeof value.unitGroup !== 'string' || !value.unitGroup.trim())
        || value.defaultUnit !== undefined && (typeof value.defaultUnit !== 'string' || !value.defaultUnit.trim())
        || value.hidden !== undefined && typeof value.hidden !== 'boolean'
        || value.optionalToggleLabel !== undefined && (typeof value.optionalToggleLabel !== 'string' || !value.optionalToggleLabel.trim())
        || ['createWithProperties', 'clearWithProperties'].some(key => value[key] !== undefined
          && (!Array.isArray(value[key]) || value[key].some(part => typeof part !== 'string' || !part.trim()))))
        throw new Error('Quantity settings need valid labels, units, and property lists.');
    } });
  if (editor) fields.push(...editor.fields);
  return { annotationKey, handlesDefault: true, usesPropertyLabel: true,
    ownedUiAnnotations: ['hidden', 'optionalToggleLabel', 'createWithProperties', 'clearWithProperties'], fields,
    dispose() { editor?.dispose?.(); defaultField?.dispose?.(); } };
}
