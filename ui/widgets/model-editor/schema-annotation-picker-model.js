import { fieldUiBehavior, legacyFieldUiView, writeFieldUiBehavior } from "../../annotation-language.js";

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

function initialValue(type) {
  switch (type) {
    case "boolean": return false;
    case "stringList": return [];
    case "stringMap": return {};
    case "json": return null;
    default: return "";
  }
}

function initialAnnotation(annotation) {
  if (Array.isArray(annotation.fields)) {
    return Object.fromEntries(annotation.fields
      .filter(field => typeof field?.key === "string" && field.key)
      .map(field => [field.key, initialValue(field.type)]));
  }
  return initialValue(annotation.type);
}

function fixedArraySize(declaration) {
  const { minItems, maxItems, prefixItems } = declaration;
  if (Number.isInteger(minItems) && minItems > 0 && minItems === maxItems) return minItems;
  if (Array.isArray(prefixItems) && prefixItems.length > 0
    && (!Number.isInteger(maxItems) || maxItems === prefixItems.length)) return prefixItems.length;
  return 0;
}

function initialType(type, declaration, isRootSchema) {
  const initial = type.initial;
  if (initial === undefined) return {};
  if (!isObject(initial)) throw new Error(`Annotation ${type.key} has an invalid initial value recipe.`);
  if (initial.kind === "literal") {
    if (!isObject(initial.value)) throw new Error(`Annotation ${type.key} needs an object initial value.`);
    return structuredClone(initial.value);
  }
  if (initial.kind === "byLocation") {
    const value = isRootSchema ? initial.root : initial.local;
    if (!isObject(value)) throw new Error(`Annotation ${type.key} needs root and local initial values.`);
    return structuredClone(value);
  }
  if (initial.kind === "fixedArrayLabels") {
    if (typeof initial.key !== "string" || !initial.key
      || typeof initial.labelTemplate !== "string" || !initial.labelTemplate
      || !Number.isInteger(initial.maximumItems) || initial.maximumItems < 1) {
      throw new Error(`Annotation ${type.key} has an invalid fixed-array initial value recipe.`);
    }
    const size = fixedArraySize(declaration);
    // A huge or variable vector needs an explicit author choice instead of guessed fields.
    return size > 0 && size <= initial.maximumItems
      ? { [initial.key]: Array.from({ length: size }, (_, index) =>
        initial.labelTemplate.replaceAll("{index}", String(index + 1))) }
      : {};
  }
  throw new Error(`Annotation ${type.key} has an unsupported initial value recipe ${initial.kind}.`);
}

export function availableEntries(declaration, catalog, isRootSchema) {
  const view = legacyFieldUiView(declaration);
  const behavior = fieldUiBehavior(declaration);
  const ui = isObject(view?.["x-fullmeta-ui"]) ? view["x-fullmeta-ui"] : {};
  const entries = [];
  for (const group of catalog?.groups || []) {
    if (!Array.isArray(group?.annotations)) continue;
    for (const annotation of group.annotations) {
      if (typeof annotation?.key !== "string" || !annotation.key || Object.hasOwn(ui, annotation.key)) continue;
      entries.push({ kind: "group", key: annotation.key, label: annotation.label || annotation.key,
        group: group.title || "UI annotations", path: ["x-fullmeta-ui-behavior", "payload", "presentation", annotation.key],
        value: initialAnnotation(annotation) });
    }
  }
  for (const field of catalog?.presentationFields || []) {
    if (typeof field?.key !== "string" || !field.key || Object.hasOwn(ui, field.key)) continue;
    entries.push({ kind: "presentation", key: field.key, label: field.label || field.key,
      group: "Presentation", path: ["x-fullmeta-ui-behavior", "payload", "presentation", field.key],
      value: initialValue(field.type) });
  }
  for (const type of catalog?.types || []) {
    if (typeof type?.key !== "string" || !type.key || Object.hasOwn(view || {}, type.key)) continue;
    const widget = type.widget || type.widgets?.[0];
    if (behavior?.payload?.widget?.type === widget) continue;
    entries.push({ kind: "type", key: type.key, label: type.label || type.key,
      group: "Widget settings", path: ["x-fullmeta-ui-behavior", "payload", "widget", "settings"],
      widget, value: initialType(type, declaration, isRootSchema) });
  }
  return entries;
}

