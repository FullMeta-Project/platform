// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { RowMoveControls, collectionCommand, collectionFieldChange } from "../shared/react/collection-controls.js";
import { rowReorderingAllowed } from "../shared/row-collection/row-order.js";
import { choiceIdentityToken, sameChoiceIdentity } from "../shared/repeatable-choice/choice-identity.js";
import { scanChoiceLabel, scanChoiceRecords, scanChoiceProviderResult, scanChoiceValue, scanModeForValue, scanModes } from "./schema.js";
import { scanModeValue, initialScanValues, applyScanChange, applyScanAction } from "./actions.js";
import { scanDesignLabel, renderScanDesignEditor } from "./design-editor.js";
import { scanFieldSchema, scanRowConfiguration, scanModes as scanModes2, scanModesForSchema, scanChoiceRecords as scanChoiceRecords2, scanChoiceProviderResult as scanChoiceProviderResult2, scanChoiceValue as scanChoiceValue2, scanChoiceLabel as scanChoiceLabel2, scanFallbackQuantity } from "./schema.js";
import { validateScanAnnotation } from "./fullmeta-ui-scan-1.schema.js";
const fieldLabel = (schema, fallback = "") => schema?.title || fallback;
function rowView({ value: entry, path, index, rows, schema, context, ui, standalone = false, choiceRecords }) {
  const records = Array.isArray(choiceRecords) ? choiceRecords : scanChoiceRecords(context, ui), choiceKey = ui.rowChoiceProperty, valuesKey = ui.rowValuesProperty;
  const choiceSchema = context.resolveSchema(context.schemaProperty(schema, entry, choiceKey)) || {}, values = entry?.[valuesKey] || {};
  const record = records.find((candidate) => sameChoiceIdentity(scanChoiceValue(candidate, ui), entry?.[choiceKey]));
  const label = record ? scanChoiceLabel(context, record, ui) : String(entry?.[choiceKey] ?? fieldLabel(choiceSchema, "Choice"));
  const unit = record?.[ui.sourceUnitProperty || "unit"] || values.start?.unit || values.values?.[0]?.unit || "1";
  const used = new Set(rows.filter((_, other) => other !== index).map((candidate) => candidate?.[choiceKey]));
  const available = records.filter((candidate) => sameChoiceIdentity(scanChoiceValue(candidate, ui), entry?.[choiceKey]) || !used.has(scanChoiceValue(candidate, ui)));
  const valuesPath = [...path, valuesKey], modes = scanModes(context, valuesPath, ui), selected = scanModeForValue(modes, values) || modes[0];
  return { label, unit, choiceSchema, choiceKey, values, valuesPath, modes, selected, available, record, ownerPath: standalone ? path : path.slice(0, -1) };
}
function ScanRowCells(props) {
  const { value: entry, path, index, context, ui, onCommand, standalone = false, schema } = props;
  const row = rowView(props), { label, unit, choiceSchema, choiceKey, values, valuesPath, modes, selected, available, record, ownerPath } = row, labels = ui.labels || {};
  const locked = schema.readOnly === true || ui.readOnly === true, widget = standalone ? "scan" : "scanTable";
  const act = (action, args, event) => collectionCommand(onCommand, widget, ownerPath, action, { row: index, ...args }, event);
  const input = (valuePath, value, aria, type = "string", extra = {}) => /* @__PURE__ */ React.createElement("input", { ...extra, "data-setting-path": JSON.stringify(valuePath), "data-setting-type": type, value: value ?? "", "aria-label": aria, disabled: locked, onChange: (event) => collectionFieldChange(onCommand, valuePath, event.target.value, type, event) });
  let editor = null;
  if (selected?.array) {
    const { key, schema: arraySchema } = selected.array, quantities = Array.isArray(values[key]) ? values[key] : [], item = context.resolveSchema(arraySchema.items) || {}, valueLabel = fieldLabel(item, fieldLabel(arraySchema, "Value"));
    editor = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "settings-empty scan-explicit-note" }, selected.description), /* @__PURE__ */ React.createElement("div", { className: "scan-explicit-values" }, quantities.map((quantity, valueIndex) => {
      const valuePath = [...valuesPath, key, valueIndex], aria = context.formatChoiceLabel?.(labels.valueAriaLabelTemplate, { parameter: label, value: valueLabel, index: valueIndex + 1, unit: quantity?.unit || unit }) || `${label} ${valueLabel} ${valueIndex + 1}`;
      const remove = context.formatChoiceLabel?.(labels.valueRemoveAriaLabelTemplate, { parameter: label, value: valueLabel, index: valueIndex + 1 }) || `${labels.removeValue || "Remove"} ${label} ${valueLabel} ${valueIndex + 1}`;
      return /* @__PURE__ */ React.createElement("div", { className: "scan-explicit-value", key: quantity?.id || valueIndex }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, valueLabel, " ", valueIndex + 1), input([...valuePath, "expression"], quantity?.expression, aria)), /* @__PURE__ */ React.createElement("span", { className: "scan-explicit-unit" }, quantity?.unit || unit), /* @__PURE__ */ React.createElement("div", { className: "row-actions" }, rowReorderingAllowed(arraySchema) ? /* @__PURE__ */ React.createElement(RowMoveControls, { index: valueIndex, length: quantities.length, label: `${label} ${valueLabel} ${valueIndex + 1}`, attributes: { "data-row-move-scope": "draft", "data-row-move-path": JSON.stringify([...valuesPath, key]), "data-row-move-index": valueIndex }, onMove: (direction, event) => act("move-value", { value: valueIndex, direction, path: [...valuesPath, key] }, event) }) : null, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "remove-value", "data-schema-widget-path": JSON.stringify(ownerPath), "data-schema-widget-row": index, "data-schema-widget-value": valueIndex, "aria-label": remove, disabled: locked || quantities.length <= Number(arraySchema.minItems ?? 0), onClick: (event) => act("remove-value", { value: valueIndex }, event) }, labels.removeValue || "Remove")));
    })), /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "add-value", "data-schema-widget-path": JSON.stringify(ownerPath), "data-schema-widget-row": index, disabled: locked || Number.isInteger(arraySchema.maxItems) && quantities.length >= arraySchema.maxItems, onClick: (event) => act("add-value", {}, event) }, context.formatChoiceLabel?.(labels.addValuesTemplate, { value: valueLabel }) || labels.addValues || "Add value"));
  } else if (selected?.quantities?.length >= 2 && selected.count) {
    const [start, end] = selected.quantities, count = selected.count;
    editor = /* @__PURE__ */ React.createElement("div", { className: "scan-range" }, [start, end].map(({ key, schema: field }) => {
      const text = fieldLabel(field, key), quantity = values[key], endpointUnit = quantity?.unit || unit;
      return /* @__PURE__ */ React.createElement(React.Fragment, { key }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, text), input([...valuesPath, key, "expression"], quantity?.expression, `${label} ${text} in ${endpointUnit}`)), /* @__PURE__ */ React.createElement("span", { className: "scan-explicit-unit" }, endpointUnit));
    }), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("span", null, fieldLabel(count.schema, count.key)), input([...valuesPath, count.key], values[count.key] ?? 2, `${label} ${fieldLabel(count.schema, count.key)}`, "number", { type: "number", min: count.schema.minimum ?? "", max: count.schema.maximum ?? "", step: 1 })));
  }
  const choiceAria = context.formatChoiceLabel?.(labels.parameterAriaLabelTemplate, { parameter: label }) || `${fieldLabel(choiceSchema, "Choice")}: ${label}`;
  const savedChoice = entry?.[choiceKey];
  const savedToken = savedChoice === void 0 ? "" : choiceIdentityToken(savedChoice);
  const chooseRecord = (event) => {
    const selectedRecord = available.find((candidate) => choiceIdentityToken(scanChoiceValue(candidate, ui)) === event.target.value);
    if (selectedRecord) act("choice", { identityToken: event.target.value, value: scanChoiceValue(selectedRecord, ui) }, event);
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { className: "scan-choice", "data-schema-widget-change": "choice", "data-schema-widget-path": JSON.stringify(ownerPath), "data-schema-widget-row": index, "aria-label": choiceAria, value: savedToken, disabled: locked, onChange: chooseRecord }, /* @__PURE__ */ React.createElement("option", { value: "" }, choiceSchema["x-fullmeta-ui"]?.emptyChoiceLabel || ""), record ? null : savedChoice === void 0 ? null : /* @__PURE__ */ React.createElement("option", { value: savedToken, disabled: true }, `Unavailable (${String(savedChoice)})`), available.map((record2, index2) => /* @__PURE__ */ React.createElement("option", { key: index2, value: choiceIdentityToken(scanChoiceValue(record2, ui)) }, context.formatChoiceLabel?.(choiceSchema["x-fullmeta-ui"]?.choiceLabelTemplate, record2) || scanChoiceLabel(context, record2, ui))))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { className: "scan-values" }, /* @__PURE__ */ React.createElement("label", { className: "scan-mode" }, /* @__PURE__ */ React.createElement("span", null, selected?.typeLabel || "Mode"), /* @__PURE__ */ React.createElement("select", { "data-schema-widget-change": "mode", "data-schema-widget-path": JSON.stringify(ownerPath), "data-schema-widget-row": index, "aria-label": `${label} ${selected?.typeLabel || "Mode"}`, value: values[selected?.typeKey] ?? selected?.type ?? "", disabled: locked, onChange: (event) => act("mode", { value: event.target.value }, event) }, modes.map((mode) => /* @__PURE__ */ React.createElement("option", { key: mode.type, value: mode.type }, mode.label)))), editor)));
}
function Scan(props) {
  const { label, value, path = [], schema, context, ui } = props, choiceState = scanChoiceProviderResult(context, ui), choices = choiceState.records, choice = context.resolveSchema(context.schemaProperty(schema, value, ui.rowChoiceProperty)) || {}, values = context.resolveSchema(context.schemaAtPath([...path, ui.rowValuesProperty], { resolveVariant: false })) || {};
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label)), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2 }, /* @__PURE__ */ React.createElement("div", { className: "scan-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "scan-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, fieldLabel(choice, "Choice")), /* @__PURE__ */ React.createElement("th", null, fieldLabel(values, "Values")), /* @__PURE__ */ React.createElement("th", null))), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement(ScanRowCells, { ...props, choiceRecords: choices, path, index: 0, rows: [value], standalone: true }), /* @__PURE__ */ React.createElement("td", null))))), choiceState.error ? /* @__PURE__ */ React.createElement("div", { className: "settings-error", role: "alert" }, choiceState.error) : !choices.length ? /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, "No scan choices are available.") : null)));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(Scan, { ...props, ...props.view });
}
const renderScanRow = (props) => ({ label: rowView(props).label, cells: renderWidgetMarkup(/* @__PURE__ */ React.createElement(ScanRowCells, { ...props })) });
const renderScan = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(Scan, { ...props }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  Scan,
  ScanRowCells,
  Widget,
  applyScanAction,
  applyScanChange,
  initialScanValues,
  mountWidget,
  renderScan,
  renderScanDesignEditor,
  renderScanRow,
  scanChoiceLabel2 as scanChoiceLabel,
  scanChoiceProviderResult2 as scanChoiceProviderResult,
  scanChoiceRecords2 as scanChoiceRecords,
  scanChoiceValue2 as scanChoiceValue,
  scanDesignLabel,
  scanFallbackQuantity,
  scanFieldSchema,
  scanModeValue,
  scanModes2 as scanModes,
  scanModesForSchema,
  scanRowConfiguration,
  validateScanAnnotation
};

//# sourceMappingURL=widget.js.map
