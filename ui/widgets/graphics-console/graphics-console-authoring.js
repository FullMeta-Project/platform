// Generated from graphics-console-authoring.jsx by scripts/build-frontend.mjs.
import React, { useState } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { graphicsConsoleIssues } from "./contract.js";
function GraphicsConsoleAuthoring({ definition, view, onCommand, onApply, onInspectWidget, onOpenSource, widgets = [], renderers = {} }) {
  const [draft, setDraft] = useState(() => structuredValueDraft(view?.definition || definition || view || {})), [error, setError] = useState("");
  const apply = () => {
    try {
      const next = readStructuredValueDraft(draft), issues = graphicsConsoleIssues(next, Object.keys(renderers).length ? renderers : widgets);
      if (issues.length) throw new Error(issues[0]);
      onApply?.(next);
      onCommand?.({ type: "widget.action", widget: "graphicsConsole", path: view?.path || [], action: "applyDeclaration", args: { value: next } });
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  };
  return /* @__PURE__ */ React.createElement("section", { className: "sd-graphics-authoring", "data-jsx-widget": "graphics-console-authoring" }, /* @__PURE__ */ React.createElement("h3", null, "Graphics console"), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft, label: "Graphics console", onDraftChange: setDraft, error }), /* @__PURE__ */ React.createElement("div", { className: "sd-widget-row-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: apply }, "Apply console draft"), onOpenSource ? /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onOpenSource() }, "Open source") : null), widgets.length ? /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "Registered renderers"), widgets.map((id) => /* @__PURE__ */ React.createElement("button", { key: id, type: "button", onClick: () => onInspectWidget?.(id) }, id))) : null, error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, error) : null);
}
const mounted = /* @__PURE__ */ new WeakMap();
function renderGraphicsConsoleAuthoring({ parent, ...props }) {
  if (mounted.get(parent)?.inspect().mounted) mounted.get(parent).update(props);
  else mounted.set(parent, mountReactComponent(parent, GraphicsConsoleAuthoring, props));
}
export {
  GraphicsConsoleAuthoring,
  renderGraphicsConsoleAuthoring
};

//# sourceMappingURL=graphics-console-authoring.js.map
