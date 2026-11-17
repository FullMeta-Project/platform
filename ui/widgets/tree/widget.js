// Generated from widget.jsx by scripts/build-frontend.mjs.
import { treeDesignLabel, renderTreeDesignEditor } from "./design-editor.js";
import { populateTreeSection, renderSchemaTree, configureTreeSections, labelCase } from "./runtime.js";
import { treePathMatches, treeConditionMatches, resolveTreeDescriptor, createSchemaTreeActionPlans } from "./tree-declarations.js";
import { createTreeItem, setTreeToggleState, createTreeToggle } from "./tree-primitives.js";
import { validateUiTreeAnnotation } from "./tree-schema.js";
import { createTreeViewState, reduceTreeViewState, projectSchemaTree, visibleTreeItems } from "./tree-projection.js";
import { SchemaTree, mountReactTree, TreeInlineRename } from "./react-tree.js";
import { TreeDesignEditor } from "./design-editor.js";
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { SchemaTree as SchemaTree2 } from "./react-tree.js";
function Tree({ view, onCommand, callbacks = {}, ...props }) {
  const handlers = { ...props, ...view, ...callbacks };
  return /* @__PURE__ */ React.createElement(
    SchemaTree2,
    {
      ...props,
      ...view,
      ...callbacks,
      projection: view?.projection || view?.value || props.projection || view,
      onSelect: (node, element) => {
        handlers.onSelect?.(node, element);
        onCommand?.({ type: "widget.action", widget: "tree", path: node.path || [], action: "select", args: { id: node.id } });
      },
      onToggle: (command) => {
        handlers.onToggle?.(command);
        onCommand?.({ type: "widget.action", widget: "tree", path: command.path || [], action: "toggle", args: { id: command.id, expanded: command.expanded } });
      }
    }
  );
}
const mountWidget = (container, props) => mountReactComponent(container, Tree, props);
export {
  SchemaTree,
  Tree,
  TreeDesignEditor,
  TreeInlineRename,
  Tree as Widget,
  configureTreeSections,
  createSchemaTreeActionPlans,
  createTreeItem,
  createTreeToggle,
  createTreeViewState,
  labelCase,
  mountReactTree,
  mountWidget,
  populateTreeSection,
  projectSchemaTree,
  reduceTreeViewState,
  renderSchemaTree,
  renderTreeDesignEditor,
  resolveTreeDescriptor,
  setTreeToggleState,
  treeConditionMatches,
  treeDesignLabel,
  treePathMatches,
  validateUiTreeAnnotation,
  visibleTreeItems
};

//# sourceMappingURL=widget.js.map
