




const atPath = (root, path) => (path || []).reduce((value, key) => value?.[key], root);



/** Resolve the allowed values from the array item's declared value map schema. */
export function keyedChoiceValues(rootValue, path, ui, context, schema) {
  const rows = atPath(rootValue, path) || [];
  const itemSchema = context.resolveSchema?.(context.schemaItem?.(schema, rows, 0)) || {};
  const mapSchema = context.resolveSchema?.(context.schemaProperty?.(itemSchema, rows[0], ui.valueMapProperty || "values")) || {};
  const choiceSchema = context.resolveSchema?.(mapSchema.additionalProperties) || {};
  const declared = choiceSchema.enum || [];
  const sibling = ui.choiceSetProperty;
  const configured = sibling ? ui.choiceSetsByValue?.[rootValue?.[sibling]] : null;
  return (configured || declared).filter((choice) => declared.includes(choice));
}

const canonicalChoiceMap = (map) => JSON.stringify(Object.fromEntries(Object.entries(map || {}).sort(([left], [right]) => left.localeCompare(right))));

function nextChoiceMap(rows, records, keyProperty, values, omittedValue, ui, rootValue) {
  if (!records.length || !values.length) return null;
  const omittedIndex = values.indexOf(omittedValue);
  if (omittedIndex < 0) return null;
  const defaultBySibling = ui.initialChoiceByValue;
  const initialChoice = defaultBySibling
    ? defaultBySibling.values?.[rootValue?.[defaultBySibling.property]]
    : ui.initialChoiceValue;
  const valueMapProperty = ui.valueMapProperty || "values";
  const existing = new Set(rows.map((row) => canonicalChoiceMap(row?.[valueMapProperty])));
  const makeCandidate = (digits) => {
    const result = {};
    digits.forEach((choiceIndex, index) => {
      const choice = values[choiceIndex];
      if (choice !== omittedValue) result[records[index]?.[keyProperty]] = choice;
    });
    return result;
  };
  if (!rows.length && initialChoice !== undefined && initialChoice !== omittedValue) {
    const firstChoiceIndex = values.indexOf(initialChoice);
    if (firstChoiceIndex >= 0) {
      const digits = Array(records.length).fill(omittedIndex);
      digits[0] = firstChoiceIndex;
      const candidate = makeCandidate(digits);
      if (!existing.has(canonicalChoiceMap(candidate))) return candidate;
    }
  }
  const limit = Math.max(1, Math.floor(Number(ui.candidateLimit) || 100000));
  const combinations = values.length ** records.length;
  const count = Math.min(limit, Number.isFinite(combinations) ? combinations : limit);
  for (let code = 0; code < count; code++) {
    let remaining = code;
    const digits = Array(records.length);
    for (let index = 0; index < records.length; index++) {
      digits[index] = remaining % values.length;
      remaining = Math.floor(remaining / values.length);
    }
    const candidate = makeCandidate(digits);
    if (!existing.has(canonicalChoiceMap(candidate))) return candidate;
  }
  return null;
}

/** Render rows that assign a declared choice to keys from a host-provided record collection. */


/** Apply an edited choice for one record key. */
export function applyKeyedChoiceMatrixChange(element, rootValue, path, ui) {
  const entries = atPath(rootValue, path);
  const rowIndex = Number(element.dataset.schemaWidgetRow);
  const key = element.dataset.schemaWidgetKey;
  const valueMapProperty = ui.valueMapProperty || "values";
  if (!Array.isArray(entries) || !Number.isInteger(rowIndex) || !entries[rowIndex] || !key) return { changed: false };
  const valueMap = entries[rowIndex][valueMapProperty] ||= {};
  if (element.dataset.schemaWidgetChange === "remove-key") {
    delete valueMap[key];
    return { changed: true, message: ui.removeKeyMessage || "Removed an unavailable choice reference." };
  }
  if (element.value === ui.omittedValue) delete valueMap[key];
  else valueMap[key] = element.value;
  return { changed: true, message: ui.changeMessage || "Updated the choice value." };
}

/** Add a row with the next unused value-map combination. */
export function applyKeyedChoiceMatrixAction(element, rootValue, path, schema, ui, context) {
  const entries = atPath(rootValue, path);
  if (!Array.isArray(entries) || element.dataset.schemaWidgetAction !== "add") return { changed: false };
  const maximum = ui.maxItems ?? schema.maxItems;
  if (maximum !== undefined && entries.length >= Number(maximum)) return { changed: false, error: ui.maximumRowsMessage || "The maximum number of rows has been reached." };
  const records = context.choiceRecords?.(ui.choiceSource, { path, schema, value: entries }) || [];
  if (!records.length) return { changed: false, error: ui.noChoicesMessage || "No choices are available from this source." };
  const keyProperty = ui.choiceKeyProperty || "id";
  const valueMapProperty = ui.valueMapProperty || "values";
  const values = keyedChoiceValues(rootValue, path, ui, context, schema);
  const next = nextChoiceMap(entries, records, keyProperty, values, ui.omittedValue, ui, rootValue);
  if (!next) return { changed: false, error: ui.noUniqueChoiceMessage || "No unused choice combination is available." };
  entries.push({ [valueMapProperty]: next });
  return { changed: true, message: ui.addMessage || "Added a row." };
}

