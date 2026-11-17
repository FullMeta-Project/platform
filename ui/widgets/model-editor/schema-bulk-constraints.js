// Generated from schema-bulk-constraints.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { schemaObjectTables } from "./schema-bulk-authoring.js";
import { createCandidateDialog } from "./candidate-dialog.js";
import { fieldConstraintDraft, schemaWithBulkFieldConstraints, kindLabel, boundOptions, extras, crossTemplateSpecs, templateValue, templateChanges } from "./schema-bulk-constraints.model.js";
import { bulkState, updateBulkState, cleanBulkData, sameBulkValue as same, bulkPointer, BulkText, BulkSelect, BulkToggle, BulkButton } from "./bulk-dialog-controls.js";
import { fieldConstraintDraft as fieldConstraintDraft2, schemaWithBulkFieldConstraints as schemaWithBulkFieldConstraints2 } from "./schema-bulk-constraints.model.js";
const at = (source, path) => path.reduce((value, key) => value?.[key], source);
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const kinds = ["string", "number", "integer", "array", "object", "boolean", "null"];
const shape = (values) => JSON.stringify([values.kind, values.kind === "array" ? values.itemKind : ""]);
const crossRows = (rows, key, group) => rows.filter((row) => row.key === key && shape(row.values) === group);
const crossGroups = (rows, key) => [...new Set(rows.filter((row) => row.key === key).map((row) => shape(row.values)))];
function constraintCrossSelection(rows, key, group = crossGroups(rows, key)[0] || '["",""]') {
  const eligible = crossRows(rows, key, group), [kind, itemKind] = JSON.parse(group);
  return { key, group, selected: eligible.map((row) => row.target), templates: Object.fromEntries(crossTemplateSpecs(kind, itemKind).map((spec) => {
    const rawKey = spec.kind === "lower" || spec.kind === "upper" ? `${spec.id.startsWith("item") ? `item${spec.kind[0].toUpperCase()}${spec.kind.slice(1)}` : spec.kind}Value` : spec.id;
    const values = eligible.map((row) => row.values[rawKey]);
    return [spec.id, { action: "keep", value: values.length && values.every((value) => value === values[0]) && typeof values[0] === "string" ? values[0] : "" }];
  })) };
}
function bulkFieldConstraintsDialogDraft(source, initialPath = [], generatedOwnerAtPath = null) {
  const tables = schemaObjectTables(source);
  if (!tables.length) throw new Error("This schema has no object declaration with fields.");
  const path = Array.isArray(initialPath) ? initialPath : initialPath?.path || [];
  const current = tables.filter((table) => table.path.every((part, index) => path[index] === part)).sort((left, right) => right.path.length - left.path.length)[0] || tables[0];
  const rows = tables.flatMap((table) => Object.keys(at(source, table.path).properties || {}).filter((key) => object(at(source, table.path).properties[key])).map((key) => ({
    target: JSON.stringify(table.path),
    path: table.path,
    key,
    generated: Boolean(generatedOwnerAtPath?.(source, [...table.path, "properties", key])),
    values: fieldConstraintDraft(source, table.path, key)
  })));
  const keys = [...new Set(rows.map((row) => row.key))].sort((left, right) => rows.filter((row) => row.key === right).length - rows.filter((row) => row.key === left).length || left.localeCompare(right));
  return cleanBulkData({ mode: "declaration", target: JSON.stringify(current.path), filter: "", rows, cross: constraintCrossSelection(rows, keys[0]) });
}
function bulkFieldConstraintsDialogCandidate(source, state, generatedOwnerAtPath = null) {
  const candidate = structuredClone(source), allowGeneratedSubtrees = [], changes = [];
  if (state.mode === "field-key") {
    const rows = crossRows(state.rows, state.cross.key, state.cross.group).filter((row) => state.cross.selected.includes(row.target));
    if (!rows.length) throw new Error("Select at least one editable declaration.");
    const [kind, itemKind] = JSON.parse(state.cross.group);
    const fields = templateChanges(crossTemplateSpecs(kind, itemKind).map((spec) => ({ spec, action: { value: state.cross.templates[spec.id].action }, value: { value: state.cross.templates[spec.id].value } })));
    if (!Object.keys(fields).length) throw new Error("Choose an action for at least one constraint.");
    for (const row of rows) {
      schemaWithBulkFieldConstraints(source, row.path, [{ key: row.key, changes: fields }], generatedOwnerAtPath, candidate);
      changes.push({ path: [...row.path, "properties", row.key], changes: fields });
      allowGeneratedSubtrees.push([...row.path, "properties", row.key]);
      if (Object.hasOwn(fields, "required")) allowGeneratedSubtrees.push([...row.path, "required"]);
    }
  } else {
    for (const row of state.rows) {
      const baseline = fieldConstraintDraft(source, row.path, row.key), activeItemType = row.values.itemType || baseline.itemKind;
      const fields = Object.fromEntries(Object.entries(row.values).filter(([key, value]) => {
        if (["kind", "itemKind"].includes(key) || same(value, baseline[key])) return false;
        if (["itemMinLength", "itemMaxLength", "itemPattern"].includes(key)) return activeItemType === "string";
        if (key.startsWith("item") && key !== "itemType") return ["number", "integer"].includes(activeItemType);
        return true;
      }));
      if (!Object.keys(fields).length) continue;
      schemaWithBulkFieldConstraints(source, row.path, [{ key: row.key, changes: fields }], generatedOwnerAtPath, candidate);
      changes.push({ path: [...row.path, "properties", row.key], changes: fields });
      allowGeneratedSubtrees.push([...row.path, "properties", row.key]);
      if (Object.hasOwn(fields, "required")) allowGeneratedSubtrees.push([...row.path, "required"]);
    }
  }
  if (!changes.length) throw new Error("Edit at least one constraint cell before previewing.");
  if (same(candidate, source)) throw new Error("The template already matches every selected declaration.");
  return { candidate, allowGeneratedSubtrees, changes };
}
function FieldConstraintRow({ source, row, onChange }) {
  const values = row.values, key = row.key, kind = values.kind;
  const set = (name, value) => onChange({ ...row, values: { ...values, [name]: value, ...name.endsWith("Kind") && !value ? { [name.replace(/Kind$/, "Value")]: "" } : {} } });
  const text = (name, label) => /* @__PURE__ */ React.createElement(BulkText, { label: `${label} for ${key}`, value: values[name], onChange: (value) => set(name, value) });
  const bounds = (prefix, lower) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(BulkSelect, { label: `${lower ? "Lower" : "Upper"} ${prefix ? "item " : ""}bound kind for ${key}`, value: values[`${prefix}${prefix ? lower ? "Lower" : "Upper" : lower ? "lower" : "upper"}Kind`], choices: boundOptions(lower), onChange: (value) => set(`${prefix}${prefix ? lower ? "Lower" : "Upper" : lower ? "lower" : "upper"}Kind`, value) }), text(`${prefix}${prefix ? lower ? "Lower" : "Upper" : lower ? "lower" : "upper"}Value`, `${lower ? "Lower" : "Upper"} ${prefix ? "item " : ""}bound`));
  const items = at(source, [...row.path, "properties", key])?.items, canCreate = items === void 0 || object(items) && !Object.keys(items).length, itemType = values.itemType || values.itemKind;
  return /* @__PURE__ */ React.createElement("tr", { "data-kind": kind || "other" }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, key), row.generated ? /* @__PURE__ */ React.createElement("span", null, "Generated \xB7 editable here") : null), /* @__PURE__ */ React.createElement("td", null, kindLabel(kind)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkToggle, { label: `Required ${key}`, value: values.required, onChange: (value) => set("required", value) })), /* @__PURE__ */ React.createElement("td", null, kind === "string" ? text("minLength", "Minimum length") : ["number", "integer"].includes(kind) ? bounds("", true) : kind === "array" ? text("minItems", "Minimum items") : kind === "object" ? text("minProperties", "Minimum properties") : "\u2014"), /* @__PURE__ */ React.createElement("td", null, kind === "string" ? text("maxLength", "Maximum length") : ["number", "integer"].includes(kind) ? bounds("", false) : kind === "array" ? text("maxItems", "Maximum items") : kind === "object" ? text("maxProperties", "Maximum properties") : "\u2014"), /* @__PURE__ */ React.createElement("td", null, kind === "string" ? text("pattern", "Pattern") : kind === "object" ? /* @__PURE__ */ React.createElement(BulkSelect, { label: `Extra properties for ${key}`, value: values.additionalProperties, choices: [...extras, ["custom", "Custom \xB7 inspect field"]], disabled: values.additionalProperties === "custom", onChange: (value) => set("additionalProperties", value) }) : kind === "array" ? /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-array-constraints" }, /* @__PURE__ */ React.createElement(BulkSelect, { label: `Unique items for ${key}`, value: values.uniqueItems, choices: [["", "Unspecified"], ["true", "Unique"], ["false", "Duplicates allowed"]], onChange: (value) => set("uniqueItems", value) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: `Item type for ${key}`, value: itemType, choices: [["", canCreate ? "No item schema" : "Custom item schema"], ...kinds.map((kind2) => [kind2, kindLabel(kind2)])], disabled: !canCreate, onChange: (value) => set("itemType", value) }), itemType === "string" ? /* @__PURE__ */ React.createElement("div", null, text("itemMinLength", "Minimum item length"), text("itemMaxLength", "Maximum item length"), text("itemPattern", "Item pattern")) : ["number", "integer"].includes(itemType) ? /* @__PURE__ */ React.createElement("div", null, bounds("item", true), bounds("item", false)) : null) : "\u2014"));
}
const templateOptions = (spec) => spec.kind === "required" ? [["keep", "Keep"], ["required", "Require"], ["optional", "Optional"]] : spec.kind === "lower" ? [["keep", "Keep"], ["remove", "Remove"], ["minimum", "Inclusive"], ["exclusiveMinimum", "Exclusive"]] : spec.kind === "upper" ? [["keep", "Keep"], ["remove", "Remove"], ["maximum", "Inclusive"], ["exclusiveMaximum", "Exclusive"]] : spec.kind === "unique" ? [["keep", "Keep"], ["remove", "Unspecified"], ["true", "Unique"], ["false", "Allow duplicates"]] : spec.kind === "extra" ? [["keep", "Keep"], ["remove", "Unspecified"], ...extras.filter(([value]) => value)] : [["keep", "Keep"], ["set", "Set value"], ["remove", "Remove"]];
function BulkFieldConstraintsEditor({ source, draft, onDraftChange }) {
  if (!source) return null;
  const state = bulkState(draft), tables = schemaObjectTables(source), change = (next) => updateBulkState(onDraftChange, next), cross = state.cross;
  const keys = [...new Set(state.rows.map((row) => row.key))].sort((left, right) => String(left).localeCompare(String(right))), groups = crossGroups(state.rows, cross.key);
  const eligible = crossRows(state.rows, cross.key, cross.group), selected = eligible.filter((row) => cross.selected.includes(row.target)), [kind, itemKind] = JSON.parse(cross.group);
  const setCross = (next) => change({ ...state, cross: { ...cross, ...next } });
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Inspect and edit constraints within declarations or apply a template across matching field keys. Unknown schema keywords survive."), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Editing scope", value: state.mode, choices: [["declaration", "One object declaration"], ["field-key", "Same field across declarations"]], onChange: (mode) => change({ ...state, mode }) }), state.mode === "declaration" ? /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-toolbar" }, /* @__PURE__ */ React.createElement(BulkSelect, { label: "Object declaration", value: state.target, choices: tables.map((table) => [JSON.stringify(table.path), `${bulkPointer(table.path)} \xB7 ${table.title} \xB7 ${table.count} fields`]), onChange: (target) => change({ ...state, target }) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Show field types", value: state.filter, choices: [["", "All types"], ...kinds.map((kind2) => [kind2, kindLabel(kind2)])], onChange: (filter) => change({ ...state, filter }) })), /* @__PURE__ */ React.createElement("p", null, "Changes remain staged when switching declarations. Minimum and maximum follow the field type; generated fields can be edited here."), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table schema-bulk-constraints-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Field", "Type", "Required", "Minimum", "Maximum", "Pattern / item rules / extra properties"].map((title) => /* @__PURE__ */ React.createElement("th", { key: title }, title)))), /* @__PURE__ */ React.createElement("tbody", null, state.rows.filter((row) => row.target === state.target && (!state.filter || row.values.kind === state.filter)).map((row) => /* @__PURE__ */ React.createElement(FieldConstraintRow, { key: row.key, source, row, onChange: (next) => change({ ...state, rows: state.rows.map((item) => item === row ? next : item) }) })))))) : /* @__PURE__ */ React.createElement("section", { className: "schema-bulk-cross-panel" }, /* @__PURE__ */ React.createElement(BulkSelect, { label: "Field key", value: cross.key, choices: keys.map((key) => [key, `${key} \xB7 ${state.rows.filter((row) => row.key === key).length} declarations`]), onChange: (key) => change({ ...state, cross: constraintCrossSelection(state.rows, key) }) }), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Field shape", value: cross.group, choices: groups.map((group) => {
    const [kind2, item] = JSON.parse(group);
    return [group, `${kindLabel(kind2)}${item ? ` of ${kindLabel(item)}` : ""} \xB7 ${crossRows(state.rows, cross.key, group).length} declarations`];
  }), onChange: (group) => change({ ...state, cross: constraintCrossSelection(state.rows, cross.key, group) }) }), /* @__PURE__ */ React.createElement("p", null, selected.length, " selected of ", eligible.length, " matching declarations. Only actions other than Keep will change."), /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => setCross({ selected: eligible.map((row) => row.target) }) }, "Select eligible"), /* @__PURE__ */ React.createElement(BulkButton, { onClick: () => setCross({ selected: [] }) }, "Clear selection"), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-cross-declarations" }, eligible.map((row) => /* @__PURE__ */ React.createElement(BulkToggle, { key: row.target, label: `Apply to ${bulkPointer([...row.path, "properties", row.key])}`, value: cross.selected.includes(row.target), onChange: (checked) => setCross({ selected: checked ? [...cross.selected, row.target] : cross.selected.filter((target) => target !== row.target) }) }))), /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Constraint", "Current across selection", "Action", "New value"].map((title) => /* @__PURE__ */ React.createElement("th", { key: title }, title)))), /* @__PURE__ */ React.createElement("tbody", null, crossTemplateSpecs(kind, itemKind).map((spec) => {
    const template = cross.templates[spec.id], current = selected.map((row) => templateValue(fieldConstraintDraft(source, row.path, row.key), spec));
    const edit = (values) => setCross({ templates: { ...cross.templates, [spec.id]: { ...template, ...values } } });
    return /* @__PURE__ */ React.createElement("tr", { key: spec.id }, /* @__PURE__ */ React.createElement("td", null, spec.label), /* @__PURE__ */ React.createElement("td", null, !current.length ? "Select a declaration" : current.every((value) => value === current[0]) ? current[0] : `Mixed \xB7 ${new Set(current).size} values`), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkSelect, { label: `${spec.label} action`, value: template.action, choices: templateOptions(spec), onChange: (action) => edit({ action }) })), /* @__PURE__ */ React.createElement("td", null, ["text", "lower", "upper"].includes(spec.kind) ? /* @__PURE__ */ React.createElement(BulkText, { label: `${spec.label} new value`, value: template.value, disabled: !["set", "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum"].includes(template.action), onChange: (value) => edit({ value }) }) : "\u2014"));
  })))));
}
function createBulkFieldConstraintsDialog({ getDocument, validateCandidate, applyCandidate, generatedOwnerAtPath = null }) {
  return createCandidateDialog({
    title: "Bulk field constraints",
    toolId: "bulkConstraints",
    className: "schema-bulk-constraints-dialog",
    getDocument,
    validateCandidate,
    applyCandidate,
    initialDraft: (source, context) => bulkFieldConstraintsDialogDraft(source, context, generatedOwnerAtPath),
    buildCandidate: (source, state) => bulkFieldConstraintsDialogCandidate(source, state, generatedOwnerAtPath),
    Editor: BulkFieldConstraintsEditor,
    message: "Applied bulk field constraints. Save the schema to keep the changes."
  });
}
export {
  BulkFieldConstraintsEditor,
  FieldConstraintRow,
  bulkFieldConstraintsDialogCandidate,
  bulkFieldConstraintsDialogDraft,
  constraintCrossSelection,
  createBulkFieldConstraintsDialog,
  fieldConstraintDraft2 as fieldConstraintDraft,
  schemaWithBulkFieldConstraints2 as schemaWithBulkFieldConstraints
};

//# sourceMappingURL=schema-bulk-constraints.js.map
