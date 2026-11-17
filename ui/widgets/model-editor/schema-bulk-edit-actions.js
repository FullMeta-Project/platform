// Generated from schema-bulk-edit-actions.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { schemaObjectTables } from "./schema-bulk-authoring.js";
import { createCandidateDialog } from "./candidate-dialog.js";
import { schemaWithBulkEditActions, insertionEffectDraft, insertionEffectFromDraft, insertionEffectsFromTsv, setString } from "./schema-bulk-edit-actions.model.js";
import { bulkState, updateBulkState, cleanBulkData, bulkPointer, BulkText, BulkSelect, BulkToggle, BulkButton } from "./bulk-dialog-controls.js";
import { schemaWithBulkEditActions as schemaWithBulkEditActions2 } from "./schema-bulk-edit-actions.model.js";
const at = (source, path) => path.reduce((value, key) => value?.[key], source);
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const mark = (values, name) => [.../* @__PURE__ */ new Set([...values, name])];
const declarations = (source) => schemaObjectTables(source).filter((table) => Object.values(at(source, table.path)?.properties || {}).some((value) => object(value) && (value.type === "array" || object(value.items) || object(value["x-fullmeta-edit"]))));
function bulkEditActionsDialogDraft(source, initialPath = [], generatedOwnerAtPath = null) {
  const tables = declarations(source);
  if (!tables.length) throw new Error("This schema has no collection fields.");
  const path = Array.isArray(initialPath) ? initialPath : initialPath?.path || [];
  const current = tables.filter((table) => table.path.every((part, index) => path[index] === part)).sort((left, right) => right.path.length - left.path.length)[0] || tables[0];
  const rows = tables.flatMap((table) => Object.entries(at(source, table.path).properties).filter(([, value]) => object(value) && (value.type === "array" || object(value.items) || object(value["x-fullmeta-edit"]))).map(([key, declaration]) => {
    const path2 = [...table.path, "properties", key], edit = object(declaration["x-fullmeta-edit"]) ? declaration["x-fullmeta-edit"] : {}, move = object(edit.move) ? edit.move : null;
    return {
      path: path2,
      key,
      target: JSON.stringify(table.path),
      expanded: false,
      locked: Boolean(generatedOwnerAtPath?.(source, path2) || generatedOwnerAtPath?.(source, [...path2, "x-fullmeta-edit"])),
      edit,
      dirty: [],
      moveEnabled: Boolean(move),
      group: typeof move?.group === "string" ? move.group : "",
      itemSchema: typeof move?.itemSchema === "string" ? move.itemSchema : "",
      scope: typeof move?.scope === "string" ? move.scope : "",
      effects: (Array.isArray(edit.onInsert) ? edit.onInsert : []).map((rule) => insertionEffectDraft(object(rule) ? rule : {})),
      batchText: "",
      batchPending: false,
      batchError: ""
    };
  }));
  return cleanBulkData({ target: JSON.stringify(current.path), rows });
}
function bulkEditActionsDialogCandidate(source, state, generatedOwnerAtPath = null) {
  if (state.rows.some((row) => row.batchPending)) throw new Error("Load or Clear pending batch text before Preview.");
  const edits = [];
  for (const row of state.rows) {
    if (row.locked) continue;
    const effectDirty = row.effects.some((effect) => effect.dirty.length || effect.matchesChanged || effect.matches.some((match) => match.dirty.length));
    if (!row.dirty.length && !effectDirty) continue;
    const changes = { path: row.path };
    if (["moveEnabled", "group", "itemSchema", "scope"].some((key) => row.dirty.includes(key))) {
      if (!row.moveEnabled) changes.move = null;
      else {
        const move = object(row.edit.move) ? structuredClone(row.edit.move) : {};
        for (const key of ["group", "itemSchema", "scope"]) if (row.dirty.includes(key)) setString(move, key, row[key]);
        if (!Object.keys(move).length) throw new Error(`${bulkPointer(row.path)}: set a move group, item schema, or scope.`);
        changes.move = move;
      }
    }
    if (row.dirty.includes("effects") || effectDirty) changes.onInsert = row.effects.map((effect, index) => insertionEffectFromDraft(effect, `${bulkPointer(row.path)} effect ${index + 1}`));
    edits.push(changes);
  }
  return { candidate: schemaWithBulkEditActions(source, edits, generatedOwnerAtPath), changes: edits };
}
function InsertionEffectEditor({ effect, index, disabled, onChange, onDuplicate, onRemove }) {
  const field = (name, value) => onChange({ ...effect, values: { ...effect.values, [name]: value }, dirty: mark(effect.dirty, name) });
  const matches = (next) => onChange({ ...effect, matches: next, matchesChanged: true });
  return /* @__PURE__ */ React.createElement("section", { className: "schema-bulk-edit-rule" }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("strong", null, "Insertion effect ", index + 1), /* @__PURE__ */ React.createElement(BulkButton, { disabled, onClick: onDuplicate }, "Duplicate effect"), /* @__PURE__ */ React.createElement(BulkButton, { disabled, onClick: onRemove }, "Remove effect")), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-edit-grid" }, [["operation", "Insertion operation"], ["scope", "Insertion scope"], ["targetPath", "Insertion target path"], ["valuePath", "Insertion value path"], ["requireValidReference", "Required valid reference"], ["relatedPath", "Related collection path"], ["relatedScope", "Related scope"]].map(([name, label]) => /* @__PURE__ */ React.createElement(BulkText, { key: name, label, value: effect.values[name], disabled, onChange: (value) => field(name, value) })), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Create missing target", value: effect.values.create, disabled, choices: [["", "Unspecified"], ["true", "Create target"], ["false", "Do not create"]], onChange: (value) => field("create", value) })), /* @__PURE__ */ React.createElement("h4", null, "Related item matches"), effect.matches.map((match, at2) => /* @__PURE__ */ React.createElement("div", { key: at2, className: "schema-bulk-edit-match" }, [["path", `Match ${at2 + 1} path`], ["equalsTargetParent", `Match ${at2 + 1} target parent path`]].map(([name, label]) => /* @__PURE__ */ React.createElement(BulkText, { key: name, label, value: match[name], disabled, onChange: (value) => matches(effect.matches.map((item, position) => position === at2 ? { ...item, [name]: value, dirty: mark(item.dirty, name) } : item)) })), /* @__PURE__ */ React.createElement(BulkButton, { disabled, onClick: () => matches(effect.matches.filter((_, position) => position !== at2)) }, "Remove match"))), /* @__PURE__ */ React.createElement(BulkButton, { disabled, onClick: () => matches([...effect.matches, { base: {}, dirty: [], path: "", equalsTargetParent: "" }]) }, "Add match"), /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Existing effect code"), /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(effect.base, null, 2))));
}
function BulkEditActionsEditor({ source, draft, onDraftChange }) {
  if (!source) return null;
  const state = bulkState(draft), change = (next) => updateBulkState(onDraftChange, next);
  const patch = (row, values) => change({ ...state, rows: state.rows.map((item) => item === row ? { ...row, ...values } : item) });
  const setEffects = (row, effects) => patch(row, { effects, dirty: mark(row.dirty, "effects"), batchError: "" });
  const load = (row) => {
    try {
      const additions = insertionEffectsFromTsv(row.batchText).map(insertionEffectDraft);
      patch(row, { effects: [...row.effects, ...additions], dirty: mark(row.dirty, "effects"), batchText: "", batchPending: false, batchError: "" });
    } catch (error) {
      patch(row, { batchError: error.message });
    }
  };
  const duplicate = (row, index) => {
    try {
      const effects = [...row.effects];
      effects.splice(index + 1, 0, insertionEffectDraft(insertionEffectFromDraft(effects[index], "Insertion effect", false)));
      setEffects(row, effects);
    } catch (error) {
      patch(row, { batchError: error.message });
    }
  };
  return /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("p", null, "Edit move behavior and insertion effects. Unknown settings are preserved. Edits across declarations remain staged together."), /* @__PURE__ */ React.createElement(BulkSelect, { label: "Object declaration", value: state.target, choices: declarations(source).map((table) => [JSON.stringify(table.path), `${bulkPointer(table.path)} \xB7 ${table.title}`]), onChange: (target) => change({ ...state, target }) }), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table schema-bulk-edit-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Collection field", "Move", "Move group", "Item schema", "Scope", "On insert"].map((name) => /* @__PURE__ */ React.createElement("th", { key: name }, name)))), /* @__PURE__ */ React.createElement("tbody", null, state.rows.filter((row) => row.target === state.target).map((row) => /* @__PURE__ */ React.createElement(React.Fragment, { key: bulkPointer(row.path) }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("strong", null, row.key), /* @__PURE__ */ React.createElement("code", null, bulkPointer(row.path)), row.locked ? /* @__PURE__ */ React.createElement("span", null, "Generated \xB7 read only") : null), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkToggle, { label: `${row.key} enable move`, value: row.moveEnabled, disabled: row.locked, onChange: (moveEnabled) => patch(row, { moveEnabled, dirty: mark(row.dirty, "moveEnabled") }) })), [["group", "move group"], ["itemSchema", "move item schema"], ["scope", "move scope"]].map(([name, label]) => /* @__PURE__ */ React.createElement("td", { key: name }, /* @__PURE__ */ React.createElement(BulkText, { label: `${row.key} ${label}`, value: row[name], disabled: row.locked, onChange: (value) => patch(row, { [name]: value, dirty: mark(row.dirty, name) }) }))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkButton, { "aria-expanded": row.expanded, onClick: () => patch(row, { expanded: !row.expanded }) }, "Edit ", row.effects.length, " effects"))), row.expanded ? /* @__PURE__ */ React.createElement("tr", { className: "schema-bulk-edit-detail" }, /* @__PURE__ */ React.createElement("td", { colSpan: 6 }, row.effects.map((effect, index) => /* @__PURE__ */ React.createElement(InsertionEffectEditor, { key: index, effect, index, disabled: row.locked, onChange: (next) => setEffects(row, row.effects.map((item, at2) => at2 === index ? next : item)), onDuplicate: () => duplicate(row, index), onRemove: () => setEffects(row, row.effects.filter((_, at2) => at2 !== index)) })), /* @__PURE__ */ React.createElement(BulkButton, { disabled: row.locked, onClick: () => setEffects(row, [...row.effects, insertionEffectDraft({})]) }, "Add insertion effect"), /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Paste multiple effects\u2026"), /* @__PURE__ */ React.createElement("p", null, "TSV columns: operation, scope, target path, value path, optional create target, optional reference key. Paths use dotted keys."), /* @__PURE__ */ React.createElement(BulkText, { multiline: true, label: `${row.key} tab-separated insertion effects`, value: row.batchText, disabled: row.locked, onChange: (batchText) => patch(row, { batchText, batchPending: Boolean(batchText) }) }), /* @__PURE__ */ React.createElement(BulkButton, { disabled: row.locked, onClick: () => load(row) }, "Add rows"), /* @__PURE__ */ React.createElement(BulkButton, { disabled: row.locked, onClick: () => patch(row, { batchText: "", batchPending: false, batchError: "" }) }, "Clear batch text"), row.batchError ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, row.batchError) : null), /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Existing collection action code"), /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(row.edit, null, 2))))) : null))))));
}
function createBulkEditActionsDialog({ getDocument, validateCandidate, applyCandidate, generatedOwnerAtPath = null }) {
  return createCandidateDialog({
    title: "Bulk collection actions",
    toolId: "bulkEditActions",
    className: "schema-bulk-edit-dialog",
    getDocument,
    validateCandidate,
    applyCandidate,
    initialDraft: (source, context) => bulkEditActionsDialogDraft(source, context, generatedOwnerAtPath),
    buildCandidate: (source, state) => bulkEditActionsDialogCandidate(source, state, generatedOwnerAtPath),
    Editor: BulkEditActionsEditor,
    message: "Applied collection actions. Save the schema to keep the changes."
  });
}
export {
  BulkEditActionsEditor,
  InsertionEffectEditor,
  bulkEditActionsDialogCandidate,
  bulkEditActionsDialogDraft,
  createBulkEditActionsDialog,
  schemaWithBulkEditActions2 as schemaWithBulkEditActions
};

//# sourceMappingURL=schema-bulk-edit-actions.js.map
