/** Pure condition/validation contract retained from the accepted authoring form. */
export function matchesDesignCondition(values, condition, { schema, source, annotation } = {}) {
  if (!condition) return true;
  if (typeof condition === "function") return condition(values);
  const environment = { schema, source, annotation: annotation || values };
  if (Array.isArray(condition.all)) return condition.all.every(entry => matchesDesignCondition(values, entry, environment));
  if (Array.isArray(condition.any)) return condition.any.some(entry => matchesDesignCondition(values, entry, environment));
  if (condition.not) return !matchesDesignCondition(values, condition.not, environment);
  const parts = typeof condition.path === "string" ? condition.path.split(".")
    : typeof condition.field === "string" ? ["annotation", condition.field] : [];
  if (!parts.length) return true;
  let owner = parts[0] === "schema" ? schema : parts[0] === "source" ? source : annotation || values;
  for (const part of parts.slice(1, -1)) owner = owner?.[part];
  const key = parts.at(-1);
  const present = owner !== null && typeof owner === "object" && Object.hasOwn(owner, key);
  const value = owner?.[key];
  if (Object.hasOwn(condition, "equals")) return value === condition.equals;
  if (Object.hasOwn(condition, "notEquals")) return value !== condition.notEquals;
  if (condition.present === true) return present;
  if (condition.present === false) return !present;
  return true;
}

export function validateAnnotationFormValue(value, {fields, controls, changed, validate}) {

        for (const field of fields) {
          const entry = value[field.key];
          if (field.required && (entry === undefined || entry === "")) {
            throw new Error(field.requiredMessage || `${field.label} is required.`);
          }
          if (entry === undefined) continue;
          if (field.type === "integer" && (!Number.isInteger(entry) || entry < (field.minimum ?? 0)
            || field.maximum !== undefined && entry > field.maximum)
            || field.type === "json" && (typeof entry !== "object" || entry === null)
            || ["source", "namedLabels", "stringMap", "typedMap", "stringListMap", "initialChoice", "siblingCondition"].includes(field.type) && (typeof entry !== "object" || entry === null || Array.isArray(entry))
            || field.type === "siblings" && (!Array.isArray(entry) || !entry.length
              || entry.some(sibling => !Array.isArray(sibling?.path) || !sibling.path.length
                || sibling.path.some(part => typeof part !== "string" || !part.trim())
                || sibling.label !== undefined && (typeof sibling.label !== "string" || !sibling.label.trim())))
            || field.type === "stringList" && (!Array.isArray(entry) || entry.some(part => typeof part !== "string" || !part.trim()))
            || field.type === "boolean" && typeof entry !== "boolean"
            || !["integer", "json", "source", "namedLabels", "stringList", "stringMap", "typedMap", "stringListMap", "initialChoice", "siblings", "siblingCondition", "boolean"].includes(field.type) && typeof entry !== "string"
            || field.nonBlank && typeof entry === "string" && !entry.trim()
            || field.options && !field.options.includes(entry)) {
            throw new Error(field.validationMessage || `${field.label} has an invalid value.`);
          }
          if (field.type === "source" && (field.scopes && !field.scopes.includes(entry.scope)
            || field.pathMinimumItems !== undefined && (!Array.isArray(entry.path)
              || entry.path.length < field.pathMinimumItems
              || entry.path.some(part => typeof part !== "string" || !part.trim())))) {
            throw new Error(field.validationMessage || `${field.label} needs a valid scope and path.`);
          }
        }
        for (const { field, input } of controls) {
          if (["stringMap", "initialChoice"].includes(field.type) && changed.has(field.key)) {
            const names = input.entries.map(([key]) => key);
            if (input.entries.some(([key, text]) => !key || !text) || new Set(names).size !== names.length) {
              throw new Error(`${field.label} needs unique keys and nonempty text in every row.`);
            }
          }
          if (field.type === "typedMap" && changed.has(field.key)) {
            const entries = input.entries;
            if (entries.some(({ key, kind, text, value }) => !key
              || kind === "number" && (!text.trim() || !Number.isFinite(value))
              || ["array", "object"].includes(kind) && (typeof value !== "object" || value === null || Array.isArray(value) !== (kind === "array")))
              || new Set(entries.map(({ key }) => key)).size !== entries.length) {
              throw new Error(`${field.label} needs unique property names and valid values.`);
            }
          }
          if (field.type === "siblingCondition" && changed.has(field.key)
            && (!input.entries.property || !input.entries.valid)) {
            throw new Error(`${field.label} needs a sibling property and matching value.`);
          }
          if (field.type === "stringListMap" && changed.has(field.key)) {
            const names = input.entries.map(([key]) => key);
            if (input.entries.some(([key, values]) => !key || values.some(value => !value)
              || new Set(values).size !== values.length) || new Set(names).size !== names.length) {
              throw new Error(`${field.label} needs unique keys and nonempty, unique values.`);
            }
          }
        }
        validate?.(value);
      
}
