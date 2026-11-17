// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { valueControlDesignLabel, renderValueControlDesignEditor } from "./design-editor.js";
import { validateValueControlAnnotation } from "./fullmeta-ui-valueControl-1.schema.js";
function SettingRow({ label, description, children }) {
  return /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, label), /* @__PURE__ */ React.createElement("td", null, children, description ? /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, description) : null));
}
function sameChoice(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => sameChoice(item, right[index]));
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => Object.hasOwn(right, key) && sameChoice(left[key], right[key]));
}
function ValueControl({ label, value, rawValue, path = [], schema = {}, context = {}, ui = {}, onChange, onCommand, disabled = false, legacyMarkup = false }) {
  const pending = rawValue === void 0 ? context.readDraft?.(path) : rawValue;
  const inputValue = pending === void 0 ? value : pending;
  const emit = (next, type, event, options = {}) => onCommand ? onCommand({
    type: "field.change",
    path,
    value: next,
    rawValue: Object.hasOwn(options, "rawValue") ? options.rawValue : event?.target?.type === "checkbox" ? event.target.checked : event?.target?.value ?? next,
    valueType: type,
    action: ui.onChangeAction
  }, event) : (onChange || context.onChange)?.({ path, value: next, type, action: ui.onChangeAction }, event);
  const attributes = { "data-setting-path": JSON.stringify(path), ...context.rootSettingPath ? { "data-setting-root-path": "true" } : {}, "aria-label": label, disabled };
  if (path.at(-1) === "type" && (Object.hasOwn(schema, "const") || schema.enum?.length === 1)) return null;
  let control;
  if (Object.hasOwn(schema, "const") || schema.readOnly === true || ui.readOnly === true)
    control = /* @__PURE__ */ React.createElement("span", { className: "settings-generated-id" }, String((Object.hasOwn(schema, "const") ? schema.const : value) ?? ""));
  else if (Array.isArray(schema.enum) || ui.choiceSource) {
    let source = null, sourceError = "";
    if (ui.choiceSource) {
      try {
        source = context.choiceOptions?.(ui.choiceSource, { label, value, path, schema });
        if (!Array.isArray(source)) sourceError = "Choices are unavailable: the source did not return a list.";
      } catch (error) {
        sourceError = `Choices are unavailable: ${error?.message || "the source failed."}`;
      }
    }
    const choices = Array.isArray(source) ? source : Array.isArray(schema.enum) ? schema.enum : [];
    const isChoiceRecord = (choice) => Boolean(ui.choiceSource) && choice !== null && !Array.isArray(choice) && typeof choice === "object" && Object.hasOwn(choice, "value");
    const optionValue = (choice) => isChoiceRecord(choice) ? choice.value : choice;
    const optionCaption = (choice) => {
      const itemValue = optionValue(choice);
      return String(isChoiceRecord(choice) ? choice.label ?? ui.choiceLabels?.[String(itemValue)] ?? String(itemValue) : ui.choiceLabels?.[String(itemValue)] ?? String(itemValue));
    };
    const captions = choices.map(optionCaption);
    const selectedIndex = choices.findIndex((choice) => sameChoice(optionValue(choice), inputValue));
    const selectedValue = selectedIndex >= 0 ? optionValue(choices[selectedIndex]) : inputValue;
    const selectedType = selectedValue === null ? "null" : Array.isArray(selectedValue) ? "array" : typeof selectedValue;
    const selectedOption = selectedIndex >= 0 ? `choice-${selectedIndex}` : inputValue === void 0 ? "" : "choice-unavailable";
    control = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "select",
      {
        ...attributes,
        disabled: disabled || Boolean(sourceError),
        "data-setting-type": selectedType || "string",
        "data-setting-choice-value": "true",
        "data-schema-change-action": ui.onChangeAction,
        value: selectedOption,
        onChange: (event) => {
          const match = /^choice-(\d+)$/.exec(event.target.value), index = match ? Number(match[1]) : -1;
          if (index < 0 || index >= choices.length) return;
          const next = optionValue(choices[index]), nextType = next === null ? "null" : Array.isArray(next) ? "array" : typeof next;
          emit(next, nextType, event, { rawValue: next });
        }
      },
      selectedOption === "choice-unavailable" ? /* @__PURE__ */ React.createElement("option", { value: "choice-unavailable" }, "Unknown (", JSON.stringify(inputValue), ")") : null,
      choices.map((choice, index) => {
        const itemValue = optionValue(choice), caption = captions[index];
        const duplicate = captions.filter((other) => other === caption).length > 1;
        const type = itemValue === null ? "null" : Array.isArray(itemValue) ? "array" : typeof itemValue;
        const sameTypeDuplicate = duplicate && choices.some((other, otherIndex) => otherIndex !== index && captions[otherIndex] === caption && (optionValue(other) === null ? "null" : Array.isArray(optionValue(other)) ? "array" : typeof optionValue(other)) === type);
        const label2 = duplicate ? `${caption} (${type}${sameTypeDuplicate ? `: ${JSON.stringify(itemValue)}` : ""})` : caption;
        return /* @__PURE__ */ React.createElement("option", { key: index, value: `choice-${index}` }, label2);
      })
    ), sourceError ? /* @__PURE__ */ React.createElement("span", { role: "alert" }, sourceError) : ui.choiceSource && choices.length === 0 ? /* @__PURE__ */ React.createElement("span", { role: "status" }, "No choices are available.") : null);
  } else if (Array.isArray(value) && !value.length) control = /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, "Empty array");
  else if (Array.isArray(value) && value.every((entry) => entry === null || ["string", "number", "boolean"].includes(typeof entry))) {
    const numbers = value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
    const strings = value.every((entry) => typeof entry === "string" && entry.length > 0 && entry === entry.trim() && !entry.includes(","));
    if (!numbers && !strings) control = /* @__PURE__ */ React.createElement("span", { className: "settings-empty", role: "status" }, JSON.stringify(value), " \xB7 This array cannot be edited safely in the comma-separated control.");
    else {
      const type = numbers ? "array-number" : "array-string";
      control = /* @__PURE__ */ React.createElement("input", { ...attributes, "data-setting-type": type, value: rawValue === void 0 ? value.join(", ") : rawValue, onChange: (event) => emit(event.target.value, type, event) });
    }
  } else if (typeof value === "boolean") control = /* @__PURE__ */ React.createElement(
    "input",
    {
      ...attributes,
      type: "checkbox",
      "data-setting-type": "boolean",
      checked: Boolean(inputValue),
      onChange: (event) => emit(event.target.checked, "boolean", event)
    }
  );
  else if (typeof value === "number" || schema.type === "number" || schema.type === "integer") control = /* @__PURE__ */ React.createElement(
    "input",
    {
      ...attributes,
      type: legacyMarkup ? "number" : "text",
      inputMode: legacyMarkup ? void 0 : "decimal",
      step: "any",
      "data-setting-type": "number",
      min: Number.isFinite(schema.minimum) ? schema.minimum : void 0,
      max: Number.isFinite(schema.maximum) ? schema.maximum : void 0,
      value: inputValue ?? "",
      onChange: (event) => emit(event.target.value.trim() !== "" && Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : event.target.value, "number", event)
    }
  );
  else if (typeof value === "string") {
    const props = {
      ...attributes,
      "data-setting-type": "string",
      placeholder: ui.placeholder,
      value: inputValue,
      onChange: (event) => emit(event.target.value, "string", event)
    };
    control = ui.multiline ? /* @__PURE__ */ React.createElement("textarea", { ...props }) : /* @__PURE__ */ React.createElement("input", { ...props, type: "text" });
  } else control = /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, "No editable value");
  return /* @__PURE__ */ React.createElement(SettingRow, { label, description: schema.description }, control);
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(ValueControl, { ...props, ...props.view });
}
const renderValueControl = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(ValueControl, { ...props, legacyMarkup: true }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  ValueControl,
  Widget,
  mountWidget,
  renderValueControl,
  renderValueControlDesignEditor,
  validateValueControlAnnotation,
  valueControlDesignLabel
};

//# sourceMappingURL=widget.js.map
