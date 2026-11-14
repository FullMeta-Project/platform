/** Pure composition of shared JSX authoring adapters. */
import { renderWidgetAnnotationEditor } from './design-annotation.js';
import { createJsonChoiceTable } from '../json-choice-table/widget.js';
import { renderTypedDefaultEditor } from './typed-default-editor.js';
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

/** Compose an annotation form, an optional local enum, and a typed schema default. */
export function renderSchemaValueFormDesignEditor(parent, schema, {
  source, annotationKey, annotationState, defaultState, choicesState,
  context, configuration, fields, validate,
} = {}) {
  const authoring = configuration?.authoring || {};
  const annotation = source?.[annotationKey];
  if (!isObject(annotation)) return null;
  const defaultField = renderTypedDefaultEditor(parent, schema, source, defaultState, authoring.defaultValue);
  const choiceConfig = authoring.choices;
  const hasLocalChoices = Boolean(choiceConfig && Object.hasOwn(source, choiceConfig.key || "enum"));
  const choicesFields = [], disposers = [];
  if(defaultField?.dispose)disposers.push(defaultField.dispose);
  if (hasLocalChoices) {
    const choiceKey = choiceConfig.key || "enum";
    const labelsKey = choiceConfig.labelsKey || "choiceLabels";
    const choices = createJsonChoiceTable({
      value: source[choiceKey], state: choicesState,
      label: choiceConfig.label || "Allowed values and display labels",
      editLabels: choiceConfig.editLabels === true,
      choiceLabels: annotation[labelsKey],
    });
    parent.append(choices.element);
    if(choices.dispose)disposers.push(choices.dispose);
    choicesFields.push({
      label: choiceConfig.fieldLabel || choiceConfig.label || "Allowed values",
      keys: [choiceKey], type: "choices", input: choices,
      original: source[choiceKey] === undefined ? "" : JSON.stringify(source[choiceKey], null, 2),
      snapshot: choices.snapshot,
    });
    if (choiceConfig.editLabels === true) choicesFields.push({
      label: choiceConfig.labelsFieldLabel || "Choice labels",
      keys: [annotationKey, labelsKey], type: "json",
      input: { get value() { return choices.choiceLabelsValue; } },
      original: annotation[labelsKey] === undefined ? "" : JSON.stringify(annotation[labelsKey]),
      snapshot: choices.snapshot,
      validate(value) {
        if (!isObject(value) || Object.values(value).some(label => typeof label !== "string" || !label.trim())) {
          throw new Error(choiceConfig.labelsMessage || "Each choice display label must be nonempty text.");
        }
      },
    });
  }
  const editor = renderWidgetAnnotationEditor(parent, schema, {
    source, state: annotationState, annotationKey,
    label: authoring.label, heading: authoring.heading,
    advancedHeading: authoring.advancedHeading,
    ownedUiAnnotations: authoring.ownedUiAnnotations,
    fields, groups: authoring.groups, context, validate,
  });
  if (!editor) return null;
  return {
    ...editor,
    dispose(){editor.dispose?.();for(const dispose of disposers)dispose();},
    handlesDefault: Boolean(defaultField), handlesChoices: hasLocalChoices,
    fields: [...editor.fields, ...(defaultField ? [defaultField] : []), ...choicesFields],
  };
}
