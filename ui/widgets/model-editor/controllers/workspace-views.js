// Generated from workspace-views.jsx by scripts/build-frontend.mjs.
import React from "../../shared/react/react-runtime.js";
import { renderOwnedView } from "../../../runtime/owned-view.js";
function renderApplicationSelectionActions(host, bindings) {
  return renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, [...bindings].sort((a, b) => (a.order || 0) - (b.order || 0)).filter((binding) => binding.placement === "selection").map((binding) => /* @__PURE__ */ React.createElement("button", { key: binding.id || binding.selector, type: "button", id: binding.selector.slice(1), className: `button ${binding.tone || ""} hidden`.trim(), "data-model-editor-selection-action": "" }, binding.label))));
}
export {
  renderApplicationSelectionActions
};

//# sourceMappingURL=workspace-views.js.map
