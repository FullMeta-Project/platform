// Generated from schema-root-constraints-dialog.jsx by scripts/build-frontend.mjs.
import React, { useState } from "../shared/react/react-runtime.js";
import { StructuredValueEditor, structuredValueDraft } from "../shared/structured-value-editor.js";
import { createCandidateDialog, CandidateField, draftProperty, withDraftProperty } from "./candidate-dialog.js";
import { schemaWithRootConstraints, simpleConstChain, definitionRefs } from "./schema-root-constraints.js";
function RootConstraintsEditor({ draft, onDraftChange, source }) {
  const refs = definitionRefs(source), [selected, setSelected] = useState(refs[0] || "");
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Compose local definitions and constrain a property according to another property. Enable only the sections to change."), /* @__PURE__ */ React.createElement(CandidateField, { draft, name: "editComposition", label: "Edit root composition", onDraftChange }), /* @__PURE__ */ React.createElement("label", null, "Local definition", /* @__PURE__ */ React.createElement("select", { value: selected, onChange: (event) => setSelected(event.target.value) }, refs.map((ref) => /* @__PURE__ */ React.createElement("option", { key: ref }, ref)))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !selected, onClick: () => onDraftChange(withDraftProperty(withDraftProperty(draft, "editComposition", structuredValueDraft(true)), "allOf", { ...draftProperty(draft, "allOf"), items: [...draftProperty(draft, "allOf").items, structuredValueDraft({ $ref: selected })] })) }, "Add definition reference"), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: draftProperty(draft, "allOf"), label: "Ordered root composition", onDraftChange: (value) => onDraftChange(withDraftProperty(draft, "allOf", value)) }), /* @__PURE__ */ React.createElement(CandidateField, { draft, name: "editCondition", label: "Edit root condition", onDraftChange }), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: draftProperty(draft, "condition"), label: "When / Then / Otherwise condition", onDraftChange: (value) => onDraftChange(withDraftProperty(draft, "condition", value)) }));
}
function createRootConstraintsDialog(options) {
  return createCandidateDialog({ ...options, title: "Root schema constraints", toolId: "rootConstraints", className: "schema-root-constraints-dialog", Editor: RootConstraintsEditor, initialDraft(source) {
    const when = simpleConstChain(source.if), then = simpleConstChain(source.then), otherwise = simpleConstChain(source.else);
    return { editComposition: false, allOf: source.allOf || [], editCondition: false, condition: when && then ? { when, then, ...otherwise ? { otherwise } : {} } : { when: { path: ["field"], value: "" }, then: { path: ["target"], value: "" } } };
  }, buildCandidate(source, draft) {
    const changes = {};
    if (draft.editComposition) changes.allOf = draft.allOf;
    if (draft.editCondition) changes.condition = draft.condition;
    return schemaWithRootConstraints(source, changes, options.generatedOwnerAtPath);
  } });
}
export {
  RootConstraintsEditor,
  createRootConstraintsDialog
};

//# sourceMappingURL=schema-root-constraints-dialog.js.map
