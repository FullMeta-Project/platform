// Generated from schema-root-contracts-view.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { CandidateField, CandidateRows, createCandidateDialog, draftProperty, withDraftProperty } from "./candidate-dialog.js";
import { contractFromFlatRows, flatContractRows, parseContractPath } from "./schema-root-contract-flat.js";
import { parseSiblingObjectMatrix } from "./schema-root-contract-matrix.js";
import { rootContractImportPath } from "./schema-root-contracts.js";
const kind = (value) => Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
const container = (value) => value !== null && typeof value === "object";
const at = (value, path) => path.reduce((node, key) => node?.[key], value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const initial = (source, extensionKey) => {
  const value = extensionKey ? structuredClone(source[extensionKey]) : {};
  return { extensionKey, newKey: extensionKey ? "" : "x-example", value, mode: "nested", flatRows: container(value) ? flatContractRows(value) : [], stagedRows: [], pathText: "", matrixText: "", matrixBranch: "", error: "" };
};
function parsedRows(text, key) {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const rows = lines.map((line, index) => {
    const cells = line.split("	");
    if (!index && cells[0]?.trim().toLowerCase() === "path" && cells[1]?.trim().toLowerCase() === "type") return null;
    if (cells.length !== 3) throw new Error(`Line ${index + 1}: use path, type and value columns.`);
    return { path: rootContractImportPath(cells[0].trim(), key), type: cells[1].trim(), value: cells[2] };
  }).filter(Boolean);
  if (!rows.length) throw new Error("Enter path and value rows.");
  return rows;
}
function branches(value, path = [], output = []) {
  if (!container(value)) return output;
  if (Object.values(value).some(container)) output.push(path.map((part) => String(part).replace(/~/g, "~0").replace(/\//g, "~1")).join("/"));
  for (const [key, child] of Object.entries(value)) if (container(child)) branches(child, [...path, key], output);
  return output;
}
function RootContractsEditor({ draft, onDraftChange, source }) {
  const fallback = initial(source, draftProperty(draft, "extensionKey")?.value || "");
  const value = Object.fromEntries((draft.entries || []).map((entry) => {
    try {
      return [entry.key, readStructuredValueDraft(entry.value)];
    } catch {
      return [entry.key, fallback[entry.key]];
    }
  })), keys = Object.keys(source).filter((key) => key.startsWith("x-"));
  const update = (patch) => onDraftChange(Object.entries(patch).reduce((next, [key, value2]) => withDraftProperty(next, key, structuredValueDraft(value2)), draft));
  const fail = (fn) => {
    try {
      fn();
    } catch (error) {
      update({ error: error.message });
    }
  };
  const current = value.mode === "flat" && container(value.value) ? (() => {
    try {
      return contractFromFlatRows(kind(value.value), value.flatRows);
    } catch {
      return value.value;
    }
  })() : value.value;
  const target = (key) => {
    const dirty = value.pathText.trim() || value.matrixText.trim() || value.stagedRows.length || !same(source[value.extensionKey], current);
    if (dirty && !globalThis.confirm("Discard unloaded batch text and staged extension changes?")) return;
    onDraftChange(structuredValueDraft({ ...initial(source, key), mode: value.mode }));
  };
  const stage = (rows, replace = false) => {
    const base = source[value.extensionKey] ?? value.value;
    if (!container(base)) throw new Error("Choose an object or array root extension for table rows.");
    const staged = new Map((replace ? [] : value.stagedRows).map((row) => [row.path, row]));
    for (const row of rows) staged.set(row.path, row);
    const merged = new Map(flatContractRows(base).map((row) => [row.path, row]));
    for (const row of staged.values()) merged.set(row.path, row);
    const next = contractFromFlatRows(kind(base), [...merged.values()]);
    update({ value: next, flatRows: flatContractRows(next), stagedRows: [...staged.values()], pathText: "", matrixText: "", error: "" });
  };
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Active extension: ", value.extensionKey || value.newKey, " \xB7 type: ", kind(current), " \xB7 schema path: #/", value.extensionKey || value.newKey), /* @__PURE__ */ React.createElement("label", null, "Root extension", /* @__PURE__ */ React.createElement("select", { "aria-label": "Root extension", value: value.extensionKey, onChange: (event) => target(event.target.value) }, keys.map((key) => /* @__PURE__ */ React.createElement("option", { key }, key)))), /* @__PURE__ */ React.createElement(CandidateField, { draft, name: "newKey", label: "New extension key (optional)", onDraftChange }), /* @__PURE__ */ React.createElement("label", null, "Root contract view", /* @__PURE__ */ React.createElement("select", { "aria-label": "Root contract view", value: value.mode, onChange: (event) => {
    if (value.pathText.trim() || value.matrixText.trim()) {
      update({ error: "Load or Clear pending batch text before changing view." });
      return;
    }
    update({ mode: event.target.value, ...event.target.value === "flat" && container(value.value) ? { flatRows: flatContractRows(value.value) } : {} });
  } }, /* @__PURE__ */ React.createElement("option", { value: "nested" }, "Nested structured fields"), /* @__PURE__ */ React.createElement("option", { value: "flat" }, "Typed path rows"))), value.mode === "nested" ? /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: draftProperty(draft, "value"), label: "Extension value", onDraftChange: (node) => {
    const next = withDraftProperty(draft, "value", node);
    onDraftChange(next);
  } }) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CandidateRows, { draft: draftProperty(draft, "flatRows"), label: "Root contract fields", columns: [{ name: "path" }, { name: "type", choices: ["string", "escaped-string", "reference", "number", "boolean", "null", "object", "array"] }, { name: "value" }], template: { path: "", type: "string", value: "" }, onDraftChange: (node) => onDraftChange(withDraftProperty(draft, "flatRows", node)) }), /* @__PURE__ */ React.createElement("label", null, "Tab-separated path and value rows", /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Tab-separated path and value rows", rows: 4, value: value.pathText, onChange: (event) => update({ pathText: event.target.value, error: "" }) })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => fail(() => stage(parsedRows(value.pathText, value.extensionKey))) }, "Load table rows"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => fail(() => stage(parsedRows(value.pathText, value.extensionKey), true)) }, "Replace staged path rows"), /* @__PURE__ */ React.createElement("label", null, "Sibling-object matrix branch", /* @__PURE__ */ React.createElement("select", { "aria-label": "Sibling-object matrix branch", value: value.matrixBranch, onChange: (event) => update({ matrixBranch: event.target.value }) }, branches(current).map((path) => /* @__PURE__ */ React.createElement("option", { key: path, value: path }, path || "(extension root)")))), /* @__PURE__ */ React.createElement("label", null, "Tab-separated sibling-object matrix", /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Tab-separated sibling-object matrix", rows: 4, value: value.matrixText, onChange: (event) => update({ matrixText: event.target.value, error: "" }) })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => fail(() => {
    const path = value.matrixBranch ? parseContractPath(value.matrixBranch) : [];
    stage(parseSiblingObjectMatrix(value.matrixText, path, at(current, path)));
  }) }, "Load matrix rows")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => update({ pathText: "", matrixText: "", error: "" }) }, "Clear batch text"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onDraftChange(structuredValueDraft({ ...initial(source, value.extensionKey), mode: value.mode })) }, "Clear staged extension changes"), value.error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, value.error) : null);
}
function createBulkRootContractsDialog(options) {
  return createCandidateDialog({ ...options, title: "Root extension contracts", toolId: "rootContracts", className: "schema-bulk-contracts-dialog", Editor: RootContractsEditor, initialDraft(source, context) {
    const keys = Object.keys(source).filter((key) => key.startsWith("x-"));
    return initial(source, typeof context === "string" && keys.includes(context) ? context : keys.find((key) => key !== "x-fullmeta-ui-generated") || keys[0] || "");
  }, buildCandidate(source, draft) {
    if (draft.pathText.trim() || draft.matrixText.trim()) throw new Error("Load or Clear pending path/value and matrix text before Preview.");
    const key = String(draft.newKey || draft.extensionKey).trim();
    if (!/^x-[A-Za-z0-9_.-]+$/.test(key)) throw new Error("Extension keys must begin with x-.");
    if (draft.newKey && Object.hasOwn(source, key)) throw new Error("The new extension already exists. Select it instead.");
    const value = draft.mode === "flat" && container(draft.value) ? contractFromFlatRows(kind(draft.value), draft.flatRows) : draft.value;
    const candidate = structuredClone(source);
    Object.defineProperty(candidate, key, { value, enumerable: true, writable: true, configurable: true });
    return candidate;
  } });
}
export {
  RootContractsEditor,
  createBulkRootContractsDialog
};

//# sourceMappingURL=schema-root-contracts-view.js.map
