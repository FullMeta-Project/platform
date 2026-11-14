/** Application-independent selection of one-dimensional slices from numeric tables. */

const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function failure(message, fields = {}) {
  return { ...fields, error: message, message };
}

/**
 * Normalize table metadata without changing the supplied records.
 *
 * Only columns explicitly marked role: 'parameter' are independent inputs.
 * Their values are observed raw numbers, sorted numerically. displayScale is a
 * positive divisor used for display only; selection always compares raw values.
 */
export function createTableData({ id = '', name = '', rows = [], columns = [], defaultXColumn } = {}) {
  const table = { id, name: name || id || 'Data', rows: [], columns: [], parameterColumns: [], defaultXColumn: '', error: '', message: '' };
  if (!Array.isArray(rows) || !Array.isArray(columns)) return failure('Table rows and columns must be arrays.', table);
  table.rows = rows.slice();
  const keys = new Set();
  for (const source of columns) {
    if (!source || typeof source !== 'object' || Array.isArray(source) || typeof source.key !== 'string' || !source.key.length) {
      return failure('Every table column must have a nonempty key.', table);
    }
    if (keys.has(source.key)) return failure(`The table contains duplicate column ${source.key}.`, table);
    keys.add(source.key);
    const role = source.role ?? 'value';
    if (role !== 'parameter' && role !== 'value') return failure(`Column ${source.key} has an unsupported role.`, table);
    const displayScale = source.displayScale ?? 1;
    if (!finiteNumber(displayScale) || displayScale <= 0) return failure(`Column ${source.key} must have a positive finite display scale.`, table);
    const column = { ...source, key: source.key, label: String(source.label || source.key), unit: source.unit ?? '', displayScale, role };
    if (role === 'parameter') {
      const values = new Set();
      for (let index = 0; index < rows.length; index += 1) {
        const value = rows[index]?.[column.key];
        if (!finiteNumber(value)) return failure(`Parameter ${column.label} has a missing or nonnumeric value in row ${index + 1}.`, table);
        values.add(value);
      }
      column.values = [...values].sort((left, right) => left - right);
      table.parameterColumns.push(column);
    }
    table.columns.push(column);
  }
  table.defaultXColumn = table.parameterColumns.some((column) => column.key === defaultXColumn)
    ? defaultXColumn : table.parameterColumns.at(-1)?.key || '';
  return table;
}

/** Choose an available X from a table or its column metadata. */
export function resolveTableXColumn(table, requestedColumn) {
  const parameters = table?.parameterColumns || (table?.columns || []).filter((column) => column.role === 'parameter');
  const available = (key) => parameters.some((column) => column.key === key);
  return available(requestedColumn) ? requestedColumn
    : available(table?.defaultXColumn) ? table.defaultXColumn : parameters.at(-1)?.key || '';
}

/**
 * Resolve an X column and one exact value for every remaining parameter.
 * Saved selections are reconciled against the supplied dataset: retired axes
 * and filters are removed, and new or unavailable choices use observed values.
 * A filter on X is removed because all of its sampled values are used. Callers
 * can request unavailable: 'error' when accepting an explicitly strict selection.
 * mode: 'fixed' selects every parameter, including the empty set for a single
 * unswept case. With no parameters, slice mode leaves rows available to a table.
 */
export function resolveTableSelection(table, selection = {}, { mode = 'slice', unavailable = 'reset' } = {}) {
  const fields = { xColumn: '', filters: {}, adjustments: [], error: '', message: '' };
  if (!table || table.error) return failure(table?.error || 'The table is unavailable.', fields);
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) return failure('The table selection must be an object.', fields);
  if (mode !== 'slice' && mode !== 'fixed') return failure('The table selection mode is unsupported.', fields);
  if (unavailable !== 'reset' && unavailable !== 'error') return failure('The unavailable-selection policy is unsupported.', fields);
  const parameters = table.parameterColumns || [];
  const requestedX = owns(selection, 'xColumn') ? selection.xColumn : table.defaultXColumn;
  if (mode === 'slice' && requestedX != null && typeof requestedX !== 'string') return failure('The X column must be a column key.', fields);
  const xColumn = mode === 'fixed' ? '' : resolveTableXColumn(table, requestedX);
  fields.xColumn = xColumn;
  if (mode === 'slice' && requestedX !== xColumn) {
    if (unavailable === 'error') return failure(`X column ${String(requestedX ?? '')} is not an available parameter. Choose an X column from this dataset.`, fields);
    fields.adjustments.push({ type: 'x-column', column: xColumn, previousValue: requestedX, value: xColumn });
  }
  const suppliedFilters = owns(selection, 'filters') ? selection.filters : {};
  if (!suppliedFilters || typeof suppliedFilters !== 'object' || Array.isArray(suppliedFilters)) return failure('Parameter filters must be an object.', fields);
  const parameterKeys = new Set(parameters.map((column) => column.key));
  for (const key of Object.keys(suppliedFilters)) {
    if (!parameterKeys.has(key)) {
      if (unavailable === 'error') return failure(`Filter column ${key} is no longer an available parameter. Update the data selection.`, fields);
      fields.adjustments.push({ type: 'removed-filter', column: key, previousValue: suppliedFilters[key] });
    }
  }
  if (!table.rows.length) return failure('No data rows are available.', fields);
  // New/default choices must form an observed tuple, even for sparse datasets.
  // Preserve supplied sampled values first; incompatible explicit choices still
  // yield an empty view rather than switching an unrelated retained choice.
  const retained = parameters.filter((column) => (mode === 'fixed' || column.key !== xColumn)
    && owns(suppliedFilters, column.key) && column.values.includes(suppliedFilters[column.key]));
  let candidates = table.rows.filter((row) => retained.every((column) => row[column.key] === suppliedFilters[column.key]));
  const defaultValue = (column) => candidates.length
    ? candidates.reduce((minimum, row) => Math.min(minimum, row[column.key]), Infinity) : column.values[0];
  for (const column of parameters) {
    if (mode === 'slice' && column.key === xColumn) continue;
    const supplied = owns(suppliedFilters, column.key);
    let value = supplied ? suppliedFilters[column.key] : defaultValue(column);
    if (!finiteNumber(value)) return failure(`The selected value for ${column.label} must be a finite number.`, fields);
    if (!column.values.includes(value)) {
      if (unavailable === 'error') return failure(`The selected value for ${column.label} is not present in this dataset. Choose an available value.`, fields);
      const previousValue = value;
      value = defaultValue(column);
      fields.adjustments.push({ type: 'filter-value', column: column.key, previousValue, value });
    } else if (!supplied) {
      fields.adjustments.push({ type: 'added-filter', column: column.key, value });
    }
    Object.defineProperty(fields.filters, column.key, { value, enumerable: true, configurable: true, writable: true });
    candidates = candidates.filter((row) => row[column.key] === value);
  }
  return fields;
}

/** Change X while preserving unaffected filters and filling the previous X filter. */
export function changeTableXColumn(table, selection, xColumn) {
  const filters = selection?.filters;
  if (filters && typeof filters === 'object' && !Array.isArray(filters)) {
    return resolveTableSelection(table, {
      ...(selection || {}), xColumn,
      filters: Object.fromEntries(Object.entries(filters).filter(([key]) => key !== selection?.xColumn && key !== xColumn)),
    });
  }
  return resolveTableSelection(table, { ...(selection || {}), xColumn });
}

/** Return the same filtered, numerically sorted rows for both Plot and Table. */
export function selectTableRows(table, selection = {}, options = {}) {
  const resolved = resolveTableSelection(table, selection, options);
  const view = { ...table, ...resolved, rows: [], rowIndices: [] };
  if (resolved.error) return view;
  const filters = Object.entries(resolved.filters);
  const matching = table.rows.map((row, index) => ({ row, index }))
    .filter(({ row }) => filters.every(([key, value]) => row[key] === value));
  if (options.mode !== 'fixed' && resolved.xColumn) matching.sort((left, right) => left.row[resolved.xColumn] - right.row[resolved.xColumn] || left.index - right.index);
  view.rows = matching.map(({ row }) => row);
  view.rowIndices = matching.map(({ index }) => index);
  if (!view.rows.length) return failure('No rows match the selected parameter values.', view);
  return view;
}

/** Format one raw number in the column's declared display unit. */
export function formatTableValue(column, value) {
  if (!finiteNumber(value)) return value == null || typeof value === 'number' ? '—' : String(value);
  const displayed = value / (column?.displayScale || 1);
  if (!Number.isFinite(displayed)) return '—';
  return String(Number(displayed.toPrecision(12)));
}

/** Label a column, omitting an absent or dimensionless unit. */
export function columnLabel(column) {
  const label = String(column?.label || column?.key || '');
  const unit = column?.unit;
  return unit != null && String(unit).length && String(unit) !== '1' ? `${label} (${unit})` : label;
}
