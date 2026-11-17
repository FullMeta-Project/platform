// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { quantityDesignLabel, renderQuantityDesignEditor } from "./design-editor.js";
import { validateQuantityAnnotation } from "./fullmeta-ui-quantity-1.schema.js";
function QuantityUnitControl({ value, path = [], schema = {}, context = {}, label, onChange, onCommand, disabled = false }) {
  const unitSchema = context.resolveSchema?.(context.schemaProperty?.(schema, value, "unit")) || {};
  const allowed = context.unitChoices?.(schema, unitSchema, value) || (Array.isArray(unitSchema.enum) ? unitSchema.enum : context.defaultUnits || []);
  const units = context.compatibleUnits?.(value || "1", allowed) || allowed;
  const unavailable = value !== void 0 && value !== null && (!allowed.includes(value) || !units.includes(value));
  return /* @__PURE__ */ React.createElement(
    "select",
    {
      "data-setting-path": JSON.stringify([...path, "unit"]),
      "data-setting-type": "string",
      "aria-label": label + " unit",
      value: value ?? "",
      disabled,
      onChange: (event) => onCommand ? onCommand({
        type: "field.change",
        path: [...path, "unit"],
        value: event.target.value,
        rawValue: event.target.value,
        valueType: "string"
      }, event) : (onChange || context.onChange)?.({ path: [...path, "unit"], value: event.target.value, type: "string" }, event)
    },
    unavailable ? /* @__PURE__ */ React.createElement("option", { value }, "Unavailable (", value, ")") : null,
    units.filter((unit) => !unavailable || unit !== value).map((unit) => /* @__PURE__ */ React.createElement("option", { key: unit, value: unit }, unit))
  );
}
function Quantity({ label, value, path = [], schema = {}, context = {}, ui = {}, onChange, onCommand, disabled = false }) {
  const expression = value?.expression ?? "", unit = value?.unit ?? ui.defaultUnit ?? "1";
  const readOnly = schema.readOnly === true || ui.readOnly === true;
  return /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, label), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { className: "setting-inline" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: expression,
      "aria-label": label + " expression",
      placeholder: ui.placeholder,
      readOnly,
      disabled,
      "aria-readonly": readOnly ? "true" : void 0,
      ...!readOnly ? { "data-setting-path": JSON.stringify([...path, "expression"]), "data-setting-type": "string" } : {},
      onChange: (event) => onCommand ? onCommand({
        type: "field.change",
        path: [...path, "expression"],
        value: event.target.value,
        rawValue: event.target.value,
        valueType: "string"
      }, event) : (onChange || context.onChange)?.({ path: [...path, "expression"], value: event.target.value, type: "string" }, event)
    }
  ), readOnly || ui.unitReadOnly ? /* @__PURE__ */ React.createElement("span", { className: "setting-unit-value" }, unit) : /* @__PURE__ */ React.createElement(QuantityUnitControl, { ...{ value: unit, path, schema, context, label, onChange, onCommand, disabled } })), schema.description ? /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, schema.description) : null));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(Quantity, { ...props, ...props.view });
}
const renderQuantity = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(Quantity, { ...props }));
const renderQuantityUnitControl = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(QuantityUnitControl, { ...props }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  Quantity,
  QuantityUnitControl,
  Widget,
  mountWidget,
  quantityDesignLabel,
  renderQuantity,
  renderQuantityDesignEditor,
  renderQuantityUnitControl,
  validateQuantityAnnotation
};

//# sourceMappingURL=widget.js.map
