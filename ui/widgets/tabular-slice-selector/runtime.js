import { columnLabel, formatTableValue, resolveTableSelection } from "../shared/tables/data.js";




const atPath = (root, path) => (path || []).reduce((value, key) => value?.[key], root);



function tableFor({ ui, path, schema, value, context, owner }) {
  const tables = context.tabularDataTables?.(ui.dataSource, { path, schema, value, owner }) || [];
  if (!Array.isArray(tables)) return null;
  const tableIdProperty = ui.tableIdProperty || "id";
  const ownerIdProperty = ui.ownerIdProperty || "id";
  return tables.find((table) => String(table?.[tableIdProperty]) === String(owner?.[ownerIdProperty]));
}

function resolveOwnerSelection(owner, ui, path, table) {
  const varyingColumnProperty = ui.varyingColumnProperty;
  const fixedValuesProperty = ui.fixedValuesProperty || path.at(-1);
  const selection = { xColumn: varyingColumnProperty ? owner?.[varyingColumnProperty] : undefined };
  if (Object.hasOwn(owner || {}, fixedValuesProperty)) selection.filters = owner[fixedValuesProperty];
  else if (ui.selectionMode === "fixed" && table?.defaultFilters !== undefined) selection.filters = table.defaultFilters;
  return { selection, varyingColumnProperty, fixedValuesProperty };
}

/**
 * Render a generic selection of one varying table column and sampled values
 * for the remaining columns. The host resolves `dataSource` to normalized
 * tables; the widget only edits the owner fields named in its annotation.
 */


/** Apply one changed varying-column or fixed-value selector to its model owner. */
export function applyTabularSliceSelectorChange(element, rootValue, path, schema, ui, context) {
  if (schema.readOnly === true || ui.readOnly === true) return { changed: false };
  const owner = atPath(rootValue, path.slice(0, -1));
  const table = tableFor({ ui, path, schema, value: atPath(rootValue, path), context, owner });
  if (!owner || !table) return { changed: false, error: ui.emptyMessage || "No table data is available for this selection." };
  const columns = (table.columns || []).filter((column) => column.role === "parameter");
  const fixed = ui.selectionMode === "fixed";
  const { selection, varyingColumnProperty, fixedValuesProperty } = resolveOwnerSelection(owner, ui, path, table);
  const current = resolveTableSelection(table, selection, { mode: fixed ? "fixed" : "slice" });
  if (current.error) return { changed: false, error: current.error };
  const next = { xColumn: current.xColumn, filters: { ...current.filters } };
  const change = element.dataset.schemaWidgetChange;
  if (change === "varying-column" && !fixed) {
    const column = columns.find((entry) => entry.key === element.value);
    if (!column) return { changed: false, error: "Choose an available varying column." };
    next.xColumn = element.value;
  } else if (change === "fixed-value") {
    const column = columns.find((entry) => entry.key === element.dataset.schemaWidgetKey);
    const selected = Number(element.value);
    if (!column || (!fixed && column.key === next.xColumn) || !element.value.trim() || !Number.isFinite(selected) || !(column.values || []).includes(selected)) {
      return { changed: false, error: "Choose an available sampled value." };
    }
    Object.defineProperty(next.filters, column.key, { value: selected, enumerable: true, configurable: true, writable: true });
  } else return { changed: false };

  if (!fixed) delete next.filters[next.xColumn];
  const resolved = resolveTableSelection(table, next, { mode: fixed ? "fixed" : "slice" });
  if (resolved.error) return { changed: false, error: resolved.error };
  if (!fixed) {
    owner[varyingColumnProperty] = resolved.xColumn;
    const column = columns.find((entry) => entry.key === resolved.xColumn);
    if (ui.unitProperty && column) owner[ui.unitProperty] = column.unit || "1";
  }
  owner[fixedValuesProperty] = resolved.filters;
  return { changed: true, message: ui.changeMessage || "Updated the data selection. Apply the item to keep the change." };
}

export {tableFor,resolveOwnerSelection};
