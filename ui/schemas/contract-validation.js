const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function resolveReference(contract, reference) {
  if (reference === "#") return contract;
  if (typeof reference !== "string" || !reference.startsWith("#/")) throw new Error(`Unsupported contract reference ${reference}.`);
  return reference.slice(2).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~")).reduce((value, key) => {
    if (!isObject(value) || !Object.hasOwn(value, key)) throw new Error(`Unresolved contract reference ${reference}.`);
    return value[key];
  }, contract);
}

function matchesType(value, type) {
  if (type === "object") return isObject(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return true;
}

function validateValue(value, schema, contract, path) {
  const errors = [];
  if (schema.$ref) {
    try { return validateValue(value, resolveReference(contract, schema.$ref), contract, path); }
    catch (error) { return [`${path}: ${error.message}`]; }
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.map((branch) => validateValue(value, branch.$ref ? resolveReference(contract, branch.$ref) : branch, contract, path));
    if (matches.filter((result) => result.length === 0).length !== 1) errors.push(`${path} must match exactly one form in its UI contract.`);
    return errors;
  }
  if (schema.anyOf && schema.anyOf.every(branch => validateValue(value, branch, contract, path).length > 0)) {
    errors.push(`${path} must match at least one form in its UI contract.`);
  }
  if (schema.allOf) {
    for (const condition of schema.allOf) {
      if (condition.if && validateValue(value, condition.if, contract, path).length === 0) {
        if (condition.then) errors.push(...validateValue(value, condition.then, contract, path));
      } else if (!condition.if) errors.push(...validateValue(value, condition, contract, path));
    }
  }
  if (schema.not && validateValue(value, schema.not, contract, path).length === 0) errors.push(`${path} matches a forbidden contract value.`);
  if (Object.hasOwn(schema, "const") && value !== schema.const) errors.push(`${path} must equal ${JSON.stringify(schema.const)}.`);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) errors.push(`${path} must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")}.`);
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${path} must be ${schema.type}.`);
    return errors;
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} must contain at least ${schema.minItems} item(s).`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} must contain no more than ${schema.maxItems} item(s).`);
    if (schema.items) value.forEach((entry, index) => errors.push(...validateValue(entry, schema.items, contract, `${path}/${index}`)));
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} must contain at least ${schema.minLength} character(s).`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path} must contain no more than ${schema.maxLength} character(s).`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}.`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be no greater than ${schema.maximum}.`);
  }
  if (isObject(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push(`${path}/${key} is required.`);
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
      if (Object.hasOwn(schema.properties || {}, key)) errors.push(...validateValue(child, schema.properties[key], contract, childPath));
      else if (schema.additionalProperties === false) errors.push(`${childPath} is not supported by the UI contract.`);
      else if (isObject(schema.additionalProperties)) errors.push(...validateValue(child, schema.additionalProperties, contract, childPath));
    }
  }
  return errors;
}

/** Validate a value against a subschema from an application-neutral UI contract. */
export function validateUiContractValue(value, contract, schema, path) {
  return validateValue(value, schema, contract, path);
}
