// Generated from editor-selection-dialog.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { loadWidgetCatalogs } from "../shared/catalog.js";
import { editorWidgetSelection } from "../shared/editor-contract.js";
import { structuredValueDraft } from "../shared/structured-value-editor.js";
import { createCandidateDialog, CandidateField, draftProperty, withDraftProperty } from "./candidate-dialog.js";
function EditorSelection({ draft, onDraftChange, context }) {
  const editors = context.editors, selected = draftProperty(draft, "widget")?.value || "";
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "The component and its options come from widget catalogs. Unknown saved option keys are retained."), /* @__PURE__ */ React.createElement(CandidateField, { draft, name: "widget", label: "Editor component", choices: [{ value: "", label: "Use platform default" }, ...editors.map((widget) => ({ value: widget.id, label: `${widget.label} \xB7 ${widget.catalogLabel}` }))], onDraftChange: (next) => {
    const id = draftProperty(next, "widget")?.value;
    onDraftChange(withDraftProperty(next, "options", structuredValueDraft(id === context.saved?.widget ? context.saved.options || {} : {})));
  } }), /* @__PURE__ */ React.createElement(CandidateField, { draft, name: "options", label: "Editor options", onDraftChange }), selected ? /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Supported options"), /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(editors.find((editor) => editor.id === selected)?.editor.options || {}, null, 2))) : null);
}
function createEditorWidgetDialog(options) {
  let controller, catalog, generation = 0, disposed = false;
  return {
    async open() {
      if (disposed) throw new Error("The editor selection dialog is disposed.");
      const attempt = ++generation, source = options.getDocument(), stamp = JSON.stringify(source), schemaUrl = new URL(options.getDocumentFile(), new URL("../../../../", import.meta.url));
      const loaded = await loadWidgetCatalogs(
        /** @type {any} */
        { schema: source, schemaUrl }
      );
      if (disposed || attempt !== generation) throw new Error("The editor selection changed while its catalog was loading.");
      if (stamp !== JSON.stringify(options.getDocument())) throw new Error("The schema changed while its editor catalog was loading. Open the dialog again.");
      catalog = loaded;
      controller?.dispose();
      controller = createCandidateDialog({
        ...options,
        validateCandidate: options.validateCandidate || (() => {
        }),
        title: "Editor widget",
        toolId: "editorSelection",
        Editor: EditorSelection,
        initialDraft(source2) {
          const saved = source2["x-fullmeta-ui-editor"];
          return { widget: saved?.widget || "", options: saved?.options || {} };
        },
        buildCandidate(source2, draft) {
          const value = draft.widget ? { widget: draft.widget, ...Object.keys(draft.options).length ? { options: draft.options } : {} } : null;
          if (value) editorWidgetSelection(value, catalog);
          const candidate = structuredClone(source2);
          if (value) candidate["x-fullmeta-ui-editor"] = value;
          else delete candidate["x-fullmeta-ui-editor"];
          return { candidate, allowGeneratedSubtrees: [["x-fullmeta-ui-editor"]] };
        }
      });
      controller.open({ editors: catalog.widgets.filter((widget) => widget.editor), saved: source["x-fullmeta-ui-editor"] || null });
    },
    snapshot: () => controller?.snapshot() || null,
    restore(value) {
      if (!controller) throw new Error("Open the editor selection dialog before restoring its draft.");
      return controller.restore(value);
    },
    close() {
      generation++;
      controller?.close();
    },
    preview: () => controller.preview(),
    apply: () => controller.apply(),
    get dialog() {
      return controller?.dialog;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      controller?.dispose();
    }
  };
}
export {
  EditorSelection,
  createEditorWidgetDialog
};

//# sourceMappingURL=editor-selection-dialog.js.map
