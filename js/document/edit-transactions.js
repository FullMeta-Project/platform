import { modelTransaction, validateModelSchema, validatedModelTransaction } from "../../model-rust/js/api.js";

const cloneModel = (model) => JSON.parse(JSON.stringify(model));

/** Rename a definition symbol and every schema-declared use through the model WASM. */
export function modelWithRenamedDefinitionSymbol(model, collection, index, nextSymbol) {
  const collectionPath = Array.isArray(collection) ? collection : ["model", collection];
  return validatedModelTransaction("rename_symbol", model, { path: [...collectionPath, index, "symbol"], nextSymbol });
}
/** Capture an immutable-by-convention request snapshot for an asynchronous model save. */
export function createModelSaveSnapshot(model) {
  const snapshot = cloneModel(model);
  return { model: snapshot, serialized: JSON.stringify(snapshot) };
}

/**
 * Apply one settings-panel item to a cloned model, preserve linked JSON references,
 * and reject the transaction if it would make the model invalid.
 */
export function modelWithSettingsItem(model, itemPath, item) {
  return validatedModelTransaction("set_item", model, { path: itemPath, item });
}

/** Apply a settings-tree edit as a draft and leave validation to the Validate action. */
export function modelWithSettingsItemDraft(model, itemPath, item) {
  return modelTransaction("set_item", model, { path: itemPath, item });
}

/** Apply a settings draft while enforcing JSON shape and deferring semantic checks. */
export function modelWithSchemaValidSettingsItem(model, itemPath, item) {
  const candidate = modelTransaction("set_item", model, { path: itemPath, item });
  const errors = validateModelSchema(candidate);
  if (errors.length) {
    const error = new Error(errors[0]);
    error.validationErrors = errors;
    throw error;
  }
  return candidate;
}

/** Clone a model-tree item with new owned IDs and a unique editable name. */
export function cloneModelItemWithUniqueIds(model, source, arrayPath) {
  return modelTransaction("clone_item", model, { source, arrayPath });
}

/**
 * Insert an item, apply its declarative model link updates, and validate the
 * completed candidate in one model-WASM transaction.
 */
export function modelWithArrayItem(model, arrayPath, item, index) {
  return validatedModelTransaction("insert_item", model, { arrayPath, item, ...(index === undefined ? {} : { index }) });
}

/** Insert a tree item without validating the whole model draft. */
export function modelWithArrayItemDraft(model, arrayPath, item, index) {
  return modelTransaction("insert_item", model, { arrayPath, item, ...(index === undefined ? {} : { index }) });
}

/** Insert an editable draft while enforcing JSON shape but deferring semantic checks. */
export function modelWithSchemaValidArrayItem(model, arrayPath, item, index) {
  const candidate = modelTransaction("insert_item", model, { arrayPath, item, ...(index === undefined ? {} : { index }) });
  const errors = validateModelSchema(candidate);
  if (errors.length) {
    const error = new Error(errors[0]);
    error.validationErrors = errors;
    throw error;
  }
  return candidate;
}

/**
 * Remove a tree item from a cloned model and clear references owned by the
 * editor that can be safely maintained as part of the same JSON edit.
 * Remaining required references are checked by the caller's model validator.
 */
export function modelAfterTreeDeletion(model, itemPath) {
  return modelTransaction("remove_item", model, { path: itemPath });
}

/** Identify validation issues introduced by deleting one tree item. */
export function modelDeletionBlockers(model, itemPath) {
  return modelTransaction("deletion_blockers", model, { path: itemPath });
}

/** Move an item using the schema's scope and reference policies. */
export function modelWithSchemaValidItemMove(model, sourcePath, destinationPath, index) {
  const candidate = modelTransaction("move_item", model, { sourcePath, destinationPath, index });
  const errors = validateModelSchema(candidate);
  if (errors.length) {
    const error = new Error(errors[0]);
    error.validationErrors = errors;
    throw error;
  }
  return candidate;
}

/** Move one item into an incomplete tree draft; Validate checks the completed group. */
export function modelWithItemMoveDraft(model, sourcePath, destinationPath, index) {
  return modelTransaction("move_item", model, { sourcePath, destinationPath, index });
}
