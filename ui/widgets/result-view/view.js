// Generated from view.jsx by scripts/build-frontend.mjs.
import React, { useRef, useState } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { LayeredScene } from "../scene-view/widget.js";
import { resolveResultView } from "./runtime.js";
function ResultView({ view, onCommand, widgets = {}, components = {}, inputs = {}, ...props }) {
  const model = { ...props, ...view }, [localTab, setLocalTab] = useState(null), viewportStates = useRef(/* @__PURE__ */ new Map());
  const selected = resolveResultView({ ...model, widgets, selectedTabId: model.selectedTabId || localTab });
  const choose = (id) => {
    setLocalTab(id);
    onCommand?.({ type: "widget.action", widget: "resultView", path: model.path || [], action: "selectTab", args: { id } });
  };
  if (selected.isSpatial) {
    const layers = [{ id: "surface", renderer: selected.surfaceRenderer, options: { data: model.surface, scene: model.surface || { primitives: [] } } }, ...selected.contentLayers.map(({ layer, renderer }) => ({ id: layer.id, renderer, visible: model.visibility?.[layer.id] ?? layer.defaultVisible !== false, options: { data: inputs[layer.input], scene: inputs[layer.input], ...model.layerOptions?.[layer.id] } }))];
    return /* @__PURE__ */ React.createElement("section", { className: "result-view result-view-layered", "data-jsx-widget": "result-view" }, /* @__PURE__ */ React.createElement(LayeredScene, { layers, ...model.canvas, view: { label: model.label || model.scene.label } }));
  }
  const Component = components[selected.contentWidgetId] || selected.contentRenderer.Component;
  const activeInput = inputs[selected.activeTab.input];
  let activeView = activeInput;
  if (selected.contentWidgetId === "plot2d" && activeInput && typeof activeInput === "object") {
    const raster = activeInput.data || activeInput.value || activeInput;
    const bounds = {
      x: { minimum: Number(raster.xAxis?.minimum), maximum: Number(raster.xAxis?.maximum) },
      y: { minimum: Number(raster.yAxis?.minimum), maximum: Number(raster.yAxis?.maximum) }
    };
    const sceneKey = model.scene?.id || model.label || "result-view";
    const stateKey = `${sceneKey}:${selected.activeTab.id}`;
    const originalInteraction = activeInput.interaction || {};
    const interaction = {
      ...originalInteraction,
      id: originalInteraction.id || `result-view:${stateKey}`,
      frame: originalInteraction.frame || sceneKey,
      viewState: viewportStates.current.get(stateKey),
      onChange: (state) => {
        viewportStates.current.set(stateKey, {
          x: { ...state.xAxis },
          y: { ...state.yAxis },
          base: bounds
        });
        originalInteraction.onChange?.(state);
      }
    };
    activeView = { ...activeInput, interaction };
  }
  return /* @__PURE__ */ React.createElement("section", { className: "result-view result-view-tabs", "data-jsx-widget": "result-view" }, /* @__PURE__ */ React.createElement("div", { role: "tablist", "aria-label": model.label || "Result view" }, selected.tabs.map((tab) => /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", key: tab.id, "aria-selected": selected.activeTab.id === tab.id, onClick: () => choose(tab.id) }, tab.label || tab.id))), /* @__PURE__ */ React.createElement("div", { role: "tabpanel" }, Component ? /* @__PURE__ */ React.createElement(Component, { key: selected.activeTab.id, view: activeView, onCommand }) : /* @__PURE__ */ React.createElement("p", { role: "status" }, "Renderer ", selected.contentWidgetId, " has no React component capability.")));
}
const mountWidget = (container, props) => mountReactComponent(container, ResultView, props);
export {
  ResultView,
  mountWidget
};

//# sourceMappingURL=view.js.map
