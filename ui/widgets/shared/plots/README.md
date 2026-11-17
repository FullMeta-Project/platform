# Shared plotting support

These renderers accept application-neutral numeric data. An application adapter chooses the source data and converts it to the contracts owned by `plot-1d/`, `plot-2d/`, and `plot-3d/`; the plot widgets do not depend on a particular model schema or application.

Numeric table selection and reconciliation are documented in [`../tables/README.md`](../tables/README.md). The public Plot 1D and Table widgets consume the same selected table view.

## plot1d

Public entry: [`plot-1d/widget.js`](../../plot-1d/widget.js).

`drawPlot1d({ canvas, data })` draws line series. `data` follows [`fullmeta-ui-plot1d-1.schema.json`](../../plot-1d/fullmeta-ui-plot1d-1.schema.json): each series has a label and `[x, y]` points, with optional color, line style, and left or right value axis. Axis labels and bounds are optional. The function returns HTML for the series legend, or an empty string when there is no drawable series.

## plot2d and plot3d

Public entries: [`plot-2d/widget.js`](../../plot-2d/widget.js), [`plot-3d/widget.js`](../../plot-3d/widget.js), with their common surface renderer in [`scalar-surface.js`](scalar-surface.js).

`drawPlot2d({ canvas, data, project, color })` supports two application-neutral data forms: scalar values on polygon surfaces, or a regular raster grid with coordinate axes. Raster data uses `{ grid: { width, height, values }, xAxis: { minimum, maximum, label }, yAxis: { minimum, maximum, label, direction }, range }`; `values` is row-major. By default row zero (minimum y) is drawn at the bottom; set `yAxis.direction` to `down` when the input uses image-row coordinates, placing row zero at the top. The shared renderer draws numeric ticks and coordinate labels. The existing polygon-surface form and behavior remain available unchanged. `drawPlot3d({ canvas, data, project, color })` remains a separate surface plot widget. Their inputs follow [`fullmeta-ui-plot2d-1.schema.json`](../../plot-2d/fullmeta-ui-plot2d-1.schema.json) and [`fullmeta-ui-plot3d-1.schema.json`](../../plot-3d/fullmeta-ui-plot3d-1.schema.json). A surface contains reusable `vertices` and indexed `faces`; the renderer triangulates faces as a fan, so triangles are the general mesh form and larger faces should be convex. `range`, `opacity`, and `background` are optional.

The host owns pointer and wheel events. It may provide `project(position)`, returning `[screenX, screenY, depth]`, so a plot can share a camera with a scene view. Without a host projection, the plot computes a fitted default projection. `color(value, range, opacity)` can supply a host color map. The older inline triangle form `{ surfaces: [{ points: [{ position, value }, ...] }] }` remains accepted for existing adapters.

The `canvas`, `project`, and `color` arguments are runtime interfaces and therefore are not serialized in the JSON data schemas.
