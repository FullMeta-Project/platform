// Generated from context-view.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
function Row({ title, detail }) {
  return /* @__PURE__ */ React.createElement("div", { className: "sd-console-row" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, title), detail ? /* @__PURE__ */ React.createElement("small", null, detail) : null));
}
function GraphicsContext({ context, view }) {
  const model = view?.context || view?.value || view || context;
  if (!model) return null;
  const scene = model.scene;
  return /* @__PURE__ */ React.createElement("div", { className: "schema-graphics-design schema-graphics-context", "data-source-file": model.sourceFile, "data-source-pointer": model.sourcePointer }, /* @__PURE__ */ React.createElement("section", { className: "sd-console-response" }, /* @__PURE__ */ React.createElement("small", null, "TREE SELECTION \u2192 CONSOLE RESPONSE"), /* @__PURE__ */ React.createElement("strong", null, model.label, " \u2192 ", scene?.label || model.sceneId || "No scene"), /* @__PURE__ */ React.createElement("span", { className: "sd-console-rule" }, "View rule: ", model.rule?.label || "Default scene"), model.focusId ? /* @__PURE__ */ React.createElement("span", { className: "sd-console-focus" }, "Highlight behavior: ", model.focus?.label || model.focusId) : null), scene ? /* @__PURE__ */ React.createElement("details", { className: "sd-console-scene-details" }, /* @__PURE__ */ React.createElement("summary", null, "Show scene details"), /* @__PURE__ */ React.createElement("section", { className: "sd-console-scene" }, /* @__PURE__ */ React.createElement("div", { className: "sd-console-scene-head" }, /* @__PURE__ */ React.createElement("strong", null, scene.label || model.sceneId), /* @__PURE__ */ React.createElement("small", null, scene.kind === "tabs" ? "Tabbed view" : "Layered scene")), scene.surface?.widget ? /* @__PURE__ */ React.createElement(Row, { title: "Surface", detail: scene.surface.widget }) : null, (scene.layers || []).map((layer, index) => /* @__PURE__ */ React.createElement(Row, { key: layer.id || index, title: layer.label || layer.id || "Layer", detail: [layer.input, layer.widget || Object.entries(layer.widgets || {}).map(([dimension, id]) => `${dimension}D: ${id}`).join(" / ") || layer.handler || "Surface layer"].filter(Boolean).join(" \xB7 ") })), (scene.tabs || []).map((tab, index) => /* @__PURE__ */ React.createElement(Row, { key: tab.id || index, title: tab.label || tab.id || "Tab", detail: [tab.input, tab.widget].filter(Boolean).join(" \xB7 ") })), scene.inputs?.length ? /* @__PURE__ */ React.createElement("details", { className: "sd-graphics-authoring-section" }, /* @__PURE__ */ React.createElement("summary", null, "Data bindings (", scene.inputs.length, ")"), scene.inputs.map((input, index) => /* @__PURE__ */ React.createElement(Row, { key: input.id || index, title: input.label || input.id || "Input", detail: [input.source?.scope, input.source?.path].filter(Boolean).join(" \xB7 ") }))) : null)) : null);
}
const mounted = /* @__PURE__ */ new WeakMap();
function mountGraphicsContextView({ container, context } = {}) {
  if (!container) throw new Error("Choose a Graphics context container.");
  if (mounted.get(container)?.inspect().mounted) mounted.get(container).update({ context });
  else mounted.set(container, mountReactComponent(container, GraphicsContext, { context }));
  return context || null;
}
export {
  GraphicsContext,
  mountGraphicsContextView
};

//# sourceMappingURL=context-view.js.map
