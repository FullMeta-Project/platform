import { FIELD_UI_BEHAVIOR_KEY, UI_BEHAVIOR_FORMAT, fieldUiBehavior, legacyFieldUiView } from "../../annotation-language.js";
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => structuredClone(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const compactFieldTypes = new Set(["text", "boolean", "stringList", "stringMap", "typedValue", "json"]);
const MODEL_REFERENCE_KEY = "x-fullmeta-modelReference";

function simpleReferenceFilter(targetSchema) {
  if (!isObject(targetSchema)) return null;
  const { type, properties, required } = targetSchema;
  if (type !== "object" || !isObject(properties) || !Array.isArray(required)
    || Object.keys(targetSchema).some(key => !["type", "properties", "required"].includes(key))) return null;
  const keys = Object.keys(properties);
  if (keys.length !== 1 || required.length !== 1 || required[0] !== keys[0]) return null;
  const propertySchema = properties[keys[0]];
  if (!isObject(propertySchema) || Object.keys(propertySchema).length !== 1
    || typeof propertySchema.const !== "string") return null;
  return { property: keys[0], value: propertySchema.const };
}

export function referenceDraftForSchema(schema) {
  const reference = isObject(schema?.[MODEL_REFERENCE_KEY]) ? schema[MODEL_REFERENCE_KEY] : null;
  const filter = simpleReferenceFilter(reference?.targetSchema);
  return {
    enabled: Boolean(reference),
    scope: typeof reference?.scope === "string" ? reference.scope : "",
    targetPath: Array.isArray(reference?.targetPath) ? reference.targetPath.map(String).join(".") : "",
    targetLabel: typeof reference?.targetLabel === "string" ? reference.targetLabel : "",
    filterMode: reference && Object.hasOwn(reference, "targetSchema") && !filter ? "advanced" : "simple",
    filterProperty: filter?.property || "",
    filterValue: filter?.value || "",
  };
}

export function schemaWithReferenceDraft(schema, draft, baseline) {
  const next = clone(schema);
  if (!draft.enabled) {
    delete next[MODEL_REFERENCE_KEY];
    return next;
  }
  const existing = isObject(next[MODEL_REFERENCE_KEY]);
  const pathChanged = draft.targetPath !== baseline?.targetPath;
  const filterChanged = draft.filterProperty !== baseline?.filterProperty || draft.filterValue !== baseline?.filterValue;
  if (filterChanged && ((draft.filterProperty.trim() && !draft.filterValue.trim())
    || (!draft.filterProperty.trim() && draft.filterValue.trim()))) {
    throw new Error("Enter both a filter property and the value it must equal.");
  }
  const reference = isObject(next[MODEL_REFERENCE_KEY]) ? clone(next[MODEL_REFERENCE_KEY]) : {};
  if (draft.scope !== baseline?.scope) {
    if (draft.scope) reference.scope = draft.scope;
    else delete reference.scope;
  }
  if (pathChanged || !existing) {
    const path = draft.targetPath.trim().split('.').map(part => part.trim());
    if (path.some(part => !part)) throw new Error('Enter a target path using property keys separated by dots.');
    reference.targetPath = path;
  }
  if (draft.targetLabel !== baseline?.targetLabel) {
    if (draft.targetLabel.trim()) reference.targetLabel = draft.targetLabel.trim();
    else delete reference.targetLabel;
  }
  if (draft.filterMode === "simple" && (draft.filterProperty !== baseline?.filterProperty
    || draft.filterValue !== baseline?.filterValue)) {
    if (draft.filterProperty.trim()) {
      const property = draft.filterProperty.trim();
      const previous = isObject(reference.targetSchema) ? reference.targetSchema : {};
      const oldProperty = previous.properties?.[baseline?.filterProperty];
      reference.targetSchema = { ...clone(previous), type: 'object', required: [property],
        properties: { [property]: { ...(isObject(oldProperty) ? clone(oldProperty) : {}), const: draft.filterValue.trim() } } };
    } else delete reference.targetSchema;
  }
  next[MODEL_REFERENCE_KEY] = reference;
  return next;
}

export function schemaWithWidget(schema, widget, catalog) {
  const next = clone(schema);
  const prior = fieldUiBehavior(next);
  const payload = isObject(prior?.payload) ? clone(prior.payload) : {};
  if (!prior && isObject(next[FIELD_UI_BEHAVIOR_KEY])) return next;
  if (!prior) {
    const presentation = isObject(next["x-fullmeta-ui"]) ? clone(next["x-fullmeta-ui"]) : {};
    for (const field of catalog?.presentationFields || []) {
      if (Object.hasOwn(next, field?.legacyKey)) presentation[field.key] = clone(next[field.legacyKey]);
      if (field?.legacyKey) delete next[field.legacyKey];
    }
    if (Object.keys(presentation).length) payload.presentation = presentation;
  }
  let legacySettings = null;
  for (const type of catalog?.types || []) {
    const candidateWidget = type?.widget || (Array.isArray(type?.widgets) && type.widgets.length === 1
      ? type.widgets[0] : null);
    if (candidateWidget === widget && Object.hasOwn(next, type.key) && isObject(next[type.key])) {
      legacySettings = clone(next[type.key]);
    }
    if (type?.key) delete next[type.key];
  }
  if (!prior) delete next["x-fullmeta-ui"];
  if (widget) {
    const priorWidget = prior?.payload?.widget;
    const settings = priorWidget?.type === widget && isObject(priorWidget.settings)
      ? clone(priorWidget.settings) : legacySettings ? clone(legacySettings) : {};
    payload.widget = { ...(priorWidget?.type === widget ? priorWidget : {}), type: widget, settings };
  } else {
    delete payload.widget;
  }
  if (!Object.keys(payload).length) {
    delete next[FIELD_UI_BEHAVIOR_KEY];
    return next;
  }
  next[FIELD_UI_BEHAVIOR_KEY] = {
    ...(prior || {}),
    format: UI_BEHAVIOR_FORMAT,
    target: { ...(prior?.target || {}), kind: "field" },
    context: "projectEditing",
    payload,
  };
  return next;
}

function supportedAnnotation(annotation) {
  if (Array.isArray(annotation?.fields)) {
    return annotation.fields.length > 0 && annotation.fields.every(field => compactFieldTypes.has(field?.type));
  }
  return compactFieldTypes.has(annotation?.type);
}

export function compactCatalog(catalog) {
  if (!isObject(catalog)) return null;
  return {
    ...catalog,
    groups: (catalog.groups || []).map(group => ({
      ...group,
      annotations: (group.annotations || []).filter(annotation =>
        annotation?.key !== "widget" && supportedAnnotation(annotation)),
    })),
    presentationFields: (catalog.presentationFields || []).filter(field => compactFieldTypes.has(field?.type)),
  };
}

export function annotationDefinitions(catalog) {
  const definitions = new Map();
  for (const group of catalog?.groups || []) {
    for (const annotation of group.annotations || []) {
      if (annotation?.key && supportedAnnotation(annotation)) definitions.set(annotation.key, annotation);
    }
  }
  for (const field of catalog?.presentationFields || []) {
    if (field?.key && compactFieldTypes.has(field.type) && !definitions.has(field.key)) {
      definitions.set(field.key, { key: field.key, label: field.label || field.key, type: field.type });
    }
  }
  return [...definitions.values()];
}

function initialPresentationValue(annotation) {
  if (Array.isArray(annotation.fields)) return {};
  if (annotation.type === "boolean") return false;
  if (annotation.type === "stringList") return [];
  if (annotation.type === "stringMap") return {};
  return "";
}

export function schemaWithPresentationDefaults(schema, keys, definitions) {
  if (!keys.size) return schema;
  const next = clone(schema);
  const view = legacyFieldUiView(next);
  const presentation = isObject(view["x-fullmeta-ui"]) ? clone(view["x-fullmeta-ui"]) : {};
  for (const annotation of definitions) {
    if (keys.has(annotation.key) && !Object.hasOwn(presentation, annotation.key)) {
      presentation[annotation.key] = initialPresentationValue(annotation);
    }
  }
  const behavior = fieldUiBehavior(next);
  next[FIELD_UI_BEHAVIOR_KEY] = {
    ...(behavior || {}),
    format: UI_BEHAVIOR_FORMAT,
    target: { ...(behavior?.target || {}), kind: "field" },
    context: "projectEditing",
    payload: { ...(behavior?.payload || {}), presentation },
  };
  delete next["x-fullmeta-ui"];
  return next;
}

