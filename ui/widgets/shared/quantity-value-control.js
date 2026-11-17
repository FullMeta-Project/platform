// Generated from quantity-value-control.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
function QuantityValueControl({ draft, allowedUnits = [], label = "Quantity", unitReadOnly = false, onChange, disabled = false }) {
  const units = [...new Set(allowedUnits.filter(Boolean))];
  if (draft.unit && !units.includes(draft.unit)) units.push(draft.unit);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      "data-quantity-role": "expression",
      placeholder: "\u27E8expression\u27E9",
      value: draft.expression,
      disabled,
      "aria-label": label + " expression",
      onChange: (event) => onChange({ ...draft, expression: event.target.value }, event)
    }
  ), unitReadOnly ? /* @__PURE__ */ React.createElement("span", { className: "setting-unit-value", "data-quantity-role": "unit" }, draft.unit) : allowedUnits.length ? /* @__PURE__ */ React.createElement(
    "select",
    {
      className: "schema-design-unit-button",
      "data-quantity-role": "unit",
      value: draft.unit,
      disabled,
      "aria-label": label + " unit",
      onChange: (event) => onChange({ ...draft, unit: event.target.value }, event)
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "\u27E8unit\u27E9"),
    units.map((unit) => /* @__PURE__ */ React.createElement("option", { key: unit, value: unit }, unit, allowedUnits.includes(unit) ? "" : " (not in schema)"))
  ) : /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "schema-design-unit-button",
      "data-quantity-role": "unit",
      type: "text",
      placeholder: "\u27E8unit\u27E9",
      value: draft.unit,
      disabled,
      "aria-label": label + " unit",
      onChange: (event) => onChange({ ...draft, unit: event.target.value }, event)
    }
  ));
}
function createQuantityValueControl(options = {}) {
  let configuration = options, draft = {
    expression: typeof options.value?.expression === "string" ? options.value.expression : "",
    unit: typeof options.value?.unit === "string" ? options.value.unit : options.defaultUnit || ""
  }, mount;
  const element = document.createElement("div");
  element.className = "setting-inline schema-design-quantity";
  const props = () => ({ ...configuration, draft, onChange(next, event) {
    draft = next;
    mount.update(props());
    configuration.onInput?.(event);
  } });
  mount = mountReactComponent(element, QuantityValueControl, props());
  return {
    element,
    get expression() {
      return element.querySelector('[data-quantity-role="expression"]');
    },
    get unit() {
      return element.querySelector('[data-quantity-role="unit"]');
    },
    value: () => ({ ...draft }),
    snapshot: () => ({ ...draft }),
    clear() {
      draft = { expression: "", unit: configuration.unitReadOnly ? draft.unit : "" };
      mount.update(props());
      configuration.onInput?.();
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    update(next) {
      configuration = { ...configuration, ...next };
      if (next.value) draft = { ...next.value };
      mount.update(props());
    },
    dispose: () => mount.dispose()
  };
}
export {
  QuantityValueControl,
  createQuantityValueControl
};

//# sourceMappingURL=quantity-value-control.js.map
