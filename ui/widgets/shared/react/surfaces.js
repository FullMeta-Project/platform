// Generated from surfaces.jsx by scripts/build-frontend.mjs.
import React, { useLayoutEffect, useRef } from "./react-runtime.js";
import { mountReactComponent } from "./mount.js";
function LegacyHost({ node, nodes, className = "", as: Tag = "div", label }) {
  const reference = useRef(null);
  useLayoutEffect(() => {
    const host = reference.current, children = nodes || (node ? [node] : []);
    for (const child of children) if (child && child.parentNode !== host) host.append(child);
    return () => {
      for (const child of children) if (child?.parentNode === host) host.removeChild(child);
    };
  }, [node, nodes]);
  return /* @__PURE__ */ React.createElement(Tag, { ref: reference, className, "aria-label": label, "data-legacy-host": "true" });
}
function Field({ field, onChange }) {
  const generatedId = React.useId();
  const id = field.id || `${generatedId}-${field.key}`, label = field.label || field.key;
  const common = {
    id,
    disabled: field.disabled || field.readOnly,
    readOnly: field.readOnly,
    "aria-label": label,
    title: field.reason || void 0,
    "aria-description": field.reason || void 0,
    "aria-invalid": field.error ? true : void 0,
    "data-setting-key": field.key,
    ...field.path ? { "data-source-path": JSON.stringify(field.path) } : {}
  };
  const emit = (value, rawValue) => onChange?.({ key: field.key, path: field.path, value, ...rawValue === void 0 ? {} : { rawValue } });
  const choiceValue = (choice) => choice !== null && typeof choice === "object" && Object.hasOwn(choice, "value") ? choice.value : choice;
  const actualValue = Object.hasOwn(field, "rawValue") ? field.rawValue : field.value;
  const selectedChoice = field.choices?.findIndex((choice) => JSON.stringify(choiceValue(choice)) === JSON.stringify(actualValue));
  let control;
  if (field.type === "boolean" && !field.choices) control = /* @__PURE__ */ React.createElement("input", { ...common, type: "checkbox", checked: Boolean(field.value), onChange: (event) => emit(event.target.checked) });
  else if (field.choices) control = /* @__PURE__ */ React.createElement(
    "select",
    {
      ...common,
      value: selectedChoice < 0 ? "" : String(selectedChoice),
      onChange: (event) => emit(structuredClone(choiceValue(field.choices[Number(event.target.value)])))
    },
    selectedChoice < 0 ? /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose a value") : null,
    field.choices.map((choice, index) => /* @__PURE__ */ React.createElement("option", { key: String(index), value: String(index) }, choice?.label ?? String(choiceValue(choice))))
  );
  else if (field.multiline || field.type === "json") control = /* @__PURE__ */ React.createElement(
    "textarea",
    {
      ...common,
      rows: field.rows || 3,
      value: actualValue ?? "",
      onChange: (event) => emit(event.target.value),
      spellCheck: false
    }
  );
  else control = /* @__PURE__ */ React.createElement(
    "input",
    {
      ...common,
      type: "text",
      inputMode: field.type === "number" || field.type === "integer" ? "decimal" : void 0,
      value: actualValue ?? "",
      min: field.minimum,
      max: field.maximum,
      step: field.type === "integer" ? 1 : field.step || "any",
      placeholder: field.placeholder,
      onChange: (event) => {
        const raw = event.target.value, numeric = field.type === "number" || field.type === "integer";
        emit(numeric && raw.trim() && Number.isFinite(Number(raw)) ? Number(raw) : raw, numeric ? raw : void 0);
      }
    }
  );
  return /* @__PURE__ */ React.createElement("label", { className: `jsx-setting-field${field.error ? " has-error" : ""}`, htmlFor: id }, /* @__PURE__ */ React.createElement("span", null, label), control, field.help ? /* @__PURE__ */ React.createElement("small", null, field.help) : null, field.error ? /* @__PURE__ */ React.createElement("small", { role: "alert" }, field.error) : null);
}
function SettingsFields({ fields = [], onChange }) {
  return /* @__PURE__ */ React.createElement("div", { className: "jsx-settings-fields", "data-jsx-surface": "settings-fields" }, fields.filter((field) => !field.hidden).map((field) => /* @__PURE__ */ React.createElement(Field, { key: field.id || field.key, field, onChange })));
}
function SettingsPanel({ title = "Settings", titleId, description, fields, onChange, content, actions = [], onAction, state }) {
  return /* @__PURE__ */ React.createElement("section", { className: "jsx-settings-panel", "data-jsx-surface": "settings", "data-draft-state": state?.draft || "saved" }, /* @__PURE__ */ React.createElement("header", { className: "editor-head" }, /* @__PURE__ */ React.createElement("h2", { id: titleId }, title), description ? /* @__PURE__ */ React.createElement("p", null, description) : null), state?.message ? /* @__PURE__ */ React.createElement("p", { className: "jsx-surface-state", role: "status" }, state.message) : null, fields ? /* @__PURE__ */ React.createElement(SettingsFields, { fields, onChange }) : null, content ? /* @__PURE__ */ React.createElement(LegacyHost, { node: content, className: "jsx-settings-legacy" }) : null, actions.length ? /* @__PURE__ */ React.createElement(SurfaceActions, { actions, onAction }) : null);
}
function SurfaceActions({ actions = [], onAction }) {
  return /* @__PURE__ */ React.createElement("div", { className: "jsx-surface-actions" }, actions.map((action) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: action.id,
      type: "button",
      className: action.primary ? "button primary" : "button",
      disabled: Boolean(action.disabled),
      title: action.description || action.label,
      "data-action-id": action.id,
      onClick: (event) => onAction?.(action.id, event)
    },
    action.label
  )));
}
function DialogFrame({ title, description, content, actions = [], onAction, onClose, status, preview, className = "" }) {
  return /* @__PURE__ */ React.createElement("div", { className: `schema-bulk-content jsx-dialog-frame ${className}`, "data-jsx-surface": "dialog" }, /* @__PURE__ */ React.createElement("header", { className: "schema-validation-dialog-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, title), description ? /* @__PURE__ */ React.createElement("p", null, description) : null), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "aria-label": "Close dialog", onClick: onClose }, "\xD7")), content ? /* @__PURE__ */ React.createElement(LegacyHost, { node: content, className: "schema-bulk-body" }) : null, status ? /* @__PURE__ */ React.createElement("p", { className: "schema-validation-dialog-status", role: "status" }, status) : null, preview !== void 0 ? /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-preview", open: true }, /* @__PURE__ */ React.createElement("summary", null, "Generated candidate"), /* @__PURE__ */ React.createElement("pre", null, typeof preview === "string" ? preview : JSON.stringify(preview, null, 2))) : null, /* @__PURE__ */ React.createElement("footer", { className: "schema-validation-dialog-actions" }, /* @__PURE__ */ React.createElement(SurfaceActions, { actions, onAction })));
}
function GraphicsControls({ controls = [], onChange, onAction, operation, serviceMode = "live" }) {
  return /* @__PURE__ */ React.createElement("div", { className: "jsx-graphics-controls", "data-jsx-surface": "graphics-controls", "data-service-mode": serviceMode }, controls.map((control) => control.kind === "action" ? /* @__PURE__ */ React.createElement(
    "button",
    {
      key: control.id,
      className: "button",
      type: "button",
      disabled: control.disabled,
      title: control.description || control.label,
      "data-action-id": control.id,
      onClick: (event) => onAction?.(control.id, event)
    },
    control.label
  ) : /* @__PURE__ */ React.createElement(Field, { key: control.id || control.key, field: { ...control, key: control.key || control.id }, onChange })), operation ? /* @__PURE__ */ React.createElement("output", { "aria-live": "polite" }, operation.message || operation.status, Number.isFinite(operation.progress) ? ` \xB7 ${Math.round(operation.progress * 100)}%` : "") : null);
}
const mountSettingsPanel = (container, props) => mountReactComponent(container, SettingsPanel, props, { identifierPrefix: "fullmeta-settings-" });
const mountSettingsFields = (container, props) => mountReactComponent(container, SettingsFields, props, { identifierPrefix: "fullmeta-fields-" });
const mountDialogFrame = (container, props) => mountReactComponent(container, DialogFrame, props, { identifierPrefix: "fullmeta-dialog-" });
const mountGraphicsControls = (container, props) => mountReactComponent(container, GraphicsControls, props, { identifierPrefix: "fullmeta-graphics-" });
export {
  DialogFrame,
  GraphicsControls,
  LegacyHost,
  SettingsFields,
  SettingsPanel,
  SurfaceActions,
  mountDialogFrame,
  mountGraphicsControls,
  mountSettingsFields,
  mountSettingsPanel
};

//# sourceMappingURL=surfaces.js.map
