// Generated from schema-definition-patches-dialog.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { createCandidateDialog, CandidateRows } from "./candidate-dialog.js";
import { schemaWithDefinitionPatches, availableDefinitions, valueTypes } from "./schema-definition-patches.js";
function DefinitionPatchesEditor({ draft, onDraftChange, source }) {
  const definitions = availableDefinitions(source);
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Set or remove explicit paths. Unrelated declaration data is preserved. Paths are relative to the selected schema owner."), /* @__PURE__ */ React.createElement(CandidateRows, { draft, label: "Typed definition patches", onDraftChange, template: { definition: definitions[0] || "#", operation: "set", path: "", fact: "string", value: "" }, columns: [{ name: "definition", label: "Schema owner", choices: definitions }, { name: "operation", choices: ["set", "remove"] }, { name: "path", label: "Relative path" }, { name: "fact", label: "Value type", choices: valueTypes.map(([value, label]) => ({ value, label })) }, { name: "value" }] }));
}
function createDefinitionPatchesDialog(options) {
  return createCandidateDialog({ ...options, title: "Definition patches", toolId: "definitionPatches", Editor: DefinitionPatchesEditor, initialDraft(source, context) {
    const definitions = availableDefinitions(source);
    if (!definitions.length) throw new Error("This schema has no reusable definitions to patch.");
    const path = Array.isArray(context) ? context : context.path || [], pointer = "#/" + path.join("/");
    return [{ definition: definitions.includes(pointer) ? pointer : definitions[0], operation: "set", path: "", fact: "string", value: "" }];
  }, buildCandidate(source, edits) {
    const result = schemaWithDefinitionPatches(source, edits, options.generatedOwnerAtPath);
    return { candidate: result.document, changes: result.changes };
  } });
}
export {
  DefinitionPatchesEditor,
  createDefinitionPatchesDialog
};

//# sourceMappingURL=schema-definition-patches-dialog.js.map
