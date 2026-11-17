// Generated from resources.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { documentValueAtPath } from "./registry.js";
function DocumentResources({ view, onCommand, widgets = [], sourceDocument, open, create }) {
  const model = view || { widgets, sourceDocument };
  return /* @__PURE__ */ React.createElement("div", { className: "document-widget-index", "data-jsx-widget": "document-resources" }, (model.widgets || []).filter((widget) => widget.widget !== "source").map((widget) => {
    const declared = documentValueAtPath(model.sourceDocument ?? model.value, widget.path) !== void 0;
    const act = () => onCommand ? onCommand({ type: "widget.action", widget: "documentResources", path: widget.path, action: declared ? "open" : "create", args: { id: widget.id } }) : declared ? open?.(widget) : create?.(widget);
    return /* @__PURE__ */ React.createElement("div", { className: "document-widget-card", key: widget.id }, /* @__PURE__ */ React.createElement("strong", null, widget.label), /* @__PURE__ */ React.createElement("span", null, declared ? `Widget \u2192 ${widget.widget === "structured" ? "Structured UI settings" : widget.label}` : "Declaration is not present"), /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", disabled: declared ? !onCommand && typeof open !== "function" : typeof widget.initialValue === "undefined" || !onCommand && typeof create !== "function", onClick: act }, declared ? "Open" : "Create"));
  }));
}
const roots = /* @__PURE__ */ new WeakMap();
function mountDocumentWidgetIndex(container, props) {
  const mounted = roots.get(container);
  if (mounted?.inspect().mounted) mounted.update(props);
  else roots.set(container, mountReactComponent(container, DocumentResources, props));
}
const mountWidget = (container, props) => mountReactComponent(container, DocumentResources, props);
export {
  DocumentResources,
  mountDocumentWidgetIndex,
  mountWidget
};

//# sourceMappingURL=resources.js.map
