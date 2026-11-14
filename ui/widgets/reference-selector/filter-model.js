/** Structured editing for the common JSON Schema filters on model references. */
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const scalar = value => value === null || ["string", "number", "boolean"].includes(typeof value);
const clone = value => structuredClone(value);

const metadataKeys = new Set([
  "$id", "$schema", "$comment", "title", "description", "examples", "default",
  "deprecated", "readOnly", "writeOnly",
]);
const metadata = key => metadataKeys.has(key) || key.startsWith("x-");

function scalarDraft(value) {
  if (value === null) return { valueType: "null", value: "" };
  return { valueType: typeof value, value: String(value) };
}

function objectCondition(schema, sourceIndex) {
  if (!isObject(schema) || (schema.type !== undefined && schema.type !== "object")
    || !isObject(schema.properties) || !Array.isArray(schema.required)) return null;
  if (Object.keys(schema).some(key => !["type", "properties", "required"].includes(key)
    && !metadata(key))) return null;
  const properties = Object.keys(schema.properties);
  if (properties.length !== 1 || schema.required.length !== 1
    || schema.required[0] !== properties[0]) return null;
  const propertySchema = schema.properties[properties[0]];
  if (!isObject(propertySchema) || !Object.hasOwn(propertySchema, "const")
    || !scalar(propertySchema.const)
    || Object.keys(propertySchema).some(key => key !== "const" && !metadata(key))) return null;
  if (Object.hasOwn(schema, "x-fullmeta-role")
    && typeof schema["x-fullmeta-role"] !== "string") return null;
  return {
    property: properties[0],
    ...scalarDraft(propertySchema.const),
    role: schema["x-fullmeta-role"] || "",
    sourceIndex,
  };
}

/** Read a filter into form rows. Complex filters remain opaque until replaced explicitly. */
export function referenceFilterDraft(targetSchema) {
  if (targetSchema === undefined) return { mode: "none", rows: [] };
  const one = objectCondition(targetSchema, 0);
  if (one) return { mode: "single", rows: [one] };
  if (isObject(targetSchema) && Array.isArray(targetSchema.oneOf)
    && targetSchema.oneOf.length > 0
    && Object.keys(targetSchema).every(key => key === "oneOf"
      || (key === "type" && targetSchema.type === "object") || metadata(key))) {
    const rows = targetSchema.oneOf.map((branch, index) => objectCondition(branch, index));
    if (rows.every(Boolean)) return { mode: "oneOf", rows };
  }
  return { mode: "complex", rows: [] };
}

function conditionValue(row, index) {
  const property = String(row?.property ?? "").trim();
  if (!property) throw new Error(`Filter row ${index + 1}: enter a property key.`);
  switch (row.valueType) {
    case "string": return { property, value: String(row.value ?? "") };
    case "number": {
      const input = String(row.value ?? "").trim();
      const value = Number(input);
      if (!input || !Number.isFinite(value))
        throw new Error(`Filter row ${index + 1}: enter a finite number.`);
      return { property, value };
    }
    case "boolean":
      if (row.value !== "true" && row.value !== "false")
        throw new Error(`Filter row ${index + 1}: choose true or false.`);
      return { property, value: row.value === "true" };
    case "null": return { property, value: null };
    default: throw new Error(`Filter row ${index + 1}: choose a value type.`);
  }
}

function sourceCondition(original, originalDraft, row) {
  if (!Number.isInteger(row?.sourceIndex) || row.sourceIndex < 0) return null;
  if (originalDraft.mode === "single" && row.sourceIndex === 0) return original;
  if (originalDraft.mode === "oneOf") return original.oneOf[row.sourceIndex] || null;
  return null;
}

function buildCondition(original, originalDraft, row, index) {
  const { property, value } = conditionValue(row, index);
  const source = sourceCondition(original, originalDraft, row);
  const result = source ? clone(source) : { type: "object", required: [], properties: {} };
  const priorKey = Object.keys(result.properties || {})[0];
  const propertySchema = priorKey ? clone(result.properties[priorKey]) : {};
  propertySchema.const = value;
  result.properties = { [property]: propertySchema };
  result.required = [property];
  const role = String(row.role ?? "").trim();
  if (role) result["x-fullmeta-role"] = role;
  else delete result["x-fullmeta-role"];
  return result;
}

/** Generate the filter represented by form rows, retaining untouched keywords. */
export function referenceTargetSchemaFromDraft(originalTargetSchema, draft) {
  if (draft?.mode === "complex") return originalTargetSchema;
  if (draft?.mode === "none") return undefined;
  if (!["single", "oneOf"].includes(draft?.mode) || !Array.isArray(draft.rows))
    throw new Error("Choose a reference filter mode.");
  const originalDraft = referenceFilterDraft(originalTargetSchema);
  if (!draft.rows.length) throw new Error("Add a filter condition or choose No filter.");
  if (draft.mode === "single") {
    if (draft.rows.length !== 1) throw new Error("A single filter needs exactly one condition.");
    return buildCondition(originalTargetSchema, originalDraft, draft.rows[0], 0);
  }
  const result = originalDraft.mode === "oneOf" ? clone(originalTargetSchema) : {};
  result.oneOf = draft.rows.map((row, index) =>
    buildCondition(originalTargetSchema, originalDraft, row, index));
  return result;
}

/** Normal reference-filter transitions shared by mounted and composed React editors. */
export function referenceFilterDraftAfterCommand(draft, command) {
  const next = structuredClone(draft), blank = () => ({ property: '', valueType: 'string', value: '', role: '', sourceIndex: null });
  if (command.type === 'filter.replace') { next.mode = 'single'; next.rows = [blank()]; }
  else if (command.type === 'filter.mode') {
    if (!['none', 'single', 'oneOf'].includes(command.mode)) throw new Error('Choose a reference filter mode.');
    next.mode = command.mode;
    if (next.mode === 'none') next.rows = [];
    else if (!next.rows.length) next.rows = [blank()];
    else if (next.mode === 'single') next.rows = [next.rows[0]];
  } else if (command.type === 'filter.add') { if (next.mode === 'single') next.mode = 'oneOf'; next.rows.push(blank()); }
  else if (command.type === 'filter.remove') { next.rows.splice(command.index, 1); if (!next.rows.length) next.mode = 'none'; }
  else if (command.type === 'filter.patch' || command.type === 'filter.valueType') {
    if (!Number.isInteger(command.index) || !next.rows[command.index]) throw new Error('Choose an existing reference filter row.');
    if (command.type === 'filter.patch') Object.assign(next.rows[command.index], command.patch);
    else { if (!['string', 'number', 'boolean', 'null'].includes(command.valueType)) throw new Error('Choose a reference filter value type.');
      Object.assign(next.rows[command.index], { valueType: command.valueType, value: command.valueType === 'number' ? '0' : command.valueType === 'boolean' ? 'true' : '' }); }
  } else throw new Error('Unknown reference filter command ' + command.type);
  return next;
}

