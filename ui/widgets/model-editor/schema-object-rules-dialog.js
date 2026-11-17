// Generated from schema-object-rules-dialog.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { createCandidateDialog, CandidateField, CandidateRows, draftProperty, withDraftProperty } from "./candidate-dialog.js";
import { schemaWithObjectRules, objectDeclarations, conditionalDraft, mapDraft } from "./schema-object-rules.js";
const at = (source, path) => path.reduce((value, key) => value?.[key], source);
const ownerDraft = (source, ownerPath) => {
  const owner = at(source, ownerPath);
  return { ownerPath, editConditions: false, conditions: (owner.allOf || []).map(conditionalDraft), editMap: false, map: mapDraft(owner) };
};
function ObjectRulesEditor({ draft, onDraftChange, source }) {
  const owners = objectDeclarations(source), ownerPath = readStructuredValueDraft(draftProperty(draft, "ownerPath"));
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("label", null, "Object declaration", /* @__PURE__ */ React.createElement("select", { "aria-label": "Object declaration", value: JSON.stringify(ownerPath), onChange: (event) => onDraftChange(structuredValueDraft(ownerDraft(source, JSON.parse(event.target.value)))) }, owners.map((owner) => /* @__PURE__ */ React.createElement("option", { key: JSON.stringify(owner.path), value: JSON.stringify(owner.path) }, owner.label || "#/" + owner.path.join("/"))))), /* @__PURE__ */ React.createElement(CandidateField, { draft, name: "editConditions", label: "Edit field conditions", onDraftChange }), /* @__PURE__ */ React.createElement(CandidateRows, { label: "When / Then field conditions", draft: draftProperty(draft, "conditions"), onDraftChange: (value) => onDraftChange(withDraftProperty(draft, "conditions", value)), template: { kind: "guided", when: "", comparison: "present", valueType: "string", value: "", effect: "require", target: "" }, columns: [{ name: "when", label: "When field" }, { name: "comparison", choices: ["present", "equals"] }, { name: "valueType", choices: ["string", "number", "boolean", "null"] }, { name: "value" }, { name: "effect", choices: ["require", "prohibit"] }, { name: "target", label: "Target field" }] }), /* @__PURE__ */ React.createElement(CandidateField, { draft, name: "editMap", label: "Edit object-map value rule", onDraftChange }), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: draftProperty(draft, "map"), label: "Map rule and value options", fixedObjectKeysAtRoot: true, onDraftChange: (value) => onDraftChange(withDraftProperty(draft, "map", value)) }));
}
function createObjectRulesDialog(options) {
  const controller = createCandidateDialog({ ...options, title: "Object rules", toolId: "objectRules", Editor: ObjectRulesEditor, initialDraft(source, context) {
    const entries = objectDeclarations(source);
    if (!entries.length) throw new Error("This schema has no object declarations.");
    const path = Array.isArray(context) ? context : context.path || [];
    const selected = entries.find((entry) => JSON.stringify(entry.path) === JSON.stringify(path)) || [...entries].reverse().find((entry) => entry.path.every((part, index) => path[index] === part)) || entries[0];
    return ownerDraft(source, selected.path);
  }, buildCandidate(source, draft) {
    const changes = {};
    if (draft.editConditions) changes.conditions = draft.conditions;
    if (draft.editMap) changes.map = draft.map;
    return schemaWithObjectRules(source, draft.ownerPath, changes, options.generatedOwnerAtPath);
  } });
  return controller;
}
export {
  ObjectRulesEditor,
  createObjectRulesDialog
};

//# sourceMappingURL=schema-object-rules-dialog.js.map
