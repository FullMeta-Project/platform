// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { RowMoveControls, collectionCommand } from "../shared/react/collection-controls.js";
import { rowReorderingAllowed } from "../shared/row-collection/row-order.js";
import { choiceIdentityToken, sameChoiceIdentity } from "../shared/repeatable-choice/choice-identity.js";
import { ScanRowCells, scanChoiceProviderResult, scanChoiceValue, scanChoiceLabel, scanRowConfiguration } from "../scan/widget.js";
import { applyScanTableChange, applyScanTableAction } from "./actions.js";
import { scanTableDesignLabel, renderScanTableDesignEditor } from "./design-editor.js";
import { validateScanTableAnnotation } from "./fullmeta-ui-scanTable-1.schema.js";
const fieldLabel = (schema, fallback) => schema?.title || fallback;
function ScanTable({ label, value, path = [], schema = {}, context = {}, ui = {}, onCommand }) {
  const entries = Array.isArray(value) ? value : [], configuration = scanRowConfiguration(context, schema, entries, 0, ui), rowUi = configuration.ui;
  const rowViews = entries.map((entry, index) => {
    const row = scanRowConfiguration(context, schema, entries, index, ui), choiceState2 = scanChoiceProviderResult(context, row.ui), record = choiceState2.records.find((candidate) => sameChoiceIdentity(scanChoiceValue(candidate, row.ui), entry?.[row.ui.rowChoiceProperty]));
    return { entry, index, row, choiceState: choiceState2, record };
  });
  const choiceState = rowViews[0]?.choiceState || scanChoiceProviderResult(context, rowUi), records = choiceState.records, choice = context.resolveSchema(context.schemaProperty(configuration.schema, entries[0], rowUi.rowChoiceProperty)) || {}, values = context.resolveSchema(context.schemaAtPath([...path, 0, rowUi.rowValuesProperty], { resolveVariant: false })) || {};
  const available = records.some((record) => !entries.some((entry) => sameChoiceIdentity(entry?.[rowUi.rowChoiceProperty], scanChoiceValue(record, rowUi)))), locked = schema.readOnly === true || ui.readOnly === true;
  const act = (action, args, event) => collectionCommand(onCommand, "scanTable", path, action, args, event);
  const providerErrors = [...new Set([choiceState.error, ...rowViews.map((item) => item.choiceState.error)].filter(Boolean))];
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label)), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2 }, /* @__PURE__ */ React.createElement("div", { className: "settings-empty scan-explicit-note" }, schema.description || ""), providerErrors.map((error) => /* @__PURE__ */ React.createElement("div", { className: "settings-error", role: "alert", key: error }, error)), /* @__PURE__ */ React.createElement("div", { className: "scan-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "scan-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, fieldLabel(choice, "Choice")), /* @__PURE__ */ React.createElement("th", null, fieldLabel(values, "Values")), /* @__PURE__ */ React.createElement("th", null))), /* @__PURE__ */ React.createElement("tbody", null, rowViews.map(({ entry, index, row, choiceState: rowChoiceState, record }) => {
    const rowLabel = record ? scanChoiceLabel(context, record, row.ui) : String(entry?.[row.ui.rowChoiceProperty] ?? "Choice"), labels = row.ui.labels || {};
    const rowIdentityToken = choiceIdentityToken(entry?.[row.ui.rowChoiceProperty]);
    return /* @__PURE__ */ React.createElement("tr", { key: entry?.id || index }, /* @__PURE__ */ React.createElement(ScanRowCells, { value: entry, choiceRecords: rowChoiceState.records, path: [...path, index], index, rows: entries, schema: row.schema, context, ui: row.ui, onCommand }), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { className: "row-actions" }, rowReorderingAllowed(schema, ui) ? /* @__PURE__ */ React.createElement(RowMoveControls, { index, length: entries.length, label: rowLabel, attributes: { "data-row-move-scope": "draft", "data-row-move-path": JSON.stringify(path), "data-row-move-index": index, "data-schema-widget-action": "move", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index, "data-schema-widget-row-identity-token": rowIdentityToken }, onMove: (direction, event) => act("move", { row: index, rowIdentityToken, direction, path }, event) }) : null, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "remove-row", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index, "data-schema-widget-row-identity-token": rowIdentityToken, "aria-label": context.formatChoiceLabel?.(labels.parameterRemoveAriaLabelTemplate, { parameter: rowLabel }) || `${labels.removeParameter || labels.removeRow || "Remove"} ${rowLabel}`, disabled: locked || entries.length <= Number(schema.minItems ?? 0), onClick: (event) => act("remove-row", { row: index, rowIdentityToken }, event) }, labels.removeParameter || labels.removeRow || "Remove"))));
  })))), /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "add-row", "data-schema-widget-path": JSON.stringify(path), disabled: locked || !available || Number.isInteger(schema.maxItems) && entries.length >= schema.maxItems, onClick: (event) => act("add-row", {}, event) }, ui.labels?.addParameter || ui.labels?.addRow || "Add scan"))));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(ScanTable, { ...props, ...props.view });
}
const renderScanTable = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(ScanTable, { ...props }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  ScanTable,
  Widget,
  applyScanTableAction,
  applyScanTableChange,
  mountWidget,
  renderScanTable,
  renderScanTableDesignEditor,
  scanTableDesignLabel,
  validateScanTableAnnotation
};

//# sourceMappingURL=widget.js.map
