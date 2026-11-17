// Generated from typed-default-editor.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
import { annotationRow, adoptAnnotationRows } from "./annotation-control-model.js";
const scalarTypes = ["string", "number", "integer", "boolean", "null"], arrayTypes = ["string", "number", "integer", "boolean"];
function TypedDefaultEditor({ view, onCommand }) {
  const { configuration: copy, schema, enabled, type, arrayType, choices, choiceIndex, raw, rows } = view;
  const change = (patch, event) => onCommand({ type: "default.change", patch }, event);
  const scalar = (value, label, update, kind) => kind === "null" ? /* @__PURE__ */ React.createElement("span", null, copy.nullLabel || "Null") : kind === "boolean" ? /* @__PURE__ */ React.createElement("select", { value: String(value), "aria-label": label, onChange: (event) => update(event.target.value === "true", event) }, /* @__PURE__ */ React.createElement("option", { value: "true" }, copy.yesLabel || "Yes"), /* @__PURE__ */ React.createElement("option", { value: "false" }, copy.noLabel || "No")) : /* @__PURE__ */ React.createElement("input", { type: "text", inputMode: ["number", "integer"].includes(kind) ? "decimal" : void 0, value, "aria-label": label, onChange: (event) => update(event.target.value, event) });
  return /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail" }, /* @__PURE__ */ React.createElement("h3", null, copy.heading || "Default value"), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: enabled, onChange: (event) => change({ enabled: event.target.checked }, event) }), " ", copy.declareLabel || "Declare a default"), /* @__PURE__ */ React.createElement("label", { hidden: !enabled }, type === "array" ? copy.arrayLabel || "Values" : copy.valueLabel || "Value", choices ? /* @__PURE__ */ React.createElement("select", { value: String(choiceIndex), "aria-label": copy.ariaLabel || "Default value", onChange: (event) => change({ choiceIndex: Number(event.target.value) }, event) }, choices.map((value, index) => /* @__PURE__ */ React.createElement("option", { key: index, value: String(index) }, value === null ? copy.nullLabel || "Null" : String(value)))) : type === "array" ? /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row-list" }, /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row-list" }, rows.map((row, index) => /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row", key: row.id }, scalar(row.value, (copy.itemAriaLabel || "Default item") + " " + (index + 1), (value, event) => change({ rows: rows.map((item) => item.id === row.id ? { ...item, value } : item) }, event), arrayType), /* @__PURE__ */ React.createElement("button", { type: "button", hidden: rows.length <= (schema.minItems || 0), onClick: (event) => change({ rows: rows.filter((item) => item.id !== row.id) }, event) }, copy.removeItemLabel || "Remove")))), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      hidden: Number.isInteger(schema.maxItems) && rows.length >= schema.maxItems,
      onClick: (event) => change({ rows: [...rows, { ...annotationRow(""), value: arrayType === "boolean" ? true : "" }] }, event)
    },
    copy.addItemLabel || "Add value"
  )) : scalar(raw, copy.ariaLabel || "Default value", (value, event) => change({ raw: value }, event), type)));
}
function renderTypedDefaultEditor(parent, schema, source, state, configuration) {
  if (configuration?.control !== "jsonSchemaTyped") return null;
  const key = configuration.key || "default", allowed = Array.isArray(schema.enum) && schema.enum.every((value2) => value2 === null || ["string", "number", "boolean"].includes(typeof value2)) ? schema.enum : null;
  const arrayType = schema.type === "array" && arrayTypes.includes(schema.items?.type) ? schema.items.type : null;
  const type = scalarTypes.includes(schema.type) ? schema.type : arrayType ? "array" : allowed?.length ? allowed[0] === null ? "null" : typeof allowed[0] : null;
  if (!type) return null;
  const original = Object.hasOwn(source, key) ? JSON.stringify(source[key]) : "", saved = state && typeof state === "object" ? state : { value: state };
  const rawText = typeof saved.value === "string" ? saved.value : original;
  let current;
  try {
    current = JSON.parse(rawText);
  } catch {
    current = source[key];
  }
  const choices = allowed ? allowed.some((choice) => Object.is(choice, current)) || current === void 0 ? allowed : [...allowed, current] : null;
  let dirty = typeof saved.value === "string" && saved.value !== original;
  let view = {
    configuration,
    schema,
    enabled: rawText !== "",
    type,
    arrayType,
    choices,
    choiceIndex: choices ? Math.max(0, choices.findIndex((choice) => Object.is(choice, current))) : 0,
    raw: type === "boolean" ? current !== false : current == null ? "" : String(current),
    rows: (Array.isArray(current) ? current : []).map((value2) => ({ ...annotationRow(""), value: arrayType === "boolean" ? value2 !== false : String(value2) }))
  }, mount;
  if (Array.isArray(saved.numericTexts)) {
    if (type === "array" && ["number", "integer"].includes(arrayType)) view.rows.forEach((row, index) => {
      if (typeof saved.numericTexts[index] === "string") row.value = saved.numericTexts[index];
    });
    else if (["number", "integer"].includes(type) && typeof saved.numericTexts[0] === "string") view.raw = saved.numericTexts[0];
  }
  if (saved.format === "fullmeta-typed-default-state/1") {
    view = { ...view, ...structuredClone(saved.view) };
    dirty = saved.dirty;
    adoptAnnotationRows(view.rows);
  }
  const host = document.createElement("div");
  parent.append(host);
  const onCommand = (command, event) => {
    view = { ...view, ...command.patch };
    dirty = true;
    mount.update({ view, onCommand });
    if (!event || event.type === "click") host.dispatchEvent(new Event("input", { bubbles: true }));
  };
  mount = mountReactComponent(host, TypedDefaultEditor, { view, onCommand });
  const read = (value2, kind) => kind === "boolean" ? value2 === true : kind === "null" ? null : ["number", "integer"].includes(kind) ? Number(value2) : value2;
  const value = () => !dirty ? original : view.enabled ? JSON.stringify(choices ? choices[view.choiceIndex] : type === "array" ? view.rows.map((row) => read(row.value, arrayType)) : read(view.raw, type)) : "";
  const numericTexts = () => choices ? [] : type === "array" && ["number", "integer"].includes(arrayType) ? view.rows.map((row) => String(row.value)) : ["number", "integer"].includes(type) ? [String(view.raw)] : [];
  return {
    label: configuration.label || "Default value",
    keys: [key],
    type: "json",
    input: { get value() {
      return value();
    } },
    original,
    snapshot: () => ({ value: value(), numericTexts: numericTexts() }),
    snapshotState: () => ({ format: "fullmeta-typed-default-state/1", view: structuredClone(view), dirty }),
    dispose() {
      mount.dispose();
      host.remove();
    },
    validateDraft() {
      if (!view.enabled) return;
      if (numericTexts().some((text) => !text.trim() || !Number.isFinite(Number(text)))) throw new Error(configuration.numberMessage || "Enter a finite number for every default value.");
      if (type === "array" && arrayType === "integer" && view.rows.some((row) => !Number.isInteger(Number(row.value)))) throw new Error(configuration.arrayMessage || "Default values must match the array declaration.");
    }
  };
}
export {
  TypedDefaultEditor,
  renderTypedDefaultEditor
};

//# sourceMappingURL=typed-default-editor.js.map
