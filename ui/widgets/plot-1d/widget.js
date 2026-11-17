// Generated from widget.jsx by scripts/build-frontend.mjs.
import { drawPlot1d } from "./runtime.js";
import { drawTabularPlot } from "./tabular-adapter.js";
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { CanvasSurface } from "../scene-view/widget.js";
import { drawPlot1d as drawPlot1d2, readyPlot1dSeries } from "./runtime.js";
import { tabularPlotData } from "./tabular-adapter.js";
import { PlotLegend } from "./legend.js";
import { PlotLegend as PlotLegend2 } from "./legend.js";
function PlotSurface({ label = "Line plot", className = "", width, height, style, showLegend = true, onDraw, onError, ...options }) {
  const series = readyPlot1dSeries(options.data?.series || options.series);
  return /* @__PURE__ */ React.createElement("figure", { className: `plot-1d ${className}`, "data-jsx-widget": "plot1d" }, /* @__PURE__ */ React.createElement(CanvasSurface, { draw: drawPlot1d2, options, label, width, height, style, onDraw, onError }), series.length ? showLegend ? /* @__PURE__ */ React.createElement("figcaption", { className: "plot-legend" }, /* @__PURE__ */ React.createElement(PlotLegend, { series })) : null : /* @__PURE__ */ React.createElement("p", { className: "plot-empty", role: "status" }, "No ready plot data is available."));
}
function Plot1d({ view, onCommand, ...props }) {
  return /* @__PURE__ */ React.createElement(PlotSurface, { ...props, ...view, data: view?.data || view?.value || props.data });
}
function TabularPlot({ entries = [], axes = {}, ...props }) {
  return /* @__PURE__ */ React.createElement(Plot1d, { ...props, data: tabularPlotData(entries, axes) });
}
const mountWidget = (container, props) => mountReactComponent(container, Plot1d, props);
export {
  Plot1d,
  PlotLegend2 as PlotLegend,
  TabularPlot,
  Plot1d as Widget,
  drawPlot1d,
  drawTabularPlot,
  mountWidget
};

//# sourceMappingURL=widget.js.map
