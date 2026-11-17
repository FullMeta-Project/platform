// Generated from schema-bulk-authoring.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { WorkspaceFileButton } from "../../workspace/file-picker.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { createSchemaAuthoringPathPicker } from "../shared/schema-authoring-path-picker.js";
import { schemaObjectTables, annotationDraft, schemaWithBulkAnnotations, simpleRule, statementFromRow, schemaWithBulkValidationRules } from "./schema-bulk-authoring-model.js";
import { schemaObjectTables as schemaObjectTables2, schemaWithBulkAnnotations as schemaWithBulkAnnotations2, schemaWithBulkValidationRules as schemaWithBulkValidationRules2 } from "./schema-bulk-authoring-model.js";
const clone = (value) => structuredClone(value), same = (a, b) => JSON.stringify(a) === JSON.stringify(b), object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const at = (source, path) => path.reduce((value, key) => value?.[key], source), pointer = (path) => "#/" + path.map((key) => String(key).replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
const extensionEntries = (value) => Object.entries(value || {}).filter(([key]) => key.startsWith("x-"));
const uiAnnotation = (key) => key.startsWith("x-fullmeta-ui") || ["x-fullmeta-modelReference", "x-fullmeta-symbolReference", "x-fullmeta-symbolReferenceContext", "x-fullmeta-edit", "x-fullmeta-editorActions"].includes(key);
function AnnotationValue({ value, name }) {
  const [open, setOpen] = React.useState(false);
  return object(value) || Array.isArray(value) ? /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-annotation-node", open, onToggle: (event) => setOpen(event.currentTarget.open) }, /* @__PURE__ */ React.createElement("summary", null, /* @__PURE__ */ React.createElement("code", { className: "schema-bulk-annotation-key" }, name), /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-annotation-count" }, Object.keys(value).length, " ", Array.isArray(value) ? "items" : "settings")), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-annotation-children" }, open ? Object.entries(value).map(([key, child]) => /* @__PURE__ */ React.createElement(AnnotationValue, { key, name: Array.isArray(value) ? `[${key}]` : key, value: child })) : null, open && !Object.keys(value).length ? /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-annotation-empty" }, "Empty") : null)) : /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-annotation-leaf" }, /* @__PURE__ */ React.createElement("code", { className: "schema-bulk-annotation-key" }, name), /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-annotation-value" }, JSON.stringify(value)));
}
function AnnotationInventory({ declaration }) {
  const entries = extensionEntries(declaration);
  return /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-annotation-inventory" }, !entries.length ? /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-annotation-empty" }, "No extension annotations on this declaration.") : null, [["UI and editor annotations", true], ["Other extension metadata", false]].map(([heading, ui]) => {
    const values = entries.filter(([key]) => uiAnnotation(key) === ui);
    return values.length ? /* @__PURE__ */ React.createElement("section", { key: String(heading), className: "schema-bulk-annotation-group" }, /* @__PURE__ */ React.createElement("h4", null, heading, " \xB7 ", values.length), values.map(([key, value]) => /* @__PURE__ */ React.createElement(AnnotationValue, { key, name: key, value }))) : null;
  }));
}
function BulkDialog({ model, commands, title, note, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-content" }, /* @__PURE__ */ React.createElement("header", { className: "schema-validation-dialog-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, title), /* @__PURE__ */ React.createElement("p", null, note)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "aria-label": "Close dialog", onClick: commands.close }, "\xD7")), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-body" }, children), /* @__PURE__ */ React.createElement("p", { className: "schema-validation-dialog-status", hidden: !model.status }, model.status), /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-preview", hidden: !model.preview }, /* @__PURE__ */ React.createElement("summary", null, "Preview changes"), model.proposalsView || null, /* @__PURE__ */ React.createElement("pre", null, model.previewText || "")), /* @__PURE__ */ React.createElement("footer", { className: "schema-validation-dialog-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.close }, "Close"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.preview }, "Preview"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: !model.preview, onClick: commands.apply }, "Apply")));
}
function BulkSelect({ value, choices, label, onChange, disabled = false }) {
  return /* @__PURE__ */ React.createElement("select", { "aria-label": label, value, disabled, onChange: (event) => onChange(event.target.value) }, choices.map(([key, text]) => /* @__PURE__ */ React.createElement("option", { key, value: key }, text)), value && !choices.some(([key]) => key === value) ? /* @__PURE__ */ React.createElement("option", { value }, value, " (existing)") : null);
}
function quantityDraft(value) {
  const bounds = value?.bounds || {};
  return { enabled: Boolean(value), unit: value?.unit || "", description: value?.description || "", lowerKind: Object.hasOwn(bounds, "exclusiveMinimum") ? "exclusiveMinimum" : Object.hasOwn(bounds, "minimum") ? "minimum" : "none", lower: String(bounds.exclusiveMinimum ?? bounds.minimum ?? ""), upperKind: Object.hasOwn(bounds, "exclusiveMaximum") ? "exclusiveMaximum" : Object.hasOwn(bounds, "maximum") ? "maximum" : "none", upper: String(bounds.exclusiveMaximum ?? bounds.maximum ?? "") };
}
function quantityValue(row) {
  const draft = row.quantity, changed = new Set(row.quantityChanged), original = row.original.quantityValidation;
  if (!draft.enabled) return null;
  const next = clone(original || {});
  for (const key of ["unit", "description"]) if (changed.has(key) || key === "unit" && !original) {
    if (draft[key].trim()) next[key] = draft[key].trim();
    else delete next[key];
  }
  if (["lower", "lowerKind", "upper", "upperKind"].some((key) => changed.has(key))) {
    const bounds = clone(next.bounds || {});
    for (
      const [kind, value, keys, label] of
      /** @type {any[]} */
      [["lowerKind", "lower", ["minimum", "exclusiveMinimum"], "Lower bound"], ["upperKind", "upper", ["maximum", "exclusiveMaximum"], "Upper bound"]]
    ) if (changed.has(kind) || changed.has(value)) {
      for (const key of keys) delete bounds[key];
      if (draft[kind] !== "none") {
        const raw = draft[value].trim();
        if (!raw || !Number.isFinite(Number(raw))) throw new Error(`${label} must be a finite number.`);
        bounds[draft[kind]] = Number(raw);
      }
    }
    if (Object.keys(bounds).length) next.bounds = bounds;
    else delete next.bounds;
  }
  return next;
}
const rowValues = (row) => ({ ...row.draft, quantityValidation: quantityValue(row) });
function QuantityValidationFields({ row, onChange }) {
  const draft = row.quantity;
  const change = (key, value) => onChange(key, value);
  return /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-quantity-validation", open: row.quantityOpen, onToggle: (event) => {
    row.quantityOpen = event.currentTarget.open;
  } }, /* @__PURE__ */ React.createElement("summary", null, "Edit quantity validation"), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-quantity-body" }, /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-annotation-readonly" }, "Set the expected unit and optional numeric bounds. Other existing validation keys remain intact."), /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field schema-bulk-quantity-toggle" }, "Use quantity validation", /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: draft.enabled, onChange: (event) => change("enabled", event.target.checked) })), /* @__PURE__ */ React.createElement("fieldset", { className: "schema-bulk-slice-grid", disabled: !draft.enabled }, [["unit", "Unit"], ["lowerKind", "Lower bound"], ["lower", "Lower value"], ["upperKind", "Upper bound"], ["upper", "Upper value"], ["description", "Validation description"]].map(([key, label]) => /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field", key }, label, key === "lowerKind" || key === "upperKind" ? /* @__PURE__ */ React.createElement(BulkSelect, { value: draft[key], label, choices: key === "lowerKind" ? [["none", "No lower bound"], ["minimum", "Inclusive minimum"], ["exclusiveMinimum", "Exclusive minimum"]] : [["none", "No upper bound"], ["maximum", "Inclusive maximum"], ["exclusiveMaximum", "Exclusive maximum"]], onChange: (value) => change(key, value) }) : /* @__PURE__ */ React.createElement("input", { type: "text", inputMode: key === "lower" || key === "upper" ? "decimal" : void 0, "aria-label": label, value: draft[key], onChange: (event) => change(key, event.target.value) }))))));
}
function AnnotationRow({ row, commands }) {
  const quantityAvailable = Boolean(row.original.quantityValidation) || ["quantity", "quantityVector"].includes(row.draft.widget) || /\/quantity(?:Vector)?$/.test(String(row.declaration.$ref || ""));
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { "data-key": row.key }, /* @__PURE__ */ React.createElement("td", { className: "schema-bulk-field-cell" }, /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-key", title: row.generated ? "Generated field: edit its supported annotations in this table." : void 0 }, row.key), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button schema-bulk-inspect-button", "aria-label": `Inspect existing annotations for ${row.key}`, "aria-expanded": row.open, onClick: () => commands.inspect(row) }, `Inspect ${extensionEntries(row.declaration).length} annotations`), row.generated ? /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-readonly-badge" }, "Generated \xB7 editable here") : null, row.original.complexFilter ? /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-readonly-badge" }, "Compound filter \xB7 inspect") : null, quantityAvailable ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button schema-bulk-inspect-button", onClick: () => commands.quantityOpen(row) }, "Edit quantity validation") : null), [["widget", ""], ["hidden", ""], ["choiceSource", "Sibling key"], ["unitGroup", "e.g. frequency"], ["defaultJson", "JSON value"], ["referenceScope", ""], ["referencePath", "selections"], ["referenceLabel", "boundary selection"], ["filterProperty", "entity"], ["filterValue", "boundary"]].map(([key, placeholder]) => /* @__PURE__ */ React.createElement("td", { key, hidden: key === "widget" || key === "unitGroup" }, key === "hidden" ? /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: row.draft.hidden, onChange: (event) => commands.fact(row, key, event.target.checked) }) : key === "referenceScope" ? /* @__PURE__ */ React.createElement(BulkSelect, { choices: [["", "Component"], ["model", "Document"], ["root", "Root"]], value: row.draft[key], label: `Reference scope for ${row.key}`, onChange: (value) => commands.fact(row, key, value) }) : /* @__PURE__ */ React.createElement("input", { type: "text", value: row.draft[key], placeholder, "aria-label": key === "referencePath" ? `Reference target path for ${row.key} (dotted keys)` : void 0, disabled: row.original.complexFilter && ["filterProperty", "filterValue"].includes(key), onChange: (event) => commands.fact(row, key, event.target.value) }), key === "referencePath" ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.pick(row) }, "Choose path\u2026") : null))), /* @__PURE__ */ React.createElement("tr", { className: "schema-bulk-annotation-detail-row", hidden: !row.open }, /* @__PURE__ */ React.createElement("td", { className: "schema-bulk-annotation-detail-cell", colSpan: 11 }, /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-annotation-readonly" }, "Existing annotations on ", row.key, " are read only below. The field description and structured editors can be changed; other settings are preserved."), /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field schema-bulk-description-field" }, "Field description", /* @__PURE__ */ React.createElement("input", { type: "text", "aria-label": `Field description for ${row.key}`, value: row.draft.description, onChange: (event) => commands.fact(row, "description", event.target.value) })), row.open ? /* @__PURE__ */ React.createElement(AnnotationInventory, { declaration: row.declaration }) : null, quantityAvailable ? /* @__PURE__ */ React.createElement(QuantityValidationFields, { row, onChange: (key, value) => commands.quantity(row, key, value) }) : null)));
}
function BulkAnnotationEditor({ model, commands }) {
  const count = model.worksheet.split(/\r?\n/).filter((line) => line.trim() && !/^field\tfact\t/i.test(line)).length;
  return /* @__PURE__ */ React.createElement(BulkDialog, { model, commands, title: "Other UI annotations", note: "Edit visibility, choices, defaults, descriptions and reference bindings. Widget assignments and widget-specific parameters belong in Widget settings; existing widget settings are preserved here." }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-toolbar" }, /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, "Object declaration", /* @__PURE__ */ React.createElement(BulkSelect, { label: "Object declaration", value: model.target, choices: model.tables.map((table) => [JSON.stringify(table.path), `${pointer(table.path)} \xB7 ${table.title} \xB7 ${table.count} fields`]), onChange: commands.target })), commands.widgets ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.widgets }, "Open Widget settings\u2026") : null), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, model.rows.length, " fields at ", pointer(model.targetPath), " \xB7 ", model.rows.filter((row) => row.generated).length, " generated fields can be edited through this table. Inspect each field for its full existing annotation structure; those details are read only and preserved on apply."), /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-annotation-worksheet" }, /* @__PURE__ */ React.createElement("summary", null, "Import field annotation facts"), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, "Three tab-separated columns: field key, fact, value. Facts: hidden, choiceSource, defaultJson, referenceScope, referencePath, referenceLabel, filterProperty, filterValue, description. Reference paths use dotted property keys; choose their source separately. Widget and unitGroup rows belong in Widget settings. Load overlays the staged table; Replace resets this target's staged changes before loading the batch."), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note", role: "status" }, "Target: ", pointer(model.targetPath), " \xB7 ", count, " batch rows \xB7 ", model.worksheet.trim() && model.worksheet !== model.loadedText ? "text not loaded" : "table staged"), /* @__PURE__ */ React.createElement("textarea", { rows: 4, "aria-label": "Field annotation tab-separated rows", value: model.worksheet, placeholder: "frequency	hidden	false\nfrequency	description	Frequency in Hz", onChange: (event) => commands.worksheet(event.target.value) }), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-annotation-worksheet-actions" }, /* @__PURE__ */ React.createElement(WorkspaceFileButton, { label: "Import field annotation TSV file", extensions: [".tsv", ".txt"], onFile: (file) => commands.file(file) }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.import(false) }, "Load annotation rows"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.import(true) }, "Replace staged annotation rows"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.clear }, "Clear annotation batch"))), /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-context-inspection" }, /* @__PURE__ */ React.createElement("summary", null, "Inspect ", extensionEntries(at(model.source, model.targetPath)).length, " declaration annotations \xB7 read only"), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-context-content" }, /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-annotation-readonly" }, "These are the existing extension annotations on the selected object. Expand any key to read its full structure."), /* @__PURE__ */ React.createElement(AnnotationInventory, { declaration: at(model.source, model.targetPath) }))), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Field", "Widget", "Hidden", "Choice source sibling", "Quantity unit group", "Default JSON", "Reference source scope", "Reference target path \xB7 dotted keys", "Reference label", "Filter property", "Filter value"].map((heading) => /* @__PURE__ */ React.createElement("th", { key: heading, hidden: heading === "Widget" || heading === "Quantity unit group" }, heading)))), /* @__PURE__ */ React.createElement("tbody", null, model.rows.map((row) => /* @__PURE__ */ React.createElement(AnnotationRow, { key: row.key, row, commands }))))));
}
function createBulkAnnotationDialog({ getDocument, validateCandidate, applyCandidate, generatedOwnerAtPath, onOpenWidgetSettings } = {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "schema-bulk-dialog";
  dialog.dataset.toolId = "bulkAnnotations";
  document.body.append(dialog);
  let model = null, mount = null, epoch = 0;
  const picker = createSchemaAuthoringPathPicker({ getDocument: () => model?.source });
  const render = () => {
    if (model) mount.update({ model, commands });
  }, invalidate = () => {
    model.preview = null;
    model.previewText = "";
    model.status = "";
  }, pendingText = () => Boolean(model.worksheet.trim()) && model.worksheet !== model.loadedText;
  const load = () => {
    model.targetPath = JSON.parse(model.target);
    model.rows = Object.entries(at(model.source, model.targetPath)?.properties || {}).map(([key, declaration]) => {
      const original = annotationDraft(declaration);
      return { key, declaration: clone(declaration), original, draft: clone(original), quantity: quantityDraft(original.quantityValidation), quantityChanged: [], generated: Boolean(generatedOwnerAtPath?.(model.source, [...model.targetPath, "properties", key])), open: false, quantityOpen: false };
    });
    invalidate();
  };
  const dirty = () => {
    try {
      return model.rows.some((row) => !same(rowValues(row), row.original));
    } catch {
      return true;
    }
  };
  const commands = {
    close: () => dialog.close(),
    target(value) {
      if ((pendingText() || dirty()) && !globalThis.confirm("Discard the current annotation batch and staged table changes before changing declarations?")) {
        render();
        return;
      }
      model.target = value;
      model.worksheet = "";
      model.loadedText = "";
      load();
      render();
    },
    worksheet(value) {
      model.worksheet = value;
      invalidate();
      render();
    },
    clear() {
      model.worksheet = "";
      model.loadedText = "";
      load();
      model.status = "Cleared the batch and restored the selected declaration.";
      render();
    },
    fact(row, key, value) {
      row.draft[key] = value;
      invalidate();
      render();
    },
    quantity(row, key, value) {
      row.quantity[key] = value;
      if (!row.quantityChanged.includes(key)) row.quantityChanged.push(key);
      invalidate();
      render();
    },
    inspect(row) {
      row.open = !row.open;
      render();
    },
    quantityOpen(row) {
      row.open = true;
      row.quantityOpen = true;
      render();
    },
    pick(row) {
      picker.open({ representation: "referencePath", onPick: (selected) => {
        row.draft.referencePath = selected.referencePath;
        row.draft.referenceScope = "root";
        invalidate();
        render();
      } });
    },
    widgets: onOpenWidgetSettings ? () => {
      if ((model.worksheet.trim() || dirty()) && !globalThis.confirm("Discard the annotation batch and staged annotation changes before opening Widget settings?")) return;
      dialog.close();
      onOpenWidgetSettings(model.targetPath);
    } : null,
    import(replace = false) {
      invalidate();
      try {
        const lines = model.worksheet.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").map((line, index) => ({ line, number: index + 1 })).filter((entry) => entry.line.trim());
        if (!lines.length) throw new Error("Enter at least one field annotation row.");
        if (lines.length > 1e3) throw new Error("Import at most 1,000 field annotation rows at once.");
        const seen = /* @__PURE__ */ new Set(), edits = [];
        lines.forEach(({ line, number }, index) => {
          const cells = line.split("	");
          if (index === 0 && cells[0]?.trim().toLowerCase() === "field" && cells[1]?.trim().toLowerCase() === "fact") return;
          if (cells.length !== 3) throw new Error(`Line ${number}: use field, fact, value columns.`);
          const [rawKey, rawFact, value] = cells, key = rawKey.trim(), fact = rawFact.trim(), row = model.rows.find((row2) => row2.key === key);
          if (!row) throw new Error(`Line ${number}: ${key || "(blank field key)"} is not a field in the selected object.`);
          const identity = key + "\0" + fact;
          if (seen.has(identity)) throw new Error(`Line ${number}: ${key}.${fact} appears more than once.`);
          seen.add(identity);
          if (["widget", "unitGroup"].includes(fact)) throw new Error(`Line ${number}: ${fact} belongs in Widget settings. Open that tool to edit widget assignments or parameters.`);
          if (!["hidden", "choiceSource", "defaultJson", "referenceScope", "referencePath", "referenceLabel", "filterProperty", "filterValue", "description"].includes(fact)) throw new Error(`Line ${number}: unsupported field annotation ${fact || "(blank fact)"}.`);
          if (fact === "hidden" && !["true", "false"].includes(value)) throw new Error(`Line ${number}: hidden must be true or false.`);
          if (fact === "referenceScope" && !["", "model", "root"].includes(value)) throw new Error(`Line ${number}: referenceScope must be blank (component), model (document), or root.`);
          if (fact === "defaultJson" && value.trim()) try {
            JSON.parse(value);
          } catch {
            throw new Error(`Line ${number}: defaultJson must contain valid JSON.`);
          }
          edits.push({ key, fact, value: fact === "hidden" ? value === "true" : value });
        });
        if (!edits.length) throw new Error("The worksheet has no annotation facts.");
        const staged = new Map(model.rows.map((row) => [row.key, clone(replace ? row.original : rowValues(row))]));
        for (const edit of edits) staged.get(edit.key)[edit.fact] = edit.value;
        schemaWithBulkAnnotations(model.source, model.targetPath, [...staged].map(([key, values]) => ({ key, values })));
        if (replace) load();
        for (const edit of edits) model.rows.find((row) => row.key === edit.key).draft[edit.fact] = edit.value;
        model.loadedText = model.worksheet;
        model.status = `Loaded ${edits.length} field annotation fact${edits.length === 1 ? "" : "s"}. Preview to validate the batch.`;
      } catch (error) {
        invalidate();
        model.status = error.message;
      }
      render();
    },
    async file(file) {
      if (!file) return;
      const target = model.target, version = epoch;
      invalidate();
      render();
      try {
        const text = (await file.text()).replace(/^\uFEFF/, "");
        if (version !== epoch || target !== model.target) throw new Error("The annotation target changed while reading the file. Import it again.");
        model.worksheet = text;
        commands.import();
      } catch (error) {
        if (model && version === epoch) {
          model.status = `Could not import ${file.name}: ${error.message}`;
          render();
        }
      }
    },
    preview() {
      try {
        if (pendingText()) throw new Error("Load, Replace or Clear the edited annotation batch before Preview.");
        const edits = model.rows.map((row) => ({ key: row.key, values: rowValues(row), original: row.original })).filter((edit) => !same(edit.values, edit.original));
        if (!edits.length) throw new Error("Change at least one annotation cell before previewing.");
        const candidate = schemaWithBulkAnnotations(model.source, model.targetPath, edits), allowGeneratedSubtrees = edits.map((edit) => [...model.targetPath, "properties", edit.key]);
        validateCandidate(candidate, { allowGeneratedSubtrees });
        model.preview = { candidate, base: JSON.stringify(model.source), allowGeneratedSubtrees };
        model.previewText = edits.map((edit) => `${edit.key}: ${Object.entries(edit.values).filter(([key, value]) => !same(value, edit.original[key])).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join(", ")}`).join("\n");
        model.status = `${edits.length} field${edits.length === 1 ? "" : "s"} ready to apply.`;
      } catch (error) {
        invalidate();
        model.status = error.message;
      }
      render();
    },
    apply() {
      if (!model.preview) return;
      try {
        if (JSON.stringify(getDocument()) !== model.preview.base) throw new Error("The schema changed since preview. Reopen the table.");
        applyCandidate(model.preview.candidate, "Applied bulk UI annotations. Save the schema to keep the changes.", { allowGeneratedSubtrees: model.preview.allowGeneratedSubtrees });
        dialog.close();
      } catch (error) {
        model.status = error.message;
        render();
      }
    }
  };
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return { open(initialPath = []) {
    const source = clone(getDocument()), tables = schemaObjectTables(source);
    if (!tables.length) throw new Error("This schema has no object declaration with fields.");
    const current = tables.find((table) => same(table.path, initialPath)) || tables.filter((table) => table.path.length && initialPath.length >= table.path.length && table.path.every((part, index) => part === initialPath[index])).sort((a, b) => b.path.length - a.path.length)[0] || tables.find((table) => table.path.join("/") === "properties/model") || tables[0];
    epoch++;
    model = { source, tables, target: JSON.stringify(current.path), targetPath: [], rows: [], worksheet: "", loadedText: "", status: "", preview: null, previewText: "" };
    load();
    if (mount) render();
    else mount = mountReactComponent(dialog, BulkAnnotationEditor, { model, commands });
    dialog.showModal();
  }, snapshot: () => model ? { format: "fullmeta-bulk-annotation-state/1", model: clone(model) } : null, restore(state) {
    if (state?.format !== "fullmeta-bulk-annotation-state/1" || !state.model || !same(state.model.source, getDocument())) throw new Error("Unsupported annotation table state.");
    epoch++;
    const hadPreview = Boolean(state.model.preview);
    model = clone(state.model);
    model.preview = null;
    model.previewText = "";
    if (mount) render();
    else mount = mountReactComponent(dialog, BulkAnnotationEditor, { model, commands });
    if (hadPreview) commands.preview();
  }, preview() {
    if (!dialog.open) throw new Error("Open the annotation table before Preview.");
    commands.preview();
    if (!model.preview) throw new Error(model.status || "Preview failed.");
    return { ready: true };
  }, apply() {
    if (!dialog.open || !model.preview) throw new Error("Preview the current annotation table before Apply.");
    commands.apply();
    if (dialog.open) throw new Error(model.status || "The table could not be applied.");
    return { applied: true };
  }, close: commands.close, dialog, dispose() {
    epoch++;
    picker.dispose();
    mount?.dispose();
    dialog.remove();
    model = null;
  } };
}
function BulkValidationEditor({ model, commands }) {
  return /* @__PURE__ */ React.createElement(BulkDialog, { model, commands, title: "Bulk validation rules", note: "Enter multiple assertion expressions and messages. A collection path wraps an assertion in one For each rule. Complex rule trees remain in the structured validation editor." }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-toolbar" }, /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, "Validation program", /* @__PURE__ */ React.createElement(BulkSelect, { label: "Validation program", choices: model.programs.map((key) => [key, key]), value: model.program, onChange: commands.program }))), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, model.rows.length, " simple rules shown \xB7 ", model.complexCount, " complex rules preserved in the structured editor. Leave Collection path empty for a root assertion. Expressions use the validation language's JSON form."), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table schema-bulk-rules-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Scope source", "Collection path", "Item variable", "Assertion expression JSON", "Message", "When expression JSON", ""].map((text, index) => /* @__PURE__ */ React.createElement("th", { key: index }, text)))), /* @__PURE__ */ React.createElement("tbody", null, model.rows.map((row, index) => /* @__PURE__ */ React.createElement("tr", { key: row.id }, ["source", "path", "alias", "assertion", "message", "when"].map((key) => /* @__PURE__ */ React.createElement("td", { key }, key === "source" ? /* @__PURE__ */ React.createElement(BulkSelect, { value: row[key], choices: [["", "Root assertion"], ["root", "Root document"], ["model", "Model"]], label: `Scope source ${index + 1}`, onChange: (value) => commands.patch(row, key, value) }) : key === "assertion" || key === "when" ? /* @__PURE__ */ React.createElement("textarea", { rows: key === "assertion" ? 3 : 2, value: row[key], "aria-label": `${key} ${index + 1}`, onChange: (event) => commands.patch(row, key, event.target.value) }) : /* @__PURE__ */ React.createElement("input", { type: "text", value: row[key], "aria-label": `${key} ${index + 1}`, placeholder: key === "path" ? "model/physics/*" : void 0, onChange: (event) => commands.patch(row, key, event.target.value) }))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.remove(row) }, "Remove"))))))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.add }, "Add assertion row"));
}
function createBulkValidationDialog({ getDocument, validateCandidate, applyCandidate } = {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "schema-bulk-dialog";
  dialog.dataset.toolId = "bulkValidation";
  document.body.append(dialog);
  let model = null, mount = null, nextId = 0;
  const render = () => mount?.update({ model, commands }), invalidate = () => {
    model.preview = null;
    model.previewText = "";
    model.status = "";
  };
  const row = (initial) => ({ id: ++nextId, index: initial.index, source: initial.source, path: initial.path, alias: initial.alias, assertion: initial.rule?.assert === void 0 ? "" : JSON.stringify(initial.rule.assert), message: typeof initial.rule?.message === "string" ? initial.rule.message : "", when: initial.rule?.when === void 0 ? "" : JSON.stringify(initial.rule.when) });
  function load() {
    model.rows = [];
    model.complexCount = 0;
    (model.source[model.program]?.rules || []).forEach((statement, index) => {
      const simple = simpleRule(statement, index);
      if (simple) {
        const current = row(simple);
        current.baseline = clone(current);
        model.rows.push(current);
      } else model.complexCount++;
    });
    invalidate();
  }
  const commands = { close: () => dialog.close(), program(value) {
    model.program = value;
    load();
    render();
  }, patch(row2, key, value) {
    row2[key] = value;
    invalidate();
    render();
  }, add() {
    model.rows.push(row({ index: null, source: "", path: "", alias: "", rule: {} }));
    invalidate();
    render();
  }, remove(row2) {
    model.rows = model.rows.filter((item) => item !== row2);
    invalidate();
    render();
  }, preview() {
    try {
      const values = (row2) => Object.fromEntries(["index", "source", "path", "alias", "assertion", "message", "when"].map((key) => [key, row2[key]]));
      const edits = model.rows.filter((row2) => row2.index === null || !same(values(row2), values(row2.baseline))).map(values);
      for (const [index, statement] of (model.source[model.program]?.rules || []).entries()) if (simpleRule(statement, index) && !model.rows.some((row2) => row2.index === index)) edits.push({ index, remove: true });
      if (!edits.length) throw new Error("Add or change at least one assertion row before previewing.");
      const candidate = schemaWithBulkValidationRules(model.source, model.program, edits);
      validateCandidate(candidate);
      model.preview = { candidate, base: JSON.stringify(model.source) };
      model.previewText = edits.map((edit) => edit.remove ? `Remove simple rule ${edit.index + 1}` : JSON.stringify(statementFromRow(edit), null, 2)).join("\n\n");
      model.status = `${edits.length} rule change${edits.length === 1 ? "" : "s"} ready to apply.`;
    } catch (error) {
      invalidate();
      model.status = error.message;
    }
    render();
  }, apply() {
    if (!model.preview) return;
    try {
      if (JSON.stringify(getDocument()) !== model.preview.base) throw new Error("The schema changed since preview. Reopen the table.");
      applyCandidate(model.preview.candidate, "Applied bulk validation rules. Save the schema to keep the changes.");
      dialog.close();
    } catch (error) {
      model.status = error.message;
      render();
    }
  } };
  return { open() {
    const source = clone(getDocument()), programs = Object.keys(source).filter((key) => key === "x-fullmeta-rules" || /^x-fullmeta-.*Validation$/.test(key));
    if (!programs.includes("x-fullmeta-rules")) programs.unshift("x-fullmeta-rules");
    model = { source, programs, program: "x-fullmeta-rules", rows: [], complexCount: 0, preview: null, status: "", previewText: "" };
    load();
    if (mount) render();
    else mount = mountReactComponent(dialog, BulkValidationEditor, { model, commands });
    dialog.showModal();
  }, snapshot: () => model ? { format: "fullmeta-bulk-validation-state/1", model: clone(model) } : null, restore(state) {
    if (state?.format !== "fullmeta-bulk-validation-state/1" || !state.model || !same(state.model.source, getDocument())) throw new Error("Unsupported validation table state.");
    const hadPreview = Boolean(state.model.preview);
    model = clone(state.model);
    model.preview = null;
    model.previewText = "";
    nextId = Math.max(nextId, ...model.rows.map((row2) => row2.id || 0));
    if (mount) render();
    else mount = mountReactComponent(dialog, BulkValidationEditor, { model, commands });
    if (hadPreview) commands.preview();
  }, preview() {
    if (!dialog.open) throw new Error("Open the validation table before Preview.");
    commands.preview();
    if (!model.preview) throw new Error(model.status || "Preview failed.");
    return { ready: true };
  }, apply() {
    if (!dialog.open || !model.preview) throw new Error("Preview the current validation table before Apply.");
    commands.apply();
    if (dialog.open) throw new Error(model.status || "The table could not be applied.");
    return { applied: true };
  }, close: commands.close, dialog, dispose() {
    mount?.dispose();
    dialog.remove();
    model = null;
  } };
}
export {
  AnnotationInventory,
  AnnotationValue,
  BulkAnnotationEditor,
  BulkDialog,
  BulkSelect,
  BulkValidationEditor,
  QuantityValidationFields,
  createBulkAnnotationDialog,
  createBulkValidationDialog,
  schemaObjectTables2 as schemaObjectTables,
  schemaWithBulkAnnotations2 as schemaWithBulkAnnotations,
  schemaWithBulkValidationRules2 as schemaWithBulkValidationRules
};

//# sourceMappingURL=schema-bulk-authoring.js.map
