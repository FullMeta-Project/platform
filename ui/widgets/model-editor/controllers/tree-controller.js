// Generated from tree-controller.jsx by scripts/build-frontend.mjs.
import { validateTreeAnnotationCandidate, applicationTreeBehavior, schemaAuthoringTreePreview, treeIconSource, treeIconForDeclaration, treeIconForPath, createModelTreeItem, treeSectionIconSvg, appendTreeSectionIcon, schemaTreeButtonForSelection, updateTreeSelection, treeUiSetting, configureTreeRoot, configureTreeSectionCollapse, treeItemPath, treeArrayPathForItem, configureTreeItemDragging, clearTreeDropIndicators, reorderTreeItem, moveSpecialTreeItem, treeDropPlan, renderTree, selectItem, showModelOverview, treeActionPlans, modelAfterTreeDeletion, deleteTreeItem, startInlineTreeRename, startRenameTreeItem, startDeclaredTreeInlineEdit, closeTreeMenu, treeInsertionForAction, toggleTreeItemEnabled, treeActionAvailability, performTreeInsertionAction, performDeclaredTreeAction, clearTreeDropTargetIndicators, setTreeWidth } from "./tree-controller-actions.js";
import React from "../../shared/react/react-runtime.js";
import { changeTreeRename, commitTreeRename, cancelTreeRename } from "./tree-controller-actions.js";
import { renderOwnedView, joinView } from "../../../runtime/owned-view.js";
import { SchemaField, SchemaObject, SchemaStructure } from "../schema-form.js";
import { RowMoveControls } from "../../shared/react/collection-controls.js";
function openTreeMenu(sessionContext, event, node) {
  const itemPath = node.dataset.modelPath ? JSON.parse(node.dataset.modelPath) : null;
  const nodeArrayPath = node.dataset.arrayPath ? JSON.parse(node.dataset.arrayPath) : null;
  event.preventDefault();
  sessionContext.closeTreeMenu();
  if (node.disabled || node.getAttribute("aria-disabled") === "true") {
    sessionContext.setStatus(node.getAttribute("aria-description") || node.title || "This tree item is unavailable for actions.", "error");
    return;
  }
  let appliedPendingSettings;
  try {
    appliedPendingSettings = sessionContext.applyCurrentSettingsDraft({ refresh: false, announce: true });
  } catch {
    return;
  }
  if (appliedPendingSettings && !itemPath) sessionContext.renderTree();
  const plan = sessionContext.treeActionPlans(), menuTarget = plan.menuTarget(itemPath, nodeArrayPath);
  if (!menuTarget) return;
  const target = sessionContext.activeApplicationPackage?.kind === "schemaDocument" ? { ...menuTarget, schemaProjection: sessionContext.schemaProjectionForTreeButton.get(node) || null } : menuTarget;
  const { arrayPath } = target;
  if (itemPath && plan.selectItemOnContextMenu) {
    const previousComponentId = sessionContext.activeComponentId();
    sessionContext.selectedPath = itemPath;
    sessionContext.selectedCollection = null;
    const item = sessionContext.valueAt(itemPath);
    sessionContext.selectedLabel = target.selectionLabel || sessionContext.displayItemName(item, arrayPath);
    sessionContext.settingsDraft = sessionContext.cloneJson(item);
    sessionContext.settingsDraftDirty = false;
    sessionContext.reactTreeState = sessionContext.reduceTreeViewState(sessionContext.reactTreeState, { type: "select", id: node.dataset.treeNodeId, path: itemPath });
    sessionContext.updateTreeSelection(node);
    sessionContext.clearPreviewForComponentChange(previousComponentId, sessionContext.activeComponentId());
    sessionContext.$("#selection-title").textContent = sessionContext.selectedLabel;
    sessionContext.$("#selection-path").textContent = itemPath.join(" \u203A ");
    sessionContext.renderSettingsTable();
    sessionContext.updateApplySettingsVisibility();
    sessionContext.updateModelEditState();
    sessionContext.updateSelectionActionVisibility();
    sessionContext.updateWorkflowPanels();
    sessionContext.showGraphicsForSelection(itemPath, item, { defaultScene: true });
  }
  sessionContext.contextTarget = target;
  const actions = plan.menuEntries(target).map((entry) => entry.separator ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "context-separator" })) : entry.available === false ? sessionContext.menuButton(entry.label, entry.action) : sessionContext.availableMenuButton(entry.label, entry.action));
  if (!actions.length) return;
  renderOwnedView(sessionContext.contextMenu, joinView(actions, ""));
  sessionContext.contextMenu.classList.remove("hidden");
  const width = sessionContext.contextMenu.offsetWidth, height = sessionContext.contextMenu.offsetHeight;
  const left = Math.max(8, Math.min(event.clientX, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(event.clientY, window.innerHeight - height - 8));
  sessionContext.contextMenu.style.left = left + "px";
  sessionContext.contextMenu.style.top = top + "px";
  sessionContext.contextMenu.querySelector("button:not(:disabled)")?.focus();
}
function createController(context) {
  return {
    validateTreeAnnotationCandidate: validateTreeAnnotationCandidate.bind(null, context),
    applicationTreeBehavior: applicationTreeBehavior.bind(null, context),
    schemaAuthoringTreePreview: schemaAuthoringTreePreview.bind(null, context),
    treeIconSource: treeIconSource.bind(null, context),
    treeIconForDeclaration: treeIconForDeclaration.bind(null, context),
    treeIconForPath: treeIconForPath.bind(null, context),
    createModelTreeItem: createModelTreeItem.bind(null, context),
    treeSectionIconSvg: treeSectionIconSvg.bind(null, context),
    appendTreeSectionIcon: appendTreeSectionIcon.bind(null, context),
    schemaTreeButtonForSelection: schemaTreeButtonForSelection.bind(null, context),
    updateTreeSelection: updateTreeSelection.bind(null, context),
    treeUiSetting: treeUiSetting.bind(null, context),
    configureTreeRoot: configureTreeRoot.bind(null, context),
    configureTreeSectionCollapse: configureTreeSectionCollapse.bind(null, context),
    treeItemPath: treeItemPath.bind(null, context),
    treeArrayPathForItem: treeArrayPathForItem.bind(null, context),
    configureTreeItemDragging: configureTreeItemDragging.bind(null, context),
    clearTreeDropIndicators: clearTreeDropIndicators.bind(null, context),
    reorderTreeItem: reorderTreeItem.bind(null, context),
    moveSpecialTreeItem: moveSpecialTreeItem.bind(null, context),
    treeDropPlan: treeDropPlan.bind(null, context),
    renderTree: renderTree.bind(null, context),
    selectItem: selectItem.bind(null, context),
    showModelOverview: showModelOverview.bind(null, context),
    treeActionPlans: treeActionPlans.bind(null, context),
    modelAfterTreeDeletion: modelAfterTreeDeletion.bind(null, context),
    deleteTreeItem: deleteTreeItem.bind(null, context),
    startInlineTreeRename: startInlineTreeRename.bind(null, context),
    startRenameTreeItem: startRenameTreeItem.bind(null, context),
    changeTreeRename: changeTreeRename.bind(null, context),
    commitTreeRename: commitTreeRename.bind(null, context),
    cancelTreeRename: cancelTreeRename.bind(null, context),
    startDeclaredTreeInlineEdit: startDeclaredTreeInlineEdit.bind(null, context),
    closeTreeMenu: closeTreeMenu.bind(null, context),
    treeInsertionForAction: treeInsertionForAction.bind(null, context),
    toggleTreeItemEnabled: toggleTreeItemEnabled.bind(null, context),
    treeActionAvailability: treeActionAvailability.bind(null, context),
    performTreeInsertionAction: performTreeInsertionAction.bind(null, context),
    performDeclaredTreeAction: performDeclaredTreeAction.bind(null, context),
    openTreeMenu: openTreeMenu.bind(null, context),
    clearTreeDropTargetIndicators: clearTreeDropTargetIndicators.bind(null, context),
    setTreeWidth: setTreeWidth.bind(null, context)
  };
}
export {
  createController
};

//# sourceMappingURL=tree-controller.js.map
