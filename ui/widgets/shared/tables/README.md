# Shared numeric table data

This folder contains application-neutral numeric table selection. Shared plotting and color-mapping support lives under [`../plots/`](../plots/README.md). Application adapters own result-row evaluation, result-action definitions and field-data parsing.

The shared Model Editor coordinates DOM controls and canvas rendering. Application adapters interpret their result definitions and provide numeric data, while native solvers remain application-owned.

## Shared numeric table selection

[`data.js`](data.js) has no application or model dependencies. Callers provide numeric
records and column descriptors: `{ key, label, unit, displayScale, role }`. Only
columns with `role: "parameter"` are independent inputs; varying output columns
are never inferred as parameters. Raw numbers remain unchanged. `displayScale`
divides raw values for labels and display only.

- `createTableData({ id, name, rows, columns, defaultXColumn })` normalizes the
  descriptors, retaining their extra metadata. Each parameter exposes `values`,
  the sorted unique finite raw numbers observed in the records. `parameterColumns`
  lists those descriptors. The default X is the requested parameter or the last
  declared parameter.
- `resolveTableSelection(table, { xColumn, filters })` resolves one X parameter
  and one exact value for every other parameter. Missing selections use observed
  values compatible with the retained filters. When a saved result changes its independent parameters, removed
  filters are discarded, an unavailable X falls back to the table's default, and
  unavailable sampled values return to compatible observed values. Valid selections
  are preserved. The returned `adjustments` describe these changes; malformed
  metadata or selection types still return `error` and `message`. Callers can
  request `{ unavailable: "error" }` for strict unavailable-selection errors.
  X's filter is discarded. `changeTableXColumn(table, selection, xColumn)` retains
  unaffected filters and fills the previous X's filter with its first value.
- `resolveTableXColumn(table, requestedColumn)` applies the same X fallback to
  runtime tables or saved column metadata before CSV validation. Study coordinate
  columns are joined from saved case metadata; retired axes are not required in
  the output CSV.
- `selectTableRows(table, selection)` adds the selected `rows` and their original
  `rowIndices`, sorted by X, to the resolved selection and table metadata. Plot
  and Table should use this same view.
- Both selection functions accept a third argument `{ mode: "fixed" }` to filter
  every parameter with no X axis. The selected rows retain their original order;
  callers that need one case must check that exactly one row matches.
- The same contract applies to zero, one or many parameters: a fixed field case
  uses one filter per available parameter, while a slice uses all X samples and
  fixes the remaining parameters. With no parameters, fixed selection uses no
  filters and a slice keeps all rows for Table; Plot needs an actual X column and
  displays an explanatory message instead of inventing one.
- `formatTableValue(column, rawValue)` formats in the declared display unit;
  `columnLabel(column)` includes its non-dimensionless unit.

Selection uses exact raw numeric values. It never chooses a nearest sample,
averages duplicate cases, or changes supplied records. Schema widgets and drawing
adapters consume this shared selection contract. Reconciliation applies to the
effective view; it does not rewrite a saved project. Editing data selection
commits the normalized column and filters through the usual settings workflow.

[`drawTabularPlot`](../../plot-1d/widget.js) draws caller-selected views and output series using the generic
1D renderer. [`renderTabularTable`](../../table/widget.js) renders those same views as tables. Neither module
reads an application model, evaluates expressions, nor discovers sweep parameters.
The caller supplies column labels, units, display scales, and selected outputs.
The X-axis title is generated from the chosen column's label and unit. Y-axis
titles are omitted; legends identify the selected outputs and their units. Axis
titles do not require model settings or custom-label switches.

The schema-declared [`tabularSliceSelector`](../../tabular-slice-selector/widget.js) settings widget uses a runtime table
collection. Its `selectionMode` is `slice` for one X column plus fixed filters, or
`fixed` for one value per parameter. The model's result item stores only its selected
column and filters; observed values come from saved data. The application adapter
joins saved independent case coordinates to evaluated CSV rows before passing
tables to these shared modules. No sweep ranges are duplicated into model files.
