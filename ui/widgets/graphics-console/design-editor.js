// Generated from design-editor.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { graphicsConsoleIssues } from "./contract.js";
import { mergeGraphicsConsoleDraft } from "./draft-model.js";
import { mergeGraphicsConsoleDraft as mergeGraphicsConsoleDraft2 } from "./draft-model.js";
function GraphicsConsoleDesignEditor({ model, onDraftChange }) {
  return /* @__PURE__ */ React.createElement("section", { className: "schema-graphics-design", "data-jsx-widget": "graphics-console-design" }, /* @__PURE__ */ React.createElement("h3", null, "Graphics console"), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: model.draft, label: "Graphics console", onDraftChange, error: model.error }), model.error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, model.error) : null);
}
function mountGraphicsConsoleDesignEditor({ container, declaration, state, widgets = [], renderers = {}, onDraftChange, onRawDraftChange } = {}) {
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration)) throw new Error("Choose a Graphics console declaration for the designer.");
  const original = structuredClone(declaration);
  let model = { draft: structuredValueDraft(state && typeof state === "object" ? state : declaration), error: "" }, mounted;
  const render = () => mounted.update({ model, onDraftChange: changed });
  const changed = (draft) => {
    model = { draft, error: "" };
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
      onDraftChange?.(value);
    } catch (error) {
      model.error = error.message;
      if (mounted.inspect().mounted) render();
    }
  };
  mounted = mountReactComponent(container, GraphicsConsoleDesignEditor, { model, onDraftChange: changed });
  return { snapshot: () => readStructuredValueDraft(model.draft), draft: () => structuredClone(model.draft), restore(draft) {
    model = { draft: structuredClone(draft), error: "" };
    render();
  }, commit(source = declaration) {
    const next = mergeGraphicsConsoleDraft(original, readStructuredValueDraft(model.draft), source), issues = graphicsConsoleIssues(next, Object.keys(renderers).length ? renderers : widgets);
    if (issues.length) throw new Error(issues[0]);
    return next;
  }, dispose: () => mounted.dispose() };
}
export {
  GraphicsConsoleDesignEditor,
  mergeGraphicsConsoleDraft2 as mergeGraphicsConsoleDraft,
  mountGraphicsConsoleDesignEditor
};

//# sourceMappingURL=design-editor.js.map
