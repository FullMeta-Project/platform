import { renderWidgetAnnotationEditor } from "../shared/design-annotation.js";
import { validateKeyedChoiceMatrixAnnotation } from "./fullmeta-ui-keyedChoiceMatrix-1.schema.js";

export const keyedChoiceMatrixDesignLabel = "Keyed choice matrix";

export function renderKeyedChoiceMatrixDesignEditor(parent, schema, { source, state, context } = {}) {
  const focused = context?.presentation === "focused";
  return renderWidgetAnnotationEditor(parent, schema, {
    source, state,
    annotationKey: "x-fullmeta-ui-keyedChoiceMatrix",
    label: keyedChoiceMatrixDesignLabel,
    heading: "Keyed choice matrix",
    ownedUiAnnotations: ["choiceLabels"],
    fields: [
      { key: "choiceSource", label: "Choice source", type: "source", required: true,
        scopes: ["root", "document", "model", "component", "engine", "runtime"],
        properties: [
          ...(focused ? [] : [{ key: "valueProperty", label: "Value property" }]),
          { key: "schemaFilter", label: "Filter records by schema annotation", summary: "Filter choices by model context (optional)", type: "schemaFilter", advanced: focused },
        ] },
      { key: "choiceKeyProperty", label: "Choice key property", required: true },
      { key: "valueMapProperty", label: "Value map property", required: true },
      { key: "omittedValue", label: "Omitted value", required: true },
      { key: "choiceLabels", label: "Choice labels", type: "stringMap" },
      { key: "addLabel", label: "Add row button" },
      { key: "removeLabel", label: "Remove row button" },
      { key: "choiceLabelTemplate", label: "Choice label template", advanced: true },
      { key: "rowLabelTemplate", label: "Row label template", advanced: true },
      { key: "removeAriaLabelTemplate", label: "Remove accessibility label template", advanced: true },
      { key: "choiceAriaLabelTemplate", label: "Choice accessibility label template", advanced: true },
      { key: "choiceSetProperty", label: "Choice set property", advanced: true },
      { key: "choiceSetsByValue", label: "Choice sets by value", type: "stringListMap", advanced: true },
      { key: "initialChoiceByValue", label: "Initial choice by value", type: "initialChoice", advanced: true },
      { key: "initialChoiceValue", label: "Initial choice value", advanced: true },
      { key: "candidateLimit", label: "Candidate limit", type: "integer", advanced: true },
      { key: "noChoicesMessage", label: "No choices message", advanced: true },
      { key: "noUniqueChoiceMessage", label: "No unique choice message", advanced: true },
      { key: "missingChoiceLabel", label: "Missing choice label", advanced: true },
      { key: "missingChoiceLabelTemplate", label: "Missing choice label template", advanced: true },
      { key: "choiceHelp", label: "Choice help", advanced: true },
      { key: "summaryLabelTemplate", label: "Summary label template", advanced: true },
      { key: "summaryHelp", label: "Summary help", advanced: true },
      { key: "summaryCodes", label: "Summary codes", type: "stringMap", advanced: true },
      { key: "helpText", label: "Help text", advanced: true },
      { key: "changeMessage", label: "Change message", advanced: true },
      { key: "addMessage", label: "Add message", advanced: true },
      { key: "removeKeyMessage", label: "Remove key message", advanced: true },
      { key: "minimumRowsMessage", label: "Minimum rows message", advanced: true },
      { key: "maximumRowsMessage", label: "Maximum rows message", advanced: true },
    ],
    validate(value) {
      const errors = validateKeyedChoiceMatrixAnnotation(value);
      if (errors.length) throw new Error(errors[0]);
    },
  });
}
