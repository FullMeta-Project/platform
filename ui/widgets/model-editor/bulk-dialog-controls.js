// Generated from bulk-dialog-controls.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
const cleanBulkData = (value) => JSON.parse(JSON.stringify(value));
const bulkState = (draft) => readStructuredValueDraft(draft);
const updateBulkState = (onDraftChange, value) => onDraftChange(structuredValueDraft(cleanBulkData(value)));
const sameBulkValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const bulkPointer = (path) => path.length ? `#/${path.map((part) => String(part).replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}` : "#";
function BulkText({ label, value = "", onChange, disabled = false, placeholder = "", multiline = false }) {
  const props = { "aria-label": label, value, disabled, placeholder, onChange: (event) => onChange(event.target.value) };
  return /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, label, multiline ? /* @__PURE__ */ React.createElement("textarea", { ...props, rows: 4 }) : /* @__PURE__ */ React.createElement("input", { ...props, type: "text" }));
}
function BulkSelect({ label, value = "", choices, onChange, disabled = false }) {
  const entries = choices.map((choice) => Array.isArray(choice) ? choice : [choice, choice]);
  if (value && !entries.some(([key]) => key === value)) entries.push([value, `${value} (existing)`]);
  return /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, label, /* @__PURE__ */ React.createElement("select", { "aria-label": label, value, disabled, onChange: (event) => onChange(event.target.value) }, entries.map(([key, text]) => /* @__PURE__ */ React.createElement("option", { key, value: key }, text))));
}
function BulkToggle({ label, value = false, onChange, disabled = false }) {
  return /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": label, checked: value, disabled, onChange: (event) => onChange(event.target.checked) }), label);
}
function BulkButton({ children, onClick, disabled = false, ...rest }) {
  return /* @__PURE__ */ React.createElement("button", { ...rest, type: "button", disabled, onClick }, children);
}
export {
  BulkButton,
  BulkSelect,
  BulkText,
  BulkToggle,
  bulkPointer,
  bulkState,
  cleanBulkData,
  sameBulkValue,
  updateBulkState
};

//# sourceMappingURL=bulk-dialog-controls.js.map
