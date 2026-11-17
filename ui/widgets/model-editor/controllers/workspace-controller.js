// Generated from workspace-controller.jsx by scripts/build-frontend.mjs.
import { applicationExtension, editorDomain, editorEndpoint, editorFactory, editorOptions, editorAllows, applicationResultAdapter, activateApplicationPackage, resizeWidthsFor, applyResizeWidths, restoreResizeWidths, beginColumnResize, nudgeColumnBoundary, prepareResizableTable, prepareResizableTables, setStatus, updateWorkflowPanels, currentSelectionIsLoaded, commitVisibleEditorState, updateBuildButtons, updatePreviewRunbar, editorWorkflow, invalidatePreviewArtifacts, esc, valueAt, componentVariantSource, hasEditorRole, editorRolePath, editorRolePathAt, isEditorRoleRoot, isEditorRoleItem, hasAnyEditorRole, profileCopy, profileCopyFormat, sharedUiCopy, formatChoiceLabel, profileDataLabel, activeScenario, activeScenarioDimension, applyProfileAttributes, applyProfileVisibility, applyUiProfile, loadUiProfile, pathLabel, compatibleUnitsFor, commitInputsBeforeRowMove, addItem, samePath, uniqueId, uniqueName, uniqueSymbol, componentForArray, activeComponentId, clearPreviewForComponentChange, cloneWithUniqueIds, defaultArrayItem, displayItemName, referenceItemLabel, insertionIndexFor, checkArrayInsertionLimit, insertArrayItem, isToggleEnabledItemPath, availableMenuButton, panelLayoutDefaults, readPanelSize, setGraphicsHeight, bindWidthSplitter, bindGraphicsHeightSplitter, restorePanelLayout, applicationRequestOptions, configureGraphicsWidget, enablePreviewLayer, showDefaultGraphicsScene, showGeometryView, renderSweepTable, restoreApplicationPreview, exitEditor, setTab } from "./workspace-controller-actions.js";
import React from "../../shared/react/react-runtime.js";
import { renderOwnedView, joinView } from "../../../runtime/owned-view.js";
import { SchemaField, SchemaObject, SchemaStructure } from "../schema-form.js";
import { RowMoveControls } from "../../shared/react/collection-controls.js";
function addSettingRow(sessionContext, label, value, path, schemaNode = null, widgetRenderers = {}) {
  const context = sessionContext.schemaFieldContext(widgetRenderers);
  return /* @__PURE__ */ React.createElement(SchemaField, { ...{ label, value, path, schemaNode, context } });
}
function renderRepairMode(sessionContext) {
  sessionContext.reactTreeMount?.dispose();
  sessionContext.reactTreeMount = null;
  sessionContext.reactTreeProjection = null;
  sessionContext.selectedPath = null;
  sessionContext.selectedCollection = null;
  sessionContext.selectedLabel = "";
  sessionContext.settingsDraft = null;
  sessionContext.settingsDraftDirty = false;
  sessionContext.updateFieldSummary({ overview: false });
  sessionContext.settingsTable.classList.remove("hidden");
  sessionContext.resultRenderSequence++;
  sessionContext.activeResultActionId = null;
  sessionContext.lastSweepRender = null;
  sessionContext.fieldPlotState = null;
  sessionContext.fullJson.value = JSON.stringify(sessionContext.model, null, 2);
  sessionContext.jsonDraftDirty = false;
  renderOwnedView(sessionContext.treeContent, /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, sessionContext.profileCopy("repairSchemaNotice", "This manifest does not satisfy {schema}. Select Validate to see the schema issues.").replaceAll("{schema}", sessionContext.model?.modelFormat || sessionContext.activeApplicationPackage?.modelSchema?.title || "the model schema")));
  renderOwnedView(sessionContext.settingsTable.tBodies[0], /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2"), className: "settings-empty" }, "Model settings are unavailable until the JSON structure is repaired."))));
  sessionContext.$("#resolved-values").textContent = `Model JSON has ${sessionContext.modelRepairErrors.length} issue(s):
${sessionContext.modelRepairErrors.slice(0, 80).join("\n")}`;
  sessionContext.$("#selection-title").textContent = sessionContext.model?.metadata?.name || sessionContext.loadedModelFile || "Invalid model";
  sessionContext.$("#selection-path").textContent = "Model JSON needs repair";
  sessionContext.$("#editor-note").textContent = "This model cannot be edited here because its structure does not match the active schema. Correct the model file in its project folder, then select Refresh.";
  sessionContext.updateSelectionActionVisibility();
  if (sessionContext.applicationExtension("resultSettings")) sessionContext.applicationExtension("resultSettings").hidden = true;
  sessionContext.updateWorkflowPanels();
  sessionContext.$("#result-chart").hidden = true;
  sessionContext.$("#result-legend").replaceChildren();
  sessionContext.$("#results-toolbar").replaceChildren();
  sessionContext.$("#geometry-view").hidden = false;
  sessionContext.$("#geometry-note").hidden = false;
  sessionContext.$("#geometry-note").textContent = "The graphics preview is unavailable until this model JSON is repaired.";
  sessionContext.$("#geometry-controls").hidden = true;
  sessionContext.$("#results-view").hidden = true;
  sessionContext.$("#results-note").hidden = true;
  sessionContext.$("#result-message").hidden = true;
  sessionContext.$("#preview-summary").textContent = "Model JSON needs repair";
  sessionContext.previewContext.clearRect(0, 0, sessionContext.previewCanvas.width, sessionContext.previewCanvas.height);
  sessionContext.setTab();
  sessionContext.syncModelActionAvailability();
  sessionContext.updateModelEditState();
}
function menuButton(sessionContext, label, action, { disabled = false, reason = "" } = {}) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "context-menu-item", type: "button", role: "menuitem", "data-action": action, ...disabled ? { "disabled": true, "aria-disabled": "true" } : {}, ...reason ? { "title": reason } : {} }, label));
}
function createController(context) {
  return {
    applicationExtension: applicationExtension.bind(null, context),
    editorDomain: editorDomain.bind(null, context),
    editorEndpoint: editorEndpoint.bind(null, context),
    editorFactory: editorFactory.bind(null, context),
    editorOptions: editorOptions.bind(null, context),
    editorAllows: editorAllows.bind(null, context),
    applicationResultAdapter: applicationResultAdapter.bind(null, context),
    activateApplicationPackage: activateApplicationPackage.bind(null, context),
    resizeWidthsFor: resizeWidthsFor.bind(null, context),
    applyResizeWidths: applyResizeWidths.bind(null, context),
    restoreResizeWidths: restoreResizeWidths.bind(null, context),
    beginColumnResize: beginColumnResize.bind(null, context),
    nudgeColumnBoundary: nudgeColumnBoundary.bind(null, context),
    prepareResizableTable: prepareResizableTable.bind(null, context),
    prepareResizableTables: prepareResizableTables.bind(null, context),
    setStatus: setStatus.bind(null, context),
    updateWorkflowPanels: updateWorkflowPanels.bind(null, context),
    currentSelectionIsLoaded: currentSelectionIsLoaded.bind(null, context),
    commitVisibleEditorState: commitVisibleEditorState.bind(null, context),
    updateBuildButtons: updateBuildButtons.bind(null, context),
    updatePreviewRunbar: updatePreviewRunbar.bind(null, context),
    editorWorkflow: editorWorkflow.bind(null, context),
    invalidatePreviewArtifacts: invalidatePreviewArtifacts.bind(null, context),
    esc: esc.bind(null, context),
    valueAt: valueAt.bind(null, context),
    componentVariantSource: componentVariantSource.bind(null, context),
    hasEditorRole: hasEditorRole.bind(null, context),
    editorRolePath: editorRolePath.bind(null, context),
    editorRolePathAt: editorRolePathAt.bind(null, context),
    isEditorRoleRoot: isEditorRoleRoot.bind(null, context),
    isEditorRoleItem: isEditorRoleItem.bind(null, context),
    hasAnyEditorRole: hasAnyEditorRole.bind(null, context),
    profileCopy: profileCopy.bind(null, context),
    profileCopyFormat: profileCopyFormat.bind(null, context),
    sharedUiCopy: sharedUiCopy.bind(null, context),
    formatChoiceLabel: formatChoiceLabel.bind(null, context),
    profileDataLabel: profileDataLabel.bind(null, context),
    activeScenario: activeScenario.bind(null, context),
    activeScenarioDimension: activeScenarioDimension.bind(null, context),
    applyProfileAttributes: applyProfileAttributes.bind(null, context),
    applyProfileVisibility: applyProfileVisibility.bind(null, context),
    applyUiProfile: applyUiProfile.bind(null, context),
    loadUiProfile: loadUiProfile.bind(null, context),
    pathLabel: pathLabel.bind(null, context),
    addSettingRow: addSettingRow.bind(null, context),
    compatibleUnitsFor: compatibleUnitsFor.bind(null, context),
    commitInputsBeforeRowMove: commitInputsBeforeRowMove.bind(null, context),
    addItem: addItem.bind(null, context),
    samePath: samePath.bind(null, context),
    renderRepairMode: renderRepairMode.bind(null, context),
    uniqueId: uniqueId.bind(null, context),
    uniqueName: uniqueName.bind(null, context),
    uniqueSymbol: uniqueSymbol.bind(null, context),
    componentForArray: componentForArray.bind(null, context),
    activeComponentId: activeComponentId.bind(null, context),
    clearPreviewForComponentChange: clearPreviewForComponentChange.bind(null, context),
    cloneWithUniqueIds: cloneWithUniqueIds.bind(null, context),
    defaultArrayItem: defaultArrayItem.bind(null, context),
    displayItemName: displayItemName.bind(null, context),
    referenceItemLabel: referenceItemLabel.bind(null, context),
    insertionIndexFor: insertionIndexFor.bind(null, context),
    checkArrayInsertionLimit: checkArrayInsertionLimit.bind(null, context),
    insertArrayItem: insertArrayItem.bind(null, context),
    menuButton: menuButton.bind(null, context),
    isToggleEnabledItemPath: isToggleEnabledItemPath.bind(null, context),
    availableMenuButton: availableMenuButton.bind(null, context),
    panelLayoutDefaults: panelLayoutDefaults.bind(null, context),
    readPanelSize: readPanelSize.bind(null, context),
    setGraphicsHeight: setGraphicsHeight.bind(null, context),
    bindWidthSplitter: bindWidthSplitter.bind(null, context),
    bindGraphicsHeightSplitter: bindGraphicsHeightSplitter.bind(null, context),
    restorePanelLayout: restorePanelLayout.bind(null, context),
    applicationRequestOptions: applicationRequestOptions.bind(null, context),
    configureGraphicsWidget: configureGraphicsWidget.bind(null, context),
    enablePreviewLayer: enablePreviewLayer.bind(null, context),
    showDefaultGraphicsScene: showDefaultGraphicsScene.bind(null, context),
    showGeometryView: showGeometryView.bind(null, context),
    renderSweepTable: renderSweepTable.bind(null, context),
    restoreApplicationPreview: restoreApplicationPreview.bind(null, context),
    exitEditor: exitEditor.bind(null, context),
    setTab: setTab.bind(null, context)
  };
}
export {
  createController
};

//# sourceMappingURL=workspace-controller.js.map
