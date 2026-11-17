// Generated from widget.jsx by scripts/build-frontend.mjs.
import { drawColorbar } from "./runtime.js";
import React, { useCallback, useMemo, useRef, useState } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { CanvasSurface } from "../scene-view/widget.js";
import { drawColorbar as drawColorbar2 } from "./runtime.js";
function drawColorbarCanvas({ canvas, ...options }) {
  const bounds = canvas.getBoundingClientRect(), ratio = globalThis.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  drawColorbar2({ range: [0, 1], ...options, context, width: bounds.width, height: bounds.height });
}
function ColorbarSurface({ label = "", units = "", width = 120, height = 360, style, className, onError, ...options }) {
  const [error, setError] = useState("");
  const stableOptions = useRef(null), previous = stableOptions.current, keys = Object.keys(options);
  if (!previous || keys.length !== Object.keys(previous).length || keys.some((key) => !Object.is(options[key], previous[key]))) stableOptions.current = { ...options };
  const drawOptions = useMemo(() => ({ range: [0, 1], ...stableOptions.current, label, units }), [stableOptions.current, label, units]);
  const clearError = useCallback(() => setError(""), []);
  const reportError = useCallback((failure) => {
    const message = failure instanceof Error ? failure.message : String(failure || "Unknown drawing error.");
    setError(message);
    onError?.(failure);
  }, [onError]);
  return /* @__PURE__ */ React.createElement("figure", { className: `colorbar ${className || ""}`, "data-jsx-widget": "colorbar" }, /* @__PURE__ */ React.createElement(CanvasSurface, { draw: drawColorbarCanvas, options: drawOptions, label: units ? `${label} (${units})` : label || "Color scale", width, height, style: { width, ...style }, onDraw: clearError, onError: reportError }), error ? /* @__PURE__ */ React.createElement("p", { className: "colorbar-error", role: "alert" }, "Color scale could not be drawn: ", error) : null, label ? /* @__PURE__ */ React.createElement("figcaption", null, label, units ? ` (${units})` : "") : null);
}
function Colorbar({ view, onCommand, ...props }) {
  return /* @__PURE__ */ React.createElement(ColorbarSurface, { ...props, ...view?.value && !Array.isArray(view.value) ? view.value : {}, ...view, range: view?.range || (Array.isArray(view?.value) ? view.value : view?.value?.range) || props.range || [0, 1] });
}
const mountWidget = (container, props) => mountReactComponent(container, Colorbar, props);
export {
  Colorbar,
  Colorbar as Widget,
  drawColorbar,
  mountWidget
};

//# sourceMappingURL=widget.js.map
