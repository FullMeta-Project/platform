// Generated from widget.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { drawSceneView } from "./runtime.js";
import { CanvasSurface } from "./canvas-surface.js";
import { drawLayeredScene } from "./compositor.js";
import { drawSceneView as drawSceneView2, sceneViewRenderer } from "./runtime.js";
import { CanvasSurface as CanvasSurface2 } from "./canvas-surface.js";
import { drawLayeredScene as drawLayeredScene2 } from "./compositor.js";
function SceneSurface({ label = "Scene view", className = "", width, height, style, onDraw, onError, ...options }) {
  return /* @__PURE__ */ React.createElement(
    CanvasSurface,
    {
      draw: drawSceneView,
      options,
      label,
      className,
      width,
      height,
      style,
      onDraw,
      onError
    }
  );
}
function SceneView({ view, onCommand, ...props }) {
  return /* @__PURE__ */ React.createElement(SceneSurface, { ...props, ...view, scene: view?.scene || view?.value || props.scene });
}
function LayeredScene({ view, onCommand, label = "Layered scene", width, height, style, className, onDraw, onError, ...props }) {
  return /* @__PURE__ */ React.createElement(CanvasSurface, { draw: drawLayeredScene, options: { ...props, ...view }, label: view?.label || label, width, height, style, className, onDraw, onError });
}
const mountWidget = (container, props) => mountReactComponent(container, SceneView, props);
export {
  CanvasSurface2 as CanvasSurface,
  LayeredScene,
  SceneView,
  SceneView as Widget,
  drawLayeredScene2 as drawLayeredScene,
  drawSceneView2 as drawSceneView,
  mountWidget,
  sceneViewRenderer
};

//# sourceMappingURL=widget.js.map
