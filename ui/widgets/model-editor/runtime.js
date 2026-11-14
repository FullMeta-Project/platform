import {createResourceScope} from '../../runtime/lifecycle.js';
import {createWorkspaceLayoutController} from '../../runtime/workspace-layout.js';
import {createApplicationCommandDispatcher} from '../../runtime/application-commands.js';
import {createWidgetCommandDispatcher,widgetActionRecord} from '../../runtime/widget-commands.js';
import {createAdditionalEditorCommands} from './controllers/command-adapters.js';
import {nativeOperationActions} from './controllers/native-operation-controller.js';
import {assertNativeOperationValue} from '../../../js/services.js';
import {disposeGraphicsViews} from './controllers/graphics-controller.js';
import {documentFileController} from './controllers/document-files.js';
import {createStandardMenuController} from '../../workspace/edit-controller.js';
import {createController as createController0} from './controllers/schema-controller.js';
import {createHostCommandSession} from '../../runtime/editing-store.js';
import {draftWithFieldChange,draftWithOptionalField,assertFieldWritable} from '../../runtime/field-commands.js';
import {createController as createController1} from './controllers/tree-controller.js';
import {createController as createController2} from './controllers/settings-controller.js';
import {createController as createController3} from './controllers/workspace-controller.js';
import {createController as createController4} from './controllers/document-controller.js';
import {createController as createController5} from './controllers/graphics-controller.js';
import {createController as createController6} from './controllers/session-controller.js';
import {refreshEditorTools as refreshEditorToolsForContext} from './controllers/session-controller.js';
import {createCoreSchemaDialogControllers} from './schema-core-dialog-state.js';
import { createEditorWidgetDialog } from './editor-selection-dialog.js';
import { cloneModelItemWithUniqueIds, createModelSaveSnapshot, modelAfterTreeDeletion as modelAfterTreeDeletionTransaction, modelWithArrayItemDraft, modelWithSchemaValidSettingsItem, modelWithRenamedDefinitionSymbol, modelWithSettingsItem, modelWithSettingsItemDraft } from "../../../js/services.js";
import { modelEditorAvailability } from "./model-editor-availability.js";
import { compareEditorRuntime, describeEditorRuntimeMismatches } from "./model-editor-compatibility.js";

import { uniqueModelId, uniqueArrayName, insertionIndexForModelArray } from "../../../js/services.js";
import { createOperationProgressState } from "./operation-progress.js";
import { getCoreUnit } from "../../../core-rust/js/api.js";
import { createTreeItem, setTreeToggleState } from "../tree/widget.js";
import { renderSchemaField, renderSchemaObject, renderSchemaStructure } from "./schema-form.js";
import { mountSchemaChoiceAuthoring } from "./schema-choice-authoring.js";
import { validateSchemaValueDeclarationCompatibility } from "./schema-value-control-authoring.js";
import { mountSchemaAnnotationAuthoring } from "./schema-annotation-authoring.js";
import { mountSchemaAnnotationPicker } from "./schema-annotation-picker.js";
import { mountSchemaUiAnnotationAuthoring } from "./schema-ui-annotation-authoring.js";
import { createSchemaUiAnnotationEditor } from "./schema-ui-annotation-dialog.js";
import { createBulkAnnotationDialog } from "./schema-bulk-authoring.js";
import { createBulkWidgetSettingsDialog } from "./schema-bulk-widgets.js";
import { loadWidgetCatalogs } from "../shared/catalog.js";
import { declaredSchemaAuthoringTools } from "./schema-authoring-tools.js";
import { createBulkFieldConstraintsDialog } from "./schema-bulk-constraints.js";
import { createNestedStructureDialog } from "./schema-nested-structure.js";
import { createBulkSchemaAuthoringDialog, schemaWithAuthoringBatch,bulkSchemaAuthoringDialogDraft,stageSchemaAuthoringRows } from './schema-bulk-schema-authoring.js';
import { schemaAuthoringWorkflowState, observeSchemaAuthoringDialogs } from './schema-authoring-workflow.js';
import { createBulkEditActionsDialog } from "./schema-bulk-edit-actions.js";
import { createBulkReferenceDialog } from "./schema-bulk-references.js";
import { createBulkValidationDialog } from "./schema-bulk-validation.js";
import { createValidationRuleRecipeDialog } from "./schema-rule-recipes.js";
import { createBulkRootContractsDialog } from "./schema-root-contracts.js";
import { createSchemaTreeAnnotationsDialog, schemaTreeAnnotationEditPaths, schemaWithTreeAnnotationEdits } from "./schema-tree-annotations.js";
import { createRootConstraintsDialog } from "./schema-root-constraints.js";
import { createObjectRulesDialog } from "./schema-object-rules.js";
import { createConditionalDefinitionsDialog } from "./schema-conditional-definitions.js";
import { createLocalDefinitionsDialog } from "./schema-local-definitions.js";
import { createDefinitionPatchesDialog } from "./schema-definition-patches.js";
import { createGeneratedFieldOverlaysDialog, schemaWithGeneratedFieldOverlays } from "./schema-generated-overlays.js";
import { createDefinitionWorksheetDialog } from "./schema-definition-worksheet.js";
import { createDefinitionRefactorDialog, schemaWithFactoredDefinition } from "./schema-definition-refactor.js";
import { createSiblingDefinitionCopyDialog } from "./schema-sibling-definition-copy.js";
import { createSchemaBranchAuditDialog, inspectSchemaDocument, schemaStructureSummary } from "./schema-branch-audit.js";
import { createRuntimeRouteDialog } from "./schema-runtime-route-authoring.js";
import { jsonPointerPath } from "../../../js/services.js";
import { schemaWidgetDesignContext } from "./schema-widget-context.js";
import { schemaDeclarationOverview } from "./schema-declaration-overview.js";
import { componentVariantSourcePath, fieldWithVariantRowValues } from "./schema-component-variant.js";
import { inheritedSchemaWidget } from "./schema-inherited-widget.js";
import { schemaActionSourceForDeclaration, effectiveSchemaTreeLabel } from "./schema-action-presentation.js";
import { mountGraphicsConsoleDesignEditor } from "../graphics-console/widget.js";
import { mountGraphicsInterfacesDesignEditor } from "../graphics-console/widget.js";
import { mountStructuredValueEditor,structuredValueDraft } from "../shared/structured-value-editor.js";
import { documentWidgetAtPath, documentValueAtPath, mountDocumentWidgetIndex } from "../document-resources/widget.js";
import { mountSchemaGraphicsContext } from "./schema-graphics-context.js";
import { duplicateSchemaMember, editSchemaStructure, isSchemaTreeDeclaration, schemaCollectionTreePresentation, schemaDeclarationScope, schemaGeneratedOwnerAtPath, schemaGeneratedOwnershipIssue, schemaSingleItemPolicy, schemaWithAuthoringOperation, schemaWithEditedProperties } from "./schema-structure-authoring.js";
import { projectIntegrationDefaults } from "./schema-project-integration-authoring.js";
import { renderProjectIntegrationForm, projectIntegrationFormInput } from "./schema-project-integration-form.js";
import { inspectSchemaStructure } from "./schema-structure-inspector.js";
import { schemaWithEditedStructureFields, structureCellEditIssue } from "./schema-structure-edit.js";
import { mountQuantityVectorDefaultEditor } from "../quantity-vector/widget.js";
import { applySchemaWidgetAction, applySchemaWidgetChange } from "./schema-widgets.js";
import { moveArrayRow, renderRowMoveButtons, rowReorderingAllowed } from "../shared/row-collection/row-order.js";
import { initialQuantityVectorValue } from "../quantity-vector/widget.js";
import { schemaWidget, schemaWidgetOptions, widgetFromAnnotation } from "../shared/schema-widget.js";
import { fieldUiBehavior, legacyFieldUiView, writeFieldUiBehavior, FIELD_UI_BEHAVIOR_KEY } from "../../annotation-language.js";
import { configureTreeSections, renderSchemaTree } from "../tree/widget.js";
import { createTreeViewState, reduceTreeViewState, projectSchemaTree, mountReactTree } from '../tree/widget.js';
import { mountSettingsPanel, mountGraphicsControls } from '../shared/react/surfaces.js';
import { projectSettingsFields } from '../shared/react/view-projection.js';
import { createEditorDebugController, installEditorWatch, mountEditorDebugPanel } from '../../../js/services.js';
import { captureEditorDialogState, restoreEditorDialogState, captureEditorPanelState, restoreEditorPanelState, validateEditorWorkspaceState, validateEditorDialogState, captureEditorFocus, restoreEditorFocus, inspectEditorSurface } from './editor-state.js';
import { createApplicationPanelLifecycle } from './application-panel-lifecycle.js';
import { graphicsSceneForSelection, graphicsSceneInputs, graphicsLayerForRole, graphicsTabForRole } from "../graphics-console/widget.js";
import { createGraphicsLayerRegistry } from "../graphics-console/widget.js";
import { createValidationProgramDesigner, fullMetaValidationProgramKeys, assertDeclarativeDocument } from "../validation-program/widget.js";
import { createValidationExpressionDialog } from "../validation-program/widget.js";
import { documentWithValidationEdits, validationEditDraftIssue, validationRulePointerParts } from "../validation-program/widget.js";
import { selectPlotTableView } from "../plot-table/widget.js";
import { resolveResultView, showResultViewSurface } from "../result-view/widget.js";
import { modelEditorNote, modelEditorNotes, modelEditorPathMatches, modelEditorSelectionHasRole, modelEditorSelectionMatches, modelEditorSelectionPanels, modelEditorTitle, modelEditorScenarioId, modelEditorScenario, modelEditorScenarioDimension, modelEditorNewModelChoices, modelEditorGraphicsComponentId } from "../model-editor-behavior/widget.js";

/** One workspace editor per document; all instance state is created at mount time. */
export async function mountModelEditorRuntime(container, { services, options = {}, initial }) {
const resources=createResourceScope();
let workspaceLayout;
const controllerContext={
    get standardMenus(){return standardMenus;},
    get workspaceLayout(){return workspaceLayout;},
    get workspacePicker(){return fileDialogs.picker;},
    get openWorkspaceModelPicker(){return fileDialogs.openModelPicker;},
    get inspectFileDialog(){return fileDialogs.inspect;},
    get updateFileDialog(){return fileDialogs.update;},
    get browseFileDialog(){return fileDialogs.browse;},
    get submitFileDialog(){return fileDialogs.submit;},
    get snapshotFilePresentation(){return fileDialogs.snapshot;},
    get restoreFilePresentation(){return fileDialogs.restore;},
    get validateFilePresentation(){return fileDialogs.validate;},
    get resources(){return resources;},
    get rawFieldDrafts(){return rawFieldDrafts;},
    get handleFieldCommand(){return handleFieldCommand;},
    get onWidgetCommand(){return onWidgetCommand;},
    get lastNativeOperation(){return lastNativeOperation;},set lastNativeOperation(value){lastNativeOperation=value;},
    get refreshEditorTools(){return ()=>refreshEditorToolsForContext(controllerContext);},
    get commandSession(){return commandSession;},
    get applicationCommands(){return applicationCommands;},
    get editorWebMcp(){return editorWebMcp;},set editorWebMcp(value){editorWebMcp=value;},
    get debugTreeNode(){return debugTreeNode;},
    get previewSchemaAuthoringOperation(){return previewSchemaAuthoringOperation;},
    get applySchemaAuthoringOperation(){return applySchemaAuthoringOperation;},
    get openSaveAsDialog(){return openSaveAsDialog;},
    get chooseNativeModel(){return chooseNativeModel;},
    get deleteTreeItem(){return deleteTreeItem;},
    get moveSpecialTreeItem(){return moveSpecialTreeItem;},
    get openSchemaAuthoringDialog(){return openSchemaAuthoringDialog;},
    get performTreeInsertionAction(){return performTreeInsertionAction;},
    get reorderTreeItem(){return reorderTreeItem;},
    get startDeclaredTreeInlineEdit(){return startDeclaredTreeInlineEdit;},
    get startRenameTreeItem(){return startRenameTreeItem;},
    get toggleTreeItemEnabled(){return toggleTreeItemEnabled;},
    get $(){return $;},
    get FIELD_UI_BEHAVIOR_KEY(){return FIELD_UI_BEHAVIOR_KEY;},
    get actionEndpoint(){return actionEndpoint;},
    get activateApplicationPackage(){return activateApplicationPackage;},
    get activeApplicationActions(){return activeApplicationActions;},set activeApplicationActions(value){activeApplicationActions=value;},
    get activeApplicationDynamicPropertySets(){return activeApplicationDynamicPropertySets;},set activeApplicationDynamicPropertySets(value){activeApplicationDynamicPropertySets=value;},
    get activeApplicationGraphicsWidgets(){return activeApplicationGraphicsWidgets;},set activeApplicationGraphicsWidgets(value){activeApplicationGraphicsWidgets=value;},
    get activeApplicationPackage(){return activeApplicationPackage;},set activeApplicationPackage(value){activeApplicationPackage=value;},
    get activeApplicationWidgetRenderers(){return activeApplicationWidgetRenderers;},set activeApplicationWidgetRenderers(value){activeApplicationWidgetRenderers=value;},
    get activeApplicationWidgetComponents(){return activeApplicationWidgetComponents;},set activeApplicationWidgetComponents(value){activeApplicationWidgetComponents=value;},
    get activeAuthoringTool(){return activeAuthoringTool;},set activeAuthoringTool(value){activeAuthoringTool=value;},
    get activeComponentId(){return activeComponentId;},
    get activeGraphicsLayerRegistry(){return activeGraphicsLayerRegistry;},set activeGraphicsLayerRegistry(value){activeGraphicsLayerRegistry=value;},
    get activeGraphicsSceneId(){return activeGraphicsSceneId;},set activeGraphicsSceneId(value){activeGraphicsSceneId=value;},
    get activeGraphicsWidget(){return activeGraphicsWidget;},set activeGraphicsWidget(value){activeGraphicsWidget=value;},
    get activeResultActionId(){return activeResultActionId;},set activeResultActionId(value){activeResultActionId=value;},
    get activeScenario(){return activeScenario;},
    get activeScenarioDefinition(){return activeScenarioDefinition;},set activeScenarioDefinition(value){activeScenarioDefinition=value;},
    get activeScenarioDimension(){return activeScenarioDimension;},
    get activeSelectionActions(){return activeSelectionActions;},set activeSelectionActions(value){activeSelectionActions=value;},
    get activeUiProfile(){return activeUiProfile;},set activeUiProfile(value){activeUiProfile=value;},
    get addActionAvailability(){return addActionAvailability;},
    get addSchemaValidationProgram(){return addSchemaValidationProgram;},
    get allowConfirmedEditorExit(){return allowConfirmedEditorExit;},set allowConfirmedEditorExit(value){allowConfirmedEditorExit=value;},
    get appendTreeSectionIcon(){return appendTreeSectionIcon;},
    get applicationExtension(){return applicationExtension;},
    get applicationPanels(){return applicationPanels;},
    get applicationRequestOptions(){return applicationRequestOptions;},
    get applicationResultAdapter(){return applicationResultAdapter;},
    get applicationSchemaApi(){return applicationSchemaApi;},
    get applicationTreeBehavior(){return applicationTreeBehavior;},
    get applyCurrentSettingsDraft(){return applyCurrentSettingsDraft;},
    get applyFullJsonDraft(){return applyFullJsonDraft;},
    get applyProfileAttributes(){return applyProfileAttributes;},
    get applyProfileVisibility(){return applyProfileVisibility;},
    get applyResizeWidths(){return applyResizeWidths;},
    get applySchemaComponentVariant(){return applySchemaComponentVariant;},
    get applySchemaValidationProgramEdit(){return applySchemaValidationProgramEdit;},
    get applySchemaWidgetAction(){return applySchemaWidgetAction;},
    get applyUiProfile(){return applyUiProfile;},
    get assertDeclarativeDocument(){return assertDeclarativeDocument;},
    get availableMenuButton(){return availableMenuButton;},
    get beginColumnResize(){return beginColumnResize;},
    get beginOperationProgress(){return beginOperationProgress;},
    get bulkButtons(){return bulkButtons;},
    get bulkValidationDialog(){return bulkValidationDialog;},
    get camera(){return camera;},set camera(value){camera=value;},
    get captureEditorDialogState(){return captureEditorDialogState;},
    get captureEditorFocus(){return captureEditorFocus;},
    get captureEditorPanelState(){return captureEditorPanelState;},
    get checkArrayInsertionLimit(){return checkArrayInsertionLimit;},
    get chooseMatchingModel(){return chooseMatchingModel;},
    get clearOperationProgress(){return clearOperationProgress;},
    get clearPreviewForComponentChange(){return clearPreviewForComponentChange;},
    get clearResultsBusy(){return clearResultsBusy;},set clearResultsBusy(value){clearResultsBusy=value;},
    get cloneJson(){return cloneJson;},
    get cloneModelItemWithUniqueIds(){return cloneModelItemWithUniqueIds;},
    get cloneWithUniqueIds(){return cloneWithUniqueIds;},
    get closeSchemaAuthoringDialog(){return closeSchemaAuthoringDialog;},
    get closeTreeMenu(){return closeTreeMenu;},
    get commitDefinitionInput(){return commitDefinitionInput;},
    get commitInputsBeforeRowMove(){return commitInputsBeforeRowMove;},
    get commitSettingsInput(){return commitSettingsInput;},
    get commitVisibleEditorState(){return commitVisibleEditorState;},
    get compareEditorRuntime(){return compareEditorRuntime;},
    get compatibilityApplicationId(){return compatibilityApplicationId;},set compatibilityApplicationId(value){compatibilityApplicationId=value;},
    get compatibleUnitsFor(){return compatibleUnitsFor;},
    get compiledGeo(){return compiledGeo;},set compiledGeo(value){compiledGeo=value;},
    get componentForArray(){return componentForArray;},
    get componentVariantSource(){return componentVariantSource;},
    get componentVariantSourcePath(){return componentVariantSourcePath;},
    get configureGraphicsWidget(){return configureGraphicsWidget;},
    get configureTreeItemDragging(){return configureTreeItemDragging;},
    get configureTreeRoot(){return configureTreeRoot;},
    get configureTreeSections(){return configureTreeSections;},
    get confirmClearProjectRunResults(){return confirmClearProjectRunResults;},
    get confirmModelSwitch(){return confirmModelSwitch;},
    get container(){return container;},
    get contextMenu(){return contextMenu;},
    get contextTarget(){return contextTarget;},set contextTarget(value){contextTarget=value;},
    get createEditorActionServices(){return createEditorActionServices;},
    get createEditorDebugController(){return createEditorDebugController;},
    get createGraphicsLayerRegistry(){return createGraphicsLayerRegistry;},
    get createModelSaveSnapshot(){return createModelSaveSnapshot;},
    get createModelTreeItem(){return createModelTreeItem;},
    get createOperationId(){return createOperationId;},
    get createTreeItem(){return createTreeItem;},
    get createTreeViewState(){return createTreeViewState;},
    get createValidationProgramDesigner(){return createValidationProgramDesigner;},
    get currentJsonDraftIsInvalid(){return currentJsonDraftIsInvalid;},
    get currentSchemaStructureDialogTarget(){return currentSchemaStructureDialogTarget;},
    get currentSelectionIsLoaded(){return currentSelectionIsLoaded;},
    get currentTab(){return currentTab;},set currentTab(value){currentTab=value;},
    get declaredActionEndpoint(){return declaredActionEndpoint;},
    get declaredSchemaAuthoringTools(){return declaredSchemaAuthoringTools;},
    get defaultModelManifestFile(){return defaultModelManifestFile;},set defaultModelManifestFile(value){defaultModelManifestFile=value;},
    get definitionCollectionConfig(){return definitionCollectionConfig;},
    get definitionCollectionKindForPath(){return definitionCollectionKindForPath;},
    get definitionCollectionLabel(){return definitionCollectionLabel;},
    get definitionCollectionPath(){return definitionCollectionPath;},
    get definitionControlLabel(){return definitionControlLabel;},
    get definitionLabel(){return definitionLabel;},
    get describeEditorRuntimeMismatches(){return describeEditorRuntimeMismatches;},
    get displayItemName(){return displayItemName;},
    get documentValueAtPath(){return documentValueAtPath;},
    get documentWidgetAtPath(){return documentWidgetAtPath;},
    get documentWithValidationEdits(){return documentWithValidationEdits;},
    get drawPreview(){return drawPreview;},
    get drawSweepResult(){return drawSweepResult;},
    get editedSettingsInputs(){return editedSettingsInputs;},
    get editorCommands(){return editorCommands;},
    get editorDebug(){return editorDebug;},set editorDebug(value){editorDebug=value;},
    get editorDebugPanel(){return editorDebugPanel;},set editorDebugPanel(value){editorDebugPanel=value;},
    get editorDialogSnapshot(){return editorDialogSnapshot;},
    get editorEndpoint(){return editorEndpoint;},
    get editorFactory(){return editorFactory;},
    get editorJson(){return editorJson;},
    get editorMountOptions(){return editorMountOptions;},set editorMountOptions(value){editorMountOptions=value;},
    get editorOptions(){return editorOptions;},
    get editorRolePath(){return editorRolePath;},
    get editorRolePathAt(){return editorRolePathAt;},
    get editorSettingsDraftIsValid(){return editorSettingsDraftIsValid;},
    get editorWatch(){return editorWatch;},set editorWatch(value){editorWatch=value;},
    get editorWorkflow(){return editorWorkflow;},
    get effectiveSchemaTreeLabel(){return effectiveSchemaTreeLabel;},
    get enablePreviewLayer(){return enablePreviewLayer;},
    get engineCapabilities(){return engineCapabilities;},set engineCapabilities(value){engineCapabilities=value;},
    get ensureSelectedResultActionLoad(){return ensureSelectedResultActionLoad;},
    get esc(){return esc;},
    get fieldPlotLoadStatus(){return fieldPlotLoadStatus;},set fieldPlotLoadStatus(value){fieldPlotLoadStatus=value;},
    get fieldPlotState(){return fieldPlotState;},set fieldPlotState(value){fieldPlotState=value;},
    get fieldPointLabel(){return fieldPointLabel;},
    get fieldUiBehavior(){return fieldUiBehavior;},
    get fieldWithVariantRowValues(){return fieldWithVariantRowValues;},
    get finishCancelableOperation(){return finishCancelableOperation;},
    get finishOperationKind(){return finishOperationKind;},
    get finishOperationProgress(){return finishOperationProgress;},
    get finishSchemaStructureDialog(){return finishSchemaStructureDialog;},
    get fitSettingsColumnsToPane(){return fitSettingsColumnsToPane;},
    get flushSchemaAnnotationEditor(){return flushSchemaAnnotationEditor;},
    get flushSchemaChoiceEditor(){return flushSchemaChoiceEditor;},
    get flushSchemaDraftEditors(){return flushSchemaDraftEditors;},
    get flushSchemaGlobalUiEditor(){return flushSchemaGlobalUiEditor;},
    get flushSchemaGraphicsEditor(){return flushSchemaGraphicsEditor;},
    get flushSchemaUiEditor(){return flushSchemaUiEditor;},
    get formatChoiceLabel(){return formatChoiceLabel;},
    get formatFieldFrequency(){return formatFieldFrequency;},
    get fullJson(){return fullJson;},
    get fullMetaValidationProgramKeys(){return fullMetaValidationProgramKeys;},
    get fullmetaResultsDirectory(){return fullmetaResultsDirectory;},set fullmetaResultsDirectory(value){fullmetaResultsDirectory=value;},
    get fullmetaRunsDirectory(){return fullmetaRunsDirectory;},set fullmetaRunsDirectory(value){fullmetaRunsDirectory=value;},
    get getUnit(){return getUnit;},
    get graphicsControlState(){return graphicsControlState;},
    get graphicsControlSurface(){return graphicsControlSurface;},set graphicsControlSurface(value){graphicsControlSurface=value;},
    get graphicsHoverTooltip(){return graphicsHoverTooltip;},
    get graphicsLayerForRole(){return graphicsLayerForRole;},
    get graphicsProfile(){return graphicsProfile;},
    get graphicsResultScene(){return graphicsResultScene;},
    get graphicsSceneForPath(){return graphicsSceneForPath;},
    get graphicsSceneForSelection(){return graphicsSceneForSelection;},
    get graphicsSceneInputs(){return graphicsSceneInputs;},
    get graphicsSceneInputsFor(){return graphicsSceneInputsFor;},
    get graphicsTabForRole(){return graphicsTabForRole;},
    get graphicsVisibility(){return graphicsVisibility;},
    get hasAnyEditorRole(){return hasAnyEditorRole;},
    get hasEditorRole(){return hasEditorRole;},
    get hasSettingsDraft(){return hasSettingsDraft;},
    get hasUnsavedEditorChanges(){return hasUnsavedEditorChanges;},
    get hideGraphicsHoverTooltip(){return hideGraphicsHoverTooltip;},
    get inheritedSchemaWidget(){return inheritedSchemaWidget;},
    get initial(){return initial;},
    get initialQuantityVectorValue(){return initialQuantityVectorValue;},
    get initialResult(){return initialResult;},set initialResult(value){initialResult=value;},
    get insertArrayItem(){return insertArrayItem;},
    get insertionIndexFor(){return insertionIndexFor;},
    get insertionIndexForModelArray(){return insertionIndexForModelArray;},
    get inspectEditor(){return inspectEditor;},
    get inspectEditorSurface(){return inspectEditorSurface;},
    get inspectSchemaDocument(){return inspectSchemaDocument;},
    get inspectSchemaStructure(){return inspectSchemaStructure;},
    get installEditorWatch(){return installEditorWatch;},
    get invalidatePreviewArtifacts(){return invalidatePreviewArtifacts;},
    get invalidateSchemaAuthoringPreview(){return invalidateSchemaAuthoringPreview;},
    get isEditorRoleItem(){return isEditorRoleItem;},
    get isEditorRoleRoot(){return isEditorRoleRoot;},
    get isFieldResultAction(){return isFieldResultAction;},
    get isModelDocumentFilename(){return isModelDocumentFilename;},
    get isRecord(){return isRecord;},
    get isResultPath(){return isResultPath;},
    get isSchemaTreeDeclaration(){return isSchemaTreeDeclaration;},
    get isTabularResultAction(){return isTabularResultAction;},
    get isToggleEnabledItemPath(){return isToggleEnabledItemPath;},
    get jsonDraftDirty(){return jsonDraftDirty;},set jsonDraftDirty(value){jsonDraftDirty=value;},
    get jsonPointerPath(){return jsonPointerPath;},
    get lastDialogFocus(){return lastDialogFocus;},
    get lastDocumentValidation(){return lastDocumentValidation;},set lastDocumentValidation(value){lastDocumentValidation=value;},
    get lastEditorFocus(){return lastEditorFocus;},set lastEditorFocus(value){lastEditorFocus=value;},
    get lastSweepRender(){return lastSweepRender;},set lastSweepRender(value){lastSweepRender=value;},
    get lastValidatedModelSnapshot(){return lastValidatedModelSnapshot;},set lastValidatedModelSnapshot(value){lastValidatedModelSnapshot=value;},
    get lastValidationSummary(){return lastValidationSummary;},set lastValidationSummary(value){lastValidationSummary=value;},
    get legacyFieldUiView(){return legacyFieldUiView;},
    get listenDocument(){return listenDocument;},
    get listenWindow(){return listenWindow;},
    get loadApplicationPackage(){return loadApplicationPackage;},
    get loadResultAction(){return loadResultAction;},
    get loadUiProfile(){return loadUiProfile;},
    get loadWidgetCatalogs(){return loadWidgetCatalogs;},
    get loadedModelContentHash(){return loadedModelContentHash;},set loadedModelContentHash(value){loadedModelContentHash=value;},
    get loadedModelFile(){return loadedModelFile;},set loadedModelFile(value){loadedModelFile=value;},
    get loadedModelFolder(){return loadedModelFolder;},set loadedModelFolder(value){loadedModelFolder=value;},
    get loadedModelSnapshot(){return loadedModelSnapshot;},set loadedModelSnapshot(value){loadedModelSnapshot=value;},
    get menuButton(){return menuButton;},
    get model(){return model;},set model(value){model=value;},
    get modelAfterTreeDeletion(){return modelAfterTreeDeletion;},
    get modelAfterTreeDeletionTransaction(){return modelAfterTreeDeletionTransaction;},
    get modelComponent(){return modelComponent;},
    get modelEditorAvailability(){return modelEditorAvailability;},
    get modelEditorCollectionNote(){return modelEditorCollectionNote;},
    get modelEditorControlCopy(){return modelEditorControlCopy;},
    get modelEditorGraphicsComponentId(){return modelEditorGraphicsComponentId;},
    get modelEditorNewModelChoices(){return modelEditorNewModelChoices;},
    get modelEditorNote(){return modelEditorNote;},
    get modelEditorNotes(){return modelEditorNotes;},
    get modelEditorPathMatches(){return modelEditorPathMatches;},
    get modelEditorScenario(){return modelEditorScenario;},
    get modelEditorScenarioDimension(){return modelEditorScenarioDimension;},
    get modelEditorScenarioId(){return modelEditorScenarioId;},
    get modelEditorSchemaForPath(){return modelEditorSchemaForPath;},
    get modelEditorSchemaItem(){return modelEditorSchemaItem;},
    get modelEditorSchemaProperty(){return modelEditorSchemaProperty;},
    get modelEditorSelectionHasRole(){return modelEditorSelectionHasRole;},
    get modelEditorSelectionMatches(){return modelEditorSelectionMatches;},
    get modelEditorSelectionPanels(){return modelEditorSelectionPanels;},
    get modelEditorTitle(){return modelEditorTitle;},
    get modelEditorWorkflowCopy(){return modelEditorWorkflowCopy;},
    get modelLoadSequence(){return modelLoadSequence;},set modelLoadSequence(value){modelLoadSequence=value;},
    get modelLoading(){return modelLoading;},set modelLoading(value){modelLoading=value;},
    get modelManifestFile(){return modelManifestFile;},set modelManifestFile(value){modelManifestFile=value;},
    get modelRepairErrors(){return modelRepairErrors;},set modelRepairErrors(value){modelRepairErrors=value;},
    get modelRepairMode(){return modelRepairMode;},set modelRepairMode(value){modelRepairMode=value;},
    get modelSaving(){return modelSaving;},set modelSaving(value){modelSaving=value;},
    get modelUnitChoices(){return modelUnitChoices;},set modelUnitChoices(value){modelUnitChoices=value;},
    get modelValidating(){return modelValidating;},set modelValidating(value){modelValidating=value;},
    get modelValueAtRole(){return modelValueAtRole;},
    get modelWithArrayItemDraft(){return modelWithArrayItemDraft;},
    get modelWithEditorSettingsDraft(){return modelWithEditorSettingsDraft;},
    get modelWithRenamedDefinitionSymbol(){return modelWithRenamedDefinitionSymbol;},
    get modelWithResultActionSettings(){return modelWithResultActionSettings;},
    get modelWithSchemaValidSettingsItem(){return modelWithSchemaValidSettingsItem;},
    get modelWithSettingsItem(){return modelWithSettingsItem;},
    get modelWithSettingsItemDraft(){return modelWithSettingsItemDraft;},
    get mountDocumentWidgetIndex(){return mountDocumentWidgetIndex;},
    get mountEditorDebugPanel(){return mountEditorDebugPanel;},
    get mountGraphicsConsoleDesignEditor(){return mountGraphicsConsoleDesignEditor;},
    get mountGraphicsControls(){return mountGraphicsControls;},
    get mountGraphicsInterfacesDesignEditor(){return mountGraphicsInterfacesDesignEditor;},
    get mountQuantityVectorDefaultEditor(){return mountQuantityVectorDefaultEditor;},
    get mountReactTree(){return mountReactTree;},
    get mountSchemaAnnotationAuthoring(){return mountSchemaAnnotationAuthoring;},
    get mountSchemaAnnotationPicker(){return mountSchemaAnnotationPicker;},
    get mountSchemaChoiceAuthoring(){return mountSchemaChoiceAuthoring;},
    get mountSchemaGraphicsContext(){return mountSchemaGraphicsContext;},
    get mountSchemaUiAnnotationAuthoring(){return mountSchemaUiAnnotationAuthoring;},
    get mountSettingsPanel(){return mountSettingsPanel;},
    get mountStructuredValueEditor(){return mountStructuredValueEditor;},
    get moveArrayRow(){return moveArrayRow;},
    get navigateSchemaStructureDialog(){return navigateSchemaStructureDialog;},
    get newModelCreating(){return newModelCreating;},set newModelCreating(value){newModelCreating=value;},
    get nudgeColumnBoundary(){return nudgeColumnBoundary;},
    get openModel(){return openModel;},
    get invalidateScanConfirmation(){return ()=>{pendingScanConfirmation=null;};},
    get openNewModelDialog(){return openNewModelDialog;},
    get createNewModel(){return createNewModel;},
    get saveProjectAs(){return saveProjectAs;},
    get openSchemaAuthoringTool(){return openSchemaAuthoringTool;},
    get openSchemaStructureDialog(){return openSchemaStructureDialog;},
    get openedDocumentPath(){return openedDocumentPath;},
    get operationIdFor(){return operationIdFor;},
    get operationKinds(){return operationKinds;},
    get operationProgress(){return operationProgress;},
    get operationProgressTimer(){return operationProgressTimer;},set operationProgressTimer(value){operationProgressTimer=value;},
    get operationStopRequested(){return operationStopRequested;},
    get panelLayoutDefaults(){return panelLayoutDefaults;},
    get pathLabel(){return pathLabel;},
    get performDeclaredTreeAction(){return performDeclaredTreeAction;},
    get pointer(){return pointer;},set pointer(value){pointer=value;},
    get prepareResizableTable(){return prepareResizableTable;},
    get prepareResizableTables(){return prepareResizableTables;},
    get previewCanvas(){return previewCanvas;},
    get previewContext(){return previewContext;},
    get previewMesh(){return previewMesh;},set previewMesh(value){previewMesh=value;},
    get previewMeshComponentId(){return previewMeshComponentId;},set previewMeshComponentId(value){previewMeshComponentId=value;},
    get previewMeshModelSnapshot(){return previewMeshModelSnapshot;},set previewMeshModelSnapshot(value){previewMeshModelSnapshot=value;},
    get previewReportSummary(){return previewReportSummary;},
    get previewReportTooltip(){return previewReportTooltip;},
    get profileCopy(){return profileCopy;},
    get profileCopyFormat(){return profileCopyFormat;},
    get projectDisplay(){return projectDisplay;},
    get projectIntegrationDefaults(){return projectIntegrationDefaults;},
    get projectIntegrationFormInput(){return projectIntegrationFormInput;},
    get projectRootFolder(){return projectRootFolder;},set projectRootFolder(value){projectRootFolder=value;},
    get projectRoutingSettingsRows(){return projectRoutingSettingsRows;},
    get projectSchemaTree(){return projectSchemaTree;},
    get projectSettingsFields(){return projectSettingsFields;},
    get reactTreeMount(){return reactTreeMount;},set reactTreeMount(value){reactTreeMount=value;},
    get reactTreeProjection(){return reactTreeProjection;},set reactTreeProjection(value){reactTreeProjection=value;},
    get reactTreeState(){return reactTreeState;},set reactTreeState(value){reactTreeState=value;},
    get treeRename(){return treeRename;},set treeRename(value){treeRename=value;},
    get treeRenameCommit(){return treeRenameCommit;},set treeRenameCommit(value){treeRenameCommit=value;},
    get readPanelSize(){return readPanelSize;},
    get recordModelValidation(){return recordModelValidation;},
    get reduceTreeViewState(){return reduceTreeViewState;},
    get referenceItemLabel(){return referenceItemLabel;},
    get refreshDefinitionRow(){return refreshDefinitionRow;},
    get refreshSelectedSchemaDeclarationLabel(){return refreshSelectedSchemaDeclarationLabel;},
    get renderDefinitionTable(){return renderDefinitionTable;},
    get renderFieldSettings(){return renderFieldSettings;},
    get renderModel(){return renderModel;},
    get renderOperationProgress(){return renderOperationProgress;},
    get renderProjectIntegrationForm(){return renderProjectIntegrationForm;},
    get renderRepairMode(){return renderRepairMode;},
    get renderRowMoveButtons(){return renderRowMoveButtons;},
    get renderSchemaAuthoringInputs(){return renderSchemaAuthoringInputs;},
    get renderSchemaAuthoringToolButtons(){return renderSchemaAuthoringToolButtons;},
    get renderSchemaField(){return renderSchemaField;},
    get renderSchemaObject(){return renderSchemaObject;},
    get renderSchemaStructure(){return renderSchemaStructure;},
    get renderSchemaStructureInspection(){return renderSchemaStructureInspection;},
    get renderSchemaTduvOverview(){return renderSchemaTduvOverview;},
    get renderSelectedItemSettings(){return renderSelectedItemSettings;},
    get renderSettingsTable(){return renderSettingsTable;},
    get renderSweepTable(){return renderSweepTable;},
    get renderTree(){return renderTree;},
    get reportDefinitionChange(){return reportDefinitionChange;},
    get requestJson(){return requestJson;},
    get requestOperationStop(){return requestOperationStop;},
    get requestResultJson(){return requestResultJson;},
    get requestUnsavedChangesChoice(){return requestUnsavedChangesChoice;},
    get reservedExpressionSymbolsForModel(){return reservedExpressionSymbolsForModel;},
    get reservedParameterSymbolsForModel(){return reservedParameterSymbolsForModel;},
    get resetPreviewCamera(){return resetPreviewCamera;},
    get resetSchemaAuthoringEditors(){return resetSchemaAuthoringEditors;},
    get resizeMinColumnWidth(){return resizeMinColumnWidth;},
    get resizeWidthsFor(){return resizeWidthsFor;},
    get resolveActionInputs(){return resolveActionInputs;},
    get resolveModelEditorSchema(){return resolveModelEditorSchema;},
    get resolveModelParameters(){return resolveModelParameters;},
    get resolveResultView(){return resolveResultView;},
    get resolveSchemaWidgetPresentation(){return resolveSchemaWidgetPresentation;},
    get resolveUiProfileSchemaReference(){return resolveUiProfileSchemaReference;},
    get restoreApplicationPreview(){return restoreApplicationPreview;},
    get restoreEditor(){return restoreEditor;},
    get restoreEditorDialogState(){return restoreEditorDialogState;},
    get restoreEditorFocus(){return restoreEditorFocus;},
    get restoreEditorPanelState(){return restoreEditorPanelState;},
    get restoreMovedRowFocus(){return restoreMovedRowFocus;},
    get restorePanelLayout(){return restorePanelLayout;},
    get restoreResizeWidths(){return restoreResizeWidths;},
    get restoreSchemaStructureDialogParent(){return restoreSchemaStructureDialogParent;},
    get restoredOperationView(){return restoredOperationView;},set restoredOperationView(value){restoredOperationView=value;},
    get resultActionLoading(){return resultActionLoading;},set resultActionLoading(value){resultActionLoading=value;},
    get resultRenderSequence(){return resultRenderSequence;},set resultRenderSequence(value){resultRenderSequence=value;},
    get resultSelections(){return resultSelections;},set resultSelections(value){resultSelections=value;},
    get resultTablesByAction(){return resultTablesByAction;},
    get resultViewForAction(){return resultViewForAction;},
    get rightSplitter(){return rightSplitter;},
    get rightWorkspace(){return rightWorkspace;},
    get rowReorderingAllowed(){return rowReorderingAllowed;},
    get sameJsonModel(){return sameJsonModel;},
    get samePath(){return samePath;},
    get saveModel(){return saveModel;},
    get saveSchemaComponentVariant(){return saveSchemaComponentVariant;},
    get scenarioMetadata(){return scenarioMetadata;},set scenarioMetadata(value){scenarioMetadata=value;},
    get schemaActionFacingError(){return schemaActionFacingError;},
    get schemaActionSourceForDeclaration(){return schemaActionSourceForDeclaration;},
    get schemaAnnotationChanged(){return schemaAnnotationChanged;},set schemaAnnotationChanged(value){schemaAnnotationChanged=value;},
    get schemaAnnotationEditor(){return schemaAnnotationEditor;},set schemaAnnotationEditor(value){schemaAnnotationEditor=value;},
    get schemaAnnotationKey(){return schemaAnnotationKey;},set schemaAnnotationKey(value){schemaAnnotationKey=value;},
    get schemaAnnotationState(){return schemaAnnotationState;},set schemaAnnotationState(value){schemaAnnotationState=value;},
    get schemaArrayItemStructureLabel(){return schemaArrayItemStructureLabel;},
    get schemaAuthoringCommands(){return schemaAuthoringCommands;},
    get schemaDialogControllers(){return schemaDialogControllers;},
    get schemaAuthoringDialogState(){return schemaAuthoringDialogState;},set schemaAuthoringDialogState(value){schemaAuthoringDialogState=value;},
    get schemaAuthoringFormInput(){return schemaAuthoringFormInput;},
    get schemaAuthoringOptionsForTarget(){return schemaAuthoringOptionsForTarget;},
    get schemaAuthoringRelevantCode(){return schemaAuthoringRelevantCode;},
    get schemaAuthoringTargetForPropertyPath(){return schemaAuthoringTargetForPropertyPath;},
    get schemaAuthoringTools(){return schemaAuthoringTools;},
    get schemaAuthoringTreePreview(){return schemaAuthoringTreePreview;},
    get schemaAuthoringWorkflowState(){return schemaAuthoringWorkflowState;},
    get schemaChoiceApplies(){return schemaChoiceApplies;},
    get schemaChoiceChanged(){return schemaChoiceChanged;},set schemaChoiceChanged(value){schemaChoiceChanged=value;},
    get schemaChoiceEditor(){return schemaChoiceEditor;},set schemaChoiceEditor(value){schemaChoiceEditor=value;},
    get schemaChoiceKey(){return schemaChoiceKey;},set schemaChoiceKey(value){schemaChoiceKey=value;},
    get schemaChoiceSelectionKey(){return schemaChoiceSelectionKey;},
    get schemaChoiceState(){return schemaChoiceState;},set schemaChoiceState(value){schemaChoiceState=value;},
    get schemaCollectionTreePresentation(){return schemaCollectionTreePresentation;},
    get schemaDeclarationOverview(){return schemaDeclarationOverview;},
    get schemaDeclarationScope(){return schemaDeclarationScope;},
    get schemaDocumentNumericFieldError(){return schemaDocumentNumericFieldError;},
    get schemaDocumentPointer(){return schemaDocumentPointer;},
    get schemaDocumentWithProgramValue(){return schemaDocumentWithProgramValue;},
    get schemaFieldContext(){return schemaFieldContext;},
    get schemaFieldUiSummary(){return schemaFieldUiSummary;},
    get schemaGeneratedOwnerAtPath(){return schemaGeneratedOwnerAtPath;},
    get schemaGeneratedOwnershipIssue(){return schemaGeneratedOwnershipIssue;},
    get schemaGeneratedPathsWithin(){return schemaGeneratedPathsWithin;},
    get schemaGlobalUiEditor(){return schemaGlobalUiEditor;},set schemaGlobalUiEditor(value){schemaGlobalUiEditor=value;},
    get schemaGlobalUiHost(){return schemaGlobalUiHost;},
    get schemaGlobalUiKey(){return schemaGlobalUiKey;},set schemaGlobalUiKey(value){schemaGlobalUiKey=value;},
    get schemaGraphicsChanged(){return schemaGraphicsChanged;},set schemaGraphicsChanged(value){schemaGraphicsChanged=value;},
    get schemaGraphicsContextHost(){return schemaGraphicsContextHost;},
    get schemaGraphicsEditor(){return schemaGraphicsEditor;},set schemaGraphicsEditor(value){schemaGraphicsEditor=value;},
    get schemaGraphicsHost(){return schemaGraphicsHost;},
    get schemaGraphicsKey(){return schemaGraphicsKey;},set schemaGraphicsKey(value){schemaGraphicsKey=value;},
    get schemaGraphicsState(){return schemaGraphicsState;},set schemaGraphicsState(value){schemaGraphicsState=value;},
    get schemaInspectionEdits(){return schemaInspectionEdits;},
    get schemaInspectionTargetPath(){return schemaInspectionTargetPath;},
    get schemaLocalDefinitionDialogTarget(){return schemaLocalDefinitionDialogTarget;},
    get schemaProjectCreation(){return schemaProjectCreation;},set schemaProjectCreation(value){schemaProjectCreation=value;},
    get schemaProjectionForTreeButton(){return schemaProjectionForTreeButton;},
    get schemaSingleItemPolicy(){return schemaSingleItemPolicy;},
    get schemaStructureDialogState(){return schemaStructureDialogState;},set schemaStructureDialogState(value){schemaStructureDialogState=value;},
    get schemaStructureDialogTargetIsCurrent(){return schemaStructureDialogTargetIsCurrent;},
    get schemaStructureSummary(){return schemaStructureSummary;},
    get schemaTreeAnnotationEditPaths(){return schemaTreeAnnotationEditPaths;},
    get schemaTreeButtonForSelection(){return schemaTreeButtonForSelection;},
    get schemaUiAnnotationEditor(){return schemaUiAnnotationEditor;},
    get schemaUiAnnotationEditorEntries(){return schemaUiAnnotationEditorEntries;},set schemaUiAnnotationEditorEntries(value){schemaUiAnnotationEditorEntries=value;},
    get schemaUiChanged(){return schemaUiChanged;},set schemaUiChanged(value){schemaUiChanged=value;},
    get schemaUiEditor(){return schemaUiEditor;},set schemaUiEditor(value){schemaUiEditor=value;},
    get schemaUiKey(){return schemaUiKey;},set schemaUiKey(value){schemaUiKey=value;},
    get schemaUiState(){return schemaUiState;},set schemaUiState(value){schemaUiState=value;},
    get schemaUiWidgetContexts(){return schemaUiWidgetContexts;},
    get schemaUiWidgetOptions(){return schemaUiWidgetOptions;},
    get schemaValidationContext(){return schemaValidationContext;},
    get schemaValidationDialogEntries(){return schemaValidationDialogEntries;},set schemaValidationDialogEntries(value){schemaValidationDialogEntries=value;},
    get schemaValidationPointerPath(){return schemaValidationPointerPath;},
    get schemaValidationProgramEntries(){return schemaValidationProgramEntries;},
    get schemaValidationRulesForField(){return schemaValidationRulesForField;},
    get schemaValidationSummary(){return schemaValidationSummary;},
    get schemaValueCompatibilityApplies(){return schemaValueCompatibilityApplies;},
    get schemaVariantStatus(){return schemaVariantStatus;},
    get schemaWidget(){return schemaWidget;},
    get schemaWidgetDesignContext(){return schemaWidgetDesignContext;},
    get schemaWithAuthoringOperation(){return schemaWithAuthoringOperation;},
    get schemaWithEditedProperties(){return schemaWithEditedProperties;},
    get schemaWithEditedStructureFields(){return schemaWithEditedStructureFields;},
    get schemaWithFactoredDefinition(){return schemaWithFactoredDefinition;},
    get schemaWithGeneratedFieldOverlays(){return schemaWithGeneratedFieldOverlays;},
    get schemaWithTreeAnnotationEdits(){return schemaWithTreeAnnotationEdits;},
    get selectDefinitionCollection(){return selectDefinitionCollection;},
    get selectItem(){return selectItem;},
    get selectPlotTableView(){return selectPlotTableView;},
    get selectSchemaAuthoringTargetPath(){return selectSchemaAuthoringTargetPath;},
    get selectedCollection(){return selectedCollection;},set selectedCollection(value){selectedCollection=value;},
    get selectedDocumentSchema(){return selectedDocumentSchema;},
    get selectedDocumentValue(){return selectedDocumentValue;},
    get selectedLabel(){return selectedLabel;},set selectedLabel(value){selectedLabel=value;},
    get selectedPath(){return selectedPath;},set selectedPath(value){selectedPath=value;},
    get selectedSchemaProjection(){return selectedSchemaProjection;},set selectedSchemaProjection(value){selectedSchemaProjection=value;},
    get serverCompatibility(){return serverCompatibility;},set serverCompatibility(value){serverCompatibility=value;},
    get serverCompatibilityReady(){return serverCompatibilityReady;},set serverCompatibilityReady(value){serverCompatibilityReady=value;},
    get services(){return services;},
    get setDefinitionInputError(){return setDefinitionInputError;},
    get setGraphicsHeight(){return setGraphicsHeight;},
    get setResultActionSaveBusy(){return setResultActionSaveBusy;},
    get setStatus(){return setStatus;},
    get setTab(){return setTab;},
    get setTreeToggleState(){return setTreeToggleState;},
    get setTreeWidth(){return setTreeWidth;},
    get settingPanelActionTitle(){return settingPanelActionTitle;},
    get settingsDraft(){return settingsDraft;},set settingsDraft(value){settingsDraft=value;},
    get settingsDraftDirty(){return settingsDraftDirty;},set settingsDraftDirty(value){settingsDraftDirty=value;},
    get relatedFieldsDraft(){return relatedFieldsDraft;},set relatedFieldsDraft(value){relatedFieldsDraft=value;},
    get relatedFieldsDraftPaths(){return relatedFieldsDraftPaths;},
    get settingsInsertionTarget(){return settingsInsertionTarget;},
    get settingsSurface(){return settingsSurface;},set settingsSurface(value){settingsSurface=value;},
    get settingsSurfaceContent(){return settingsSurfaceContent;},set settingsSurfaceContent(value){settingsSurfaceContent=value;},
    get settingsTable(){return settingsTable;},
    get sharedBrandSubtitle(){return sharedBrandSubtitle;},
    get sharedControlCopy(){return sharedControlCopy;},
    get sharedEditorApi(){return sharedEditorApi;},
    get sharedUiCopy(){return sharedUiCopy;},
    get showDefaultGraphicsScene(){return showDefaultGraphicsScene;},
    get showGeometryView(){return showGeometryView;},
    get showGraphicsForSelection(){return showGraphicsForSelection;},
    get showModelOverview(){return showModelOverview;},
    get showResultMessage(){return showResultMessage;},
    get showResultSurface(){return showResultSurface;},
    get showResultViewSurface(){return showResultViewSurface;},
    get showSchemaGlobalUiDesign(){return showSchemaGlobalUiDesign;},
    get showSchemaGraphicsContext(){return showSchemaGraphicsContext;},
    get showSchemaGraphicsDesign(){return showSchemaGraphicsDesign;},
    get snapshotEditor(){return snapshotEditor;},
    get stableJsonString(){return stableJsonString;},
    get startInlineTreeRename(){return startInlineTreeRename;},
    get startOperationKind(){return startOperationKind;},
    get status(){return status;},
    get structureCellEditIssue(){return structureCellEditIssue;},
    get sweepViewModes(){return sweepViewModes;},set sweepViewModes(value){sweepViewModes=value;},
    get syncModelActionAvailability(){return syncModelActionAvailability;},
    get syncResultSettingsDraft(){return syncResultSettingsDraft;},
    get syncSchemaStructureDialogHeader(){return syncSchemaStructureDialogHeader;},
    get treeActionAvailability(){return treeActionAvailability;},
    get treeActionPlans(){return treeActionPlans;},
    get treeArrayPathForItem(){return treeArrayPathForItem;},
    get treeContent(){return treeContent;},
    get treeIconForDeclaration(){return treeIconForDeclaration;},
    get treeIconForPath(){return treeIconForPath;},
    get treeIconSource(){return treeIconSource;},
    get treeInsertionForAction(){return treeInsertionForAction;},
    get treeItemPath(){return treeItemPath;},
    get treeRootCollapsedState(){return treeRootCollapsedState;},
    get treeSectionCollapsedState(){return treeSectionCollapsedState;},
    get treeSectionIconSvg(){return treeSectionIconSvg;},
    get treeSplitter(){return treeSplitter;},
    get treeUiSetting(){return treeUiSetting;},
    get uiProfileSchema(){return uiProfileSchema;},set uiProfileSchema(value){uiProfileSchema=value;},
    get uiProfileSchemaAnnotations(){return uiProfileSchemaAnnotations;},
    get uiProfileSchemaValidationKeywords(){return uiProfileSchemaValidationKeywords;},
    get uniqueArrayName(){return uniqueArrayName;},
    get uniqueId(){return uniqueId;},
    get uniqueModelId(){return uniqueModelId;},
    get uniqueName(){return uniqueName;},
    get uniqueSymbol(){return uniqueSymbol;},
    get updateApplySettingsVisibility(){return updateApplySettingsVisibility;},
    get updateBuildButtons(){return updateBuildButtons;},
    get updateFieldCutPlanePosition(){return updateFieldCutPlanePosition;},
    get updateFieldPlotRecipe(){return updateFieldPlotRecipe;},
    get updateFieldSummary(){return updateFieldSummary;},
    get updateModelEditState(){return updateModelEditState;},
    get updateModelPathDisplay(){return updateModelPathDisplay;},
    get updateNewModelFolderPreview(){return updateNewModelFolderPreview;},
    get updateOperationProgress(){return updateOperationProgress;},
    get updatePreviewRunbar(){return updatePreviewRunbar;},
    get updateSelectionActionVisibility(){return updateSelectionActionVisibility;},
    get updateTreeSelection(){return updateTreeSelection;},
    get updateWorkflowPanels(){return updateWorkflowPanels;},
    get validateBulkSchemaCandidate(){return validateBulkSchemaCandidate;},
    get validateCurrentModel(){return validateCurrentModel;},
    get validateEditorDialogState(){return validateEditorDialogState;},
    get validateEditorWorkspaceState(){return validateEditorWorkspaceState;},
    get validateFullMetaModel(){return validateFullMetaModel;},
    get validateFullMetaModelStructure(){return validateFullMetaModelStructure;},
    get validateFullMetaModelWithRules(){return validateFullMetaModelWithRules;},
    get validateSchemaValueDeclarationCompatibility(){return validateSchemaValueDeclarationCompatibility;},
    get validateUiProfileSchema(){return validateUiProfileSchema;},
    get validationEditDraftIssue(){return validationEditDraftIssue;},
    get validationExpressionDialog(){return validationExpressionDialog;},
    get validationProgramDesigner(){return validationProgramDesigner;},
    get validationRulePointerParts(){return validationRulePointerParts;},
    get valueAt(){return valueAt;},
    get verifyServerCompatibility(){return verifyServerCompatibility;},
    get visibleSchemaAuthoringTools(){return visibleSchemaAuthoringTools;},
    get widgetFromAnnotation(){return widgetFromAnnotation;},
    get workspace(){return workspace;},
    get writeFieldUiBehavior(){return writeFieldUiBehavior;},
};
const {validateBulkSchemaCandidate,applyBulkSchemaCandidate,validateTreeAnnotationCandidate,validateGeneratedOverlayCandidate,validateFactoredSchemaCandidate,schemaAuthoringTools,openSchemaAuthoringTool,visibleSchemaAuthoringTools,renderSchemaAuthoringToolButtons,resolveSchemaWidgetPresentation,schemaUiWidgetOptions,schemaUiWidgetContexts,schemaFieldUiSummary,schemaValidationPointerPath,schemaValidationSummary,schemaValidationRulesForField,schemaValidationContext,applySchemaUiAnnotation,applySchemaValidationExpression,openStructuredValidationRule,applicationSchemaApi,hasSettingsDraft,modelWithEditorSettingsDraft,editorSettingsDraftIsValid,applicationExtension,editorDomain,editorEndpoint,openedDocumentPath,declaredActionEndpoint,actionEndpoint,resolveActionInputs,editorFactory,editorOptions,editorAllows,applicationResultAdapter,fieldPointLabel,validateFullMetaModel,validateFullMetaModelStructure,validateFullMetaModelWithRules,modelEditorSchemaForPath,applicationTreeBehavior,modelEditorSchemaProperty,modelEditorSchemaItem,resolveModelEditorSchema,activateApplicationPackage,createEditorActionServices,startOperationKind,finishOperationKind,operationIdFor,operationStopRequested,resetPreviewCamera,resizeWidthsFor,applyResizeWidths,fitSettingsColumnsToPane,restoreResizeWidths,beginColumnResize,nudgeColumnBoundary,prepareResizableTable,prepareResizableTables,setStatus,schemaAuthoringTargetForPropertyPath,selectSchemaAuthoringTargetPath,schemaAuthoringOptionsForTarget,schemaInspectionTargetPath,renderSchemaStructureInspection,schemaInspectionEdits,renderSchemaAuthoringInputs,initializeSchemaAuthoringPreview,schemaAuthoringRelevantCode,closeSchemaAuthoringDialog,openSchemaAuthoringDialog,invalidateSchemaAuthoringPreview,schemaAuthoringFormInput,schemaGeneratedPathsWithin,schemaValidationProgramEntries,schemaDocumentWithProgramValue,applySchemaValidationProgramEdit,addSchemaValidationProgram,schemaAuthoringTreePreview,previewSchemaAuthoringOperation,applySchemaAuthoringOperation,recordModelValidation,stableJsonString,sameJsonModel,updateWorkflowPanels,updateSelectionActionVisibility,updateApplySettingsVisibility,isModelDocumentFilename,currentSelectionIsLoaded,currentJsonDraftIsInvalid,hasUnsavedEditorChanges,initializeSettingsSurface,updateModelEditState,requestUnsavedChangesChoice,confirmModelSwitch,schemaChoiceSelectionKey,schemaChoiceApplies,flushSchemaChoiceEditor,schemaValueCompatibilityApplies,flushSchemaAnnotationEditor,flushSchemaUiEditor,flushSchemaGraphicsEditor,flushSchemaGlobalUiEditor,flushSchemaDraftEditors,refreshSelectedSchemaDeclarationLabel,applyCurrentSettingsDraft,applyFullJsonDraft,schemaDocumentNumericFieldError,schemaActionFacingError,schemaArrayItemStructureLabel,commitVisibleEditorState,syncModelActionAvailability,updateBuildButtons,renderOperationProgress,beginOperationProgress,updateOperationProgress,finishOperationProgress,clearOperationProgress,updatePreviewRunbar,createOperationId,finishCancelableOperation,requestOperationStop,stopActiveOperation,editorWorkflow,previewReportSummary,previewReportTooltip,invalidatePreviewArtifacts,esc,valueAt,selectedDocumentValue,selectedDocumentSchema,componentVariantSource,schemaVariantStatus,applySchemaComponentVariant,saveSchemaComponentVariant,hasEditorRole,editorRolePath,editorRolePathAt,isEditorRoleRoot,isEditorRoleItem,modelValueAtRole,modelComponent,hasAnyEditorRole,modelEditorCollectionNote,modelEditorWorkflowCopy,modelEditorControlCopy,isResultPath,cloneJson,profileCopy,profileCopyFormat,sharedUiCopy,formatChoiceLabel,profileDataLabel,activeScenario,activeScenarioDimension,updateFieldSummary,formatFieldFrequency,applyProfileAttributes,applyProfileVisibility,applyUiProfile,resolveUiProfileSchemaReference,validateUiProfileSchema,loadUiProfile,pathLabel,schemaFieldContext,settingsSchemaHasChoiceDependency,addSettingRow,renderFieldSettings,ensureSelectedResultActionLoad,renderSettingsTable,compatibleUnitsFor,definitionLabel,definitionControlLabel,definitionCollectionConfig,definitionCollectionPath,definitionCollectionKindForPath,definitionCollectionLabel,projectRoutingSettingsRows,updateProjectRoutingApplyState,applyProjectRoutingDraft,renderDefinitionTable,refreshDefinitionRow,setDefinitionInputError,commitDefinitionInput,commitSettingsInput,applySettingsDraftAfterFieldBlur,reportDefinitionChange,defaultValueForOptionalField,commitInputsBeforeRowMove,restoreMovedRowFocus,moveSettingsTableRow,treeIconSource,treeIconForDeclaration,treeIconForPath,createModelTreeItem,treeSectionIconSvg,appendTreeSectionIcon,addItem,schemaDocumentPointer,schemaTreeButtonForSelection,resetSchemaAuthoringEditors,schemaLocalDefinitionDialogTarget,syncSchemaStructureDialogHeader,currentSchemaStructureDialogTarget,schemaStructureDialogTargetIsCurrent,restoreSchemaStructureDialogParent,finishSchemaStructureDialog,navigateSchemaStructureDialog,backSchemaStructureDialog,openSchemaStructureDialog,updateTreeSelection,renderSelectedItemSettings,treeUiSetting,configureTreeRoot,configureTreeSectionCollapse,treeItemPath,treeArrayPathForItem,samePath,configureTreeItemDragging,clearTreeDropIndicators,reorderTreeItem,moveSpecialTreeItem,treeDropPlan,renderTree,selectItem,showModelOverview,selectDefinitionCollection,renderRepairMode,renderModel,uniqueId,uniqueName,uniqueSymbol,resultViewForAction,isFieldResultAction,isTabularResultAction,componentForArray,activeComponentId,clearPreviewForComponentChange,cloneWithUniqueIds,treeActionPlans,defaultArrayItem,displayItemName,settingPanelActionTitle,referenceItemLabel,insertionIndexFor,checkArrayInsertionLimit,insertArrayItem,modelAfterTreeDeletion,deleteTreeItem,startInlineTreeRename,startRenameTreeItem,startDeclaredTreeInlineEdit,closeTreeMenu,menuButton,treeInsertionForAction,isToggleEnabledItemPath,toggleTreeItemEnabled,treeActionAvailability,addActionAvailability,availableMenuButton,settingsInsertionTarget,performTreeInsertionAction,performDeclaredTreeAction,openTreeMenu,clearTreeDropTargetIndicators,panelLayoutDefaults,readPanelSize,setTreeWidth,setGraphicsHeight,bindWidthSplitter,bindGraphicsHeightSplitter,restorePanelLayout,applicationRequestOptions,requestJson,requestResultJson,saveModel,openSaveAsDialog,saveProjectAs,verifyServerCompatibility,graphicsProfile,graphicsSceneForPath,graphicsResultScene,graphicsSceneInputsFor,configureGraphicsWidget,graphicsVisibility,enablePreviewLayer,showDefaultGraphicsScene,showSchemaGraphicsContext,showSchemaGraphicsDesign,showSchemaGlobalUiDesign,showGraphicsForSelection,showGeometryView,showResultMessage,showResultSurface,setResultActionSaveBusy,syncResultSettingsDraft,updateFieldPlotRecipe,updateFieldCutPlanePosition,renderSweepTable,loadResultAction,drawSweepResult,drawPreview,renderSchemaTduvOverview,updateModelPathDisplay,openModel,restoreApplicationPreview,updateNewModelFolderPreview,openNewModelDialog,createNewModel,chooseNativeModel,chooseMatchingModel,openNativeModel,exitEditor,validateCurrentModel,confirmClearProjectRunResults,setTab,hideGraphicsHoverTooltip,showGraphicsHoverTooltip,editorJson,editorDialogSnapshot,snapshotEditor,restoreEditor,inspectEditor,currentDebugDialog,debugTreeNode,initializeEditorDebug}=Object.assign({},createController0(controllerContext),createController1(controllerContext),createController2(controllerContext),createController3(controllerContext),createController4(controllerContext),createController5(controllerContext),createController6(controllerContext));

const loadApplicationPackage=services.loadApplicationPackage;
let editorMountOptions=options, initialResult=initial.result;
const startupAction=initial.action;
const lifetime=new AbortController(), resizeObservers=[];
const listenWindow=(type,handler,options={})=>window.addEventListener(type,handler,{...(typeof options==='boolean'?{capture:options}:options),signal:lifetime.signal});
const listenDocument=(type,handler,options={})=>document.addEventListener(type,handler,{...(typeof options==='boolean'?{capture:options}:options),signal:lifetime.signal});
const observeResize=callback=>{const observer=new ResizeObserver(callback);resizeObservers.push(observer);return observer;};

const $ = (selector) => container.querySelector(selector);
const fileDialogs=documentFileController(controllerContext);
const standardMenus=resources.add(createStandardMenuController({root:container,workspaceUrl:services.workspaceUrl,getInterpretingSchema:()=>({schemaPath:activeApplicationPackage?.schemaPath,revision:activeApplicationPackage?.interpretingSchemaRevision}),requestJson:(...args)=>requestJson(...args),onStatus:(...args)=>setStatus(...args)}));
const applicationPanels=resources.add(createApplicationPanelLifecycle({removePanels:()=>document.querySelectorAll('[data-application-panel]').forEach(panel=>panel.remove())}));
const sharedBrandSubtitle = 'Model workspace';
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validationProgramDesigner = resources.add(createValidationProgramDesigner({ settingsParent: document.createElement('div') }));
let schemaValidationDialogEntries = [];
let schemaUiAnnotationEditorEntries = [];
const validationExpressionDialog = resources.add(createValidationExpressionDialog({
  dialog: $('#schema-validation-dialog'), title: $('#schema-validation-title'),
  note: $('#schema-validation-note'), body: $('#schema-validation-dialog-body'),
  onApply: applySchemaValidationExpression,
  onOpenRule: openStructuredValidationRule,
}));
const schemaUiAnnotationEditor = resources.add(createSchemaUiAnnotationEditor({
  getDocument:()=>model,
  onApply: applySchemaUiAnnotation,
}));


const bulkAnnotationDialog=resources.add(createBulkAnnotationDialog({
  getDocument:()=>model,
  getWidgetCatalog:()=>activeApplicationPackage?.widgetCatalog,
  onOpenWidgetSettings:path=>bulkWidgetSettingsDialog.open(path),
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:(document,path)=>schemaGeneratedOwnerAtPath(document,path)
    ||schemaGeneratedOwnerAtPath(document,[...path,'x-fullmeta-ui-behavior']),
}));
const bulkWidgetSettingsDialog=resources.add(createBulkWidgetSettingsDialog({
  getDocument:()=>model,
  getWidgetProfiles:()=>activeApplicationPackage?.schemaEditorPresentation?.widgets||{},
  getCatalog:()=>activeApplicationPackage?.annotationCatalog||{},
  getWidgetCatalog:()=>activeApplicationPackage?.widgetCatalog,
  getDocumentFile:()=>activeApplicationPackage?.rootDocumentFile||'',
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const bulkFieldConstraintsDialog=resources.add(createBulkFieldConstraintsDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const nestedStructureDialog=resources.add(createNestedStructureDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const bulkSchemaAuthoringDialog=resources.add(createBulkSchemaAuthoringDialog({
  getDocument:()=>model,validateCandidate:validateBulkSchemaCandidate,applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
  onOpenStructure:path=>nestedStructureDialog.open(path),
  onOpenConstraints:path=>bulkFieldConstraintsDialog.open(path),
}));
const bulkEditActionsDialog=resources.add(createBulkEditActionsDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const bulkReferenceDialog=resources.add(createBulkReferenceDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const bulkValidationDialog=resources.add(createBulkValidationDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
}));
const validationRuleRecipeDialog=resources.add(createValidationRuleRecipeDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
}));
const bulkRootContractsDialog=resources.add(createBulkRootContractsDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
}));

const treeAnnotationsDialog=resources.add(createSchemaTreeAnnotationsDialog({
  getDocument:()=>model,
  validateCandidate:validateTreeAnnotationCandidate,
  applyCandidate:(candidate,edits,message)=>{
    validateTreeAnnotationCandidate(candidate,edits);
    model=candidate;renderModel();syncModelActionAvailability();setStatus(message,'good');
  },
}));
const rootConstraintsDialog=resources.add(createRootConstraintsDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const objectRulesDialog=resources.add(createObjectRulesDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const conditionalDefinitionsDialog=resources.add(createConditionalDefinitionsDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const localDefinitionsDialog=resources.add(createLocalDefinitionsDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const definitionPatchesDialog=resources.add(createDefinitionPatchesDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));

const generatedOverlaysDialog=resources.add(createGeneratedFieldOverlaysDialog({
  getDocument:()=>model,
  validateCandidate:validateGeneratedOverlayCandidate,
  applyCandidate:(candidate,edits,message)=>{
    validateGeneratedOverlayCandidate(candidate,edits);
    model=candidate;renderModel();syncModelActionAvailability();setStatus(message,'good');
  },
}));
const definitionWorksheetDialog=resources.add(createDefinitionWorksheetDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));

const definitionRefactorDialog=resources.add(createDefinitionRefactorDialog({
  getDocument:()=>model,
  validateCandidate:validateFactoredSchemaCandidate,
  applyCandidate:(candidate,parameters,message)=>{
    validateFactoredSchemaCandidate(candidate,parameters);
    model=candidate;renderModel();syncModelActionAvailability();setStatus(message,'good');
  },
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const siblingDefinitionCopyDialog=resources.add(createSiblingDefinitionCopyDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
const schemaBranchAuditDialog=resources.add(createSchemaBranchAuditDialog({getDocument:()=>model,getDocumentPath:openedDocumentPath}));
$('#schema-branch-audit-open').addEventListener('click',()=>schemaBranchAuditDialog.open());
const runtimeRouteDialog=resources.add(createRuntimeRouteDialog({
  getDocument:()=>model,
  validateCandidate:validateBulkSchemaCandidate,
  applyCandidate:applyBulkSchemaCandidate,
  generatedOwnerAtPath:schemaGeneratedOwnerAtPath,
}));
// Commands own schema transactions; the interpreting schema declares their labels and placement.
const editorSelectionDialog=resources.add(createEditorWidgetDialog({getDocument:()=>model,getDocumentFile:openedDocumentPath,applyCandidate:applyBulkSchemaCandidate}));
const schemaDialogControllers=Object.freeze({
  ...createCoreSchemaDialogControllers(controllerContext),
  'editor-widget':editorSelectionDialog,'bulk-annotations':bulkAnnotationDialog,'bulk-widgets':bulkWidgetSettingsDialog,
  'bulk-constraints':bulkFieldConstraintsDialog,'bulk-schema-authoring':bulkSchemaAuthoringDialog,'nested-structure':nestedStructureDialog,
  'bulk-edit-actions':bulkEditActionsDialog,'bulk-references':bulkReferenceDialog,'bulk-validation':bulkValidationDialog,
  'rule-recipes':validationRuleRecipeDialog,'bulk-contracts':bulkRootContractsDialog,'tree-annotations':treeAnnotationsDialog,
  'runtime-routes':runtimeRouteDialog,'root-constraints':rootConstraintsDialog,'object-rules':objectRulesDialog,
  'conditional-definitions':conditionalDefinitionsDialog,'local-definitions':localDefinitionsDialog,'definition-patches':definitionPatchesDialog,
  'generated-overlays':generatedOverlaysDialog,'definition-worksheet':definitionWorksheetDialog,'definition-refactor':definitionRefactorDialog,
  'copy-definitions':siblingDefinitionCopyDialog,'branch-audit':schemaBranchAuditDialog,
});
const schemaAuthoringCommands=Object.freeze({
  'editor-widget':Object.assign(()=>editorSelectionDialog.open(),{widget:'modelEditor',entry:'createEditorWidgetDialog'}),
  'bulk-annotations':path=>bulkAnnotationDialog.open(path),
  'bulk-widgets':path=>bulkWidgetSettingsDialog.open(path),
  'bulk-constraints':path=>bulkFieldConstraintsDialog.open(path),
  'bulk-schema-authoring':Object.assign(path=>bulkSchemaAuthoringDialog.open(path),{widget:'modelEditor',entry:'createBulkSchemaAuthoringDialog'}),
  'nested-structure':path=>nestedStructureDialog.open(path),
  'bulk-edit-actions':path=>bulkEditActionsDialog.open(path),
  'bulk-references':path=>bulkReferenceDialog.open(path),
  'bulk-validation':Object.assign(()=>bulkValidationDialog.open(),{widget:'validationProgram',entry:'createValidationProgramTableDialog'}),
  'rule-recipes':Object.assign(()=>validationRuleRecipeDialog.open(),{widget:'validationProgram',entry:'createValidationRuleRecipeTable'}),
  'bulk-contracts':path=>bulkRootContractsDialog.open(path[0]),
  'tree-annotations':path=>treeAnnotationsDialog.open(),
  'runtime-routes':path=>runtimeRouteDialog.open(),
  'root-constraints':path=>rootConstraintsDialog.open(),
  'object-rules':path=>objectRulesDialog.open(path),
  'conditional-definitions':path=>conditionalDefinitionsDialog.open(),
  'local-definitions':path=>localDefinitionsDialog.open(),
  'definition-patches':path=>definitionPatchesDialog.open(path),
  'generated-overlays':path=>generatedOverlaysDialog.open(path),
  'definition-worksheet':path=>definitionWorksheetDialog.open(path),
  'definition-refactor':path=>definitionRefactorDialog.open(path),
  'copy-definitions':path=>siblingDefinitionCopyDialog.open(),
  'branch-audit':()=>schemaBranchAuditDialog.open(),
});



const bulkButtons=document.createElement('div');
bulkButtons.className='schema-bulk-launch-buttons';

$('#schema-authoring-close')?.before(bulkButtons);
$('#schema-validation-dialog-close')?.addEventListener('click', () => $('#schema-validation-dialog').close());
$('#schema-validation-dialog-done')?.addEventListener('click', () => $('#schema-validation-dialog').close());
$('#schema-validation-dialog')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
$('#schema-authoring-close')?.addEventListener('click', closeSchemaAuthoringDialog);
$('#schema-authoring-cancel')?.addEventListener('click', closeSchemaAuthoringDialog);
$('#schema-authoring-dialog')?.addEventListener('cancel', event => { event.preventDefault(); closeSchemaAuthoringDialog(); });
$('#schema-authoring-dialog')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) closeSchemaAuthoringDialog();
});
$('#schema-authoring-operation')?.addEventListener('change', renderSchemaAuthoringInputs);
$('#schema-authoring-use-target')?.addEventListener('click', selectSchemaAuthoringTargetPath);
$('#schema-authoring-target-path')?.addEventListener('keydown', event => {
  if(event.key==='Enter'){event.preventDefault();selectSchemaAuthoringTargetPath();}
});
$('#schema-authoring-form')?.addEventListener('input', invalidateSchemaAuthoringPreview);
$('#schema-authoring-form')?.addEventListener('change', invalidateSchemaAuthoringPreview);
$('#schema-authoring-form')?.addEventListener('submit', event => {
  event.preventDefault();
  previewSchemaAuthoringOperation();
});
$('#schema-authoring-apply')?.addEventListener('click', applySchemaAuthoringOperation);
initializeSchemaAuthoringPreview();











const projectDisplay = $('#project-context'), status = $('#status');
const settingsTable = $('#settings-table'), fullJson = $('#full-json'), treeContent = $('#tree-content');
const previewCanvas = $('#preview-canvas'), previewContext = previewCanvas.getContext('2d');
const graphicsHoverTooltip = document.createElement('div');
graphicsHoverTooltip.id = 'graphics-hover-tooltip';
graphicsHoverTooltip.className = 'graphics-hover-tooltip';
graphicsHoverTooltip.setAttribute('role', 'tooltip');
graphicsHoverTooltip.hidden = true;
$('#geometry-view').append(graphicsHoverTooltip);
const operationProgress = createOperationProgressState();
let model = null, selectedPath = null, selectedCollection = null, selectedLabel = '', currentTab = 'settings', compiledGeo = null, previewMesh = null, previewMeshComponentId = null, previewMeshModelSnapshot = null, modelRepairMode = false, modelRepairErrors = [], serverCompatibility = 'checking', treeDragState = null, clearResultsBusy = false;
let newModelCreating = false;
let schemaProjectCreation = false;
let serverCompatibilityReady = Promise.resolve(), compatibilityApplicationId = null;
let lastValidatedModelSnapshot = null, lastValidationSummary = '', lastDocumentValidation = null;
let modelValidating = false;
const treeSectionCollapsedState=new Map();
let reactTreeState=createTreeViewState(),reactTreeMount=null,reactTreeProjection=null;
let treeRename=null,treeRenameCommit=null;
let settingsSurface=null,settingsSurfaceContent=null,graphicsControlSurface=null,editorDebug=null,editorDebugPanel=null,editorWatch=null;
let activeAuthoringTool=null,restoredOperationView=null;
let lastEditorFocus=null;
const lastDialogFocus=new WeakMap();
const graphicsControlState=new Map();
const treeRootCollapsedState=new Map();
let activeUiProfile = null;
let activeScenarioDefinition = null;
let activeApplicationPackage = null;
let schemaAuthoringDialogState = null;
let selectedSchemaProjection = null;
let activeApplicationActions = null;
let activeSelectionActions = {};
let activeApplicationWidgetRenderers = {};
let activeApplicationWidgetComponents = {};
let activeApplicationDynamicPropertySets = {};
let activeApplicationGraphicsWidgets = {};
let activeGraphicsLayerRegistry = createGraphicsLayerRegistry();
let activeGraphicsSceneId = null;
let scenarioMetadata = {};
let engineCapabilities = {};
let uiProfileSchema = { properties: { copy: { default: {} }, behavior: { properties: { tree: { properties: {} } } } } };
let modelUnitChoices = [];






const getUnit=getCoreUnit;
const resolveModelParameters=(...args)=>editorDomain('resolveModelParameters',...args);
const modelWithResultActionSettings=(...args)=>editorDomain('modelWithResultActionSettings',...args);
const reservedExpressionSymbolsForModel=(...args)=>editorDomain('reservedExpressionSymbolsForModel',...args);
const reservedParameterSymbolsForModel=(...args)=>editorDomain('reservedParameterSymbolsForModel',...args);
const sharedEditorApi=Object.freeze({model:'/api/model',save:'/api/model/save',saveAs:'/api/model/document/save-as',info:'/api/model-editor/info',operationFinish:'/api/model/operation/finish',operationCancel:'/api/model/operation/cancel',fileMatch:'/api/model/file-match',kernelCommandRun:'/api/kernel/command/run',kernelArtifactRead:'/api/kernel/artifact',kernelStorageRemove:'/api/kernel/storage/remove-matching-directories'});




















let activeGraphicsWidget = null;
let settingsDraft = null, settingsDraftDirty = false, jsonDraftDirty = false, relatedFieldsDraft=null, relatedFieldsDraftPaths=new Set(), contextTarget = null, activeResultActionId = null, resultSelections = {}, sweepViewModes = {}, resultRenderSequence = 0, resultActionLoading = false, lastSweepRender = null, fieldPlotState = null, fieldPlotLoadStatus = null;
let schemaChoiceEditor = null, schemaChoiceKey = null, schemaChoiceState = null, schemaChoiceChanged = false;
let schemaAnnotationEditor = null, schemaAnnotationKey = null, schemaAnnotationState = null, schemaAnnotationChanged = false;
let schemaUiEditor = null, schemaUiKey = null, schemaUiState = null, schemaUiChanged = false;
let schemaGraphicsEditor = null, schemaGraphicsKey = null, schemaGraphicsState = null, schemaGraphicsChanged = false;
let schemaGlobalUiEditor = null, schemaGlobalUiKey = null;
let schemaStructureDialogState = null;
const schemaGraphicsHost = document.createElement('div');
schemaGraphicsHost.className = 'schema-graphics-editor';
schemaGraphicsHost.hidden = true;
const schemaGlobalUiHost = document.createElement('div');
schemaGlobalUiHost.className = 'schema-global-ui-editor';
schemaGlobalUiHost.hidden = true;
const schemaGraphicsContextHost = document.createElement('div');
schemaGraphicsContextHost.className = 'schema-graphics-context-host';
schemaGraphicsContextHost.hidden = true;
$('#graphics-selection-context').append(schemaGraphicsContextHost);
const resultTablesByAction = new Map();
let operationProgressTimer = null;
const operationKinds = new Map();




let loadedModelFolder = null, loadedModelFile = null, loadedModelSnapshot = null, loadedModelContentHash = null, modelLoading = false, modelSaving = false, modelLoadSequence = 0;
let camera = { yaw: .68, pitch: -.42, zoom: 1, panX: 0, panY: 0 }, pointer = null;

const contextMenu = document.createElement('div'); contextMenu.className = 'tree-context-menu hidden'; contextMenu.setAttribute('role','menu'); document.body.append(contextMenu);
const schemaProjectionForTreeButton = new WeakMap();
const resizeMinColumnWidth=52;








const columnResizeObserver=new MutationObserver((mutations)=>{const tables=new Set();for(const mutation of mutations){const table=mutation.target.closest?.('.settings-table,.result-grid');if(table)tables.add(table);for(const node of mutation.addedNodes)if(node.nodeType===1)prepareResizableTables(node)}tables.forEach(prepareResizableTable)});
columnResizeObserver.observe($('#settings-view'),{childList:true,subtree:true});columnResizeObserver.observe($('#schema-open-table-host'),{childList:true,subtree:true});columnResizeObserver.observe($('#result-data-table'),{childList:true,subtree:true});prepareResizableTables();




























let projectRootFolder='projects';
let defaultModelManifestFile='model.json';
let modelManifestFile=defaultModelManifestFile;
let fullmetaRunsDirectory='runs';
let fullmetaResultsDirectory='results';


























































const sharedControlCopy={
  validationStart:'Checking the model…',validationChanged:'The model changed while validation was running. Validate again.',
  validationPassed:'Model validation passed ({modelFormat}).',validationSummary:'Model validation passed.',
  validationIncomplete:'Model validation did not complete: {error}',validationFailed:'Could not complete model validation: {error}',
  compatibilityMismatch:'The editor and local server use different versions. {details}',
  compatibilityFailed:'The local server version check failed: {error}',
};















const uiProfileSchemaValidationKeywords=new Set(['$defs','$ref','type','const','enum','required','properties','additionalProperties','items','prefixItems','minItems','maxItems','uniqueItems','minLength','maxLength','pattern','minimum','maximum','exclusiveMinimum','exclusiveMaximum']);
const uiProfileSchemaAnnotations=new Set(['$schema','$id','title','description','default','examples','readOnly','writeOnly','deprecated']);
























const editedSettingsInputs = new WeakSet();
const rawFieldDrafts=new Map();
let commandSession=null,editorWebMcp=null,lastNativeOperation=null,pendingScanConfirmation=null;
const applicationCommands=createApplicationCommandDispatcher({bindings:()=>activeApplicationPackage?.actionBindings,actions:()=>activeApplicationActions,control:$});
const onWidgetCommand=createWidgetCommandDispatcher({fieldCommand:handleFieldCommand,getSession:()=>commandSession});
function fieldDraftKey(path){return JSON.stringify([selectedPath,path]);}
function handleFieldCommand(command,event){
  event?.stopPropagation?.();
  if(jsonDraftDirty)throw new Error('Apply the current JSON draft before changing a field.');
  if(!hasSettingsDraft()||!selectedPath)throw new Error('Select a document field first.');
  if(command.selectionPath&&!samePath(command.selectionPath,selectedPath))throw new Error('The selected declaration changed. Inspect its current path before editing.');
  const selectedFieldSchema=selectedPath?resolveModelEditorSchema(modelEditorSchemaForPath(model,selectedPath)):null;
  const relatedSiblingPaths=schemaWidgetOptions(selectedFieldSchema||{}).widget==='relatedFields'
    ?(schemaWidgetOptions(selectedFieldSchema||{}).siblings||[]).map(sibling=>sibling.path).filter(Array.isArray):[];
  const isDeclaredRelatedRootPath=relatedSiblingPaths.some(siblingPath=>
    siblingPath.length<=command.path?.length&&siblingPath.every((part,index)=>String(part)===String(command.path[index])));
  const isAbsoluteDocumentPath=Array.isArray(command.path)&&Array.isArray(selectedPath)
    &&!selectedPath.every((part,index)=>String(part)===String(command.path[index]))
    &&Object.hasOwn(model,command.path[0]);
  if(command.rootPath||isDeclaredRelatedRootPath||isAbsoluteDocumentPath){
    if(command.type!=='field.change'||!Array.isArray(command.path))throw new Error('This related-field action cannot be staged at the project root.');
    const path=command.path,key=JSON.stringify([selectedPath,path]),raw=command.rawValue===undefined?command.value:command.rawValue;
    rawFieldDrafts.set(key,{path,selection:selectedPath,value:raw,error:''});
    try{
      assertFieldWritable({document:model,path,schemaAt:candidatePath=>modelEditorSchemaForPath(model,candidatePath),resolve:resolveModelEditorSchema,generatedOwnerAt:schemaGeneratedOwnerAtPath,kind:activeApplicationPackage?.kind});
      const base=relatedFieldsDraft||cloneJson(model);
      relatedFieldsDraft=draftWithFieldChange(base,command,{defaultAtPath:candidatePath=>{
        const schema=resolveModelEditorSchema(modelEditorSchemaForPath(base,candidatePath));
        return schema&&Object.hasOwn(schema,'default')?schema.default:undefined;
      }});
      relatedFieldsDraftPaths.add(JSON.stringify(path));settingsDraftDirty=true;
      setStatus(`Updated related field ${pathLabel(path)}. Apply item to commit the draft.`,'good');
    }catch(error){rawFieldDrafts.get(key).error=error.message;settingsDraftDirty=true;setStatus(error.message,'error');renderSettingsTable();syncModelActionAvailability();return {valid:false,error:error.message,path};}
    renderSettingsTable();syncModelActionAvailability();if(!commandSession?.active)commandSession?.changed();
    return {valid:true,path,value:path.reduce((node,key)=>node?.[key],relatedFieldsDraft)};
  }
  assertFieldWritable({document:model,path:[...selectedPath,...(command.path||[])],schemaAt:path=>modelEditorSchemaForPath(model,path),resolve:resolveModelEditorSchema,generatedOwnerAt:schemaGeneratedOwnerAtPath,kind:activeApplicationPackage?.kind});
  if(command.type==='field.optional'){
    const path=command.path;
    const schemaNode=modelEditorSchemaForPath(model,[...selectedPath,...path]),ui=schemaWidgetOptions(resolveModelEditorSchema(schemaNode));
    settingsDraft=draftWithOptionalField(settingsDraft,{path,present:command.present,createWithProperties:ui.createWithProperties||[],clearWithProperties:ui.clearWithProperties},{defaultAtPath:target=>defaultValueForOptionalField(target,modelEditorSchemaForPath(model,[...selectedPath,...target]))});settingsDraftDirty=true;renderSettingsTable();syncModelActionAvailability();if(!commandSession?.active)commandSession?.changed();return {valid:true,path,present:command.present};
  }
  if(command.type==='field.change'){
    const key=fieldDraftKey(command.path),raw=command.rawValue===undefined?command.value:command.rawValue;
    rawFieldDrafts.set(key,{path:command.path,selection:selectedPath,value:raw,error:''});
    try{
      const next=draftWithFieldChange(settingsDraft,command,{defaultAtPath:path=>{
        const current=modelWithEditorSettingsDraft(model,selectedPath,settingsDraft);
        const schema=resolveModelEditorSchema(modelEditorSchemaForPath(current,[...selectedPath,...path]));
        return schema&&Object.hasOwn(schema,'default')?schema.default:undefined;
      }});settingsDraft=next;settingsDraftDirty=true;
      const change=activeApplicationPackage?.settingsFieldChange?.({draft:settingsDraft,path:command.path,value:command.path.reduce((node,key)=>node?.[key],next),model,selectedPath,ui:activeApplicationPackage.modelEditorUi})||{};
      if(change.redrawPreview)drawPreview();
      setStatus(change.status||`Updated ${pathLabel(command.path)}. Apply item to commit the draft.`,change.statusKind);
    }catch(error){rawFieldDrafts.get(key).error=error.message;settingsDraftDirty=true;setStatus(error.message,'error');renderSettingsTable();syncModelActionAvailability();return {valid:false,error:error.message,path:command.path};}
    renderSettingsTable();syncModelActionAvailability();if(!commandSession?.active)commandSession?.changed();
    return {valid:true,path:command.path,value:command.path.reduce((node,key)=>node?.[key],settingsDraft)};
  }
  if(command.type==='widget.action'){
    const args=command.args||{},record=widgetActionRecord(command);
    const confirmationTarget=JSON.stringify({document:openedDocumentPath(),selection:selectedPath,draft:settingsDraft,path:command.path,widget:command.widget,action:command.action,row:args.row,value:args.value});
    if(args.confirmed===true){
      if(event||!pendingScanConfirmation||pendingScanConfirmation.revision!==commandSession?.revision||pendingScanConfirmation.target!==confirmationTarget)throw new Error('The scan confirmation is no longer current. Request the conversion again.');
      pendingScanConfirmation=null;record.dataset.scanModeConfirmed='true';
    }
    let result=args.kind==='change'?applySchemaWidgetChange(record,settingsDraft,schemaFieldContext(activeApplicationWidgetRenderers)):applySchemaWidgetAction(record,settingsDraft,schemaFieldContext(activeApplicationWidgetRenderers));
    if(result.confirmationRequired&&event){
      const label=event.target?.getAttribute?.('aria-label');
      if(!globalThis.confirm(`${label?`${label}: `:''}${result.confirmationMessage}`)){renderSettingsTable();setStatus('Scan conversion cancelled. The original values are unchanged.','good');return {changed:false,cancelled:true};}
      record.dataset.scanModeConfirmed='true';
      result=applySchemaWidgetChange(record,settingsDraft,schemaFieldContext(activeApplicationWidgetRenderers));
    }
    if(result.confirmationRequired&&!event){pendingScanConfirmation={target:confirmationTarget,revision:commandSession.revision+1};return {...result,confirmationRevision:pendingScanConfirmation.revision};}
    if(result.error){if(event){renderSettingsTable();setStatus(result.error,'error');return result;}throw new Error(result.error);}if(result.changed){
      const restoreChoiceFocus=command.widget==='repeatableChoiceTable'&&['add','remove'].includes(command.action)&&event?.target===document.activeElement;
      const focusedTarget=event?.target, documentAtAction=openedDocumentPath(), selectionAtAction=JSON.stringify(selectedPath), widgetPath=JSON.stringify(command.path);
      settingsDraftDirty=true;renderSettingsTable();syncModelActionAvailability();setStatus(result.message||'Updated the widget draft.');if(!commandSession?.active)commandSession?.changed();
      if(restoreChoiceFocus)queueMicrotask(()=>{
        if(openedDocumentPath()!==documentAtAction||JSON.stringify(selectedPath)!==selectionAtAction)return;
        if(document.activeElement!==document.body&&document.activeElement!==focusedTarget)return;
        const widget=[...settingsTable.querySelectorAll('.schema-choice-widget')].find(element=>element.dataset.schemaWidgetPath===widgetPath);
        const choices=[...(widget||settingsTable).querySelectorAll('select[data-schema-widget-change="choice"]')].filter(element=>element.dataset.schemaWidgetPath===widgetPath&&!element.disabled);
        const row=Number(args.row);
        const choice=command.action==='add'?choices.at(-1):choices[Math.max(0,Math.min(Number.isInteger(row)?row:0,choices.length-1))];
        const add=[...(widget||settingsTable).querySelectorAll('button[data-schema-widget-action="add"]')].find(element=>element.dataset.schemaWidgetPath===widgetPath);
        (choice||(!add?.disabled&&add)||widget)?.focus({preventScroll:true});
      });
    }return result;
  }
  throw new Error(`Unsupported field command: ${command.type}.`);
}




settingsTable.addEventListener('input',(event)=>{
  const editedInput=event.target.closest('[data-setting-path]');
  if(editedInput)editedSettingsInputs.add(editedInput);
  if(event.target.matches?.('[data-schema-action-facing]'))schemaActionFacingError(event.target);
  if(event.target.matches?.('[data-project-routing]')){updateProjectRoutingApplyState();return;}
  const projectNameInput=event.target.closest('[data-project-name]');
  if(projectNameInput&&model?.metadata){
    model.metadata.name=projectNameInput.value;
    updateModelPathDisplay();
    fullJson.value=JSON.stringify(model,null,2);jsonDraftDirty=false;
    updateModelEditState();syncModelActionAvailability();
    return;
  }
  const projectDescriptionInput=event.target.closest('[data-project-description]');
  if(projectDescriptionInput&&model?.metadata){model.metadata.description=projectDescriptionInput.value;fullJson.value=JSON.stringify(model,null,2);jsonDraftDirty=false;updateModelEditState();syncModelActionAvailability();return;}
  const input=event.target.closest('[data-definition-index][data-definition-field]');
  if(input?.hasAttribute('aria-invalid'))setDefinitionInputError(input);
});
settingsTable.addEventListener('focusout',(event)=>{
  const projectNameInput=event.target.closest('[data-project-name]');
  if(projectNameInput&&model?.metadata){
    const name=projectNameInput.value.trim();
    if(!name){const previous=projectNameInput.dataset.originalValue||'';projectNameInput.value=previous;model.metadata.name=previous;updateModelPathDisplay();fullJson.value=JSON.stringify(model,null,2);jsonDraftDirty=false;updateModelEditState();syncModelActionAvailability();setStatus('Project name is required.','error');return;}
    model.metadata.name=name;projectNameInput.value=name;
    updateModelPathDisplay();
    projectNameInput.dataset.originalValue=name;
    fullJson.value=JSON.stringify(model,null,2);jsonDraftDirty=false;
    updateModelEditState();syncModelActionAvailability();
    setStatus('Updated display name. Save to keep the change.','good');
    return;
  }
  const projectDescriptionInput=event.target.closest('[data-project-description]');
  if(projectDescriptionInput&&model?.metadata){model.metadata.description=projectDescriptionInput.value;fullJson.value=JSON.stringify(model,null,2);jsonDraftDirty=false;updateModelEditState();syncModelActionAvailability();setStatus('Updated project description. Save to keep the change.','good');return;}
  const definitionInput=event.target.closest('[data-definition-index][data-definition-field]');
  if(definitionInput&&selectedCollection)commitDefinitionInput(definitionInput);
  const settingInput=event.target.closest('[data-setting-path]:not([data-setting-root-path="true"])');
  if(settingInput&&hasSettingsDraft()){
    if(settingInput.dataset.settingChoiceValue!=='true')commitSettingsInput(settingInput);
    applySettingsDraftAfterFieldBlur();
  }
});
settingsTable.addEventListener('change', (event) => {
  const editedInput=event.target.closest('[data-setting-path]');
  if(editedInput)editedSettingsInputs.add(editedInput);
  const schemaWidgetChange=event.target.closest('[data-schema-widget-change]');
  if(schemaWidgetChange&&settingsDraft){
    if(jsonDraftDirty){setStatus('Apply the current JSON draft before changing this setting.','error');renderSettingsTable();return;}
      let result=applySchemaWidgetChange(schemaWidgetChange,settingsDraft,schemaFieldContext(activeApplicationWidgetRenderers));
      if(result.confirmationRequired){
        const accepted=globalThis.confirm(result.confirmationMessage);
        if(!accepted){renderSettingsTable();setStatus('Scan conversion cancelled. The original values are unchanged.','good');return;}
        schemaWidgetChange.dataset.scanModeConfirmed='true';
        try{result=applySchemaWidgetChange(schemaWidgetChange,settingsDraft,schemaFieldContext(activeApplicationWidgetRenderers));}
        finally{delete schemaWidgetChange.dataset.scanModeConfirmed;}
      }
    if(result.changed){
      settingsDraftDirty=true;
      if(['x-column','fixed-value'].includes(schemaWidgetChange.dataset.schemaWidgetChange)){
        try{applyCurrentSettingsDraft({refresh:false,announce:true})}catch{return;}
      }
      renderSettingsTable();syncModelActionAvailability();setStatus(result.message||'Updated the setting. Apply item or continue to another action to commit it.','good');
    }
    else if(result.error)setStatus(result.error,'error');
    if(result.changed||result.error)return;
  }
  if(event.target.closest('[data-optional-field-path]'))return;
  const definitionInput=event.target.closest('[data-definition-index][data-definition-field]');
  if(definitionInput&&selectedCollection){
    commitDefinitionInput(definitionInput);return;
  }
  const input=event.target.closest('[data-setting-path]:not([data-setting-root-path="true"])');
  if(input&&hasSettingsDraft()){
    const path=JSON.parse(input.dataset.settingPath);
    const refreshSchemaValue=activeApplicationPackage?.kind==='schemaDocument'
      &&schemaAnnotationEditor&&schemaValueCompatibilityApplies(settingsDraft,selectedPath)
      &&path.length===1&&['type','items','enum','default'].includes(path[0]);
    if(refreshSchemaValue){
      try{flushSchemaAnnotationEditor()}catch(error){setStatus(error.message,'error');return;}
    }
    const changed=commitSettingsInput(input);
    if(changed&&(refreshSchemaValue||settingsSchemaHasChoiceDependency(path.at(-1))))renderSettingsTable();
  }
});



// Keep the edited input in place until the shared move handler commits it.
settingsTable.addEventListener('pointerdown',(event)=>{const button=event.target.closest('[data-row-move]');if(event.button===0&&button&&!button.disabled)event.preventDefault();});
settingsTable.addEventListener('click',(event)=>{
  const routingApply=event.target.closest('[data-project-routing-apply]');
  if(routingApply){routingApply.disabled=true;applyProjectRoutingDraft().catch(error=>setStatus(`Could not apply project routing fields: ${error.message}`,'error')).finally(updateProjectRoutingApplyState);return;}
  const rowMove=event.target.closest('[data-row-move]');
  if(rowMove){moveSettingsTableRow(rowMove);return;}
  const structureButton=event.target.closest('[data-schema-structure-action]');
  if(structureButton&&activeApplicationPackage?.kind==='schemaDocument'
    &&activeApplicationPackage.modelSchema?.['x-fullmeta-ui']?.structuralEditing===true
    &&selectedPath&&hasSettingsDraft()){
    if(jsonDraftDirty){setStatus('Apply the current JSON draft before changing this structure.','error');return;}
    try{flushSchemaDraftEditors()}catch(error){setStatus(error.message,'error');return;}
    for(const input of settingsTable.querySelectorAll('[data-setting-type="number"]')){
      const error=schemaDocumentNumericFieldError(input);
      if(error){setStatus(error,'error');input.focus();return;}
    }
    for(const input of settingsTable.querySelectorAll('[data-setting-type="json-value"]')){
      try{JSON.parse(input.value)}catch{setStatus(`${input.getAttribute('aria-label')||'Value'} must be valid JSON.`,'error');input.focus();return;}
    }
    const row=structureButton.closest('tr'),action=structureButton.dataset.schemaStructureAction;
    try{
      const path=JSON.parse(structureButton.dataset.schemaStructurePath||'[]');
      if(action==='open'){
        const destination=[...selectedPath,...path],part=path.at(-1);
        const label=typeof part==='number'?`Item ${part+1}`:String(part);
        openSchemaStructureDialog({label,path:destination,projection:null},structureButton);
        return;
      }
      if(action==='duplicate'){
        if(selectedPath.at(-1)==='properties' && schemaDeclarationScope(selectedPath.slice(0,-1))==='schema'
          &&path.length===1){
          const parentPath=selectedPath.slice(0,-1);
          const parent=valueAt(parentPath);
          const duplicated=duplicateSchemaMember(parent,['properties',path[0]]);
          model=modelWithEditorSettingsDraft(model,parentPath,duplicated.document);
          settingsDraft=duplicated.document.properties;settingsDraftDirty=false;renderModel();syncModelActionAvailability();
          setStatus(`Duplicated ${path[0]} as ${duplicated.label}. Save to keep the change.`,'good');
          return;
        }
        const duplicated=duplicateSchemaMember(settingsDraft,path);
        settingsDraft=duplicated.document;settingsDraftDirty=true;renderSettingsTable();
        updateModelEditState();syncModelActionAvailability();
        setStatus(`Duplicated ${path.at(-1)} as ${duplicated.label}. Apply item and Save to keep the change.`,'good');
        return;
      }
      const next=editSchemaStructure(settingsDraft,{
        action,
        path,
        name:action==='add-schema-declaration'?row?.querySelector('[data-schema-declaration-name]')?.value
          :action==='add-property'?row?.querySelector('[data-schema-structure-key]')?.value
            :row?.querySelector('[data-schema-structure-name]')?.value,
        kind:action==='add-schema-declaration'?row?.querySelector('[data-schema-declaration-type]')?.value
          :row?.querySelector('[data-schema-structure-kind]')?.value,
        declarationKind:action==='add-schema-declaration'?structureButton.dataset.schemaDeclarationKind:undefined,
        required:row?.querySelector('[data-schema-declaration-required]')?.checked===true,
        title:row?.querySelector('[data-schema-declaration-title]')?.value||'',
        description:row?.querySelector('[data-schema-declaration-description]')?.value||'',
        reference:row?.querySelector('[data-schema-declaration-reference]')?.value||'',
        referenceChoice:row?.querySelector('[data-schema-declaration-reference-choice]')?.value||'',
        choices:row?.querySelector('[data-schema-declaration-choices]')?.value||'',
        minimum:row?.querySelector('[data-schema-declaration-minimum]')?.value||'',
        maximum:row?.querySelector('[data-schema-declaration-maximum]')?.value||'',
        minLength:row?.querySelector('[data-schema-declaration-min-length]')?.value||'',
        maxLength:row?.querySelector('[data-schema-declaration-max-length]')?.value||'',
        minItems:row?.querySelector('[data-schema-declaration-min-items]')?.value||'',
        maxItems:row?.querySelector('[data-schema-declaration-max-items]')?.value||'',
      });
      if(next===settingsDraft)return;
      if(selectedPath.at(-1)==='properties' && schemaDeclarationScope(selectedPath.slice(0,-1))==='schema'
        &&path.length===1&&(action==='rename'||action==='remove')){
        const parentPath=selectedPath.slice(0,-1);
        const parent=valueAt(parentPath);
        const updated=schemaWithEditedProperties(parent,next,{
          action,from:path[0],to:row?.querySelector('[data-schema-structure-name]')?.value,
        });
        model=modelWithEditorSettingsDraft(model,parentPath,updated);
        settingsDraft=next;settingsDraftDirty=false;renderModel();syncModelActionAvailability();
        setStatus('Updated the schema property and its required list. Save to keep the change.','good');
        return;
      }
      settingsDraft=next;
      settingsDraftDirty=true;renderSettingsTable();updateModelEditState();syncModelActionAvailability();
      setStatus(`Updated the JSON structure. Apply item and Save to keep the change.`,'good');
    }catch(error){setStatus(error.message,'error');}
    return;
  }
  const schemaWidgetAction=event.target.closest('[data-schema-widget-action]');
  if(schemaWidgetAction&&settingsDraft){
    if(jsonDraftDirty){setStatus('Apply the current JSON draft before changing this setting.','error');renderSettingsTable();return;}
    const result=applySchemaWidgetAction(schemaWidgetAction,settingsDraft,schemaFieldContext(activeApplicationWidgetRenderers));
    if(result.changed){
      settingsDraftDirty=true;
      if(schemaWidgetAction.dataset.schemaWidgetAction==='remove-filter'){
        try{applyCurrentSettingsDraft({refresh:false,announce:true})}catch{return;}
      }
      renderSettingsTable();syncModelActionAvailability();setStatus(result.message||'Updated the setting. Apply item or continue to another action to commit it.','good');
    }
    else if(result.error)setStatus(result.error,'error');
    if(result.changed||result.error)return;
  }
  if(!selectedCollection)return;
  const listPath=definitionCollectionPath(selectedCollection),remove=event.target.closest('[data-definition-remove]');
  if(remove){const index=Number(remove.dataset.definitionRemove),path=[...listPath,index],removed=valueAt(listPath)[index];model=modelAfterTreeDeletion(path);renderModel();setStatus(`Removed ${definitionLabel(removed)}. Validate the model and Save to keep the change.`,'good');return;}
  if(event.target.closest('[data-definition-add]')){
    try{insertArrayItem(listPath,defaultArrayItem(listPath));}catch(error){setStatus(error.message,'error');}
  }
});
$('#schema-open-apply').addEventListener('click',()=>finishSchemaStructureDialog({apply:true}));
$('#schema-open-back').addEventListener('click',()=>backSchemaStructureDialog());
$('#schema-open-follow-reference').addEventListener('click',()=>{
  const target=schemaLocalDefinitionDialogTarget(settingsDraft?.$ref);
  if(!schemaStructureDialogState||!target){
    setStatus('The selected declaration does not reference a local reusable definition.','error');
    return;
  }
  openSchemaStructureDialog(target,$('#schema-open-follow-reference'));
});
$('#schema-open-cancel').addEventListener('click',()=>finishSchemaStructureDialog({apply:false}));
$('#schema-open-close').addEventListener('click',()=>finishSchemaStructureDialog({apply:false}));
$('#schema-open-guided').addEventListener('click',()=>{
  const target=currentSchemaStructureDialogTarget();
  if(!target||activeApplicationPackage?.kind!=='schemaDocument')return;
  const label=selectedLabel;
  if(!finishSchemaStructureDialog({apply:true}))return;
  selectItem(label,target.path,schemaTreeButtonForSelection(target.path,target.projection),target.projection);
  try{openSchemaAuthoringDialog({itemPath:target.path,schemaProjection:target.projection})}
  catch(error){setStatus(error.message,'error')}
});
$('#schema-open-dialog').addEventListener('cancel',(event)=>{event.preventDefault();finishSchemaStructureDialog({apply:false})});
$('#schema-open-dialog').addEventListener('click',(event)=>{if(event.target===$('#schema-open-dialog'))finishSchemaStructureDialog({apply:false})});










































































treeContent.addEventListener('pointerdown',(event)=>{
  if(event.button!==0||event.isPrimary===false)return;
  const source=event.target.closest('.tree-item.tree-reorderable');if(!source||!treeContent.contains(source))return;
  const sourcePath=treeItemPath(source),arrayPath=treeArrayPathForItem(sourcePath),section=source.closest('.tree-group');if(!arrayPath||!section)return;
  treeDragState={sourcePath,arrayPath,section,sourceLabel:source.textContent.trim(),sourceNode:source,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,active:false};
});
listenDocument('pointermove',(event)=>{
  const state=treeDragState;if(!state||event.pointerId!==state.pointerId)return;
  if(!state.active&&Math.hypot(event.clientX-state.startX,event.clientY-state.startY)<5)return;
  if(!state.active){
    if(jsonDraftDirty){treeDragState=null;setStatus('Apply or discard the JSON editor changes before reordering model-tree items.','error');return;}
    try{if(applyCurrentSettingsDraft({refresh:false}))updateModelEditState()}catch{treeDragState=null;return;}
    state.active=true;state.sourceNode?.classList.add('tree-dragging');
  }
  event.preventDefault();clearTreeDropTargetIndicators();
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.tree-item[data-model-path]');if(!target||!treeContent.contains(target))return;
  const plan=treeDropPlan(state,target,event.clientY);if(!plan)return;
  if(plan.kind==='move'&&plan.nested)target.closest('.tree-group')?.classList.add('tree-drop-target');
  else target.classList.add(plan.dropAfter?'tree-drop-after':'tree-drop-before');
});
listenDocument('pointerup',(event)=>{
  const state=treeDragState;if(!state||event.pointerId!==state.pointerId)return;
  treeDragState=null;
  if(state.active){
    event.preventDefault();
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.tree-item[data-model-path]');
    const plan=target&&treeContent.contains(target)?treeDropPlan(state,target,event.clientY):null;
    if(plan)try{
      if(plan.kind==='reorder')reorderTreeItem(state,target,plan.dropAfter);
      else moveSpecialTreeItem(state.sourcePath,plan.destinationPath,plan.index);
    }catch(error){setStatus(error.message,'error')}
  }
  clearTreeDropIndicators();
});
listenDocument('pointercancel',(event)=>{if(treeDragState?.pointerId===event.pointerId){treeDragState=null;clearTreeDropIndicators()}});
listenDocument('contextmenu',(event)=>event.preventDefault(),{capture:true});
treeContent.closest('.tree').addEventListener('contextmenu',(event)=>{const node=event.target.closest('[data-model-path],[data-array-path]');if(node&&(treeContent.contains(node)||node===$('#tree-home')))openTreeMenu(event,node)});
listenDocument('keydown',(event)=>{if(!(event.key==='ContextMenu'||event.code==='ContextMenu'||((event.key==='F10'||event.code==='F10')&&event.shiftKey)))return;const node=event.target.closest?.('[data-model-path],[data-array-path]');if(!node||(!treeContent.contains(node)&&node!==$('#tree-home')))return;const bounds=node.getBoundingClientRect();openTreeMenu({preventDefault:()=>event.preventDefault(),clientX:bounds.right,clientY:bounds.top+bounds.height/2},node)},true);
contextMenu.addEventListener('click',(event)=>{
  const action=event.target.closest('[data-action]')?.dataset.action;if(!action||!contextTarget)return;
  const target=contextTarget;closeTreeMenu();
  try {
    if(action==='schema.addChildItem'&&activeApplicationPackage?.kind==='schemaDocument'){
      openSchemaAuthoringDialog(target);return;
    }
    const inlineEdit=treeActionPlans().inlineEditForAction?.(action,target);
    if(inlineEdit){startDeclaredTreeInlineEdit(action,target,inlineEdit);return;}
    if(performDeclaredTreeAction(action,target))return;
    if (action==='rename') startRenameTreeItem(target.itemPath);
    else if (action==='delete') deleteTreeItem(target.itemPath);
    else if(action==='toggle-enabled')toggleTreeItemEnabled(target.itemPath);
    else if(action==='select-item'){const path=target.itemPath;[...treeContent.querySelectorAll('[data-model-path]')].find((node)=>node.dataset.modelPath===JSON.stringify(path))?.click();}
    else performTreeInsertionAction(action,target);
  } catch (error) { setStatus(error.message,'error'); }
});
listenDocument('pointerdown',(event)=>{if(!contextMenu.contains(event.target))closeTreeMenu()});
listenDocument('keydown',(event)=>{if(event.key==='Escape')closeTreeMenu()});listenWindow('blur',closeTreeMenu);
const workspace=$('.workspace'),rightWorkspace=$('#right-workspace'),treeSplitter=$('#tree-splitter'),rightSplitter=$('#right-splitter');






workspaceLayout=resources.add(createWorkspaceLayoutController({root:container,onResize:()=>drawPreview()}));

listenWindow('resize',restorePanelLayout);


































$('#save-as').addEventListener('click',openSaveAsDialog);



$('#new-model').addEventListener('click',()=>openNewModelDialog().catch(error=>setStatus(`Could not start a new model. ${error.message}`,'error')));
$('#new-model-id').addEventListener('input',updateNewModelFolderPreview);
$('#new-model-folder-browse').addEventListener('click',()=>fileDialogs.browse({kind:'new'}).catch(error=>setStatus(error.message,'error')));
$('#new-model-file').addEventListener('input',()=>{$('#new-model-file').dataset.userEdited='true'});
$('#new-model-cancel').addEventListener('click',()=>$('#new-model-dialog').close());
$('#new-model-dialog').addEventListener('close',()=>{schemaProjectCreation=false});
$('#new-model-dialog').addEventListener('cancel',event=>{if(newModelCreating)event.preventDefault()});
$('#new-model-form').addEventListener('submit',createNewModel);


$('#model-match-cancel').addEventListener('click',()=>$('#model-match-dialog').close('cancel'));

$('#open-project').addEventListener('click',()=>chooseNativeModel().catch(error=>setStatus(error.message,'error')));
const fileMenu=$('#file-menu');
let allowConfirmedEditorExit=false;
fileMenu.addEventListener('click',(event)=>{if(event.target.closest('button'))fileMenu.open=false});
listenDocument('click',(event)=>{if(!fileMenu.contains(event.target))fileMenu.open=false});
listenDocument('keydown',event=>{
  if(event.key!=='Escape'||!fileMenu.open||document.querySelector('dialog[open]'))return;
  event.preventDefault();event.stopImmediatePropagation();fileMenu.open=false;fileMenu.querySelector('summary').focus();
},true);

$('#exit-editor').addEventListener('click',()=>exitEditor().catch((error)=>setStatus(`Could not exit the editor. ${error.message}`,'error')));
listenDocument('keydown',(event)=>{
  if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
  const key=event.key.toLowerCase();
  if(key==='n'){
    event.preventDefault();
    fileMenu.open=false;
    if(!$('#new-model').disabled)openNewModelDialog().catch(error=>setStatus(`Could not start a new model. ${error.message}`,'error'));
    return;
  }
  if(key==='o'){
    event.preventDefault();
    fileMenu.open=false;
    if(!$('#open-project').disabled)chooseNativeModel().catch(error=>setStatus(error.message,'error'));
    return;
  }
  if(key==='s'){
    event.preventDefault();
    fileMenu.open=false;
    if(event.shiftKey){if(!$('#save-as').disabled)openSaveAsDialog()}
    else if(!$('#save').disabled)saveModel().catch((error)=>setStatus(error.message,'error'));
  }
});
$('#save-as-cancel').addEventListener('click',()=>$('#save-as-dialog').close());
$('#save-as-form').addEventListener('submit',(event)=>{event.preventDefault();saveProjectAs().catch((error)=>{const message=$('#save-as-status');message.textContent=error.message;message.hidden=false;setStatus(`Could not save a model JSON copy. ${error.message}`,'error')})});
$('#tree-home').addEventListener('click',showModelOverview);
$('#selection-parent').addEventListener('click',()=>{
  if(activeApplicationPackage?.kind!=='schemaDocument'||!selectedPath?.length)return;
  const trail=selectedSchemaProjection?.treeTrail;
  if(Array.isArray(trail)&&trail.length){
    if(trail.length===1){showModelOverview();return;}
    const parentTrail=trail.slice(0,-1),entry=parentTrail.at(-1);
    const projection={...entry,treeTrail:parentTrail};
    selectItem(entry.label,entry.path,schemaTreeButtonForSelection(entry.path,projection),projection);
    return;
  }
  const parent=selectedPath.slice(0,-1);
  if(!parent.length){showModelOverview();return;}
  selectItem(String(parent.at(-1)),parent,null);
});
$('#tree-root-toggle').addEventListener('click',()=>{const projectId=String(activeApplicationPackage?.rootLabel?.(model)||model?.metadata?.id||'model'),collapsed=!$('#tree-children').hidden;treeRootCollapsedState.set(projectId,collapsed);configureTreeRoot()});
fullJson.addEventListener('input',()=>{
  jsonDraftDirty=!sameJsonModel(fullJson.value,model);
  syncModelActionAvailability();updateModelEditState();
});
listenWindow('beforeunload',(event)=>{if(allowConfirmedEditorExit||!hasUnsavedEditorChanges())return;event.preventDefault();event.returnValue='';});

$('#save').addEventListener('click', () => saveModel().catch((e) => setStatus(e.message, 'error')));
listenDocument('click',(event)=>{
  if(!(event.target instanceof Element))return;
  const binding=activeApplicationPackage?.actionBindings?.find((entry)=>event.target.closest(entry.selector));
  if(!binding)return;
  event.preventDefault();
  void applicationCommands.dispatch(binding.id).catch(error=>setStatus(error.message,'error'));
});

listenDocument('click',(event)=>{
  const dialog=applicationExtension('clearResults');if(!dialog)return;
  if(event.target.closest?.('#cancel-clear-results'))dialog.close('cancel');
  else if(event.target.closest?.('#confirm-clear-results'))dialog.close('clear');
  else if(event.target===dialog)dialog.close('cancel');
});
$('#stop-operation').addEventListener('click',()=>{void stopActiveOperation()});
$('#apply-settings').addEventListener('click', () => { try { if (!selectedPath || !hasSettingsDraft()) throw new Error('Select a model item in the tree first.');settingsDraftDirty=true;applyCurrentSettingsDraft({refresh:true});setStatus(`Applied typed settings for ${selectedLabel}.`, 'good'); } catch (e) { setStatus(`Could not apply settings: ${e.message}`, 'error'); } });



previewCanvas.addEventListener('pointerdown',(event)=>{hideGraphicsHoverTooltip();pointer={x:event.clientX,y:event.clientY};previewCanvas.setPointerCapture(event.pointerId)});
previewCanvas.addEventListener('pointermove',(event)=>{
  if(event.__fullmetaPlotHandled)return;
  if(!pointer){showGraphicsHoverTooltip(event);return}
  hideGraphicsHoverTooltip();
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
  const interactionDimension=activeScenarioDimension();
  if(interactionDimension===2){camera.panX+=dx;camera.panY+=dy}else{camera.yaw+=dx*.008;camera.pitch=Math.max(-1.3,Math.min(1.3,camera.pitch+dy*.008))}
  pointer={x:event.clientX,y:event.clientY};drawPreview();
});
previewCanvas.addEventListener('pointerleave',hideGraphicsHoverTooltip);
previewCanvas.addEventListener('pointerup',()=>{pointer=null}); previewCanvas.addEventListener('pointercancel',()=>{pointer=null});
previewCanvas.addEventListener('wheel',(event)=>{if(event.defaultPrevented)return;event.preventDefault();camera.zoom=Math.max(.35,Math.min(5,camera.zoom*Math.exp(-event.deltaY*.001)));drawPreview()},{passive:false});
observeResize(drawPreview).observe(previewCanvas);
observeResize(()=>{if(lastSweepRender&&!$('#results-view').hidden)drawSweepResult(lastSweepRender.action,lastSweepRender.entries,lastSweepRender.currentModel)}).observe($('#result-chart'));
initializeSettingsSurface();
syncModelActionAvailability();
const startupModel = initial.path;
const editorUrl = new URL(location.href);
{
  for(const key of [...editorUrl.searchParams.keys()])if(!['model','debug'].includes(key))editorUrl.searchParams.delete(key);
  if (editorUrl.href !== location.href) history.replaceState(null, '', editorUrl);
  try {
    restorePanelLayout();
    if(startupModel){
      const parts=startupModel.split('/'),name=parts.pop(),locationFolder=parts.join('/')||'.';
      if(!isModelDocumentFilename(name))throw new Error('Choose a model JSON file with File > Open.');
      await openModel(locationFolder,name,{discardConfirmed:true});
      if(startupAction==='create-project')await openNewModelDialog({fromSchema:true});
    }else{
      // No application or schema is selected until a model is opened.
      syncModelActionAvailability();
      setStatus('Choose File > Open or File > New to begin.');
    }
  } catch (error) {
    if(editorUrl.searchParams.get('debug')==='1')console.error('Editor startup failed:',error.stack||error.message);
    setStatus(error.message, 'error');
  }
}

const schemaDialogWorkflow=observeSchemaAuthoringDialogs({document,enabled:()=>activeApplicationPackage?.kind==='schemaDocument',onChange:updateModelEditState});







const editorCommands={
  'operation.execute':({id,input,operationContract})=>{const action=nativeOperationActions(controllerContext).find(action=>action.id===id);if(!action?.apiContract?.operationContract)throw new Error('Choose a declared native-operation application action.');const binding=action.apiContract.operationContract;const value=assertNativeOperationValue(binding,'input',input);return applicationCommands.dispatch(id,{input:value,...(operationContract?{operationContract}:{})});},
  ...createAdditionalEditorCommands(controllerContext),
  'field.change':args=>{const result=handleFieldCommand({...args,type:'field.change'});if(!result.valid)throw new Error(result.error);return result;},
  'field.optional':args=>handleFieldCommand({...args,type:'field.optional'}),
  'field.set':args=>{const path=args.path;if(!Array.isArray(path)||!path.length)throw new Error('Choose an absolute document field path.');const parent=path.slice(0,-1),owner=valueAt(parent);if(!owner||typeof owner!=='object')throw new Error('The parent of the requested field is unavailable.');if(!samePath(selectedPath,parent)){selectItem(String(parent.at(-1)||'Document settings'),parent,null);renderTree();if(!samePath(selectedPath,parent))throw new Error('The current draft prevented this field selection.');}const result=handleFieldCommand({...args,path:path.slice(parent.length),selectionPath:parent,type:'field.change'});if(!result.valid)throw new Error(result.error);return {...result,path,selectionPath:parent};},
  'widget.action':args=>handleFieldCommand({...args,type:'widget.action'}),
  'schema.batch.preview':async({rows,targetPath=[]})=>{const result=schemaWithAuthoringBatch(model,rows,{targetPath});validateBulkSchemaCandidate(result.document,{allowGeneratedSubtrees:result.allowGeneratedSubtrees});const staged=stageSchemaAuthoringRows(model,bulkSchemaAuthoringDialogDraft(model,targetPath),rows);await openSchemaAuthoringTool('bulk-schema-authoring',targetPath);bulkSchemaAuthoringDialog.updateDraft(structuredValueDraft(staged));return {...bulkSchemaAuthoringDialog.preview(),changes:result.changes};},
  'schema.batch.apply':()=>bulkSchemaAuthoringDialog.apply(),
  'authoring.validation.batch':args=>bulkValidationDialog.applyRuleBatch(args),
  'selection.overview':()=>{showModelOverview();return {path:selectedPath};},
  'selection.select':({path,label,nodeId})=>{const node=debugTreeNode(path,nodeId);if(node?.enabled===false||node?.readOnly)throw new Error('This tree item is unavailable for selection.');path=node?.path||path;if(!Array.isArray(path)||valueAt(path)===undefined)throw new Error('Choose an existing data path.');selectItem(label||node?.label||String(path.at(-1)||'Document settings'),path,null,node?.projection||null);renderTree();if(!samePath(path,selectedPath))throw new Error('The pending draft prevented this selection.');return {path:selectedPath,projection:selectedSchemaProjection};},
  'tree.toggle':({id,expanded})=>{reactTreeState=reduceTreeViewState(reactTreeState,{type:'toggle',id,expanded});renderTree();return reactTreeState;},
  'schema.openTool':async({id,path=[]})=>{await openSchemaAuthoringTool(id,path);return {id,path};},
  'validation.addRule':args=>bulkValidationDialog.addRule(args),
  'validation.updateRule':({id,patch})=>bulkValidationDialog.updateRule(id,patch),
  'validation.removeRule':({id})=>bulkValidationDialog.removeRule(id),
  'validation.preview':()=>bulkValidationDialog.preview(),
  'validation.apply':()=>bulkValidationDialog.apply(),
  'dialog.close':()=>{currentDebugDialog().close();return {closed:true};},
  'dialog.restoreControls':async({state})=>restoreEditorDialogState(currentDebugDialog(),state),
  'draft.apply':()=>{if(currentTab==='json')return applyFullJsonDraft();return applyCurrentSettingsDraft({refresh:true,announce:true});},
  'document.save':async()=>{await saveModel();return {saved:true,path:openedDocumentPath()};},
  'application.action':({id})=>applicationCommands.dispatch(id),
  'document.validate':async()=>{const binding=activeApplicationPackage?.actionBindings?.find(entry=>entry.selector==='#validate');if(!binding)throw new Error('The active application has no declared Validate command.');await applicationCommands.dispatch(binding.id);if(lastDocumentValidation?.error)throw new Error(lastDocumentValidation.summary);return lastDocumentValidation;},
  'document.open':async({path})=>{if(document.querySelector('dialog[open]'))throw new Error('Complete or cancel the visible dialog first.');if(typeof path!=='string'||path.split('/').some(part=>!part||part==='..'))throw new Error('Choose a canonical workspace document path.');const parts=path.split('/'),file=parts.pop();await openModel(parts.join('/')||'.',file,{force:true});return {path:openedDocumentPath()};},
  'operation.cancel':async()=>{if(!operationProgress.isBusy())throw new Error('There is no active operation to cancel.');await stopActiveOperation();return operationProgress.current();},
  'graphics.reset':()=>{resetPreviewCamera();drawPreview();return camera;},
};
commandSession=createHostCommandSession({read:snapshotEditor,inspect:inspectEditor,commands:editorCommands,interruptCommands:['operation.cancel'],versionOf:()=>({model,selectedPath,settingsDraft,treeRename,json:jsonDraftDirty?fullJson.value:null,fields:[...rawFieldDrafts],designers:[schemaAnnotationEditor?.snapshot?.(),schemaUiEditor?.snapshot?.(),schemaChoiceEditor?.snapshot?.(),schemaGraphicsEditor?.draft?.(),schemaGlobalUiEditor?.draft?.()],dialogs:[...document.querySelectorAll('dialog[open][data-authoring-tool]')].map(dialog=>({tool:dialog.dataset.authoringTool,state:schemaDialogControllers[dialog.dataset.authoringTool]?.snapshot?.()}))})});

initializeEditorDebug();
if(editorWatch){const replayResult=await editorWatch.restorePending().catch(error=>{editorDebugPanel?.status(error.message);return null;});if(replayResult)editorDebugPanel.showResult(replayResult);}
return Object.freeze({
  session:commandSession,
  openDocument: (folder,file)=>openModel(folder,file),
  save: ()=>saveModel(),
  hasUnsavedChanges: ()=>hasUnsavedEditorChanges(),
  webmcp:()=>editorWebMcp?.status(),
  dispose: ()=>{if(hasUnsavedEditorChanges())throw new Error('Save or discard editor changes before closing.');if(operationProgress.isBusy())throw new Error('Finish the active operation before closing.');schemaDialogWorkflow.dispose();editorDebugPanel?.dispose();disposeGraphicsViews(controllerContext);commandSession?.dispose();resources.dispose();applicationPanels.dispose();reactTreeMount?.dispose();settingsSurface?.dispose();graphicsControlSurface?.dispose();editorWatch?.dispose();editorDebugPanel?.dispose();if(window.fullmetaDebug===editorDebug)delete window.fullmetaDebug;lifetime.abort();resizeObservers.forEach(observer=>observer.disconnect());},
});
}
