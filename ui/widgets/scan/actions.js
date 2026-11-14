import { scanChoiceRecords, scanChoiceValue, scanFallbackQuantity, scanModeForValue, scanModes, scanModesForSchema } from "./schema.js";
import { choiceIdentityToken, sameChoiceIdentity } from "../shared/repeatable-choice/choice-identity.js";

const atPath = (root, path) => path.reduce((value, key) => value?.[key], root);
const copy = (value) => JSON.parse(JSON.stringify(value));

/** Compose values for a declared scan mode without depending on an application data name. */
export function scanModeValue(mode, quantities, fallback, previousCount) {
  if (mode.array) return { [mode.typeKey]: mode.type,
    [mode.array.key]: quantities.length ? quantities.map(copy) : [copy(fallback)] };
  if (mode.quantities.length >= 2 && mode.count) {
    const [first, last] = mode.quantities;
    return { [mode.typeKey]: mode.type, [first.key]: copy(quantities[0] || fallback),
      [last.key]: copy(quantities.at(-1) || quantities[0] || fallback),
      [mode.count.key]: Math.max(Number(mode.count.schema.minimum ?? 2), Number(previousCount) || quantities.length || 2) };
  }
  return null;
}

export function initialScanValues(context, rowSchema, ui, record) {
  const valuesSchema = context.schemaProperty(rowSchema, {}, ui.rowValuesProperty);
  const modes = scanModesForSchema(context, valuesSchema, ui);
  const mode = modes.find((candidate) => candidate.array) || modes[0];
  return mode ? scanModeValue(mode, [], scanFallbackQuantity(record, ui)) : null;
}

/** Switch one scan between its schema-declared generated and explicit modes. */
export function applyScanChange(element, rootValue, path, ui, context) {
  const change = element.dataset.schemaWidgetChange;
  const row = atPath(rootValue, path);
  if (!row || typeof row !== "object") return { changed: false };
  if (change === "choice") {
    const token = element.dataset.schemaWidgetIdentityToken ?? element.value;
    const record = scanChoiceRecords(context, ui).find((candidate) =>
      choiceIdentityToken(scanChoiceValue(candidate, ui)) === token);
    if (!record) return { changed: false };
    row[ui.rowChoiceProperty] = scanChoiceValue(record, ui);
    return { changed: true, message: "Updated the scan choice. Apply the item to commit the change." };
  }
  if (change !== "mode") return { changed: false };
  const valuesKey = ui.rowValuesProperty;
  const modes = scanModes(context, [...path, valuesKey], ui);
  const target = modes.find((mode) => String(mode.type) === String(element.value));
  if (!target) return { changed: false };
  const current = row[valuesKey] || {};
  const source = scanModeForValue(modes, current);
  if (source === target) return { changed: false };
  if (!source) return { changed: false, error: "The current scan mode is unavailable; repair it before changing modes." };
  if (source.array && !Array.isArray(current[source.array.key]))
    return { changed: false, error: "The current scan values are invalid; repair them before changing modes." };
  const sourceQuantities = source.array ? current[source.array.key] : source.quantities.map(({ key }) => current[key]);
  if (sourceQuantities.some(value => !value || typeof value !== "object" || Array.isArray(value) || typeof value.expression !== "string" || typeof value.unit !== "string"))
    return { changed: false, error: "A scan quantity is invalid; repair it before changing modes." };
  const record = scanChoiceRecords(context, ui).find((candidate) =>
    sameChoiceIdentity(scanChoiceValue(candidate, ui), row[ui.rowChoiceProperty]));
  const fallback = scanFallbackQuantity(record, ui);
  const quantities = source?.array
    ? (Array.isArray(current[source.array.key]) ? current[source.array.key] : [])
    : (source?.quantities || []).map(({ key }) => current[key]).filter(Boolean);
  if (source?.array && !target.array && quantities.length > 2 && element.dataset.scanModeConfirmed !== "true") {
    const discarded = quantities.length - 2;
    return {
      changed: false,
      confirmationRequired: true,
      confirmationMessage: `Changing this scan to ${target.label} will keep only the first and last explicit values and discard ${discarded} middle ${discarded === 1 ? "value" : "values"}. The discarded values will not return if you switch back. Continue?`,
    };
  }
  const next = scanModeValue(target, quantities, fallback, source?.count && current[source.count.key]);
  if (!next) return { changed: false };
  row[valuesKey] = next;
  return { changed: true, message: `Changed the scan to ${target.label}. Apply the item to commit the change.` };
}

/** Add or remove one explicit value in a single scan. */
export function applyScanAction(element, rootValue, path, ui, context) {
  const row = atPath(rootValue, path);
  if (!row || typeof row !== "object") return { changed: false };
  const mode = scanModeForValue(scanModes(context, [...path, ui.rowValuesProperty], ui), row[ui.rowValuesProperty]);
  if (!mode?.array) return { changed: false };
  const quantities = row[ui.rowValuesProperty][mode.array.key];
  if (!Array.isArray(quantities)) return { changed: false };
  const action = element.dataset.schemaWidgetAction;
  if (action === "add-value") {
    const maximum = mode.array.schema.maxItems;
    if (Number.isInteger(maximum) && quantities.length >= maximum)
      return { changed: false, error: "The maximum number of explicit values has been reached." };
    const record = scanChoiceRecords(context, ui).find((candidate) =>
      sameChoiceIdentity(scanChoiceValue(candidate, ui), row[ui.rowChoiceProperty]));
    const unit = record?.[ui.sourceUnitProperty || "unit"] || quantities.at(-1)?.unit || "1";
    quantities.push({ expression: "", unit });
    return { changed: true, message: "Added an explicit scan value. Enter its expression, then apply the item." };
  }
  if (action === "remove-value") {
    if (quantities.length <= Number(mode.array.schema.minItems ?? 0))
      return { changed: false, error: "The minimum number of explicit values must remain." };
    const index = Number(element.dataset.schemaWidgetValue);
    if (!Number.isInteger(index) || index < 0 || index >= quantities.length) return { changed: false };
    quantities.splice(index, 1);
    return { changed: true, message: "Removed an explicit scan value. Apply the item to commit the change." };
  }
  return { changed: false };
}
