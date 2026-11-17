// Generated from schema-annotation-picker.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { availableEntries } from "./schema-annotation-picker-model.js";
import { fieldUiBehavior, legacyFieldUiView, writeFieldUiBehavior } from "../../annotation-language.js";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value), mounts = /* @__PURE__ */ new WeakMap();
function SchemaAnnotationPicker({ view, onCommand }) {
  return /* @__PURE__ */ React.createElement("div", { className: "schema-annotation-picker" }, view.entries.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Add annotation ", /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": "Annotation to add",
      value: String(view.selected),
      onChange: (event) => onCommand({ type: "picker.select", index: Number(event.target.value) })
    },
    view.entries.map((entry, index) => /* @__PURE__ */ React.createElement("option", { key: entry.kind + ":" + entry.key, value: String(index) }, entry.group, ": ", entry.label))
  )), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onCommand({ type: "picker.add" }) }, "Add")) : /* @__PURE__ */ React.createElement("span", null, "All catalogued annotations are present."));
}
function mountSchemaAnnotationPicker({ container, declaration, catalog, isRootSchema = false, fieldContext, onAdd } = {}) {
  if (!container || typeof container.replaceChildren !== "function" || !object(declaration)) throw new Error("Choose a schema declaration for its annotation picker.");
  mounts.get(container)?.dispose();
  const entries = availableEntries(declaration, catalog, isRootSchema);
  let selected = 0, mount, disposed = false;
  const props = () => ({ view: { entries, selected }, onCommand });
  const onCommand = (command) => {
    if (command.type === "picker.select") {
      selected = command.index;
      mount.update(props());
      return;
    }
    if (command.type !== "picker.add") throw new Error("Unknown annotation picker command.");
    const entry = entries[selected];
    if (!entry) return;
    const next = legacyFieldUiView(declaration);
    if (!object(next["x-fullmeta-ui"])) next["x-fullmeta-ui"] = {};
    if (entry.kind === "group" || entry.kind === "presentation") {
      if (Object.hasOwn(next["x-fullmeta-ui"], entry.key)) return;
      next["x-fullmeta-ui"][entry.key] = structuredClone(entry.value);
    } else {
      for (const type of catalog?.types || []) if (typeof type.key === "string") delete next[type.key];
      next["x-fullmeta-ui"].widget = entry.widget;
      next[entry.key] = structuredClone(entry.value);
    }
    const encoded = writeFieldUiBehavior(next, { context: fieldUiBehavior(declaration)?.context || fieldContext || catalog?.fieldContext || "projectEditing" });
    onAdd?.(encoded, { kind: entry.kind, key: entry.key, path: [...entry.path] });
  };
  mount = mountReactComponent(container, SchemaAnnotationPicker, props());
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (mounts.get(container) === api) mounts.delete(container);
    mount.dispose();
  };
  const api = {
    available: entries.map(({ kind, key, label, path }) => ({ kind, key, label, path: [...path] })),
    snapshot: () => ({ format: "fullmeta-annotation-picker-state/1", selected }),
    dispose,
    destroy: dispose
  };
  mounts.set(container, api);
  return api;
}
export {
  SchemaAnnotationPicker,
  mountSchemaAnnotationPicker
};

//# sourceMappingURL=schema-annotation-picker.js.map
