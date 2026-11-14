import { documentValue } from "../document-state.js";
function mergeCapabilities(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    const current = target[key];
    if (value && typeof value === "object" && !Array.isArray(value)
      && current && typeof current === "object" && !Array.isArray(current)) {
      mergeCapabilities(current, value);
    } else {
      target[key] = structuredClone(value);
    }
  }
  return target;
}


export const engineCapabilities = documentValue('model.capabilities', () => ({}));

export function composeEngineCapabilities(documents, { annotation, schema } = {}) {
  if (!Array.isArray(documents) || typeof annotation !== "string" || !annotation) {
    throw new Error("Capability documents and annotation name are required.");
  }
  return documents.reduce(
    (combined, document) => mergeCapabilities(combined, document?.[annotation]),
    schema ? { schema } : {},
  );
}

export function refreshEngineCapabilities(documents, options = {}) {
  const latest = composeEngineCapabilities(documents, options);
  // Preserve references held by the editor and by the expression evaluator.
  function update(target, source) {
    for (const key of Object.keys(target)) if (!Object.hasOwn(source, key)) delete target[key];
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === "object" && !Array.isArray(value)
        && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
        update(target[key], value);
      } else target[key] = value;
    }
  }
  update(engineCapabilities, latest);
  return engineCapabilities;
}

export function capabilityAt(path) {
  return path.split(".").reduce((value, part) => value?.[part], engineCapabilities);
}
