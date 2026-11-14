/** Quantity-vector authoring is a configuration of the shared controlled array editor. */
import { renderConfiguredArrayDesignEditor } from '../shared/configured-array-design-editor.js';
export const quantityVectorDesignLabel = 'Quantity vector';
export function renderQuantityVectorDesignEditor(parent, schema, options = {}) {
  const { configuration, context = {} } = options, authoring = configuration?.authoring || {};
  if (authoring.arrayTable || authoring.variantEditor) return renderConfiguredArrayDesignEditor(parent, schema, options);
  const rows = authoring.componentRows || {};
  const columns = rows.columns?.length ? rows.columns : [
    { source: 'componentLabels', control: 'text', cell: 'rowHeader', ariaLabelTemplate: 'Component {index} label' },
    { source: 'default', control: 'quantityValue', ariaLabelTemplate: 'Component {index} default' },
  ];
  const configured = { annotation: configuration?.annotation || 'x-fullmeta-ui-quantityVector', authoring: {
    ...authoring, annotationLabel: quantityVectorDesignLabel, defaultLabel: quantityVectorDesignLabel + ' default',
    variantEditor: { sourceKey: 'componentSource', control: 'quantityValue', valueShape: 'object', unitReadOnly: true,
      fields: authoring.componentSourceFields || [{ key: 'componentSource', control: 'text', label: 'Component source' },
        { key: 'unitReadOnly', control: 'checkbox', label: "Use the component's declared unit" }],
      variantLabelPath: ['label'], componentsPath: ['components'], componentLabelPath: ['label'], componentKeyPath: ['key'],
      initialValueFields: [{ source: 'variantKeyed', path: ['expressions'], valueKey: 'expression' },
        { source: 'component', path: ['unit'], valueKey: 'unit' }], sourceRequiredMessage: 'Choose a nonempty component source.' },
    arrayTable: { ...rows, rowLabelsKey: 'componentLabels', defaultValueKey: 'default',
      minimumItemsFallback: authoring.minimumItemsFallback ?? 1, maximumEditableItems: authoring.maximumEditableComponents ?? 32,
      omitAnnotationKeysWhenSaving: ['label'], heading: rows.heading || authoring.labels?.defaultValuesHeading || 'Default values',
      ariaLabel: rows.ariaLabel || authoring.labels?.componentTable || 'Quantity vector labels and default values',
      clearDefault: rows.clearDefault || authoring.labels?.clearDefault || 'Clear default',
      columns: columns.map(column => ({ ...column, source: column.source === 'componentLabels' ? 'rowLabel' : 'defaultValue' })),
      defaultValueFields: [{ valueKey: 'expression', targetProperty: 'expression', type: 'string', required: true },
        { valueKey: 'unit', targetProperty: 'unit', type: 'string', required: true, choicesSource: 'itemSchema', controlOption: 'allowedUnits' }],
      labelsValidationMessage: 'Each quantity vector component needs a nonempty label.',
      defaultValidationMessage: 'Complete the quantity vector default from the first component, or clear it.' },
  } };
  return renderConfiguredArrayDesignEditor(parent, schema, { ...options, configuration: configured, context: {
    ...context, schemaVariants: context.schemaVariants || context.componentVariants,
    schemaVariantCopy: context.schemaVariantCopy || context.componentVariantCopy,
    applySchemaVariant: context.applySchemaVariant || ((variant, values) => context.applyComponentVariant?.(variant,
      Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.expression])))),
    saveSchemaVariant: context.saveSchemaVariant || context.saveComponentVariant,
  } });
}
