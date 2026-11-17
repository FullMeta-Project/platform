// Generated from schema-bulk-schema-authoring.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { WorkspaceFileButton } from "../../workspace/file-picker.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { SchemaAuthoringPathPicker, schemaAuthoringPathEntries } from "../shared/schema-authoring-path-picker.js";
import { nestedStructureTargets } from "./schema-nested-structure.js";
import { createCandidateDialog } from "./candidate-dialog.js";
import { schemaWithAuthoringBatch, schemaAuthoringRowsFromText, pathFromText, pointer, types, keywords, modeFor, kindOf, normalizeRow, beneath } from "./schema-bulk-schema-authoring.model.js";
import { bulkState, updateBulkState, cleanBulkData, BulkText, BulkSelect, BulkButton } from "./bulk-dialog-controls.js";
import { schemaWithAuthoringBatch as schemaWithAuthoringBatch2, schemaAuthoringRowsFromText as schemaAuthoringRowsFromText2 } from "./schema-bulk-schema-authoring.model.js";
const targetsFor = (source) => {
  const targets = nestedStructureTargets(source);
  if (!targets.some((target) => !target.path.length)) targets.unshift({ path: [], title: "Schema root", kind: kindOf(source) });
  return targets;
};
function bulkSchemaAuthoringDialogDraft(source, initialPath = []) {
  const initial = Array.isArray(initialPath) ? initialPath.map(String) : typeof initialPath === "string" ? pathFromText(initialPath) : Array.isArray(initialPath?.path) ? initialPath.path.map(String) : [];
  const selected = targetsFor(source).filter((entry) => beneath(initial, entry.path.map(String))).sort((left, right) => right.path.length - left.path.length)[0], target = pointer(selected?.path || []);
  return {
    target,
    mode: "structure",
    rows: [],
    structure: { operation: "add", path: target, relation: "properties", key: "", type: "object", title: "", required: "false" },
    constraint: { path: target, keyword: "minimum", operation: "set", valueDraft: structuredValueDraft(0) },
    batch: { text: "", format: "json", mode: "append", batchPending: false },
    message: "",
    picker: null
  };
}
function stageSchemaAuthoringRows(source, state, rows) {
  schemaWithAuthoringBatch(source, rows, { targetPath: state.target });
  return { ...state, rows: rows.map((row, index) => normalizeRow(row, index + 1)), message: `Staged ${rows.length} rows. Preview the combined change before Apply.` };
}
function bulkSchemaAuthoringDialogCandidate(source, state) {
  if (state.batch.batchPending) throw new Error("Load or Clear edited batch text before Preview.");
  if (!state.rows.length) throw new Error("Stage at least one structure or constraint row.");
  return schemaWithAuthoringBatch(source, state.rows, { targetPath: state.target });
}
const defaultConstraintValue = (keyword) => ["uniqueItems", "readOnly", "writeOnly", "deprecated"].includes(keyword) ? false : ["required", "enum"].includes(keyword) ? [] : ["title", "description", "$ref", "pattern", "format"].includes(keyword) ? "" : keyword === "additionalProperties" ? true : 0;
function BulkSchemaAuthoringEditor({ source, draft, onDraftChange, onOpenStructure, onOpenConstraints }) {
  const latest = React.useRef(null);
  if (!source) {
    latest.current = null;
    return null;
  }
  const state = bulkState(draft);
  latest.current = { source, state, onDraftChange };
  const change = (next) => updateBulkState(onDraftChange, next), setStructure = (patch) => change({ ...state, structure: { ...state.structure, ...patch }, message: "" }), setConstraint = (patch) => change({ ...state, constraint: { ...state.constraint, ...patch }, message: "" });
  const attempt = (action) => {
    try {
      change(action());
    } catch (error) {
      change({ ...state, message: error.message });
    }
  };
  const stageStructure = () => attempt(() => {
    const form = state.structure, path = pathFromText(form.path);
    if (form.operation === "add" && form.relation === "properties" && !form.key) throw new Error("Enter a property key.");
    const row = form.operation === "add" ? { op: "add", path: pointer([...path, form.relation, ...form.relation === "properties" ? [form.key] : []]), value: { type: form.type, ...form.title ? { title: form.title } : {} }, ...form.relation === "properties" ? { required: form.required === "true" } : {} } : form.operation === "type" ? { op: "set", path: pointer([...path, "type"]), value: form.type } : { op: "required", path: pointer(path), value: form.required === "true" };
    return stageSchemaAuthoringRows(source, state, [...state.rows, row]);
  });
  const stageConstraint = () => attempt(() => {
    const form = state.constraint, row = { op: form.operation, path: pointer([...pathFromText(form.path), form.keyword]), ...form.operation === "set" ? { value: readStructuredValueDraft(form.valueDraft) } : {} };
    return stageSchemaAuthoringRows(source, state, [...state.rows, row]);
  });
  const load = (next) => {
    const rows = schemaAuthoringRowsFromText(next.batch.text, { format: next.batch.format });
    const result = stageSchemaAuthoringRows(source, next, next.batch.mode === "replace" ? rows : [...next.rows, ...rows]);
    return { ...result, batch: { ...result.batch, batchPending: false } };
  };
  const loadBatch = () => attempt(() => load(state));
  const readFile = async (file) => {
    if (!file) return;
    const openedSource = source, openedTarget = state.target;
    try {
      const text = (await file.text()).replace(/^\uFEFF/, ""), current = latest.current;
      if (!current || current.source !== openedSource || current.state.target !== openedTarget) throw new Error("Import target changed while reading. Select the file again.");
      const next = { ...current.state, batch: { ...current.state.batch, text, format: /\.tsv$/i.test(file.name) ? "tsv" : "json", batchPending: true } };
      try {
        updateBulkState(current.onDraftChange, load(next));
      } catch (error) {
        updateBulkState(current.onDraftChange, { ...next, message: `Batch rejected; staged rows were preserved. ${error.message}` });
      }
    } catch (error) {
      const current = latest.current;
      if (current?.source === openedSource) updateBulkState(current.onDraftChange, { ...current.state, message: error.message });
    }
  };
  const targetChange = (target) => {
    if ((state.rows.length || state.batch.batchPending) && !globalThis.confirm("Discard staged rows and batch text before changing declarations?")) return;
    change({ ...bulkSchemaAuthoringDialogDraft(source, pathFromText(target)), target });
  };
  const detailed = (callback) => {
    if ((state.rows.length || state.batch.batchPending) && !globalThis.confirm("Discard this staged batch and open the separate detailed tool?")) return;
    callback?.(pathFromText(state.target));
  };
  const structure = state.structure, constraint = state.constraint, structural = state.rows.filter((row) => modeFor(row) === "structure").length;
  let pickerView = null;
  if (state.picker) {
    let document = source;
    try {
      document = schemaWithAuthoringBatch(source, state.rows, { targetPath: state.target }).document;
    } catch {
    }
    const query = state.picker.query.toLowerCase(), visible = schemaAuthoringPathEntries(document).filter((entry) => !query || [entry.title, entry.schemaPointer, entry.dataPointer || "", entry.referencePath || ""].join(" ").toLowerCase().includes(query));
    const selected = visible.find((entry) => `${entry.schemaPointer}
${entry.dataPointer ?? "(unbound)"}` === state.picker.selectedKey) || visible[0] || null;
    pickerView = { title: "Schema authoring paths", query: state.picker.query, representation: "schemaPointer", visible, selected, status: state.picker.status || `${visible.length} available paths.` };
  }
  const pickerCommand = async (command) => {
    if (command.type === "path.close") change({ ...state, picker: null });
    else if (command.type === "path.query") change({ ...state, picker: { ...state.picker, query: command.value, selectedKey: "", status: "" } });
    else if (command.type === "path.select") change({ ...state, picker: { ...state.picker, selectedKey: command.key, status: "" } });
    else if (command.type === "path.use" && pickerView.selected) change({ ...state, [state.picker.field]: { ...state[state.picker.field], path: pickerView.selected.schemaPointer }, picker: null });
    else if (command.type === "path.copy" && pickerView.selected?.[command.key] !== null) {
      try {
        await navigator.clipboard.writeText(pickerView.selected[command.key]);
        const current = latest.current;
        if (current?.source === source && current.state.picker) updateBulkState(current.onDraftChange, { ...current.state, picker: { ...current.state.picker, status: `Copied ${command.label.toLowerCase()}.` } });
      } catch {
        change({ ...state, picker: { ...state.picker, status: "Select and copy the path from its field." } });
      }
    }
  };
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Stage structure and constraints together, Preview the complete candidate, then Apply atomically. Forms join the batch only when you choose Stage row. Save remains separate."), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-toolbar" }, /* @__PURE__ */ React.createElement(BulkSelect, { label: "Schema batch target", value: state.target, choices: targetsFor(source).map((entry) => [pointer(entry.path), `${pointer(entry.path)} \xB7 ${entry.kind} \xB7 ${entry.title}`]), onChange: targetChange }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Schema authoring mode", value: state.mode, choices: [["structure", "Structure"], ["constraints", "Constraints"]], onChange: (mode) => change({ ...state, mode }) })), /* @__PURE__ */ React.createElement("p", { role: "status" }, "Target ", state.target, " \xB7 ", state.rows.length, " staged rows (", structural, " structure, ", state.rows.length - structural, " constraints) \xB7 ", state.batch.batchPending ? "Unloaded batch text; Load or Clear before Preview" : state.rows.length ? "Pending Preview" : "No staged changes", ". Preview applies both modes together."), state.mode === "structure" ? /* @__PURE__ */ React.createElement("section", { className: "schema-batch-mode" }, /* @__PURE__ */ React.createElement("h3", null, "Structure"), /* @__PURE__ */ React.createElement("div", { className: "schema-batch-form" }, /* @__PURE__ */ React.createElement(BulkSelect, { label: "Structure operation", value: structure.operation, choices: [["add", "Add schema"], ["type", "Set type"], ["required", "Set required status"]], onChange: (operation) => setStructure({ operation }) }), /* @__PURE__ */ React.createElement(BulkText, { label: "Structure parent or declaration JSON Pointer", value: structure.path, onChange: (path) => setStructure({ path }) }), /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => change({ ...state, picker: { field: "structure", query: "", selectedKey: "", status: "" } }) }, "Pick structure path\u2026"), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Schema parent relation", value: structure.relation, choices: [["properties", "Object property"], ["items", "Array items"], ["additionalProperties", "Map values"]], disabled: structure.operation !== "add", onChange: (relation) => setStructure({ relation }) }), /* @__PURE__ */ React.createElement(BulkText, { label: "New schema field key", value: structure.key, disabled: structure.operation !== "add" || structure.relation !== "properties", onChange: (key) => setStructure({ key }) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "New schema type", value: structure.type, choices: types, disabled: structure.operation === "required", onChange: (type) => setStructure({ type }) }), /* @__PURE__ */ React.createElement(BulkText, { label: "New schema title", value: structure.title, disabled: structure.operation !== "add", onChange: (title) => setStructure({ title }) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Schema field required status", value: structure.required, choices: [["false", "Optional"], ["true", "Required"]], disabled: structure.operation === "type" || structure.operation === "add" && structure.relation !== "properties", onChange: (required) => setStructure({ required }) })), /* @__PURE__ */ React.createElement(BulkButton, { onClick: stageStructure }, "Stage structure row")) : /* @__PURE__ */ React.createElement("section", { className: "schema-batch-mode" }, /* @__PURE__ */ React.createElement("h3", null, "Constraints"), /* @__PURE__ */ React.createElement(BulkText, { label: "Constraint declaration JSON Pointer", value: constraint.path, onChange: (path) => setConstraint({ path }) }), /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => change({ ...state, picker: { field: "constraint", query: "", selectedKey: "", status: "" } }) }, "Pick constraint path\u2026"), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Schema constraint keyword", value: constraint.keyword, choices: [...keywords].filter((key) => key !== "type"), onChange: (keyword) => setConstraint({ keyword, valueDraft: structuredValueDraft(defaultConstraintValue(keyword)) }) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Constraint operation", value: constraint.operation, choices: [["set", "Set"], ["remove", "Remove keyword"]], onChange: (operation) => setConstraint({ operation }) }), constraint.operation === "set" ? /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: constraint.valueDraft, label: "Constraint value", onDraftChange: (valueDraft) => setConstraint({ valueDraft }) }) : null, /* @__PURE__ */ React.createElement(BulkButton, { onClick: stageConstraint }, "Stage constraint row")), pickerView ? /* @__PURE__ */ React.createElement("section", { className: "schema-authoring-path-dialog", "aria-label": "Schema authoring paths" }, /* @__PURE__ */ React.createElement(SchemaAuthoringPathPicker, { view: pickerView, onCommand: pickerCommand })) : null, /* @__PURE__ */ React.createElement("div", { className: "schema-batch-queue" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Row", "Schema path", "Operation", "Native value", "Actions"].map((label) => /* @__PURE__ */ React.createElement("th", { key: label }, label)))), /* @__PURE__ */ React.createElement("tbody", null, state.rows.map((row, index) => modeFor(row) === state.mode ? /* @__PURE__ */ React.createElement("tr", { key: index }, /* @__PURE__ */ React.createElement("td", null, index + 1), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, row.path)), /* @__PURE__ */ React.createElement("td", null, row.op), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, row.op === "remove" ? "(remove)" : JSON.stringify(row.value))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => change({ ...state, rows: state.rows.filter((_, at) => at !== index), message: "" }) }, "Remove staged row"))) : null)))), /* @__PURE__ */ React.createElement("details", { className: "schema-validation-batch-worksheet" }, /* @__PURE__ */ React.createElement("summary", null, "Import combined structure and constraint rows"), /* @__PURE__ */ React.createElement("p", null, "JSON records use op, absolute schema Pointer path, native value, and optional required. TSV columns: Operation, Path, Value JSON, Required. Parents precede children."), /* @__PURE__ */ React.createElement(BulkText, { multiline: true, label: "Schema authoring batch text", value: state.batch.text, onChange: (text) => change({ ...state, batch: { ...state.batch, text, batchPending: Boolean(text.trim()) }, message: "" }) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Schema batch text format", value: state.batch.format, choices: [["json", "JSON"], ["tsv", "TSV"]], onChange: (format) => change({ ...state, batch: { ...state.batch, format, batchPending: Boolean(state.batch.text.trim()) } }) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Schema batch load operation", value: state.batch.mode, choices: [["append", "Append rows"], ["replace", "Replace staged batch"]], onChange: (mode) => change({ ...state, batch: { ...state.batch, mode, batchPending: Boolean(state.batch.text.trim()) } }) }), /* @__PURE__ */ React.createElement(WorkspaceFileButton, { label: "Import schema authoring batch file", onFile: readFile }), /* @__PURE__ */ React.createElement(BulkButton, { onClick: loadBatch }, "Load batch rows"), /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => {
    if (state.batch.batchPending && !globalThis.confirm("Replace unloaded batch text with staged rows?")) return;
    change({ ...state, batch: { ...state.batch, format: "json", text: JSON.stringify(state.rows, null, 2), batchPending: false } });
  } }, "Show staged rows"), /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => change({ ...state, batch: { ...state.batch, text: "", batchPending: false } }) }, "Clear batch text")), onOpenStructure ? /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => detailed(onOpenStructure) }, "Detailed nested structure\u2026") : null, onOpenConstraints ? /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => detailed(onOpenConstraints) }, "Detailed field constraints\u2026") : null, /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => change({ ...state, rows: [], batch: { ...state.batch, text: "", batchPending: false }, message: "" }) }, "Clear staged batch"), state.message ? /* @__PURE__ */ React.createElement("p", { role: "status" }, state.message) : null);
}
function createBulkSchemaAuthoringDialog({ getDocument, validateCandidate, applyCandidate, onOpenStructure, onOpenConstraints }) {
  let api;
  const advanced = (callback) => (path) => {
    api.close();
    callback(path);
  };
  const Editor = (props) => /* @__PURE__ */ React.createElement(BulkSchemaAuthoringEditor, { ...props, onOpenStructure: onOpenStructure ? advanced(onOpenStructure) : null, onOpenConstraints: onOpenConstraints ? advanced(onOpenConstraints) : null });
  api = createCandidateDialog({
    title: "Bulk schema authoring",
    toolId: "bulkSchemaAuthoring",
    className: "schema-bulk-schema-dialog",
    getDocument,
    validateCandidate,
    applyCandidate: (candidate, message, options) => {
      validateCandidate(candidate, options);
      applyCandidate(candidate, message, options);
    },
    initialDraft: bulkSchemaAuthoringDialogDraft,
    buildCandidate: bulkSchemaAuthoringDialogCandidate,
    Editor,
    message: "Applied schema authoring rows. Candidate validation passed. Save the schema to keep the changes."
  });
  return api;
}
export {
  BulkSchemaAuthoringEditor,
  bulkSchemaAuthoringDialogCandidate,
  bulkSchemaAuthoringDialogDraft,
  createBulkSchemaAuthoringDialog,
  schemaAuthoringRowsFromText2 as schemaAuthoringRowsFromText,
  schemaWithAuthoringBatch2 as schemaWithAuthoringBatch,
  stageSchemaAuthoringRows
};

//# sourceMappingURL=schema-bulk-schema-authoring.js.map
