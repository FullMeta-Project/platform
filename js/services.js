/** Browser-safe document services exposed to editor widgets. Node-only server helpers stay separate. */
export { jsonPointerFromPath, jsonPointerPath } from "./schema-document.js";
export { loadSchemaDocuments, loadWorkspaceJson } from "./schema-document-loader.js";
export { applicationModuleUrl, loadApplicationCatalog } from "./application-catalog.js";
export { cloneModelItemWithUniqueIds, createModelSaveSnapshot, modelAfterTreeDeletion, modelWithArrayItemDraft, modelWithRenamedDefinitionSymbol, modelWithSchemaValidSettingsItem, modelWithSettingsItem, modelWithSettingsItemDraft } from "./model-edit-transactions.js";
export { loadApplicationPackage } from "./application-packages.js";
export { insertionIndexForModelArray, uniqueArrayName, uniqueModelId } from "./model-item-operations.js";
export { createEditorDebugController, installEditorWatch, editorDebugContract } from './editor-debug.js';
export { mountEditorDebugPanel } from './editor-debug-panel.js';
export { nativeOperationFormat, nativeOperationsDigest, nativeOperationChoices, normalizeNativeOperationBinding, resolveNativeOperation, nativeOperationSchema, nativeOperationToolInputSchema,
  validateNativeOperationInput, validateNativeOperationResult, validateNativeOperationEvent, assertNativeOperationValue, normalizeNativeApiContract, nativeOperationActionContract, createNativeOperationTools } from './runtime/native-operations.js';
