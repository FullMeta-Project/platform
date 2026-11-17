// Generated from schema-authoring-path-picker.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
import { schemaAuthoringPathEntries } from "./schema-authoring-path-model.js";
import { schemaAuthoringPathEntries as schemaAuthoringPathEntries2, schemaAuthoringPathRepresentations } from "./schema-authoring-path-model.js";
const representations = [["schemaPointer", "Schema JSON Pointer"], ["dataPointer", "Validation data JSON Pointer"], ["referencePath", "Annotation reference dotted keys"]];
const identity = (entry) => entry.schemaPointer + "\n" + (entry.dataPointer ?? "(unbound)");
function SchemaAuthoringPathPicker({ view, onCommand }) {
  const { title, query, visible, selected, representation, status } = view;
  return /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-content" }, /* @__PURE__ */ React.createElement("header", { className: "schema-validation-dialog-head" }, /* @__PURE__ */ React.createElement("h2", null, title), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => onCommand({ type: "path.close" }) }, "Close")), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-body" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "search",
      placeholder: "Filter by title, property key, or path",
      value: query,
      "aria-label": "Find schema or data path",
      onChange: (event) => onCommand({ type: "path.query", value: event.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      size: 9,
      "aria-label": "Available schema or data paths",
      value: selected ? identity(selected) : "",
      onChange: (event) => onCommand({ type: "path.select", key: event.target.value })
    },
    visible.map((entry) => /* @__PURE__ */ React.createElement("option", { key: identity(entry), value: identity(entry) }, entry.title, " \xB7 ", entry[representation] || "(root)", entry.type ? " \xB7 " + entry.type : ""))
  ), /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-path-representations" }, selected ? representations.map(([key, label]) => /* @__PURE__ */ React.createElement("label", { key }, label, /* @__PURE__ */ React.createElement("input", { readOnly: true, value: selected[key] === null ? "Unavailable for this declaration" : selected[key], "aria-label": label }), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "button",
      "aria-label": "Copy " + label.toLowerCase(),
      disabled: selected[key] === null,
      onClick: () => onCommand({ type: "path.copy", key, label })
    },
    "Copy"
  ))) : null), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, "Schema pointers identify declarations. Data pointers identify model values and use * for collection items. Reference paths use dotted property keys and a separately selected source."), /* @__PURE__ */ React.createElement("p", { role: "status", className: "schema-bulk-note" }, status)), /* @__PURE__ */ React.createElement("footer", { className: "schema-validation-dialog-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => onCommand({ type: "path.close" }) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: !selected, onClick: () => onCommand({ type: "path.use" }) }, "Use path")));
}
function createSchemaAuthoringPathPicker({ getDocument, onPick, title = "Choose a schema or data path" }) {
  let entries = [], options = {}, query = "", selectedKey = null, status = "", mount;
  const dialog = document.createElement("dialog");
  dialog.className = "schema-bulk-dialog schema-authoring-path-dialog";
  document.body.append(dialog);
  const view = () => {
    const needle = query.trim().toLowerCase(), representation = options.representation || "schemaPointer";
    const visible = entries.filter((entry) => entry[representation] !== null && (!needle || [entry.title, entry.schemaPointer, entry.dataPointer || "", entry.referencePath || ""].join(" ").toLowerCase().includes(needle)));
    const selected = visible.find((entry) => identity(entry) === selectedKey) || visible[0] || null;
    selectedKey = selected ? identity(selected) : null;
    return { title, query, representation, visible, selected, status: status || visible.length + " available paths." };
  };
  const render = () => mount.update({ view: view(), onCommand });
  const onCommand = async (command) => {
    if (command.type === "path.query") {
      query = command.value;
      selectedKey = null;
      status = "";
    } else if (command.type === "path.select") {
      selectedKey = command.key;
      status = "";
    } else if (command.type === "path.close") {
      dialog.close();
      return;
    } else if (command.type === "path.use") {
      const selected = view().selected;
      if (selected) (options.onPick || onPick)?.(structuredClone(selected));
      dialog.close();
      return;
    } else if (command.type === "path.copy") {
      const selected = view().selected;
      if (!selected || selected[command.key] === null) return;
      try {
        await navigator.clipboard.writeText(selected[command.key]);
        status = "Copied " + command.label.toLowerCase() + ".";
      } catch {
        const input = [...dialog.querySelectorAll("input")].find((node) => node.getAttribute("aria-label") === command.label);
        input?.focus();
        input?.select();
        status = "Select and copy the highlighted path.";
      }
    } else throw new Error("Unknown path picker command " + command.type);
    render();
  };
  mount = mountReactComponent(dialog, SchemaAuthoringPathPicker, { view: view(), onCommand });
  return {
    open(nextOptions = {}) {
      options = { representation: "schemaPointer", ...nextOptions };
      if (!representations.some(([key]) => key === options.representation)) throw new Error("Choose a supported path representation.");
      entries = schemaAuthoringPathEntries(getDocument());
      query = "";
      status = "";
      selectedKey = null;
      if (Array.isArray(options.initialPath)) {
        const selected = entries.find((entry) => JSON.stringify(entry.schemaPath) === JSON.stringify(options.initialPath));
        if (selected) selectedKey = identity(selected);
      }
      render();
      dialog.showModal();
      /** @type {HTMLInputElement|null} */
      dialog.querySelector('input[type="search"]')?.focus();
    },
    snapshot: () => ({ format: "fullmeta-schema-path-picker-state/1", query, selectedKey, representation: options.representation || "schemaPointer", open: dialog.open }),
    dispose() {
      mount.dispose();
      dialog.remove();
    }
  };
}
export {
  SchemaAuthoringPathPicker,
  createSchemaAuthoringPathPicker,
  schemaAuthoringPathEntries2 as schemaAuthoringPathEntries,
  schemaAuthoringPathRepresentations
};

//# sourceMappingURL=schema-authoring-path-picker.js.map
