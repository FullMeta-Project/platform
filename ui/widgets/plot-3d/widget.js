// Generated from widget.jsx by scripts/build-frontend.mjs.
import { drawPlot3d } from "./runtime.js";
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { CanvasSurface } from "../scene-view/widget.js";
import { drawPlot3d as drawPlot3d2 } from "./runtime.js";
function PlotSurface({ label = "3D scalar plot", width, height, style, className, onDraw, onError, ...options }) {
  return /* @__PURE__ */ React.createElement(CanvasSurface, { draw: drawPlot3d2, options, label, width, height, style, className, onDraw, onError });
}
function Plot3d({ view, onCommand, ...props }) {
  return /* @__PURE__ */ React.createElement(PlotSurface, { ...props, ...view, data: view?.data || view?.value || props.data });
}
const mountWidget = (container, props) => mountReactComponent(container, Plot3d, props);
export {
  Plot3d,
  Plot3d as Widget,
  drawPlot3d,
  mountWidget
};

//# sourceMappingURL=widget.js.map
