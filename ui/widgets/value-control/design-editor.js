import { renderSchemaValueFormDesignEditor } from "../shared/schema-value-form-design-editor.js";
import { validateValueControlAnnotation } from "./fullmeta-ui-valueControl-1.schema.js";

export const valueControlDesignLabel = "Value control";

/** Keep the original widget designer available outside configured schema authoring. */
export function renderValueControlDesignEditor(parent, schema, {
  source, state, defaultState, choicesState,
} = {}) {
  const annotationKey = "x-fullmeta-ui-valueControl";
  const annotation = source?.[annotationKey];
  if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) return null;
  const hasLocalChoices = Object.hasOwn(source, "enum");
  const isFreeText = schema?.type === "string" && !hasLocalChoices && !annotation.choiceSource;
  const configuration = {
    annotation: annotationKey,
    authoring: {
      label: valueControlDesignLabel,
      ownedUiAnnotations: ["placeholder", "choiceLabels", "choiceSource", "optionalToggleLabel", "hiddenWhenSiblingPropertyEquals"],
      defaultValue: {
        control: "jsonSchemaTyped", key: "default", label: `${valueControlDesignLabel} default`,
      },
      choices: {
        key: "enum", labelsKey: "choiceLabels", editLabels: true,
        label: "Allowed values and display labels",
        fieldLabel: `${valueControlDesignLabel} choices`,
        labelsFieldLabel: `${valueControlDesignLabel} choice labels`,
      },
    },
  };
  const fields = [
    { key: "optionalToggleLabel", label: "Presence toggle label", advanced: !annotation.optionalToggleLabel },
    { key: "hiddenWhenSiblingPropertyEquals", label: "Hide when sibling equals", type: "siblingCondition",
      advanced: !annotation.hiddenWhenSiblingPropertyEquals },
    { key: "placeholder", label: "Placeholder", advanced: !isFreeText },
    ...((isFreeText || annotation.multiline !== undefined)
      ? [{ key: "multiline", label: "Multiple lines", type: "boolean", advanced: !isFreeText }] : []),
    ...(!hasLocalChoices ? [{ key: "choiceLabels", label: "Choice labels", type: "stringMap", advanced: true }] : []),
    { key: "choiceSource", label: "Choice source", type: "source", advanced: !annotation.choiceSource,
      scopes: ["root", "document", "model", "component", "engine", "runtime"],
      properties: [{ key: "valueProperty", label: "Value property" }, { key: "labelTemplate", label: "Label template" }] },
    { key: "onChangeAction", label: "Change action", advanced: true },
  ];
  return renderSchemaValueFormDesignEditor(parent, schema, {
    source, annotationKey, annotationState: state, defaultState, choicesState,
    configuration, fields,
    validate(value) {
      const errors = validateValueControlAnnotation(value);
      if (errors.length) throw new Error(errors[0]);
    },
  });
}
