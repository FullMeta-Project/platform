// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { RowMoveControls, collectionCommand } from "../shared/react/collection-controls.js";
import { rowReorderingAllowed } from "../shared/row-collection/row-order.js";
import { choiceIdentityToken, sameChoiceIdentity } from "../shared/repeatable-choice/choice-identity.js";
import { repeatableChoiceTableDesignLabel, renderRepeatableChoiceTableDesignEditor } from "./design-editor.js";
import { validateRepeatableChoiceTableAnnotation } from "./fullmeta-ui-repeatableChoiceTable-1.schema.js";
function RepeatableChoiceTable({ label, value, path = [], schema = {}, context = {}, ui = {}, onCommand }) {
  const entries = Array.isArray(value) ? value : [];
  let records;
  try {
    records = context.choiceRecords?.(ui.choiceSource, { path, schema, value }) ?? [];
    if (!Array.isArray(records)) throw new Error("The choice provider did not return a list.");
  } catch (error) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label)), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2 }, /* @__PURE__ */ React.createElement("div", { role: "alert" }, "Could not load choices: ", error?.message || String(error)))));
  }
  const property = ui.choiceValueProperty || "id", uniqueBy = ui.uniqueBy || ui.choiceAssignments?.[property] || property;
  const itemSchema = context.resolveSchema?.(schema?.items) || schema?.items || {};
  const objectRows = itemSchema.type === "object" || Boolean(itemSchema.properties) || entries.some((entry) => entry !== null && typeof entry === "object" && !Array.isArray(entry));
  const selectedValue = (entry) => objectRows ? entry?.[uniqueBy] : entry;
  const locked = schema.readOnly === true || ui.readOnly === true, maximum = ui.maxItems ?? schema.maxItems, minimum = Number(ui.minItems ?? schema.minItems ?? 0);
  const act = (action, args, event) => collectionCommand(onCommand, "repeatableChoiceTable", path, action, args, event);
  const hasChoice = records.some((record) => !entries.some((entry) => sameChoiceIdentity(selectedValue(entry), record?.[property])));
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label)), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2 }, /* @__PURE__ */ React.createElement("div", { className: "schema-choice-widget", "aria-label": ui.ariaLabel || label, "data-schema-widget-path": JSON.stringify(path), tabIndex: -1 }, /* @__PURE__ */ React.createElement("table", { className: "schema-choice-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, ui.labels?.choiceColumn || "Choice"), /* @__PURE__ */ React.createElement("th", null, ui.labels?.actionsColumn || "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, entries.map((entry, index) => {
    const used = entries.filter((_, other) => other !== index).map(selectedValue);
    const available = records.filter((record) => sameChoiceIdentity(record?.[property], entry?.[uniqueBy]) || !used.some((value2) => sameChoiceIdentity(value2, record?.[property])));
    const rowLabel = context.formatChoiceLabel?.(ui.rowLabelTemplate, { index: index + 1 }) || `${label} ${index + 1}`;
    const saved = selectedValue(entry), missing = !records.some((record) => sameChoiceIdentity(record?.[property], saved));
    const removeDisabled = locked || entries.length <= minimum, removeReason = locked ? "This table is read-only." : removeDisabled ? ui.minimumRowsMessage || `At least ${minimum} ${minimum === 1 ? "row" : "rows"} must remain.` : void 0;
    const selectedToken = choiceIdentityToken(saved);
    return /* @__PURE__ */ React.createElement("tr", { key: entry?.id || index }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { "data-schema-widget-change": "choice", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index, "aria-label": rowLabel, "aria-description": missing ? "The saved choice is unavailable; select an available replacement." : void 0, value: selectedToken, disabled: locked, onChange: (event) => act("choice", { row: index, value: records.find((record) => choiceIdentityToken(record?.[property]) === event.target.value)?.[property], identityToken: event.target.value }, event) }, missing ? /* @__PURE__ */ React.createElement("option", { value: selectedToken, disabled: true }, `Unavailable (${String(saved ?? "")})`) : null, available.map((record, choice) => /* @__PURE__ */ React.createElement("option", { key: choice, value: choiceIdentityToken(record?.[property]), title: context.formatChoiceLabel?.(ui.choiceDescriptionTemplate, record) || "" }, context.formatChoiceLabel?.(ui.choiceLabelTemplate, record) || String(record?.[property] ?? ""))))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "row-actions" }, rowReorderingAllowed(schema, ui) ? /* @__PURE__ */ React.createElement(RowMoveControls, { index, length: entries.length, label: rowLabel, attributes: { "data-schema-widget-action": "move", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index }, onMove: (direction, event) => act("move", { row: index, direction }, event) }) : null, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "remove", "data-schema-widget-path": JSON.stringify(path), "data-schema-widget-row": index, "aria-label": context.formatChoiceLabel?.(ui.removeAriaLabelTemplate, { index: index + 1 }) || `${ui.removeLabel || "Remove"} ${index + 1}`, "aria-description": removeReason, title: removeReason, disabled: removeDisabled, onClick: (event) => act("remove", { row: index }, event) }, ui.removeLabel || "Remove"))));
  }), !entries.length || !records.length ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, className: "settings-empty" }, !records.length ? ui.noChoicesMessage || ui.emptyMessage || "No choices are available." : ui.emptyMessage || "No rows have been added.")) : null)), (() => {
    const addDisabled = locked || !hasChoice || maximum !== void 0 && entries.length >= Number(maximum);
    const addReason = locked ? "This table is read-only." : addDisabled ? maximum !== void 0 && entries.length >= Number(maximum) ? ui.maximumRowsMessage || `At most ${maximum} ${Number(maximum) === 1 ? "row" : "rows"} are allowed.` : ui.noAvailableChoicesMessage || ui.noUniqueChoiceMessage || "No unused choices are available." : void 0;
    return /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-schema-widget-action": "add", "data-schema-widget-path": JSON.stringify(path), "aria-description": addReason, title: addReason, disabled: addDisabled, onClick: (event) => act("add", {}, event) }, ui.addLabel || "Add");
  })(), ui.helpText ? /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, ui.helpText) : null))));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(RepeatableChoiceTable, { ...props, ...props.view });
}
const renderRepeatableChoiceTable = (props) => renderWidgetMarkup(/* @__PURE__ */ React.createElement(RepeatableChoiceTable, { ...props }));
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  RepeatableChoiceTable,
  Widget,
  mountWidget,
  renderRepeatableChoiceTable,
  renderRepeatableChoiceTableDesignEditor,
  repeatableChoiceTableDesignLabel,
  validateRepeatableChoiceTableAnnotation
};

//# sourceMappingURL=widget.js.map
