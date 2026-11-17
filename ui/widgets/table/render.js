// Generated from render.jsx by scripts/build-frontend.mjs.
import React, { renderToStaticMarkup } from "../shared/react/react-runtime.js";
import { columnLabel, formatTableValue } from "../shared/tables/data.js";
function Table({ view = { columns: [], rows: [] }, columns: selectedColumns, resizeKey = view.resizeKey || "", className = "result-grid" }) {
  const data = view.value || view.data || view;
  const suppliedColumns = selectedColumns ?? data?.columns;
  const suppliedRows = data?.rows;
  const columns = Array.isArray(suppliedColumns) ? suppliedColumns : [];
  const rows = Array.isArray(suppliedRows) ? suppliedRows : [];
  const keys = /* @__PURE__ */ new Set();
  let error = data?.error ?? view?.error ?? "";
  if (!error && (suppliedColumns != null && !Array.isArray(suppliedColumns) || suppliedRows != null && !Array.isArray(suppliedRows)))
    error = "Table rows and columns must be arrays.";
  if (!error) for (const column of columns) {
    if (!column || typeof column !== "object" || Array.isArray(column) || typeof column.key !== "string" || !column.key || keys.has(column.key) || column.displayScale != null && (!Number.isFinite(column.displayScale) || column.displayScale <= 0)) {
      error = "Table columns must have unique keys and positive finite display scales.";
      break;
    }
    keys.add(column.key);
  }
  if (!error && rows.some((row) => !row || typeof row !== "object" || Array.isArray(row)))
    error = "Every table row must be an object.";
  if (!error && rows.length && !columns.length) error = "Table rows require at least one column.";
  const message = typeof error === "string" ? error : error?.message || "Table data is unavailable.";
  const status = error ? { role: "alert", label: `Table error: ${message}` } : !rows.length ? { role: "status", label: "No table data is available." } : null;
  return /* @__PURE__ */ React.createElement("table", { className, "data-column-resize-key": resizeKey }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, columns.map((column) => /* @__PURE__ */ React.createElement("th", { key: column.key }, columnLabel(column))))), /* @__PURE__ */ React.createElement("tbody", null, status ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Math.max(1, columns.length) }, /* @__PURE__ */ React.createElement("span", { role: status.role, "aria-label": status.label }, status.role === "alert" ? message : "No table data is available."))) : rows.map((row, index) => /* @__PURE__ */ React.createElement("tr", { key: index }, columns.map((column) => /* @__PURE__ */ React.createElement("td", { key: column.key }, formatTableValue(column, row[column.key])))))));
}
function renderTabularTable(props) {
  return renderToStaticMarkup(/* @__PURE__ */ React.createElement(Table, { ...props }));
}
export {
  Table,
  renderTabularTable
};

//# sourceMappingURL=render.js.map
