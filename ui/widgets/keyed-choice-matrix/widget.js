// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { RowMoveControls, collectionCommand } from "../shared/react/collection-controls.js";
import { rowReorderingAllowed } from "../shared/row-collection/row-order.js";
import { keyedChoiceMatrixDesignLabel, renderKeyedChoiceMatrixDesignEditor } from "./design-editor.js";
import { keyedChoiceValues, applyKeyedChoiceMatrixChange, applyKeyedChoiceMatrixAction } from "./runtime.js";
import { validateKeyedChoiceMatrixAnnotation } from "./fullmeta-ui-keyedChoiceMatrix-1.schema.js";
function KeyedChoiceMatrix({ label, value, path = [], schema = {}, context = {}, ui = {}, onCommand }) {
  const entries = Array.isArray(value) ? value : [], records = context.choiceRecords?.(ui.choiceSource, { path, schema, value }) || [];
  const keyProperty = ui.choiceKeyProperty || "id", mapProperty = ui.valueMapProperty || "values";
  const item = context.resolveSchema(context.schemaItem(schema, value, 0)) || {}, map = context.resolveSchema(context.schemaProperty(item, entries[0], mapProperty)) || {}, choiceSchema = context.resolveSchema(map.additionalProperties) || {};
  const declared = choiceSchema.enum || [], configured = ui.choiceSetProperty ? ui.choiceSetsByValue?.[context.rootValue?.[ui.choiceSetProperty]] : null;
  const choices = (configured || declared).filter((choice) => declared.includes(choice)), labels = { ...choiceSchema["x-fullmeta-ui"]?.choiceLabels, ...ui.choiceLabels };
  const byKey = new Map(records.map((record) => [String(record?.[keyProperty]), record])), locked = schema.readOnly === true || ui.readOnly === true;
  const act = (action, args, event) => collectionCommand(onCommand, "keyedChoiceMatrix", path, action, args, event);
  const help = ui.helpText || ui.choiceHelp;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label)), help ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, help)) : null, entries.map((entry, index) => {
    const values = entry?.[mapProperty] || {}, keys = [.../* @__PURE__ */ new Set([...records.map((record) => String(record?.[keyProperty])), ...Object.keys(values)])];
    const rowLabel = context.formatChoiceLabel?.(ui.rowLabelTemplate, { index: index + 1 }) || `${label} ${index + 1}`;
    return /* @__PURE__ */ React.createElement(React.Fragment, { key: entry?.id || index }, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, rowLabel, " ", /* @__PURE__ */ React.createElement("span", { className: "row-actions" }, rowReorderingAllowed(schema, ui) ? /* @__PURE__ */ React.createElement(RowMoveControls, { index, length: entries.length, label: rowLabel, attributes: { "data-schema-widget-action": "move", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index }, onMove: (direction, event) => act("move", { row: index, direction }, event) }) : null, entries.length > Number(ui.minItems ?? 0) ? /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "remove", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index, "aria-label": context.formatChoiceLabel?.(ui.removeAriaLabelTemplate, { index: index + 1 }) || `${ui.removeLabel || "Remove"} ${index + 1}`, disabled: locked, onClick: (event) => act("remove", { row: index }, event) }, ui.removeLabel || "Remove") : null))), keys.length ? keys.map((key) => {
      const record = byKey.get(key), caption = record ? context.formatChoiceLabel?.(ui.choiceLabelTemplate, record) || key : context.formatChoiceLabel?.(ui.missingChoiceLabelTemplate, { key }) || `${ui.missingChoiceLabel || "Missing choice"} ${key}`;
      const current = values[key] ?? ui.omittedValue ?? "", aria = context.formatChoiceLabel?.(ui.choiceAriaLabelTemplate, { row: index + 1, label: caption }) || `${label} ${index + 1}: ${caption}`;
      return /* @__PURE__ */ React.createElement("tr", { key }, /* @__PURE__ */ React.createElement("td", null, caption), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { "data-schema-widget-change": "keyed-choice", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index, "data-schema-widget-key": key, "aria-label": aria, value: String(current), disabled: locked, onChange: (event) => act("keyed-choice", { row: index, key, value: event.target.value }, event) }, choices.map((choice, choiceIndex) => /* @__PURE__ */ React.createElement("option", { key: choiceIndex, value: String(choice) }, labels[String(choice)] ?? String(choice))))));
    }) : /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, ui.noChoicesMessage || "No choices are available for this row.")), ui.summaryLabelTemplate ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, context.formatChoiceLabel?.(ui.summaryLabelTemplate, { index: index + 1 }) || String(index + 1)), /* @__PURE__ */ React.createElement("td", { className: "settings-empty" }, /* @__PURE__ */ React.createElement("code", null, records.map((record) => ui.summaryCodes?.[values[record?.[keyProperty]] ?? ui.omittedValue] ?? "").join("")), ui.summaryHelp ? ` \xB7 ${ui.summaryHelp}` : "")) : null);
  }), !records.length ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, ui.noChoicesMessage || "No choices are available.")) : null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2 }, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "add", "data-schema-widget-path": JSON.stringify(path), disabled: locked || !records.length || ui.maxItems !== void 0 && entries.length >= ui.maxItems, onClick: (event) => act("add", {}, event) }, ui.addLabel || "Add"))));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(KeyedChoiceMatrix, { ...props, ...props.view });
}
const renderKeyedChoiceMatrix = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(KeyedChoiceMatrix, { ...props }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  KeyedChoiceMatrix,
  Widget,
  applyKeyedChoiceMatrixAction,
  applyKeyedChoiceMatrixChange,
  keyedChoiceMatrixDesignLabel,
  keyedChoiceValues,
  mountWidget,
  renderKeyedChoiceMatrix,
  renderKeyedChoiceMatrixDesignEditor,
  validateKeyedChoiceMatrixAnnotation
};

//# sourceMappingURL=widget.js.map
