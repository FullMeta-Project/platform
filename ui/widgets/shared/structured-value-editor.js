// Generated from structured-value-editor.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function validateStructuredValueDraftShape(draft) {
  const ancestors = /* @__PURE__ */ new Set();
  const visit = (node) => {
    if (!record(node) || ancestors.has(node) || !["null", "string", "number", "boolean", "array", "object"].includes(node.type)) throw new Error("Unsupported structured draft state.");
    ancestors.add(node);
    validateBatchUi(node);
    if (["string", "number"].includes(node.type) && typeof node.value !== "string" && !(node.type === "number" && typeof node.value === "number" && Number.isFinite(node.value))) throw new Error("A structured scalar draft needs raw text.");
    if (node.type === "boolean" && typeof node.value !== "boolean") throw new Error("A boolean draft needs a boolean value.");
    if (node.type === "array") {
      if (!Array.isArray(node.items)) throw new Error("An array draft needs item drafts.");
      node.items.forEach(visit);
    }
    if (node.type === "object") {
      if (!Array.isArray(node.entries)) throw new Error("An object draft needs property drafts.");
      for (const entry of node.entries) {
        if (!record(entry) || typeof entry.key !== "string") throw new Error("An object draft needs named property records.");
        visit(entry.value);
      }
    }
    ancestors.delete(node);
  };
  visit(draft);
  return draft;
}
function structuredValueDraft(value) {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) return { type: "array", items: value.map(structuredValueDraft) };
  if (record(value)) return { type: "object", entries: Object.entries(value).map(([key, value2]) => ({ key, value: structuredValueDraft(value2) })) };
  if (typeof value === "string") return { type: "string", value };
  if (typeof value === "number" && Number.isFinite(value)) return { type: "number", value: String(value) };
  if (typeof value === "boolean") return { type: "boolean", value };
  throw new Error("Structured values must contain valid JSON data.");
}
function readStructuredValueDraft(draft) {
  if (!record(draft)) throw new Error("A structured value needs a selected type.");
  validateBatchUi(draft);
  if (draft.ui?.batchText) throw new Error("Add or Clear pending structured batch text before applying this value.");
  if (draft.type === "null") return null;
  if (draft.type === "string") return String(draft.value ?? "");
  if (draft.type === "boolean") return draft.value === true;
  if (draft.type === "number") {
    const raw = String(draft.value ?? "").trim();
    if (!raw || !Number.isFinite(Number(raw))) throw new Error("Enter a finite number.");
    return Number(raw);
  }
  if (draft.type === "array") {
    if (!Array.isArray(draft.items)) throw new Error("An array needs a list of items.");
    return draft.items.map(readStructuredValueDraft);
  }
  if (draft.type === "object") {
    if (!Array.isArray(draft.entries)) throw new Error("An object needs a list of properties.");
    const names = /* @__PURE__ */ new Set();
    return Object.fromEntries(draft.entries.map((entry) => {
      if (!record(entry) || typeof entry.key !== "string" || entry.pending && !entry.key.trim()) throw new Error("Every object property needs a name.");
      if (names.has(entry.key)) throw new Error("Object property names must be unique.");
      names.add(entry.key);
      return [entry.key, readStructuredValueDraft(entry.value)];
    }));
  }
  throw new Error(`Unsupported structured value type: ${draft.type}.`);
}
const newNode = (type) => type === "object" ? { type, entries: [] } : type === "array" ? { type, items: [] } : type === "null" ? { type } : type === "boolean" ? { type, value: false } : type === "number" ? { type, value: "0" } : { type: "string", value: "" };
function validateBatchUi(node) {
  if (node.ui === void 0) return;
  if (!record(node.ui) || node.ui.batchOpen !== void 0 && typeof node.ui.batchOpen !== "boolean" || node.ui.batchText !== void 0 && typeof node.ui.batchText !== "string" || node.ui.batchError !== void 0 && typeof node.ui.batchError !== "string") throw new Error("Structured batch state needs an open flag and raw text diagnostics.");
}
function ValueNode({ node, label, path = [], onChange, depth = 0, fixedObjectKeysAtRoot = false }) {
  const [expanded, setExpanded] = React.useState(depth < 2);
  const [visited, setVisited] = React.useState(depth < 2);
  const { batchOpen = false, batchText: batch = "", batchError = "" } = node.ui || {};
  const fixedKeys = fixedObjectKeysAtRoot && path.length === 0 && node.type === "object";
  const update = (patch, metadata = {}) => onChange({ ...node, ...patch }, metadata);
  const updateUi = (patch, metadata = { presentationOnly: true }) => update({ ui: { ...node.ui, ...patch } }, metadata);
  const changeChild = (index, value, metadata) => node.type === "array" ? update({ items: node.items.map((item, i) => i === index ? value : item) }, metadata) : update({ entries: node.entries.map((item, i) => i === index ? { ...item, value } : item) }, metadata);
  const addBatch = () => {
    try {
      const lines = batch.split(/\r?\n/).map((line, index) => ({ text: line.trim(), line: index + 1 })).filter((x) => x.text);
      if (!lines.length) throw new Error(node.type === "object" ? "Enter at least one property name." : "Enter at least one JSON item.");
      const ui = { ...node.ui, batchText: "", batchError: "", batchOpen: false };
      if (node.type === "object") {
        const names = new Set(node.entries.map((x) => x.key));
        for (const line of lines) {
          if (names.has(line.text)) throw new Error(`The property \u201C${line.text}\u201D already exists in this group.`);
          names.add(line.text);
        }
        update({ entries: [...node.entries, ...lines.map((line) => ({ key: line.text, value: newNode("string") }))], ui });
      } else {
        const items = lines.map((line) => {
          try {
            return structuredValueDraft(JSON.parse(line.text));
          } catch {
            throw new Error(`Line ${line.line} is not valid JSON. Quote text values, for example: "mesh".`);
          }
        });
        update({ items: [...node.items, ...items], ui });
      }
    } catch (error) {
      updateUi({ batchError: error.message });
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "structured-value-node", "data-structured-path": JSON.stringify(path) }, /* @__PURE__ */ React.createElement("div", { className: "structured-value-head" }, /* @__PURE__ */ React.createElement("span", { className: "structured-value-label" }, label.split(" \xB7 ").at(-1)), /* @__PURE__ */ React.createElement("select", { className: "structured-value-type", "aria-label": `${label} value type`, value: node.type, disabled: Boolean(batch) || fixedKeys, title: fixedKeys ? "The map rule fields are fixed." : batch ? "Add or Clear pending batch text before changing the value type." : void 0, onChange: (event) => onChange(newNode(event.target.value)) }, [["string", "Text"], ["number", "Number"], ["boolean", "Yes / no"], ["null", "Null"], ["object", "Group"], ["array", "List"]].map(([value, text]) => /* @__PURE__ */ React.createElement("option", { key: value, value }, text)))), node.type === "string" ? /* @__PURE__ */ React.createElement("textarea", { className: "structured-value-text", rows: String(node.value || "").includes("\n") ? 3 : 1, "aria-label": label, value: node.value ?? "", onChange: (event) => update({ value: event.target.value }) }) : null, node.type === "number" ? /* @__PURE__ */ React.createElement("input", { className: "structured-value-text", type: "text", inputMode: "decimal", "aria-label": label, value: node.value ?? "", onChange: (event) => update({ value: event.target.value }) }) : null, node.type === "boolean" ? /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": label, checked: node.value === true, onChange: (event) => update({ value: event.target.checked }) }), "Yes") : null, node.type === "null" ? /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, "Null") : null, ["object", "array"].includes(node.type) ? /* @__PURE__ */ React.createElement("details", { className: "structured-value-children", open: expanded, onToggle: (event) => {
    const open = event.currentTarget.open;
    setExpanded(open);
    if (open) setVisited(true);
  } }, /* @__PURE__ */ React.createElement("summary", null, node.type === "object" ? `${node.entries.length} properties` : `${node.items.length} items`), visited ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "structured-value-list" }, (node.type === "object" ? node.entries : node.items).map((entry, index) => /* @__PURE__ */ React.createElement("div", { className: "structured-value-entry", key: index }, node.type === "object" ? fixedKeys ? /* @__PURE__ */ React.createElement("span", { className: "structured-value-key-label" }, entry.key) : /* @__PURE__ */ React.createElement("input", { className: "structured-value-key", "aria-label": `${label} property ${index + 1} name`, value: entry.key, onChange: (event) => update({ entries: node.entries.map((item, i) => i === index ? { ...item, key: event.target.value, pending: false } : item) }) }) : null, /* @__PURE__ */ React.createElement(ValueNode, { node: node.type === "object" ? entry.value : entry, label: `${label} \xB7 ${node.type === "object" ? entry.key || "New property" : `item ${index + 1}`}`, path: [...path, node.type === "object" ? entry.key : index], onChange: (value, metadata) => changeChild(index, value, metadata), depth: depth + 1, fixedObjectKeysAtRoot }), fixedKeys ? null : /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": node.type === "object" ? `Remove property ${entry.key}` : `Remove item ${index + 1}`, onClick: () => node.type === "object" ? update({ entries: node.entries.filter((_, i) => i !== index) }) : update({ items: node.items.filter((_, i) => i !== index) }) }, "Remove")))), fixedKeys ? null : /* @__PURE__ */ React.createElement("button", { type: "button", className: "structured-value-add", onClick: () => node.type === "object" ? update({ entries: [...node.entries, { key: "", pending: true, value: newNode("string") }] }) : update({ items: [...node.items, newNode("string")] }) }, node.type === "object" ? "Add property" : "Add item"), fixedKeys ? null : /* @__PURE__ */ React.createElement("div", { className: "structured-value-batch" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "structured-value-add", "aria-expanded": batchOpen, onClick: () => updateUi({ batchOpen: !batchOpen }) }, node.type === "object" ? "Add several properties" : "Add several items"), batch && !batchOpen ? /* @__PURE__ */ React.createElement("p", { role: "status" }, "Unstaged batch text. Open Add several and Add or Clear it before applying.") : null, batchOpen ? /* @__PURE__ */ React.createElement("div", { className: "structured-value-batch-panel" }, /* @__PURE__ */ React.createElement("span", null, node.type === "object" ? "Enter one property name per line. New fields start as empty text values." : "Enter one JSON item per line. Items can be text, numbers, groups, or tuple arrays."), /* @__PURE__ */ React.createElement("textarea", { className: "structured-value-text", rows: 3, "aria-label": `${label} ${node.type === "object" ? "property names" : "items"} to add`, value: batch, onChange: (event) => updateUi({ batchText: event.target.value, batchError: "" }, { presentationOnly: false }) }), /* @__PURE__ */ React.createElement("p", { className: "structured-value-error", role: "status" }, batchError), /* @__PURE__ */ React.createElement("button", { type: "button", className: "structured-value-add", onClick: addBatch }, node.type === "object" ? "Add properties" : "Add items"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "structured-value-add", onClick: () => updateUi({ batchText: "", batchError: "" }, { presentationOnly: false }) }, "Clear batch text")) : null)) : null) : null);
}
function StructuredValueEditor({ draft, label = "Value", onDraftChange, error = "", disabled = false, fixedObjectKeysAtRoot = false }) {
  return /* @__PURE__ */ React.createElement("fieldset", { className: "structured-value-editor", disabled }, /* @__PURE__ */ React.createElement(ValueNode, { node: draft, label, onChange: onDraftChange, fixedObjectKeysAtRoot }), /* @__PURE__ */ React.createElement("p", { className: "structured-value-error", role: "status" }, error));
}
function mountStructuredValueEditor({ container, value, label = "Value", onChange, onDraftChange } = {}) {
  if (!container || typeof container.replaceChildren !== "function") throw new Error("Choose a container for the structured value editor.");
  let draft = structuredValueDraft(value), error = "", mount;
  const props = () => ({ draft, label, error, onDraftChange(next, metadata = {}) {
    draft = next;
    onDraftChange?.(structuredClone(draft), metadata);
    try {
      const value2 = readStructuredValueDraft(draft);
      error = "";
      if (!metadata.presentationOnly) onChange?.(structuredClone(value2));
    } catch (issue) {
      error = issue.message;
    }
    if (mount.inspect().mounted) mount.update(props());
  } });
  mount = mountReactComponent(container, StructuredValueEditor, props());
  return { snapshot: () => structuredClone(readStructuredValueDraft(draft)), commit: () => structuredClone(readStructuredValueDraft(draft)), draft: () => structuredClone(draft), restore(next) {
    validateStructuredValueDraftShape(next);
    draft = structuredClone(next);
    try {
      readStructuredValueDraft(draft);
      error = "";
    } catch (issue) {
      error = issue.message;
    }
    mount.update(props());
  }, update(next) {
    if (Object.hasOwn(next, "value")) draft = structuredValueDraft(next.value);
    if (next.label !== void 0) label = next.label;
    mount.update(props());
  }, dispose: () => mount.dispose() };
}
export {
  StructuredValueEditor,
  mountStructuredValueEditor,
  readStructuredValueDraft,
  structuredValueDraft,
  validateStructuredValueDraftShape
};

//# sourceMappingURL=structured-value-editor.js.map
