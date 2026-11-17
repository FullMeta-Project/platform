// Generated from design-editor.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { validateUiTreeAnnotation } from "./tree-schema.js";
const treeDesignLabel = "Tree composition";
function TreeDesignEditor({ draft, onDraftChange, heading = treeDesignLabel, error }) {
  return /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail", "data-jsx-widget": "tree-design" }, /* @__PURE__ */ React.createElement("h3", null, heading), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft, label: "Tree composition", onDraftChange, error }));
}
function renderTreeDesignEditor(parent, schema, { source, state, configuration } = {}) {
  const key = configuration?.annotation || "x-fullmeta-ui-tree", annotation = source?.[key];
  if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) return null;
  const original = JSON.stringify(annotation);
  let initial = annotation;
  if (typeof state === "string") try {
    initial = JSON.parse(state);
  } catch {
  }
  let draft = structuredValueDraft(initial), error = "", mounted;
  const container = document.createElement("div");
  parent.append(container);
  const render = () => mounted.update({ draft, error, heading: configuration?.authoring?.heading, onDraftChange: change });
  const change = (next) => {
    draft = next;
    error = "";
    render();
  };
  mounted = mountReactComponent(container, TreeDesignEditor, { draft, onDraftChange: change });
  const snapshot = () => JSON.stringify(readStructuredValueDraft(draft));
  return {
    annotationKey: key,
    ownedUiAnnotations: configuration?.authoring?.ownedUiAnnotations || ["label", "widget", "placeholder"],
    fields: [{ label: treeDesignLabel, keys: [key], type: "json", input: { get value() {
      return snapshot();
    } }, original, snapshot, validate(value) {
      const errors = validateUiTreeAnnotation(value);
      if (errors.length) throw new Error(errors[0]);
    } }],
    draft: () => structuredClone(draft),
    restore(next) {
      draft = structuredClone(next);
      render();
    },
    dispose() {
      mounted.dispose();
      container.remove();
    }
  };
}
export {
  TreeDesignEditor,
  renderTreeDesignEditor,
  treeDesignLabel
};

//# sourceMappingURL=design-editor.js.map
