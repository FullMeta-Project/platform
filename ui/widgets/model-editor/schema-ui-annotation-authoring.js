// Generated from schema-ui-annotation-authoring.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { annotationRow, adoptAnnotationRows } from "../shared/annotation-control-model.js";
import { validValue, initialState, stateValue } from "./schema-ui-annotation-model.js";
import { fieldUiBehavior, legacyFieldUiView, writeFieldUiBehavior } from "../../annotation-language.js";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value), types = /* @__PURE__ */ new Set(["text", "boolean", "stringList", "stringMap", "json", "typedValue"]), mounts = /* @__PURE__ */ new WeakMap();
function rawDraft(type, value, saved) {
  const draft = saved === void 0 ? initialState(type, value) : saved;
  if (type === "json") {
    let current;
    try {
      current = draft === "" ? void 0 : JSON.parse(draft);
    } catch {
      current = value;
    }
    return { enabled: current !== void 0, structured: structuredValueDraft(current ?? {}) };
  }
  if (type === "stringList") return (Array.isArray(draft) ? draft : []).map(annotationRow);
  if (type === "stringMap") return (Array.isArray(draft) ? draft : []).map(([key, value2]) => ({ id: annotationRow("").id, key, value: value2 }));
  return structuredClone(draft);
}
const readRaw = (type, draft) => type === "json" ? draft.enabled ? JSON.stringify(readStructuredValueDraft(draft.structured)) : "" : type === "stringList" ? draft.map((row) => row.value) : type === "stringMap" ? draft.map((row) => [row.key, row.value]) : draft;
function PresentationControl({ type, label, draft, onChange, disabled }) {
  if (type === "json") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "schema-ui-annotation-toggle" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: draft.enabled,
      disabled,
      onChange: (event) => onChange({ ...draft, enabled: event.target.checked })
    }
  ), " Set value"), draft.enabled ? /* @__PURE__ */ React.createElement(
    StructuredValueEditor,
    {
      draft: draft.structured,
      label,
      disabled,
      onDraftChange: (structured) => onChange({ ...draft, structured })
    }
  ) : null);
  if (type === "boolean") return /* @__PURE__ */ React.createElement("select", { value: draft, disabled, "aria-label": label, onChange: (event) => onChange(event.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Not specified"), /* @__PURE__ */ React.createElement("option", { value: "true" }, "Yes"), /* @__PURE__ */ React.createElement("option", { value: "false" }, "No"));
  if (type === "typedValue") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("select", { value: draft.kind, disabled, "aria-label": label + " type", onChange: (event) => onChange({ ...draft, kind: event.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "text" }, "Text"), /* @__PURE__ */ React.createElement("option", { value: "number" }, "Number"), /* @__PURE__ */ React.createElement("option", { value: "boolean" }, "Yes / no"), /* @__PURE__ */ React.createElement("option", { value: "null" }, "Null")), /* @__PURE__ */ React.createElement("span", { className: "schema-ui-annotation-typed-value" }, draft.kind === "null" ? null : draft.kind === "boolean" ? /* @__PURE__ */ React.createElement("select", { value: draft.value === "false" ? "false" : "true", disabled, "aria-label": label, onChange: (event) => onChange({ ...draft, value: event.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "true" }, "Yes"), /* @__PURE__ */ React.createElement("option", { value: "false" }, "No")) : /* @__PURE__ */ React.createElement("input", { type: "text", inputMode: draft.kind === "number" ? "decimal" : void 0, value: draft.value, disabled, "aria-label": label, onChange: (event) => onChange({ ...draft, value: event.target.value }) })));
  if (type === "stringList" || type === "stringMap") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-rows" }, draft.map((row, index) => /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-row", key: row.id }, type === "stringMap" ? /* @__PURE__ */ React.createElement("input", { type: "text", value: row.key, disabled, "aria-label": label + " key " + (index + 1), onChange: (event) => onChange(draft.map((item) => item.id === row.id ? { ...item, key: event.target.value } : item)) }) : null, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: row.value,
      disabled,
      "aria-label": label + (type === "stringMap" ? " value " : " item ") + (index + 1),
      onChange: (event) => onChange(draft.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, "aria-label": "Remove " + label + " row " + (index + 1), onClick: () => onChange(draft.filter((item) => item.id !== row.id)) }, "Remove")))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick: () => onChange([...draft, type === "stringMap" ? { id: annotationRow("").id, key: "", value: "" } : annotationRow("")]) }, type === "stringMap" ? "Add entry" : "Add item"));
  return /* @__PURE__ */ React.createElement("input", { type: "text", value: draft, disabled, "aria-label": label, onChange: (event) => onChange(event.target.value) });
}
function SchemaUiAnnotationAuthoring({ view, onCommand }) {
  return /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-design" }, view.groups.map((group) => /* @__PURE__ */ React.createElement("section", { className: "schema-ui-annotation-group", key: group.id }, /* @__PURE__ */ React.createElement("h3", null, group.title || "UI annotations"), group.entries.map((annotation) => /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-entry", key: annotation.key }, annotation.composite ? /* @__PURE__ */ React.createElement("strong", null, annotation.label) : null, annotation.fields.map((field) => /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-field", key: field.key }, /* @__PURE__ */ React.createElement("label", null, field.label, /* @__PURE__ */ React.createElement(
    PresentationControl,
    {
      type: field.type,
      label: field.label,
      draft: field.draft,
      disabled: view.disabled,
      onChange: (draft) => onCommand({ type: "presentation.change", key: annotation.key, field: field.key, draft })
    }
  )))))))), view.extras.map((extra) => /* @__PURE__ */ React.createElement("details", { className: "schema-ui-annotation-group schema-ui-annotation-extra", key: extra.key }, /* @__PURE__ */ React.createElement("summary", null, extra.key, " \xB7 structured value"), /* @__PURE__ */ React.createElement("div", { className: "schema-ui-annotation-extra-value" }, /* @__PURE__ */ React.createElement(
    StructuredValueEditor,
    {
      draft: extra.draft,
      label: extra.key,
      disabled: view.disabled,
      onDraftChange: (draft) => onCommand({ type: "presentation.extra", key: extra.key, draft })
    }
  )))));
}
function mountSchemaUiAnnotationAuthoring({ container, declaration, catalog, excludedKeys = [], state, fieldContext, onDraftChange, disabled = false } = {}) {
  if (!container || typeof container.replaceChildren !== "function" || !object(declaration)) throw new Error("Choose a schema declaration for its UI annotations.");
  mounts.get(container)?.dispose();
  const annotationKey = typeof catalog?.annotationKey === "string" && catalog.annotationKey ? catalog.annotationKey : "x-fullmeta-ui-behavior";
  const declarationView = legacyFieldUiView(declaration), source = declarationView["x-fullmeta-ui"] || {};
  if (!object(source)) throw new Error("Field presentation settings must be an object.");
  const excluded = new Set(excludedKeys instanceof Set ? excludedKeys : Array.isArray(excludedKeys) ? excludedKeys : []), saved = state instanceof Map ? Object.fromEntries(state) : object(state) ? state : {};
  let groups = [], extras = [], handledKeys = [], mount, disposed = false;
  const definitions = [...catalog?.groups || [], ...catalog?.presentationFields?.length ? [{ title: "Icons", annotations: catalog.presentationFields.map((field) => ({ key: field.key, label: field.label || field.key, type: field.type })) }] : []];
  for (const [index, group] of definitions.entries()) {
    const entries = [];
    for (const annotation of group.annotations || []) {
      const key = annotation.key;
      if (typeof key !== "string" || !key || excluded.has(key) || !Object.hasOwn(source, key)) continue;
      const value = source[key], composite = Array.isArray(annotation.fields), specs = composite ? annotation.fields : [{ key, label: annotation.label || key, type: annotation.type }];
      if (composite && !object(value) || !specs.length || specs.some((spec) => !types.has(spec.type) || !validValue(spec.type, composite ? value[spec.key] : value))) continue;
      entries.push({ key, label: annotation.label || key, composite, required: annotation.required || [], fields: specs.map((spec) => ({
        key: spec.key,
        label: spec.label || spec.key,
        type: spec.type,
        original: initialState(spec.type, composite ? value[spec.key] : value),
        draft: rawDraft(spec.type, composite ? value[spec.key] : value, composite ? saved[key]?.[spec.key] : saved[key])
      })) });
      handledKeys.push(key);
    }
    if (entries.length) groups.push({ id: index, title: group.title, entries });
  }
  for (const [key, value] of Object.entries(source)) if (!excluded.has(key) && !handledKeys.includes(key)) {
    extras.push({ key, original: value, draft: structuredValueDraft(Object.hasOwn(saved, key) ? saved[key] : value) });
    handledKeys.push(key);
  }
  if (saved.format === "fullmeta-ui-annotation-state/1") {
    groups = groups.map((group) => ({ ...group, entries: group.entries.map((annotation) => ({ ...annotation, fields: annotation.fields.map((field) => {
      const prior = saved.groups?.flatMap((group2) => group2.entries || []).find((entry) => entry.key === annotation.key)?.fields?.find((entry) => entry.key === field.key && entry.type === field.type);
      return prior ? { ...field, draft: structuredClone(prior.draft) } : field;
    }) })) }));
    extras = extras.map((extra) => {
      const prior = saved.extras?.find((entry) => entry.key === extra.key);
      return prior ? { ...extra, draft: structuredClone(prior.draft) } : extra;
    });
    adoptAnnotationRows(groups);
  }
  const props = () => ({ view: { groups, extras, disabled }, onCommand });
  const snapshot = () => ({ format: "fullmeta-ui-annotation-state/1", groups: structuredClone(groups), extras: structuredClone(extras) });
  const onCommand = (command) => {
    if (disabled) return;
    if (command.type === "presentation.change") groups = groups.map((group) => ({ ...group, entries: group.entries.map((annotation) => annotation.key === command.key ? { ...annotation, fields: annotation.fields.map((field) => field.key === command.field ? { ...field, draft: command.draft } : field) } : annotation) }));
    else if (command.type === "presentation.extra") extras = extras.map((extra) => extra.key === command.key ? { ...extra, draft: command.draft } : extra);
    else throw new Error("Unknown presentation command " + command.type);
    mount.update(props());
    onDraftChange?.(snapshot());
  };
  mount = mountReactComponent(container, SchemaUiAnnotationAuthoring, props());
  const api = {
    annotationKey,
    handledKeys,
    snapshot,
    disable(value = true) {
      disabled = value;
      mount.update(props());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mounts.delete(container);
      mount.dispose();
    },
    commit(declarationSource = declaration) {
      if (!object(declarationSource)) throw new Error("The schema declaration is no longer an object.");
      const next = legacyFieldUiView(declarationSource);
      let target = object(next["x-fullmeta-ui"]) ? next["x-fullmeta-ui"] : null;
      for (const group of groups) for (const annotation of group.entries) for (const field of annotation.fields) {
        const draft = readRaw(field.type, field.draft);
        if (JSON.stringify(draft) === JSON.stringify(field.original)) continue;
        const value = stateValue(field.type, draft, field.label);
        if (value === void 0 && annotation.required.includes(field.key)) throw new Error(field.label + " is required.");
        if (!target) target = next["x-fullmeta-ui"] = {};
        if (annotation.composite) {
          const owner = object(target[annotation.key]) ? target[annotation.key] : target[annotation.key] = {};
          if (value === void 0) delete owner[field.key];
          else owner[field.key] = value;
        } else if (value === void 0) delete target[annotation.key];
        else target[annotation.key] = value;
      }
      for (const extra of extras) {
        const value = readStructuredValueDraft(extra.draft);
        if (JSON.stringify(value) !== JSON.stringify(extra.original)) {
          if (!target) target = next["x-fullmeta-ui"] = {};
          target[extra.key] = value;
        }
      }
      return writeFieldUiBehavior(next, { context: fieldUiBehavior(declarationSource)?.context || fieldContext || "projectEditing" });
    }
  };
  mounts.set(container, api);
  return api;
}
export {
  SchemaUiAnnotationAuthoring,
  mountSchemaUiAnnotationAuthoring
};

//# sourceMappingURL=schema-ui-annotation-authoring.js.map
