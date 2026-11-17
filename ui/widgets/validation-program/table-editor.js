// Generated from table-editor.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { createSchemaAuthoringPathPicker } from "../shared/schema-authoring-path-picker.js";
import { DeclarativeView, createDeclarativeRuleAuthoring } from "./declarative-editor.js";
import { ValidationDialog } from "./recipe-editor.js";
import { fullMetaValidationProgramKeys, isFullMetaValidationProgramKey } from "./program-contract.js";
import { assertDeclarativeDocument } from "./declarative-rules.js";
import { assertValidationProgramSemantics } from "./semantic-validation.js";
import { validationProgramDraft, snapshotValidationDraft, restoreValidationDraft } from "./draft-model.js";
import { validationProgramDraft as validationProgramDraft2, validationProgramWithImportedRules, validationStatementFromDraft } from "./draft-model.js";
const clone = (value) => structuredClone(value), same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function ValidationProgramTable({ model, primary, commands }) {
  return /* @__PURE__ */ React.createElement(ValidationDialog, { open: model.open, title: "Validation requirements", onClose: commands.close, dialogRef: commands.ref, actions: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.preview }, "Preview"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button primary", disabled: !model.ready, onClick: commands.apply }, "Apply")) }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-toolbar" }, /* @__PURE__ */ React.createElement("label", null, "Validation program", /* @__PURE__ */ React.createElement("select", { "aria-label": "Validation program", value: model.key, onChange: (event) => commands.select(event.target.value) }, model.keys.map((key) => /* @__PURE__ */ React.createElement("option", { key, value: key }, key)))), /* @__PURE__ */ React.createElement("label", null, "Maximum errors", /* @__PURE__ */ React.createElement("input", { "aria-label": "Maximum errors", type: "number", min: "1", value: model.maximumErrors, onChange: (event) => commands.maximumErrors(event.target.value) }))), /* @__PURE__ */ React.createElement("label", null, "Add another validation program", /* @__PURE__ */ React.createElement("input", { "aria-label": "New validation program key", value: model.newKey, onChange: (event) => commands.newKey(event.target.value) })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.addProgram }, "Add program"), /* @__PURE__ */ React.createElement(DeclarativeView, { ...primary }), /* @__PURE__ */ React.createElement("p", { className: "schema-validation-dialog-status", role: "status" }, model.status), model.previewText ? /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-preview", open: true }, /* @__PURE__ */ React.createElement("summary", null, "Generated candidate"), /* @__PURE__ */ React.createElement("pre", null, model.previewText)) : null);
}
function createValidationProgramTableDialog({ getDocument, validateCandidate, applyCandidate, buildCandidate }) {
  const host = document.createElement("div");
  document.body.append(host);
  let source = {}, drafts = /* @__PURE__ */ new Map(), primaryPresentation, preview = null, mounted, dialog, activeKey = "x-fullmeta-rules";
  let model = { open: false, key: activeKey, keys: [], newKey: "", maximumErrors: 80, nativeOpen: false, nativeDraft: structuredValueDraft([]), batchAreas: ["", "", ""], stagedText: ["", "", ""], importMode: "append", ready: false, status: "", previewText: "", recipe: { draft: structuredValueDraft({}), dirty: false, open: false } };
  const render = () => {
    if (mounted) mounted.update({ model, primary: primaryPresentation, commands });
  };
  const change = () => {
    preview = null;
    model = { ...model, ready: false, status: "" };
    render();
  };
  const picker = createSchemaAuthoringPathPicker({ getDocument, onPick: void 0 });
  const primary = createDeclarativeRuleAuthoring({ getProgramKey: () => activeKey, renderView: (presentation) => {
    primaryPresentation = presentation;
    render();
  }, onChange: change, onError: (error) => {
    model.status = error.message;
    render();
  }, pickPath: (options) => picker.open(options) });
  const current = () => drafts.get(activeKey);
  const candidateProgram = () => current().authoredProgram || buildCandidate(source, /* @__PURE__ */ new Map([[activeKey, current()]]))[activeKey] || { maximumErrors: 80, rules: [] };
  const load = () => {
    const program = candidateProgram();
    primary.load(program, { programKey: activeKey });
    model.maximumErrors = current().maximumErrors;
    model.nativeDraft = structuredValueDraft(Array.isArray(program.rules) ? program.rules : []);
  };
  const sync = () => {
    if (primary.isDirty()) {
      const program = primary.read(), previous = current(), next = validationProgramDraft(program);
      next.maximumErrors = previous.maximumErrors;
      next.maxErrorsChanged = previous.maxErrorsChanged;
      drafts.set(activeKey, next);
    }
  };
  const report = (fn) => {
    try {
      const value = fn();
      render();
      return value;
    } catch (error) {
      model = { ...model, status: error.message, ready: false };
      preview = null;
      render();
      throw error;
    }
  };
  const clear = () => {
    model.batchAreas = ["", "", ""];
    model.stagedText = ["", "", ""];
  };
  const previewNow = () => report(() => {
    if (!model.open) throw new Error("Open Validation requirements first.");
    change();
    sync();
    for (const [key, program] of drafts) if (!Number.isInteger(program.maximumErrors) || program.maximumErrors < 1) throw new Error(`${key}: Maximum errors must be a positive integer.`);
    const candidate = buildCandidate(source, drafts);
    if (same(candidate, source)) throw new Error("Add or change a rule before previewing.");
    const allowGeneratedSubtrees = [...drafts.keys()].filter((key) => !same(source[key], candidate[key])).map((key) => [key]);
    assertDeclarativeDocument(candidate);
    const warnings = [];
    for (const [key] of allowGeneratedSubtrees) warnings.push(...assertValidationProgramSemantics(candidate[key], { programKey: key }).filter((item) => item.severity === "warning"));
    validateCandidate(candidate, { allowGeneratedSubtrees });
    const ruleCount = [...drafts.keys()].reduce((sum, key) => sum + (candidate[key]?.rules?.length || 0), 0);
    preview = { candidate, base: JSON.stringify(source), allowGeneratedSubtrees, ruleCount, warnings };
    model = { ...model, ready: true, previewText: JSON.stringify(Object.fromEntries(allowGeneratedSubtrees.map(([key]) => [key, candidate[key]])), null, 2), status: "Preview ready; candidate validation passed. Apply changes the draft; Save persists it." };
    return { ready: true, ruleCount, programs: allowGeneratedSubtrees.map(([key]) => key), warnings: clone(warnings) };
  });
  const applyNow = () => report(() => {
    if (!model.open || !preview || !model.ready) throw new Error("Preview a valid candidate before Apply.");
    if (JSON.stringify(getDocument()) !== preview.base) throw new Error("The schema changed since preview. Reopen the table.");
    const ruleCount = preview.ruleCount;
    applyCandidate(preview.candidate, `Applied bulk validation rules: ${ruleCount} root rules. Save the schema to keep changes.`, { allowGeneratedSubtrees: preview.allowGeneratedSubtrees });
    model.open = false;
    render();
    return { applied: true, ruleCount };
  });
  const ui = (fn) => () => {
    try {
      fn();
    } catch {
    }
  };
  const commands = {
    ref: (node) => {
      dialog = node;
    },
    close() {
      model.open = false;
      render();
    },
    select: (key) => report(() => {
      sync();
      activeKey = key;
      model.key = key;
      clear();
      load();
      change();
    }),
    maximumErrors(value) {
      current().maximumErrors = Number(value);
      current().maxErrorsChanged = true;
      model.maximumErrors = value;
      change();
    },
    newKey(value) {
      model.newKey = value;
      render();
    },
    addProgram: ui(() => report(() => {
      const key = model.newKey.trim();
      if (!isFullMetaValidationProgramKey(key) || key === "x-fullmeta-rules") throw new Error("Use an x-fullmeta-\u2026Validation key for an additional validation program.");
      sync();
      if (!drafts.has(key)) drafts.set(key, validationProgramDraft());
      model.keys = [...drafts.keys()];
      activeKey = key;
      model.key = key;
      model.newKey = "";
      clear();
      load();
      change();
    })),
    preview: ui(previewNow),
    apply: ui(applyNow)
  };
  mounted = mountReactComponent(host, ValidationProgramTable, { model, primary: primaryPresentation, commands });
  const snapshot = () => ({ format: "fullmeta-validation-table-state/1", source: clone(source), programs: [...drafts].map(([key, program]) => [key, { ...program, roots: program.roots.map(snapshotValidationDraft) }]), activeKey, primary: primary.snapshot(), batchAreas: [...model.batchAreas], stagedText: [...model.stagedText], importMode: model.importMode, nativeOpen: model.nativeOpen, nativeDraft: clone(model.nativeDraft), open: model.open, hadPreview: Boolean(preview), status: model.status, recipe: { ...clone(model.recipe), controls: [] } });
  return {
    open() {
      source = clone(getDocument());
      drafts = /* @__PURE__ */ new Map();
      model.keys = [.../* @__PURE__ */ new Set(["x-fullmeta-rules", ...fullMetaValidationProgramKeys(source), ...Object.keys(source).filter((key) => isFullMetaValidationProgramKey(key) && source[key] && Object.hasOwn(source[key], "declarative"))])];
      for (const key of model.keys) drafts.set(key, validationProgramDraft(source[key]));
      activeKey = "x-fullmeta-rules";
      model.key = activeKey;
      model.open = true;
      model.recipe.dirty = false;
      clear();
      load();
      change();
    },
    snapshot,
    restore(value) {
      if (value?.format !== "fullmeta-validation-table-state/1" || !same(value.source, getDocument())) throw new Error("Validation state belongs to a different document snapshot.");
      if (value.batchAreas?.some((text, index) => text !== value.stagedText?.[index]) || value.recipe?.dirty) throw new Error("This saved session contains unfinished retired bulk input; recover its text with the previous editor before restoring.");
      if (value.nativeDraft && !Object.hasOwn(value.primary?.original || {}, "declarative")) {
        let native;
        try {
          native = readStructuredValueDraft(value.nativeDraft);
        } catch {
          throw new Error("This saved session contains an unfinished native draft; recover it with the previous editor before restoring.");
        }
        if (!same(native, value.primary?.original?.rules || [])) throw new Error("This saved session contains an unfinished native draft; recover it with the previous editor before restoring.");
      }
      source = clone(value.source);
      drafts = new Map(value.programs.map(([key, program]) => [key, { ...program, roots: program.roots.map((root) => restoreValidationDraft(root)) }]));
      activeKey = value.activeKey;
      model = { ...model, keys: [...drafts.keys()], key: activeKey, batchAreas: ["", "", ""], stagedText: ["", "", ""], importMode: "append", nativeOpen: false, nativeDraft: structuredValueDraft(value.primary?.original?.rules || []), recipe: { draft: structuredValueDraft({}), dirty: false, open: false }, open: value.open !== false, ready: false, status: value.status || "", maximumErrors: current().maximumErrors };
      primary.restore(value.primary);
      preview = null;
      render();
      if (value.hadPreview) previewNow();
      return { restored: true, previewReady: Boolean(preview), programKey: activeKey };
    },
    addRule(overrides) {
      if (!model.open) throw new Error("Open Validation requirements first.");
      return primary.addRule(overrides).id;
    },
    applyRuleBatch(batch) {
      if (!model.open) throw new Error("Open Validation requirements first.");
      return primary.applyRuleBatch(batch);
    },
    updateRule(id, patch) {
      primary.updateRule(id, patch);
      return { updated: id };
    },
    removeRule(id) {
      primary.removeRule(id);
      return { removed: id };
    },
    preview: previewNow,
    apply: applyNow,
    close: commands.close,
    get dialog() {
      return dialog;
    },
    dispose() {
      primary.dispose();
      picker.dispose();
      mounted.dispose();
      host.remove();
    }
  };
}
export {
  ValidationProgramTable,
  createValidationProgramTableDialog,
  validationProgramDraft2 as validationProgramDraft,
  validationProgramWithImportedRules,
  validationStatementFromDraft
};

//# sourceMappingURL=table-editor.js.map
