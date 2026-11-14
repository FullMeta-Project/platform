/** Guided, application-neutral project integration for a model schema. */
import { profileIntegrationDefaults, applyProfileIntegration } from './schema-profile-integration.js';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const resourcePattern = /^(?:\.\/|[A-Za-z0-9][A-Za-z0-9._/-]*)$/;
const storageNamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const routePattern = /^\/api\/[A-Za-z0-9/_-]+$/;
const keyPattern = /^[A-Za-z][A-Za-z0-9._-]*$/;
const capabilityPathSegmentPattern = '(?:[A-Za-z][A-Za-z0-9_-]*|[0-9]+)';
const capabilityPathPattern = new RegExp(`^${capabilityPathSegmentPattern}(?:\\.${capabilityPathSegmentPattern})*$`);
const executablePattern = /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.exe$/;
const relativeExecutablePattern = /^(?:\.\.\/)*(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.exe$/;
const schemaRelativeResourcePattern = /^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/;
const validationBoundaries = [
  { id: 'registration', label: 'Registration', inputs: 'documents, capabilities, externalPrograms' },
  { id: 'metadata', label: 'Metadata', inputs: 'documents, fieldPlotPartDeclarations, capabilities' },
];

function required(value, label, pattern = null, { allowParentSegments = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text || (pattern && !pattern.test(text))
    || (!allowParentSegments && text.includes('..')) || text.includes('//')) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return text;
}

function schemaRelativeResource(value, label, schemaPath) {
  const path = required(value, label, schemaRelativeResourcePattern, { allowParentSegments: true });
  const schemaParts = typeof schemaPath === 'string' ? schemaPath.split('/') : [];
  if (!schemaParts.length || schemaParts.some(part => !part || part === '.' || part === '..')) {
    if (path.split('/').includes('..')) {
      throw new Error(`Cannot validate the relative ${label} without the schema file path.`);
    }
    return path;
  }
  let depth = schemaParts.length - 1;
  for (const segment of path.split('/')) {
    if (segment === '..') {
      depth -= 1;
      if (depth < 0) throw new Error(`${label} must stay inside the FullMeta folder.`);
    } else if (segment !== '.') depth += 1;
  }
  return path;
}

function scenarioChoices(document) {
  const scenario = document?.properties?.scenario || document?.$defs?.scenario;
  return Array.isArray(scenario?.properties?.profileId?.enum)
    ? scenario.properties.profileId.enum.filter(value => typeof value === 'string') : [];
}

function rolesFromModel(document) {
  const properties = document?.properties?.model?.properties || document?.$defs?.model?.properties;
  if (!object(properties)) return {};
  return Object.fromEntries(Object.keys(properties).map(key => [key, ['model', key]]));
}

function simpleCapabilityFacts(value, prefix = '') {
  if (!object(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof entry === 'string') return [{ path, kind: 'text', value: entry }];
    if (typeof entry === 'number') return [{ path, kind: 'number', value: String(entry) }];
    if (typeof entry === 'boolean') return [{ path, kind: 'boolean', value: String(entry) }];
    if (Array.isArray(entry) && entry.every(item => typeof item === 'string')) {
      return [{ path, kind: 'string list', value: entry.join(', ') }];
    }
    if (Array.isArray(entry) && entry.every(item => typeof item === 'number')) {
      return [{ path, kind: 'number list', value: entry.join(', ') }];
    }
    return object(entry) ? simpleCapabilityFacts(entry, path) : [];
  });
}

const modelCreateContract = route => ({
  route, method: 'POST', handler: 'kernel.workspace.model.create',
  input: { contentType: 'application/json', fields: [
    ['modelId', 'New model ID'], ['folder', 'Destination folder'],
    ['file', 'Destination filename'], ['model', 'Prepared model JSON'],
  ] },
  output: { contentType: 'application/json', fields: [
    ['folder', 'Created model folder'], ['file', 'Created model filename'],
    ['modelId', 'Created model ID'],
  ] },
});

const projectCreateContract = route => ({
  route, method: 'POST', handler: 'kernel.workspace.project.create',
  input: { contentType: 'application/json', fields: [
    ['projectId', 'New project ID'], ['profileId', 'Selected profile'],
    ['model', 'Prepared initial model JSON'],
  ] },
  output: { contentType: 'application/json', fields: [
    ['id', 'Created project ID'], ['folder', 'Project folder'],
    ['file', 'Model filename'],
  ] },
});

/** Values are read back from the schema, so reopening the table edits what was saved. */
export function projectIntegrationDefaults(document) {
  const applicationId = document?.properties?.application?.const;
  if (typeof applicationId !== 'string' || !applicationId) return null;
  const runtime = document['x-fullmeta-runtime'] || {};
  const storage = runtime.storage || {};
  const resources = runtime.resources || {};
  const editor = document['x-fullmeta-ui-modelEditor'] || {};
  const interfaces = document['x-fullmeta-ui-graphicsInterfaces'] || {};
  const consoleDeclaration = document['x-fullmeta-ui-graphicsConsole'] || {};
  const sceneId = consoleDeclaration.defaultScene || 'main';
  const scene = consoleDeclaration.scenes?.[sceneId] || {};
  const profileChoices = scenarioChoices(document);
  return {
    applicationId,
    modelFile: storage.modelFile || `${applicationId}_model.json`,
    projectRootFolder: storage.projectRootFolder || editor.projectRootFolder || 'projects',
    runsDirectory: storage.runsDirectory || `${applicationId}_runs`,
    resultsDirectory: storage.resultsDirectory || `${applicationId}_results`,
    reservedDirectories: Array.isArray(storage.reservedDirectories)
      ? storage.reservedDirectories.join(', ') : '',
    resourcesRoot: resources.resourcesRoot || './',
    uiProfileSchema: resources.uiProfileSchema || 'platform/ui/widgets/model-editor/fullmeta-ui-profile-1.schema.json',
    uiProfileExtensionSchema: resources.uiProfileExtensionSchema || '',
    modelCreateRoute: runtime.editorApi?.modelCreate?.route || '/api/model/create',
    projectCreateRoute: runtime.editorApi?.projectCreate?.route || '/api/project/create',
    capabilityAnnotation: runtime.capabilityAnnotation || '',
    capabilityFacts: simpleCapabilityFacts(document[runtime.capabilityAnnotation]),
    externalPrograms: Object.entries(runtime.externalPrograms || {}).map(([id, registration]) => ({
      id, executable: registration?.executable || '', pathType: registration?.pathType || 'relative',
      allowedEntries: Array.isArray(registration?.allowedEntries)
        ? registration.allowedEntries.join(', ') : '',
    })),
    compatibility: Object.entries(runtime.compatibility || {}).map(([key, field]) => ({
      key, label: field?.label || '',
      capabilityPath: Array.isArray(field?.capabilityPath) ? field.capabilityPath.join('.') : '',
      value: field?.value === undefined ? '' : String(field.value),
    })),
    profileChoices,
    defaultProfileId: editor.scenario?.defaultProfileId || profileChoices[0] || '',
    resultAdapters: Object.entries(resources.resultAdapters || {}).map(([selector, path]) => ({ selector, path })),
    widgetCatalogs: Array.isArray(interfaces.catalogs) ? [...interfaces.catalogs] : [],
    widgets: Object.entries(interfaces.widgets || {}).map(([id, widget]) => ({
      id, kind: widget?.kind || '', label: widget?.label || '',
      registrationFile: widget?.registration?.file || '',
      registrationSymbol: widget?.registration?.symbol || '',
      registrationLabel: widget?.registration?.label || '',
    })),
    defaultScene: sceneId,
    sceneLabel: scene.label || '',
    surfaceWidget: scene.surface?.widget || '',
    inputPath: Array.isArray(scene.inputs?.[0]?.source?.path)
      ? scene.inputs[0].source.path.join('.') : String(scene.inputs?.[0]?.source?.path || 'model'),
    layerHandler: scene.layers?.[0]?.handler || '',
    validationBoundaries: validationBoundaries.map(boundary => ({
      ...boundary, declared: object(document[`x-fullmeta-${boundary.id}Validation`]), ensure: true,
    })),
    profileIntegration: profileIntegrationDefaults(document),
  };
}

function ensureValidationBoundaries(document, rows) {
  if (!Array.isArray(rows)) throw new Error('Runtime validation boundaries must be a table.');
  const added = [];
  for (const boundary of validationBoundaries) {
    const row = rows.find(entry => entry?.id === boundary.id);
    if (!row?.ensure) continue;
    const annotation = `x-fullmeta-${boundary.id}Validation`;
    if (document[annotation] !== undefined) {
      if (!object(document[annotation])) throw new Error(`${annotation} must be a rule program object.`);
      continue;
    }
    const fields = String(row.inputs || '').split(',').map(field => field.trim()).filter(Boolean);
    if (!fields.length || fields.some(field => !/^[A-Za-z][A-Za-z0-9]*$/.test(field))
      || new Set(fields).size !== fields.length) {
      throw new Error(`Enter unique input field names for ${boundary.label} validation.`);
    }
    const properties = Object.fromEntries(fields.map(field => [field, {
      type: field === 'documents' || field === 'fieldPlotPartDeclarations' ? 'array' : 'object',
    }]));
    document[annotation] = {
      maximumErrors: 64,
      rules: [{
        check: 'schema', haltOnErrors: true,
        input: { object: {
          schema: { literal: { type: 'object', required: fields, properties } },
          value: { model: '' },
        } },
      }],
    };
    added.push(annotation);
  }
  return added;
}

function adapterRows(rows) {
  if (!Array.isArray(rows)) throw new Error('Result adapters must be a table.');
  const adapters = {};
  for (const row of rows) {
    const selector = required(row?.selector, 'result adapter selector');
    const path = required(row?.path, `result adapter ${selector} resource`, resourcePattern);
    if (Object.hasOwn(adapters, selector)) throw new Error(`Result adapter ${selector} is listed twice.`);
    adapters[selector] = path;
  }
  return adapters;
}

function widgetRows(rows, existingWidgets, schemaPath) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Add at least one registered Graphics widget row.');
  const widgets = {};
  for (const row of rows) {
    const id = required(row?.id, 'Graphics widget ID', keyPattern);
    if (Object.hasOwn(widgets, id)) throw new Error(`Graphics widget ${id} is listed twice.`);
    const registrationFile = schemaRelativeResource(
      row?.registrationFile, `${id} registration file`, schemaPath,
    );
    const registrationSymbol = required(row?.registrationSymbol, `${id} registration symbol`, keyPattern);
    widgets[id] = {
      ...(object(existingWidgets?.[id]) ? existingWidgets[id] : {}),
      id, kind: required(row?.kind, `${id} kind`, keyPattern),
      label: required(row?.label, `${id} label`),
      registration: {
        ...(object(existingWidgets?.[id]?.registration) ? existingWidgets[id].registration : {}),
        file: registrationFile, symbol: registrationSymbol,
        label: required(row?.registrationLabel || row?.label, `${id} registration label`),
      },
    };
  }
  return widgets;
}

function commaList(value, label) {
  const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  if (new Set(parts).size !== parts.length) throw new Error(`${label} must not contain duplicates.`);
  return parts;
}

function externalProgramRows(rows) {
  if (!Array.isArray(rows)) throw new Error('External programs must be a table.');
  const programs = {};
  for (const row of rows) {
    const id = required(row?.id, 'external program ID', /^[A-Za-z][A-Za-z0-9]*$/);
    if (Object.hasOwn(programs, id)) throw new Error(`External program ${id} is listed twice.`);
    const pathType = required(row?.pathType, `${id} path type`);
    if (!['absolute', 'relative'].includes(pathType)) throw new Error(`${id} path type must be absolute or relative.`);
    const executable = String(row?.executable || '').trim();
    if (!(pathType === 'absolute' ? executablePattern : relativeExecutablePattern).test(executable)) {
      throw new Error(`Enter a valid workspace executable path for ${id}.`);
    }
    const allowedEntries = commaList(row?.allowedEntries, `${id} allowed entries`);
    if (!allowedEntries.length) throw new Error(`Enter at least one allowed entry for ${id}.`);
    programs[id] = { executable, pathType, allowedEntries };
  }
  return programs;
}

function compatibilityRows(rows) {
  if (!Array.isArray(rows)) throw new Error('Compatibility expectations must be a table.');
  const expectations = {};
  for (const row of rows) {
    const key = required(row?.key, 'compatibility key', keyPattern);
    if (Object.hasOwn(expectations, key)) throw new Error(`Compatibility key ${key} is listed twice.`);
    const label = required(row?.label, `${key} compatibility label`);
    const capabilityPath = String(row?.capabilityPath || '').trim();
    const value = String(row?.value ?? '').trim();
    if (Boolean(capabilityPath) === Boolean(value)) {
      throw new Error(`Enter either a capability path or a fixed value for ${key}.`);
    }
    if (capabilityPath && !capabilityPathPattern.test(capabilityPath)) {
      throw new Error(`Enter a dot-separated capability path for ${key}.`);
    }
    expectations[key] = capabilityPath
      ? { label, capabilityPath: capabilityPath.split('.') } : { label, value };
  }
  return expectations;
}

function capabilityFactRows(rows, annotation, document) {
  if (!Array.isArray(rows)) throw new Error('Capability facts must be a table.');
  if (rows.length && !annotation) throw new Error('Enter a capability annotation for the fact rows.');
  if (!annotation) return [];
  const target = document[annotation] ||= {};
  if (!object(target)) throw new Error(`${annotation} must be an object.`);
  const changed = [];
  const seen = new Set();
  for (const row of rows) {
    const path = required(row?.path, 'capability fact path', capabilityPathPattern);
    if (seen.has(path)) throw new Error(`Capability fact ${path} is listed twice.`);
    seen.add(path);
    const kind = required(row?.kind, `${path} value kind`);
    const text = String(row?.value ?? '').trim();
    let value;
    if (kind === 'text') value = text;
    else if (kind === 'number' && text && Number.isFinite(Number(text))) value = Number(text);
    else if (kind === 'boolean' && ['true', 'false'].includes(text)) value = text === 'true';
    else if (kind === 'string list') value = commaList(text, path);
    else if (kind === 'number list') {
      value = commaList(text, path).map(Number);
      if (value.some(item => !Number.isFinite(item))) throw new Error(`${path} needs comma-separated numbers.`);
    }
    else throw new Error(`Enter a valid ${kind} value for ${path}.`);
    const segments = path.split('.');
    let parent = target;
    for (const segment of segments.slice(0, -1)) {
      parent[segment] ||= {};
      if (!object(parent[segment])) throw new Error(`${path} conflicts with an existing capability value.`);
      parent = parent[segment];
    }
    parent[segments.at(-1)] = value;
    changed.push(`/${annotation}/${segments.join('/')}`);
  }
  return changed;
}

/** Apply semantic rows; preserve other authored capabilities and scenes. */
export function schemaWithProjectIntegration(document, setup, schemaPath = '') {
  const defaults = projectIntegrationDefaults(document);
  if (!defaults) throw new Error('Declare an application ID on the root before setting up project integration.');
  if (!object(setup)) throw new Error('Enter project integration settings.');
  const modelFile = required(setup.modelFile, 'model filename', /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/);
  const projectRootFolder = required(setup.projectRootFolder, 'project root folder', storageNamePattern);
  const runsDirectory = required(setup.runsDirectory, 'runs directory', storageNamePattern);
  const resultsDirectory = required(setup.resultsDirectory, 'results directory', storageNamePattern);
  const reservedDirectories = commaList(setup.reservedDirectories, 'Reserved storage folders');
  if (reservedDirectories.some(name => !storageNamePattern.test(name))) {
    throw new Error('Reserved storage folders must be folder names.');
  }
  const resourcesRoot = required(setup.resourcesRoot, 'resources root', resourcePattern);
  const uiProfileSchema = required(setup.uiProfileSchema, 'UI profile schema resource', resourcePattern);
  const uiProfileExtensionSchema = setup.uiProfileExtensionSchema
    ? required(setup.uiProfileExtensionSchema, 'UI profile extension resource', resourcePattern) : '';
  const modelCreateRoute = required(setup.modelCreateRoute, 'model creation route', routePattern);
  const projectCreateRoute = setup.projectCreateRoute
    ? required(setup.projectCreateRoute, 'project creation route', routePattern) : '';
  const resultAdapters = adapterRows(setup.resultAdapters);
  const externalPrograms = externalProgramRows(setup.externalPrograms);
  const compatibility = compatibilityRows(setup.compatibility);
  const capabilityAnnotation = String(setup.capabilityAnnotation || '').trim();
  if (capabilityAnnotation && !/^x-[A-Za-z][A-Za-z0-9-]*-capabilities$/.test(capabilityAnnotation)) {
    throw new Error('Capability annotation must be an x-...-capabilities key.');
  }
  const currentRuntime = document['x-fullmeta-runtime'];
  const currentEditor = document['x-fullmeta-ui-modelEditor'];
  const currentInterfaces = document['x-fullmeta-ui-graphicsInterfaces'];
  const currentConsole = document['x-fullmeta-ui-graphicsConsole'];
  for (const [label, value] of [['runtime', currentRuntime], ['Model Editor', currentEditor],
    ['Graphics interfaces', currentInterfaces], ['Graphics console', currentConsole]]) {
    if (value !== undefined && !object(value)) throw new Error(`The existing ${label} declaration must be an object.`);
  }
  const widgets = widgetRows(setup.widgets, currentInterfaces?.widgets, schemaPath);
  const defaultScene = required(setup.defaultScene, 'default scene ID', keyPattern);
  const sceneLabel = required(setup.sceneLabel, 'default scene label');
  const surfaceWidget = required(setup.surfaceWidget, 'surface widget ID', keyPattern);
  if (!Object.hasOwn(widgets, surfaceWidget)) throw new Error(`Surface widget ${surfaceWidget} is absent from the widget table.`);
  const inputPath = required(setup.inputPath, 'scene input path');
  const layerHandler = setup.layerHandler ? required(setup.layerHandler, 'layer handler', keyPattern) : '';
  const profileChoices = scenarioChoices(document);
  const defaultProfileId = String(setup.defaultProfileId || '').trim();
  if (profileChoices.length && !profileChoices.includes(defaultProfileId)) {
    throw new Error('Choose a default profile from the Scenario choices.');
  }

  const runtime = document['x-fullmeta-runtime'] ||= {};
  runtime.schema = 'fullmeta-model-runtime/1';
  runtime.storage = { ...(runtime.storage || {}), modelFile, projectRootFolder, runsDirectory, resultsDirectory };
  if (reservedDirectories.length) runtime.storage.reservedDirectories = reservedDirectories;
  else delete runtime.storage.reservedDirectories;
  runtime.resources = { ...(runtime.resources || {}), resourcesRoot, uiProfileSchema, resultAdapters };
  if (uiProfileExtensionSchema) runtime.resources.uiProfileExtensionSchema = uiProfileExtensionSchema;
  else delete runtime.resources.uiProfileExtensionSchema;
  runtime.editorApi ||= {};
  if (capabilityAnnotation) runtime.capabilityAnnotation = capabilityAnnotation;
  else delete runtime.capabilityAnnotation;
  runtime.externalPrograms = Object.fromEntries(Object.entries(externalPrograms).map(([id, registration]) => [
    id, { ...(object(runtime.externalPrograms?.[id]) ? runtime.externalPrograms[id] : {}), ...registration },
  ]));
  runtime.compatibility = Object.fromEntries(Object.entries(compatibility).map(([key, expectation]) => {
    const existing = object(runtime.compatibility?.[key]) ? { ...runtime.compatibility[key] } : {};
    delete existing.capabilityPath;
    delete existing.value;
    return [key, { ...existing, ...expectation }];
  }));
  runtime.editorApi.modelCreate = {
    ...modelCreateContract(modelCreateRoute),
    ...(object(runtime.editorApi.modelCreate) ? runtime.editorApi.modelCreate : {}),
    route: modelCreateRoute,
  };
  if (projectCreateRoute) runtime.editorApi.projectCreate = {
    ...projectCreateContract(projectCreateRoute),
    ...(object(runtime.editorApi.projectCreate) ? runtime.editorApi.projectCreate : {}),
    route: projectCreateRoute,
  };
  else delete runtime.editorApi.projectCreate;

  const editor = document['x-fullmeta-ui-modelEditor'] ||= {};
  editor.schema = 'fullmeta-model-editor-ui/1';
  editor.roles ||= rolesFromModel(document);
  editor.panels ||= [];
  if (!Array.isArray(editor.panels)) throw new Error('The existing Model Editor panels must be a list.');
  editor.componentPath ||= ['model'];
  editor.graphicsComponentId ||= 'model';
  editor.projectRootFolder = projectRootFolder;
  editor.scenario ||= {};
  const scenarioProperties = document?.properties?.scenario?.properties || document?.$defs?.scenario?.properties;
  if (profileChoices.length && object(scenarioProperties) && Object.hasOwn(scenarioProperties, 'dimension')) {
    editor.scenario = {
      profileIdPath: ['scenario', 'profileId'],
      dimensionPath: ['scenario', 'dimension'],
      availableStatus: 'available',
      profileIdProperty: 'id', profileLabelProperty: 'name',
      profileDimensionProperty: 'dimension', profileStatusProperty: 'status',
      ...editor.scenario,
      defaultProfileId,
    };
  }
  editor.newModel ||= profileChoices.length
    ? { api: 'modelCreate', choiceLabel: 'Profile', choiceRequestKey: 'profileId',
      description: 'Create a model from a profile and open it in the editor.' }
    : { api: 'modelCreate', description: 'Create a model and open it in the editor.' };

  const interfaces = document['x-fullmeta-ui-graphicsInterfaces'] ||= {};
  interfaces.schema = 'fullmeta-graphics-interfaces/1';
  if (setup.widgetCatalogs !== undefined) {
    if (!Array.isArray(setup.widgetCatalogs)) throw new Error('Widget catalogs must be a path table.');
    const paths = setup.widgetCatalogs.map(path => schemaRelativeResource(path, 'widget catalog path', schemaPath));
    if (new Set(paths).size !== paths.length) throw new Error('Each widget catalog path must be unique.');
    if (paths.length) interfaces.catalogs = paths;
    else delete interfaces.catalogs;
  }
  interfaces.widgets = widgets;
  interfaces.actions ||= {};
  interfaces.interfaces ||= {};

  const consoleDeclaration = document['x-fullmeta-ui-graphicsConsole'] ||= {};
  consoleDeclaration.schema = 'fullmeta-graphics-console/1';
  consoleDeclaration.scenes ||= {};
  const existingScene = consoleDeclaration.scenes[defaultScene];
  const scene = object(existingScene) ? existingScene : {};
  scene.kind ||= 'layered';
  if (scene.kind !== 'layered') throw new Error('Choose a layered scene as the default scene.');
  scene.label = sceneLabel;
  scene.surface = { ...(scene.surface || {}), widget: surfaceWidget };
  scene.inputs ||= [{ id: 'model', label: 'Model', source: { scope: 'model', path: inputPath } }];
  if (scene.inputs.length) {
    scene.inputs[0].source = { ...(scene.inputs[0].source || {}), scope: 'model', path: inputPath };
  }
  if (layerHandler) {
    scene.layers ||= [{ id: 'main', role: 'main', label: 'Main', input: scene.inputs[0]?.id || 'model', handler: layerHandler, defaultVisible: true }];
    if (scene.layers.length) scene.layers[0].handler = layerHandler;
  }
  consoleDeclaration.scenes[defaultScene] = scene;
  consoleDeclaration.defaultScene = defaultScene;

  const addedValidationBoundaries = ensureValidationBoundaries(document, setup.validationBoundaries);
  const changedCapabilityFacts = capabilityFactRows(setup.capabilityFacts, capabilityAnnotation, document);
  const profileChanges = applyProfileIntegration(document, setup.profileIntegration);

  return {
    document, path: [], label: 'Project integration',
    changedPaths: ['/x-fullmeta-runtime', '/x-fullmeta-ui-modelEditor',
      '/x-fullmeta-ui-graphicsInterfaces', '/x-fullmeta-ui-graphicsConsole',
      ...addedValidationBoundaries.map(annotation => `/${annotation}`), ...changedCapabilityFacts,
      ...profileChanges.changedPaths],
    generatedPaths: [
      [['x-fullmeta-runtime', 'schema'], 'registered runtime format'],
      ...(reservedDirectories.length ? [[['x-fullmeta-runtime', 'storage', 'reservedDirectories'],
        'reserved project storage folders']] : []),
      ...(capabilityAnnotation ? [[['x-fullmeta-runtime', 'capabilityAnnotation'],
        'selected capability annotation']] : []),
      [['x-fullmeta-runtime', 'editorApi', 'modelCreate', 'handler'], 'registered model creation handler'],
      ...(projectCreateRoute ? [[['x-fullmeta-runtime', 'editorApi', 'projectCreate', 'handler'],
        'registered project creation handler']] : []),
      ...Object.keys(externalPrograms).map(id => [
        ['x-fullmeta-runtime', 'externalPrograms', id], 'registered executable and allowed entries',
      ]),
      ...Object.keys(compatibility).map(key => [
        ['x-fullmeta-runtime', 'compatibility', key], 'runtime compatibility expectation',
      ]),
      ...setup.capabilityFacts.map(row => [
        [capabilityAnnotation, ...row.path.split('.')], 'capability fact entered in table',
      ]),
      ...profileChanges.generatedPaths,
      [['x-fullmeta-ui-modelEditor', 'schema'], 'registered Model Editor UI format'],
      [['x-fullmeta-ui-modelEditor', 'newModel', 'api'], 'registered model creation API'],
      [['x-fullmeta-ui-graphicsInterfaces', 'schema'], 'registered Graphics interface format'],
      [['x-fullmeta-ui-graphicsConsole', 'schema'], 'registered Graphics console format'],
    ],
    sourceSummary: `Updated project integration for ${defaults.applicationId} from ${setup.resultAdapters.length} adapter rows, ${setup.widgets.length} Graphics widget rows, ${setup.externalPrograms.length} executable registrations, and ${setup.compatibility.length} compatibility expectations. ${projectCreateRoute ? 'Registered project folder creation.' : 'Model creation uses a chosen folder.'} Added ${addedValidationBoundaries.length} structural runtime validation boundaries and ${changedCapabilityFacts.length} capability facts; edited ${profileChanges.fieldCount} profile field variables, ${profileChanges.materialCount} material templates, and ${profileChanges.factCount} profile annotation facts. Other scenario rules and scenes were preserved.`,
  };
}
