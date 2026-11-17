// Generated from widget.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { renderLegacyWidgetMarkup } from "../shared/react/render-markup.js";
import { legacyFieldUiView, writeFieldUiBehavior } from "../../annotation-language.js";
import { QuantityVectorDefaultEditor, mountQuantityVectorDefaultEditor } from "./default-editor.js";
import { quantityVectorDesignLabel, renderQuantityVectorDesignEditor } from "./design-editor.js";
import { initialQuantityVectorValue } from "./value.js";
import { validateQuantityVectorAnnotation } from "./fullmeta-ui-quantityVector-1.schema.js";
function QuantityVector({ label, value, path = [], schema = {}, context = {}, ui = {}, renderField, onCommand, fields }) {
  const entries = Array.isArray(value) ? value : [], labels = Array.isArray(ui.componentLabels) ? ui.componentLabels : [];
  let descriptors = [], providerError = "";
  if (typeof ui.componentSource === "string") {
    try {
      const result = context.quantityVectorComponents?.(ui.componentSource, path) ?? [];
      if (!Array.isArray(result)) throw new Error("The component provider did not return a list.");
      descriptors = result;
      if (entries.length && !descriptors.length) providerError = "No vector component descriptors are available.";
    } catch (error) {
      providerError = error?.message || "The vector component provider failed.";
    }
  }
  const resolved = fields || entries.map((entry, index) => {
    const componentLabel = typeof labels[index] === "string" && labels[index].trim() ? labels[index] : descriptors[index]?.label || descriptors[index]?.symbol || null;
    const itemSchema = context.resolveSchema?.(context.schemaItem?.(schema, value, index)) || {};
    const itemView = legacyFieldUiView(itemSchema);
    const schemaNode = ui.unitReadOnly === true ? writeFieldUiBehavior({ ...itemView, "x-fullmeta-ui-quantity": {
      ...itemView["x-fullmeta-ui-quantity"] || {},
      unitReadOnly: true,
      defaultUnit: descriptors[index]?.unit || "1"
    } }, { context: "projectEditing" }) : itemSchema;
    return {
      label: componentLabel || String(index + 1),
      labelOverride: componentLabel,
      value: entry,
      path: [...path, index],
      schemaNode,
      context
    };
  });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label)), providerError ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2 }, /* @__PURE__ */ React.createElement("div", { role: "alert" }, "Could not load vector components: ", providerError))) : null, schema.description ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, schema.description)) : null, resolved.map((field, index) => /* @__PURE__ */ React.createElement(React.Fragment, { key: field.id || JSON.stringify(field.path) || index }, renderField?.({ ...field, onCommand }))));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(QuantityVector, { ...props, ...props.view });
}
const renderQuantityVector = (props) => renderLegacyWidgetMarkup(QuantityVector, props, ["renderField"]);
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  QuantityVector,
  QuantityVectorDefaultEditor,
  Widget,
  initialQuantityVectorValue,
  mountQuantityVectorDefaultEditor,
  mountWidget,
  quantityVectorDesignLabel,
  renderQuantityVector,
  renderQuantityVectorDesignEditor,
  validateQuantityVectorAnnotation
};

//# sourceMappingURL=widget.js.map
