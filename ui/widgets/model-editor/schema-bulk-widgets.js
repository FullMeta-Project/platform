// Generated from schema-bulk-widgets.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { WorkspaceFileButton } from "../../workspace/file-picker.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { BulkDialog, BulkSelect } from "./schema-bulk-authoring.js";
import { schemaObjectTables } from "./schema-bulk-authoring.js";
import { mountSchemaAnnotationAuthoring } from "./schema-annotation-authoring.js";
import { schemaWidgetDesignContext } from "./schema-widget-context.js";
import { mountStructuredValueEditor } from "../shared/structured-value-editor.js";
import { fieldUiBehavior, writeFieldUiBehavior, FIELD_UI_BEHAVIOR_KEY } from "../../annotation-language.js";
import { validateUiContractValue } from "../../schemas/contract-validation.js";
import { schemaDeclarationPaths, widgetType, widgetSettings, widgetOptions, isExcludedWidgetGuessPath, guessedFieldWidget, fieldWithWidgetType, schemaWithBulkWidgetEdits, settingPointerParts, fieldWithWidgetSettingEdit } from "./schema-bulk-widget-model.js";
import { fieldWithWidgetType as fieldWithWidgetType2, schemaWithBulkWidgetEdits as schemaWithBulkWidgetEdits2, fieldWithWidgetSettingEdit as fieldWithWidgetSettingEdit2 } from "./schema-bulk-widget-model.js";
const clone = (value) => structuredClone(value), same = (a, b) => JSON.stringify(a) === JSON.stringify(b), object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const at = (source, path) => path.reduce((value, key) => value?.[key], source), pointer = (path) => "#/" + path.map((key) => String(key).replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
function validateWidgetSettingContracts(edits, profiles) {
  for (const { path, declaration } of edits) {
    const widget = fieldUiBehavior(declaration)?.payload?.widget, profile = profiles?.[widget?.type], contract = profile?.authoring?.validationContractDocument, annotation = profile?.annotation, contractSchema = contract?.properties?.[annotation];
    if (!widget || !contract || !contractSchema) continue;
    const errors = validateUiContractValue(widget.settings || {}, contract, contractSchema, pointer(path));
    if (errors.length) throw new Error(errors[0]);
  }
}
function BulkWidgetSettingsEditor({ model, commands, hostRefs }) {
  const count = model.worksheet.split(/\r?\n/).filter((line) => line.trim() && !/^field\twidget\t/i.test(line)).length;
  return /* @__PURE__ */ React.createElement(BulkDialog, { model, commands, title: "Bulk widget settings", note: "Choose from the full field-widget catalog and edit widget-specific parameters. Widgets without a specialized form use structured settings. Visibility, defaults, descriptions and reference bindings belong in Other UI annotations. Preview all changed rows, then Apply." }, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-toolbar" }, /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, "Field scope", /* @__PURE__ */ React.createElement(BulkSelect, { label: "Object declaration or schema field scope", value: model.target, choices: model.targets, onChange: commands.target })), /* @__PURE__ */ React.createElement("label", { className: "schema-bulk-field" }, "Find field", /* @__PURE__ */ React.createElement("input", { type: "search", placeholder: "Filter field paths", "aria-label": "Filter widget fields", value: model.search, onChange: (event) => commands.search(event.target.value) }))), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-widget-guess" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.guess }, "Guess widgets and review additions"), /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-widget-guess-note" }, "Skips assigned widgets, schema condition checks, and root metadata. New widget settings are empty; schema default values are left untouched.")), /* @__PURE__ */ React.createElement("details", { className: "schema-bulk-widget-worksheet" }, /* @__PURE__ */ React.createElement("summary", null, "Import widget setting paths"), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, "Five tab-separated columns: field JSON pointer, widget ID or blank, set/remove, setting JSON pointer, JSON value. Paths are relative to widget settings; use # for the whole settings object. Values must be JSON, including quoted strings. Rows overlay the current draft in order."), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note", role: "status" }, "Target: ", model.targets.find(([key]) => key === model.target)?.[1] || model.target, " \xB7 ", count, " batch rows \xB7 ", model.worksheet.trim() && model.worksheet !== model.loadedText ? "text not loaded" : "table staged"), /* @__PURE__ */ React.createElement("textarea", { rows: 4, "aria-label": "Widget setting tab-separated rows", placeholder: '#/properties/model/properties/parameters/properties/frequency	quantity	set	#/unitGroup	"frequency"', value: model.worksheet, onChange: (event) => commands.worksheet(event.target.value) }), /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-widget-worksheet-actions" }, /* @__PURE__ */ React.createElement(WorkspaceFileButton, { label: "Import widget settings TSV file", extensions: [".tsv", ".txt"], onFile: (file) => commands.file(file) }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.import(false) }, "Load widget setting rows"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.import(true) }, "Replace staged widget rows"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.clear }, "Clear widget batch"))), /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, model.rows.length, " fields \xB7 ", model.rows.filter((row) => row.generated).length, " generated fields can be edited in this table. Existing widget settings load into the same controls used for editing."), model.proposals.length ? /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-widget-proposals" }, /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, "Review each suggested field and widget. Remove any addition you do not want before Apply."), /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-widget-proposal-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Field"), /* @__PURE__ */ React.createElement("th", null, "Guessed widget"), /* @__PURE__ */ React.createElement("th", null))), /* @__PURE__ */ React.createElement("tbody", null, model.proposals.map((proposal) => /* @__PURE__ */ React.createElement("tr", { key: proposal.id }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", { className: "schema-bulk-key" }, pointer(proposal.path))), /* @__PURE__ */ React.createElement("td", null, proposal.widget), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.removeProposal(proposal) }, "Remove"))))))) : null, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-bulk-table schema-bulk-widget-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Field path", "Widget", "Current settings", "Edit settings"].map((title) => /* @__PURE__ */ React.createElement("th", { key: title }, title)))), /* @__PURE__ */ React.createElement("tbody", null, model.rows.map((row) => {
    const visible = !model.search.trim() || pointer(row.path).toLowerCase().includes(model.search.trim().toLowerCase());
    return /* @__PURE__ */ React.createElement(React.Fragment, { key: row.id }, /* @__PURE__ */ React.createElement("tr", { hidden: !visible }, /* @__PURE__ */ React.createElement("td", { className: "schema-bulk-field-cell" }, /* @__PURE__ */ React.createElement("code", { className: "schema-bulk-key" }, pointer(row.path)), row.generated ? /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-readonly-badge" }, "Generated \xB7 editable here") : null, row.type && !model.profiles[row.type] ? /* @__PURE__ */ React.createElement("span", { className: "schema-bulk-readonly-badge" }, "Structured settings") : null), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(BulkSelect, { label: `Widget for ${pointer(row.path)}`, value: row.type, choices: model.options, onChange: (value) => commands.kind(row, value) })), /* @__PURE__ */ React.createElement("td", { className: "schema-bulk-widget-summary" }, row.summary), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button schema-bulk-inspect-button", "aria-label": `Edit widget settings for ${pointer(row.path)}`, "aria-expanded": row.open, hidden: !row.type, onClick: () => commands.edit(row) }, "Edit widget settings"))), /* @__PURE__ */ React.createElement("tr", { className: "schema-bulk-annotation-detail-row", hidden: !visible || !row.open, "data-open": String(row.open) }, /* @__PURE__ */ React.createElement("td", { className: "schema-bulk-annotation-detail-cell", colSpan: 4 }, row.error ? /* @__PURE__ */ React.createElement("p", { className: "schema-validation-dialog-status" }, row.error) : null, row.type && model.profiles[row.type]?.editor !== "annotation" ? /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, "This catalog widget has no specialized form. Edit its settings as structured fields; visibility, defaults and reference bindings remain in Other UI annotations.") : null, /* @__PURE__ */ React.createElement("div", { className: "schema-bulk-widget-design", ref: (node) => {
      if (node) hostRefs.set(row.id, node);
      else hostRefs.delete(row.id);
    } }))));
  })))));
}
function createBulkWidgetSettingsDialog({ getDocument, getWidgetProfiles, getCatalog, getWidgetCatalog, getDocumentFile, validateCandidate, applyCandidate, generatedOwnerAtPath } = {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "schema-bulk-dialog schema-bulk-widget-dialog";
  dialog.dataset.toolId = "bulkWidgets";
  document.body.append(dialog);
  let model = null, mount = null, epoch = 0;
  const handles = /* @__PURE__ */ new Map(), hostRefs = /* @__PURE__ */ new Map();
  const catalog = () => getCatalog?.() || {}, profiles = () => getWidgetProfiles?.() || {}, pendingText = () => Boolean(model.worksheet.trim()) && model.worksheet !== model.loadedText;
  const invalidate = () => {
    model.preview = null;
    model.previewText = "";
    model.status = "";
  }, render = () => mount?.update({ model, commands, hostRefs });
  const disposeRow = (row) => {
    handles.get(row.id)?.editor.dispose?.();
    handles.delete(row.id);
  }, disposeRows = () => {
    for (const handle of handles.values()) handle.editor.dispose?.();
    handles.clear();
  };
  function read(row) {
    const handle = handles.get(row.id);
    return handle && !same(handle.editor.snapshot(), handle.baseline) ? handle.editor.commit(handle.source) : clone(row.prepared);
  }
  function snapshotRows() {
    for (const row of model?.rows || []) {
      const handle = handles.get(row.id);
      if (handle) row.editorDraft = clone(handle.editor.snapshot());
    }
  }
  function attach(row) {
    if (!row.open && !row.editorDraft || !row.type || handles.has(row.id)) return;
    try {
      const profile = model.profiles[row.type], prepared = fieldWithWidgetType(row.prepared, row.type, catalog()), source = fieldUiBehavior(prepared) ? prepared : writeFieldUiBehavior(clone(prepared), { context: "projectEditing" }), file = getDocumentFile?.(), context = profile?.context === "schemaWidget" && file ? (
        /** @type {(options:any)=>any} */
        schemaWidgetDesignContext({ document: model.source, path: row.path, file })
      ) : {};
      let editor;
      const changed = () => {
        row.summary = "Edited settings";
        invalidate();
        render();
      };
      if (profile?.editor === "annotation") editor = mountSchemaAnnotationAuthoring({ container: hostRefs.get(row.id), declaration: source, widget: row.type, configuration: profile, context, fieldContext: "projectEditing", onDraftChange: changed });
      else {
        const generic = mountStructuredValueEditor({ container: hostRefs.get(row.id), value: widgetSettings(source, catalog()), label: `${row.type} settings`, onChange: changed });
        editor = { snapshot: () => generic.draft(), commit: (declaration) => fieldWithWidgetSettingEdit(declaration, row.type, "set", [], generic.commit(), catalog(), model.profiles), restore: (draft) => generic.restore(draft), dispose: () => generic.dispose() };
      }
      const baseline = clone(editor.snapshot());
      if (row.editorDraft) {
        if (profile?.editor === "annotation") {
          editor.dispose();
          editor = mountSchemaAnnotationAuthoring({ container: hostRefs.get(row.id), declaration: source, widget: row.type, configuration: profile, context, fieldContext: "projectEditing", state: row.editorDraft, onDraftChange: changed });
        } else /** @type {any} */
        editor.restore(row.editorDraft);
      }
      handles.set(row.id, { editor, baseline, source });
      row.error = "";
    } catch (error) {
      row.error = error.message;
      render();
    }
  }
  function install(row, declaration, origin = "imported") {
    disposeRow(row);
    row.prepared = clone(declaration);
    row.type = widgetType(declaration, catalog());
    row.open = false;
    row.editorDraft = null;
    row.error = "";
    const settings = widgetSettings(declaration, catalog());
    row.summary = row.type ? `${Object.keys(settings).length} setting${Object.keys(settings).length === 1 ? "" : "s"} \xB7 ${origin}` : "Default";
  }
  function load() {
    disposeRows();
    const source = model.source, selected = model.target, c = catalog();
    const paths = ["@all", "@allfields", "@undecided"].includes(selected) ? schemaDeclarationPaths(source).filter((path) => {
      const assigned = Boolean(widgetType(at(source, path), c));
      return selected === "@allfields" || (selected === "@undecided" ? !assigned : assigned);
    }) : [...JSON.parse(selected).length ? [JSON.parse(selected)] : [], ...Object.keys(at(source, JSON.parse(selected))?.properties || {}).map((key) => [...JSON.parse(selected), "properties", key])];
    const seen = /* @__PURE__ */ new Set();
    model.rows = [];
    model.proposals = [];
    for (const path of paths) {
      const id = JSON.stringify(path);
      if (seen.has(id)) continue;
      seen.add(id);
      const original = clone(at(source, path)), type = widgetType(original, c), settings = widgetSettings(original, c);
      model.rows.push({ id, path, original, prepared: clone(original), type, summary: type ? `${Object.keys(settings).length} setting${Object.keys(settings).length === 1 ? "" : "s"}` : "Default", generated: Boolean(generatedOwnerAtPath?.(source, path) || generatedOwnerAtPath?.(source, [...path, FIELD_UI_BEHAVIOR_KEY])), open: false, editorDraft: null, error: "" });
    }
    invalidate();
  }
  const dirty = () => {
    try {
      return model.rows.some((row) => !same(read(row), row.original));
    } catch {
      return true;
    }
  };
  const commands = {
    close: () => dialog.close(),
    search(value) {
      model.search = value;
      render();
    },
    worksheet(value) {
      model.worksheet = value;
      invalidate();
      render();
    },
    target(value) {
      if ((pendingText() || dirty()) && !globalThis.confirm("Discard the current widget batch and staged table changes before changing field scope?")) {
        render();
        return;
      }
      model.target = value;
      model.worksheet = "";
      model.loadedText = "";
      load();
      render();
    },
    clear() {
      model.worksheet = "";
      model.loadedText = "";
      load();
      model.status = "Cleared the widget batch and restored this scope.";
      render();
    },
    kind(row, value) {
      install(row, fieldWithWidgetType(row.original, value, catalog()), value === widgetType(row.original, catalog()) ? "restored" : "new widget");
      invalidate();
      render();
    },
    edit(row) {
      row.open = !row.open;
      render();
      attach(row);
    },
    import(replace = false) {
      invalidate();
      try {
        const lines = model.worksheet.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").map((line, index) => ({ line, number: index + 1 })).filter((entry) => entry.line.trim());
        if (!lines.length) throw new Error("Enter at least one widget setting row.");
        if (lines.length > 1e3) throw new Error("Import at most 1,000 widget setting rows at once.");
        const allowed = new Set(model.options.map(([id]) => id).filter(Boolean)), edits = [];
        lines.forEach(({ line, number }, index) => {
          const cells = line.split("	");
          if (index === 0 && cells[0]?.trim().toLowerCase() === "field" && cells[1]?.trim().toLowerCase() === "widget") return;
          if (cells.length !== 5) throw new Error(`Line ${number}: use field pointer, widget, operation, setting pointer, JSON value columns.`);
          const [fieldPath, rawWidget, rawOperation, settingPath, rawValue] = cells, widget = rawWidget.trim(), operation = rawOperation.trim(), row = model.rows.find((row2) => pointer(row2.path) === fieldPath.trim());
          if (!row) throw new Error(`Line ${number}: ${fieldPath || "(blank field pointer)"} is not in the selected table.`);
          if (widget && !allowed.has(widget)) throw new Error(`Line ${number}: ${widget} is not in the field-widget catalog.`);
          if (!["set", "remove"].includes(operation)) throw new Error(`Line ${number}: operation must be set or remove.`);
          const path = settingPointerParts(settingPath.trim());
          if (operation === "remove" && rawValue.trim()) throw new Error(`Line ${number}: remove rows must leave the JSON value blank.`);
          let value;
          if (operation === "set") {
            try {
              value = JSON.parse(rawValue);
            } catch {
              throw new Error(`Line ${number}: value must be valid JSON (quote strings).`);
            }
            if (!path.length && !object(value)) throw new Error(`Line ${number}: replacing all widget settings requires a JSON object.`);
          }
          edits.push({ row, widget, operation, path, value });
        });
        if (!edits.length) throw new Error("The worksheet has no setting rows.");
        const staged = /* @__PURE__ */ new Map();
        for (const edit of edits) {
          const current = staged.has(edit.row.id) ? staged.get(edit.row.id) : replace ? edit.row.original : read(edit.row);
          staged.set(edit.row.id, fieldWithWidgetSettingEdit(current, edit.widget, edit.operation, edit.path, edit.value, catalog(), model.profiles));
        }
        if (replace) for (const row of model.rows) install(row, row.original, "restored");
        for (const [id, declaration] of staged) install(model.rows.find((row) => row.id === id), declaration);
        model.loadedText = model.worksheet;
        model.status = `Loaded ${edits.length} widget setting row${edits.length === 1 ? "" : "s"}. Preview to validate the batch.`;
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
        if (version !== epoch || target !== model.target) throw new Error("The widget target changed while reading this file. Import it again.");
        model.worksheet = text;
        commands.import();
      } catch (error) {
        if (model && version === epoch) {
          model.status = `Could not import ${file.name}: ${error.message}`;
          render();
        }
      }
    },
    guess() {
      try {
        const allowed = new Set(model.options.map(([id]) => id).filter(Boolean)), counts = /* @__PURE__ */ new Map();
        let assigned = 0, excluded = 0, undecided = 0;
        for (const row of model.rows) {
          const current = read(row);
          if (widgetType(row.original, catalog()) || widgetType(current, catalog())) {
            assigned++;
            continue;
          }
          if (isExcludedWidgetGuessPath(row.path)) {
            excluded++;
            continue;
          }
          const widget = guessedFieldWidget(model.source, row.original, catalog());
          if (!widget || !allowed.has(widget)) {
            undecided++;
            continue;
          }
          install(row, fieldWithWidgetType(current, widget, catalog()), "guessed");
          model.proposals.push({ id: row.id, path: row.path, widget, before: current });
          counts.set(widget, (counts.get(widget) || 0) + 1);
        }
        invalidate();
        const added = [...counts.values()].reduce((a, b) => a + b, 0), summary = [...counts].map(([widget, count]) => `${count} ${widget}`).join(", ");
        if (added || model.proposals.length) {
          commands.preview();
          if (model.preview) model.status = added ? `Proposed ${added} guessed widget${added === 1 ? "" : "s"} (${summary}); skipped ${assigned} assigned, ${excluded} schema scaffolding/metadata, and ${undecided} ambiguous or unsupported declarations. Review the list above, remove any unwanted rows, then click Apply to confirm.` : "No new widgets guessed. Review the existing proposal list, remove any unwanted rows, then click Apply to confirm.";
        } else model.status = `No widgets guessed. Skipped ${assigned} fields that already have a widget, ${excluded} schema scaffolding/metadata declarations, and ${undecided} ambiguous or unsupported declarations; all remain unchanged.`;
      } catch (error) {
        invalidate();
        model.status = error.message;
      }
      render();
    },
    removeProposal(proposal) {
      const row = model.rows.find((row2) => row2.id === proposal.id);
      install(row, proposal.before, "restored");
      model.proposals = model.proposals.filter((item) => item.id !== proposal.id);
      commands.preview();
      model.status = model.preview ? `Removed the suggestion for ${pointer(proposal.path)}. Review the updated list, then click Apply to confirm the remaining changes.` : "Removed the suggestion; no widget changes remain to apply.";
      render();
    },
    preview() {
      try {
        if (pendingText()) throw new Error("Load, Replace or Clear the edited widget batch before Preview.");
        const edits = model.rows.map((row) => ({ path: row.path, declaration: read(row), original: row.original })).filter((edit) => !same(edit.declaration, edit.original));
        if (!edits.length) throw new Error("Change at least one widget setting before previewing.");
        const candidate = schemaWithBulkWidgetEdits(model.source, edits), allowGeneratedSubtrees = edits.map((edit) => edit.path);
        validateWidgetSettingContracts(edits, model.profiles);
        validateCandidate(candidate, { allowGeneratedSubtrees });
        model.preview = { candidate, base: JSON.stringify(model.source), count: edits.length, allowGeneratedSubtrees };
        model.previewText = edits.map(({ path, declaration }) => `${pointer(path)}
${fieldUiBehavior(declaration)?.payload?.widget ? JSON.stringify(fieldUiBehavior(declaration).payload.widget, null, 2) : "(default field editor)"}`).join("\n\n");
        model.status = `${edits.length} widget annotation${edits.length === 1 ? "" : "s"} ready to apply.`;
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
        applyCandidate(model.preview.candidate, `Applied ${model.preview.count} widget annotation${model.preview.count === 1 ? "" : "s"}. Save the schema to keep the changes.`, { allowGeneratedSubtrees: model.preview.allowGeneratedSubtrees });
        dialog.close();
      } catch (error) {
        model.status = error.message;
        render();
      }
    }
  };
  const nativeDraft = (event) => {
    if (!model || !event.target.closest?.(".schema-bulk-widget-design")) return;
    invalidate();
    render();
  };
  dialog.addEventListener("input", nativeDraft);
  dialog.addEventListener("change", nativeDraft);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return { open(initialPath = []) {
    disposeRows();
    epoch++;
    const source = clone(getDocument()), tables = schemaObjectTables(source);
    if (!tables.length) throw new Error("This schema has no object declaration with fields.");
    const current = tables.find((table) => same(table.path, initialPath)) || tables.filter((table) => table.path.length && initialPath.length >= table.path.length && table.path.every((part, index) => part === initialPath[index])).sort((a, b) => b.path.length - a.path.length)[0];
    model = { source, profiles: profiles(), options: widgetOptions(profiles(), catalog(), getWidgetCatalog?.()), targets: [["@all", "All widget declarations \xB7 across schema"], ["@allfields", "All schema declarations"], ["@undecided", "All undecided declarations"], ...tables.map((table) => [JSON.stringify(table.path), `${pointer(table.path)} \xB7 ${table.title} \xB7 ${table.count} fields`])], target: current ? JSON.stringify(current.path) : "@all", search: "", worksheet: "", loadedText: "", rows: [], proposals: [], preview: null, previewText: "", status: "" };
    load();
    if (mount) render();
    else mount = mountReactComponent(dialog, BulkWidgetSettingsEditor, { model, commands, hostRefs });
    dialog.showModal();
  }, snapshot() {
    snapshotRows();
    return model ? { format: "fullmeta-bulk-widget-state/1", model: clone(model) } : null;
  }, restore(state) {
    if (state?.format !== "fullmeta-bulk-widget-state/1" || !state.model || !same(state.model.source, getDocument())) throw new Error("Unsupported widget table state.");
    disposeRows();
    epoch++;
    const hadPreview = Boolean(state.model.preview);
    model = clone(state.model);
    model.preview = null;
    model.previewText = "";
    if (mount) render();
    else mount = mountReactComponent(dialog, BulkWidgetSettingsEditor, { model, commands, hostRefs });
    for (const row of model.rows) attach(row);
    if (hadPreview) commands.preview();
  }, preview() {
    if (!dialog.open) throw new Error("Open the widget table before Preview.");
    commands.preview();
    if (!model.preview) throw new Error(model.status || "Preview failed.");
    return { ready: true };
  }, apply() {
    if (!dialog.open || !model.preview) throw new Error("Preview the current widget table before Apply.");
    commands.apply();
    if (dialog.open) throw new Error(model.status || "The table could not be applied.");
    return { applied: true };
  }, close: commands.close, dialog, dispose() {
    epoch++;
    disposeRows();
    mount?.dispose();
    dialog.remove();
    model = null;
  } };
}
export {
  BulkWidgetSettingsEditor,
  createBulkWidgetSettingsDialog,
  fieldWithWidgetSettingEdit2 as fieldWithWidgetSettingEdit,
  fieldWithWidgetType2 as fieldWithWidgetType,
  schemaWithBulkWidgetEdits2 as schemaWithBulkWidgetEdits
};

//# sourceMappingURL=schema-bulk-widgets.js.map
