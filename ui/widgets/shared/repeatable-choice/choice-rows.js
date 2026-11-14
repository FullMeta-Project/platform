import { moveArrayRow, rowReorderingAllowed } from "../row-collection/row-order.js";
import { choiceFromIdentityToken, sameChoiceIdentity } from "./choice-identity.js";

function mirrorValue(root, mappings, rows, context) {
  let succeeded = true;
  for (const [path, sourceProperty] of Object.entries(mappings || {})) {
    const parts = path.split(".").filter(Boolean);
    if (!parts.length) continue;
    if (!root || typeof root !== "object" || Array.isArray(root)) {
      if (typeof context?.stageSiblingMirror !== "function" || context.stageSiblingMirror(parts, rows.map((row) => row?.[sourceProperty])) === false) succeeded = false;
      continue;
    }
    let parent = root;
    for (const key of parts.slice(0, -1)) parent = parent[key] ||= {};
    parent[parts.at(-1)] = rows.map((row) => row?.[sourceProperty]);
  }
  return succeeded;
}

export function rowFromChoice(choice, ui, context, rows) {
  const row = structuredClone(ui.rowDefaults || {});
  for (const [target, source] of Object.entries(ui.choiceAssignments || {})) row[target] = choice?.[source];
  const valueProperty = ui.choiceValueProperty || "id";
  const assignedUniqueProperty = Object.entries(ui.choiceAssignments || {}).find(([, source]) => source === valueProperty)?.[0];
  const uniqueBy = ui.uniqueBy || assignedUniqueProperty || valueProperty;
  if (row[uniqueBy] === undefined) row[uniqueBy] = choice?.[valueProperty];
  const idProperty = ui.generatedIdProperty;
  if (idProperty) {
    const base = context.formatChoiceLabel?.(ui.generatedIdTemplate, choice) || `${ui.generatedIdPrefix || "item"}_${choice?.[valueProperty] || "choice"}`;
    row[idProperty] = context.makeUniqueId?.(base, rows.map((entry) => entry?.[idProperty])) || base;
  }
  return row;
}

function objectChoiceRows(schema, context) {
  const item = context.resolveSchema?.(schema?.items) || schema?.items || {};
  return item.type === "object" || Boolean(item.properties);
}

export function applyRepeatableChoiceChange(element, rootValue, path, schema, ui, context) {
  const rows = path.reduce((value, key) => value?.[key], rootValue);
  const objectRows = objectChoiceRows(schema, context);
  const index = Number(element.dataset.schemaWidgetRow);
  if (!Array.isArray(rows) || !Number.isInteger(index) || !rows[index]) return { changed: false };
  const records = context.choiceRecords?.(ui.choiceSource, { path }) || [];
  const valueProperty = ui.choiceValueProperty || "id";
  const assignedUniqueProperty = Object.entries(ui.choiceAssignments || {}).find(([, source]) => source === valueProperty)?.[0];
  const choice = element.dataset.schemaWidgetIdentityToken !== undefined
    ? choiceFromIdentityToken(records, valueProperty, element.dataset.schemaWidgetIdentityToken)
    : records.find((record) => sameChoiceIdentity(record?.[valueProperty], element.value))
      || records.find((record) => String(record?.[valueProperty]) === element.value);
  if (!choice) return { changed: false, error: ui.invalidChoiceMessage || "Choose an available item." };
  const uniqueBy = ui.uniqueBy || assignedUniqueProperty || valueProperty;
  if (rows.some((row, other) => other !== index && sameChoiceIdentity(objectRows ? row?.[uniqueBy] : row, choice[valueProperty]))) {
    return { changed: false, error: ui.duplicateChoiceMessage || "Each choice can appear only once." };
  }
  if (!objectRows) {
    const previous = rows[index];
    rows[index] = choice[valueProperty];
    if (!mirrorValue(rootValue, ui.siblingMirrors, rows, context)) {
      rows[index] = previous;
      return { changed: false, error: ui.siblingMirrorFailureMessage || "Could not update the mirrored sibling values." };
    }
    return { changed: true, message: ui.changeMessage || "Updated the selected row." };
  }
  const updated = { ...rows[index] };
  for (const [target, source] of Object.entries(ui.choiceAssignments || {})) updated[target] = choice?.[source];
  // A row's uniqueness field is the selected choice identity unless an explicit
  // choiceAssignments mapping supplies it. Preserve generated and unrelated
  // row fields while replacing that identity.
  if (!Object.hasOwn(ui.choiceAssignments || {}, uniqueBy)) updated[uniqueBy] = choice[valueProperty];
  const previous = rows[index];
  rows[index] = updated;
  if (!mirrorValue(rootValue, ui.siblingMirrors, rows, context)) {
    rows[index] = previous;
    return { changed: false, error: ui.siblingMirrorFailureMessage || "Could not update the mirrored sibling values." };
  }
  return { changed: true, message: ui.changeMessage || "Updated the selected row." };
}

export function applyRepeatableChoiceAction(element, rootValue, path, schema, ui, context) {
  const rows = path.reduce((value, key) => value?.[key], rootValue);
  if (!Array.isArray(rows)) return { changed: false };
  const objectRows = objectChoiceRows(schema, context);
  const action = element.dataset.schemaWidgetAction;
  const index = Number(element.dataset.schemaWidgetRow);
  const minimum = Number(ui.minItems ?? schema.minItems ?? 0);
  const maximum = ui.maxItems ?? schema.maxItems;
  if (action === "move") {
    if (!rowReorderingAllowed(schema, ui) || !moveArrayRow(rows, index, element.dataset.rowMove)) return { changed: false };
    const movedIndex = index + (element.dataset.rowMove === "up" ? -1 : 1);
    if (!mirrorValue(rootValue, ui.siblingMirrors, rows, context)) {
      moveArrayRow(rows, movedIndex, element.dataset.rowMove === "up" ? "down" : "up");
      return { changed: false, error: ui.siblingMirrorFailureMessage || "Could not update the mirrored sibling values." };
    }
    return { changed: true, movedIndex, message: "Moved the row. Apply the item to commit the change." };
  }
  if (action === "remove") {
    if (rows.length <= minimum) return { changed: false, error: ui.minimumRowsMessage || "The minimum number of rows must remain." };
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) return { changed: false };
    const [removed] = rows.splice(index, 1);
    if (!mirrorValue(rootValue, ui.siblingMirrors, rows, context)) {
      rows.splice(index, 0, removed);
      return { changed: false, error: ui.siblingMirrorFailureMessage || "Could not update the mirrored sibling values." };
    }
    return { changed: true, message: ui.removeMessage || "Removed a row." };
  }
  if (action !== "add") return { changed: false };
  if (maximum !== undefined && rows.length >= Number(maximum)) return { changed: false, error: ui.maximumRowsMessage || "The maximum number of rows has been reached." };
  const records = context.choiceRecords?.(ui.choiceSource, { path }) || [];
  const valueProperty = ui.choiceValueProperty || "id";
  const assignedUniqueProperty = Object.entries(ui.choiceAssignments || {}).find(([, source]) => source === valueProperty)?.[0];
  const uniqueBy = ui.uniqueBy || assignedUniqueProperty || valueProperty;
  const choice = records.find((record) => !rows.some((row) => sameChoiceIdentity(objectRows ? row?.[uniqueBy] : row, record?.[valueProperty])));
  if (!choice) return { changed: false, error: ui.noAvailableChoicesMessage || "Every available choice is already in use." };
  rows.push(objectRows ? rowFromChoice(choice, ui, context, rows) : choice[valueProperty]);
  if (!mirrorValue(rootValue, ui.siblingMirrors, rows, context)) {
    rows.pop();
    return { changed: false, error: ui.siblingMirrorFailureMessage || "Could not update the mirrored sibling values." };
  }
  return { changed: true, message: context.formatChoiceLabel?.(ui.addMessageTemplate, choice) || ui.addMessage || "Added a row." };
}
