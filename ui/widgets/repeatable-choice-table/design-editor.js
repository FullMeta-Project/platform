import { renderWidgetAnnotationEditor } from "../shared/design-annotation.js";
import { validateRepeatableChoiceTableAnnotation } from "./fullmeta-ui-repeatableChoiceTable-1.schema.js";

export const repeatableChoiceTableDesignLabel = "Repeatable choice table";

export function renderRepeatableChoiceTableDesignEditor(parent, schema, {
  source, state,
} = {}) {
  return renderWidgetAnnotationEditor(parent, schema, {
    source, state,
    annotationKey: "x-fullmeta-ui-repeatableChoiceTable",
    label: repeatableChoiceTableDesignLabel,
    heading: repeatableChoiceTableDesignLabel,
    ownedUiAnnotations: ["labels"],
    fields: [
      { key: "choiceSource", label: "Choice source", type: "source", required: true,
        properties: [{ key: "valueProperty", label: "Value property" }] },
      { key: "choiceValueProperty", label: "Choice value property" },
      { key: "choiceAssignments", label: "Choice assignments", type: "stringMap" },
      { key: "uniqueBy", label: "Unique row property" },
      { key: "labels", label: "Column labels", type: "stringMap" },
      { key: "addLabel", label: "Add row button" },
      { key: "removeLabel", label: "Remove row button" },
      { key: "generatedIdProperty", label: "Generated ID property", advanced: true },
      { key: "generatedIdTemplate", label: "Generated ID template", advanced: true },
      { key: "generatedIdPrefix", label: "Generated ID prefix", advanced: true },
      { key: "rowDefaults", label: "Row defaults", type: "typedMap", advanced: true },
      { key: "siblingMirrors", label: "Sibling mirrors", type: "stringMap", advanced: true },
      { key: "choiceLabelTemplate", label: "Choice label template", advanced: true },
      { key: "choiceDescriptionTemplate", label: "Choice description template", advanced: true },
      { key: "rowLabelTemplate", label: "Row label template", advanced: true },
      { key: "removeAriaLabelTemplate", label: "Remove accessibility label template", advanced: true },
      { key: "ariaLabel", label: "Table accessibility label", advanced: true },
      { key: "helpText", label: "Help text", advanced: true },
      { key: "emptyMessage", label: "Empty message", advanced: true },
      { key: "noChoicesMessage", label: "No choices message", advanced: true },
      { key: "noUniqueChoiceMessage", label: "No unique choice message", advanced: true },
      { key: "noAvailableChoicesMessage", label: "No available choices message", advanced: true },
      { key: "invalidChoiceMessage", label: "Invalid choice message", advanced: true },
      { key: "duplicateChoiceMessage", label: "Duplicate choice message", advanced: true },
      { key: "changeMessage", label: "Change message", advanced: true },
      { key: "removeMessage", label: "Remove message", advanced: true },
      { key: "minimumRowsMessage", label: "Minimum rows message", advanced: true },
      { key: "maximumRowsMessage", label: "Maximum rows message", advanced: true },
      { key: "addMessage", label: "Add message", advanced: true },
      { key: "addMessageTemplate", label: "Add message template", advanced: true },
    ],
    validate(value) {
      const errors = validateRepeatableChoiceTableAnnotation(value);
      if (errors.length) throw new Error(errors[0]);
    },
  });
}
