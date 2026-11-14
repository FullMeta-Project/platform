import { genericGraphicsWidgets, graphicsConsoleIssues, graphicsSceneInputs, graphicsFocusTargets, graphicsSelectionRule } from "../graphics-console/widget.js";
import { drawSceneView, sceneViewRenderer } from "../scene-view/widget.js";
import { selectionHighlightPrimitives } from "../selection-highlight/widget.js";
import { resolveTreeDescriptor, createSchemaTreeActionPlans } from "../tree/widget.js";
import { loadSchemaDocumentInterpreter } from "./schema-document-interpreter.js";
import { resizeCanvasForDisplay } from "./canvas-size.js";
import { schemaItemTemplateFactory, schemaAuthoringReadiness,
  createSchemaBasedProject, genericProjectCreationIssue } from "./schema-project-initializer.js";
import { validateJsonSchema, validateModelWithRules, schemaAtPath, validateSchemaFragment } from "../../../model-rust/js/api.js";

const workspaceUrl = new URL("../../../../", import.meta.url);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const geometry = Object.freeze({ id: "geometry", kind: "geometry", dimensions: [2, 3],
  sceneRenderer: sceneViewRenderer });
const schemaProjectSceneView = Object.freeze({ ...sceneViewRenderer,
  dataSchema: "../scene-view/scene-view-data-1.schema.json",
  render: options => drawSceneView({ ...options, scene: options?.data || options?.scene }),
});
const hasReadyPlot1dSeries = series => Array.isArray(series) && series.some(entry =>
  Array.isArray(entry?.points) && entry.points.some(point => Array.isArray(point) && point.length >= 2
    && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))));
function graphicsControlAvailability({ scene, inputs = {} } = {}) {
  const availability = {};
  for (const layer of scene?.layers || []) {
    if (!layer.control || layer.widget !== "plot1d") continue;
    if (!hasReadyPlot1dSeries(inputs[layer.input]?.series)) {
      availability[layer.control] = { disabled: true, reason: "No ready plot data is available." };
    }
  }
  return availability;
}

function workspacePath(url) {
  const root = new URL("./", workspaceUrl);
  const target = new URL(url);
  if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) {
    throw new Error("The model schema must stay inside the FullMeta workspace.");
  }
  return decodeURIComponent(target.pathname.slice(root.pathname.length));
}

function relativePath(fromFolder, toFile) {
  const from = String(fromFolder || ".").replaceAll("\\", "/").split("/").filter(part => part && part !== ".");
  const to = String(toFile).replaceAll("\\", "/").split("/").filter(Boolean);
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common++;
  return [...Array(from.length - common).fill(".."), ...to.slice(common)].join("/");
}

function pointerParts(pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith("#/")) throw new Error("The validation editor returned an invalid rule path.");
  return pointer.slice(2).split("/").map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function pathAt(value, path) { return path.reduce((current, part) => current?.[part], value); }

function sceneViewInputForSelection({ data, selectedPath, model, graphicsConsole, camera }) {
  if (!record(data) || !Array.isArray(data.primitives)) return data;
  const path = Array.isArray(selectedPath) ? selectedPath : [];
  const selected = pathAt(model, path);
  const rule = graphicsSelectionRule(graphicsConsole, { path, dimension: data.dimension, value: selected });
  if (!rule?.focus) return data;
  const focus = graphicsFocusTargets(graphicsConsole, rule, {
    model, selected, runtime: {}, view: { camera, selectedPath: path },
  });
  const overlay = selectionHighlightPrimitives(data.primitives, focus);
  return overlay.length ? { ...data, primitives: [...data.primitives, ...overlay] } : data;
}

function setAt(root, path, value) {
  if (!path.length) throw new Error("A project root cannot be replaced from a nested rule editor.");
  const candidate = structuredClone(root);
  let parent = candidate;
  for (const part of path.slice(0, -1)) {
    if (!parent || typeof parent !== "object" || !Object.hasOwn(parent, part)) {
      throw new Error("The validation program changed after the editor opened. Reopen it before applying this change.");
    }
    parent = parent[part];
  }
  const key = path.at(-1);
  if (!parent || typeof parent !== "object" || !Object.hasOwn(parent, key)) {
    throw new Error("The validation program changed after the editor opened. Reopen it before applying this change.");
  }
  parent[key] = structuredClone(value);
  return candidate;
}

function schemaReferenceOptions({ reference, currentValue, fieldLabel, fieldUi = {}, model,
  component, settingsDraft, formatChoiceLabel, formatItemLabel, copyText, schema } = {}) {
  const path = reference?.targetPath;
  if (!Array.isArray(path) || path.some(part => typeof part !== "string")) return null;
  const base = reference.scope === "model" || reference.scope === "root" ? model : component;
  if (!base) return null;
  let records = path.reduce((value, part) => value?.[part], base);
  if (records && typeof records === "object" && !Array.isArray(records)) records = [records];
  if (reference.throughSiblingReference) {
    const owner = (Array.isArray(records) ? records : []).find(item =>
      item?.id === settingsDraft?.[reference.throughSiblingReference]);
    records = owner?.[reference.targetSubcollection] || [];
  } else if (reference.targetSubcollection && Array.isArray(records)) {
    records = records.flatMap(item => item?.[reference.targetSubcollection] || []);
  }
  if (!Array.isArray(records)) return null;
  const property = reference.targetProperty || "id";
  const values = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];
  if (reference.uniqueWithinCollection) {
    const uniqueBase = reference.scope === "model" || reference.scope === "root" ? model : component;
    const uniquePath = Array.isArray(reference.uniqueWithinCollection)
      ? reference.uniqueWithinCollection : [reference.uniqueWithinCollection];
    const usedCollection = uniquePath.reduce((value, part) => value?.[part], uniqueBase);
    const used = new Set((Array.isArray(usedCollection) ? usedCollection : [])
      .filter(item => item?.id !== (reference.exceptSiblingProperty
        ? settingsDraft?.[reference.exceptSiblingProperty] : null))
      .map(item => item?.[reference.uniqueProperty || "id"]));
    records = records.filter(item => !used.has(item?.[property]) || values.includes(item?.[property]));
  }
  if (reference.targetSchema !== undefined) {
    records = records.filter(item => !validateSchemaFragment(item, reference.targetSchema, schema).length);
  }
  const options = [{
    value: "",
    label: fieldUi.emptyChoiceLabel || fieldUi.placeholder
      || reference.emptyChoiceLabel || copyText?.("chooseReferenceLabel", { targetLabel: reference.targetLabel || fieldLabel })
      || `Choose ${reference.targetLabel || fieldLabel}`,
  }];
  for (const item of records) {
    const value = item?.[property];
    if (value === undefined || value === null) continue;
    options.push({
      value: String(value),
      label: formatChoiceLabel?.(fieldUi.choiceLabelTemplate || reference.choiceLabelTemplate, item)
        || formatItemLabel?.(item, records) || String(item.name || value),
      ...(typeof item.description === "string" ? { description: item.description } : {}),
    });
  }
  for (const value of values.filter(entry => typeof entry === "string")) {
    if (!records.some(item => String(item?.[property]) === value)) {
      options.push({ value, label: copyText?.("unknownReferenceLabel", { value }) || `Unknown (${value})`, unavailable: true });
    }
  }
  return options;
}

/** Build the neutral editing package for models whose schema has no registered app adapter. */
export async function createSchemaProjectPackage({ model, modelLocation } = {}) {
  if (!record(model) || !modelLocation) throw new Error("Choose a schema-authored project model to open.");
  const interpreter = await loadSchemaDocumentInterpreter(model, modelLocation, workspaceUrl);
  const schema = interpreter.schema;
  // validate_json_schema requires the schema itself, unlike model operations
  // that accept the configured handle. Retain a detached validation input.
  const validationSchema = structuredClone(schema);
  const applicationId = schema.properties?.application?.const;
  if (applicationId !== model.application) throw new Error("The selected schema application identifier does not match this model.");
  const modelEditorSchema = {
    ...interpreter.modelEditorSchema,
    schemaAtPath: (value, path, options = {}) => schemaAtPath(value, path, options, schema),
    validateFullMetaModelWithRules: value => validateModelWithRules(value, {}, schema),
  };
  const graphicsWidgets = { geometry, ...genericGraphicsWidgets, sceneView: schemaProjectSceneView };
  const defaultGraphicsConsole = {
    schema: "fullmeta-graphics-console/1",
    defaultScene: "document",
    presentation: {
      axes: [["x", [1, 0, 0], "#e26976"], ["y", [0, 1, 0], "#55cbb7"]],
      widgets: { geometry: { label: "Project", showSceneControls: false } },
    },
    scenes: { document: { kind: "layered", surface: { widget: "geometry" }, layers: [] } },
  };
  const declaredGraphicsConsole = schema["x-fullmeta-ui-graphicsConsole"];
  if (declaredGraphicsConsole !== undefined) {
    if (!record(declaredGraphicsConsole)) throw new Error("Schema project Graphics console must be an object.");
    const issues = graphicsConsoleIssues(declaredGraphicsConsole, graphicsWidgets);
    if (issues.length) throw new Error(`Schema project Graphics console: ${issues[0]}`);
  }
  const graphicsConsole = structuredClone(declaredGraphicsConsole || defaultGraphicsConsole);
  let previewSequence = 0;
  let previewTableHost = null;
  let previewStatusHost = null;
  const modelEditorUi = {
    schema: "fullmeta-model-editor-ui/1",
    ...(schema["x-fullmeta-ui-modelEditor"]?.layout === undefined ? {} : {layout: structuredClone(schema["x-fullmeta-ui-modelEditor"].layout)}),
    roles: record(schema["x-fullmeta-ui-modelEditor"]?.roles)
      ? structuredClone(schema["x-fullmeta-ui-modelEditor"].roles) : {},
    panels: [], projectRootFolder: ".",
    ...(record(schema.properties?.model) ? { componentPath: ["model"] } : {}),
    newModel: { endpoint: "/api/program/document/create",
      description: "Create an empty project from this model schema's required fields, constants and defaults." },
    emptyState: { canvasLabel: "Schema-authored project", resolvedValues: "Select a tree item to edit project data." },
    controlCopy: { validateHelp: "Validate this project against its selected schema." },
  };
  const rootSchemaUrl = interpreter.schemaUrl;
  const schemaPath = workspacePath(rootSchemaUrl);
  const itemFactory = helpers => schemaItemTemplateFactory(schema, modelEditorSchema, helpers);
  const packageValue = {
    id: applicationId, kind: "schemaProject", schemaPath, rootDocumentFile: null,
    requiresServerCompatibility: false,
    manifest: { id: applicationId, name: schema.title || applicationId,
      graphicsWidgets: Object.keys(graphicsWidgets),
      defaultGraphicsWidget: graphicsConsole.scenes?.[graphicsConsole.defaultScene]?.surface?.widget || "geometry" },
    modelSchema: schema, schemaDocuments: interpreter.schemaDocuments, modelEditorSchema,
    projectStorage: { modelFile: "model.json", runsDirectory: "runs", resultsDirectory: "results" },
    modelEditorUi, schemaAuthoringReadiness: () => schemaAuthoringReadiness(schema),
    graphicsWidgets, graphicsConsole, scenarioMetadata: { profiles: [] }, engineCapabilities: {},
    graphicsDimensionForModel(document, sceneId) {
      const scene = graphicsConsole.scenes?.[sceneId] || graphicsConsole.scenes?.[graphicsConsole.defaultScene];
      if (!scene) return null;
      const inputs = graphicsSceneInputs(scene, { model: document, selected: null, runtime: {}, view: {} });
      for (const layer of scene.layers || []) {
        if (layer.widget !== "sceneView") continue;
        const declaredInput = scene.inputs?.find(input => input.id === layer.input);
        const sourcePath = declaredInput?.source?.scope === "model"
          ? String(declaredInput.source.path || "").split(".").filter(Boolean) : [];
        const directData = pathAt(document, sourcePath);
        const modelRelativeData = sourcePath[0] === "model" ? pathAt(document, sourcePath.slice(1)) : undefined;
        const dimension = (inputs[layer.input] ?? directData ?? modelRelativeData)?.dimension;
        if (dimension === 2 || dimension === 3) return dimension;
      }
      return null;
    },
    scenarioDimensionForModel(document) {
      return this.graphicsDimensionForModel(document, graphicsConsole.defaultScene) ?? undefined;
    },
    uiProfileSchema: {}, uiProfileExtensionSchema: null,
    defaultUiProfile: { ui: {}, behavior: { tree: {}, graphics: {} }, copy: {} },
    treeDescriptorForModel(document, descriptor = schema["x-fullmeta-ui-tree"]) {
      return resolveTreeDescriptor(descriptor, { model: document });
    },
    treeBehavior: schema["x-fullmeta-ui-behavior"] || {},
    treeActionPlans(context) {
      return createSchemaTreeActionPlans({ ...context, descriptor: schema["x-fullmeta-ui-tree"],
        itemFactories: { schemaItemTemplate: itemFactory } });
    },
    editorFactories: { schemaItemTemplate: itemFactory },
    createResultTable: null,
    createWidgetRenderers: () => ({}),
    actions: services => ({'document.validate':()=>services.validate()}),
    actionBindings: [{id:'document.validate',label:'Validate',selector:'#validate'}],
    selectionActions: () => ({}),
    rootLabel: document => schema.title || document.application || "Project",
    validateFullMetaModel(value) { return validateJsonSchema(value, validationSchema); },
    validateDocument({ value } = {}) { return modelEditorSchema.validateFullMetaModelWithRules(value); },
    referenceOptions: options => schemaReferenceOptions({ ...options, schema }),
    prepareModelForEditor(source) { return { model: source, profile: null, appliedDefault: null }; },
    runtimeCompatibility: () => ({}),
    graphicsControlAvailability,
    resolveResourceUrl() { throw new Error("This schema has no registered application resource adapter."); },
    renderPreview({ previewCanvas, previewContext, model: value, selectedPath = [], activeGraphicsSceneId, camera, graphicsVisibility } = {}) {
      if (!previewCanvas || !previewContext) return;
      // Layout can request a preview before a document or selection is available.
      const path = Array.isArray(selectedPath) ? selectedPath : [];
      const { width, height } = resizeCanvasForDisplay(previewCanvas, previewContext);
      previewContext.fillStyle = "#0c141e"; previewContext.fillRect(0, 0, width, height);
      const sceneId = graphicsConsole.scenes?.[activeGraphicsSceneId]
        ? activeGraphicsSceneId : graphicsConsole.defaultScene;
      const scene = graphicsConsole.scenes?.[sceneId];
      const declaredLayers = (scene?.layers || []).filter(entry => graphicsWidgets[entry.widget]?.render);
      const layers = declaredLayers.filter(entry => typeof graphicsVisibility === "function"
        ? graphicsVisibility(entry.role || entry.id)
        : entry.defaultVisible !== false);
      const layer = layers.find(entry => graphicsWidgets[entry.widget]?.kind !== "table") || layers[0];
      const widget = graphicsWidgets[layer?.widget];
      const tableLayer = layers.find(entry => graphicsWidgets[entry.widget]?.kind === "table");
      if (previewTableHost?.isConnected) previewTableHost.remove();
      previewTableHost = null;
      if (previewStatusHost?.isConnected) previewStatusHost.remove();
      previewStatusHost = null;
      if (!layers.length && declaredLayers.length) {
        const statusHost = previewCanvas.parentElement?.ownerDocument?.createElement("div");
        if (statusHost) {
          statusHost.className = "schema-project-preview-status";
          statusHost.setAttribute("role", "status");
          statusHost.textContent = "No graphics layers are visible.";
          previewCanvas.insertAdjacentElement("afterend", statusHost);
          previewStatusHost = statusHost;
        }
        previewCanvas.setAttribute?.("aria-label", `${schema.title || "Schema-authored project"}: no graphics layers are visible`);
        return;
      }
      if (layer?.widget === "plot1d") {
        const plotInputs = graphicsSceneInputs(scene, {
          model: value,
          selected: path.reduce((entry, key) => entry?.[key], value),
        });
        if (!hasReadyPlot1dSeries(plotInputs[layer.input]?.series)) {
          const statusHost = previewCanvas.parentElement?.ownerDocument?.createElement("div");
          if (statusHost) {
            statusHost.className = "schema-project-preview-status";
            statusHost.setAttribute("role", "status");
            statusHost.textContent = "No ready plot data is available.";
            previewCanvas.insertAdjacentElement("afterend", statusHost);
            previewStatusHost = statusHost;
          }
        }
      }
      if (tableLayer && previewCanvas.parentElement?.ownerDocument) {
        const tableWidget = graphicsWidgets[tableLayer.widget];
        const tableInputs = graphicsSceneInputs(scene, {
          model: value,
          selected: path.reduce((entry, key) => entry?.[key], value),
        });
        const tableHost = previewCanvas.parentElement.ownerDocument.createElement("section");
        tableHost.className = "schema-project-table-output";
        tableHost.setAttribute("aria-label", tableLayer.label || "Project data table");
        const tableValue = tableInputs[tableLayer.input];
        tableHost.innerHTML = tableWidget.render({ view: tableValue?.view || tableValue?.data || tableValue });
        previewCanvas.insertAdjacentElement("afterend", tableHost);
        previewTableHost = tableHost;
      }
      if (widget?.render && layer.input) {
        const sequence = ++previewSequence;
        previewCanvas.setAttribute?.("aria-label", `${schema.title || "Schema-authored project"}: ${layer.label || layer.widget}`);
        const inputs = graphicsSceneInputs(scene, {
          model: value,
          selected: path.reduce((entry, key) => entry?.[key], value),
        });
        const data = widget.kind === "scene"
          ? sceneViewInputForSelection({ data: inputs[layer.input], selectedPath: path, model: value, graphicsConsole, camera })
          : inputs[layer.input];
        const draw = (size, retries = 0) => {
          if (sequence !== previewSequence) return;
          widget.render({ canvas: previewCanvas, data, title: schema.title || "Schema-authored project",
            ...(["scalarSurface", "scene"].includes(widget.kind) ? { view: camera || {} } : {}), ...size });
          if ((size.width <= 1 || size.height <= 1) && retries < 3) {
            const schedule = globalThis.requestAnimationFrame || (callback => globalThis.setTimeout(callback, 16));
            schedule(() => draw(resizeCanvasForDisplay(previewCanvas, previewContext), retries + 1));
          }
        };
        draw({ width, height });
        return;
      }
      previewCanvas.setAttribute?.("aria-label", schema.title || "Schema-authored project");
      previewContext.fillStyle = "#c7d9e8"; previewContext.font = "600 18px system-ui, sans-serif";
      previewContext.textAlign = "center"; previewContext.fillText(schema.title || "Schema-authored project", width / 2, height / 2 - 12, width - 32);
      previewContext.fillStyle = "#86a4bc"; previewContext.font = "12px system-ui, sans-serif";
      previewContext.fillText(path.length ? path.join(" / ") : `${Object.keys(value || {}).length} root fields`, width / 2, height / 2 + 16, width - 32);
    },
    validateProjectCreation() { return genericProjectCreationIssue(schema); },
    createProjectDocument({ projectId, folder, file }) {
      return createSchemaBasedProject(schema, {
        projectId,
        schemaReference: relativePath(folder, schemaPath),
        makeId: base => `${base}-${crypto.randomUUID()}`,
        makeName: (_path, base) => base,
      });
    },
    createModelDocument({ modelId, folder, file }) {
      return packageValue.createProjectDocument({ projectId: modelId, folder, file });
    },
    async saveDocument({ requestJson, folder, file, value, expectedHash, copyName }) {
      if (typeof expectedHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(expectedHash)) throw new Error("Reopen this project before saving.");
      const documentPath = [folder === "." ? "" : folder, file].filter(Boolean).join("/");
      return requestJson("/api/program/document/save", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: documentPath, value, expectedHash,
          ...(copyName === undefined ? {} : { copyName }) }),
      });
    },
    createDocument({ requestJson, folder, file, value }) {
      const documentPath = [folder === "." ? "" : folder, file].filter(Boolean).join("/");
      return requestJson("/api/program/document/create", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: documentPath, value }),
      });
    },
    applyProgramEdit(document, pointer, value) {
      const path = pointerParts(pointer);
      if (!path.length || path[0] !== "x-fullmeta-rules" && !/^x-fullmeta-.*Validation$/.test(path[0])) {
        throw new Error("Only a validation program declared at the schema root can be edited here.");
      }
      if (pathAt(document, path) === undefined) throw new Error("The validation program changed after the editor opened. Reopen it before applying this change.");
      return setAt(document, path, value);
    },
    schemaSources(document) { return [{ file: "schema", value: document }]; },
  };
  return packageValue;
}
