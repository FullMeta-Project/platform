// Generated from collection-controls.jsx by scripts/build-frontend.mjs.
import React from "./react-runtime.js";
function RowMoveControls({ index, length, label = "row", attributes = {}, onMove }) {
  if (!Number.isInteger(index) || !Number.isInteger(length) || index < 0 || index >= length) return null;
  const data = Object.fromEntries(Object.entries(attributes).filter(([key]) => /^data-[a-z][a-z0-9-]*$/.test(key) && key !== "data-row-move"));
  return /* @__PURE__ */ React.createElement("span", { className: "row-move-controls", role: "group", "aria-label": `Order ${label}`, tabIndex: -1 }, ["up", "down"].map((direction) => /* @__PURE__ */ React.createElement("button", { key: direction, className: "button row-move", type: "button", "data-row-move": direction, ...data, title: `Move ${label} ${direction}`, "aria-label": `Move ${label} ${direction}`, disabled: direction === "up" ? index === 0 : index === length - 1, onClick: (event) => onMove?.(direction, event) }, direction === "up" ? "\u2191" : "\u2193")));
}
function collectionCommand(onCommand, widget, path, action, args, event) {
  if (!onCommand) return;
  event?.stopPropagation();
  const kind = ["choice", "keyed-choice", "varying-column", "fixed-value", "mode", "x-column"].includes(action) ? "change" : "action";
  return onCommand({ type: "widget.action", widget, path, action, args: { kind, ...kind === "change" ? { change: action } : {}, ...args } }, event);
}
function collectionFieldChange(onCommand, path, value, valueType, event) {
  if (!onCommand) return;
  event?.stopPropagation();
  return onCommand({ type: "field.change", path, value, rawValue: event?.target?.value ?? value, valueType }, event);
}
export {
  RowMoveControls,
  collectionCommand,
  collectionFieldChange
};

//# sourceMappingURL=collection-controls.js.map
