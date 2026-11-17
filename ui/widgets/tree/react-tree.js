// Generated from react-tree.jsx by scripts/build-frontend.mjs.
import React, { useLayoutEffect, useRef } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
const dataProps = (node) => ({
  "data-tree-node-id": node.id,
  ...node.path && node.kind !== "collectionLink" ? { "data-model-path": JSON.stringify(node.path) } : {},
  ...node.projection?.treeLocation ? { "data-schema-tree-location": JSON.stringify(node.projection.treeLocation) } : {},
  ...node.sourcePointer ? { "data-source-pointer": node.sourcePointer } : {},
  ...node.sourceFile ? { "data-source-file": node.sourceFile } : {}
});
function TreeInlineRename({ rename, onChange, onCommit, onCancel }) {
  const input = useRef(null);
  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, [rename.nodeId]);
  useLayoutEffect(() => {
    if (rename.error) {
      input.current?.focus();
      input.current?.select();
    }
  }, [rename.error]);
  return /* @__PURE__ */ React.createElement("input", { ref: input, type: "text", maxLength: 120, className: "tree-rename-input", "aria-label": `Rename ${rename.original}`, "aria-invalid": rename.error ? true : void 0, title: rename.error || void 0, value: rename.value, onChange: (event) => onChange?.(event.target.value), onBlur: onCommit, onKeyDown: (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit?.();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel?.();
    }
  } });
}
function TreeItem({ node, owner = false, callbacks, iconForNode }) {
  const reference = useRef(null), icon = iconForNode?.(node) || null;
  useLayoutEffect(() => {
    if (reference.current) callbacks.onNodeRef?.(node, reference.current);
  }, [node, callbacks.onNodeRef]);
  const className = [
    "tree-item",
    owner && "tree-owner-item",
    node.active && "active",
    node.className,
    icon && "tree-has-icon",
    node.readOnly && "tree-projection-readonly"
  ].filter(Boolean).join(" ");
  if (node.readOnly) return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: reference,
      className,
      title: node.title,
      "aria-label": `${node.label} (read only)`,
      "aria-disabled": "true",
      ...dataProps(node)
    },
    /* @__PURE__ */ React.createElement("span", { className: "tree-item-text" }, node.label)
  );
  if (callbacks.rename?.nodeId === node.id) return /* @__PURE__ */ React.createElement(TreeInlineRename, { rename: callbacks.rename, onChange: callbacks.onRenameChange, onCommit: callbacks.onRenameCommit, onCancel: callbacks.onRenameCancel });
  const select = (event) => {
    if (node.kind === "collectionLink") callbacks.onCollectionSelect?.(node, event.currentTarget);
    else callbacks.onSelect?.(node, event.currentTarget);
  };
  const disabledReason = !node.enabled ? node.disabledReason || "This tree item is unavailable for selection." : null;
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      ref: reference,
      type: "button",
      className,
      title: disabledReason || node.title,
      "aria-description": disabledReason || void 0,
      disabled: !node.enabled,
      ...dataProps(node),
      ...node.kind === "collectionLink" ? { "data-array-path": JSON.stringify(node.path) } : {},
      onClick: select,
      onFocus: () => callbacks.onFocus?.(node)
    },
    icon ? /* @__PURE__ */ React.createElement("img", { className: "tree-item-icon", alt: "", "aria-hidden": "true", src: icon, onError: (event) => {
      event.currentTarget.hidden = true;
    } }) : null,
    /* @__PURE__ */ React.createElement("span", { className: "tree-item-text" }, node.label)
  );
}
function TreeNode({ node, callbacks, iconForNode, collapsedHandle, expandedHandle }) {
  if (node.kind !== "group") return /* @__PURE__ */ React.createElement(TreeItem, { node, callbacks, iconForNode });
  const label = node.owner?.label || node.label || "tree section";
  const sectionIcon = !node.owner ? iconForNode?.({ ...node, kind: "section" }) : null;
  const toggle = (event) => {
    event.stopPropagation();
    callbacks.onToggle?.({ id: node.id, path: node.path, expanded: !node.expanded, node });
  };
  return /* @__PURE__ */ React.createElement(
    "section",
    {
      className: ["tree-group", node.className, node.expandable && !node.expanded && "tree-group-collapsed"].filter(Boolean).join(" "),
      "data-tree-node-id": node.id,
      "data-tree-expanded": String(node.expanded),
      "data-tree-lazy": String(node.lazy),
      ...node.heading ? { "data-array-path": JSON.stringify(node.path) } : {}
    },
    node.expandable ? /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "tree-label tree-section-heading",
        ...node.heading ? { "data-array-path": JSON.stringify(node.path), "data-context-label": node.label } : {},
        onClick: (event) => {
          if (!(event.target instanceof Element) || !event.target.closest(".tree-item,.tree-section-toggle")) toggle(event);
        }
      },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "tree-section-toggle",
          "aria-expanded": node.expanded,
          "aria-label": `${node.expanded ? "Collapse" : "Expand"} ${label}`,
          title: `${node.expanded ? "Collapse" : "Expand"} ${label}`,
          onClick: toggle,
          onFocus: () => callbacks.onFocus?.(node)
        },
        /* @__PURE__ */ React.createElement("span", { className: "tree-section-handle-collapsed", "data-tree-toggle-handle": "collapsed", hidden: node.expanded }, collapsedHandle),
        /* @__PURE__ */ React.createElement("span", { className: "tree-section-handle-expanded", "data-tree-toggle-handle": "expanded", hidden: !node.expanded }, expandedHandle)
      ),
      sectionIcon ? /* @__PURE__ */ React.createElement("img", { className: "tree-section-icon", alt: "", "aria-hidden": "true", src: sectionIcon, onError: (event) => {
        event.currentTarget.hidden = true;
      } }) : null,
      node.owner ? /* @__PURE__ */ React.createElement(TreeItem, { node: node.owner, owner: true, callbacks, iconForNode }) : /* @__PURE__ */ React.createElement("span", { className: "tree-section-title" }, node.label)
    ) : null,
    node.expanded ? node.children.map((child) => /* @__PURE__ */ React.createElement(
      TreeNode,
      {
        key: child.id,
        node: child,
        callbacks,
        iconForNode,
        collapsedHandle,
        expandedHandle
      }
    )) : null
  );
}
function SchemaTree({
  projection,
  onSelect,
  onCollectionSelect,
  onToggle,
  onFocus,
  onNodeRef,
  onPopulate,
  iconForNode,
  rename,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  collapsedHandle = "\u25B8",
  expandedHandle = "\u25BE"
}) {
  const reference = useRef(null);
  const callbacks = { onSelect, onCollectionSelect, onToggle, onFocus, onNodeRef, rename, onRenameChange, onRenameCommit, onRenameCancel };
  useLayoutEffect(() => {
    onPopulate?.(reference.current?.parentElement || reference.current);
  }, [projection, onPopulate]);
  const navigate = (event) => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const target = event.target.closest("button");
    if (!target) return;
    const buttons = [...reference.current.querySelectorAll("button.tree-item:not([disabled]),button.tree-section-toggle")].filter((button) => !button.closest("[hidden]"));
    const index = buttons.indexOf(target);
    if (index < 0) return;
    let next;
    if (event.key === "ArrowDown") next = buttons[Math.min(index + 1, buttons.length - 1)];
    if (event.key === "ArrowUp") next = buttons[Math.max(0, index - 1)];
    if (event.key === "Home") next = buttons[0];
    if (event.key === "End") next = buttons.at(-1);
    if (event.key === "ArrowRight") {
      const section = target.closest(".tree-group"), toggle = section?.querySelector(":scope > .tree-label > .tree-section-toggle");
      if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
      else next = buttons[Math.min(index + 1, buttons.length - 1)];
    }
    if (event.key === "ArrowLeft") {
      const section = target.closest(".tree-group"), toggle = section?.querySelector(":scope > .tree-label > .tree-section-toggle");
      const owner = section?.querySelector(":scope > .tree-label > .tree-owner-item");
      const parent = section?.parentElement?.closest(".tree-group")?.querySelector(":scope > .tree-label > .tree-item,:scope > .tree-label > .tree-section-toggle");
      if (target.matches(".tree-section-toggle")) {
        if (target.getAttribute("aria-expanded") === "true") {
          next = target;
          target.click();
        } else next = parent;
      } else if (target === owner) {
        if (toggle?.getAttribute("aria-expanded") === "true") {
          next = target;
          toggle.click();
        } else next = parent;
      } else next = owner || toggle || parent;
    }
    event.preventDefault();
    if (next && next !== document.activeElement) next.focus();
  };
  return /* @__PURE__ */ React.createElement("div", { ref: reference, className: "tree-react-content", "data-tree-renderer": "react-jsx", "data-tree-view-format": projection?.format, onKeyDown: navigate }, (projection?.nodes || []).map((node) => /* @__PURE__ */ React.createElement(
    TreeNode,
    {
      key: node.id,
      node,
      callbacks,
      iconForNode,
      collapsedHandle,
      expandedHandle
    }
  )));
}
function mountReactTree(container, props) {
  return mountReactComponent(container, SchemaTree, props, { identifierPrefix: "fullmeta-tree-" });
}
export {
  SchemaTree,
  TreeInlineRename,
  mountReactTree
};

//# sourceMappingURL=react-tree.js.map
