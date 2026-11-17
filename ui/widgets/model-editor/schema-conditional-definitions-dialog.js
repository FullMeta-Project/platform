// Generated from schema-conditional-definitions-dialog.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { createCandidateDialog, CandidateRows } from "./candidate-dialog.js";
import { schemaWithConditionalDefinitions, definitionOwners, parseConditionalDefinition } from "./schema-conditional-definitions.js";
function ConditionalDefinitionsEditor({ draft, onDraftChange, source }) {
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Create or edit conditional reusable definitions. Mark the definitions to update; existing unsupported definitions remain unchanged."), /* @__PURE__ */ React.createElement(CandidateRows, { draft, label: "Conditional definitions", onDraftChange, template: { edited: true, ownerPath: definitionOwners(source)[0]?.path || [], key: "", whenPath: "", whenKind: "string", whenValue: "", requireWhen: true, rows: [{ path: "", kind: "ref", value: "", valueKind: "string" }] }, columns: [{ name: "edited", label: "Update" }, { name: "ownerPath", label: "Definition owner path" }, { name: "key", label: "Definition key" }, { name: "whenPath", label: "When property path" }, { name: "whenKind", choices: ["string", "number", "boolean", "null"] }, { name: "whenValue", label: "Equals" }, { name: "requireWhen", label: "Require When" }, { name: "rows", label: "Then constraint rows" }] }));
}
function createConditionalDefinitionsDialog(options) {
  return createCandidateDialog({ ...options, title: "Conditional definitions", toolId: "conditionalDefinitions", Editor: ConditionalDefinitionsEditor, initialDraft(source) {
    const owners = definitionOwners(source);
    if (!owners.length) throw new Error("This schema has no reusable definition containers.");
    return owners.flatMap((owner) => Object.entries(owner.path.reduce((value, key) => value[key], source).$defs).flatMap(([key, value]) => {
      const parsed = parseConditionalDefinition(value, owner.path);
      return parsed ? [{ edited: false, ownerPath: owner.path, key, ...parsed }] : [];
    }));
  }, buildCandidate(source, edits) {
    return schemaWithConditionalDefinitions(source, edits.filter((edit) => edit.edited).map(({ edited, ...edit }) => edit), options.generatedOwnerAtPath);
  } });
}
export {
  ConditionalDefinitionsEditor,
  createConditionalDefinitionsDialog
};

//# sourceMappingURL=schema-conditional-definitions-dialog.js.map
