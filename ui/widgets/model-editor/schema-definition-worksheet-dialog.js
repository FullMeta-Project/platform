// Generated from schema-definition-worksheet-dialog.jsx by scripts/build-frontend.mjs.
import React, { useState } from "../shared/react/react-runtime.js";
import { structuredValueDraft } from "../shared/structured-value-editor.js";
import { createCandidateDialog, CandidateRows } from "./candidate-dialog.js";
import { schemaWithDefinitionRows, flattenDefinition, facts } from "./schema-definition-worksheet.js";
function DefinitionWorksheetEditor({ draft, onDraftChange, source }) {
  const keys = Object.keys(source.$defs || {}), [selected, setSelected] = useState(keys[0] || ""), [error, setError] = useState("");
  const load = () => {
    const parsed = flattenDefinition(source.$defs[selected]);
    if (parsed.unsupported.length) {
      setError(`This definition has unsupported facts at ${parsed.unsupported[0]}; it is preserved.`);
      return;
    }
    onDraftChange(structuredValueDraft(parsed.rows.map((row) => ({ definition: selected, ...row }))));
    setError("");
  };
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Add typed facts for several reusable schemas, or load an existing supported definition."), /* @__PURE__ */ React.createElement("select", { "aria-label": "Existing reusable definition", value: selected, onChange: (event) => setSelected(event.target.value) }, keys.map((key) => /* @__PURE__ */ React.createElement("option", { key }, key))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !selected, onClick: load }, "Load definition rows"), error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, error) : null, /* @__PURE__ */ React.createElement(CandidateRows, { draft, label: "Definition worksheet", onDraftChange, template: { definition: selected || "", path: "", fact: "type", value: "object" }, columns: [{ name: "definition", label: "Definition key" }, { name: "path", label: "Schema path" }, { name: "fact", label: "Fact", choices: facts.map(([value, label]) => ({ value, label })) }, { name: "value" }] }));
}
function createDefinitionWorksheetDialog(options) {
  return createCandidateDialog({ ...options, title: "Reusable definition worksheet", toolId: "definitionWorksheet", Editor: DefinitionWorksheetEditor, initialDraft() {
    return [];
  }, buildCandidate(source, rows) {
    return schemaWithDefinitionRows(source, rows, options.generatedOwnerAtPath);
  } });
}
export {
  DefinitionWorksheetEditor,
  createDefinitionWorksheetDialog
};

//# sourceMappingURL=schema-definition-worksheet-dialog.js.map
