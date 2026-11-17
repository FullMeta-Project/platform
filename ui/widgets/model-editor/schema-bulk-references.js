// Generated from schema-bulk-references.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { schemaObjectTables } from "./schema-bulk-authoring.js";
import { createCandidateDialog } from "./candidate-dialog.js";
import { ReferenceFilterEditor, referenceFilterDraft, referenceFilterDraftAfterCommand, referenceTargetSchemaFromDraft } from "../reference-selector/widget.js";
import { referenceDraft, referenceKeys, referenceFields, schemaWithBulkReferences } from "./schema-bulk-references.model.js";
import { bulkState, updateBulkState, cleanBulkData, sameBulkValue as same, bulkPointer, BulkText, BulkSelect, BulkToggle, BulkButton } from "./bulk-dialog-controls.js";
import { schemaWithBulkReferences as schemaWithBulkReferences2 } from "./schema-bulk-references.model.js";
const at = (source, path) => path.reduce((value, key) => value?.[key], source);
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
function bulkReferenceDialogDraft(source, initialPath = [], generatedOwnerAtPath = null) {
  const tables = schemaObjectTables(source);
  if (!tables.length) throw new Error("This schema has no object declaration with fields.");
  const entries = /* @__PURE__ */ new Map();
  for (const table of tables) {
    const declaration = at(source, table.path);
    const fields = [
      ...referenceKeys.some((key) => object(declaration?.[key])) ? [{ key: "(declaration)", child: declaration, path: table.path }] : [],
      ...Object.entries(declaration?.properties || {}).map(([key, child]) => ({ key, child, path: [...table.path, "properties", key] }))
    ];
    for (const { key, child, path: path2 } of fields) {
      if (!object(child)) continue;
      const present = referenceKeys.filter((name) => object(child[name]));
      const candidate = present.length > 0 || /(?:Id|Ids|Ref|Refs|Reference|References)$/.test(key) || key === "membership" || child["x-fullmeta-ui-behavior"]?.payload?.widget?.type === "referenceSelector";
      for (const annotationKey of present.length ? referenceKeys : [referenceKeys[0]]) {
        const identity = `${bulkPointer(path2)}/${annotationKey}`;
        const existing = entries.get(identity);
        if (existing) {
          existing.groups.push(JSON.stringify(table.path));
          continue;
        }
        entries.set(identity, {
          identity,
          path: path2,
          key,
          groups: [JSON.stringify(table.path)],
          candidate,
          annotationKey,
          selectedKey: annotationKey,
          fixedKey: present.length > 0,
          locked: Boolean(generatedOwnerAtPath?.(source, path2) || generatedOwnerAtPath?.(source, [...path2, annotationKey])),
          values: referenceDraft(child[annotationKey]),
          filter: referenceFilterDraft(child[annotationKey]?.targetSchema),
          expanded: false
        });
      }
    }
  }
  const path = Array.isArray(initialPath) ? initialPath : initialPath?.path || [];
  const current = path.length && tables.filter((table) => table.path.every((part, index) => path[index] === part)).sort((left, right) => right.path.length - left.path.length)[0];
  return cleanBulkData({ target: current ? JSON.stringify(current.path) : "all-candidates", rows: [...entries.values()] });
}
function bulkReferenceDialogCandidate(source, state, generatedOwnerAtPath = null) {
  const edits = [];
  for (const row of state.rows) {
    if (row.locked) continue;
    const original = at(source, row.path)?.[row.annotationKey];
    const values = { ...row.values, targetSchema: referenceTargetSchemaFromDraft(original?.targetSchema, row.filter) };
    if (!same(values, referenceDraft(original)) || row.selectedKey !== row.annotationKey) edits.push({ path: row.path, annotationKey: row.selectedKey, values });
  }
  return { candidate: schemaWithBulkReferences(source, edits, generatedOwnerAtPath), changes: edits };
}
function BulkReferencesEditor({ source, draft, onDraftChange }) {
  if (!source) return null;
  const state = bulkState(draft), tables = schemaObjectTables(source), all = state.target === "all-candidates";
  const rows = state.rows.filter((row) => all ? row.candidate : row.groups.includes(state.target));
  const change = (next) => updateBulkState(onDraftChange, next);
  const patch = (identity, values) => change({ ...state, rows: state.rows.map((row) => row.identity === identity ? { ...row, ...values } : row) });
  const field = (row, name, value) => patch(row.identity, { values: { ...row.values, [name]: value, ...name === "enabled" ? {} : { enabled: true } } });
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Edit reference paths, target filters, uniqueness, and deletion behavior. Changes in different declarations stay staged together."), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Object declaration", value: state.target, choices: [["all-candidates", "All reference candidates \xB7 across declarations"], ...tables.map((table) => [JSON.stringify(table.path), `${bulkPointer(table.path)} \xB7 ${table.title} \xB7 ${table.count} fields`])], onChange: (target) => change({ ...state, target }) }), /* @__PURE__ */ React.createElement("p", null, rows.length, " reference slots. Generated fields remain read only. Paths use dotted property keys."), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table schema-bulk-reference-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Field", "Annotation", "Use", "Scope", "Target path", "Target property", "Target label", "Target filter"].map((name) => /* @__PURE__ */ React.createElement("th", { key: name }, name)))), /* @__PURE__ */ React.createElement("tbody", null, rows.map((row) => /* @__PURE__ */ React.createElement(React.Fragment, { key: row.identity }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, row.key), /* @__PURE__ */ React.createElement("small", null, bulkPointer(row.path)), /* @__PURE__ */ React.createElement(BulkButton, { "aria-expanded": row.expanded, onClick: () => patch(row.identity, { expanded: !row.expanded }) }, "More reference settings"), row.locked ? /* @__PURE__ */ React.createElement("span", null, "Generated \xB7 read only") : null), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkSelect, { label: `Reference annotation key for ${row.key}`, value: row.selectedKey, choices: referenceKeys, disabled: row.fixedKey || row.locked, onChange: (selectedKey) => patch(row.identity, { selectedKey, values: { ...row.values, enabled: true } }) })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkToggle, { label: `Enable reference for ${row.key}`, value: row.values.enabled, disabled: row.locked, onChange: (value) => field(row, "enabled", value) })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkSelect, { label: `Reference scope for ${row.key}`, value: row.values.scope, disabled: row.locked, choices: [["", "Default component"], ["component", "Component"], ["model", "Model"], ["root", "Root"]], onChange: (value) => field(row, "scope", value) })), ["targetPath", "targetProperty", "targetLabel"].map((name) => /* @__PURE__ */ React.createElement("td", { key: name }, /* @__PURE__ */ React.createElement(BulkText, { label: `Reference ${name.replace(/([A-Z])/g, " $1").toLowerCase()} for ${row.key}`, value: row.values[name], disabled: row.locked, onChange: (value) => field(row, name, value) }))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", null, row.filter.mode === "none" ? "Any target" : "Filtered"), /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => patch(row.identity, { expanded: true }) }, "Edit filter"))), row.expanded ? /* @__PURE__ */ React.createElement("tr", { className: "schema-bulk-annotation-detail-row" }, /* @__PURE__ */ React.createElement("td", { colSpan: 8 }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-reference-extra" }, referenceFields.slice(4).map(([name, label]) => /* @__PURE__ */ React.createElement(BulkText, { key: name, label: `${label} for ${row.key}`, value: row.values[name], disabled: row.locked, onChange: (value) => field(row, name, value) })), /* @__PURE__ */ React.createElement(BulkSelect, { label: `Key reference for ${row.key}`, value: row.values.keyReference, choices: [["", "Unspecified"], ["true", "Yes"], ["false", "No"]], disabled: row.locked, onChange: (value) => field(row, "keyReference", value) }), /* @__PURE__ */ React.createElement(BulkText, { label: `Entities by dimension for ${row.key}`, placeholder: "2:domain,boundary; 3:domain,boundary,edge", value: row.values.entitiesByDimension, disabled: row.locked, onChange: (value) => field(row, "entitiesByDimension", value) })), /* @__PURE__ */ React.createElement(ReferenceFilterEditor, { view: { draft: row.filter, disabled: row.locked }, onCommand: (command) => patch(row.identity, { filter: referenceFilterDraftAfterCommand(row.filter, command), values: { ...row.values, enabled: true } }) }))) : null))))));
}
function createBulkReferenceDialog({ getDocument, validateCandidate, applyCandidate, generatedOwnerAtPath = null }) {
  return createCandidateDialog({
    title: "Bulk field references",
    toolId: "bulkReferences",
    className: "schema-bulk-reference-dialog",
    getDocument,
    validateCandidate,
    applyCandidate,
    initialDraft: (source, context) => bulkReferenceDialogDraft(source, context, generatedOwnerAtPath),
    buildCandidate: (source, state) => bulkReferenceDialogCandidate(source, state, generatedOwnerAtPath),
    Editor: BulkReferencesEditor,
    message: "Applied bulk field references. Save the schema to keep the changes."
  });
}
export {
  BulkReferencesEditor,
  bulkReferenceDialogCandidate,
  bulkReferenceDialogDraft,
  createBulkReferenceDialog,
  schemaWithBulkReferences2 as schemaWithBulkReferences
};

//# sourceMappingURL=schema-bulk-references.js.map
