import { renderWidgetAnnotationEditor } from "../shared/design-annotation.js";

export const relatedFieldsDesignLabel = "Related fields";

export function renderRelatedFieldsDesignEditor(parent, schema, { source, state } = {}) {
  return renderWidgetAnnotationEditor(parent, schema, {
    source, state,
    annotationKey: "x-fullmeta-ui-relatedFields",
    label: relatedFieldsDesignLabel,
    heading: "Related fields",
    fields: [
      { key: "siblings", label: "Sibling fields", type: "siblings", required: true },
    ],
    validate(value) {
      if (!Array.isArray(value.siblings) || !value.siblings.length
        || value.siblings.some(sibling => !Array.isArray(sibling?.path) || !sibling.path.length
          || sibling.path.some(part => typeof part !== "string" || !part.trim())
          || sibling.label !== undefined && (typeof sibling.label !== "string" || !sibling.label.trim()))) {
        throw new Error("Related fields need sibling paths, each as a nonempty JSON string array.");
      }
    },
  });
}
