// Generated from number-map-default.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function NumberMapDefault({ view, onCommand }) {
  const { label, labels, enabled, rows } = view;
  return /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail sd-number-map-default" }, /* @__PURE__ */ React.createElement("h3", null, label), /* @__PURE__ */ React.createElement("label", { className: "sd-number-map-presence" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: enabled,
      "aria-label": labels.declareAriaLabel || "Declare " + label.toLowerCase(),
      onChange: (event) => onCommand({ type: "map.enabled", enabled: event.target.checked }, event)
    }
  ), " ", labels.declareLabel || "Declare default values"), /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row-list", hidden: !enabled }, !rows.length ? /* @__PURE__ */ React.createElement("p", { className: "sd-note" }, labels.emptyMessage || "No values declared.") : null, rows.map((row, index) => /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row", key: row.id }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: row.name,
      placeholder: labels.keyPlaceholder || "Key",
      "aria-label": label + " " + (labels.keyAriaName || "key") + " " + (index + 1),
      onChange: (event) => onCommand({ type: "map.patch", index, key: "name", value: event.target.value }, event)
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      inputMode: "decimal",
      value: row.number,
      placeholder: labels.valuePlaceholder || "Value",
      "aria-label": label + " " + (labels.valueAriaName || "value") + " " + (index + 1),
      onChange: (event) => onCommand({ type: "map.patch", index, key: "number", value: event.target.value }, event)
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Remove " + label + " row " + (index + 1), onClick: (event) => onCommand({ type: "map.remove", index }, event) }, labels.removeLabel || "Remove")))), /* @__PURE__ */ React.createElement("button", { type: "button", hidden: !enabled, onClick: (event) => onCommand({ type: "map.add" }, event) }, labels.addLabel || "Add value"));
}
function renderNumberMapDefault(parent, { source, state, key = "default", label = "Initial values", labels = {}, validationMessage } = {}) {
  const original = Object.hasOwn(source || {}, key) ? JSON.stringify(source[key]) : "";
  let value = object(source?.[key]) ? source[key] : {};
  if (typeof state === "string" && state) try {
    const saved2 = JSON.parse(state);
    if (object(saved2)) value = saved2;
  } catch {
  }
  let serial = 0, dirty = typeof state === "string" && state !== original;
  let view = {
    label,
    labels,
    enabled: typeof state === "string" ? state !== "" : Object.hasOwn(source || {}, key),
    rows: Object.entries(value).map(([name, number]) => ({ id: ++serial, name, number: String(number) }))
  }, mount;
  const saved = state?.format === "fullmeta-number-map-default-state/1" ? state.view : state;
  if (object(saved) && Array.isArray(saved.rows) && typeof saved.enabled === "boolean") {
    view = { ...view, enabled: saved.enabled, rows: structuredClone(saved.rows) };
    serial = Math.max(serial, ...view.rows.map((row) => Number.isSafeInteger(row.id) ? row.id : 0));
    dirty = state.dirty === true;
  }
  const host = document.createElement("div");
  parent.append(host);
  const onCommand = (command, event) => {
    view = { ...view, rows: view.rows.map((row) => ({ ...row })) };
    dirty = true;
    if (command.type === "map.enabled") view.enabled = command.enabled;
    else if (command.type === "map.patch") view.rows[command.index][command.key] = command.value;
    else if (command.type === "map.remove") view.rows.splice(command.index, 1);
    else if (command.type === "map.add") view.rows.push({ id: ++serial, name: "", number: "" });
    else throw new Error("Unknown number-map command " + command.type);
    mount.update({ view, onCommand });
    if (!event || event.type === "click") host.dispatchEvent(new Event("input", { bubbles: true }));
    if (command.type === "map.add") /** @type {HTMLInputElement|null} */
    host.querySelector(".sd-annotation-row:last-child input")?.focus();
  };
  mount = mountReactComponent(host, NumberMapDefault, { view, onCommand });
  const snapshot = () => !dirty ? original : !view.enabled ? "" : JSON.stringify(Object.fromEntries(view.rows.map((row) => {
    const number = Number(row.number);
    return [row.name.trim(), row.number.trim() && Number.isFinite(number) ? number : row.number];
  })));
  return {
    label: label + " default",
    keys: [key],
    type: "json",
    input: { get value() {
      return snapshot();
    } },
    original,
    snapshot,
    snapshotState: () => structuredClone({ format: "fullmeta-number-map-default-state/1", view, dirty }),
    dispose() {
      mount.dispose();
      host.remove();
    },
    validate(candidate) {
      if (!object(candidate) || view.rows.some((row) => !row.name.trim() || !row.number.trim()) || new Set(view.rows.map((row) => row.name.trim())).size !== view.rows.length || Object.values(candidate).some((number) => typeof number !== "number" || !Number.isFinite(number)))
        throw new Error(validationMessage || "Each value needs a unique key and a finite number.");
    }
  };
}
export {
  NumberMapDefault,
  renderNumberMapDefault
};

//# sourceMappingURL=number-map-default.js.map
