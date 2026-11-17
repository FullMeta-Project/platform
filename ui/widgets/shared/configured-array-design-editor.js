// Generated from configured-array-design-editor.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
import { QuantityValueControl } from "./quantity-value-control.js";
import { SchemaDesignRowControl } from "./schema-design-row-controls.js";
import {
  isRecord,
  interpolate,
  valueAtPath,
  configuredInitialValue,
  itemSchemaPropertyChoices,
  validDefaultFieldValue,
  emptyDefaultFieldValue
} from "./configured-array-model.js";
const rowDraft = (kind, value) => kind === "quantityValue" ? { expression: typeof value?.expression === "string" ? value.expression : "", unit: typeof value?.unit === "string" ? value.unit : "" } : kind === "checkbox" ? value === true : kind === "number" ? typeof value === "number" && Number.isFinite(value) ? String(value) : "" : typeof value === "string" ? value : "";
const rowRead = (kind, draft) => kind === "quantityValue" ? { ...draft } : kind === "number" ? draft === "" ? null : Number(draft) : draft;
const rowEmpty = (kind) => rowDraft(kind, void 0);
const complete = (kind, draft) => kind === "quantityValue" ? !!draft.expression.trim() : kind === "checkbox" || String(draft).trim() !== "" && (kind !== "number" || Number.isFinite(Number(draft)));
function RowControl({ kind, draft, options = {}, onChange }) {
  if (!["quantityValue", "checkbox", "text", "number"].includes(kind)) throw new Error("Unsupported schema design row control: " + kind);
  return kind === "quantityValue" ? /* @__PURE__ */ React.createElement("div", { className: "setting-inline schema-design-quantity" }, /* @__PURE__ */ React.createElement(QuantityValueControl, { ...options, draft, onChange })) : /* @__PURE__ */ React.createElement(SchemaDesignRowControl, { ...options, kind, draft, onChange });
}
function ConfiguredArrayDesignEditor({ view, onCommand }) {
  const { table, rows } = view;
  return /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail" }, /* @__PURE__ */ React.createElement("h3", null, table.heading || "Values"), /* @__PURE__ */ React.createElement("table", { className: "schema-design-form", "aria-label": table.ariaLabel || table.heading || "Array values" }, /* @__PURE__ */ React.createElement("tbody", null, rows.map((row, index) => /* @__PURE__ */ React.createElement("tr", { key: index }, (table.columns || []).map((column, position) => {
    const Cell = column.cell === "rowHeader" ? "th" : "td";
    return /* @__PURE__ */ React.createElement(Cell, { key: position }, /* @__PURE__ */ React.createElement(
      RowControl,
      {
        kind: column.control,
        draft: column.source === "rowLabel" ? row.label : row.draft,
        options: { ...column.source === "defaultValue" ? row.options : {}, label: interpolate(column.ariaLabelTemplate || (column.source === "rowLabel" ? "Item {index} label" : "Item {index} value"), { index: index + 1 }) },
        onChange: (value, event) => onCommand({ type: column.source === "rowLabel" ? "array.label" : "array.value", index, value }, event)
      }
    ));
  }))))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "sd-widget-clear-default", onClick: (event) => onCommand({ type: "array.clear" }, event) }, table.clearDefault || "Clear default"));
}
function ConfiguredVariantEditor({ view, onCommand }) {
  const { sourceFields, sourceDrafts, labels, variants, variant, variantIndex, rows, variantConfig, feedback } = view;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail" }, /* @__PURE__ */ React.createElement("h3", null, labels.componentsHeading || "Components"), sourceFields.map((field) => /* @__PURE__ */ React.createElement("label", { key: field.key }, field.label || field.key, /* @__PURE__ */ React.createElement(
    RowControl,
    {
      kind: field.control,
      draft: sourceDrafts[field.key],
      options: { label: field.label || field.key },
      onChange: (value, event) => onCommand({ type: "variant.source", key: field.key, value }, event)
    }
  )))), variants.length ? /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail", onInput: (event) => event.stopPropagation() }, /* @__PURE__ */ React.createElement("h3", null, labels.variantHeading || "Field defaults by variant"), /* @__PURE__ */ React.createElement("p", { className: "sd-note" }, labels.variantNote || "Each default is declared on this field in its source schema. Existing model values are unchanged."), /* @__PURE__ */ React.createElement("label", null, labels.variantSelector || "Variant", /* @__PURE__ */ React.createElement("select", { value: String(variantIndex), onChange: (event) => onCommand({ type: "variant.select", index: Number(event.target.value) }, event) }, variants.map((item, index) => /* @__PURE__ */ React.createElement("option", { key: index, value: String(index) }, valueAtPath(item, variantConfig.variantLabelPath) || String(index + 1))))), /* @__PURE__ */ React.createElement("table", { className: "schema-design-form", "aria-label": labels.variantTable || "Variant values" }, /* @__PURE__ */ React.createElement("tbody", null, rows.map((row, index) => /* @__PURE__ */ React.createElement("tr", { key: row.key }, /* @__PURE__ */ React.createElement("th", null, row.label), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
    RowControl,
    {
      kind: variantConfig.control,
      draft: row.draft,
      options: {
        unitReadOnly: variantConfig.unitReadOnly === true,
        label: interpolate(labels.variantComponentInitial || "Initial value", { variant: valueAtPath(variant, variantConfig.variantLabelPath) || "", component: row.label })
      },
      onChange: (value, event) => onCommand({ type: "variant.value", index, value }, event)
    }
  )))))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: (event) => onCommand({ type: "variant.apply" }, event) }, labels.applyVariant || "Apply variant values"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: (event) => onCommand({ type: "variant.save" }, event) }, labels.saveSource || "Save source document"), /* @__PURE__ */ React.createElement("p", { className: "sd-error", role: "status" }, feedback)) : null);
}
function mountVariantEditor(parent, { annotation, annotationKey, state, context, authoring, variantConfig, validate }) {
  const sourceFields = Array.isArray(variantConfig.fields) ? variantConfig.fields : [];
  let saved;
  if (typeof state === "string") try {
    saved = JSON.parse(state);
  } catch {
  }
  let sourceDrafts = Object.fromEntries(sourceFields.map((field) => [field.key, rowDraft(field.control, saved?.[field.key] ?? annotation[field.key])])), variantIndex = 0, rows = [], feedback = "", mount;
  const sourceValue = () => rowRead(sourceFields.find((field) => field.key === variantConfig.sourceKey)?.control || "text", sourceDrafts[variantConfig.sourceKey]) || "";
  let variants = context?.schemaVariants?.(sourceValue()) || [];
  const select = () => {
    variantIndex = Math.min(Math.max(0, variantIndex), Math.max(0, variants.length - 1));
    const variant = variants[variantIndex];
    rows = (valueAtPath(variant, variantConfig.componentsPath) || []).map((component) => {
      const key = valueAtPath(component, variantConfig.componentKeyPath);
      return {
        key,
        label: valueAtPath(component, variantConfig.componentLabelPath) || "",
        draft: rowDraft(variantConfig.control, configuredInitialValue(variant, component, key, variantConfig.initialValueFields, variantConfig.valueShape))
      };
    });
    feedback = "";
  };
  select();
  if (state?.format === "fullmeta-configured-variant-state/1") {
    sourceDrafts = structuredClone(state.sourceDrafts);
    variantIndex = state.variantIndex;
    variants = context?.schemaVariants?.(sourceValue()) || [];
    select();
    if (Array.isArray(state.rows) && state.rows.length === rows.length) rows = structuredClone(state.rows);
    feedback = state.feedback || "";
  }
  const host = document.createElement("div");
  parent.append(host);
  const labels = Object.fromEntries([.../* @__PURE__ */ new Set([
    ...Object.keys(authoring.labels || {}),
    ...Object.keys(variantConfig.copyKeys || {}),
    "variantHeading",
    "variantNote",
    "variantSelector",
    "variantTable",
    "variantComponentInitial",
    "applyVariant",
    "saveSource",
    "incompleteVariant"
  ])].map((key) => [key, context?.schemaVariantCopy?.[variantConfig.copyKeys?.[key] || key] || authoring.labels?.[key]]));
  const props = () => ({ view: { sourceFields, sourceDrafts, labels, variants, variant: variants[variantIndex], variantIndex, rows, variantConfig, feedback }, onCommand });
  const onCommand = async (command, event) => {
    try {
      if (command.type === "variant.source") {
        sourceDrafts = { ...sourceDrafts, [command.key]: command.value };
        variants = context?.schemaVariants?.(sourceValue()) || [];
        select();
      } else if (command.type === "variant.select") {
        variantIndex = command.index;
        select();
      } else if (command.type === "variant.value") rows = rows.map((row, index) => index === command.index ? { ...row, draft: command.value } : row);
      else if (command.type === "variant.apply") {
        if (rows.some((row) => !complete(variantConfig.control, row.draft))) throw new Error(labels.incompleteVariant || "Complete every component value.");
        const values = Object.fromEntries(rows.map((row) => {
          const value = rowRead(variantConfig.control, row.draft);
          return [row.key, isRecord(value) ? value : { [variantConfig.initialValueFields[0].valueKey]: value }];
        }));
        await context?.applySchemaVariant?.(variants[variantIndex], values);
      } else if (command.type === "variant.save") await context?.saveSchemaVariant?.(variants[variantIndex]);
      else throw new Error("Unknown variant command " + command.type);
      feedback = "";
    } catch (error) {
      feedback = error.message;
    }
    mount.update(props());
    if (command.type === "variant.source" && (!event || event.type === "click")) host.dispatchEvent(new Event("input", { bubbles: true }));
  };
  mount = mountReactComponent(host, ConfiguredVariantEditor, props());
  const snapshot = () => {
    const next = { ...annotation };
    for (const field of sourceFields) {
      const value = rowRead(field.control, sourceDrafts[field.key]);
      if (typeof value === "boolean") {
        if (value || Object.hasOwn(annotation, field.key)) next[field.key] = value;
        else delete next[field.key];
      } else if (typeof value === "string") next[field.key] = value.trim();
      else if (value == null) delete next[field.key];
      else next[field.key] = value;
    }
    return JSON.stringify(next);
  };
  const snapshotState = () => ({ format: "fullmeta-configured-variant-state/1", sourceDrafts: structuredClone(sourceDrafts), variantIndex, rows: structuredClone(rows), feedback });
  return {
    annotationKey,
    handlesDefault: true,
    usesPropertyLabel: true,
    snapshotState,
    dispose() {
      mount.dispose();
      host.remove();
    },
    fields: [{
      label: authoring.annotationLabel || "Widget settings",
      keys: [annotationKey],
      type: "json",
      input: { get value() {
        return snapshot();
      } },
      original: JSON.stringify(annotation),
      snapshot,
      snapshotState,
      validate(value) {
        if (typeof value[variantConfig.sourceKey] !== "string" || !value[variantConfig.sourceKey].trim()) throw new Error(variantConfig.sourceRequiredMessage || "Enter a source value.");
        validate?.(value);
      }
    }]
  };
}
function renderConfiguredArrayDesignEditor(parent, schema, { source, state, defaultState, context, configuration, validate } = {}) {
  const authoring = configuration?.authoring || {}, annotationKey = configuration?.annotation || authoring.annotation, annotation = source?.[annotationKey] ?? schema?.[annotationKey];
  if (!isRecord(annotation) || !annotationKey) return null;
  if (authoring.variantEditor && typeof annotation[authoring.variantEditor.sourceKey] === "string")
    return mountVariantEditor(parent, { annotation, annotationKey, state, context, authoring, variantConfig: authoring.variantEditor, validate });
  const table = authoring.arrayTable;
  if (!isRecord(table)) return null;
  const rowLabels = annotation[table.rowLabelsKey];
  if (!Array.isArray(rowLabels) || !rowLabels.length) return null;
  const minimum = Number.isInteger(schema.minItems) ? schema.minItems : Number.isInteger(table.minimumItemsFallback) ? table.minimumItemsFallback : 1, maximum = Number.isInteger(schema.maxItems) ? schema.maxItems : rowLabels.length, editableMaximum = Number.isInteger(table.maximumEditableItems) ? table.maximumEditableItems : 32, count = maximum >= rowLabels.length && maximum <= editableMaximum ? maximum : rowLabels.length;
  const fields = table.defaultValueFields, unsafe = (value2) => typeof value2 !== "string" || !value2 || ["__proto__", "constructor", "prototype"].includes(value2);
  if (!Array.isArray(fields) || !fields.length || fields.some((field) => !isRecord(field) || unsafe(field.valueKey) || unsafe(field.targetProperty) || field.type !== void 0 && !["string", "boolean", "number"].includes(field.type) || field.choicesSource !== void 0 && field.choicesSource !== "itemSchema" || field.controlOption !== void 0 && unsafe(field.controlOption)))
    throw new Error("The array default field mapping is invalid.");
  if (new Set(fields.map((field) => field.valueKey)).size !== fields.length || new Set(fields.map((field) => field.targetProperty)).size !== fields.length)
    throw new Error("The array default field mapping has duplicate keys.");
  const defaultColumn = (table.columns || []).find((column) => column.source === "defaultValue"), labelColumn = (table.columns || []).find((column) => column.source === "rowLabel");
  if (defaultColumn?.valueShape === "scalar" && fields.length !== 1) throw new Error("A scalar array default needs one value field.");
  if ((table.columns || []).some((column) => !["defaultValue", "rowLabel"].includes(column.source))) throw new Error("Unsupported array column source.");
  let savedLabels;
  if (typeof state === "string") try {
    savedLabels = JSON.parse(state)?.[table.rowLabelsKey];
  } catch {
  }
  const original = Object.hasOwn(source || {}, table.defaultValueKey) ? JSON.stringify(source[table.defaultValueKey]) : "";
  let defaults;
  try {
    defaults = JSON.parse(typeof defaultState === "string" ? defaultState : original);
  } catch {
  }
  const choices = Array.from({ length: count }, (_, index) => Object.fromEntries(fields.map((field) => [field.valueKey, field.choicesSource === "itemSchema" ? [...new Set(itemSchemaPropertyChoices(context, index, field.targetProperty).filter(Boolean))] : []])));
  let dirty = typeof defaultState === "string" && defaultState !== original, cleared = false, rows = Array.from({ length: count }, (_, index) => {
    const initial = Object.fromEntries(fields.map((field) => [field.valueKey, defaults?.[index]?.[field.targetProperty]]));
    return {
      label: rowDraft(labelColumn?.control || "text", savedLabels?.[index] ?? rowLabels[index] ?? ""),
      draft: rowDraft(defaultColumn?.control || "text", defaultColumn?.valueShape === "scalar" ? initial[fields[0].valueKey] : initial),
      options: Object.fromEntries(fields.filter((field) => field.controlOption).map((field) => [field.controlOption, choices[index][field.valueKey]]))
    };
  }), mount;
  if (state?.format === "fullmeta-configured-array-state/1") {
    rows = structuredClone(state.rows);
    dirty = state.dirty;
    cleared = state.cleared;
  }
  const host = document.createElement("div");
  parent.append(host);
  const props = () => ({ view: { table, rows }, onCommand });
  const onCommand = (command, event) => {
    if (command.type === "array.clear") {
      rows = rows.map((row) => ({ ...row, draft: rowEmpty(defaultColumn?.control || "text") }));
      dirty = true;
      cleared = true;
    } else if (command.type === "array.label") rows = rows.map((row, index) => index === command.index ? { ...row, label: command.value } : row);
    else if (command.type === "array.value") {
      rows = rows.map((row, index) => index === command.index ? { ...row, draft: command.value } : row);
      dirty = true;
      cleared = false;
    } else throw new Error("Unknown configured array command " + command.type);
    mount.update(props());
    if (!event || event.type === "click") host.dispatchEvent(new Event("input", { bubbles: true }));
  };
  mount = mountReactComponent(host, ConfiguredArrayDesignEditor, props());
  const labels = () => {
    const next = { ...annotation, [table.rowLabelsKey]: labelColumn ? rows.map((row) => rowRead(labelColumn.control, row.label)) : [] };
    for (const key of table.omitAnnotationKeysWhenSaving || []) delete next[key];
    return JSON.stringify(next);
  };
  const value = () => {
    if (!dirty) return original;
    if (cleared) return "";
    const entries = defaultColumn ? rows.map((row, index) => {
      const read = rowRead(defaultColumn.control, row.draft), value2 = isRecord(read) ? read : fields.length === 1 ? { [fields[0].valueKey]: read } : {};
      return { ...isRecord(defaults?.[index]) ? defaults[index] : {}, ...Object.fromEntries(fields.map((field) => [field.targetProperty, value2[field.valueKey] ?? (field.type === "boolean" ? false : "")])) };
    }) : [];
    while (entries.length && fields.every((field) => emptyDefaultFieldValue(entries.at(-1)[field.targetProperty]))) entries.pop();
    return entries.length ? JSON.stringify(entries) : "";
  };
  const snapshotState = () => ({ format: "fullmeta-configured-array-state/1", rows: structuredClone(rows), dirty, cleared });
  return { annotationKey, handlesDefault: true, usesPropertyLabel: true, snapshotState, dispose() {
    mount.dispose();
    host.remove();
  }, fields: [
    {
      label: authoring.annotationLabel || table.annotationLabel || "Array labels",
      keys: [annotationKey],
      type: "json",
      input: { get value() {
        return labels();
      } },
      original: JSON.stringify(annotation),
      snapshot: labels,
      snapshotState,
      validate(value2) {
        const names = value2?.[table.rowLabelsKey];
        if (!Array.isArray(names) || names.length !== (labelColumn ? rows.length : 0) || names.some((label) => typeof label !== "string" || !label.trim())) throw new Error(table.labelsValidationMessage || "Every row needs a nonempty label.");
        validate?.(value2);
      }
    },
    {
      label: authoring.defaultLabel || table.defaultLabel || (authoring.annotationLabel || table.annotationLabel || "Array labels") + " default",
      keys: [table.defaultValueKey],
      type: "json",
      input: { get value() {
        return value();
      } },
      original,
      snapshot: value,
      snapshotState,
      validate(value2) {
        if (!Array.isArray(value2) || value2.length < minimum || value2.length > maximum || value2.length > (defaultColumn ? rows.length : 0) || value2.some((entry, index) => !entry || fields.some((field) => !validDefaultFieldValue(entry[field.targetProperty], field, choices[index][field.valueKey]))))
          throw new Error(table.defaultValidationMessage || "Complete the array default or clear it.");
      }
    }
  ] };
}
export {
  ConfiguredArrayDesignEditor,
  ConfiguredVariantEditor,
  renderConfiguredArrayDesignEditor
};

//# sourceMappingURL=configured-array-design-editor.js.map
