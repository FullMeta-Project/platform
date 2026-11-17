// Generated from schema-session-views.jsx by scripts/build-frontend.mjs.
import React, { useState } from "../shared/react/react-runtime.js";
import { renderOwnedView } from "../../runtime/owned-view.js";
function SchemaToolButtons({ tools = [], onTool }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, tools.map((tool) => /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", key: tool.id, "data-schema-authoring-tool": tool.id, onClick: () => onTool(tool.id) }, tool.label)));
}
function SchemaOptionList({ options = [] }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, options.map(([value, label]) => /* @__PURE__ */ React.createElement("option", { key: value, value }, label)));
}
function renderSchemaOptionList(select, options, preferredValue = select.value) {
  renderOwnedView(select, /* @__PURE__ */ React.createElement(SchemaOptionList, { options }));
  select.value = options.some(([value]) => value === preferredValue) ? preferredValue : options[0]?.[0] || "";
}
function SchemaAuthoringPreview({ getResult }) {
  const [fullOpen, setFullOpen] = useState(false);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { id: "schema-authoring-preview-summary", className: "schema-authoring-preview-summary" }), /* @__PURE__ */ React.createElement("details", { id: "schema-authoring-code-detail", className: "schema-authoring-preview-detail" }, /* @__PURE__ */ React.createElement("summary", null, "Generated code for this operation"), /* @__PURE__ */ React.createElement("pre", { id: "schema-authoring-code" })), /* @__PURE__ */ React.createElement("details", { id: "schema-authoring-tree-detail", className: "schema-authoring-preview-detail" }, /* @__PURE__ */ React.createElement("summary", null, "Project tree preview"), /* @__PURE__ */ React.createElement("pre", { id: "schema-authoring-tree" })), /* @__PURE__ */ React.createElement("details", { id: "schema-authoring-full-code-detail", className: "schema-authoring-preview-detail", open: fullOpen, onToggle: (event) => setFullOpen(event.currentTarget.open) }, /* @__PURE__ */ React.createElement("summary", null, "Complete schema code"), /* @__PURE__ */ React.createElement("pre", { id: "schema-authoring-full-code", "aria-label": "Complete generated schema code" }, fullOpen && getResult()?.document ? JSON.stringify(getResult().document, null, 2) : "")));
}
function SchemaTduvMetrics({ metrics = [], error }) {
  return error ? /* @__PURE__ */ React.createElement("p", { role: "status" }, "Counters unavailable: ", error) : /* @__PURE__ */ React.createElement(React.Fragment, null, metrics.map(([label, value]) => /* @__PURE__ */ React.createElement("div", { className: "schema-tduv-metric", key: label }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("strong", null, String(value)))));
}
export {
  SchemaAuthoringPreview,
  SchemaOptionList,
  SchemaTduvMetrics,
  SchemaToolButtons,
  renderSchemaOptionList
};

//# sourceMappingURL=schema-session-views.js.map
