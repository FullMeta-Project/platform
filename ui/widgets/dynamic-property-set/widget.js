// Generated from widget.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { renderLegacyWidgetMarkup } from "../shared/react/render-markup.js";
import { dynamicPropertySetDesignLabel, renderDynamicPropertySetDesignEditor } from "./design-editor.js";
import { validateDynamicPropertySetAnnotation } from "./fullmeta-ui-dynamicPropertySet-1.schema.js";
function DynamicPropertySet({ label, value, path = [], schema = {}, context = {}, ui = {}, renderField, renderObject, onCommand, fields: suppliedFields }) {
  let providerError = "", providerInvoked = suppliedFields != null;
  let descriptors = suppliedFields;
  if (descriptors == null && context.dynamicPropertySet) {
    providerInvoked = true;
    try {
      descriptors = context.dynamicPropertySet(ui.source, { label, value, path, schema });
    } catch (error) {
      providerError = error instanceof Error ? error.message : String(error);
      descriptors = [];
    }
  }
  if (!providerError && providerInvoked) {
    if (descriptors && typeof descriptors.then === "function") providerError = "The provider returned an asynchronous response; it must return descriptors synchronously.";
    else if (!Array.isArray(descriptors)) providerError = "The provider did not return a descriptor list.";
    else if (descriptors.some((field) => !field || typeof field.key !== "string" || !field.key || !field.schema || typeof field.schema !== "object" || Array.isArray(field.schema))) providerError = "The provider returned malformed field descriptors.";
    else if (new Set(descriptors.map((field) => field.key)).size !== descriptors.length) providerError = "The provider returned duplicate field keys.";
  }
  const fields = providerError ? [] : Array.isArray(descriptors) ? descriptors : [];
  const keys = fields.map((field) => field.key), identity = renderObject?.({ value, path, schemaNode: schema, context, skip: keys, onCommand });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, identity, providerError ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, role: "alert", className: "settings-empty" }, "Could not load dynamic fields: ", providerError)) : fields.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, ui.groupLabel || label || schema.title || "Properties")), fields.map((field) => /* @__PURE__ */ React.createElement(React.Fragment, { key: field.key }, renderField?.({
    label: field.label || field.schema.title || field.key,
    value: Object.hasOwn(value || {}, field.key) ? value[field.key] : field.default,
    present: Object.hasOwn(value || {}, field.key),
    defaultHint: field.default,
    path: [...path, field.key],
    schemaNode: field.schema,
    context,
    onCommand
  })))) : ui.emptyMessage ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, ui.emptyMessage)) : null);
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(DynamicPropertySet, { ...props, ...props.view });
}
const renderDynamicPropertySet = (props) => renderLegacyWidgetMarkup(DynamicPropertySet, props, ["renderField", "renderObject"]);
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  DynamicPropertySet,
  Widget,
  dynamicPropertySetDesignLabel,
  mountWidget,
  renderDynamicPropertySet,
  renderDynamicPropertySetDesignEditor,
  validateDynamicPropertySetAnnotation
};

//# sourceMappingURL=widget.js.map
