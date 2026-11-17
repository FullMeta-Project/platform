// Generated from widget.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { GraphicsContext } from "./context-view.js";
import { GraphicsContext as GraphicsContext2, mountGraphicsContextView } from "./context-view.js";
import { graphicsPathMatches, graphicsSelectionRule, graphicsSceneForSelection, graphicsWidgetForLayer, graphicsLayerForRole, graphicsLayerInput, graphicsTabForRole, graphicsBindingValue, graphicsSceneInputs, graphicsFocusTargets, graphicsConsoleIssues } from "./contract.js";
import { mergeGraphicsConsoleDraft, mountGraphicsConsoleDesignEditor } from "./design-editor.js";
import { renderGraphicsConsoleAuthoring } from "./graphics-console-authoring.js";
import { mergeGraphicsInterfacesDraft, mountGraphicsInterfacesDesignEditor, validateGraphicsInterfacesEditorState } from "./interfaces-editor.js";
import { drawGraphicsConsoleOverview, graphicsConsoleOverviewTooltipAt, graphicsConsoleOverviewWidget } from "./overview.js";
import { genericGraphicsWidgets, drawPlot1d, drawPlot2d, drawPlot3d, drawScalarPlot, plot1dColors, plot1dColor } from "./graphics-registry.js";
import { createGraphicsLayerRegistry } from "./layer-registry.js";
import { GraphicsConsoleDesignEditor } from "./design-editor.js";
import { GraphicsInterfacesEditor } from "./interfaces-editor.js";
import { GraphicsConsoleAuthoring } from "./graphics-console-authoring.js";
function GraphicsConsole({ view, context, onCommand }) {
  const definition = view?.definition || view?.value || view;
  if (!definition?.scenes) return /* @__PURE__ */ React.createElement(GraphicsContext, { context, view });
  const selected = view?.selectedSceneId || definition.defaultScene || Object.keys(definition.scenes)[0];
  return /* @__PURE__ */ React.createElement("section", { className: "graphics-console", "data-jsx-widget": "graphics-console" }, /* @__PURE__ */ React.createElement("h3", null, view?.label || definition.label || "Graphics console"), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Graphics scenes" }, Object.entries(definition.scenes).map(([id, scene]) => /* @__PURE__ */ React.createElement("button", { type: "button", key: id, "aria-pressed": selected === id, onClick: () => onCommand?.({ type: "widget.action", widget: "graphicsConsole", path: view?.path || [], action: "selectScene", args: { id } }) }, scene.label || id))), /* @__PURE__ */ React.createElement(GraphicsContext, { context: { label: view?.label || definition.label || "Graphics console", sceneId: selected, scene: definition.scenes[selected] } }));
}
const mountWidget = (container, props) => mountReactComponent(container, GraphicsConsole, props);
export {
  GraphicsConsole,
  GraphicsConsoleAuthoring,
  GraphicsConsoleDesignEditor,
  GraphicsContext2 as GraphicsContext,
  GraphicsInterfacesEditor,
  GraphicsConsole as Widget,
  createGraphicsLayerRegistry,
  drawGraphicsConsoleOverview,
  drawPlot1d,
  drawPlot2d,
  drawPlot3d,
  drawScalarPlot,
  genericGraphicsWidgets,
  graphicsBindingValue,
  graphicsConsoleIssues,
  graphicsConsoleOverviewTooltipAt,
  graphicsConsoleOverviewWidget,
  graphicsFocusTargets,
  graphicsLayerForRole,
  graphicsLayerInput,
  graphicsPathMatches,
  graphicsSceneForSelection,
  graphicsSceneInputs,
  graphicsSelectionRule,
  graphicsTabForRole,
  graphicsWidgetForLayer,
  mergeGraphicsConsoleDraft,
  mergeGraphicsInterfacesDraft,
  mountGraphicsConsoleDesignEditor,
  mountGraphicsContextView,
  mountGraphicsInterfacesDesignEditor,
  mountWidget,
  plot1dColor,
  plot1dColors,
  renderGraphicsConsoleAuthoring,
  validateGraphicsInterfacesEditorState
};

//# sourceMappingURL=widget.js.map
