import annotationCatalog from "./annotation-catalog.json" with { type: "json" };

export const UI_BEHAVIOR_FORMAT = "fullmeta-ui-behavior/1";
export const FIELD_UI_BEHAVIOR_KEY = "x-fullmeta-ui-behavior";

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const schemaEditorRoot = value => isRecord(value)
  && (typeof value.$schema === "string" || typeof value["x-fullmeta-schema"] === "string");
const annotationTypes = (annotationCatalog.types || []).map(type => ({
  key: type?.key,
  widget: typeof type?.widget === "string" ? type.widget
    : Array.isArray(type?.widgets) && type.widgets.length === 1 ? type.widgets[0] : null,
})).filter(type => typeof type.key === "string" && typeof type.widget === "string");
const widgetByLegacyKey = new Map(annotationTypes.map(type => [type.key, type.widget]));
const legacyKeyByWidget = new Map(annotationTypes.map(type => [type.widget, type.key]));

const presentationLegacyKeys = Object.freeze({
  "x-fullmeta-ui-icon": "icon",
});
const legacyPresentationKeys = Object.freeze(Object.fromEntries(
  Object.entries(presentationLegacyKeys).map(([legacy, key]) => [key, legacy]),
));

export function fieldUiBehaviorIssue(value) {
  if (!isRecord(value)) return "The UI behavior annotation must be an object.";
  if (value.format !== UI_BEHAVIOR_FORMAT) return `Expected ${UI_BEHAVIOR_FORMAT}.`;
  if (!isRecord(value.target) || value.target.kind !== "field") {
    return "A field UI behavior must declare target.kind as field.";
  }
  if (value.context !== "projectEditing") {
    return "A field UI behavior must use the projectEditing context.";
  }
  if (!isRecord(value.payload)) return "A field UI behavior payload must be an object.";
  if (value.payload.presentation !== undefined && !isRecord(value.payload.presentation)) {
    return "Field presentation settings must be an object.";
  }
  if (value.payload.widget !== undefined) {
    const widget = value.payload.widget;
    if (!isRecord(widget) || typeof widget.type !== "string" || !widget.type
      || !isRecord(widget.settings)) {
      return "Field widget settings need a widget type and object settings.";
    }
  }
  return null;
}

export function schemaAuthoringWidgetProfileIssue(value, name) {
  if (!isRecord(value)) return `Widget profile ${name} must be an object.`;
  if (value.format !== UI_BEHAVIOR_FORMAT) return `Widget profile ${name} must use ${UI_BEHAVIOR_FORMAT}.`;
  if (value.context !== "schemaAuthoring") return `Widget profile ${name} must use the schemaAuthoring context.`;
  if (!isRecord(value.target) || value.target.kind !== "widget" || value.target.name !== name) {
    return `Widget profile ${name} must target widget ${name}.`;
  }
  if (!isRecord(value.payload)) return `Widget profile ${name} payload must be an object.`;
  if (typeof value.payload.annotationKey !== "string" || !value.payload.annotationKey
    || !isRecord(value.payload.authoring)) {
    return `Widget profile ${name} needs an annotationKey and authoring description.`;
  }
  return null;
}

export function fieldUiBehavior(schema, { context } = {}) {
  if (!isRecord(schema)) return null;
  const declared = schema[FIELD_UI_BEHAVIOR_KEY];
  if (declared === undefined || fieldUiBehaviorIssue(declared)) return null;
  if (context && declared.context !== context) return null;
  return declared;
}

/** Project v1 field annotations into the in-memory shape used by existing renderers. */
export function legacyFieldUiView(schema, options = {}) {
  if (!isRecord(schema)) return schema;
  const behavior = fieldUiBehavior(schema, options);
  if (!behavior && schemaEditorRoot(schema)) return schema;
  const view = { ...schema };
  delete view["x-fullmeta-ui"];
  for (const key of Object.keys(presentationLegacyKeys)) delete view[key];
  for (const key of widgetByLegacyKey.keys()) delete view[key];
  if (!behavior) return view;
  const presentation = isRecord(behavior.payload.presentation) ? behavior.payload.presentation : {};
  view["x-fullmeta-ui"] = structuredClone(presentation);
  for (const [key, legacyKey] of Object.entries(legacyPresentationKeys)) {
    if (Object.hasOwn(presentation, key)) view[legacyKey] = structuredClone(presentation[key]);
  }
  const widget = behavior.payload.widget;
  if (isRecord(widget)) {
    const legacyKey = legacyKeyByWidget.get(widget.type);
    if (legacyKey) view[legacyKey] = structuredClone(widget.settings);
  }
  return view;
}

/** Encode the renderer's editable view as the canonical field-targeted v1 envelope. */
export function writeFieldUiBehavior(schema, { context } = {}) {
  if (!isRecord(schema)) throw new Error("A field UI behavior requires a schema declaration.");
  const prior = fieldUiBehavior(schema);
  if (schemaEditorRoot(schema) && !prior) return schema;
  const presentation = isRecord(schema["x-fullmeta-ui"])
    ? structuredClone(schema["x-fullmeta-ui"])
    : prior && isRecord(prior.payload.presentation) ? structuredClone(prior.payload.presentation) : {};
  let widgetEntries = Object.entries(schema).filter(([key, settings]) =>
    widgetByLegacyKey.has(key) && isRecord(settings));
  for (const [legacyKey, presentationKey] of Object.entries(presentationLegacyKeys)) {
    if (!Object.hasOwn(presentation, presentationKey) && Object.hasOwn(schema, legacyKey)) {
      presentation[presentationKey] = structuredClone(schema[legacyKey]);
    }
  }
  const selected = typeof presentation.widget === "string" && presentation.widget
    ? presentation.widget : prior?.payload?.widget?.type || null;
  if (widgetEntries.length > 1) {
    if (!selected) throw new Error("A field can declare settings for only one widget.");
    widgetEntries = widgetEntries.filter(([key]) => widgetByLegacyKey.get(key) === selected);
    if (widgetEntries.length > 1) throw new Error("A field can declare settings for only one widget.");
  }
  delete presentation.widget;
  const [legacyWidgetKey, legacyWidgetSettings] = widgetEntries[0] || [];
  const type = selected || (legacyWidgetKey ? widgetByLegacyKey.get(legacyWidgetKey) : null);
  const payload = prior && isRecord(prior.payload) ? structuredClone(prior.payload) : {};
  if (Object.keys(presentation).length) payload.presentation = presentation;
  else delete payload.presentation;
  if (type) {
    const priorSettings = prior?.payload?.widget?.type === type && isRecord(prior.payload.widget.settings)
      ? structuredClone(prior.payload.widget.settings) : {};
    const settings = legacyWidgetKey && widgetByLegacyKey.get(legacyWidgetKey) === type
      ? structuredClone(legacyWidgetSettings)
      : priorSettings;
    const priorWidget = prior?.payload?.widget?.type === type && isRecord(prior.payload.widget)
      ? structuredClone(prior.payload.widget) : {};
    payload.widget = { ...priorWidget, type, settings };
  } else {
    delete payload.widget;
  }

  const next = { ...schema };
  delete next["x-fullmeta-ui"];
  for (const legacyKey of Object.keys(presentationLegacyKeys)) delete next[legacyKey];
  for (const legacyKey of widgetByLegacyKey.keys()) delete next[legacyKey];
  delete next[FIELD_UI_BEHAVIOR_KEY];
  if (Object.keys(payload).length) {
    next[FIELD_UI_BEHAVIOR_KEY] = {
      ...(prior || {}),
      format: UI_BEHAVIOR_FORMAT,
      target: { ...(prior?.target || {}), kind: "field" },
      context: prior?.context || context || "projectEditing",
      payload,
    };
  }
  return next;
}

export function widgetProfilePayload(profile) {
  const issue = schemaAuthoringWidgetProfileIssue(profile, profile?.target?.name || "(unknown)");
  if (issue) return null;
  return { ...profile.payload, annotation: profile.payload.annotationKey };
}
