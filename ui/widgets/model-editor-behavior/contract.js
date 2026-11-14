/** Schema-owned selection and action bindings for the model editor host. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isPath = value => Array.isArray(value) && value.length > 0
  && value.every(part => (typeof part === 'string' && part.length > 0) || Number.isInteger(part));

export function modelEditorUiIssues(declaration) {
  const issues = [];
  if (!isObject(declaration) || declaration.schema !== 'fullmeta-model-editor-ui/1') {
    return ['Model Editor UI must declare fullmeta-model-editor-ui/1.'];
  }
  if (declaration.newModel !== undefined && (!isObject(declaration.newModel)
    || !(typeof declaration.newModel.api === 'string' && declaration.newModel.api
      || /^\/api\/[A-Za-z0-9/_-]+$/.test(declaration.newModel.endpoint || ''))
    || typeof declaration.newModel.description !== 'string'
    || (declaration.newModel.choiceLabel !== undefined && typeof declaration.newModel.choiceLabel !== 'string')
    || (declaration.newModel.choiceRequestKey !== undefined && !/^[A-Za-z][A-Za-z0-9]*$/.test(declaration.newModel.choiceRequestKey)))) {
    issues.push('Model Editor UI New-model action needs a registered API name or local endpoint.');
  }
  if (declaration.layout !== undefined && (!isObject(declaration.layout)
    || Object.keys(declaration.layout).some(key => key !== 'defaultLayout')
    || (declaration.layout.defaultLayout !== undefined && !['stacked', 'columns'].includes(declaration.layout.defaultLayout)))) {
    issues.push('Model Editor UI layout.defaultLayout must be stacked or columns.');
  }
  if (declaration.scenario !== undefined) {
    const scenario = declaration.scenario;
    if (!isObject(scenario) || !isPath(scenario.profileIdPath) || !isPath(scenario.dimensionPath)
      || ['profileIdProperty', 'profileLabelProperty', 'profileDimensionProperty', 'profileStatusProperty', 'availableStatus', 'defaultProfileId']
        .some(key => scenario[key] !== undefined && (typeof scenario[key] !== 'string' || !scenario[key]))) {
      issues.push('Model Editor UI scenario needs profile ID and dimension paths.');
    }
  }
  for (const key of ['unitChoicesPath']) {
    if (declaration[key] !== undefined && !isPath(declaration[key])) issues.push(`Model Editor UI ${key} must be a path.`);
  }
  if (declaration.actionCatalogs !== undefined && (!isObject(declaration.actionCatalogs)
    || Object.values(declaration.actionCatalogs).some(path => !isPath(path)))) {
    issues.push('Model Editor UI action catalogs must contain paths.');
  }
  if (declaration.preferredSweepUnits !== undefined && (!Array.isArray(declaration.preferredSweepUnits)
    || declaration.preferredSweepUnits.some(unit => typeof unit !== 'string' || !unit))) {
    issues.push('Model Editor UI preferred sweep units must be strings.');
  }
  if (declaration.unitChoicesByGroup !== undefined && (!isObject(declaration.unitChoicesByGroup)
    || Object.values(declaration.unitChoicesByGroup).some(path => !isPath(path)))) {
    issues.push('Model Editor UI unit choice groups must contain profile paths.');
  }
  if (declaration.emptyState !== undefined && (!isObject(declaration.emptyState)
    || Object.values(declaration.emptyState).some(value => typeof value !== 'string'))) {
    issues.push('Model Editor UI empty-state text must contain strings.');
  }
  if (declaration.projectArtifactLabels !== undefined && (!isObject(declaration.projectArtifactLabels)
    || Object.values(declaration.projectArtifactLabels).some(label => !isObject(label)
      || !(typeof label.label === 'string' || (typeof label.countProperty === 'string'
        && typeof label.singular === 'string' && typeof label.plural === 'string'))))) {
    issues.push('Model Editor UI artifact labels need text or a count property and singular/plural text.');
  }
  if (declaration.fieldSummary !== undefined && (!isObject(declaration.fieldSummary)
    || Object.values(declaration.fieldSummary).some(value => typeof value !== 'string'))) {
    issues.push('Model Editor UI field summary text must contain strings.');
  }
  if (declaration.previewCopy !== undefined && (!isObject(declaration.previewCopy)
    || Object.values(declaration.previewCopy).some(value => typeof value !== 'string'))) {
    issues.push('Model Editor UI preview text must contain strings.');
  }
  if (declaration.controlCopy !== undefined && (!isObject(declaration.controlCopy)
    || Object.values(declaration.controlCopy).some(value => typeof value !== 'string'))) {
    issues.push('Model Editor UI control text must contain strings.');
  }
  if (declaration.insertionCopy !== undefined && (!isObject(declaration.insertionCopy)
    || Object.values(declaration.insertionCopy).some(value => typeof value !== 'string'))) {
    issues.push('Model Editor UI insertion text must contain strings.');
  }
  if (declaration.fieldSettingsCopy !== undefined && (!isObject(declaration.fieldSettingsCopy)
    || Object.values(declaration.fieldSettingsCopy).some(value => typeof value !== 'string'))) {
    issues.push('Model Editor UI field settings text must contain strings.');
  }
  if (declaration.workflowCopy !== undefined && (!isObject(declaration.workflowCopy)
    || Object.values(declaration.workflowCopy).some(value => typeof value !== 'string'))) {
    issues.push('Model Editor UI workflow text must contain strings.');
  }
  if (declaration.definitionCollections !== undefined && (!isObject(declaration.definitionCollections)
    || Object.values(declaration.definitionCollections).some(collection => !isObject(collection)
      || ['tableLabel', 'emptyLabel', 'addLabel', 'symbolRole'].some(key => typeof collection[key] !== 'string')))) {
    issues.push('Model Editor UI definition collections need table text and a symbol role.');
  }
  if (declaration.confirmations !== undefined && (!isObject(declaration.confirmations)
    || Object.values(declaration.confirmations).some(copy => !isObject(copy)
      || ['title', 'description', 'confirmLabel'].some(key => typeof copy[key] !== 'string')))) {
    issues.push('Model Editor UI confirmations need title, description, and confirm label.');
  }
  if (!isObject(declaration.roles)) issues.push('Model Editor UI roles must be an object.');
  else for (const [role, path] of Object.entries(declaration.roles)) {
    if (!role || !isPath(path)) issues.push(`Model Editor UI role ${role || '(empty)'} needs a nonempty path.`);
  }
  for (const [name, collection] of Object.entries(declaration.definitionCollections || {})) {
    if (!Object.hasOwn(declaration.roles || {}, collection.symbolRole)) issues.push(`Definition collection ${name} names an unknown symbol role.`);
  }
  if (declaration.componentPath !== undefined && !isPath(declaration.componentPath)) issues.push('Model Editor UI component path must be a nonempty path.');
  if (declaration.geometryFeatureCollectionKey !== undefined && (typeof declaration.geometryFeatureCollectionKey !== 'string' || !declaration.geometryFeatureCollectionKey)) issues.push('Model Editor UI geometry feature collection key must be a nonempty string.');
  if (declaration.geometryGroupTypes !== undefined && (!Array.isArray(declaration.geometryGroupTypes) || declaration.geometryGroupTypes.some(type => typeof type !== 'string' || !type))) issues.push('Model Editor UI geometry group types must be strings.');
  if (declaration.defaultSelectionEntity !== undefined && (typeof declaration.defaultSelectionEntity !== 'string' || !declaration.defaultSelectionEntity)) issues.push('Model Editor UI default selection entity must be a nonempty string.');
  if (declaration.selectionNames !== undefined && (!isObject(declaration.selectionNames) || Object.values(declaration.selectionNames).some(labels => !isObject(labels) || Object.values(labels).some(label => typeof label !== 'string')))) issues.push('Model Editor UI selection names must contain strings.');
  if (declaration.graphicsComponentId !== undefined && (typeof declaration.graphicsComponentId !== 'string' || !declaration.graphicsComponentId)) {
    issues.push('Model Editor UI graphics component ID must be a nonempty string.');
  }
  if (declaration.previewLayerRole !== undefined && (typeof declaration.previewLayerRole !== 'string' || !declaration.previewLayerRole)) {
    issues.push('Model Editor UI preview layer role must be a nonempty string.');
  }
  for (const key of ['componentRoles', 'toggleEnabledRoles', 'previewPrerequisites', 'previewInvalidationRoles', 'previewCollectionInvalidationRoles']) {
    if (declaration[key] !== undefined && (!Array.isArray(declaration[key])
      || declaration[key].some(role => typeof role !== 'string' || !Object.hasOwn(declaration.roles || {}, role)))) {
      issues.push(`Model Editor UI ${key} must name declared roles.`);
    }
  }
  const validWhen = (when, label, requirePath = false) => {
    if (!isObject(when) || (requirePath && !isPath(when.path))) {
      issues.push(`${label} needs a selection path.`); return;
    }
    if (when.path !== undefined && !isPath(when.path)) issues.push(`${label} has an invalid path.`);
    if (when.role !== undefined && !Object.hasOwn(declaration.roles || {}, when.role)) issues.push(`${label} names an unknown role.`);
    if (when.depth !== undefined && (!Number.isInteger(when.depth) || when.depth < 0)) issues.push(`${label} has an invalid depth.`);
    if (when.arrayProperty !== undefined && (typeof when.arrayProperty !== 'string' || !when.arrayProperty)) issues.push(`${label} has an invalid array property.`);
    if (when.capability !== undefined && (!isObject(when.capability)
      || !isPath(when.capability.path)
      || (when.capability.keyFromModel !== undefined && !isPath(when.capability.keyFromModel))
      || (when.capability.exists !== undefined && typeof when.capability.exists !== 'boolean')
      || (when.capability.exists === undefined && !Object.hasOwn(when.capability, 'equals')))) {
      issues.push(`${label} has an invalid capability condition.`);
    }
    for (const field of ['types', 'kinds']) if (when[field] !== undefined
      && (!Array.isArray(when[field]) || when[field].some(item => typeof item !== 'string' || !item))) {
      issues.push(`${label} has invalid ${field}.`);
    }
  };
  if (!Array.isArray(declaration.panels)) issues.push('Model Editor UI panels must be an array.');
  else declaration.panels.forEach((panel, index) => {
    if (!isObject(panel) || typeof panel.selector !== 'string' || !panel.selector) issues.push(`Panel ${index} needs a selector.`);
    validWhen(panel?.when, `Panel ${index}`, true);
  });
  if (declaration.notes !== undefined) {
    if (!Array.isArray(declaration.notes)) issues.push('Model Editor UI notes must be an array.');
    else declaration.notes.forEach((note, index) => {
      if (!['selection', 'settings'].includes(note?.placement)) issues.push(`Note ${index} has an invalid placement.`);
      if (typeof note?.text !== 'string' && typeof note?.profileCopy !== 'string') issues.push(`Note ${index} needs text or a profile copy key.`);
      validWhen(note?.when, `Note ${index}`);
    });
  }
  if (declaration.titles !== undefined) {
    if (!Array.isArray(declaration.titles)) issues.push('Model Editor UI titles must be an array.');
    else declaration.titles.forEach((title, index) => {
      if (typeof title?.text !== 'string' || !title.text) issues.push(`Title ${index} needs text.`);
      validWhen(title?.when, `Title ${index}`);
    });
  }
  return issues;
}

export function modelEditorPathMatches(pattern, path, { prefix = false } = {}) {
  if (!Array.isArray(pattern) || !Array.isArray(path)) return false;
  if (prefix ? pattern.length > path.length : pattern.length !== path.length) return false;
  return pattern.every((part, index) => part === '*' || String(part) === String(path[index]));
}

export function modelEditorSelectionHasRole(declaration, role, path) {
  const pattern = declaration?.roles?.[role];
  return modelEditorPathMatches(pattern, path, { prefix: true });
}

export function modelEditorSelectionMatches(when, path, value) {
  if (!when) return true;
  if (!modelEditorPathMatches(when.path, path, { prefix: Boolean(when.prefix) })) return false;
  if (when.types?.length && !when.types.includes(value?.type)) return false;
  return true;
}

export function modelEditorActionBindings(declaration, interfaces) {
  const actions = interfaces?.actions || {};
  return Object.entries(actions).filter(([, action]) => action?.ui?.selector).map(([id, action]) => ({
    id,
    label: action.label || id,
    selector: action.ui.selector,
    execution: action.execution || null,
    when: action.ui.when || null,
    placement: action.ui.placement || null,
    tone: action.ui.tone || null,
    order: Number.isFinite(action.ui.order) ? action.ui.order : 0,
  }));
}

export function modelEditorSelectionPanels(declaration, path, value) {
  return (declaration?.panels || []).filter(panel => modelEditorSelectionMatches(panel.when, path, value));
}

function valueAtPath(root, path) {
  return path?.reduce((current, part) => current?.[part], root);
}

export function modelEditorUnitChoices(declaration, schema, unitSchema, uiProfile, defaultUnits) {
  const group = legacyFieldUiView(schema)?.['x-fullmeta-ui-quantity']?.unitGroup;
  const path = declaration?.unitChoicesByGroup?.[group];
  const choices = valueAtPath(uiProfile, path);
  if (path) return Array.isArray(choices) ? choices : [];
  return Array.isArray(unitSchema?.enum) ? unitSchema.enum : defaultUnits;
}

export function modelEditorScenarioId(declaration, model) {
  return valueAtPath(model, declaration?.scenario?.profileIdPath) || null;
}

export function modelEditorScenario(declaration, profiles, model, fallback = null) {
  const id = modelEditorScenarioId(declaration, model);
  const idProperty = declaration?.scenario?.profileIdProperty || 'id';
  return id ? (profiles || []).find(profile => profile?.[idProperty] === id) || fallback : fallback;
}

export function modelEditorScenarioDimension(declaration, profiles, model, fallback = null) {
  const dimension = valueAtPath(model, declaration?.scenario?.dimensionPath);
  const profileDimensionProperty = declaration?.scenario?.profileDimensionProperty || 'dimension';
  return dimension || modelEditorScenario(declaration, profiles, model)?.[profileDimensionProperty]
    || fallback?.[profileDimensionProperty] || declaration?.defaultDimension || null;
}

export function modelEditorNewModelChoices(declaration, profiles) {
  const config = declaration?.scenario;
  if (!config) return [];
  const idProperty = config.profileIdProperty || 'id';
  const labelProperty = config.profileLabelProperty || 'name';
  const statusProperty = config.profileStatusProperty || 'status';
  return (profiles || []).filter(profile => !config.availableStatus || profile?.[statusProperty] === config.availableStatus)
    .map(profile => ({ id: profile?.[idProperty], label: profile?.[labelProperty] || profile?.[idProperty] }))
    .filter(choice => typeof choice.id === 'string' && choice.id);
}

export function modelEditorGraphicsComponentId(declaration, model) {
  const geometry = valueAtPath(model, declaration?.roles?.geometry);
  return geometry ? declaration?.graphicsComponentId || null : null;
}

export function modelEditorNotes(declaration, placement, path, value, { kind, profileCopy, model, capabilities } = {}) {
  const matches = [];
  for (const note of declaration?.notes || []) {
    if (note.placement !== placement) continue;
    const when = note.when || {};
    if (when.role && !modelEditorSelectionHasRole(declaration, when.role, path)) continue;
    if (when.path && !modelEditorSelectionMatches(when, path, value)) continue;
    if (when.depth !== undefined && path?.length !== when.depth) continue;
    if (when.types?.length && !when.types.includes(value?.type)) continue;
    if (when.kinds?.length && !when.kinds.includes(kind)) continue;
    if (when.arrayProperty && !Array.isArray(value?.[when.arrayProperty])) continue;
    if (when.capability) {
      const key = when.capability.keyFromModel && valueAtPath(model, when.capability.keyFromModel);
      const target = valueAtPath(capabilities, when.capability.path);
      const actual = when.capability.keyFromModel ? target?.[key] : target;
      if (when.capability.exists !== undefined && Boolean(actual !== undefined && actual !== null) !== when.capability.exists) continue;
      if (Object.hasOwn(when.capability, 'equals') && actual !== when.capability.equals) continue;
    }
    if (when.property && value?.[when.property] !== when.equals) continue;
    const fromProfile = note.profileCopy && profileCopy?.[note.profileCopy];
    const content = fromProfile || note.text || '';
    if (content) matches.push(content);
  }
  return matches;
}

export function modelEditorNote(declaration, placement, path, value, options) {
  return modelEditorNotes(declaration, placement, path, value, options)[0] || null;
}

export function modelEditorTitle(declaration, path, value) {
  for (const title of declaration?.titles || []) {
    const when = title.when || {};
    if (when.role && !modelEditorSelectionHasRole(declaration, when.role, path)) continue;
    if (when.path && !modelEditorSelectionMatches(when, path, value)) continue;
    if (when.depth !== undefined && path?.length !== when.depth) continue;
    if (when.types?.length && !when.types.includes(value?.type)) continue;
    return title.text;
  }
  return null;
}
import { legacyFieldUiView } from "../../annotation-language.js";

