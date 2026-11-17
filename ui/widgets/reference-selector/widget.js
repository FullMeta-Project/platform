// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { referenceSelectorDesignLabel, renderReferenceSelectorDesignEditor } from "./design-editor.js";
import { referenceFilterDraft, referenceTargetSchemaFromDraft, referenceFilterDraftAfterCommand } from "./filter-model.js";
import { ReferenceFilterEditor, createReferenceFilterEditor } from "./filter-editor.js";
import { validateReferenceSelectorAnnotation, validateReferenceSelectorOptions } from "./fullmeta-ui-referenceSelector-1.schema.js";
function ReferenceSelector({ label, value, path = [], schema = {}, ui = {}, referenceOptionsUi = ui, options, context = {}, onChange, onCommand, disabled = false }) {
  const multiple = Array.isArray(value) || schema.type === "array" || Array.isArray(schema.type) && schema.type.includes("array");
  let resolvedOptions, providerError = "";
  try {
    resolvedOptions = options === void 0 && schema["x-fullmeta-modelReference"] ? context.referenceOptions?.(schema["x-fullmeta-modelReference"], value ?? "", label, referenceOptionsUi) : options;
  } catch (error) {
    providerError = error?.message || "The reference provider failed.";
  }
  if (!providerError && resolvedOptions !== void 0 && (!Array.isArray(resolvedOptions) || resolvedOptions.some((option) => !option || typeof option.value !== "string" || typeof option.label !== "string" || !option.label.length))) providerError = "The reference provider returned invalid options.";
  if (!providerError && Array.isArray(resolvedOptions)) {
    const values = /* @__PURE__ */ new Set();
    const hasDuplicateValues = resolvedOptions.some((option) => {
      if (values.has(option.value)) return true;
      values.add(option.value);
      return false;
    });
    if (hasDuplicateValues) providerError = "The reference provider returned duplicate option values.";
  }
  const available = Array.isArray(resolvedOptions) ? resolvedOptions.filter((option) => option && typeof option.value === "string" && typeof option.label === "string" && option.label.length) : null;
  const choices = multiple ? available?.filter((option) => option.value !== "") : available;
  const noAvailableChoices = !available || !available.some((option) => option.value !== "" && option.unavailable !== true);
  const valueType = multiple ? "array-string-select" : "string";
  const emit = (event) => {
    const next = multiple ? [...event.target.selectedOptions].map((option) => option.value) : event.target.value;
    if (onCommand) onCommand({ type: "field.change", path, value: next, rawValue: next, valueType }, event);
    else (onChange || context.onChange)?.({ path, value: next, type: valueType }, event);
  };
  if (providerError) return /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, label), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { role: "alert" }, "Could not load reference options: ", providerError), value !== void 0 && value !== null ? /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, "Saved reference: ", JSON.stringify(value)) : null));
  return /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, label), /* @__PURE__ */ React.createElement("td", null, !choices || multiple && !choices.length ? /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, ui.emptyMessage || "No matching options are available.", value !== void 0 && value !== null && value !== "" && !(Array.isArray(value) && !value.length) ? ` Saved reference: ${JSON.stringify(value)}` : "") : /* @__PURE__ */ React.createElement(
    "select",
    {
      "data-setting-path": JSON.stringify(path),
      "data-setting-type": valueType,
      "aria-label": ui.ariaLabel || label,
      disabled: disabled || schema.readOnly === true || ui.readOnly === true,
      multiple,
      size: multiple ? Math.max(2, Math.min(Number.isInteger(ui.maxVisibleOptions) ? ui.maxVisibleOptions : 6, available.length)) : void 0,
      value: multiple ? Array.isArray(value) ? value.map(String) : [] : String(value ?? ""),
      onChange: emit
    },
    choices.map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value, title: option.description || void 0 }, option.label))
  ), choices && !(multiple && !choices.length) && noAvailableChoices ? /* @__PURE__ */ React.createElement("div", { className: "settings-empty", role: "status" }, ui.emptyMessage || "No matching options are available.") : null, schema.description ? /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, schema.description) : null));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(ReferenceSelector, { ...props, ...props.view });
}
const renderReferenceSelector = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(ReferenceSelector, { ...props }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  ReferenceFilterEditor,
  ReferenceSelector,
  Widget,
  createReferenceFilterEditor,
  mountWidget,
  referenceFilterDraft,
  referenceFilterDraftAfterCommand,
  referenceSelectorDesignLabel,
  referenceTargetSchemaFromDraft,
  renderReferenceSelector,
  renderReferenceSelectorDesignEditor,
  validateReferenceSelectorAnnotation,
  validateReferenceSelectorOptions
};

//# sourceMappingURL=widget.js.map
