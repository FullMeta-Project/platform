import { drawPlot1d, Plot1d } from "../plot-1d/widget.js";
import { drawPlot2d, Plot2d } from "../plot-2d/widget.js";
import { drawPlot3d, Plot3d } from "../plot-3d/widget.js";
import { renderTable, Table } from "../table/widget.js";
import { plot1dColors, plot1dColor } from "../shared/plots/style.js";
import { drawScalarPlot } from "../shared/plots/scalar-surface.js";
import { sharedWidgetCatalog } from '../shared/catalog.js';

export { drawPlot1d, drawPlot2d, drawPlot3d, drawScalarPlot, plot1dColors, plot1dColor };

/** Application-neutral graphics widgets with separately documented data contracts. */
const renderers = { drawPlot1d, drawPlot2d, drawPlot3d, renderTable };
const components = { drawPlot1d: Plot1d, drawPlot2d: Plot2d, drawPlot3d: Plot3d, renderTable: Table };
export const genericGraphicsWidgets = Object.freeze(Object.fromEntries(
  sharedWidgetCatalog.widgets.filter(widget => widget.graphics).map(({ id, graphics }) => {
    const render = renderers[graphics.render];
    if (!render) throw new Error(`Shared Graphics widget ${id} has no registered renderer ${graphics.render}.`);
    return [id, Object.freeze({ id, kind: graphics.kind, dimensions: graphics.dimensions, dataSchema: graphics.dataSchema, render, Component: components[graphics.render] })];
  }),
));
