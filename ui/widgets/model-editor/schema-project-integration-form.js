// Generated from schema-project-integration-form.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { StructuredValueEditor, structuredValueDraft, readStructuredValueDraft } from "../shared/structured-value-editor.js";
import { projectIntegrationDefaults } from "./schema-project-integration-authoring.js";
import { catalogGraphicsRegistration, loadWidgetCatalogs, sharedWidgetCatalog } from "../shared/catalog.js";
import { CandidateField, CandidateRows, draftProperty, withDraftProperty } from "./candidate-dialog.js";
const fields = [
  ["Project storage", ["modelFile", "projectRootFolder", "runsDirectory", "resultsDirectory", "reservedDirectories"]],
  ["Runtime resources and creation", ["resourcesRoot", "uiProfileSchema", "uiProfileExtensionSchema", "modelCreateRoute", "projectCreateRoute", "defaultProfileId"]],
  ["Default Graphics scene", ["defaultScene", "sceneLabel", "surfaceWidget", "inputPath", "layerHandler"]]
];
const groups = [
  ["externalPrograms", "External executable registry", ["id", "executable", "pathType", "allowedEntries"]],
  ["resultAdapters", "Result adapters", ["selector", "path"]],
  ["compatibility", "Runtime compatibility", ["key", "label", "capabilityPath", "value"]],
  ["capabilityFacts", "Capability facts", ["path", "kind", "value"]],
  ["widgets", "Registered Graphics widgets", ["id", "kind", "label", "registrationFile", "registrationSymbol", "registrationLabel"]],
  ["validationBoundaries", "Runtime validation boundaries", ["id", "inputs", "declared", "ensure"]]
];
const profileGroups = [
  ["profiles", "Embedded profile presentation", ["id", "materialName", "sweepResultQuantities"]],
  ["fieldRows", "Profile field variables", ["profileId", "formulation", "role", "symbol", "unit", "solverFamily", "solverAxis", "zeroInDimensions"]],
  ["materialRows", "Profile material templates", ["profileId", "key", "symbol", "label", "unit", "representation", "defaultExpression", "defaultUnit", "optional", "plottable", "implementedValues", "description"]],
  ["annotationFacts", "Profile annotation facts", ["profileIds", "annotation", "path", "repeatKeys", "kind", "value", "unit"]]
];
const labels = { modelFile: "Model filename", projectRootFolder: "Project root folder", runsDirectory: "Runs directory", resultsDirectory: "Results directory", reservedDirectories: "Reserved folders (comma separated)", resourcesRoot: "Resources root", uiProfileSchema: "UI profile schema", uiProfileExtensionSchema: "Profile extension schema", modelCreateRoute: "Model create route", projectCreateRoute: "Project create route", defaultProfileId: "Default profile", defaultScene: "Scene ID", sceneLabel: "Scene label", surfaceWidget: "Surface widget", inputPath: "Model input path (dot separated)", layerHandler: "First layer handler" };
const choices = { pathType: ["relative", "absolute", "system"], role: ["primary", "derived", "zero"], representation: ["expression", "quantity"], optional: ["", "true", "false"], plottable: ["", "true", "false"] };
function ProjectIntegrationForm({ model, commands }) {
  const graphics = model.available.widgets.filter((widget) => widget.graphics), profile = draftProperty(model.draft, "profileIntegration");
  const group = (name, title, columns, node = model.draft, update = commands.change) => /* @__PURE__ */ React.createElement(CandidateRows, { key: name, draft: draftProperty(node, name) || structuredValueDraft([]), label: title, columns: columns.map((name2) => ({ name: name2, choices: choices[name2] })), template: Object.fromEntries(columns.map((name2) => [name2, name2 === "ensure" ? true : name2 === "declared" ? false : ""])), onDraftChange: (value) => update(withDraftProperty(node, name, value)) });
  return /* @__PURE__ */ React.createElement("section", { "data-jsx-widget": "project-integration" }, /* @__PURE__ */ React.createElement("p", null, "Connect this schema to storage, executable routes, capability facts, profile presentation and registered Graphics widgets."), fields.map(([title, names]) => /* @__PURE__ */ React.createElement("fieldset", { key: title }, /* @__PURE__ */ React.createElement("legend", null, title), names.map((name) => /* @__PURE__ */ React.createElement(CandidateField, { key: name, draft: model.draft, name, label: labels[name], choices: name === "defaultProfileId" ? ["", ...model.defaults.profileChoices] : name === "surfaceWidget" ? ["", ...new Set([...graphics.map((widget) => widget.id), draftProperty(model.draft, name)?.value].filter(Boolean))] : void 0, onDraftChange: commands.change })))), /* @__PURE__ */ React.createElement("fieldset", null, /* @__PURE__ */ React.createElement("legend", null, "Widget catalogs"), /* @__PURE__ */ React.createElement(StructuredValueEditor, { draft: draftProperty(model.draft, "widgetCatalogs"), label: "Widget catalog paths", onDraftChange: (value) => commands.change(withDraftProperty(model.draft, "widgetCatalogs", value)) }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.loadCatalogs }, "Load catalogs"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Available catalog widgets", value: model.selectedWidget, onChange: (event) => commands.selectWidget(event.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose widget"), model.available.widgets.map((widget) => /* @__PURE__ */ React.createElement("option", { key: widget.id, value: widget.id }, widget.label, " \xB7 ", widget.catalogLabel))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !graphics.some((widget) => widget.id === model.selectedWidget), onClick: commands.useWidget }, "Use catalog Graphics widget"), /* @__PURE__ */ React.createElement("p", { role: "status" }, model.status)), /* @__PURE__ */ React.createElement(CandidateField, { draft: model.draft, name: "capabilityAnnotation", label: "Capability annotation key", onDraftChange: commands.change }), groups.map((args) => group(...args)), model.defaults.profileIntegration.source ? profileGroups.map((args) => group(...args, profile, (draft) => commands.change(withDraftProperty(model.draft, "profileIntegration", draft)))) : null, model.error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, model.error) : null);
}
const mounted = /* @__PURE__ */ new WeakMap();
function projectIntegrationInputValue(value) {
  const { applicationId, profileChoices, ...input } = structuredClone(value);
  input.widgetCatalogs = input.widgetCatalogs.map((path) => {
    if (typeof path !== "string") throw new Error("Widget catalog paths must be text.");
    return path.trim();
  }).filter(Boolean);
  input.validationBoundaries = input.validationBoundaries.map(({ id, inputs, ensure }) => ({ id, inputs, ensure }));
  for (
    const [key, fields2] of
    /** @type {[string,string[]][]} */
    [["resultAdapters", ["selector", "path"]], ["widgets", ["id", "kind", "label", "registrationFile", "registrationSymbol"]], ["externalPrograms", ["id", "executable", "allowedEntries"]], ["compatibility", ["key", "label", "capabilityPath", "value"]], ["capabilityFacts", ["path", "value"]]]
  ) input[key] = input[key].filter((row) => fields2.some((field) => row[field]));
  input.profileIntegration.fieldRows = input.profileIntegration.fieldRows.filter((row) => row.symbol || row.unit);
  input.profileIntegration.materialRows = input.profileIntegration.materialRows.filter((row) => row.key || row.symbol || row.label);
  input.profileIntegration.annotationFacts = input.profileIntegration.annotationFacts.filter((row) => row.annotation || row.path || row.value);
  return input;
}
function renderProjectIntegrationForm(host, documentValue, invalidate, { schemaPath = "", widgetCatalog = sharedWidgetCatalog } = {}) {
  mounted.get(host)?.dispose();
  const defaults = projectIntegrationDefaults(documentValue);
  if (!defaults) throw new Error("Declare an application ID before configuring project integration.");
  const schemaUrl = new URL(schemaPath, new URL("../../../../", import.meta.url));
  const input = { ...defaults, validationBoundaries: defaults.validationBoundaries.map((row) => ({ id: row.id, inputs: row.inputs, declared: row.declared, ensure: !row.declared && row.ensure !== false })), profileIntegration: { profiles: defaults.profileIntegration.profiles, fieldRows: defaults.profileIntegration.fieldRows, materialRows: defaults.profileIntegration.materialRows.map((row) => ({ ...row, optional: row.optional === void 0 ? "" : String(row.optional), plottable: row.plottable === void 0 ? "" : String(row.plottable) })), annotationFacts: defaults.profileIntegration.annotationFacts } };
  let model = { defaults, draft: structuredValueDraft(input), available: widgetCatalog, selectedWidget: "", status: "", error: "" }, mount, epoch = 0;
  const render = () => mount.update({ model, commands });
  const commands = { change(draft) {
    epoch++;
    model = { ...model, draft, error: "" };
    invalidate();
    render();
  }, selectWidget(id) {
    model.selectedWidget = id;
    render();
  }, async loadCatalogs() {
    const version = ++epoch;
    try {
      const paths = readStructuredValueDraft(draftProperty(model.draft, "widgetCatalogs"));
      const available = await loadWidgetCatalogs(
        /** @type {any} */
        { schema: { "x-fullmeta-ui-graphicsInterfaces": paths.length ? { catalogs: paths } : {} }, schemaUrl }
      );
      if (version !== epoch) return;
      model = { ...model, available, status: `${available.widgets.length} widgets available.`, error: "" };
    } catch (error) {
      if (version !== epoch) return;
      model.error = error.message;
    }
    render();
  }, useWidget() {
    try {
      const widget = model.available.widgets.find((widget2) => widget2.id === model.selectedWidget);
      if (!widget?.graphics) throw new Error("Choose a Graphics widget.");
      const entry = catalogGraphicsRegistration(widget, schemaUrl), node = draftProperty(model.draft, "widgets"), values = readStructuredValueDraft(node), index = values.findIndex((value) => value.id === entry.id);
      if (index < 0) values.push(entry);
      else values[index] = { ...values[index], ...entry };
      commands.change(withDraftProperty(model.draft, "widgets", structuredValueDraft(values)));
    } catch (error) {
      model.error = error.message;
      render();
    }
  } };
  mount = mountReactComponent(host, ProjectIntegrationForm, { model, commands });
  const api = { read: () => projectIntegrationInputValue(readStructuredValueDraft(model.draft)), snapshot: () => structuredClone(model.draft), restore(draft) {
    model.draft = structuredClone(draft);
    render();
  }, dispose() {
    epoch++;
    mount.dispose();
    mounted.delete(host);
  } };
  mounted.set(host, api);
  return api;
}
function projectIntegrationFormInput(host) {
  const form = mounted.get(host);
  if (!form) throw new Error("Open project integration controls before reading them.");
  return form.read();
}
function snapshotProjectIntegrationForm(host) {
  return mounted.get(host)?.snapshot() || null;
}
function restoreProjectIntegrationForm(host, draft) {
  const form = mounted.get(host);
  if (!form) throw new Error("Open project integration controls before restoring their draft.");
  form.restore(draft);
}
export {
  ProjectIntegrationForm,
  projectIntegrationFormInput,
  projectIntegrationInputValue,
  renderProjectIntegrationForm,
  restoreProjectIntegrationForm,
  snapshotProjectIntegrationForm
};

//# sourceMappingURL=schema-project-integration-form.js.map
