import { quantityDesignLabel, renderQuantityDesignEditor } from "../quantity/widget.js";
import { quantityVectorDesignLabel, renderQuantityVectorDesignEditor } from "../quantity-vector/widget.js";
import { scanDesignLabel, renderScanDesignEditor } from "../scan/widget.js";
import { scanTableDesignLabel, renderScanTableDesignEditor } from "../scan-table/widget.js";
import { referenceSelectorDesignLabel, renderReferenceSelectorDesignEditor } from "../reference-selector/widget.js";
import { relatedFieldsDesignLabel, renderRelatedFieldsDesignEditor } from "../related-fields/widget.js";
import { dynamicPropertySetDesignLabel, renderDynamicPropertySetDesignEditor } from "../dynamic-property-set/widget.js";
import { tabularSliceSelectorDesignLabel, renderTabularSliceSelectorDesignEditor } from "../tabular-slice-selector/widget.js";
import { repeatableChoiceTableDesignLabel, renderRepeatableChoiceTableDesignEditor } from "../repeatable-choice-table/widget.js";
import { matchesDesignCondition, renderWidgetAnnotationEditor } from "./design-annotation.js";
import { renderConfiguredArrayDesignEditor } from "./configured-array-design-editor.js";
import { renderConfiguredDefaultValueDesignEditor } from "./configured-default-value-design-editor.js";
import { renderSchemaValueFormDesignEditor } from "./schema-value-form-design-editor.js";
import { validateUiContractValue } from "../../schemas/contract-validation.js";
import { valueControlDesignLabel, renderValueControlDesignEditor } from "../value-control/widget.js";
import { treeDesignLabel, renderTreeDesignEditor } from "../tree/widget.js";

/** Widget-owned authoring controls used by the application-neutral designer. */
const editors = Object.freeze({
  quantity: { label: quantityDesignLabel, render: renderQuantityDesignEditor },
  quantityVector: { label: quantityVectorDesignLabel, render: renderQuantityVectorDesignEditor },
  scan: { label: scanDesignLabel, render: renderScanDesignEditor },
  scanTable: { label: scanTableDesignLabel, render: renderScanTableDesignEditor },
  referenceSelector: { label: referenceSelectorDesignLabel, render: renderReferenceSelectorDesignEditor },
  relatedFields: { label: relatedFieldsDesignLabel, render: renderRelatedFieldsDesignEditor },
  dynamicPropertySet: { label: dynamicPropertySetDesignLabel, render: renderDynamicPropertySetDesignEditor },
  tabularSliceSelector: { label: tabularSliceSelectorDesignLabel, render: renderTabularSliceSelectorDesignEditor },
  repeatableChoiceTable: { label: repeatableChoiceTableDesignLabel, render: renderRepeatableChoiceTableDesignEditor },
  valueControl: { label: valueControlDesignLabel, render: renderValueControlDesignEditor },
  tree: { label: treeDesignLabel, render: renderTreeDesignEditor },
});

function configuredFields(fields, context, conditionContext = {}) {
  const focused = context?.presentation === "focused";
  const values = conditionContext.annotation || {};
  const advanced = field => field.advanced === true || focused && field.advancedWhenFocused === true
    || field.advancedWhen && matchesDesignCondition(values, field.advancedWhen, conditionContext);
  return (Array.isArray(fields) ? fields : [])
    .filter(field => !(focused && field.omitWhenFocused))
    .map(field => ({
      ...field,
      advanced: Boolean(advanced(field)),
      properties: Array.isArray(field.properties) ? field.properties
        .filter(property => !(focused && property.omitWhenFocused))
        .map(property => ({
          ...property,
          advanced: Boolean(advanced(property)),
        })) : field.properties,
    }));
}

function draftAnnotation(source, state, annotationKey) {
  if (typeof state === "string") {
    try {
      const parsed = JSON.parse(state);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch { /* Keep the last valid annotation for conditional presentation. */ }
  }
  return source?.[annotationKey] || {};
}

function configuredValidation(authoring, annotationKey) {
  const contract = authoring.validationContractDocument;
  if (!contract) return undefined;
  return value => {
    const errors = validateUiContractValue(value, contract, contract.properties[annotationKey], annotationKey);
    if (errors.length) throw new Error(errors[0]);
  };
}

export function hasWidgetDesignEditor(widget) {
  return Object.hasOwn(editors, widget);
}

export function renderWidgetDesignEditor(parent, widget, schema, { source, draftState, context, configuration } = {}) {
  const authoring = configuration?.authoring;
  if (authoring?.mode === "tree") {
    return renderTreeDesignEditor(parent, schema, {
      source, state: draftState?.get(authoring.heading || treeDesignLabel), configuration,
    });
  }
  if (authoring?.mode === "configuredArray") {
    return renderConfiguredArrayDesignEditor(parent, schema, {
      source, state: draftState?.get(authoring.annotationLabel),
      defaultState: draftState?.get(authoring.defaultLabel), context, configuration,
      validate: configuredValidation(authoring, configuration.annotation),
    });
  }
  if (authoring?.mode === "schemaValueForm") {
    const annotationKey = configuration.annotation;
    const annotationState = draftState?.get(authoring.label);
    const annotation = draftAnnotation(source, annotationState, annotationKey);
    return renderSchemaValueFormDesignEditor(parent, schema, {
      source, annotationKey, annotationState,
      defaultState: draftState?.get(authoring.defaultValue?.label),
      choicesState: draftState?.get(authoring.choices?.fieldLabel),
      context, configuration,
      fields: configuredFields(authoring.fields, context, { schema, source, annotation }),
      validate: configuredValidation(authoring, annotationKey),
    });
  }
  if (authoring?.mode === "annotationForm") {
    const validate = configuredValidation(authoring, configuration.annotation);
    const renderAnnotation = () => renderWidgetAnnotationEditor(parent, schema, {
      source, state: draftState?.get(authoring.label), annotationKey: configuration.annotation,
      label: authoring.label, heading: authoring.heading, groups: authoring.groups,
      advancedHeading: authoring.advancedHeading, note: authoring.note,
      ownedUiAnnotations: authoring.ownedUiAnnotations,
      fields: configuredFields(authoring.fields, context, {
        schema, source, annotation: draftAnnotation(source, draftState?.get(authoring.label), configuration.annotation),
      }), context, validate,
    });
    const renderDefault = () => authoring.defaultValue && renderConfiguredDefaultValueDesignEditor(parent, schema, {
      source, state: draftState?.get(authoring.defaultValue.label), context,
      annotationKey: configuration.annotation, configuration: authoring.defaultValue,
    });
    const before = authoring.defaultValue?.position === "beforeAnnotation";
    const first = before ? renderDefault() : renderAnnotation();
    const second = before ? renderAnnotation() : renderDefault();
    const annotation = before ? second : first;
    const defaultField = before ? first : second;
    if (!annotation && !authoring.defaultValue) return null;
    return {
      annotationKey: configuration.annotation,
      ownedUiAnnotations: annotation?.ownedUiAnnotations || authoring.ownedUiAnnotations || [],
      handlesDefault: Boolean(authoring.defaultValue),
      fields: [...(annotation?.fields || []), ...(defaultField ? [defaultField] : [])],
      dispose() { annotation?.dispose?.(); defaultField?.dispose?.(); },
    };
  }
  const editor = editors[widget || (Object.hasOwn(source || {}, "x-fullmeta-ui-tree") ? "tree" : "")];
  return editor?.render(parent, schema, {
    source,
    state: draftState?.get(editor.label),
    defaultState: draftState?.get(`${editor.label} default`),
    choicesState: draftState?.get(`${editor.label} choices`),
    context,
    configuration,
  }) ?? null;
}
