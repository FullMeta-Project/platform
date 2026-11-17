// Generated from configured-default-value-design-editor.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
import { QuantityValueControl } from "./quantity-value-control.js";
import { renderNumberMapDefault } from "./number-map-default.js";
function schemaPropertyChoices(context, configuration) {
  const property = configuration?.schemaProperty;
  if (!property) return [];
  let choices = [], initialized = false;
  for (const part of context?.parts || []) {
    if (!part.schema?.properties?.[property]) continue;
    const child = context.child(part, "properties", property), rule = child && context.resolve(child).schema;
    const permitted = typeof rule?.const === "string" ? [rule.const] : Array.isArray(rule?.enum) ? rule.enum.filter((value) => typeof value === "string") : null;
    if (permitted) {
      choices = !initialized ? permitted : configuration.merge === "union" ? [.../* @__PURE__ */ new Set([...choices, ...permitted])] : choices.filter((value) => permitted.includes(value));
      initialized = true;
    }
  }
  return choices;
}
function ConfiguredDefaultValueEditor({ view, onCommand }) {
  const { configuration: copy, draft, defaultUnit, allowedUnits } = view;
  return /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail" }, copy.heading ? /* @__PURE__ */ React.createElement("h3", null, copy.heading) : null, /* @__PURE__ */ React.createElement("div", { className: "setting-inline schema-design-quantity" }, /* @__PURE__ */ React.createElement(
    QuantityValueControl,
    {
      draft,
      allowedUnits,
      label: copy.controlLabel || copy.label || "Default value",
      onChange: (draft2, event) => onCommand({ type: "default.quantity", draft: draft2 }, event)
    }
  )), copy.clearLabel ? /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "sd-widget-clear-default",
      hidden: !draft.expression.trim() && (!draft.unit || draft.unit === defaultUnit),
      onClick: (event) => onCommand({ type: "default.clear" }, event)
    },
    copy.clearLabel
  ) : null);
}
function renderConfiguredDefaultValueDesignEditor(parent, schema, { source, state, context, annotationKey, configuration } = {}) {
  if (configuration?.control === "numberMap") {
    const field = renderNumberMapDefault(parent, {
      source,
      state,
      key: configuration.key || "default",
      label: configuration.heading || configuration.label || "Initial values",
      labels: configuration.labels,
      validationMessage: configuration.validationMessage
    });
    if (field && configuration.label) field.label = configuration.label;
    return field;
  }
  if (configuration?.control !== "quantityValue") return null;
  const key = configuration.key || "default";
  if (configuration.hideWhenInheritedWithoutLocalValue && context?.inheritedWidgetSource && !Object.hasOwn(source || {}, key)) return null;
  const original = Object.hasOwn(source || {}, key) ? JSON.stringify(source[key]) : "";
  let value;
  try {
    value = JSON.parse(typeof state === "string" ? state : original);
  } catch {
  }
  let dirty = typeof state === "string" && state !== original;
  const annotation = source?.[annotationKey] ?? schema?.[annotationKey] ?? {}, defaultUnit = annotation?.[configuration.defaultUnitFromAnnotation] || "";
  const allowedUnits = schemaPropertyChoices(context, configuration.unitChoices);
  let draft = { expression: typeof value?.expression === "string" ? value.expression : "", unit: typeof value?.unit === "string" ? value.unit : defaultUnit }, mount;
  if (state?.format === "fullmeta-quantity-default-state/1") {
    draft = structuredClone(state.draft);
    dirty = state.dirty;
  }
  const host = document.createElement("div");
  parent.append(host);
  const props = () => ({ view: { configuration, draft, defaultUnit, allowedUnits }, onCommand });
  const onCommand = (command, event) => {
    if (command.type === "default.clear") draft = { expression: "", unit: "" };
    else if (command.type === "default.quantity") draft = command.draft;
    else throw new Error("Unknown configured default command " + command.type);
    dirty = true;
    mount.update(props());
    if (!event || event.type === "click") host.dispatchEvent(new Event("input", { bubbles: true }));
  };
  mount = mountReactComponent(host, ConfiguredDefaultValueEditor, props());
  const snapshot = () => !dirty ? original : draft.expression.trim() || draft.unit.trim() ? JSON.stringify(draft) : "";
  return {
    label: configuration.label || "Default value",
    keys: [key],
    type: "json",
    input: { get value() {
      return snapshot();
    } },
    original,
    snapshot,
    snapshotState: () => ({ format: "fullmeta-quantity-default-state/1", draft: structuredClone(draft), dirty }),
    dispose() {
      mount.dispose();
      host.remove();
    },
    validate(value2) {
      if (!value2 || Array.isArray(value2) || typeof value2.expression !== "string" || !value2.expression.trim() || typeof value2.unit !== "string" || !value2.unit.trim() || allowedUnits.length && !allowedUnits.includes(value2.unit)) throw new Error(configuration.validationMessage || "Complete the default expression and unit, or clear it.");
    }
  };
}
export {
  ConfiguredDefaultValueEditor,
  renderConfiguredDefaultValueDesignEditor
};

//# sourceMappingURL=configured-default-value-design-editor.js.map
