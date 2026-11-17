// Generated from view.jsx by scripts/build-frontend.mjs.
import React, { useState } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { Table } from "../table/widget.js";
import { TabularPlot } from "../plot-1d/widget.js";
import { Plot1d } from "../plot-1d/widget.js";
import { selectPlotTableView } from "./runtime.js";
function PlotTableToolbar({ tabs = [], activeTab, sourceSummary = "", freshnessText = "", saveInfo = {}, onTabSelect, onSave, saveLabel = "Save figure", viewLabel = "Result view" }) {
  const saveReason = saveInfo.enabled ? "" : saveInfo.reason || "This result has no configured figure save action.";
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { role: "group", "aria-label": viewLabel }, tabs.map((tab) => /* @__PURE__ */ React.createElement("button", { key: tab.id, className: `button${activeTab?.id === tab.id ? " active" : ""}`, type: "button", "data-plot-table-tab": tab.id, "aria-pressed": activeTab?.id === tab.id, onClick: () => onTabSelect?.(tab.id) }, tab.label))), /* @__PURE__ */ React.createElement("span", { className: "result-source-summary" }, sourceSummary), freshnessText ? /* @__PURE__ */ React.createElement("span", { className: "result-freshness-warning", role: "status" }, freshnessText) : null, /* @__PURE__ */ React.createElement("button", { className: "button primary", type: "button", "data-plot-table-save": "", "data-plot-table-can-save": Boolean(saveInfo.enabled), title: saveReason, disabled: !saveInfo.enabled, onClick: onSave }, saveLabel), /* @__PURE__ */ React.createElement("span", { "data-plot-table-save-status": "" }, saveInfo.label || ""), saveReason ? /* @__PURE__ */ React.createElement("span", { className: "result-save-reason", role: "status" }, "Save unavailable: ", saveReason) : null);
}
function PlotTableSections({ entries = [], columnsForEntry = (entry) => entry.view.columns, titleForEntry = (entry) => entry.name || entry.view.name, resizeKeyForEntry = (_, index) => String(index), emptyMessage = "No rows match the selected data.", TableComponent = Table }) {
  const messageFor = (entry) => {
    const view = entry?.view;
    const data = view?.value || view?.data || view;
    const error = data?.error ?? view?.error ?? entry?.error ?? entry?.missing;
    if (error) return typeof error === "string" ? error : error.message || "Table data is unavailable.";
    if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.columns) || !Array.isArray(data.rows)) return "Table rows and columns must be arrays.";
    return "";
  };
  const errors = entries.map((entry, index) => ({ entry, index, message: messageFor(entry) })).filter((item) => item.message);
  const ready = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => !messageFor(entry) && entry.view.rows.length);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, ready.map(({ entry, index }) => /* @__PURE__ */ React.createElement("section", { className: "result-table-section", key: entry.id || index }, /* @__PURE__ */ React.createElement("h3", null, titleForEntry(entry)), /* @__PURE__ */ React.createElement(TableComponent, { view: entry.view, columns: columnsForEntry(entry), resizeKey: resizeKeyForEntry(entry, index) }))), errors.map(({ entry, index, message }) => /* @__PURE__ */ React.createElement("p", { key: `table-error-${entry?.id || index}`, role: "alert" }, "Table error: ", message)), !ready.length && !errors.length ? /* @__PURE__ */ React.createElement("p", { role: "status" }, emptyMessage) : null);
}
function PlotTable({ view, onCommand, onTabSelect, onSave, ...props }) {
  const model = { ...props, ...view }, [localTab, setLocalTab] = useState(null);
  const selected = selectPlotTableView({ ...model, selectedTabId: model.selectedTabId || localTab });
  const choose = (id) => {
    setLocalTab(id);
    if (typeof onTabSelect === "function") onTabSelect(id);
    else onCommand?.({ type: "widget.action", widget: "plotTable", path: model.path || [], action: "selectTab", args: { id } });
  };
  const save = () => {
    if (typeof onSave === "function") onSave();
    else onCommand?.({ type: "widget.action", widget: "plotTable", path: model.path || [], action: "saveFigure", args: {} });
  };
  return /* @__PURE__ */ React.createElement("section", { className: "plot-table-view", "data-jsx-widget": "plot-table" }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement(PlotTableToolbar, { ...model, ...selected, onTabSelect: choose, onSave: save })), selected.isPlot ? model.plotView ? /* @__PURE__ */ React.createElement(Plot1d, { ...model.plotView, height: model.height || 360 }) : /* @__PURE__ */ React.createElement(TabularPlot, { ...model, entries: selected.entries }) : /* @__PURE__ */ React.createElement(PlotTableSections, { ...model, entries: selected.entries }), model.missingText ? /* @__PURE__ */ React.createElement("p", { role: "status" }, model.missingText) : null);
}
const toolbarRoots = /* @__PURE__ */ new WeakMap(), sectionRoots = /* @__PURE__ */ new WeakMap();
function mountPlotTableToolbar({ host, ...props }) {
  if (!host) throw new Error("The plot/table widget needs a toolbar host.");
  if (toolbarRoots.get(host)?.inspect().mounted) toolbarRoots.get(host).update(props);
  else toolbarRoots.set(host, mountReactComponent(host, PlotTableToolbar, props));
  return { saveButton: host.querySelector("[data-plot-table-save]"), saveStatus: host.querySelector("[data-plot-table-save-status]") };
}
function mountPlotTableSections({ host, ...props }) {
  if (sectionRoots.get(host)?.inspect().mounted) sectionRoots.get(host).update(props);
  else sectionRoots.set(host, mountReactComponent(host, PlotTableSections, props));
  return sectionRoots.get(host);
}
const mountWidget = (container, props) => mountReactComponent(container, PlotTable, props);
export {
  PlotTable,
  PlotTableSections,
  PlotTableToolbar,
  mountPlotTableSections,
  mountPlotTableToolbar,
  mountWidget
};

//# sourceMappingURL=view.js.map
