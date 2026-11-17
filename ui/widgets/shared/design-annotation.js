// Generated from design-annotation.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "./structured-value-editor.js";
import { matchesDesignCondition, validateAnnotationFormValue } from "./annotation-form-model.js";
import { annotationRow, adoptAnnotationRows, createAnnotationControl, readAnnotationControl } from "./annotation-control-model.js";
import { matchesDesignCondition as matchesDesignCondition2 } from "./annotation-form-model.js";
function StringRows({ rows, label, onChange, addLabel = "Add item", removeLabel = "Remove", disabled = false }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row-list" }, rows.map((row, index) => /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row", key: row.id }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: row.value,
      disabled,
      "aria-label": label + " " + (index + 1),
      onChange: (event) => onChange(rows.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item), event)
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick: (event) => onChange(rows.filter((item) => item.id !== row.id), event) }, removeLabel)))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick: (event) => onChange([...rows, annotationRow("")], event) }, addLabel));
}
function MapRows({ field, draft, onChange, disabled = false, typed = false, list = false }) {
  const patch = (id, change, event) => onChange({ ...draft, rows: draft.rows.map((row) => row.id === id ? { ...row, ...change } : row) }, event);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row-list" }, draft.rows.map((row) => /* @__PURE__ */ React.createElement("div", { className: list ? "sd-design-sibling" : "sd-annotation-row" + (typed ? " sd-typed-map-row" : ""), key: row.id }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: row.key,
      disabled,
      placeholder: typed ? "Property" : "Key",
      "aria-label": field.label + (typed ? " property" : " key"),
      onChange: (event) => patch(row.id, { key: event.target.value }, event)
    }
  ), list ? /* @__PURE__ */ React.createElement(
    StringRows,
    {
      rows: row.items,
      label: field.label + " value",
      disabled,
      addLabel: "Add value",
      removeLabel: "Remove value",
      onChange: (items, event) => patch(row.id, { items }, event)
    }
  ) : typed ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("select", { value: row.kind, disabled, "aria-label": field.label + " value type", onChange: (event) => patch(
    row.id,
    { kind: event.target.value, ...["array", "object"].includes(event.target.value) ? { structured: structuredValueDraft(event.target.value === "array" ? [] : {}) } : {} },
    event
  ) }, ["string", "number", "boolean", "null", "array", "object"].map((kind) => /* @__PURE__ */ React.createElement("option", { key: kind, value: kind }, { string: "Text", number: "Number", boolean: "Boolean", null: "Null", array: "Array", object: "Object" }[kind]))), row.kind === "boolean" ? /* @__PURE__ */ React.createElement(
    "select",
    {
      value: String(row.boolean),
      disabled,
      "aria-label": field.label + " boolean value",
      onChange: (event) => patch(row.id, { boolean: event.target.value === "true" }, event)
    },
    /* @__PURE__ */ React.createElement("option", { value: "true" }, "Yes"),
    /* @__PURE__ */ React.createElement("option", { value: "false" }, "No")
  ) : ["array", "object"].includes(row.kind) ? /* @__PURE__ */ React.createElement("div", { className: "sd-typed-map-structured-value" }, /* @__PURE__ */ React.createElement(
    StructuredValueEditor,
    {
      draft: row.structured,
      label: field.label + " value",
      disabled,
      onDraftChange: (structured) => patch(row.id, { structured })
    }
  )) : row.kind === "null" ? null : /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: row.text,
      disabled,
      placeholder: "Value",
      "aria-label": field.label + " value",
      onChange: (event) => patch(row.id, { text: event.target.value }, event)
    }
  )) : /* @__PURE__ */ React.createElement("input", { type: "text", value: row.text, disabled, placeholder: "Text", "aria-label": field.label + " text", onChange: (event) => patch(row.id, { text: event.target.value }, event) }), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick: (event) => onChange({ ...draft, rows: draft.rows.filter((item) => item.id !== row.id) }, event) }, list ? "Remove key" : "Remove")))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick: (event) => {
    const row = { id: annotationRow("").id, key: "", ...list ? { items: [] } : typed ? { kind: "string", text: "", boolean: true, structured: structuredValueDraft({}) } : { text: "" } };
    onChange({ ...draft, rows: [...draft.rows, row] }, event);
  } }, list ? "Add key" : typed ? "Add property" : "Add entry"));
}
function AnnotationControl({ field, draft, onChange, disabled = false }) {
  const update = (change, event) => onChange({ ...draft, ...change }, event);
  if (field.type === "json") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "sd-structured-value-toggle" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: draft.enabled,
      disabled,
      onChange: (event) => update({ enabled: event.target.checked }, event)
    }
  ), " Set value"), draft.enabled ? /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-structured-value" }, /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: draft.structured, label: field.label, disabled, onDraftChange: (structured) => update({ structured }) })) : null);
  if (field.type === "source") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, field.scopeLabel || "Scope"), /* @__PURE__ */ React.createElement("select", { value: draft.scope, disabled, "aria-label": field.label + " scope", onChange: (event) => update({ scope: event.target.value }, event) }, [.../* @__PURE__ */ new Set([...field.scopes || ["root", "document", "component", "engine", "runtime"], ...draft.scope ? [draft.scope] : []])].map((scope) => /* @__PURE__ */ React.createElement("option", { key: scope, value: scope }, scope))), /* @__PURE__ */ React.createElement("span", null, field.pathLabel || "Path segments"), /* @__PURE__ */ React.createElement(
    StringRows,
    {
      rows: draft.path,
      disabled,
      label: field.pathSegmentLabel || field.label + " path segment",
      addLabel: field.addPathLabel || "Add path segment",
      onChange: (path, event) => update({ path }, event)
    }
  ), (field.properties || []).map((property) => {
    const set = (value2, event) => update({ properties: { ...draft.properties, [property.key]: value2 } }, event), value = draft.properties[property.key];
    const content = property.type === "schemaFilter" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Schema annotation names (comma-separated)", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: value.annotationKeys,
        disabled,
        "aria-label": field.label + " schema annotation names",
        onChange: (event) => set({ ...value, annotationKeys: event.target.value }, event)
      }
    )), /* @__PURE__ */ React.createElement("label", null, "Model value path", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: value.valuePath,
        disabled,
        placeholder: "section/property",
        "aria-label": field.label + " filter value path",
        onChange: (event) => set({ ...value, valuePath: event.target.value }, event)
      }
    ))) : /* @__PURE__ */ React.createElement("label", null, property.label, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: property.type === "boolean" ? "checkbox" : "text",
        disabled,
        "aria-label": field.label + " " + property.label,
        ...property.type === "boolean" ? { checked: value === true } : { value },
        onChange: (event) => set(property.type === "boolean" ? event.target.checked : event.target.value, event)
      }
    ));
    return property.advanced ? /* @__PURE__ */ React.createElement("details", { key: property.key }, /* @__PURE__ */ React.createElement("summary", null, property.summary || property.label), content) : /* @__PURE__ */ React.createElement(React.Fragment, { key: property.key }, content);
  }));
  if (field.type === "stringList") return /* @__PURE__ */ React.createElement(StringRows, { rows: draft.rows, disabled, label: field.label + " item", addLabel: field.addLabel || "Add item", onChange: (rows, event) => update({ rows }, event) });
  if (["stringMap", "typedMap", "stringListMap"].includes(field.type)) return /* @__PURE__ */ React.createElement(MapRows, { ...{ field, draft, onChange, disabled }, typed: field.type === "typedMap", list: field.type === "stringListMap" });
  if (field.type === "initialChoice") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Matching property", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: draft.property,
      disabled,
      "aria-label": field.label + " matching property",
      onChange: (event) => update({ property: event.target.value }, event)
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "sd-design-composite" }, "Initial choices by value", /* @__PURE__ */ React.createElement(MapRows, { field: { ...field, label: field.label + " values" }, draft, onChange, disabled })));
  if (field.type === "namedLabels") return /* @__PURE__ */ React.createElement("div", { className: "sd-scan-setting-grid" }, (field.entries || []).map(([key, title]) => /* @__PURE__ */ React.createElement("label", { key }, title, /* @__PURE__ */ React.createElement("input", { type: "text", value: draft.values[key], disabled, "aria-label": title, onChange: (event) => update({ values: { ...draft.values, [key]: event.target.value } }, event) }))));
  if (field.type === "siblings") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "sd-annotation-row-list" }, draft.rows.map((row) => /* @__PURE__ */ React.createElement("div", { className: "sd-design-sibling", key: row.id }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: row.label,
      disabled,
      placeholder: "Display label (optional)",
      "aria-label": "Sibling display label",
      onChange: (event) => update({ rows: draft.rows.map((item) => item.id === row.id ? { ...item, label: event.target.value } : item) }, event)
    }
  ), /* @__PURE__ */ React.createElement(
    StringRows,
    {
      rows: row.path,
      label: "Sibling path segment",
      disabled,
      addLabel: "Add path segment",
      removeLabel: "Remove segment",
      onChange: (path, event) => update({ rows: draft.rows.map((item) => item.id === row.id ? { ...item, path } : item) }, event)
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick: (event) => update({ rows: draft.rows.filter((item) => item.id !== row.id) }, event) }, "Remove sibling")))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled, onClick: (event) => update({ rows: [...draft.rows, { id: annotationRow("").id, label: "", path: [annotationRow("")] }] }, event) }, "Add sibling"));
  if (field.type === "siblingCondition") return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Sibling property", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: draft.property,
      disabled,
      "aria-label": field.label + " sibling property",
      onChange: (event) => update({ property: event.target.value }, event)
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Value type", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: draft.kind,
      disabled,
      "aria-label": field.label + " value type",
      onChange: (event) => update({ kind: event.target.value }, event)
    },
    ["string", "number", "boolean", "null"].map((kind) => /* @__PURE__ */ React.createElement("option", { key: kind, value: kind }, { string: "Text", number: "Number", boolean: "Boolean", null: "Null" }[kind]))
  )), draft.kind === "null" ? null : draft.kind === "boolean" ? /* @__PURE__ */ React.createElement("label", null, "Matching value", /* @__PURE__ */ React.createElement(
    "select",
    {
      value: String(draft.boolean),
      disabled,
      "aria-label": field.label + " boolean value",
      onChange: (event) => update({ boolean: event.target.value === "true" }, event)
    },
    /* @__PURE__ */ React.createElement("option", { value: "true" }, "Yes"),
    /* @__PURE__ */ React.createElement("option", { value: "false" }, "No")
  )) : /* @__PURE__ */ React.createElement("label", null, "Matching value", /* @__PURE__ */ React.createElement("input", { type: "text", value: draft.text, disabled, "aria-label": field.label + " matching value", onChange: (event) => update({ text: event.target.value }, event) })));
  if (field.type === "boolean") return /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: draft.value, disabled, "aria-label": field.label, onChange: (event) => update({ value: event.target.checked }, event) });
  if (field.options) return /* @__PURE__ */ React.createElement("select", { value: draft.value, disabled, "aria-label": field.label, onChange: (event) => update({ value: event.target.value }, event) }, field.options.map((value) => /* @__PURE__ */ React.createElement("option", { key: value, value }, value || "Not specified")));
  return /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      inputMode: field.type === "integer" ? "numeric" : void 0,
      value: draft.value,
      disabled,
      "aria-label": field.label,
      onChange: (event) => update({ value: event.target.value }, event)
    }
  );
}
function WidgetAnnotationEditor({ view, onCommand }) {
  const { fields, controls, current, schema, source, context, heading, label, groups = [], advancedHeading, note, disabled } = view;
  const values = { ...current };
  for (const field of fields) try {
    const read = readAnnotationControl(field, controls[field.key], readStructuredValueDraft);
    values[field.key] = field.type === "boolean" ? read.checked : read.text;
  } catch {
  }
  const renderField = (field) => {
    let error = "";
    try {
      readAnnotationControl(field, controls[field.key], readStructuredValueDraft);
    } catch (failure) {
      error = failure.message;
    }
    const composite = ["source", "namedLabels", "stringList", "stringMap", "typedMap", "stringListMap", "initialChoice", "siblings", "siblingCondition", "json"].includes(field.type), Tag = composite ? "div" : "label";
    return /* @__PURE__ */ React.createElement(Tag, { key: field.key, className: composite ? "sd-design-composite" : void 0, hidden: !matchesDesignCondition(values, field.visibleWhen, { schema: context?.schema || schema, source, annotation: values }) }, field.label, /* @__PURE__ */ React.createElement(
      AnnotationControl,
      {
        field,
        draft: controls[field.key],
        disabled,
        onChange: (draft, event) => onCommand({ type: "annotation.change", key: field.key, draft }, event)
      }
    ), error ? /* @__PURE__ */ React.createElement("p", { role: "alert", className: "sd-error" }, error) : null);
  };
  const groupKeys = new Set(groups.map((group) => group.key)), main = fields.filter((field) => !field.advanced && !groupKeys.has(field.group));
  return /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail" }, heading && heading !== label ? /* @__PURE__ */ React.createElement("h3", null, heading) : null, main.length ? /* @__PURE__ */ React.createElement("div", { className: "sd-scan-setting-grid" }, main.map(renderField)) : null, groups.map((group) => {
    const entries = fields.filter((field) => !field.advanced && field.group === group.key);
    return entries.length ? /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail", key: group.key }, group.heading ? /* @__PURE__ */ React.createElement("h3", null, group.heading) : null, /* @__PURE__ */ React.createElement("div", { className: "sd-scan-setting-grid" }, entries.map(renderField))) : null;
  }), fields.some((field) => field.advanced) ? /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, advancedHeading || "More widget settings"), /* @__PURE__ */ React.createElement("div", { className: "sd-scan-setting-grid" }, fields.filter((field) => field.advanced).map(renderField))) : null, note ? /* @__PURE__ */ React.createElement("p", { className: "sd-note" }, note) : null);
}
function renderWidgetAnnotationEditor(parent, schema, {
  source,
  state,
  annotationKey,
  label,
  heading,
  fields = [],
  groups,
  advancedHeading,
  validate,
  ownedUiAnnotations = [],
  note,
  context
} = {}) {
  if (!Object.hasOwn(source || {}, annotationKey)) return null;
  const annotation = source[annotationKey];
  if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) return null;
  const original = JSON.stringify(annotation);
  let current = annotation;
  const savedText = typeof state === "string" ? state : state?.value;
  if (typeof savedText === "string") try {
    const saved = JSON.parse(savedText);
    if (saved && typeof saved === "object" && !Array.isArray(saved)) current = saved;
  } catch {
  }
  if (state?.format === "fullmeta-annotation-form-state/1" && state.current) current = structuredClone(state.current);
  const activeFields = fields.filter((field) => !field.showWhenPresent || Object.hasOwn(current, field.key));
  let controls = Object.fromEntries(activeFields.map((field) => [field.key, createAnnotationControl(field, current[field.key], structuredValueDraft)]));
  let dirty = typeof savedText === "string" && savedText !== original, changed = /* @__PURE__ */ new Set(), disabled = false, mount;
  if (state?.format === "fullmeta-annotation-form-state/1") {
    controls = structuredClone(state.controls);
    dirty = state.dirty;
    changed = new Set(state.changed);
    adoptAnnotationRows(controls);
  }
  if (state?.legacyRaw) {
    let typedIndex = 0, siblingIndex = 0;
    for (const field of activeFields) {
      if (field.type === "typedMap") for (const row of controls[field.key].rows) {
        const raw = state.legacyRaw.typedMap?.[typedIndex++];
        if (typeof raw === "string" && raw !== row.text) {
          row.text = raw;
          dirty = true;
          changed.add(field.key);
        }
      }
      if (field.type === "siblingCondition") {
        const raw = state.legacyRaw.siblingMatches?.[siblingIndex++];
        if (typeof raw === "string" && raw !== controls[field.key].text) {
          controls[field.key].text = raw;
          dirty = true;
          changed.add(field.key);
        }
      }
    }
  }
  const host = document.createElement("div");
  parent.append(host);
  const props = () => ({ view: { fields: activeFields, controls, current, schema, source, context, heading, label, groups, advancedHeading, note, disabled }, onCommand });
  const onCommand = (command, event) => {
    if (disabled) return;
    if (command.type !== "annotation.change" || !Object.hasOwn(controls, command.key)) throw new Error("Unknown annotation form command.");
    controls = { ...controls, [command.key]: command.draft };
    dirty = true;
    changed.add(command.key);
    mount.update(props());
    if (!event || event.type === "click") host.dispatchEvent(new Event("input", { bubbles: true }));
  };
  mount = mountReactComponent(host, WidgetAnnotationEditor, props());
  const inputControls = activeFields.map((field) => ({ field, input: {
    get checked() {
      return readAnnotationControl(field, controls[field.key], readStructuredValueDraft).checked;
    },
    get value() {
      return readAnnotationControl(field, controls[field.key], readStructuredValueDraft).text;
    },
    get entries() {
      return readAnnotationControl(field, controls[field.key], readStructuredValueDraft).entries;
    }
  } }));
  const snapshot = () => {
    if (!dirty) return original;
    const next = { ...current };
    for (const { field, input } of inputControls) {
      if (!changed.has(field.key)) continue;
      if (field.type === "boolean") {
        if (input.checked) next[field.key] = true;
        else delete next[field.key];
        continue;
      }
      const text = input.value.trim();
      if (!text) delete next[field.key];
      else if (field.type === "integer") next[field.key] = Number(text);
      else if (["json", "source", "namedLabels", "stringList", "stringMap", "typedMap", "stringListMap", "initialChoice", "siblings", "siblingCondition"].includes(field.type)) {
        try {
          next[field.key] = JSON.parse(text);
        } catch {
          next[field.key] = text;
        }
      } else next[field.key] = text;
    }
    return JSON.stringify(next);
  };
  const snapshotState = () => ({ format: "fullmeta-annotation-form-state/1", current: structuredClone(current), controls: structuredClone(controls), dirty, changed: [...changed] });
  return {
    annotationKey,
    ownedUiAnnotations,
    element: host,
    snapshotState,
    disable(value = true) {
      disabled = value;
      mount.update(props());
    },
    dispose() {
      mount.dispose();
      host.remove();
    },
    fields: [{
      label,
      keys: [annotationKey],
      type: "json",
      input: { get value() {
        return snapshot();
      } },
      original,
      snapshot,
      snapshotState,
      validateDraft() {
        if (dirty) validateAnnotationFormValue(JSON.parse(snapshot()), { fields, controls: inputControls, changed, validate });
      },
      validate(value) {
        validateAnnotationFormValue(value, { fields, controls: inputControls, changed, validate });
      }
    }]
  };
}
export {
  AnnotationControl,
  WidgetAnnotationEditor,
  matchesDesignCondition2 as matchesDesignCondition,
  renderWidgetAnnotationEditor
};

//# sourceMappingURL=design-annotation.js.map
