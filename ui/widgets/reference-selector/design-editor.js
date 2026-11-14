import { renderWidgetAnnotationEditor } from "../shared/design-annotation.js";

export const referenceSelectorDesignLabel = "Reference selector";

export function renderReferenceSelectorDesignEditor(parent, schema, { source, state } = {}) {
  return renderWidgetAnnotationEditor(parent, schema, {
    source, state,
    annotationKey: "x-fullmeta-ui-referenceSelector",
    label: referenceSelectorDesignLabel,
    heading: "Reference selector",
    fields: [
      { key: "maxVisibleOptions", label: "Maximum visible options", type: "integer" },
      { key: "emptyMessage", label: "Empty message" },
    ],
    validate(value) {
      if (value.maxVisibleOptions !== undefined && (value.maxVisibleOptions < 2 || value.maxVisibleOptions > 20)) {
        throw new Error("Maximum visible options must be between 2 and 20.");
      }
    },
  });
}
