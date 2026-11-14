/** Pure transport preflight for dialog-owned drafts. Domain validation remains Preview's job. */
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const fail = (path, message) => { throw new Error(`Invalid dialog private state at ${path}: ${message}`); };
const requireRecord = (value, path) => { if (!record(value)) fail(path, 'expected an object'); };
const requireArray = (value, path) => { if (!Array.isArray(value)) fail(path, 'expected an array'); };
const requireString = (value, path) => { if (typeof value !== 'string') fail(path, 'expected raw text'); };
const requireBoolean = (value, path) => { if (typeof value !== 'boolean') fail(path, 'expected a boolean'); };
const declaration = (value, path) => { if (typeof value !== 'boolean') requireRecord(value, path); };
const optional = (value, key, check, path) => { if (own(value, key)) check(value[key], `${path}.${key}`); };
const pathParts = (value, path) => { requireArray(value, path); value.forEach((part, index) => { if (typeof part !== 'string' && !(Number.isSafeInteger(part) && part >= 0)) fail(`${path}[${index}]`, 'expected a property name or array index'); }); };
const strings = (value, path) => { requireArray(value, path); value.forEach((item, index) => requireString(item, `${path}[${index}]`)); };
const pairs = (value, path) => { requireArray(value, path); value.forEach((pair, index) => { if (!Array.isArray(pair) || pair.length !== 2) fail(`${path}[${index}]`, 'expected a value and label pair'); pair.forEach((item, part) => requireString(item, `${path}[${index}][${part}]`)); }); };
const programKey = (value, path) => { if (value !== 'x-fullmeta-rules' && !(typeof value === 'string' && /^x-fullmeta-.+Validation$/.test(value))) fail(path, 'expected a validation program key'); };

const candidateTools = Object.freeze({
  'editor-widget': 'editorSelection', 'bulk-constraints': 'bulkConstraints',
  'bulk-schema-authoring': 'bulkSchemaAuthoring', 'nested-structure': 'nestedStructure',
  'bulk-edit-actions': 'bulkEditActions', 'bulk-references': 'bulkReferences',
  'bulk-contracts': 'rootContracts', 'tree-annotations': 'treeAnnotations',
  'runtime-routes': 'runtimeRoutes', 'root-constraints': 'rootConstraints',
  'object-rules': 'objectRules', 'conditional-definitions': 'conditionalDefinitions',
  'local-definitions': 'localDefinitions', 'definition-patches': 'definitionPatches',
  'generated-overlays': 'generatedOverlays', 'definition-worksheet': 'definitionWorksheet',
  'definition-refactor': 'definitionRefactor', 'copy-definitions': 'siblingDefinitionCopy',
});
const formatTools = Object.freeze({
  'fullmeta-bulk-annotation-state/1': 'bulk-annotations',
  'fullmeta-bulk-widget-state/1': 'bulk-widgets',
  'fullmeta-validation-table-state/1': 'bulk-validation',
  'fullmeta-bulk-validation-state/1': 'bulk-validation',
  'fullmeta-validation-recipe-table-state/1': 'rule-recipes',
  'fullmeta-schema-branch-audit-state/1': 'branch-audit',
  'fullmeta-schema-authoring-dialog-state/1': 'schema-authoring',
  'fullmeta-schema-structure-dialog-state/1': 'schema-structure',
});

function plainJson(value, path = '$', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || ![Object.prototype, null, Array.prototype].includes(Object.getPrototypeOf(value))) fail(path, 'expected finite, plain JSON data');
  if (ancestors.has(value)) fail(path, 'cyclic data is unsupported');
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) { if (!own(value, index)) fail(`${path}[${index}]`, 'array holes are unsupported'); plainJson(value[index], `${path}[${index}]`, ancestors); }
  } else for (const [key, item] of Object.entries(value)) plainJson(item, `${path}.${key}`, ancestors);
  ancestors.delete(value);
}

function structuredDraft(node, path) {
  requireRecord(node, path);
  if (own(node, 'ui')) { requireRecord(node.ui, `${path}.ui`); optional(node.ui, 'batchOpen', requireBoolean, `${path}.ui`); optional(node.ui, 'batchText', requireString, `${path}.ui`); optional(node.ui, 'batchError', requireString, `${path}.ui`); }
  optional(node, 'batchText', requireString, path); optional(node, 'batchPending', requireBoolean, path); optional(node, 'batchError', requireString, path);
  if (own(node, 'batchMode') && !['append', 'replace'].includes(node.batchMode)) fail(`${path}.batchMode`, 'expected append or replace');
  switch (node.type) {
    case 'null': break;
    case 'string': requireString(node.value, `${path}.value`); break;
    // Numeric text is deliberately not parsed: an incomplete number must survive replay.
    case 'number': if (typeof node.value !== 'string' && !(typeof node.value === 'number' && Number.isFinite(node.value))) fail(`${path}.value`, 'expected numeric raw text'); break;
    case 'boolean': requireBoolean(node.value, `${path}.value`); break;
    case 'array': requireArray(node.items, `${path}.items`); node.items.forEach((item, index) => structuredDraft(item, `${path}.items[${index}]`)); break;
    case 'object': requireArray(node.entries, `${path}.entries`); node.entries.forEach((entry, index) => { const at = `${path}.entries[${index}]`; requireRecord(entry, at); requireString(entry.key, `${at}.key`); optional(entry, 'pending', requireBoolean, at); structuredDraft(entry.value, `${at}.value`); }); break;
    default: fail(`${path}.type`, 'expected a structured draft type');
  }
}

function sourceStamp(value, source) {
  const candidates = [];
  if (own(value, 'source')) candidates.push(['$.source', value.source]);
  if (record(value.model) && own(value.model, 'source')) candidates.push(['$.model.source', value.model.source]);
  if (!candidates.length) fail('$.source', 'a document source stamp is required');
  const expected = JSON.stringify(source);
  for (const [path, actual] of candidates) if (!record(actual) || JSON.stringify(actual) !== expected) fail(path, 'belongs to a different source document');
}

function bulkEnvelope(model) {
  requireRecord(model, '$.model'); requireArray(model.rows, '$.model.rows');
  for (const key of ['worksheet', 'loadedText', 'status', 'previewText']) requireString(model[key], `$.model.${key}`);
  requireString(model.target, '$.model.target');
  if (model.preview !== null && !record(model.preview)) fail('$.model.preview', 'expected preview metadata or null');
}

function annotationModel(model) {
  bulkEnvelope(model); pathParts(model.targetPath, '$.model.targetPath'); requireArray(model.tables, '$.model.tables');
  model.tables.forEach((table, index) => { const path = `$.model.tables[${index}]`; requireRecord(table, path); pathParts(table.path, `${path}.path`); requireString(table.title, `${path}.title`); if (!Number.isSafeInteger(table.count) || table.count < 0) fail(`${path}.count`, 'expected a field count'); });
  const keys = new Set();
  model.rows.forEach((row, index) => {
    const path = `$.model.rows[${index}]`; requireRecord(row, path); requireString(row.key, `${path}.key`);
    if (keys.has(row.key)) fail(`${path}.key`, 'duplicate field row'); keys.add(row.key);
    declaration(row.declaration, `${path}.declaration`);
    for (const key of ['draft', 'original', 'quantity']) requireRecord(row[key], `${path}.${key}`);
    for (const key of ['draft', 'original']) {
      for (const fact of ['widget', 'choiceSource', 'unitGroup', 'defaultJson', 'referenceScope', 'referencePath', 'referenceLabel', 'filterProperty', 'filterValue', 'description']) requireString(row[key][fact], `${path}.${key}.${fact}`);
      requireBoolean(row[key].hidden, `${path}.${key}.hidden`); requireBoolean(row[key].complexFilter, `${path}.${key}.complexFilter`);
    }
    requireBoolean(row.quantity.enabled, `${path}.quantity.enabled`);
    for (const key of ['unit', 'description', 'lowerKind', 'lower', 'upperKind', 'upper']) requireString(row.quantity[key], `${path}.quantity.${key}`);
    strings(row.quantityChanged, `${path}.quantityChanged`);
    for (const key of ['generated', 'open', 'quantityOpen']) requireBoolean(row[key], `${path}.${key}`);
  });
}

function widgetModel(model) {
  bulkEnvelope(model); requireRecord(model.profiles, '$.model.profiles'); pairs(model.options, '$.model.options'); pairs(model.targets, '$.model.targets'); requireString(model.search, '$.model.search'); requireArray(model.proposals, '$.model.proposals');
  const ids = new Set();
  model.rows.forEach((row, index) => {
    const path = `$.model.rows[${index}]`; requireRecord(row, path); requireString(row.id, `${path}.id`);
    if (ids.has(row.id)) fail(`${path}.id`, 'duplicate widget row'); ids.add(row.id); pathParts(row.path, `${path}.path`);
    for (const key of ['original', 'prepared']) declaration(row[key], `${path}.${key}`);
    for (const key of ['type', 'summary', 'error']) requireString(row[key], `${path}.${key}`);
    for (const key of ['generated', 'open']) requireBoolean(row[key], `${path}.${key}`);
    if (row.editorDraft !== null) { requireRecord(row.editorDraft, `${path}.editorDraft`); if (own(row.editorDraft, 'type')) structuredDraft(row.editorDraft, `${path}.editorDraft`); }
  });
  model.proposals.forEach((proposal, index) => { const path = `$.model.proposals[${index}]`; requireRecord(proposal, path); requireString(proposal.id, `${path}.id`); if (!ids.has(proposal.id)) fail(`${path}.id`, 'proposal has no matching row'); pathParts(proposal.path, `${path}.path`); requireString(proposal.widget, `${path}.widget`); requireRecord(proposal.before, `${path}.before`); });
}

function recipeModel(model) {
  requireRecord(model, '$.model'); requireBoolean(model.open, '$.model.open'); requireBoolean(model.ready, '$.model.ready'); requireString(model.status, '$.model.status'); programKey(model.key, '$.model.key');
  requireArray(model.keys, '$.model.keys'); model.keys.forEach((key, index) => programKey(key, `$.model.keys[${index}]`));
  if (!model.keys.includes(model.key) || new Set(model.keys).size !== model.keys.length) fail('$.model.keys', 'selected program must occur once');
  requireArray(model.rows, '$.model.rows'); const indexes = new Set();
  model.rows.forEach((row, index) => { const path = `$.model.rows[${index}]`; requireRecord(row, path); if (row.index !== null && (!Number.isSafeInteger(row.index) || row.index < 0)) fail(`${path}.index`, 'expected an original rule index or null'); if (row.index !== null && indexes.has(row.index)) fail(`${path}.index`, 'duplicate original recipe'); indexes.add(row.index); structuredDraft(row.draft, `${path}.draft`); if (row.original !== null) requireString(row.original, `${path}.original`); requireBoolean(row.removed, `${path}.removed`); });
  if (model.candidate !== null) requireRecord(model.candidate, '$.model.candidate');
}

function providerStamp(value, expected) {
  requireRecord(value.provider, '$.provider');
  for (const key of ['applicationId', 'schemaPath']) requireString(value.provider[key], `$.provider.${key}`);
  if (expected && ['applicationId', 'schemaPath'].some(key => value.provider[key] !== expected[key])) fail('$.provider', 'belongs to a different application or schema');
}
function authoringTarget(value, path) {
  requireRecord(value, path); pathParts(value.itemPath, `${path}.itemPath`);
  if (value.schemaProjection !== undefined && value.schemaProjection !== null) requireRecord(value.schemaProjection, `${path}.schemaProjection`);
}
function structureTarget(value, path, nullablePath = false) {
  requireRecord(value, path);
  if (!nullablePath || value.path !== null) pathParts(value.path, `${path}.path`);
  requireString(value.label, `${path}.label`);
  if (value.projection !== null) requireRecord(value.projection, `${path}.projection`);
}
function pathExists(source, parts) {
  let current = source;
  for (const part of parts) {
    if (current === null || typeof current !== 'object' || !own(current, part)) return false;
    current = current[part];
  }
  return true;
}
const existingPath = (source, parts, path) => { if (!pathExists(source, parts)) fail(path, 'does not identify a value in the source document'); };

/** Validate before restoring any live controls; preserve invalid authoring text unchanged. */
export function validateDialogPrivateState(value, { source, toolId, controllerToolId, provider } = {}) {
  requireRecord(value, '$'); plainJson(value); requireString(value.format, '$.format'); sourceStamp(value, source);
  if (value.format === 'fullmeta-schema-candidate-dialog/1') {
    const expected = controllerToolId || candidateTools[toolId];
    if (!expected || value.toolId !== expected) fail('$.toolId', 'does not match the declared authoring tool');
    if (!record(value.context) && !Array.isArray(value.context)) fail('$.context', 'expected tool context data');
    structuredDraft(value.draft, '$.draft'); requireBoolean(value.open, '$.open'); requireBoolean(value.hadPreview, '$.hadPreview'); requireString(value.status, '$.status'); optional(value, 'error', requireString, '$');
    return value;
  }
  if (!formatTools[value.format] || formatTools[value.format] !== toolId) fail('$.format', 'does not match the declared authoring tool');
  switch (value.format) {
    case 'fullmeta-bulk-annotation-state/1': annotationModel(value.model); break;
    case 'fullmeta-bulk-widget-state/1': widgetModel(value.model); break;
    case 'fullmeta-validation-recipe-table-state/1': recipeModel(value.model); break;
    case 'fullmeta-schema-branch-audit-state/1': requireBoolean(value.open, '$.open'); break;
    case 'fullmeta-schema-authoring-dialog-state/1':
      providerStamp(value, provider); authoringTarget(value.target, '$.target'); authoringTarget(value.originalTarget, '$.originalTarget');
      existingPath(source, value.target.itemPath, '$.target.itemPath'); existingPath(source, value.originalTarget.itemPath, '$.originalTarget.itemPath');
      for (const key of ['operation', 'appliedTargetPath']) requireString(value[key], `$.${key}`);
      for (const key of ['fieldRowCount', 'kindRowCount']) if (!Number.isSafeInteger(value[key]) || value[key] < 0) fail(`$.${key}`, 'expected a nonnegative row count');
      requireBoolean(value.hadPreview, '$.hadPreview');
      if (value.projectDraft !== undefined && value.projectDraft !== null) structuredDraft(value.projectDraft, '$.projectDraft');
      break;
    case 'fullmeta-schema-structure-dialog-state/1':
      providerStamp(value, provider); requireRecord(value.snapshot, '$.snapshot'); requireRecord(value.snapshot.model, '$.snapshot.model');
      structureTarget(value.parent, '$.parent', true); pathParts(value.targetPath, '$.targetPath'); structureTarget(value.current, '$.current');
      requireArray(value.history, '$.history'); value.history.forEach((target, index) => structureTarget(target, `$.history[${index}]`));
      existingPath(source, value.current.path, '$.current.path');
      for (const [path, parts] of [['$.targetPath', value.targetPath], ...value.history.map((target, index) => [`$.history[${index}].path`, target.path]), ...(value.parent.path === null ? [] : [['$.parent.path', value.parent.path]])]) if (!pathExists(source, parts) && !pathExists(value.snapshot.model, parts)) fail(path, 'does not identify a value in the current or original source document');
      break;
    case 'fullmeta-validation-table-state/1':
      requireArray(value.programs, '$.programs'); programKey(value.activeKey, '$.activeKey'); requireRecord(value.primary, '$.primary');
      for (const key of ['open', 'hadPreview', 'nativeOpen']) requireBoolean(value[key], `$.${key}`);
      for (const key of ['batchAreas', 'stagedText']) strings(value[key], `$.${key}`);
      if (value.nativeDraft) structuredDraft(value.nativeDraft, '$.nativeDraft');
      if (value.recipe?.draft) structuredDraft(value.recipe.draft, '$.recipe.draft');
      break;
    case 'fullmeta-bulk-validation-state/1':
      requireRecord(value.model, '$.model'); requireArray(value.model.rows, '$.model.rows'); programKey(value.model.program, '$.model.program'); strings(value.model.programs, '$.model.programs');
      value.model.rows.forEach((row, index) => { const path = `$.model.rows[${index}]`; requireRecord(row, path); if (!Number.isSafeInteger(row.id) || row.id <= 0) fail(`${path}.id`, 'expected a positive row id'); for (const key of ['source', 'path', 'alias', 'assertion', 'message', 'when']) requireString(row[key], `${path}.${key}`); });
      break;
  }
  return value;
}
