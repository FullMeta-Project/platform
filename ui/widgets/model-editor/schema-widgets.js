/** Generic state transitions for schema-declared composite form widgets. */

import { moveArrayRow, rowReorderingAllowed } from "../shared/row-collection/row-order.js";
import { applyRepeatableChoiceAction, applyRepeatableChoiceChange } from "../shared/repeatable-choice/choice-rows.js";
import { applyKeyedChoiceMatrixAction, applyKeyedChoiceMatrixChange } from "../keyed-choice-matrix/widget.js";
import { applyTabularSliceSelectorChange } from "../tabular-slice-selector/widget.js";
import { schemaWidgetOptions } from "../shared/schema-widget.js";
import { applyScanTableAction, applyScanTableChange } from "../scan-table/widget.js";
import { applyScanAction, applyScanChange } from "../scan/widget.js";

function atPath(root, path) {
  return (path || []).reduce((value, key) => value?.[key], root);
}

function mirrorValue(root, mappings, rows) {
  for (const [path, sourceProperty] of Object.entries(mappings || {})) {
    const parts = path.split(".").filter(Boolean);
    if (!parts.length) continue;
    let parent = root;
    for (const key of parts.slice(0, -1)) parent = parent[key] ||= {};
    parent[parts.at(-1)] = rows.map((row) => row?.[sourceProperty]);
  }
}

function widgetConfig(context, path) {
  const schema = context.schemaAtPath?.(path) || {};
  return { schema, ui: schemaWidgetOptions(schema) };
}

export function applySchemaWidgetChange(element, rootValue, context) {
  const path = JSON.parse(element.dataset.schemaWidgetPath || "[]");
  const { schema, ui } = widgetConfig(context, path);
  if (ui.widget === "scanTable") return applyScanTableChange(element, rootValue, path, ui, context);
  if (ui.widget === "scan") return applyScanChange(element, rootValue, path, ui, context);
  if (ui.widget === "tabularSliceSelector") return applyTabularSliceSelectorChange(element, rootValue, path, schema, ui, context);
  if (ui.widget === "repeatableChoiceTable" && element.dataset.schemaWidgetChange === "choice") {
    return applyRepeatableChoiceChange(element, rootValue, path, schema, ui, context);
  }
  if (ui.widget === "keyedChoiceMatrix" && ["keyed-choice", "remove-key"].includes(element.dataset.schemaWidgetChange)) return applyKeyedChoiceMatrixChange(element, rootValue, path, ui);
  return { changed: false };
}

export function applySchemaWidgetAction(element, rootValue, context) {
  const path = JSON.parse(element.dataset.schemaWidgetPath || "[]");
  const { schema, ui } = widgetConfig(context, path);
  if (ui.widget === "scanTable") return applyScanTableAction(element, rootValue, path, schema, ui, context);
  if (ui.widget === "scan") return applyScanAction(element, rootValue, path, ui, context);
  if (ui.widget === "tabularSliceSelector") return applyTabularSliceSelectorChange(element, rootValue, path, schema, ui, context);
  if (ui.widget === "keyedChoiceMatrix" && element.dataset.schemaWidgetAction === "add") return applyKeyedChoiceMatrixAction(element, rootValue, path, schema, ui, context);
  if (ui.widget === "repeatableChoiceTable") return applyRepeatableChoiceAction(element, rootValue, path, schema, ui, context);
  const rows = atPath(rootValue, path);
  if (!Array.isArray(rows)) return { changed: false };
  const action = element.dataset.schemaWidgetAction;
  const index = Number(element.dataset.schemaWidgetRow);
  const minimum = Number(ui.minItems ?? schema.minItems ?? 0);
  const maximum = ui.maxItems ?? schema.maxItems;
  if (action === "move") {
    if (!rowReorderingAllowed(schema, ui) || !moveArrayRow(rows, index, element.dataset.rowMove)) return { changed: false };
    mirrorValue(rootValue, ui.siblingMirrors, rows);
    return { changed: true, movedIndex: index + (element.dataset.rowMove === "up" ? -1 : 1), message: "Moved the row. Apply the item to commit the change." };
  }
  if (action === "remove") {
    if (rows.length <= minimum) return { changed: false, error: ui.minimumRowsMessage || "The minimum number of rows must remain." };
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) return { changed: false };
    rows.splice(index, 1);
    mirrorValue(rootValue, ui.siblingMirrors, rows);
    return { changed: true, message: ui.removeMessage || "Removed a row." };
  }
  if (action !== "add") return { changed: false };
  if (maximum !== undefined && rows.length >= Number(maximum)) return { changed: false, error: ui.maximumRowsMessage || "The maximum number of rows has been reached." };

  return { changed: false };
}
