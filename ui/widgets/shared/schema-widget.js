import annotationCatalog from "../../annotation-catalog.json" with { type: "json" };
import { fieldUiBehavior } from "../../annotation-language.js";

// The annotation catalog is the data source for annotation-to-widget routing
// and specialization precedence. JavaScript keeps the generic lookup logic.
const widgetAnnotationTypes = (annotationCatalog.types || []).filter(type =>
  typeof type?.key === "string" && Array.isArray(type.widgets)
  && type.widgets.length === 1 && typeof type.widgets[0] === "string");
export const implicitWidgetAnnotations = Object.freeze(Object.fromEntries(
  widgetAnnotationTypes.map(type => [type.key, type.widgets[0]]),
));

/** Widget annotations declared as specializations in the annotation catalog. */
export const overridableWidgetAnnotations = Object.freeze(new Set(
  widgetAnnotationTypes.filter(type => Array.isArray(type.specializes) && type.specializes.length)
    .map(type => type.key),
));

export function impliedWidgetNames(schema) {
  const widget = fieldUiBehavior(schema)?.payload?.widget?.type;
  return typeof widget === "string" && widget && widget !== "tree" ? [widget] : [];
}

export function widgetFromAnnotation(schema) {
  const widget = fieldUiBehavior(schema)?.payload?.widget?.type;
  return widget && widget !== "tree" ? widget : null;
}

export function schemaWidget(schema) {
  const widget = fieldUiBehavior(schema)?.payload?.widget?.type;
  return widget && widget !== "tree" ? widget : null;
}

export function schemaWidgetOptions(schema) {
  const behavior = fieldUiBehavior(schema);
  const ui = behavior?.payload?.presentation && typeof behavior.payload.presentation === "object"
    && !Array.isArray(behavior.payload.presentation) ? behavior.payload.presentation : {};
  const widget = behavior?.payload?.widget;
  return widget
    ? { ...ui, ...widget.settings, widget: widget.type }
    : { ...ui };
}
