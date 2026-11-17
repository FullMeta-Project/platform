# Plot/table composition

`widget.js` combines a shared `plot1d` renderer and a shared table renderer in one tabbed Graphics view. The scene declares tabs with the `plot` and `table` roles, their widget IDs, labels, input bindings, and default tab. The host passes those scene bindings and normalized data entries to `selectPlotTableView`, then renders the toolbar, selected view, and table sections through this module.

The composition controls tabs, the figure action slot, and visibility. An application adapter prepares the numeric rows, plot series, axis rules, freshness notice, and figure-save request. The composition does not read a model schema or know a solver.
