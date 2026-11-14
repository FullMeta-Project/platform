import { jsonPointerPath } from "../../../js/services.js";

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const validPath = path => Array.isArray(path) && path.length > 0
  && path.every(key => typeof key === "string" && key
    && !["__proto__", "constructor", "prototype"].includes(key));
function at(value, path) {
  if (!validPath(path)) throw new Error("The component variant path mapping is invalid.");
  return path.reduce((current, key) => current && Object.hasOwn(current, key) ? current[key] : undefined, value);
}
function presentValue(value, type) {
  if (type === "boolean") return typeof value === "boolean";
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string" && !!value.trim();
}

/** Resolve a variant's source anchor without reading or changing its document. */
export function componentVariantSourcePath(variant) {
  const pointer = variant?.pointer;
  if (typeof pointer !== "string" || pointer !== "#" && !pointer.startsWith("#/")
    || /~(?![01])/.test(pointer)) {
    throw new Error("The component variant has an invalid source pointer.");
  }
  try { decodeURIComponent(pointer); }
  catch { throw new Error("The component variant has an invalid source pointer."); }
  const path = jsonPointerPath(pointer);
  if (!path?.length || path.some(key => ["__proto__", "constructor", "prototype"].includes(key))) {
    throw new Error("The component variant has an invalid source pointer.");
  }
  return path;
}

/**
 * Return an edited field declaration while retaining unrelated schema fields,
 * existing default properties and entries beyond the variant.
 * The caller applies this value at the variant's source file and pointer.
 */
export function fieldWithVariantRowValues(field, variant, rowValues, configuration = {}) {
  if (!isRecord(field)) throw new Error("The component field declaration is unavailable.");
  const components = at(variant, configuration.componentsPath || ["components"]);
  if (!Array.isArray(components) || !components.length) {
    throw new Error("The component variant needs a nonempty component list.");
  }
  const keys = components.map(component => at(component, configuration.componentKeyPath || ["key"]));
  if (keys.some(key => typeof key !== "string" || !key.trim()
    || ["__proto__", "constructor", "prototype"].includes(key)) || new Set(keys).size !== keys.length) {
    throw new Error("The component variant needs unique component keys.");
  }
  if (!isRecord(rowValues) || Object.keys(rowValues).length !== components.length
    || keys.some(key => !Object.hasOwn(rowValues, key) || !isRecord(rowValues[key]))) {
    throw new Error("Provide one value for each component.");
  }
  const defaultPath = configuration.defaultPath || ["default"];
  const writes = configuration.fieldWrites;
  if (!validPath(defaultPath) || !Array.isArray(writes) || !writes.length
    || writes.some(write => !isRecord(write)
      || typeof write.valueKey !== "string" || !write.valueKey
      || ["__proto__", "constructor", "prototype"].includes(write.valueKey)
      || typeof write.targetProperty !== "string" || !write.targetProperty
      || ["__proto__", "constructor", "prototype"].includes(write.targetProperty)
      || write.type !== undefined && !["string", "boolean", "number"].includes(write.type)
      || !["replace", "ifMissing"].includes(write.writePolicy)
      || write.componentFallbackPath !== undefined && !validPath(write.componentFallbackPath))) {
    throw new Error("The component variant default mapping is invalid.");
  }
  const existingDefaults = at(field, defaultPath);
  if (existingDefaults !== undefined && !Array.isArray(existingDefaults)) {
    throw new Error("The component field default must be an array.");
  }

  const next = structuredClone(field);
  const defaults = Array.isArray(existingDefaults) ? structuredClone(existingDefaults) : [];
  for (const [index, component] of components.entries()) {
    const existing = defaults[index];
    if (existing !== undefined && !isRecord(existing)) {
      throw new Error(`Component ${index + 1} must have an object default.`);
    }
    const entry = existing ?? {};
    for (const write of writes) {
      const { valueKey, targetProperty, writePolicy } = write;
      const type = write.type || "string";
      if (writePolicy === "ifMissing" && presentValue(entry[targetProperty], type)) continue;
      let value = rowValues[keys[index]][valueKey];
      if (!presentValue(value, type) && write.componentFallbackPath) {
        value = at(component, write.componentFallbackPath);
      }
      if (!presentValue(value, type)) {
        if (write.required) throw new Error(`Component ${index + 1} needs a ${valueKey}.`);
        continue;
      }
      entry[targetProperty] = type === "string" ? value.trim() : value;
    }
    defaults[index] = entry;
  }
  let target = next;
  for (const key of defaultPath.slice(0, -1)) {
    if (!isRecord(target[key])) target[key] = {};
    target = target[key];
  }
  target[defaultPath.at(-1)] = defaults;
  return next;
}
