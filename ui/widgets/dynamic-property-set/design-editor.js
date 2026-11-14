import { renderWidgetAnnotationEditor } from "../shared/design-annotation.js";

export const dynamicPropertySetDesignLabel = "Dynamic property set";

export function renderDynamicPropertySetDesignEditor(parent, schema, { source, state } = {}) {
  return renderWidgetAnnotationEditor(parent, schema, {
    source, state,
    annotationKey: "x-fullmeta-ui-dynamicPropertySet",
    label: dynamicPropertySetDesignLabel,
    heading: "Dynamic property set",
    fields: [
      { key: "source", label: "Property source", required: true },
      { key: "groupLabel", label: "Property group label" },
      { key: "emptyMessage", label: "Empty message" },
    ],
  });
}
