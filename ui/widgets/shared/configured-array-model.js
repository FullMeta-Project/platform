/** Pure configured-array interpretation and validation; no DOM dependency. */
export const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function interpolate(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}

export function valueAtPath(value, path) {
  return (Array.isArray(path) ? path : []).reduce((current, key) => current?.[key], value);
}

export function configuredInitialValue(variant, component, key, fields, shape) {
  if (!Array.isArray(fields) || !fields.length) {
    throw new Error("The variant initial-value mapping is missing.");
  }
  const entries = fields.map(field => {
    if (!isRecord(field)) throw new Error("The variant initial-value mapping is invalid.");
    const source = field.source === "component" ? component
      : field.source === "variantKeyed" ? variant : null;
    if (!source || typeof field.valueKey !== "string" || !field.valueKey
      || !Array.isArray(field.path) || !field.path.length
      || field.path.some(part => typeof part !== "string" || !part
        || ["__proto__", "constructor", "prototype"].includes(part))) {
      throw new Error("The variant initial-value mapping is invalid.");
    }
    const value = valueAtPath(source, field.path);
    return [field.valueKey, field.source === "variantKeyed" ? value?.[key] ?? "" : value ?? ""];
  });
  if (shape === "scalar") {
    if (entries.length !== 1) throw new Error("A scalar variant needs one initial-value field.");
    return entries[0][1];
  }
  return Object.fromEntries(entries);
}

export function itemSchemaPropertyChoices(context, index, property) {
  if (!property) return [];
  for (const part of context?.parts || []) {
    const item = Array.isArray(part.schema?.prefixItems) && part.schema.prefixItems[index]
      ? context.child(part, "prefixItems", index)
      : part.schema?.items ? context.child(part, "items") : null;
    if (!item) continue;
    for (const resolved of context.resolve(item).parts || []) {
      const propertySchema = resolved.schema?.properties?.[property];
      if (!propertySchema) continue;
      const propertyNode = context.child(resolved, "properties", property);
      const choices = propertyNode && context.resolve(propertyNode).schema?.enum;
      if (Array.isArray(choices)) return choices.filter(choice => typeof choice === "string");
    }
  }
  return [];
}

export function validDefaultFieldValue(value, field, choices) {
  const type = field.type || "string";
  if (type === "string") {
    if (typeof value !== "string" || field.required && !value.trim()) return false;
  } else if (type === "boolean") {
    if (typeof value !== "boolean") return false;
  } else if (type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return false;
  } else return false;
  return !choices.length || choices.includes(value);
}

export function emptyDefaultFieldValue(value) {
  return value === undefined || value === null
    || typeof value === "string" && !value.trim();
}

