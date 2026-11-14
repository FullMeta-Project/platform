import { scanChoiceRecords, scanChoiceValue, scanFieldSchema, scanRowConfiguration } from "../scan/widget.js";
import { applyScanAction, applyScanChange, initialScanValues } from "../scan/widget.js";
import { moveArrayRow, rowReorderingAllowed } from "../shared/row-collection/row-order.js";
import { choiceIdentityToken, sameChoiceIdentity } from "../shared/repeatable-choice/choice-identity.js";

const atPath = (root, path) => path.reduce((value, key) => value?.[key], root);

function rowConfiguration(rootValue, path, tableUi, context, index) {
  const rows = atPath(rootValue, path);
  const schema = scanFieldSchema(context, path);
  const row = scanRowConfiguration(context, schema, rows, index, tableUi);
  return { rows, row, records: scanChoiceRecords(context, row.ui) };
}

function matchesRowIdentity(element, rootValue, rows, path, tableUi, context, index) {
  const expected = element.dataset.schemaWidgetRowIdentityToken;
  if (expected === undefined) return true;
  if (!Number.isInteger(index) || index < 0 || index >= rows.length) return false;
  const { row } = rowConfiguration(rootValue, path, tableUi, context, index);
  return choiceIdentityToken(rows[index]?.[row.ui.rowChoiceProperty]) === expected;
}

/** Delegate value-mode changes to the shared single-scan widget. */
export function applyScanTableChange(element, rootValue, path, ui, context) {
  const index = Number(element.dataset.schemaWidgetRow);
  const { rows, row } = rowConfiguration(rootValue, path, ui, context, index);
  if (!Array.isArray(rows) || !rows[index] || !matchesRowIdentity(element, rootValue, rows, path, ui, context, index)) return { changed: false };
  return applyScanChange(element, rootValue, [...path, index], row.ui, context);
}

/** Manage the collection and delegate value actions to the shared scan widget. */
export function applyScanTableAction(element, rootValue, path, schema, ui, context) {
  const action = element.dataset.schemaWidgetAction;
  const rows = atPath(rootValue, path);
  if (!Array.isArray(rows)) return { changed: false };
  const index = action === "add-row" ? rows.length : Number(element.dataset.schemaWidgetRow);
  if (action === "move") {
    const direction = element.dataset.rowMove;
    if (!matchesRowIdentity(element, rootValue, rows, path, ui, context, index)) return { changed: false };
    if (!rowReorderingAllowed(schema, ui) || !moveArrayRow(rows, index, direction)) return { changed: false };
    return { changed: true, movedIndex: index + (direction === "up" ? -1 : 1), message: "Moved the scan. Apply the item to commit the change." };
  }
  const configuration = rowConfiguration(rootValue, path, ui, context, index);
  const rowUi = configuration.row.ui;
  if (action === "add-row") {
    if (Number.isInteger(schema.maxItems) && rows.length >= schema.maxItems)
      return { changed: false, error: "The maximum number of scans has been reached." };
    const record = configuration.records.find((candidate) => !rows.some((entry) =>
      sameChoiceIdentity(entry?.[rowUi.rowChoiceProperty], scanChoiceValue(candidate, rowUi))));
    if (!record) return { changed: false, error: "All available choices already have a scan." };
    const values = initialScanValues(context, configuration.row.schema, rowUi, record);
    if (!values) return { changed: false, error: "The scan value modes are not declared." };
    rows.push({ [rowUi.rowChoiceProperty]: scanChoiceValue(record, rowUi), [rowUi.rowValuesProperty]: values });
    return { changed: true, message: "Added a scan. Apply the item to commit the change." };
  }
  if (!Number.isInteger(index) || index < 0 || index >= rows.length) return { changed: false };
  if (!matchesRowIdentity(element, rootValue, rows, path, ui, context, index)) return { changed: false };
  if (action === "remove-row") {
    if (rows.length <= Number(schema.minItems ?? 0))
      return { changed: false, error: "The minimum number of scans must remain." };
    rows.splice(index, 1);
    return { changed: true, message: "Removed a scan. Apply the item to commit the change." };
  }
  return applyScanAction(element, rootValue, [...path, index], rowUi, context);
}
