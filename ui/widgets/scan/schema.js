/** Schema helpers shared by one scan and a table of scans. */
import { schemaWidgetOptions } from "../shared/schema-widget.js";

export function scanFieldSchema(context, path, options) {
  return context.resolveSchema(context.schemaAtPath(path, options)) || {};
}

export function scanRowConfiguration(context, schema, rows, index, tableUi = {}) {
  const rowSchema = context.resolveSchema(context.schemaItem(schema, rows, index)) || {};
  const rowUi = schemaWidgetOptions(rowSchema);
  return { schema: rowSchema, ui: { ...rowUi, labels: { ...(tableUi.labels || {}), ...(rowUi.labels || {}) } } };
}

export function scanModes(context, path, ui = {}) {
  return scanModesForSchema(context, scanFieldSchema(context, path, { resolveVariant: false }), ui);
}

export function scanModesForSchema(context, schemaNode, ui = {}) {
  const schema = context.resolveSchema(schemaNode) || {};
  return (schema.oneOf || []).flatMap((node) => {
    const variant = context.resolveSchema(node) || {};
    const discriminator = Object.entries(variant.properties || {}).find(([, property]) =>
      Object.hasOwn(context.resolveSchema(property) || {}, "const"));
    if (!discriminator) return [];
    const [typeKey, typeNode] = discriminator;
    const typeSchema = context.resolveSchema(typeNode) || {};
    const fields = Object.entries(variant.properties || {})
      .filter(([key]) => key !== typeKey)
      .map(([key, property]) => ({ key, schema: context.resolveSchema(property) || {} }));
    const array = fields.find(({ schema: field }) => field.type === "array");
    let quantities = fields.filter(({ schema: field }) => field.type === "object");
    let count = fields.find(({ schema: field }) => field.type === "integer" || field.type === "number");
    const names = [ui.rangeStartProperty, ui.rangeEndProperty, ui.rangeCountProperty];
    if (!array && names.some(value => value !== undefined)) {
      if (names.some(value => typeof value !== "string" || !value) || new Set(names).size !== 3)
        throw new Error("Scan range bindings require distinct start, end and count property names.");
      quantities = names.slice(0, 2).map(key => fields.find(field => field.key === key && field.schema.type === "object"));
      count = fields.find(field => field.key === names[2] && ["integer", "number"].includes(field.schema.type));
      if (quantities.some(field => !field) || !count) throw new Error("Scan range bindings must identify two quantity fields and a numeric count field.");
    }
    return [{ type: typeSchema.const, typeKey, label: variant.title || String(typeSchema.const),
      typeLabel: typeSchema.title || "Mode", description: variant.description || "",
      array, quantities, count }];
  });
}

/** Resolve a stored mode using the discriminator key declared by its schema. */
export function scanModeForValue(modes, value) {
  return modes.find((mode) => Object.is(value?.[mode.typeKey], mode.type));
}

export function scanChoiceRecords(context, ui) {
  return scanChoiceProviderResult(context, ui).records;
}

/** Normalize a synchronous scan-choice provider result for shared scan editors. */
export function scanChoiceProviderResult(context, ui) {
  try {
    const supplied = context.choiceRecords?.(ui.choiceSource);
    if (supplied == null) return { records: [], error: null };
    if (!Array.isArray(supplied)) return { records: [], error: 'Choice provider returned invalid records.' };
    return { records: supplied, error: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { records: [], error: `Could not load scan choices: ${detail || 'Unknown provider error.'}` };
  }
}

export function scanChoiceValue(record, ui) {
  return record?.[ui.choiceValueProperty];
}

export function scanChoiceLabel(context, record, ui) {
  return context.formatChoiceLabel?.(ui.choiceLabelTemplate, record)
    || record?.description || String(scanChoiceValue(record, ui) ?? "");
}

export function scanFallbackQuantity(record, ui) {
  return {
    expression: String(record?.[ui.sourceExpressionProperty || "expression"] ?? "1"),
    unit: String(record?.[ui.sourceUnitProperty || "unit"] ?? "1"),
  };
}
