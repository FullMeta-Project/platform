// Generated from recipe-editor.jsx by scripts/build-frontend.mjs.
import React, { useLayoutEffect, useRef } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft, validateStructuredValueDraftShape } from "../shared/structured-value-editor.js";
import { fullMetaValidationProgramKeys, isFullMetaValidationProgramKey } from "./program-contract.js";
import { assertValidationProgramSemantics } from "./semantic-validation.js";
import { validationRuleRecipeTemplates, validationRuleFromRecipe, validationRuleRecipeFromRule } from "./recipe-model.js";
import { validationRuleRecipeTemplates as validationRuleRecipeTemplates2, validationRuleFromRecipe as validationRuleFromRecipe2, validationRuleRecipeFromRule as validationRuleRecipeFromRule2 } from "./recipe-model.js";
function ValidationDialog({ open, title, children, actions, onClose, dialogRef, className = "" }) {
  const reference = useRef(null);
  useLayoutEffect(() => {
    const node = reference.current;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);
  return /* @__PURE__ */ React.createElement("dialog", { ref: (node) => {
    reference.current = node;
    dialogRef?.(node);
  }, className: `schema-bulk-dialog ${className}`, onCancel: (event) => {
    event.preventDefault();
    onClose?.();
  }, onClose: () => {
    if (open) onClose?.();
  } }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-content" }, /* @__PURE__ */ React.createElement("header", { className: "schema-validation-dialog-head" }, /* @__PURE__ */ React.createElement("h2", null, title), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Close dialog", onClick: onClose }, "\xD7")), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-body" }, children), /* @__PURE__ */ React.createElement("footer", { className: "schema-validation-dialog-actions" }, actions)));
}
function ValidationRecipeRow({ model, commands }) {
  return /* @__PURE__ */ React.createElement("details", { className: "schema-rule-recipe-advanced", open: model.open, onToggle: (event) => commands.setOpen?.(event.currentTarget.open) }, /* @__PURE__ */ React.createElement("summary", null, "Prefill an editable rule from a recipe"), /* @__PURE__ */ React.createElement("section", { className: "schema-validation-batch-panel" }, /* @__PURE__ */ React.createElement("label", null, "Recipe", /* @__PURE__ */ React.createElement("select", { "aria-label": "Bulk rule recipe", value: model.template, onChange: (event) => commands.template(event.target.value) }, validationRuleRecipeTemplates.map((item) => /* @__PURE__ */ React.createElement("option", { key: item.id, value: item.id }, item.label)))), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: model.draft, label: "Recipe fields", onDraftChange: commands.change }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.stage }, "Stage recipe row"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.reset }, "Reset recipe")));
}
function createValidationRuleRecipeRow({ onStage, onChange = () => {
}, onError = () => {
} }) {
  const element = document.createElement("div");
  let model = { template: validationRuleRecipeTemplates[0].id, draft: structuredValueDraft(validationRuleRecipeTemplates[0].facts), dirty: false, open: false }, mounted;
  const render = () => mounted.update({ model, commands });
  const reset = () => {
    model = { ...model, draft: structuredValueDraft(validationRuleRecipeTemplates.find((item) => item.id === model.template).facts), dirty: false };
    render();
    onChange();
  };
  const commands = { template(id) {
    model = { ...model, template: id, draft: structuredValueDraft(validationRuleRecipeTemplates.find((item) => item.id === id).facts), dirty: true };
    render();
    onChange();
  }, change(draft) {
    model = { ...model, draft, dirty: true };
    render();
    onChange();
  }, setOpen(open) {
    model.open = open;
  }, reset, stage() {
    try {
      onStage(validationRuleFromRecipe(readStructuredValueDraft(model.draft)));
      model.dirty = false;
      render();
    } catch (error) {
      onError(error.message);
    }
  } };
  mounted = mountReactComponent(element, ValidationRecipeRow, { model, commands });
  return { element, isDirty: () => model.dirty, reset, snapshot: () => structuredClone(model), restore(value) {
    model = structuredClone(value);
    render();
  }, dispose: () => mounted.dispose() };
}
function ValidationRecipeTable({ model, commands }) {
  return /* @__PURE__ */ React.createElement(ValidationDialog, { open: model.open, title: "Validation rule recipes", onClose: commands.close, dialogRef: commands.ref, actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.preview }, "Preview"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !model.ready, onClick: commands.apply }, "Apply")) }, /* @__PURE__ */ React.createElement("label", null, "Validation program", /* @__PURE__ */ React.createElement("select", { value: model.key, onChange: (event) => commands.select(event.target.value) }, model.keys.map((key) => /* @__PURE__ */ React.createElement("option", { key, value: key }, key)))), model.rows.map((row, index) => /* @__PURE__ */ React.createElement("details", { key: index, open: true }, /* @__PURE__ */ React.createElement("summary", null, "Recipe ", index + 1), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: row.draft, label: `Recipe ${index + 1}`, onDraftChange: (draft) => commands.change(index, draft) }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => commands.remove(index) }, "Remove"))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.add }, "Add recipe"), /* @__PURE__ */ React.createElement("p", { role: "status" }, model.status), model.candidate ? /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(model.candidate[model.key], null, 2)) : null);
}
function createValidationRuleRecipeTable({ getDocument, validateCandidate, applyCandidate, buildCandidate }) {
  const host = document.createElement("div");
  document.body.append(host);
  let source, stamp, dialog, mounted, model = { open: false, key: "x-fullmeta-rules", keys: [], rows: [], ready: false, status: "", candidate: null };
  const render = () => mounted.update({ model, commands });
  const invalidate = () => {
    model = { ...model, ready: false, candidate: null };
    render();
  };
  const select = (key) => {
    model = { ...model, key, rows: (source[key]?.rules || []).flatMap((rule, index) => {
      const facts = validationRuleRecipeFromRule(rule);
      return facts ? [{ index, draft: structuredValueDraft(facts), original: JSON.stringify(facts), removed: false }] : [];
    }) };
    invalidate();
  };
  const commands = { ref: (node) => {
    dialog = node;
  }, close() {
    model.open = false;
    render();
  }, select, change(index, draft) {
    model.rows[index].draft = draft;
    invalidate();
  }, remove(index) {
    model.rows[index].removed = true;
    invalidate();
  }, add() {
    model.rows.push({ index: null, draft: structuredValueDraft(validationRuleRecipeTemplates[0].facts), original: null, removed: false });
    invalidate();
  }, preview() {
    try {
      const edits = model.rows.filter((row) => row.removed || JSON.stringify(readStructuredValueDraft(row.draft)) !== row.original).map((row) => ({ index: row.index, remove: row.removed, facts: readStructuredValueDraft(row.draft) }));
      const candidate = buildCandidate(source, model.key, edits);
      assertValidationProgramSemantics(candidate[model.key], { programKey: model.key });
      validateCandidate(candidate);
      model = { ...model, candidate, ready: true, status: `${edits.length} recipe changes ready.` };
    } catch (error) {
      model = { ...model, ready: false, candidate: null, status: error.message };
    }
    render();
  }, apply() {
    if (!model.ready || stamp !== JSON.stringify(getDocument())) throw new Error("Preview the current source before Apply.");
    applyCandidate(model.candidate, "Applied validation rule recipes. Save the schema to keep changes.");
    commands.close();
  } };
  mounted = mountReactComponent(host, ValidationRecipeTable, { model, commands });
  const previewNow = () => {
    commands.preview();
    if (!model.ready) throw new Error(model.status || "Recipe Preview failed.");
    return { ready: true, programKey: model.key };
  };
  return {
    open() {
      source = structuredClone(getDocument());
      stamp = JSON.stringify(source);
      model.keys = [.../* @__PURE__ */ new Set(["x-fullmeta-rules", ...fullMetaValidationProgramKeys(source)])];
      model.open = true;
      select("x-fullmeta-rules");
    },
    snapshot() {
      return source ? { format: "fullmeta-validation-recipe-table-state/1", source: structuredClone(source), model: structuredClone(model) } : null;
    },
    restore(value) {
      if (value?.format !== "fullmeta-validation-recipe-table-state/1" || JSON.stringify(value.source) !== JSON.stringify(getDocument())) throw new Error("Recipe state belongs to a different source document.");
      const next = value.model;
      if (!next || typeof next.open !== "boolean" || typeof next.ready !== "boolean" || typeof next.status !== "string" || !isFullMetaValidationProgramKey(next.key) || !Array.isArray(next.keys) || !next.keys.every(isFullMetaValidationProgramKey) || !next.keys.includes(next.key) || new Set(next.keys).size !== next.keys.length || !Array.isArray(next.rows)) throw new Error("Unsupported recipe table state.");
      const indexes = /* @__PURE__ */ new Set();
      for (const row of next.rows) {
        if (!row || row.index !== null && (!Number.isSafeInteger(row.index) || row.index < 0 || indexes.has(row.index)) || row.original !== null && typeof row.original !== "string" || typeof row.removed !== "boolean") throw new Error("Unsupported recipe row state.");
        if (row.index !== null) indexes.add(row.index);
        validateStructuredValueDraftShape(row.draft);
      }
      const hadPreview = next.ready;
      source = structuredClone(value.source);
      stamp = JSON.stringify(source);
      model = { ...structuredClone(next), ready: false, candidate: null };
      render();
      if (hadPreview) previewNow();
      return { restored: true, previewReady: model.ready, programKey: model.key };
    },
    preview: previewNow,
    apply: commands.apply,
    close: commands.close,
    get dialog() {
      return dialog;
    },
    dispose() {
      mounted.dispose();
      host.remove();
    }
  };
}
export {
  ValidationDialog,
  ValidationRecipeRow,
  ValidationRecipeTable,
  createValidationRuleRecipeRow,
  createValidationRuleRecipeTable,
  validationRuleFromRecipe2 as validationRuleFromRecipe,
  validationRuleRecipeFromRule2 as validationRuleRecipeFromRule,
  validationRuleRecipeTemplates2 as validationRuleRecipeTemplates
};

//# sourceMappingURL=recipe-editor.js.map
