import { genericGraphicsWidgets } from "../graphics-console/widget.js";
import { sceneViewRenderer } from "../scene-view/widget.js";
import { graphicsConsoleIssues, graphicsSceneForSelection, graphicsSceneInputs } from "../graphics-console/widget.js";
import { graphicsConsoleOverviewWidget } from "../graphics-console/widget.js?scene-order=structure-field-globalPlot&scene-subtitle=removed&relationship-spacing=compact&hover-tooltips=1";
import { schemaGraphicsContext } from "./schema-graphics-context.js";
import { resizeCanvasForDisplay } from "./canvas-size.js";
import { modelEditorNewModelChoices, modelEditorUiIssues } from "../model-editor-behavior/widget.js";
import { createSchemaTreeActionPlans, resolveTreeDescriptor } from "../tree/widget.js";
import { loadSchemaDocumentInterpreter } from "./schema-document-interpreter.js";
import { projectSchemaDeclarations } from "./schema-declaration-projection.js";
import { duplicateSchemaMember, isSchemaTreeDeclaration, schemaTreeDeleteIssue, schemaTreeMoveIssue, schemaTreePromotionIssue, schemaWithAddedChildItem, schemaWithAuthoringOperation, schemaWithDeletedTreeItem, schemaWithMovedTreeItem, schemaWithPromotedTreeChildren, schemaWithRenamedTitle } from "./schema-structure-authoring.js";
import { schemaWithEditedStructureFields } from "./schema-structure-edit.js";
import { declaredDocumentWidgets } from "../document-resources/widget.js";
import { loadWorkspaceJson } from "../../../js/services.js";
import { loadWidgetCatalogs } from "../shared/catalog.js";
import emptySchemaTemplate from "../../../schema-editor/templates/empty.schema.json" with { type: "json" };
import { declaredSchemaAuthoringTools } from './schema-authoring-tools.js';
import { createSchemaBasedProject, genericProjectCreationIssue, schemaAuthoringReadiness } from "./schema-project-initializer.js";
import { applicationModuleUrl, loadApplicationCatalog } from "../../../js/services.js";
import {
  UI_BEHAVIOR_FORMAT, schemaAuthoringWidgetProfileIssue,
  widgetProfilePayload,
} from "../../annotation-language.js";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const workspaceUrl = new URL("../../../../", import.meta.url);
const sameSchemaPath = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === right.length && left.every((part, index) => part === right[index]);

function treeDescriptorPathForTarget(document, target) {
  const generated = document?.["x-fullmeta-ui-generated"]?.fields || [];
  for (const candidate of [target?.itemPath, target?.arrayPath]) {
    if (!Array.isArray(candidate)) continue;
    if (candidate[0] === "x-fullmeta-ui-tree" && candidate[1] === "children") return candidate;
    const binding = generated.find(entry => sameSchemaPath(entry.owner?.path, candidate)
      && entry.owner?.input === "standard project-tree binding");
    if (Array.isArray(binding?.path)) return binding.path;
  }
  if ((!Array.isArray(target?.itemPath) || target.itemPath.length === 0)
    && Array.isArray(target?.arrayPath) && target.arrayPath.length === 0) {
    const index = (document?.["x-fullmeta-ui-tree"]?.children || []).findIndex(entry =>
      isRecord(entry) && Array.isArray(entry.path) && entry.path.length === 0
      && !entry.role && Array.isArray(entry.children));
    return index >= 0 ? ["x-fullmeta-ui-tree", "children", index] : null;
  }
  return null;
}

function requireSelfContainedSchema(document) {
  const identifier = new URL(document.$id);
  function visit(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") {
        const target = new URL(child, identifier);
        target.hash = "";
        if (target.href !== identifier.href) {
          throw new Error(`Schema editing requires one file. Move the declaration for ${child} into this schema first.`);
        }
      } else if (key !== "$ref") visit(child);
    }
  }
  visit(document);
}

const emptyProfileSchema = Object.freeze({
  properties: {
    behavior: {
      properties: {
        tree: {
          properties: {
            rootCollapsedByDefault: { default: false },
            collapsedByDefault: { default: true },
            collapsedHandle: { default: "▸" },
            expandedHandle: { default: "▾" },
          },
        },
      },
    },
  },
});

const schemaGeometryWidget = Object.freeze({
  id: "geometry", kind: "geometry", dimensions: [2, 3], sceneRenderer: sceneViewRenderer,
});

const defaultGraphicsConsole = Object.freeze({
  schema: "fullmeta-graphics-console/1",
  defaultScene: "document",
  presentation: {
    axes: [["x", [1, 0, 0], "#e26976"], ["y", [0, 1, 0], "#55cbb7"]],
    widgets: { geometry: { label: "Schema", showSceneControls: false } },
  },
  scenes: {
    document: { kind: "layered", surface: { widget: "geometry" }, layers: [] },
  },
});

function declaredGraphicsWidgets(schema) {
  const declarations = schema["x-fullmeta-ui-graphicsInterfaces"]?.widgets;
  const widgets = { geometry: schemaGeometryWidget, graphicsConsoleOverview: graphicsConsoleOverviewWidget, ...genericGraphicsWidgets };
  if (!isRecord(declarations)) return widgets;
  for (const [id, declaration] of Object.entries(declarations)) {
    if (widgets[id]) continue;
    if (declaration?.kind === "geometry") {
      widgets[id] = Object.freeze({ id, kind: "geometry", dimensions: [2, 3], sceneRenderer: sceneViewRenderer });
    }
  }
  return widgets;
}

function declaredGraphicsConsole(schema, widgets) {
  const declaration = schema["x-fullmeta-ui-graphicsConsole"];
  if (!isRecord(declaration)) return structuredClone(defaultGraphicsConsole);
  const issues = graphicsConsoleIssues(declaration, widgets);
  if (issues.length) throw new Error(`Schema document Graphics console: ${issues[0]}`);
  return structuredClone(declaration);
}

function declaredModelEditorUi(schema) {
  const declaration = schema["x-fullmeta-ui-modelEditor"];
  if (!isRecord(declaration)) {
    return {
      schema: "fullmeta-model-editor-ui/1",
      roles: {},
      panels: [],
      projectRootFolder: ".",
      emptyState: { canvasLabel: "Schema document graphics" },
      controlCopy: { validateHelp: "Validate this JSON Schema document" },
    };
  }
  const issues = modelEditorUiIssues(declaration);
  if (issues.length) throw new Error(`Schema document Model Editor UI: ${issues[0]}`);
  return structuredClone(declaration);
}

function packagePath(url, rootUrl) {
  const root = new URL("./", rootUrl);
  const target = new URL(url);
  if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) {
    throw new Error("The interpreting schema must stay inside FullMeta.");
  }
  return decodeURIComponent(target.pathname.slice(root.pathname.length));
}

function relativeWorkspacePath(fromFolder, toFile) {
  const from = String(fromFolder || ".").replaceAll("\\", "/").split("/").filter(part => part && part !== ".");
  const to = String(toFile || "").replaceAll("\\", "/").replace(/^\.\//, "").split("/").filter(Boolean);
  if (!to.length || to.some(part => part === "..")) throw new Error("The schema document path must stay inside FullMeta.");
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common++;
  return [...Array(from.length - common).fill(".."), ...to.slice(common)].join("/");
}

function resourceUrl(path, rootUrl) {
  if (typeof path !== "string" || !path || path.startsWith("/") || path.includes("\\")
    || path.split("/").some((part) => part === "..") || /[:?#%]/.test(path)) {
    throw new Error("Application resource path is invalid.");
  }
  return new URL(path, rootUrl);
}

function componentModuleUrl(path, modelLocation, rootUrl) {
  if (typeof path !== "string" || !path || !path.endsWith(".js")
    || path.startsWith("/") || path.includes("\\") || /[:?#%\u0000-\u001f]/.test(path)) {
    throw new Error("Schema document component source module must be a relative workspace .js file.");
  }
  const url = new URL(path, modelLocation);
  const root = new URL("./", rootUrl);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)
    || url.search || url.hash || !url.pathname.endsWith(".js")) {
    throw new Error("Schema document component source module must stay inside FullMeta.");
  }
  return url;
}

function configuredSchemaValue(model, path) {
  if (!Array.isArray(path) || !path.length || path.some(key =>
    typeof key !== "string" || !key || ["__proto__", "constructor", "prototype"].includes(key))) {
    throw new Error("A schema widget config value path is invalid.");
  }
  return path.reduce((value, key) => value && Object.hasOwn(value, key) ? value[key] : undefined, model);
}

async function declaredSchemaVariantProviders(model, modelLocation, rootUrl, presentation) {
  const configured = Object.entries(presentation.widgets || {}).filter(([, profile]) =>
    typeof profile?.authoring?.variantEditor?.providerExport === "string");
  if (!configured.length) return {};
  const providers = {};
  const modules = new Map();
  for (const [widget, profile] of configured) {
    const variantEditor = profile.authoring.variantEditor;
    const path = configuredSchemaValue(model, variantEditor.providerModulePath);
    if (path === undefined) continue;
    const url = componentModuleUrl(path, modelLocation, rootUrl);
    let module = modules.get(url.href);
    if (!module) {
      try {
        module = await import(url.href);
      } catch (error) {
        throw new Error(`Could not load schema document component source module ${path}: ${error.message}`);
      }
      modules.set(url.href, module);
    }
    const name = variantEditor.providerExport;
    if (typeof module[name] !== "function") {
      throw new Error(`Schema document component source module ${path} must export ${name} for ${widget}.`);
    }
    providers[widget] = module[name];
  }
  return providers;
}

const nonemptyString = (value) => typeof value === "string" && value.trim().length > 0;

function annotationCatalogIssue(catalog) {
  if (!isRecord(catalog) || catalog.schema !== "fullmeta-ui-annotation-catalog/2"
    || catalog.format !== UI_BEHAVIOR_FORMAT || catalog.annotationKey !== "x-fullmeta-ui-behavior"
    || catalog.fieldTarget !== "field" || catalog.fieldContext !== "projectEditing"
    || !Array.isArray(catalog.presentationPayloadPath) || !Array.isArray(catalog.widgetSettingsPayloadPath)
    || !Array.isArray(catalog.groups) || !Array.isArray(catalog.types)) {
    return "Expected a fullmeta-ui-annotation-catalog/2 using the v1 field envelope, target, context, and payload paths.";
  }
  const annotationKeys = new Set();
  for (const group of catalog.groups) {
    if (!isRecord(group) || !nonemptyString(group.title) || !Array.isArray(group.annotations)) {
      return "Each annotation group needs a title and annotations list.";
    }
    for (const annotation of group.annotations) {
      if (!isRecord(annotation) || !nonemptyString(annotation.key) || !nonemptyString(annotation.label)
        || (annotation.type !== undefined && !nonemptyString(annotation.type))
        || (annotation.primary !== undefined && typeof annotation.primary !== "boolean")
        || (annotation.required !== undefined && (!Array.isArray(annotation.required)
          || !annotation.required.every(nonemptyString)))
        || (annotation.fields !== undefined && (!Array.isArray(annotation.fields)
          || !annotation.fields.every((field) => isRecord(field)
            && nonemptyString(field.key) && nonemptyString(field.label) && nonemptyString(field.type))))) {
        return "Each annotation needs a key and label, with valid optional input fields.";
      }
      if (annotationKeys.has(annotation.key)) return `Duplicate annotation key ${annotation.key}.`;
      annotationKeys.add(annotation.key);
    }
  }
  const typeKeys = new Set();
  for (const entry of catalog.types) {
    if (!isRecord(entry) || !nonemptyString(entry.key) || !nonemptyString(entry.label)
      || !Array.isArray(entry.widgets) || !entry.widgets.every(nonemptyString)) {
      return "Each annotation type needs a key, label, and widgets list.";
    }
    if (entry.target !== "field" || entry.context !== "projectEditing"
      || !Array.isArray(entry.payloadPath) || (entry.widget !== undefined && !nonemptyString(entry.widget))) {
      return `Annotation type ${entry.key} needs a field target, projectEditing context, and payload path.`;
    }
    if (typeKeys.has(entry.key)) return `Duplicate annotation type ${entry.key}.`;
    typeKeys.add(entry.key);
  }
  const presentationKeys = new Set();
  for (const field of catalog.presentationFields || []) {
    if (!isRecord(field) || !nonemptyString(field.key) || !nonemptyString(field.legacyKey)
      || !nonemptyString(field.type) || presentationKeys.has(field.key)) {
      return "Each presentation field needs a unique renderer key and input type.";
    }
    presentationKeys.add(field.key);
  }
  return null;
}

function declaredSchemaAuthoringPresentation(schema, widgetCatalog) {
  const declaration = schema["x-fullmeta-ui-schemaAuthoring"];
  if (declaration === undefined) return null;
  if (!isRecord(declaration) || declaration.schema !== "fullmeta-ui-schema-authoring/1"
    || declaration.format !== UI_BEHAVIOR_FORMAT || declaration.context !== "schemaAuthoring"
    || !isRecord(declaration.presentation) || !isRecord(declaration.profiles)) {
    throw new Error("Schema document x-fullmeta-ui-schemaAuthoring must declare versioned presentation settings and widget profiles.");
  }
  const widgets = {};
  for (const widget of widgetCatalog?.widgets || []) {
    const envelope = widget.authoring?.schemaAuthoringProfile;
    if (envelope === undefined) continue;
    const issue = schemaAuthoringWidgetProfileIssue(envelope, widget.id);
    if (issue) throw new Error(`Widget catalog authoring profile: ${issue}`);
    const payload = widgetProfilePayload(envelope);
    const authoring = { ...payload.authoring };
    if (widget.authoringProfileContractUrl) authoring.validationContractUrl = widget.authoringProfileContractUrl;
    widgets[widget.id] = {
      ...payload,
      authoring,
      annotation: payload.annotationKey,
    };
  }
  for (const [name, envelope] of Object.entries(declaration.profiles)) {
    const issue = schemaAuthoringWidgetProfileIssue(envelope, name);
    if (issue) throw new Error(`Schema document authoring profile: ${issue}`);
    const payload = widgetProfilePayload(envelope);
    widgets[name] = {
      ...payload,
      annotation: payload.annotationKey,
    };
  }
  const catalogDefaults = widgetCatalog?.schemaAuthoring || {};
  const presentation = {
    ...structuredClone(catalogDefaults.presentation || {}),
    ...structuredClone(declaration.presentation),
  };
  if (declaration.presentation.documentWidgets === undefined && Array.isArray(catalogDefaults.documentWidgets)) {
    presentation.documentWidgets = structuredClone(catalogDefaults.documentWidgets);
  }
  if (declaration.presentation.tools === undefined && Array.isArray(catalogDefaults.tools)) {
    presentation.tools = structuredClone(catalogDefaults.tools);
  }
  return { ...presentation, widgets };
}

function hideSchemaAuthoringTreeNode(descriptor) {
  if (!descriptor?.children) return descriptor;
  // Root authoring controls are rendered in settings. The backing
  // x-fullmeta-ui-schemaAuthoring object is editor metadata, so omit it from
  // both declared and fallback project-tree presentations.
  const children = descriptor.children.filter(child =>
    !(child?.role === "objectRoot"
      && Array.isArray(child.path)
      && child.path.length === 1
      && child.path[0] === "x-fullmeta-ui-schemaAuthoring"));
  if (children.length === descriptor.children.length) return descriptor;
  return {
    ...descriptor,
    children,
  };
}

function schemaAuthoringTree(schema, widgetCatalog) {
  const declared = schema["x-fullmeta-ui-tree"];
  const descriptor = declared?.children?.some(child => child?.role === "schemaDeclarations")
    ? declared : widgetCatalog?.schemaAuthoring?.tree || declared;
  return hideSchemaAuthoringTreeNode(descriptor);
}

function minimalDocumentWidgetValue(widget, schema) {
  if (widget.initialValue !== undefined) return structuredClone(widget.initialValue);
  const path = widget.path;
  if (!Array.isArray(path) || path.length !== 1) return undefined;
  const key = path[0];
  if (key === "x-fullmeta-ui-tree") return { children: [] };
  if (key === "x-fullmeta-ui-schemaAuthoring") return {
    schema: "fullmeta-ui-schema-authoring/1",
    format: UI_BEHAVIOR_FORMAT,
    context: "schemaAuthoring",
    presentation: {},
    profiles: {},
  };
  if (key === "x-fullmeta-ui-program") return { name: "Model schema" };
  if (key === "x-fullmeta-ui-annotationCatalog") return "ui/annotation-catalog.json";
  if (Object.hasOwn(schema, key)) return structuredClone(schema[key]);
  return {};
}

async function declaredAnnotationCatalog(schema, rootUrl) {
  const path = schema["x-fullmeta-ui-annotationCatalog"];
  if (path === undefined) return null;
  if (!nonemptyString(path) || !path.endsWith(".json")) {
    throw new Error("Schema document annotation catalog must name a workspace JSON file.");
  }
  const url = resourceUrl(path, rootUrl);
  packagePath(url, rootUrl);
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new Error(`Could not load schema document annotation catalog ${path}: ${error.message}`);
  }
  if (!response.ok) throw new Error(`Could not load schema document annotation catalog ${path} (${response.status}).`);
  let catalog;
  try {
    catalog = await response.json();
  } catch {
    throw new Error(`Schema document annotation catalog ${path} is not valid JSON.`);
  }
  const issue = annotationCatalogIssue(catalog);
  if (issue) throw new Error(`Schema document annotation catalog ${path}: ${issue}`);
  return catalog;
}

function renderSchemaPreview({ previewCanvas, previewContext, activeApplicationPackage, model,
  selectedPath = [], selectedSchemaProjection, settingsDraft } = {}) {
  if (!previewCanvas || !previewContext) return;
  const selectionPath = Array.isArray(selectedPath) ? selectedPath : [];
  const { width, height } = resizeCanvasForDisplay(previewCanvas, previewContext);
  previewContext.fillStyle = "#0c141e";
  previewContext.fillRect(0, 0, width, height);
  const consoleDefinition = activeApplicationPackage?.graphicsConsole;
  const { scene } = graphicsSceneForSelection(consoleDefinition, {
    path: selectionPath,
    value: selectionPath.reduce((entry, key) => entry?.[key], model),
  });
  const sources = { model, selected: selectionPath.reduce((entry, key) => entry?.[key], model) };
  const inputs = graphicsSceneInputs(scene, sources);
  previewCanvas.graphicsTooltipAt = null;
  const layer = scene?.layers?.find((entry) => activeApplicationPackage?.graphicsWidgets?.[entry.widget]?.render);
  const widget = activeApplicationPackage?.graphicsWidgets?.[layer?.widget];
  const renderer = widget?.render;
  if (renderer) {
    if (typeof widget.tooltipAt === "function") {
      previewCanvas.graphicsTooltipAt = (x, y) => widget.tooltipAt(previewContext, x, y);
    }
    const sourcePath = scene.inputs?.find((entry) => entry.id === layer.input)?.source?.path;
    const bindingPath = typeof sourcePath === "string" ? sourcePath.split(".").filter(Boolean) : [];
    const withinSource = bindingPath.every((key, index) => selectionPath[index] === key);
    const sourceSelectedScene = withinSource && selectionPath[bindingPath.length] === "scenes"
      ? selectionPath[bindingPath.length + 1] : undefined;
    const selectedScene = schemaGraphicsContext({
      graphicsConsole: model?.["x-fullmeta-ui-graphicsConsole"],
      selection: selectedSchemaProjection,
      schemaValue: settingsDraft,
    })?.sceneId || sourceSelectedScene;
    renderer({
      context: previewContext,
      value: inputs[layer.input],
      title: model?.title || model?.$id || "JSON Schema",
      width, height, selectedScene,
    });
    return;
  }
  previewContext.fillStyle = "#c7d9e8";
  previewContext.font = "600 18px system-ui, sans-serif";
  previewContext.textAlign = "center";
  previewContext.fillText(model?.title || "JSON Schema", width / 2, height / 2 - 14, Math.max(1, width - 32));
  previewContext.fillStyle = "#86a4bc";
  previewContext.font = "12px system-ui, sans-serif";
  const location = selectedPath?.length ? selectedPath.join(" / ") : model?.$id || "";
  previewContext.fillText(location, width / 2, height / 2 + 14, Math.max(1, width - 32));
}

/**
 * An interpreter package for JSON Schema documents. Its presentation comes
 * from the document's x-fullmeta-schema, with no application-specific runtime.
 */
export async function createSchemaDocumentPackage({ model, modelLocation, rootUrl = workspaceUrl } = {}) {
  if (!model || !modelLocation) throw new Error("Choose a JSON Schema document to open.");
  requireSelfContainedSchema(model);
  if (Object.hasOwn(model, "x-fullmeta-schemaWidgetConfig")) {
    throw new Error("x-fullmeta-schemaWidgetConfig is retired. Move widget authoring profiles to the interpreter's x-fullmeta-ui-schemaAuthoring subtree.");
  }
  const interpreter = await loadSchemaDocumentInterpreter(model, modelLocation, rootUrl);
  const schema = interpreter.schema;
  const modelFile = packagePath(modelLocation, rootUrl);
  const widgetCatalog = await loadWidgetCatalogs({ schema: model, schemaUrl: new URL(modelFile, rootUrl), rootUrl, loadJson: loadWorkspaceJson });
  let applicationSchemaRuntimeIssue = null;
  const declaredApplicationId = schema?.properties?.application?.const;
  if (typeof declaredApplicationId === "string"
    && schema?.["x-fullmeta-runtime"]?.schema === "fullmeta-model-runtime/1") {
    try {
      const catalog = await loadApplicationCatalog();
      const registration = catalog.applications.find(application => application.id === declaredApplicationId);
      if (!registration) {
        applicationSchemaRuntimeIssue = () => `Application ${declaredApplicationId} has no valid catalog.json descriptor.`;
      } else if (!registration.runtimePackage) {
        applicationSchemaRuntimeIssue = () => `Application ${declaredApplicationId} has no registered runtime package.`;
      } else {
        const packageModule = await import(applicationModuleUrl(registration.package).href);
        if (typeof packageModule.schemaRuntimeIssue === "function") {
          applicationSchemaRuntimeIssue = packageModule.schemaRuntimeIssue;
        }
      }
    } catch (error) {
      applicationSchemaRuntimeIssue = () => `Could not load the registered application runtime checks: ${error.message}`;
    }
  }
  let schemaApplicationPackagePromise = null;
  let schemaApplicationPackageFingerprint = "";
  async function schemaApplicationPackage(document) {
    const applicationId = document?.properties?.application?.const;
    if (typeof applicationId !== "string" || !applicationId
      || document?.["x-fullmeta-runtime"]?.schema !== "fullmeta-model-runtime/1") return null;
    const fingerprint = JSON.stringify(document);
    if (!schemaApplicationPackagePromise || schemaApplicationPackageFingerprint !== `${applicationId}:${fingerprint}`) {
      schemaApplicationPackageFingerprint = `${applicationId}:${fingerprint}`;
      schemaApplicationPackagePromise = (async () => {
        const catalog = await loadApplicationCatalog();
        const registration = catalog.applications.find(application => application.id === applicationId);
        if (!registration?.runtimePackage) return null;
        const schemaLocation = new URL(modelFile, rootUrl);
        const schemaFilename = decodeURIComponent(schemaLocation.pathname.split("/").at(-1));
        const probeModel = { application: applicationId, "x-fullmeta-schema": schemaFilename };
        const packageModule = await import(applicationModuleUrl(registration.package).href);
        if (typeof packageModule.createApplicationPackage !== "function") {
          throw new Error(`Registered package for ${applicationId} does not provide createApplicationPackage.`);
        }
        const { createApplicationPackage } = packageModule;
        return createApplicationPackage({ model: probeModel, modelLocation: schemaLocation });
      })();
    }
    return schemaApplicationPackagePromise;
  }
  async function schemaProjectConfiguration(document) {
    const applicationPackage = await schemaApplicationPackage(document);
    if (!applicationPackage) return { choiceConfig: {}, choices: [], description: "", projectRootFolder: "projects" };
    const createsProjectFolder = Boolean(document?.["x-fullmeta-runtime"]?.editorApi?.projectCreate?.route);
    return {
      choiceConfig: applicationPackage.modelEditorUi?.newModel || {},
      choices: modelEditorNewModelChoices(applicationPackage.modelEditorUi,
        applicationPackage.scenarioMetadata?.profiles || []),
      description: createsProjectFolder
        ? "Create a project folder with an initial model from the selected profile."
        : applicationPackage.modelEditorUi?.newModel?.description || "",
      projectRootFolder: applicationPackage.modelEditorUi?.projectRootFolder || "projects",
      createsProjectFolder,
    };
  }
  async function createSchemaProject({ requestJson, schemaDocument, projectId, profileId, folder, file }) {
    if (typeof requestJson !== "function") throw new Error("The editor cannot create this project document.");
    const applicationPackage = await schemaApplicationPackage(schemaDocument);
    if (applicationPackage) {
      const projectContract = schemaDocument?.["x-fullmeta-runtime"]?.editorApi?.projectCreate;
      const projectEndpoint = typeof projectContract === "string" ? projectContract : projectContract?.route;
      const apiName = applicationPackage.modelEditorUi?.newModel?.api;
      const apiContract = schemaDocument?.["x-fullmeta-runtime"]?.editorApi?.[apiName];
      const endpoint = typeof apiContract === "string" ? apiContract : apiContract?.route;
      if (!projectEndpoint && !endpoint) throw new Error("The active package does not declare a creation endpoint.");
      const projectRoot = schemaDocument?.["x-fullmeta-runtime"]?.storage?.projectRootFolder || folder;
      const modelFolder = projectEndpoint ? `${projectRoot.replace(/\/$/, "")}/${projectId}` : folder;
      const value = applicationPackage.createModelDocument({ modelId: projectId, profileId, folder: modelFolder });
      return requestJson(projectEndpoint || endpoint, {
        method: "POST", headers: {
          "content-type": "application/json",
          "x-fullmeta-application": schemaDocument.properties.application.const,
          "x-fullmeta-model-schema": encodeURIComponent(modelFile),
        },
        body: JSON.stringify(projectEndpoint
          ? { projectId, profileId, model: value }
          : { modelId: projectId, folder, file, model: value }),
      });
    }
    const value = createSchemaBasedProject(schemaDocument, {
      projectId,
      schemaReference: relativeWorkspacePath(folder, modelFile),
      makeId: base => `${base}-${crypto.randomUUID()}`,
      makeName: (_path, base) => base,
    });
    const documentPath = [folder === "." ? "" : folder, file].filter(Boolean).join("/");
    return requestJson("/api/program/document/create", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ file: documentPath, value }),
    });
  }
  // Field-targeted behavior always configures project editing. Schema-authoring
  // behavior belongs to the widget-targeted profiles in the interpreter tree.
  const fieldUiContext = "projectEditing";
  const authoringWidgetCatalog = await loadWidgetCatalogs({ schema, schemaUrl: interpreter.schemaUrl, rootUrl, loadJson: loadWorkspaceJson });
  const schemaTreeDescriptor = schemaAuthoringTree(schema, authoringWidgetCatalog);
  const schemaEditorPresentation = declaredSchemaAuthoringPresentation(schema, authoringWidgetCatalog) || { widgets: {} };
  schemaEditorPresentation.tools = declaredSchemaAuthoringTools(schemaEditorPresentation, { widgetCatalog: authoringWidgetCatalog });
  schemaEditorPresentation.documentWidgets = declaredDocumentWidgets(schemaEditorPresentation)
    .map(widget => ({ ...widget, initialValue: minimalDocumentWidgetValue(widget, schema) }));
  const authoringModes = new Set(["tree", "configuredArray", "schemaValueForm", "annotationForm"]);
  for (const [widget, profile] of Object.entries(schemaEditorPresentation.widgets || {})) {
    const authoring = profile?.authoring;
    if (!isRecord(profile) || typeof profile.annotation !== "string" || !profile.annotation
      || !authoringModes.has(authoring?.mode)) {
      throw new Error(`Schema widget ${widget} needs a supported authoring mode and annotation.`);
    }
    const contractReference = authoring?.validationContractUrl || authoring?.validationContract;
    if (!contractReference) continue;
    const contractUrl = authoring.validationContractUrl
      ? new URL(authoring.validationContractUrl)
      : new URL(contractReference, interpreter.schemaUrl);
    const contract = await loadWorkspaceJson(contractUrl, rootUrl);
    if (!isRecord(contract) || !isRecord(contract.properties?.[profile.annotation])) {
      throw new Error(`Widget contract ${authoring.validationContract} does not declare ${profile.annotation}.`);
    }
    authoring.validationContractDocument = contract;
  }
  const graphicsWidgets = declaredGraphicsWidgets(schema);
  const graphicsConsole = declaredGraphicsConsole(schema, graphicsWidgets);
  const modelEditorUi = declaredModelEditorUi(schema);
  const annotationCatalog = await declaredAnnotationCatalog(schema, rootUrl);
  const schemaVariantProviders = await declaredSchemaVariantProviders(model, modelLocation, rootUrl, schemaEditorPresentation);
  const schemaVariantCopy = Object.fromEntries(Object.entries(schemaEditorPresentation.widgets || {})
    .map(([widget, profile]) => [widget, profile?.authoring?.variantEditor?.copyPath])
    .filter(([, path]) => path !== undefined)
    .map(([widget, path]) => [widget, configuredSchemaValue(model, path)])
    .filter(([, copy]) => isRecord(copy))
    .map(([widget, copy]) => [widget, structuredClone(copy)]));
  const defaultGraphicsWidget = graphicsConsole.scenes[graphicsConsole.defaultScene].surface.widget;
  if (!graphicsWidgets[defaultGraphicsWidget]) {
    throw new Error(`Schema document Graphics widget ${defaultGraphicsWidget} is not registered.`);
  }
  const schemaReadiness = document => {
    const entries = schemaAuthoringReadiness(document);
    const issue = applicationSchemaRuntimeIssue?.(document) || "";
    if (!issue) return entries;
    return entries.map(entry => entry.id === "runtime"
      ? { ...entry, ready: false, issue }
      : entry.id === "creation" && entry.ready
        ? { ...entry, ready: false, issue }
        : entry);
  };

  return {
    id: "schema-document",
    kind: "schemaDocument",
    rootDocumentFile: modelFile,
    schemaSourceFiles(rootDocument = model) {
      return isRecord(rootDocument) ? [{ file: modelFile, value: rootDocument }] : [];
    },
    schemaEditorEffectiveProperties(value, sourcePath) {
      if (schemaEditorPresentation.effectiveProperties !== true || !Array.isArray(sourcePath)) return [];
      if (!isRecord(value?.properties)) return [];
      return Object.entries(value.properties).map(([name, schema]) => ({
        name, schema, file: modelFile, path: [...sourcePath, "properties", name], scope: "inline",
      }));
    },
    requiresServerCompatibility: false,
    schemaPath: packagePath(interpreter.schemaUrl, rootUrl),
    schemaEditorPresentation,
    fieldUiContext,
    manifest: {
      id: "schema-document",
      name: schema["x-fullmeta-ui-program"]?.name || schema.title || "Schema document",
      graphicsWidgets: Object.keys(graphicsWidgets),
      defaultGraphicsWidget,
    },
    modelSchema: schema,
    schemaDocuments: interpreter.schemaDocuments,
    modelEditorSchema: interpreter.modelEditorSchema,
    modelEditorUi,
    annotationCatalog,
    widgetCatalog,
    authoringWidgetCatalog,
    schemaVariantProviders,
    schemaVariantCopy,
    graphicsWidgets,
    graphicsConsole,
    scenarioMetadata: { profiles: [] },
    engineCapabilities: {},
    uiProfileSchema: emptyProfileSchema,
    uiProfileExtensionSchema: null,
    defaultUiProfile: {
      ui: {}, behavior: { tree: {} },
      copy: {
        geometryPreviewSummary: "Schema document",
        fieldOverlayNote: "Select a tree item to inspect the schema.",
      },
    },
    actionBindings: [{ id: "document.validate", label: "Validate", selector: "#validate" }],
    actions(services) { return { "document.validate": () => services.validate() }; },
    rootLabel(document) { return document?.title || document?.$id?.split("/").at(-1) || "JSON Schema"; },
    treeDescriptorForModel(document, descriptor = schemaTreeDescriptor) {
      const effectiveDescriptor = descriptor?.children?.some(child => child?.role === "schemaDeclarations")
        ? descriptor : schemaTreeDescriptor;
      const resolved = resolveTreeDescriptor(hideSchemaAuthoringTreeNode(effectiveDescriptor), { model: document });
      for (const child of resolved?.children || []) {
        if (child.role === "schemaDeclarations") {
          child.projection = projectSchemaDeclarations(document, modelFile, child);
        }
      }
      return resolved;
    },
    treeActionPlans(context) {
      const plan = createSchemaTreeActionPlans({
        ...context,
        descriptor: schemaTreeDescriptor,
        itemFactories: context.factories || {},
      });
      return {
        ...plan,
        actionAvailability(action, target) {
          if (action !== "schema.duplicateItem" && action !== "schema.renameTitle"
            && action !== "schema.addChildItem" && action !== "schema.deleteItem"
            && action !== "schema.promoteTreeChildren"
            && action !== "schema.moveTreeItemUp" && action !== "schema.moveTreeItemDown") return null;
          const path = target?.itemPath;
          const value = Array.isArray(path)
            ? path.reduce((current, key) => current?.[key], context.model) : undefined;
          if (action === "schema.promoteTreeChildren") {
            const descriptorPath = treeDescriptorPathForTarget(context.model, target);
            const reason = descriptorPath
              ? schemaTreePromotionIssue(context.model, descriptorPath)
              : "Select a display group or generated Model object root.";
            return { disabled: Boolean(reason), reason };
          }
          if (action === "schema.moveTreeItemUp" || action === "schema.moveTreeItemDown") {
            const descriptorPath = treeDescriptorPathForTarget(context.model, target);
            const direction = action === "schema.moveTreeItemUp" ? "up" : "down";
            const reason = descriptorPath
              ? schemaTreeMoveIssue(context.model, descriptorPath, direction)
              : "Select a project-tree item to move.";
            return { disabled: Boolean(reason), reason };
          }
          if (action === "schema.deleteItem") {
            const reason = schemaTreeDeleteIssue(context.model, path);
            return { disabled: Boolean(reason), reason };
          }
          const available = action === "schema.renameTitle"
            ? Array.isArray(path) && isRecord(value)
            : action === "schema.addChildItem"
              ? Array.isArray(path) && isRecord(value)
                && ((Array.isArray(value.path) && Array.isArray(value.children) && !value.role)
                  || (isSchemaTreeDeclaration(context.model, path)
                    && (!value.type || value.type === "object" || value.type === "array")))
              : path?.length > 0 && value !== null && typeof value === "object";
          return {
            disabled: !available,
            reason: available ? "" : action === "schema.renameTitle"
              ? "Only object declarations have an editable Title field."
              : action === "schema.addChildItem"
                ? "Add item needs an object or array schema declaration or a schema tree group."
                : "Select an object or array declaration in this schema file.",
          };
        },
        inlineEditForAction(action) {
          return action === "schema.renameTitle" ? { field: "title" } : null;
        },
        executeAction(action, target, input = {}) {
          if (action === "schema.renameTitle") {
            const result = schemaWithRenamedTitle(context.model, target?.itemPath, input.title);
            return { ...result, validate: true,
              message: `Renamed to ${result.label}. Save to keep the change.` };
          }
          if (action === "schema.addChildItem") {
            const result = input.operation === "edit-existing-structure"
              ? schemaWithEditedStructureFields(context.model, target?.itemPath, input.edits)
              : input.operation
              ? schemaWithAuthoringOperation(context.model, target?.itemPath, {
                ...input,
                binding: target?.schemaProjection?.binding || input.binding || [],
              })
              : schemaWithAddedChildItem(context.model, target?.itemPath);
            return { ...result, validate: true,
              message: input.operation === "edit-existing-structure"
                ? `Updated ${result.label} in the schema. Save to keep the change.`
                : input.operation === "collection-item-policy"
                ? `Updated ${result.label} item storage. Save the schema to keep the change.`
                : input.operation
                ? `Added ${result.label} to the schema. Save to keep the change.`
                : "Added New item beneath the selected tree item. Edit its settings and Save to keep it." };
          }
          if (action === "schema.deleteItem") {
            const result = schemaWithDeletedTreeItem(context.model, target?.itemPath);
            return { ...result, validate: true,
              message: `Deleted ${result.deletedLabel}. Save to keep the change.` };
          }
          if (action === "schema.promoteTreeChildren") {
            const descriptorPath = treeDescriptorPathForTarget(context.model, target);
            if (!descriptorPath) throw new Error("Select a display group or generated Model object root.");
            const result = schemaWithPromotedTreeChildren(context.model, descriptorPath);
            return { ...result, validate: true,
              message: `Moved ${result.promotedCount} tree item(s) up one level. Save to keep the change.` };
          }
          if (action === "schema.moveTreeItemUp" || action === "schema.moveTreeItemDown") {
            const descriptorPath = treeDescriptorPathForTarget(context.model, target);
            if (!descriptorPath) throw new Error("Select a project-tree item to move.");
            const direction = action === "schema.moveTreeItemUp" ? "up" : "down";
            const result = schemaWithMovedTreeItem(context.model, descriptorPath, direction);
            return { ...result, validate: true,
              message: `Moved ${result.label} ${direction}. Save to keep the change.` };
          }
          if (action !== "schema.duplicateItem") return null;
          const result = duplicateSchemaMember(context.model, target?.itemPath);
          return {
            ...result,
            message: `Duplicated ${String(target.itemPath.at(-1))} as ${result.label}. Edit the copy and Save to keep it.`,
          };
        },
      };
    },
    createWidgetRenderers: () => ({}),
    renderPreview: renderSchemaPreview,
    async validateDocument({ value, validate } = {}) {
      return typeof validate === "function"
        ? validate(value)
        : interpreter.modelEditorSchema.validateFullMetaModel(value);
    },
    saveDocument({ requestJson, folder, file, value, expectedHash, copyName }) {
      if (typeof requestJson !== "function") throw new Error("The editor cannot save this JSON document.");
      if (typeof expectedHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(expectedHash)) {
        throw new Error("Reopen this JSON document before saving.");
      }
      const documentPath = [folder === "." ? "" : folder, file].filter(Boolean).join("/");
      return requestJson("/api/program/document/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          file: documentPath, value, expectedHash,
          ...(copyName === undefined ? {} : { copyName }),
        }),
      });
    },
    createModelDocument({ application, folder, file }) {
      const workspacePath = [folder === "." ? "" : folder, file].filter(Boolean).join("/");
      const interpreterPath = packagePath(interpreter.schemaUrl, rootUrl);
      const up = folder === "." ? "" : `${folder.split("/").map(() => "..").join("/")}/`;
      const schemaDocument = structuredClone(emptySchemaTemplate);
      schemaDocument["x-fullmeta-schema"] = `${up}${interpreterPath}`;
      schemaDocument.application = application;
      schemaDocument.$id = `https://fullmeta.local/${workspacePath}`;
      schemaDocument.title = "Untitled schema";
      schemaDocument.properties.application = { const: application, title: "Application" };
      schemaDocument.required = ["application"];
      return schemaDocument;
    },
    schemaReadiness,
    projectCreationIssue(document) {
      const runtimeDeclared = document?.["x-fullmeta-runtime"]?.schema === "fullmeta-model-runtime/1";
      if (!runtimeDeclared) return genericProjectCreationIssue(document);
      return schemaReadiness(document).find(entry => entry.id === "creation" && !entry.ready)?.issue || "";
    },
    schemaProjectConfiguration,
    createSchemaProject,
    async createProjectDocument({ schemaDocument, projectId, profileId, folder }) {
      const applicationPackage = await schemaApplicationPackage(schemaDocument);
      if (applicationPackage) {
        if (typeof applicationPackage.createModelDocument !== "function") {
          throw new Error("The registered application package does not provide project initialization for this schema.");
        }
        return applicationPackage.createModelDocument({ modelId: projectId, profileId, folder });
      }
      return createSchemaBasedProject(schemaDocument, {
        projectId,
        schemaReference: relativeWorkspacePath(folder, modelFile),
        makeId: base => `${base}-${crypto.randomUUID()}`,
        makeName: (_path, base) => base,
      });
    },
    createDocument({ requestJson, endpoint, folder, file, value }) {
      if (typeof requestJson !== "function") throw new Error("The editor cannot create this JSON document.");
      const documentPath = [folder === "." ? "" : folder, file].filter(Boolean).join("/");
      return requestJson(endpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: documentPath, value }),
      });
    },
    prepareModelForEditor(source) { return { model: structuredClone(source), profile: null, appliedDefault: null }; },
    resolveResourceUrl(path) { return resourceUrl(path, rootUrl); },
  };
}
