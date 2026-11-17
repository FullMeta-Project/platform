// Generated from widget.jsx by scripts/build-frontend.mjs.
import React, { useMemo, useReducer, useState, useLayoutEffect, useRef } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { createJsonChoiceDraft, jsonChoiceTypes } from "./model.js";
import { createJsonChoiceDraft as createJsonChoiceDraft2, jsonChoiceTypes as jsonChoiceTypes2 } from "./model.js";
function JsonChoiceTable({ value, state, label = "Allowed values", onChange, onCommand, path = [], editLabels = false, choiceLabels, draft: provided, wrap = true }) {
  const fallback = useMemo(() => createJsonChoiceDraft({ value, state, editLabels, choiceLabels }), [value, state, editLabels, choiceLabels]), draft = provided || fallback;
  const [, refresh] = useReducer((value2) => value2 + 1, 0), [showTypes, setShowTypes] = useState(!draft.simple()), focus = useRef(null), root = useRef(null);
  const view = draft.view(), typesVisible = showTypes || !draft.simple();
  useLayoutEffect(() => {
    if (focus.current !== null) {
      const input = root.current?.querySelector(`[data-choice-value-index="${focus.current}"]`);
      if (input instanceof HTMLElement) input.focus();
      focus.current = null;
    }
  });
  let error = "";
  try {
    draft.read();
  } catch (failure) {
    error = `${draft.unchanged() ? "Existing declaration is preserved. " : ""}${failure.message}`;
  }
  const change = (command, event, focusIndex = null) => {
    event?.stopPropagation();
    if (!draft.dispatch(command)) return;
    if (focusIndex !== null) focus.current = focusIndex;
    refresh();
    const snapshot = draft.snapshot();
    onChange?.(snapshot);
    onCommand?.({ type: "widget.action", widget: "jsonChoiceTable", path, action: "draft", args: { kind: "action", command, state: snapshot } }, event);
  };
  const Tag = wrap ? "section" : "div";
  return /* @__PURE__ */ React.createElement(Tag, { ref: root, className: wrap ? `json-choice-table${editLabels ? " json-choice-table--labels" : ""}` : "json-choice-content", role: wrap ? "group" : void 0, "aria-label": wrap ? label : void 0, onInput: (event) => event.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "json-choice-heading" }, /* @__PURE__ */ React.createElement("strong", null, label), /* @__PURE__ */ React.createElement("span", null, view.present ? `${view.rows.length} ${view.rows.length === 1 ? "value" : "values"}` : "Not declared here")), /* @__PURE__ */ React.createElement("label", { className: "json-choice-presence" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: view.present, "aria-label": `Declare ${label.toLowerCase()} here`, onChange: (event) => change({ type: "presence", present: event.target.checked }, event) }), " Declare allowed values here"), /* @__PURE__ */ React.createElement("div", { className: "json-choice-scroll", hidden: !view.present || !view.rows.length }, /* @__PURE__ */ React.createElement("table", { "aria-label": `${label} table` }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { scope: "col", hidden: !typesVisible }, "Type"), /* @__PURE__ */ React.createElement("th", { scope: "col" }, "Value"), editLabels ? /* @__PURE__ */ React.createElement("th", { scope: "col" }, "Display label") : null, /* @__PURE__ */ React.createElement("th", { scope: "col" }, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, view.rows.map((row, index) => {
    const attrs = { "aria-label": `Allowed value ${index + 1}`, "data-choice-value-index": index, value: row.text };
    const input = row.type === "boolean" ? /* @__PURE__ */ React.createElement("select", { ...attrs, onChange: (event) => change({ type: "text", row: index, text: event.target.value }, event) }, /* @__PURE__ */ React.createElement("option", { value: "true" }, "true"), /* @__PURE__ */ React.createElement("option", { value: "false" }, "false")) : row.type === "null" ? /* @__PURE__ */ React.createElement("input", { ...attrs, type: "text", readOnly: true }) : row.type === "number" ? /* @__PURE__ */ React.createElement("input", { ...attrs, type: "text", inputMode: "decimal", placeholder: "JSON number", onChange: (event) => change({ type: "text", row: index, text: event.target.value }, event) }) : /* @__PURE__ */ React.createElement("textarea", { ...attrs, rows: row.type === "string" ? Math.min(4, Math.max(1, row.text.split("\n").length)) : 3, spellCheck: false, onChange: (event) => change({ type: "text", row: index, text: event.target.value }, event) });
    return /* @__PURE__ */ React.createElement("tr", { key: view.rowKeys[index] }, /* @__PURE__ */ React.createElement("td", { hidden: !typesVisible }, /* @__PURE__ */ React.createElement("select", { "aria-label": `Allowed value ${index + 1} type`, value: row.type, onChange: (event) => change({ type: "type", row: index, value: event.target.value }, event, index) }, jsonChoiceTypes.map(([type, name]) => /* @__PURE__ */ React.createElement("option", { key: type, value: type }, name)))), /* @__PURE__ */ React.createElement("td", null, input), editLabels ? /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", value: row.label, placeholder: "Same as value", "aria-label": `Display label for allowed value ${index + 1}`, onChange: (event) => change({ type: "label", row: index, label: event.target.value }, event) })) : null, /* @__PURE__ */ React.createElement("td", { className: "json-choice-row-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: index === 0, "aria-label": `Move allowed value ${index + 1} up`, onClick: (event) => change({ type: "move", row: index, direction: "up" }, event, index - 1) }, "\u2191"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: index === view.rows.length - 1, "aria-label": `Move allowed value ${index + 1} down`, onClick: (event) => change({ type: "move", row: index, direction: "down" }, event, index + 1) }, "\u2193"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": `Remove allowed value ${index + 1}`, onClick: (event) => change({ type: "remove", row: index }, event, Math.min(index, view.rows.length - 2)) }, "Remove")));
  })))), /* @__PURE__ */ React.createElement("p", { className: "json-choice-note", hidden: view.present && view.rows.length > 0 }, view.present ? "The local enum has no rows. Add a value or turn off the restriction." : "No local enum. Add values to declare a restriction here."), /* @__PURE__ */ React.createElement("div", { className: "json-choice-controls" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: (event) => change({ type: "add" }, event, view.rows.length) }, "Add value"), /* @__PURE__ */ React.createElement("button", { type: "button", hidden: !view.present || !view.rows.length || !draft.simple(), onClick: () => setShowTypes(!typesVisible) }, typesVisible ? "Hide value types" : "Edit value types")), /* @__PURE__ */ React.createElement("p", { className: "json-choice-error", role: "status" }, error));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(JsonChoiceTable, { ...props, ...props.view });
}
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
function createJsonChoiceTable(options = {}) {
  const root = document.createElement("section");
  root.className = `json-choice-table${options.editLabels ? " json-choice-table--labels" : ""}`;
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", options.label || "Allowed values");
  const draft = createJsonChoiceDraft(options), mount = mountReactComponent(root, JsonChoiceTable, { ...options, draft, wrap: false, onChange(snapshot) {
    options.onChange?.(snapshot);
    root.dispatchEvent(new Event("input", { bubbles: true }));
  } });
  return { element: root, snapshot: draft.snapshot, read: draft.read, dispose: mount.dispose, get value() {
    return draft.value;
  }, get choiceLabelsValue() {
    return draft.choiceLabelsValue;
  } };
}
export {
  JsonChoiceTable,
  Widget,
  createJsonChoiceDraft2 as createJsonChoiceDraft,
  createJsonChoiceTable,
  jsonChoiceTypes2 as jsonChoiceTypes,
  mountWidget
};

//# sourceMappingURL=widget.js.map
