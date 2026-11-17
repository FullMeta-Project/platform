// Generated from widget.jsx by scripts/build-frontend.mjs.
import { beginPlot2dFrame, drawPlot2d } from "./runtime.js";
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { CanvasSurface } from "../scene-view/widget.js";
import { drawPlot2d as drawPlot2d2 } from "./runtime.js";
function PlotSurface({ label = "2D scalar plot", width, height, style, className, onDraw, onError, ...options }) {
  return /* @__PURE__ */ React.createElement(CanvasSurface, { draw: drawPlot2d2, options, label, width, height, style, className, onDraw, onError });
}
function Plot2d({ view, onCommand, ...props }) {
  return /* @__PURE__ */ React.createElement(PlotSurface, { ...props, ...view, data: view?.data || view?.value || props.data });
}
const mountWidget = (container, props) => mountReactComponent(container, Plot2d, props);
export {
  Plot2d,
  Plot2d as Widget,
  beginPlot2dFrame,
  drawPlot2d,
  mountWidget
};

//# sourceMappingURL=widget.js.map
