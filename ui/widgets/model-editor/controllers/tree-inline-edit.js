// Generated from tree-inline-edit.jsx by scripts/build-frontend.mjs.
import React from "../../shared/react/react-runtime.js";
import { TreeInlineRename } from "../../tree/widget.js";
import { renderOwnedView } from "../../../runtime/owned-view.js";
function renderTreeRootTitle(sessionContext, { label, onChange, onCommit, onCancel }) {
  const host = sessionContext.$(".tree-root-heading h2");
  if (!host) return;
  renderOwnedView(host, sessionContext.treeRename?.nodeId === "@root" ? /* @__PURE__ */ React.createElement(TreeInlineRename, { rename: sessionContext.treeRename, onChange, onCommit, onCancel }) : /* @__PURE__ */ React.createElement("button", { id: "tree-home", className: "tree-home-button tree-root-title", type: "button", title: `Show model overview for ${label}`, ...sessionContext.activeApplicationPackage?.kind === "schemaDocument" ? { "data-model-path": "[]" } : {}, onClick: sessionContext.showModelOverview }, label));
}
export {
  renderTreeRootTitle
};

//# sourceMappingURL=tree-inline-edit.js.map
