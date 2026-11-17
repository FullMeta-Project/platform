// Generated from interfaces-editor.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft, validateStructuredValueDraftShape } from "../shared/structured-value-editor.js";
import { mergeGraphicsInterfacesDraft } from "./draft-model.js";
import { mergeGraphicsInterfacesDraft as mergeGraphicsInterfacesDraft2 } from "./draft-model.js";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function validateGraphicsInterfacesEditorState(value, { source } = {}) {
  if (value?.format !== "fullmeta-graphics-interfaces-editor-state/1" || !object(value.source) || !object(value.mergeBase) || !object(value.model) || typeof value.model.error !== "string") throw new Error("Unsupported Graphics interfaces editor state.");
  if (source !== void 0 && JSON.stringify(value.source) !== JSON.stringify(source)) throw new Error("Graphics interfaces state belongs to a different declaration.");
  validateStructuredValueDraftShape(value.model.draft);
  if (value.model.duplicate !== null) {
    const duplicate = value.model.duplicate;
    if (!object(duplicate) || typeof duplicate.source !== "string" || typeof duplicate.key !== "string") throw new Error("Unsupported pending graphics widget copy state.");
    validateStructuredValueDraftShape(duplicate.draft);
  }
  return value;
}
function GraphicsInterfacesEditor({ model, commands }) {
  const widgets = (() => {
    try {
      return readStructuredValueDraft(model.draft).widgets || {};
    } catch {
      return {};
    }
  })();
  return /* @__PURE__ */ React.createElement("section", { className: "schema-graphics-interfaces-design", "data-jsx-widget": "graphics-interfaces" }, /* @__PURE__ */ React.createElement("p", null, "Edit renderer declarations, actions and interfaces. Additional annotation data is preserved."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "schema-graphics-widget-duplicate-trigger", disabled: !Object.keys(widgets).length, onClick: commands.openDuplicate }, "Duplicate graphics widget"), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: model.draft, label: "Graphics interfaces", onDraftChange: commands.change, error: model.error }), model.duplicate ? /* @__PURE__ */ React.createElement("section", { role: "dialog", "aria-modal": "false", "aria-label": "Duplicate graphics widget", className: "schema-graphics-widget-duplicate-dialog" }, /* @__PURE__ */ React.createElement("h3", null, "Duplicate graphics widget"), /* @__PURE__ */ React.createElement("label", null, "Source widget", /* @__PURE__ */ React.createElement("select", { "aria-label": "Source graphics widget", value: model.duplicate.source, onChange: (event) => commands.duplicateSource(event.target.value) }, Object.keys(widgets).map((key) => /* @__PURE__ */ React.createElement("option", { value: key, key }, key)))), /* @__PURE__ */ React.createElement("label", null, "New widget ID", /* @__PURE__ */ React.createElement("input", { "aria-label": "New graphics widget ID", value: model.duplicate.key, onChange: (event) => commands.duplicateKey(event.target.value) })), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: model.duplicate.draft, label: "Copied widget", onDraftChange: commands.duplicateDraft }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.confirmDuplicate }, "Add copied widget"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.cancelDuplicate }, "Cancel")) : null, model.error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, model.error) : null);
}
function mountGraphicsInterfacesDesignEditor({ container, declaration, onDraftChange, onRawDraftChange } = {}) {
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration)) throw new Error("Choose a Graphics interfaces declaration for the structured editor.");
  const original = structuredClone(declaration);
  let replaySource = original, mergeBase = original, model = { draft: structuredValueDraft(declaration), error: "", duplicate: null }, mounted;
  const render = () => mounted.update({ model, commands });
  const emit = (draft) => {
    model = { ...model, draft, error: "" };
    let value, valid = true;
    try {
      value = readStructuredValueDraft(draft);
    } catch (error) {
      valid = false;
      model.error = error.message;
    }
    if (mounted.inspect().mounted) render();
    onRawDraftChange?.(structuredClone(draft));
    if (valid) try {
      onDraftChange?.(structuredClone(value));
    } catch (error) {
      model.error = error.message;
      if (mounted.inspect().mounted) render();
    }
  };
  const commands = {
    change: emit,
    openDuplicate() {
      const widgets = readStructuredValueDraft(model.draft).widgets || {}, source = Object.keys(widgets)[0];
      if (!source) return;
      let key = `${source}Copy`, serial = 2;
      while (Object.hasOwn(widgets, key)) key = `${source}Copy${serial++}`;
      model = { ...model, duplicate: { source, key, draft: structuredValueDraft(widgets[source]) } };
      render();
      onRawDraftChange?.(structuredClone(model));
    },
    duplicateSource(source) {
      const widgets = readStructuredValueDraft(model.draft).widgets;
      model = { ...model, duplicate: { ...model.duplicate, source, draft: structuredValueDraft(widgets[source]) } };
      render();
      onRawDraftChange?.(structuredClone(model));
    },
    duplicateKey(key) {
      model = { ...model, duplicate: { ...model.duplicate, key } };
      render();
      onRawDraftChange?.(structuredClone(model));
    },
    duplicateDraft(draft) {
      model = { ...model, duplicate: { ...model.duplicate, draft } };
      render();
      onRawDraftChange?.(structuredClone(model));
    },
    cancelDuplicate() {
      model = { ...model, duplicate: null };
      render();
      onRawDraftChange?.(structuredClone(model));
    },
    confirmDuplicate() {
      try {
        const value = readStructuredValueDraft(model.draft), key = model.duplicate.key.trim();
        if (!key || Object.hasOwn(value.widgets || {}, key)) throw new Error("Use a new nonblank graphics widget ID.");
        const next = { ...value, widgets: { ...value.widgets, [key]: readStructuredValueDraft(model.duplicate.draft) } };
        model = { ...model, duplicate: null };
        emit(structuredValueDraft(next));
      } catch (error) {
        model = { ...model, error: error.message };
        render();
      }
    }
  };
  mounted = mountReactComponent(container, GraphicsInterfacesEditor, { model, commands });
  return {
    snapshot: () => readStructuredValueDraft(model.draft),
    draft: () => structuredClone(model),
    restore(value) {
      validateGraphicsInterfacesEditorState({ format: "fullmeta-graphics-interfaces-editor-state/1", source: replaySource, mergeBase, model: value });
      model = structuredClone(value);
      render();
    },
    snapshotState() {
      return { format: "fullmeta-graphics-interfaces-editor-state/1", source: structuredClone(replaySource), mergeBase: structuredClone(mergeBase), model: structuredClone(model) };
    },
    restoreState(value) {
      validateGraphicsInterfacesEditorState(value);
      replaySource = structuredClone(value.source);
      mergeBase = structuredClone(value.mergeBase);
      model = structuredClone(value.model);
      render();
      return { restored: true, pendingDuplicate: model.duplicate !== null };
    },
    commit(source = declaration) {
      return mergeGraphicsInterfacesDraft(mergeBase, readStructuredValueDraft(model.draft), source);
    },
    dispose: () => mounted.dispose()
  };
}
export {
  GraphicsInterfacesEditor,
  mergeGraphicsInterfacesDraft2 as mergeGraphicsInterfacesDraft,
  mountGraphicsInterfacesDesignEditor,
  validateGraphicsInterfacesEditorState
};

//# sourceMappingURL=interfaces-editor.js.map
