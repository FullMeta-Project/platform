import { renderWidgetAnnotationEditor } from "../shared/design-annotation.js";
import { renderNumberMapDefault } from "../shared/number-map-default.js";
import { validateTabularSliceSelectorAnnotation } from "./fullmeta-ui-tabularSliceSelector-1.schema.js";

export const tabularSliceSelectorDesignLabel = "Tabular slice selector";

export function renderTabularSliceSelectorDesignEditor(parent, schema, { source, state, defaultState } = {}) {
  const editor = renderWidgetAnnotationEditor(parent, schema, {
    source, state,
    annotationKey: "x-fullmeta-ui-tabularSliceSelector",
    label: tabularSliceSelectorDesignLabel,
    heading: "Tabular slice selector",
    ownedUiAnnotations: ["labels", "showDefault", "defaultWhenSiblingPropertyPresent"],
    fields: [
      { key: "selectionMode", label: "Selection mode", options: ["fixed", "slice"], required: true },
      { key: "dataSource", label: "Data source", type: "source", required: true,
        scopes: ["root", "document", "component", "engine", "runtime"] },
      { key: "varyingColumnProperty", label: "Varying column property", visibleWhen: value => value.selectionMode === "slice" },
      { key: "unitProperty", label: "Unit property", visibleWhen: value => value.selectionMode === "slice" },
      { key: "tableIdProperty", label: "Table ID property override", advanced: true },
      { key: "ownerIdProperty", label: "Owner ID property override", advanced: true },
      { key: "fixedValuesProperty", label: "Fixed values property override", advanced: true },
      { key: "showDefault", label: "Show selector when model value is absent", type: "boolean", advanced: true },
      { key: "defaultWhenSiblingPropertyPresent", label: "When absent, show if sibling property is present", advanced: true,
        visibleWhen: value => value.showDefault !== true },
      { key: "labels", label: "Control labels", type: "namedLabels", advanced: true,
        entries: [["varyingColumn", "Varying column"], ["allValues", "All values"], ["fixedValue", "Fixed value"]] },
      { key: "emptyMessage", label: "No data message", advanced: true },
      { key: "noChoicesMessage", label: "No choices message", advanced: true },
      { key: "helpText", label: "Help text", advanced: true },
      { key: "selectionAdjustedMessage", label: "Adjusted selection message", advanced: true },
      { key: "changeMessage", label: "Change confirmation message", advanced: true },
    ],
    validate(value) {
      const errors = validateTabularSliceSelectorAnnotation(value);
      if (errors.length) throw new Error(errors[0]);
    },
  });
  if (!editor) return null;
  const defaultField = renderNumberMapDefault(parent, { source, state: defaultState, label: "Initial fixed values" });
  return { ...editor, handlesDefault: true, fields: [...editor.fields, defaultField] };
}
