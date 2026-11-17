// Generated from widget.jsx by scripts/build-frontend.mjs.
import { resolveDeclaredSettings } from "./declared-settings-resolver.js";
import { editorWidgetNames, renderSchemaStructure } from "./schema-form.js";
import { SchemaField, SchemaObject, SchemaStructure, SettingRow } from "./schema-form.js";
import { schemaItemTemplateFactory } from "./schema-project-initializer.js";
import { createSchemaDocumentPackage } from "./schema-document-package.js";
import { createSchemaProjectPackage } from "./schema-project-package.js";
import { declaredSchemaAuthoringTools } from "./schema-authoring-tools.js";
import { schemaWithValidationRuleDrafts } from "./schema-bulk-validation.js";
import { schemaWithValidationRuleRecipes } from "./schema-rule-recipes.js";
import { createBulkSchemaAuthoringDialog, schemaAuthoringRowsFromText, schemaWithAuthoringBatch } from "./schema-bulk-schema-authoring.js";
import { modelEditorAvailability } from "./model-editor-availability.js";
import { compareEditorRuntime, describeEditorRuntimeMismatches } from "./model-editor-compatibility.js";
import {
  captureEditorDialogState,
  validateEditorDialogState,
  restoreEditorDialogState,
  captureEditorPanelState,
  restoreEditorPanelState,
  validateEditorWorkspaceState,
  captureEditorFocus,
  restoreEditorFocus,
  inspectEditorSurface
} from "./editor-state.js";
import { loadSchemaDocumentInterpreter } from "./schema-document-interpreter.js";
import { createApplicationPanelLifecycle } from "./application-panel-lifecycle.js";
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { EditorLayout } from "./layout.js";
const Widget = EditorLayout;
const mountedDocuments = /* @__PURE__ */ new WeakMap();
const styles = ["../../../fullmeta.css", "./widget.css", "./schema-root-contracts.css", "./schema-tree-annotations.css", "./schema-bulk-edit-actions.css", "./schema-rule-recipes.css", "./schema-bulk-validation.css", "./schema-bulk-schema-authoring.css", "../shared/schema-authoring-path-picker.css", "./schema-root-constraints.css", "./schema-object-rules.css", "./schema-conditional-definitions.css", "./schema-local-definitions.css", "./schema-definition-patches.css", "./schema-generated-overlays.css", "./schema-definition-worksheet.css", "./schema-definition-refactor.css", "./schema-sibling-definition-copy.css", "../json-choice-table/widget.css", "../scan/widget.css", "../scan-table/widget.css", "../quantity/widget.css", "../validation-program/widget.css", "../shared/react/surfaces.css", "../validation-program/declarative-editor.css", "./editor-debug.css", "./layout.css", "../../workspace/file-picker.css", "../../workspace/standard-menus.css"];
async function mountEditor(container, context) {
  if (!(container instanceof Element)) throw new Error("An editor container is required.");
  const document = container.ownerDocument;
  if (mountedDocuments.has(document)) throw new Error("This page already contains a model editor.");
  if (!context?.services?.resolveEditor || !context.services.loadApplicationPackage) throw new Error("The editor needs document services from its host.");
  mountedDocuments.set(document, container);
  const links = [], dialogs = /* @__PURE__ */ new Set();
  let observer, instance, layout;
  const cleanup = () => {
    observer?.disconnect();
    dialogs.forEach((node) => node.remove());
    links.forEach((link) => link.remove());
    layout?.dispose();
    container.replaceChildren();
    container.classList.remove("fullmeta-model-editor");
    mountedDocuments.delete(document);
  };
  try {
    await Promise.all(styles.map((path) => new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = new URL(path, import.meta.url).href;
      link.onload = resolve;
      link.onerror = () => reject(new Error("Could not load editor stylesheet " + path));
      links.push(link);
      document.head.append(link);
    })));
    container.classList.add("fullmeta-model-editor");
    layout = mountReactComponent(container, EditorLayout, {});
    observer = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node instanceof Element && node.tagName === "DIALOG") dialogs.add(node);
    })));
    observer.observe(document.body, { childList: true });
    const { mountModelEditorRuntime } = await import("./runtime.js");
    instance = await mountModelEditorRuntime(container, context);
    return Object.freeze({ ...instance, dispose() {
      instance.dispose();
      cleanup();
    } });
  } catch (error) {
    cleanup();
    throw error;
  }
}
import { createEditorWidgetDialog } from "./editor-selection-dialog.js";
import { createCandidateDialog, SchemaCandidateDialog, CandidateField, CandidateRows, draftProperty, withDraftProperty } from "./candidate-dialog.js";
import { createController } from "./controllers/settings-controller.js";
import { createController as createController2 } from "./controllers/tree-controller.js";
import { createController as createController3 } from "./controllers/document-controller.js";
import { createController as createController4 } from "./controllers/workspace-controller.js";
import { validateDialogPrivateState } from "./dialog-private-state.js";
import { createAdditionalEditorCommands, describeAdditionalEditorCommands, inspectAdditionalEditorAvailability } from "./controllers/command-adapters.js";
import { createBulkAnnotationDialog } from "./schema-bulk-authoring.js";
import { createBulkWidgetSettingsDialog } from "./schema-bulk-widgets.js";
import { schemaWithRootConstraints } from "./schema-root-constraints.js";
import { createRootConstraintsDialog } from "./schema-root-constraints.js";
import { schemaWithObjectRules } from "./schema-object-rules.js";
import { createObjectRulesDialog } from "./schema-object-rules.js";
import { schemaWithConditionalDefinitions } from "./schema-conditional-definitions.js";
import { createConditionalDefinitionsDialog } from "./schema-conditional-definitions.js";
import { schemaWithDefinitionPatches } from "./schema-definition-patches.js";
import { createDefinitionPatchesDialog } from "./schema-definition-patches.js";
import { schemaWithDefinitionRows } from "./schema-definition-worksheet.js";
import { createDefinitionWorksheetDialog } from "./schema-definition-worksheet.js";
import { createBulkRootContractsDialog } from "./schema-root-contracts.js";
import { createLocalDefinitionsDialog } from "./schema-local-definitions.js";
import { createDefinitionRefactorDialog } from "./schema-definition-refactor.js";
import { createGeneratedFieldOverlaysDialog } from "./schema-generated-overlays.js";
import { createSiblingDefinitionCopyDialog } from "./schema-sibling-definition-copy.js";
import { createSchemaTreeAnnotationsDialog } from "./schema-tree-annotations.js";
import { createSchemaBranchAuditDialog } from "./schema-branch-audit.js";
import { createNestedStructureDialog } from "./schema-nested-structure.js";
import { createRuntimeRouteDialog } from "./schema-runtime-route-authoring.js";
import { schemaWithLocalDefinitions } from "./schema-local-definitions.js";
import { schemaWithFactoredDefinition, parseSchemaPointer } from "./schema-definition-refactor.js";
import { schemaWithGeneratedFieldOverlays } from "./schema-generated-overlays.js";
import { schemaWithSiblingDefinitionCopies, siblingDefinitionOwners } from "./schema-sibling-definition-copy.js";
import { schemaWithTreeAnnotationEdits, schemaTreeAnnotationEditPaths, schemaTreeAnnotationNodes } from "./schema-tree-annotations.js";
import { runtimeRouteFromDraft, schemaWithRuntimeRoutes } from "./schema-runtime-route-authoring.js";
import { nestedStructureTargets } from "./schema-nested-structure.js";
import { rootContractImportPath } from "./schema-root-contracts.js";
import { ProjectIntegrationForm, renderProjectIntegrationForm, projectIntegrationFormInput, projectIntegrationInputValue } from "./schema-project-integration-form.js";
import { BulkReferencesEditor, bulkReferenceDialogDraft, bulkReferenceDialogCandidate, createBulkReferenceDialog, schemaWithBulkReferences } from "./schema-bulk-references.js";
import { BulkEditActionsEditor, InsertionEffectEditor, bulkEditActionsDialogDraft, bulkEditActionsDialogCandidate, createBulkEditActionsDialog, schemaWithBulkEditActions } from "./schema-bulk-edit-actions.js";
import { BulkFieldConstraintsEditor, FieldConstraintRow, constraintCrossSelection, bulkFieldConstraintsDialogDraft, bulkFieldConstraintsDialogCandidate, createBulkFieldConstraintsDialog, fieldConstraintDraft, schemaWithBulkFieldConstraints } from "./schema-bulk-constraints.js";
import { BulkSchemaAuthoringEditor, bulkSchemaAuthoringDialogDraft, stageSchemaAuthoringRows, bulkSchemaAuthoringDialogCandidate } from "./schema-bulk-schema-authoring.js";
export {
  BulkEditActionsEditor,
  BulkFieldConstraintsEditor,
  BulkReferencesEditor,
  BulkSchemaAuthoringEditor,
  CandidateField,
  CandidateRows,
  FieldConstraintRow,
  InsertionEffectEditor,
  ProjectIntegrationForm,
  SchemaCandidateDialog,
  SchemaField,
  SchemaObject,
  SchemaStructure,
  SettingRow,
  Widget,
  bulkEditActionsDialogCandidate,
  bulkEditActionsDialogDraft,
  bulkFieldConstraintsDialogCandidate,
  bulkFieldConstraintsDialogDraft,
  bulkReferenceDialogCandidate,
  bulkReferenceDialogDraft,
  bulkSchemaAuthoringDialogCandidate,
  bulkSchemaAuthoringDialogDraft,
  captureEditorDialogState,
  captureEditorFocus,
  captureEditorPanelState,
  compareEditorRuntime,
  constraintCrossSelection,
  createAdditionalEditorCommands,
  createApplicationPanelLifecycle,
  createBulkAnnotationDialog,
  createBulkEditActionsDialog,
  createBulkFieldConstraintsDialog,
  createBulkReferenceDialog,
  createBulkRootContractsDialog,
  createBulkSchemaAuthoringDialog,
  createBulkWidgetSettingsDialog,
  createCandidateDialog,
  createConditionalDefinitionsDialog,
  createDefinitionPatchesDialog,
  createDefinitionRefactorDialog,
  createDefinitionWorksheetDialog,
  createController3 as createDocumentController,
  createEditorWidgetDialog,
  createGeneratedFieldOverlaysDialog,
  createLocalDefinitionsDialog,
  createNestedStructureDialog,
  createObjectRulesDialog,
  createRootConstraintsDialog,
  createRuntimeRouteDialog,
  createSchemaBranchAuditDialog,
  createSchemaDocumentPackage,
  createSchemaProjectPackage,
  createSchemaTreeAnnotationsDialog,
  createController as createSettingsController,
  createSiblingDefinitionCopyDialog,
  createController2 as createTreeController,
  createController4 as createWorkspaceController,
  declaredSchemaAuthoringTools,
  describeAdditionalEditorCommands,
  describeEditorRuntimeMismatches,
  draftProperty,
  editorWidgetNames,
  fieldConstraintDraft,
  inspectAdditionalEditorAvailability,
  inspectEditorSurface,
  loadSchemaDocumentInterpreter,
  modelEditorAvailability,
  mountEditor,
  nestedStructureTargets,
  parseSchemaPointer,
  projectIntegrationFormInput,
  projectIntegrationInputValue,
  renderProjectIntegrationForm,
  renderSchemaStructure,
  resolveDeclaredSettings,
  restoreEditorDialogState,
  restoreEditorFocus,
  restoreEditorPanelState,
  rootContractImportPath,
  runtimeRouteFromDraft,
  schemaAuthoringRowsFromText,
  schemaItemTemplateFactory,
  schemaTreeAnnotationEditPaths,
  schemaTreeAnnotationNodes,
  schemaWithAuthoringBatch,
  schemaWithBulkEditActions,
  schemaWithBulkFieldConstraints,
  schemaWithBulkReferences,
  schemaWithConditionalDefinitions,
  schemaWithDefinitionPatches,
  schemaWithDefinitionRows,
  schemaWithFactoredDefinition,
  schemaWithGeneratedFieldOverlays,
  schemaWithLocalDefinitions,
  schemaWithObjectRules,
  schemaWithRootConstraints,
  schemaWithRuntimeRoutes,
  schemaWithSiblingDefinitionCopies,
  schemaWithTreeAnnotationEdits,
  schemaWithValidationRuleDrafts,
  schemaWithValidationRuleRecipes,
  siblingDefinitionOwners,
  stageSchemaAuthoringRows,
  validateDialogPrivateState,
  validateEditorDialogState,
  validateEditorWorkspaceState,
  withDraftProperty
};

//# sourceMappingURL=widget.js.map
