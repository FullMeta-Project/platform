// Generated from filter-editor.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { referenceFilterDraft, referenceTargetSchemaFromDraft, referenceFilterDraftAfterCommand } from "./filter-model.js";
function ReferenceFilterEditor({ view, onCommand }) {
  const { draft, disabled = false } = view;
  const command = (type, payload = {}) => onCommand({ type, ...payload });
  if (draft.mode === "complex") return /* @__PURE__ */ React.createElement("div", { className: "schema-reference-filter-editor" }, /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, "This filter has conditions that this table cannot safely edit. It will be kept unchanged."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled, onClick: () => command("filter.replace") }, "Replace with property filter"));
  return /* @__PURE__ */ React.createElement("div", { className: "schema-reference-filter-editor" }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-toolbar" }, /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, "Filter mode", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: draft.mode,
      disabled,
      onChange: (event) => command("filter.mode", { mode: event.target.value })
    },
    /* @__PURE__ */ React.createElement("option", { value: "none" }, "No filter"),
    /* @__PURE__ */ React.createElement("option", { value: "single" }, "Property equals value"),
    /* @__PURE__ */ React.createElement("option", { value: "oneOf" }, "Any of these alternatives")
  ))), draft.mode === "none" ? null : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-bulk-table schema-reference-filter-table", style: { minWidth: "720px" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Property", "Value type", "Equals", "Role (optional)", ""].map((title) => /* @__PURE__ */ React.createElement("th", { key: title }, title)))), /* @__PURE__ */ React.createElement("tbody", null, draft.rows.map((row, index) => {
    const patch = (key, value) => command("filter.patch", { index, patch: { [key]: value } });
    return /* @__PURE__ */ React.createElement("tr", { key: index }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: row.property,
        placeholder: "property key",
        disabled,
        "aria-label": "Filter row " + (index + 1) + " property",
        onChange: (event) => patch("property", event.target.value)
      }
    )), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: row.valueType,
        disabled,
        "aria-label": "Filter row " + (index + 1) + " value type",
        onChange: (event) => command("filter.valueType", { index, valueType: event.target.value })
      },
      ["string", "number", "boolean", "null"].map((type) => /* @__PURE__ */ React.createElement("option", { key: type, value: type }, type))
    )), /* @__PURE__ */ React.createElement("td", null, row.valueType === "null" ? /* @__PURE__ */ React.createElement("span", null, "null") : row.valueType === "boolean" ? /* @__PURE__ */ React.createElement("select", { value: row.value, disabled, "aria-label": "Filter row " + (index + 1) + " equals", onChange: (event) => patch("value", event.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "true" }, "true"), /* @__PURE__ */ React.createElement("option", { value: "false" }, "false")) : /* @__PURE__ */ React.createElement(
      "input",
      {
        type: row.valueType === "number" ? "number" : "text",
        value: row.value,
        disabled,
        "aria-label": "Filter row " + (index + 1) + " equals",
        onChange: (event) => patch("value", event.target.value)
      }
    )), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: row.role,
        placeholder: "optional role",
        disabled,
        "aria-label": "Filter row " + (index + 1) + " role",
        onChange: (event) => patch("role", event.target.value)
      }
    )), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "button",
        disabled,
        "aria-label": "Remove filter row " + (index + 1),
        onClick: () => command("filter.remove", { index })
      },
      "Remove"
    )));
  })))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled, onClick: () => command("filter.add") }, "Add alternative")));
}
function createReferenceFilterEditor(originalTargetSchema, onChange) {
  const node = document.createElement("div");
  let draft = referenceFilterDraft(originalTargetSchema), disabled = false, mount;
  const render = () => mount.update({ view: { draft, disabled }, onCommand });
  const onCommand = (command) => {
    if (disabled) return;
    draft = referenceFilterDraftAfterCommand(draft, command);
    render();
    onChange?.();
  };
  mount = mountReactComponent(node, ReferenceFilterEditor, { view: { draft, disabled }, onCommand });
  return {
    node,
    value: () => referenceTargetSchemaFromDraft(originalTargetSchema, draft),
    disable() {
      disabled = true;
      render();
    },
    snapshot: () => ({ format: "fullmeta-reference-filter-state/1", draft: structuredClone(draft), disabled }),
    dispose: () => mount.dispose()
  };
}
export {
  ReferenceFilterEditor,
  createReferenceFilterEditor
};

//# sourceMappingURL=filter-editor.js.map
