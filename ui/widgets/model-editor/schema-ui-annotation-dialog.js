// Generated from schema-ui-annotation-dialog.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { mountSchemaUiAnnotationAuthoring } from "./schema-ui-annotation-authoring.js";
import { mountSchemaAnnotationAuthoring } from "./schema-annotation-authoring.js";
import { mountStructuredValueEditor } from "../shared/structured-value-editor.js";
import { createSchemaAuthoringPathPicker } from "../shared/schema-authoring-path-picker.js";
import { FIELD_UI_BEHAVIOR_KEY, fieldUiBehavior, legacyFieldUiView } from "../../annotation-language.js";
import { validateInlineUiEditorState } from "./inline-ui-state.js";
import { referenceDraftForSchema, schemaWithReferenceDraft, schemaWithWidget, compactCatalog, annotationDefinitions, schemaWithPresentationDefaults } from "./schema-ui-annotation-dialog-model.js";
import { schemaWithReferenceDraft as schemaWithReferenceDraft2 } from "./schema-ui-annotation-dialog-model.js";
const clone = (value) => structuredClone(value), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function SchemaUiAnnotationEditor({ model, commands, refs }) {
  const { entry, reference, selectedWidget } = model;
  const scopes = [["", "Current component"], ["model", "Project document"], ["root", "Project root"]];
  if (reference.scope && !scopes.some(([key]) => key === reference.scope)) scopes.push([reference.scope, reference.scope]);
  const widgets = entry.widgetOptions || [];
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-meta" }, /* @__PURE__ */ React.createElement("label", null, "JSON key", /* @__PURE__ */ React.createElement("input", { className: "schema-ui-annotation-meta-input", "aria-label": "JSON property key", value: model.jsonKey, onChange: (e) => commands.patch({ jsonKey: e.target.value }), ref: refs.key })), /* @__PURE__ */ React.createElement("label", null, "Widget", /* @__PURE__ */ React.createElement("select", { className: "schema-ui-annotation-meta-input", "aria-label": "UI widget", value: selectedWidget, onChange: (e) => commands.widget(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Presentation only"), widgets.map((option) => /* @__PURE__ */ React.createElement("option", { key: option.widget, value: option.widget }, option.label || option.widget)), selectedWidget && !widgets.some((option) => option.widget === selectedWidget) ? /* @__PURE__ */ React.createElement("option", { value: selectedWidget }, selectedWidget, " \xB7 unsupported") : null))), /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-editor" }, /* @__PURE__ */ React.createElement("h3", null, "Widget settings"), !selectedWidget ? /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-hint" }, "No widget selected. Choose one to add its structured settings.") : null, selectedWidget && !widgets.find((option) => option.widget === selectedWidget)?.profile ? /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-hint" }, "This widget has no specialized form. Its settings remain editable as structured fields.") : null, /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-widget-fields", ref: refs.widget }), /* @__PURE__ */ React.createElement("section", { className: "schema-ui-annotation-reference" }, /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-reference-heading" }, /* @__PURE__ */ React.createElement("h3", null, "Reference source"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.reference({ enabled: !reference.enabled }) }, reference.enabled ? "Remove reference source" : "Add reference source")), reference.enabled ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-reference-fields" }, /* @__PURE__ */ React.createElement("label", null, "Look in", /* @__PURE__ */ React.createElement("select", { className: "schema-ui-annotation-meta-input", "aria-label": "Reference scope", value: reference.scope, onChange: (e) => commands.reference({ scope: e.target.value }) }, scopes.map(([value, label]) => /* @__PURE__ */ React.createElement("option", { key: value, value }, label)))), /* @__PURE__ */ React.createElement("label", null, "Target path \xB7 dotted property keys", /* @__PURE__ */ React.createElement("input", { className: "schema-ui-annotation-meta-input", "aria-label": "Reference target path", placeholder: "selections or model.selections", value: reference.targetPath, onChange: (e) => commands.reference({ targetPath: e.target.value }) })), commands.pick ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-hint" }, "Reference bindings use source scope plus dotted property keys. Picking a schema field uses its root path and selects Project root."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.pick }, "Choose reference path\u2026")) : null, /* @__PURE__ */ React.createElement("label", null, "Choice label", /* @__PURE__ */ React.createElement("input", { className: "schema-ui-annotation-meta-input", "aria-label": "Reference target label", placeholder: "Optional, e.g. boundary selection", value: reference.targetLabel, onChange: (e) => commands.reference({ targetLabel: e.target.value }) })), reference.filterMode === "advanced" ? /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-hint schema-ui-annotation-reference-note" }, "This reference has a compound target filter. It is preserved when you change the source path or label.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Filter target property", /* @__PURE__ */ React.createElement("input", { className: "schema-ui-annotation-meta-input", "aria-label": "Reference filter property", placeholder: "Optional, e.g. entity", value: reference.filterProperty, onChange: (e) => commands.reference({ filterProperty: e.target.value }) })), /* @__PURE__ */ React.createElement("label", null, "Must equal", /* @__PURE__ */ React.createElement("input", { className: "schema-ui-annotation-meta-input", "aria-label": "Reference filter value", placeholder: "Optional, e.g. boundary or domain", value: reference.filterValue, onChange: (e) => commands.reference({ filterValue: e.target.value }) })))), /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-hint" }, selectedWidget === "referenceSelector" ? "Maximum visible options is in Reference selector widget settings above." : "Choose the Reference selector widget above to present these choices in the project editor.")) : null), /* @__PURE__ */ React.createElement("details", { className: "schema-ui-annotation-presentation", open: model.presentationOpen, onToggle: (e) => commands.details(e.currentTarget.open) }, /* @__PURE__ */ React.createElement("summary", null, "Other UI annotations", model.handledCount ? ` \xB7 ${model.handledCount} editable` : ""), /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-presentation-body" }, /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-add-row" }, /* @__PURE__ */ React.createElement("select", { className: "schema-ui-annotation-add-select", "aria-label": "Choose a presentation setting to add", disabled: !model.available.length, value: model.addKey, onChange: (e) => commands.patch({ addKey: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "" }, model.available.length ? "Add a presentation setting\u2026" : "No more settings to add"), model.available.map((item) => /* @__PURE__ */ React.createElement("option", { key: item.key, value: item.key }, item.label || item.key))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: !model.available.length, onClick: commands.add }, "Add")), /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-presentation-fields", ref: refs.presentation }), !model.handledCount ? /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-hint" }, "Add a presentation setting above, or keep other values in their structured fields.") : null), /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-hint" }, "Visibility and other presentation annotations belong here. Widget-specific parameters belong in Widget settings above; reference bindings use their own source and dotted path controls."))), /* @__PURE__ */ React.createElement("p", { className: "schema-ui-annotation-feedback", role: "status", "data-kind": model.error ? "error" : "status", hidden: !model.error }, model.error), /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.close }, "Close"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button primary", disabled: model.pending || !model.dirty, onClick: commands.apply }, "Apply changes")));
}
function createSchemaUiAnnotationEditor({ onApply, getDocument } = {}) {
  const pathPicker = getDocument ? createSchemaAuthoringPathPicker({ getDocument }) : null;
  let model = null, host = null, titleHost = null, trigger = null, mount = null, titleMount = null, widgetEditor = null, presentationEditor = null;
  let widgetRevision = "", presentationRevision = "", widgetBaselines = /* @__PURE__ */ new Map(), presentationBaseline = null, widgetStates = /* @__PURE__ */ new Map(), presentationState = null;
  const refs = { widget: React.createRef(), presentation: React.createRef(), key: React.createRef() };
  const remember = () => {
    if (widgetEditor && model?.selectedWidget) widgetStates.set(model.selectedWidget, clone(widgetEditor.snapshot()));
    if (presentationEditor) presentationState = clone(presentationEditor.snapshot());
  };
  const clearChildren = () => {
    widgetEditor?.dispose?.();
    presentationEditor?.dispose?.();
    widgetEditor = null;
    presentationEditor = null;
    widgetRevision = "";
    presentationRevision = "";
  };
  const childDraftEvent = (event) => {
    if (model && event.target.closest?.(".schema-ui-annotation-widget-fields, .schema-ui-annotation-presentation-fields")) refresh();
  };
  function close() {
    if (host) for (const type of ["input", "change", "click"]) host.removeEventListener(type, childDraftEvent);
    clearChildren();
    titleMount?.dispose();
    titleMount = null;
    mount?.dispose();
    mount = null;
    if (titleHost?.isConnected) {
      const label = titleHost.previousElementSibling;
      if (label?.hasAttribute("data-schema-ui-annotation-title-label")) {
        label.hidden = false;
        titleHost.replaceChildren();
      } else titleHost.textContent = model?.entry.displayTitle || "";
    }
    if (host) {
      host.replaceChildren();
      host.hidden = true;
    }
    trigger?.setAttribute("aria-expanded", "false");
    model = null;
    host = null;
    titleHost = null;
    trigger = null;
  }
  function source() {
    return schemaWithPresentationDefaults(schemaWithWidget(model.entry.schema, model.selectedWidget, model.entry.catalog), new Set(model.addedKeys), model.entry.presentationDefinitions);
  }
  function refresh() {
    if (!model || !mount) return;
    const baseline = widgetBaselines.get(model.selectedWidget);
    model.dirty = model.title !== model.originalTitle || model.jsonKey !== model.originalKey || model.selectedWidget !== model.originalWidget || !same(model.reference, model.referenceBaseline) || Boolean(widgetEditor && baseline && !same(widgetEditor.snapshot(), baseline)) || Boolean(presentationEditor && presentationBaseline && !same(presentationEditor.snapshot(), presentationBaseline));
    mount.update({ model, commands, refs });
    titleMount?.update(titleProps());
  }
  function attach() {
    const key = model.selectedWidget;
    if (widgetRevision !== key) {
      widgetEditor?.dispose?.();
      widgetEditor = null;
      widgetRevision = key;
      if (key) try {
        const option = model.entry.widgetOptions?.find((item) => item.widget === key), declaration2 = schemaWithWidget(model.entry.schema, key, model.entry.catalog);
        if (option?.profile) {
          const context = model.entry.widgetContexts?.[key];
          widgetEditor = mountSchemaAnnotationAuthoring({ container: refs.widget.current, declaration: declaration2, widget: key, state: widgetStates.get(key), context: context ? { ...context, presentation: "focused" } : null, configuration: option.profile, fieldContext: model.entry.fieldContext, onDraftChange: (snapshot) => {
            widgetStates.set(key, clone(snapshot));
            refresh();
          } });
        } else {
          const initial = fieldUiBehavior(declaration2)?.payload?.widget?.settings || {}, editor = mountStructuredValueEditor({ container: refs.widget.current, value: initial, label: `${key} settings`, onChange: () => refresh() });
          const saved = widgetStates.get(key);
          if (saved?.format === "fullmeta-structured-widget-state/1") editor.restore(saved.draft);
          widgetEditor = { ownedUiAnnotations: [], snapshot: () => ({ format: "fullmeta-structured-widget-state/1", draft: editor.draft() }), commit(declaration3) {
            const next = clone(declaration3);
            next[FIELD_UI_BEHAVIOR_KEY].payload.widget.settings = editor.commit();
            return next;
          }, dispose: () => editor.dispose() };
        }
        if (!widgetBaselines.has(key)) widgetBaselines.set(key, clone(widgetEditor.snapshot()));
      } catch (error) {
        model.error = error.message;
      }
    }
    const nextRevision = key + "|" + model.addedKeys.join("|");
    if (presentationRevision !== nextRevision) {
      if (presentationEditor) presentationState = clone(presentationEditor.snapshot());
      presentationEditor?.dispose?.();
      presentationEditor = null;
      presentationRevision = nextRevision;
      try {
        presentationEditor = mountSchemaUiAnnotationAuthoring({ container: refs.presentation.current, declaration: source(), catalog: model.entry.compactCatalog, fieldContext: model.entry.fieldContext, excludedKeys: widgetEditor?.ownedUiAnnotations || [], state: presentationState, onDraftChange: () => refresh() });
        if (!presentationBaseline) presentationBaseline = clone(presentationEditor.snapshot());
      } catch (error) {
        model.error = error.message;
      }
    }
    const declaration = legacyFieldUiView(source()), present = declaration["x-fullmeta-ui"] || {}, owned = new Set(widgetEditor?.ownedUiAnnotations || []);
    model.available = model.entry.presentationDefinitions.filter((item) => !owned.has(item.key) && !Object.hasOwn(present, item.key));
    model.handledCount = presentationEditor?.handledKeys.length || 0;
    refresh();
  }
  const titleProps = () => ({ value: model.title, placeholder: model.entry.displayTitle || "Title", onChange: (value) => {
    model.title = value;
    refresh();
  } });
  const commands = {
    patch(patch) {
      Object.assign(model, patch);
      refresh();
    },
    reference(patch) {
      Object.assign(model.reference, patch);
      refresh();
    },
    details(open) {
      if (model) model.presentationOpen = open;
    },
    widget(value) {
      remember();
      model.selectedWidget = value;
      refresh();
      attach();
    },
    add() {
      const key = model.addKey;
      if (!model.available.some((item) => item.key === key)) return;
      remember();
      model.addedKeys.push(key);
      model.addKey = "";
      model.presentationOpen = true;
      refresh();
      attach();
    },
    close,
    pick: pathPicker ? () => pathPicker.open({ representation: "referencePath", onPick: (selected) => {
      if (model) {
        Object.assign(model.reference, { targetPath: selected.referencePath, scope: "root" });
        refresh();
      }
    } }) : null,
    apply() {
      if (!model || model.pending || !model.dirty) return;
      remember();
      try {
        let next = clone(model.entry.schema);
        const widgetChanged = model.selectedWidget !== model.originalWidget || Boolean(widgetEditor && !same(widgetEditor.snapshot(), widgetBaselines.get(model.selectedWidget))), presentationChanged = Boolean(presentationEditor && !same(presentationEditor.snapshot(), presentationBaseline));
        if (widgetChanged || presentationChanged) {
          next = schemaWithWidget(next, model.selectedWidget, model.entry.catalog);
          if (model.selectedWidget && widgetEditor && widgetChanged) next = widgetEditor.commit(next);
          if (presentationEditor && presentationChanged) next = presentationEditor.commit(next);
        }
        if (!same(model.reference, model.referenceBaseline)) next = schemaWithReferenceDraft(next, model.reference, model.referenceBaseline);
        model.pending = true;
        refresh();
        onApply?.({ entry: model.entry, schema: next, title: model.title, jsonKey: model.jsonKey });
        close();
      } catch (error) {
        model.pending = false;
        model.error = error.message || "Could not apply the field changes.";
        refresh();
        if (/key/i.test(model.error)) refs.key.current?.focus();
      }
    }
  };
  const Title = ({ value, placeholder, onChange }) => /* @__PURE__ */ React.createElement("input", { "data-inline-ui-editor": "true", className: "schema-ui-annotation-title-input", type: "text", "aria-label": "Schema title", value, placeholder, onChange: (e) => onChange(e.target.value) });
  return {
    open(entry, nextHost, nextTrigger, nextTitleHost) {
      if (host === nextHost && nextHost?.isConnected && !nextHost.hidden) {
        close();
        return false;
      }
      close();
      if (!object(entry?.schema) || !nextHost) return false;
      const catalog = compactCatalog(entry.catalog), reference = referenceDraftForSchema(entry.schema), title = typeof entry.schema.title === "string" ? entry.schema.title : "", jsonKey = typeof entry.propertyName === "string" ? entry.propertyName : "", widget = typeof entry.widget === "string" ? entry.widget : "";
      model = { entry: { ...entry, schema: clone(entry.schema), compactCatalog: catalog, presentationDefinitions: annotationDefinitions(catalog) }, title, originalTitle: title, jsonKey, originalKey: jsonKey, selectedWidget: widget, originalWidget: widget, reference, referenceBaseline: clone(reference), addedKeys: [], available: [], addKey: "", handledCount: 0, presentationOpen: false, pending: false, error: "", dirty: false };
      widgetStates = /* @__PURE__ */ new Map();
      widgetBaselines = /* @__PURE__ */ new Map();
      presentationState = null;
      presentationBaseline = null;
      widgetRevision = "!";
      presentationRevision = "!";
      host = nextHost;
      host.dataset.inlineUiEditor = "true";
      titleHost = nextTitleHost || null;
      trigger = nextTrigger || null;
      host.hidden = false;
      trigger?.setAttribute("aria-expanded", "true");
      mount = mountReactComponent(host, SchemaUiAnnotationEditor, { model, commands, refs });
      if (titleHost) {
        const label = titleHost.previousElementSibling;
        if (label?.hasAttribute("data-schema-ui-annotation-title-label")) label.hidden = true;
        titleMount = mountReactComponent(titleHost, Title, titleProps());
      }
      attach();
      for (const type of ["input", "change", "click"]) host.addEventListener(type, childDraftEvent);
      return true;
    },
    snapshot() {
      if (!model || !host?.isConnected || host.hidden) return null;
      remember();
      return model ? { format: "fullmeta-inline-ui-state/1", target: { file: model.entry.file || null, path: model.entry.path || null, propertyName: model.entry.propertyName || "" }, sourceSchema: clone(model.entry.schema), title: model.title, jsonKey: model.jsonKey, selectedWidget: model.selectedWidget, reference: clone(model.reference), addedKeys: [...model.addedKeys], widgetStates: Object.fromEntries(widgetStates), widgetBaselines: Object.fromEntries(widgetBaselines), presentationBaseline: clone(presentationBaseline), presentationState: clone(presentationState), presentationOpen: model.presentationOpen } : null;
    },
    restore(state) {
      if (!model || state?.format !== "fullmeta-inline-ui-state/1") throw new Error("Open a field before restoring its UI draft.");
      validateInlineUiEditorState(state);
      if (!same(state.target, { file: model.entry.file || null, path: model.entry.path || null, propertyName: model.entry.propertyName || "" }) || !same(state.sourceSchema, model.entry.schema)) throw new Error("The inline UI draft belongs to a different source declaration.");
      clearChildren();
      Object.assign(model, { title: state.title, jsonKey: state.jsonKey, selectedWidget: state.selectedWidget, reference: clone(state.reference), addedKeys: [...state.addedKeys], presentationOpen: state.presentationOpen, pending: false, error: "" });
      widgetStates = new Map(Object.entries(state.widgetStates || {}));
      widgetBaselines = new Map(Object.entries(state.widgetBaselines || {}));
      presentationState = clone(state.presentationState);
      presentationBaseline = clone(state.presentationBaseline);
      widgetRevision = "!";
      presentationRevision = "!";
      refresh();
      attach();
    },
    close,
    dispose() {
      close();
      pathPicker?.dispose?.();
    }
  };
}
export {
  SchemaUiAnnotationEditor,
  createSchemaUiAnnotationEditor,
  schemaWithReferenceDraft2 as schemaWithReferenceDraft
};

//# sourceMappingURL=schema-ui-annotation-dialog.js.map
