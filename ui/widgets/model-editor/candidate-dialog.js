// Generated from candidate-dialog.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { assertDeclarativeDocument } from "../validation-program/widget.js";
const clone = (value) => structuredClone(value);
const draftProperty = (draft, key) => draft.entries?.find((entry) => entry.key === key)?.value;
function withDraftProperty(draft, key, value) {
  const entries = draft.entries || [];
  return { ...draft, entries: entries.some((entry) => entry.key === key) ? entries.map((entry) => entry.key === key ? { ...entry, value } : entry) : [...entries, { key, value }] };
}
function CandidateField({ draft, name, label = name, choices, onDraftChange }) {
  const node = draftProperty(draft, name) || structuredValueDraft("");
  const change = (value) => onDraftChange(withDraftProperty(draft, name, structuredValueDraft(value)));
  if (choices) return /* @__PURE__ */ React.createElement("label", null, label, /* @__PURE__ */ React.createElement("select", { "aria-label": label, value: node.value ?? "", onChange: (event) => change(event.target.value) }, choices.map((choice) => /* @__PURE__ */ React.createElement("option", { key: choice.value ?? choice, value: choice.value ?? choice }, choice.label ?? choice))));
  if (node.type === "boolean") return /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { "aria-label": label, type: "checkbox", checked: node.value === true, onChange: (event) => change(event.target.checked) }), label);
  if (node.type === "string" || node.type === "number") return /* @__PURE__ */ React.createElement("label", null, label, /* @__PURE__ */ React.createElement("input", { "aria-label": label, value: node.value, onChange: (event) => onDraftChange(withDraftProperty(draft, name, { ...node, value: event.target.value })) }));
  return /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: node, label, onDraftChange: (value) => onDraftChange(withDraftProperty(draft, name, value)) });
}
function CandidateRows({ draft, label = "Rows", columns = [], template = {}, onDraftChange }) {
  const move = (from, to) => {
    const items = [...draft.items];
    if (to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
    onDraftChange({ ...draft, items });
  };
  const load = () => {
    try {
      const text = draft.batchText || "";
      let rows;
      if (text.trim().startsWith("[")) {
        rows = JSON.parse(text);
        if (!Array.isArray(rows)) throw new Error("Import a record array.");
      } else {
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
        rows = lines.map((line, index) => {
          const cells = line.split("	");
          if (!index && columns.every((column, at) => cells[at]?.trim().toLowerCase() === column.name.toLowerCase())) return null;
          if (cells.length !== columns.length) throw new Error(`Line ${index + 1}: use ${columns.map((column) => column.name).join(", ")} columns.`);
          const row = { ...template };
          columns.forEach((column, at) => {
            const value = cells[at];
            row[column.name] = typeof template[column.name] === "boolean" ? value.trim() === "true" : Array.isArray(template[column.name]) || template[column.name] && typeof template[column.name] === "object" ? JSON.parse(value) : value;
          });
          return row;
        }).filter(Boolean);
      }
      if (!rows.length) throw new Error("Enter at least one row.");
      onDraftChange({ ...draft, items: draft.batchMode === "replace" ? rows.map(structuredValueDraft) : [...draft.items || [], ...rows.map(structuredValueDraft)], batchText: "", batchPending: false, batchError: "" });
    } catch (error) {
      onDraftChange({ ...draft, batchError: error.message });
    }
  };
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h3", null, label), /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, columns.map((column) => /* @__PURE__ */ React.createElement("th", { key: column.name }, column.label || column.name)), /* @__PURE__ */ React.createElement("th", null, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, (draft.items || []).map((row, index) => /* @__PURE__ */ React.createElement("tr", { key: index }, columns.map((column) => /* @__PURE__ */ React.createElement("td", { key: column.name }, /* @__PURE__ */ React.createElement(CandidateField, { ...column, draft: row, onDraftChange: (value) => onDraftChange({ ...draft, items: draft.items.map((item, at) => at === index ? value : item) }) }))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !index, onClick: () => move(index, index - 1) }, "Up"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: index === draft.items.length - 1, onClick: () => move(index, index + 1) }, "Down"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onDraftChange({ ...draft, items: draft.items.filter((_, at) => at !== index) }) }, "Remove row")))))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onDraftChange({ ...draft, items: [...draft.items || [], structuredValueDraft(template)] }) }, "Add row"), /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Import JSON or TSV rows"), /* @__PURE__ */ React.createElement("p", null, "TSV columns: ", columns.map((column) => column.name).join(", "), ". Nested values use JSON."), /* @__PURE__ */ React.createElement("textarea", { "aria-label": `${label} batch rows`, rows: 4, value: draft.batchText || "", onChange: (event) => onDraftChange({ ...draft, batchText: event.target.value, batchPending: Boolean(event.target.value) }) }), /* @__PURE__ */ React.createElement("select", { "aria-label": `${label} import operation`, value: draft.batchMode || "append", onChange: (event) => onDraftChange({ ...draft, batchMode: event.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "append" }, "Append rows"), /* @__PURE__ */ React.createElement("option", { value: "replace" }, "Replace rows")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: load }, "Load rows"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onDraftChange({ ...draft, batchText: "", batchPending: false, batchError: "" }) }, "Clear batch text"), draft.batchError ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, draft.batchError) : null));
}
function assertNoPendingBatch(value) {
  if (!value || typeof value !== "object") return;
  if (value.batchPending) throw new Error("Load or Clear pending batch text before Preview.");
  for (const child of Object.values(value)) if (child && typeof child === "object") {
    if (Array.isArray(child)) child.forEach(assertNoPendingBatch);
    else assertNoPendingBatch(child);
  }
}
function SchemaCandidateDialog({ model, commands, Editor }) {
  return /* @__PURE__ */ React.createElement("dialog", { className: `schema-bulk-dialog ${model.className || ""}`, ref: commands.ref, onCancel: (event) => {
    event.preventDefault();
    commands.close();
  }, onClose: commands.close }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-content" }, /* @__PURE__ */ React.createElement("header", { className: "schema-validation-dialog-head" }, /* @__PURE__ */ React.createElement("h2", null, model.title), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Close dialog", onClick: commands.close }, "\xD7")), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-body" }, model.source === null ? null : Editor ? /* @__PURE__ */ React.createElement(Editor, { draft: model.draft, onDraftChange: commands.change, source: model.source, context: model.context, error: model.error }) : /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: model.draft, label: model.title, onDraftChange: commands.change, error: model.error }), /* @__PURE__ */ React.createElement("p", { role: "status", className: "schema-ui-annotation-feedback" }, model.status), model.error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, model.error) : null, model.previewText ? /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-preview", open: true }, /* @__PURE__ */ React.createElement("summary", null, "Generated candidate"), /* @__PURE__ */ React.createElement("pre", null, model.previewText)) : null), /* @__PURE__ */ React.createElement("footer", { className: "schema-validation-dialog-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.preview }, "Preview"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !model.ready, onClick: commands.apply }, "Apply"))));
}
function createCandidateDialog({ title, toolId, className = "", getDocument, validateCandidate, applyCandidate, initialDraft, buildCandidate, Editor, message = `Applied ${title}. Save the schema to keep changes.` }) {
  const host = document.createElement("div");
  document.body.append(host);
  let dialog, mount, preview = null, owner = null;
  let model = { title, toolId, className, source: null, context: {}, draft: structuredValueDraft({}), open: false, ready: false, status: "", error: "", previewText: "" };
  const render = () => {
    mount.update({ model, commands, Editor });
    if (model.open && !dialog.open) dialog.showModal();
    else if (!model.open && dialog.open) dialog.close();
  };
  const fail = (error) => {
    preview = null;
    model = { ...model, ready: false, error: error.message };
    render();
    throw error;
  };
  const previewNow = () => {
    try {
      if (!model.open) throw new Error("Open the authoring dialog first.");
      assertNoPendingBatch(model.draft);
      const changes = readStructuredValueDraft(model.draft), result = buildCandidate(model.source, changes, model.context), candidate = result?.candidate || result?.document || result;
      if (JSON.stringify(candidate) === JSON.stringify(model.source)) throw new Error("Change at least one setting before Preview.");
      const options = result?.allowGeneratedSubtrees ? { allowGeneratedSubtrees: result.allowGeneratedSubtrees } : {};
      assertDeclarativeDocument(candidate);
      validateCandidate(candidate, options);
      preview = { candidate, options, base: JSON.stringify(model.source) };
      model = { ...model, ready: true, error: "", previewText: JSON.stringify(result?.changes || candidate, null, 2), status: "Preview ready. Apply updates the open draft; Save persists it." };
      render();
      return { ready: true, toolId };
    } catch (error) {
      return fail(error);
    }
  };
  const applyNow = () => {
    try {
      if (!preview || !model.ready) throw new Error("Preview a valid candidate before Apply.");
      if (getDocument() !== owner || JSON.stringify(getDocument()) !== preview.base) throw new Error("The schema changed since Preview. Reopen the dialog.");
      applyCandidate(preview.candidate, message, preview.options);
      commands.close();
      return { applied: true, toolId };
    } catch (error) {
      return fail(error);
    }
  };
  const ui = (action) => () => {
    try {
      action();
    } catch {
    }
  };
  const commands = { ref(node) {
    dialog = node;
  }, close() {
    if (!model.open) return;
    model = { ...model, open: false };
    render();
  }, change(draft) {
    preview = null;
    model = { ...model, draft, ready: false, status: "", error: "", previewText: "" };
    render();
  }, preview: ui(previewNow), apply: ui(applyNow) };
  mount = mountReactComponent(host, SchemaCandidateDialog, { model, commands, Editor });
  const api = { open(context = {}) {
    owner = getDocument();
    const source = clone(owner);
    model = { ...model, source, context: clone(context), draft: structuredValueDraft(initialDraft(source, context)), open: true, ready: false, status: "", error: "", previewText: "" };
    preview = null;
    render();
  }, updateDraft: commands.change, snapshot() {
    return { format: "fullmeta-schema-candidate-dialog/1", toolId, source: clone(model.source), context: clone(model.context), draft: clone(model.draft), open: model.open, hadPreview: Boolean(preview), status: model.status, error: model.error };
  }, restore(value) {
    if (value?.format !== "fullmeta-schema-candidate-dialog/1" || value.toolId !== toolId || JSON.stringify(value.source) !== JSON.stringify(getDocument())) throw new Error("Authoring state belongs to a different source document or tool.");
    owner = getDocument();
    model = { ...model, source: clone(value.source), context: clone(value.context), draft: clone(value.draft), open: value.open !== false, ready: false, status: value.status || "", error: value.error || "", previewText: "" };
    preview = null;
    render();
    if (value.hadPreview) previewNow();
    return { restored: true, previewReady: Boolean(preview) };
  }, preview: previewNow, apply: applyNow, close: commands.close, get dialog() {
    return dialog;
  }, dispose() {
    mount.dispose();
    host.remove();
  } };
  return api;
}
export {
  CandidateField,
  CandidateRows,
  SchemaCandidateDialog,
  createCandidateDialog,
  draftProperty,
  withDraftProperty
};

//# sourceMappingURL=candidate-dialog.js.map
