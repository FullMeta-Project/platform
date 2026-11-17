// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { collectionCommand } from "../shared/react/collection-controls.js";
import { columnLabel, formatTableValue, resolveTableSelection } from "../shared/tables/data.js";
import { tableFor, resolveOwnerSelection } from "./runtime.js";
import { tabularSliceSelectorDesignLabel, renderTabularSliceSelectorDesignEditor } from "./design-editor.js";
import { applyTabularSliceSelectorChange } from "./runtime.js";
import { validateTabularSliceSelectorAnnotation } from "./fullmeta-ui-tabularSliceSelector-1.schema.js";
function TabularSliceSelector({ label, value, path = [], schema = {}, context = {}, ui = {}, onCommand }) {
  const owner = path.slice(0, -1).reduce((node, key) => node?.[key], context.rootValue), table = tableFor({ ui, path, schema, value, context, owner });
  const heading = /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label));
  if (!owner || !table) return /* @__PURE__ */ React.createElement(React.Fragment, null, heading, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, ui.emptyMessage || "No table data is available for this selection.")));
  if (table.error) return /* @__PURE__ */ React.createElement(React.Fragment, null, heading, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty", role: "alert" }, table.error)));
  const columns = (table.columns || []).filter((column) => column.role === "parameter"), fixed = ui.selectionMode === "fixed";
  const { selection } = resolveOwnerSelection(owner, ui, path, table);
  const resolved = resolveTableSelection(table, selection, { mode: fixed ? "fixed" : "slice" });
  const varying = fixed ? "" : resolved.xColumn, locked = schema.readOnly === true || ui.readOnly === true;
  const act = (action, args, event) => collectionCommand(onCommand, "tabularSliceSelector", path, action, args, event);
  const attrs = { "data-schema-widget-path": JSON.stringify(path), disabled: locked }, varyingLabel = ui.labels?.varyingColumn || "Varying column";
  return /* @__PURE__ */ React.createElement(React.Fragment, null, heading, !fixed && columns.length ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, varyingLabel), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { "data-schema-widget-change": "varying-column", ...attrs, "aria-label": varyingLabel, value: varying, onChange: (event) => act("varying-column", { value: event.target.value }, event) }, columns.map((column) => /* @__PURE__ */ React.createElement("option", { key: column.key, value: column.key }, columnLabel(column)))), /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, ui.labels?.allValues || "All sampled values"))) : null, columns.filter((column) => fixed || column.key !== varying).map((column) => {
    const values = Array.isArray(column.values) ? column.values : [], selected = Object.hasOwn(resolved.filters || {}, column.key) ? resolved.filters[column.key] : values[0];
    return /* @__PURE__ */ React.createElement("tr", { key: column.key }, /* @__PURE__ */ React.createElement("td", null, columnLabel(column)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { "data-schema-widget-change": "fixed-value", ...attrs, "data-schema-widget-key": column.key, "aria-label": `${columnLabel(column)}: ${ui.labels?.fixedValue || "Fixed value"}`, value: String(selected ?? ""), onChange: (event) => act("fixed-value", { key: column.key, value: event.target.value }, event) }, values.map((entry, index) => /* @__PURE__ */ React.createElement("option", { key: index, value: String(entry) }, formatTableValue(column, entry))))));
  }), !columns.length ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, ui.noChoicesMessage || "This table has no selectable columns.")) : null, resolved.adjustments?.some((entry) => entry.type !== "added-filter") ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, ui.selectionAdjustedMessage || "The selection was adjusted to the available columns and values.")) : null, resolved.error ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty", role: "alert" }, resolved.error)) : null, ui.helpText ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, ui.helpText)) : null);
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(TabularSliceSelector, { ...props, ...props.view });
}
const renderTabularSliceSelector = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(TabularSliceSelector, { ...props }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  TabularSliceSelector,
  Widget,
  applyTabularSliceSelectorChange,
  mountWidget,
  renderTabularSliceSelector,
  renderTabularSliceSelectorDesignEditor,
  tabularSliceSelectorDesignLabel,
  validateTabularSliceSelectorAnnotation
};

//# sourceMappingURL=widget.js.map
