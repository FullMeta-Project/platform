import { drawPlot1d } from './runtime.js';
import { plot1dColor } from '../shared/plots/style.js';
import { columnLabel } from "../shared/tables/data.js";

/** Draw caller-selected numeric tables. This component has no application model. */
export function tabularPlotData(entries = [], axes = {}) {
  const ready = (Array.isArray(entries) ? entries : []).filter((entry) => {
    const view = entry?.view;
    return view && !view.error && Array.isArray(view.rows) && view.rows.length > 0
      && Array.isArray(view.columns) && view.columns.some((column) => column?.key === view.xColumn);
  });
  if (!ready.length) return { series: [], xAxis: {}, yAxes: {} };
  const firstX = ready[0].view.columns.find((column) => column.key === ready[0].view.xColumn);
  const series = ready.flatMap((entry) => {
    const { view } = entry;
    const xColumn = view.columns.find((column) => column.key === view.xColumn);
    const xScale = Number.isFinite(Number(entry.xDisplayScale)) && Number(entry.xDisplayScale) !== 0
      ? Number(entry.xDisplayScale)
      : Number.isFinite(Number(xColumn.displayScale)) && Number(xColumn.displayScale) !== 0
        ? Number(xColumn.displayScale) : 1;
    return (Array.isArray(entry.series) ? entry.series : []).flatMap((item, index) => {
      if (!item || typeof item.column !== 'string') return [];
      const column = view.columns.find((candidate) => candidate?.key === item.column);
      if (!column) return [];
      const unit = item.unit || column?.unit || '1';
      return {
        label: `${entry.name || view.name || 'Dataset'} · ${item.label || column?.label || item.column}${unit !== '1' ? ` (${unit})` : ''}`,
        points: view.rows.filter((row) => row && typeof row === 'object').map((row) => [row[view.xColumn] / xScale, row[item.column] / (Number(column?.displayScale) || 1)]),
        axis: item.axis === 'right' ? 'right' : 'left', style: entry.style, color: item.color || plot1dColor(index),
      };
    });
  });
  return {
    series,
    xAxis: { label: columnLabel(firstX), minimum: axes.xMin, maximum: axes.xMax },
    yAxes: {
      left: { label: '', minimum: axes.yLeftMin, maximum: axes.yLeftMax },
      right: { label: '', minimum: axes.yRightMin, maximum: axes.yRightMax },
    },
  };
}

export function drawTabularPlot({ canvas, entries = [], axes = {}, renderer = drawPlot1d }) {
  const data = tabularPlotData(entries, axes);
  if (!canvas || !data.series.length) return '';
  return renderer({ canvas, data });
}
