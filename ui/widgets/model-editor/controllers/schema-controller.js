// Generated from schema-controller.jsx by scripts/build-frontend.mjs.
import { validateBulkSchemaCandidate, applyBulkSchemaCandidate, validateGeneratedOverlayCandidate, validateFactoredSchemaCandidate, schemaAuthoringTools, openSchemaAuthoringTool, visibleSchemaAuthoringTools, renderSchemaAuthoringToolButtons, resolveSchemaWidgetPresentation, schemaUiWidgetOptions, schemaUiWidgetContexts, schemaValidationPointerPath, schemaValidationRulesForField, applySchemaUiAnnotation, applySchemaValidationExpression, openStructuredValidationRule, applicationSchemaApi, modelEditorSchemaForPath, modelEditorSchemaProperty, modelEditorSchemaItem, resolveModelEditorSchema, schemaAuthoringTargetForPropertyPath, selectSchemaAuthoringTargetPath, schemaAuthoringOptionsForTarget, schemaInspectionTargetPath, renderSchemaStructureInspection, schemaInspectionEdits, initializeSchemaAuthoringPreview, schemaAuthoringRelevantCode, closeSchemaAuthoringDialog, openSchemaAuthoringDialog, invalidateSchemaAuthoringPreview, schemaAuthoringFormInput, schemaGeneratedPathsWithin, schemaValidationProgramEntries, schemaDocumentWithProgramValue, applySchemaValidationProgramEdit, addSchemaValidationProgram, applySchemaAuthoringOperation, schemaChoiceSelectionKey, schemaChoiceApplies, flushSchemaChoiceEditor, schemaValueCompatibilityApplies, flushSchemaAnnotationEditor, flushSchemaUiEditor, flushSchemaGraphicsEditor, flushSchemaGlobalUiEditor, flushSchemaDraftEditors, refreshSelectedSchemaDeclarationLabel, schemaDocumentNumericFieldError, schemaActionFacingError, schemaArrayItemStructureLabel, selectedDocumentSchema, schemaVariantStatus, applySchemaComponentVariant, saveSchemaComponentVariant, resolveUiProfileSchemaReference, validateUiProfileSchema, schemaFieldContext, settingsSchemaHasChoiceDependency, schemaDocumentPointer, resetSchemaAuthoringEditors, schemaLocalDefinitionDialogTarget, syncSchemaStructureDialogHeader, currentSchemaStructureDialogTarget, schemaStructureDialogTargetIsCurrent, restoreSchemaStructureDialogParent, finishSchemaStructureDialog, navigateSchemaStructureDialog, backSchemaStructureDialog, openSchemaStructureDialog, showSchemaGraphicsContext, showSchemaGraphicsDesign, showSchemaGlobalUiDesign, renderSchemaTduvOverview } from "./schema-controller-actions.js";
import React from "../../shared/react/react-runtime.js";
import { renderOwnedView, joinView } from "../../../runtime/owned-view.js";
import { SchemaField, SchemaObject, SchemaStructure } from "../schema-form.js";
import { RowMoveControls } from "../../shared/react/collection-controls.js";
function schemaFieldUiSummary(sessionContext, schema, propertyIndex = null, propertyName = "", propertySource = null, editorOptions = {}) {
  const behavior = sessionContext.fieldUiBehavior(schema, { context: "projectEditing" });
  const presentation = behavior?.payload?.presentation || {};
  const widget = behavior?.payload?.widget;
  const modelReference = sessionContext.isRecord(schema?.["x-fullmeta-modelReference"]) ? schema["x-fullmeta-modelReference"] : null;
  const generatedOwner = sessionContext.activeApplicationPackage?.kind === "schemaDocument" && Array.isArray(propertySource?.path) ? sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, propertySource.path) : null;
  const canEditProperty = sessionContext.isRecord(schema) && Number.isInteger(propertyIndex) && !generatedOwner;
  if (!behavior && !modelReference && !canEditProperty) return { editorIndex: null, html: "" };
  const parts = [];
  const summarizePath = (value) => Array.isArray(value) ? value.map(String).join(" \u203A ") : "";
  const summarizeValue = (value) => typeof value === "string" ? `\u201C${value}\u201D` : typeof value === "boolean" ? value ? "on" : "off" : Array.isArray(value) ? `${value.length} values` : sessionContext.isRecord(value) ? `${Object.keys(value).length} entries` : JSON.stringify(value);
  if (widget) {
    const settings = widget.settings || {};
    parts.push(/* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "schema-field-ui-kind" }, "Widget \u2192 ", widget.type)));
    for (const [key, label] of [["choiceSource", "choices from"], ["dataSource", "data from"]]) {
      const source = settings[key];
      if (!sessionContext.isRecord(source)) continue;
      const sourcePath = summarizePath(source.path);
      if (sourcePath) parts.push(`${label} ${[source.scope, sourcePath].filter(Boolean).join(" \u203A ")}`);
    }
    if (typeof settings.choiceKeyProperty === "string") parts.push(`keyed by ${settings.choiceKeyProperty}`);
    if (typeof settings.choiceLabelTemplate === "string") parts.push(`choice label ${summarizeValue(settings.choiceLabelTemplate)}`);
  } else if (behavior) {
    parts.push(/* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "schema-field-ui-kind" }, "Presentation only")));
  }
  const presentationLabels = {
    placeholder: "placeholder",
    groupLabel: "group",
    hidden: "hidden",
    optionalToggleLabel: "optional toggle",
    showDefault: "show default",
    defaultWhenSiblingPropertyPresent: "default when present",
    choiceLabels: "choice labels",
    choiceSource: "choices from",
    choiceLabelTemplate: "choice label",
    emptyChoiceLabel: "empty choice",
    labels: "interaction labels",
    icon: "icon",
    createWithProperties: "create with",
    clearWithProperties: "clear with"
  };
  for (const [key, value] of Object.entries(presentation)) {
    if (key === "hiddenWhenSiblingPropertyEquals" && sessionContext.isRecord(value)) {
      parts.push(`hide when ${value.property || "sibling"} = ${summarizeValue(value.value)}`);
      continue;
    }
    const label = presentationLabels[key] || key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).trim();
    if (key === "choiceSource" && sessionContext.isRecord(value)) {
      const sourcePath = summarizePath(value.path);
      parts.push(`${label} ${[value.scope, sourcePath].filter(Boolean).join(" \u203A ") || summarizeValue(value)}`);
    } else if (["choiceLabels", "labels"].includes(key) && sessionContext.isRecord(value)) {
      parts.push(`${label} (${Object.keys(value).length})`);
    } else {
      parts.push(`${label}: ${summarizeValue(value)}`);
    }
  }
  if (modelReference) {
    const targetPath = summarizePath(modelReference.targetPath);
    const pathParts = Array.isArray(modelReference.targetPath) ? modelReference.targetPath.map(String) : [];
    const locationParts = pathParts[0] === modelReference.scope ? pathParts : [modelReference.scope, ...pathParts].filter(Boolean);
    const location = locationParts.join(" \u203A ");
    const variants = Array.isArray(modelReference.targetSchema?.oneOf) ? modelReference.targetSchema.oneOf : [];
    const variantLabels = variants.map((variant) => Object.values(variant?.properties || {}).find((property) => sessionContext.isRecord(property) && Object.hasOwn(property, "const"))?.const).filter((value) => typeof value === "string");
    const shownVariants = variantLabels.slice(0, 5);
    const variantSummary = variantLabels.length ? ` \xB7 forms ${shownVariants.join(", ")}${variantLabels.length > shownVariants.length ? `, +${variantLabels.length - shownVariants.length} more` : ""}` : variants.length ? ` \xB7 ${variants.length} forms` : "";
    const target = [modelReference.targetLabel, location ? `(${location})` : ""].filter(Boolean).join(" ");
    if (target) parts.push(`reference target ${target}${variantSummary}`);
  }
  if (generatedOwner) {
    const ownerPath = generatedOwner.path?.length ? generatedOwner.path.join(" / ") : "schema root";
    parts.push(`generated and read-only \xB7 owner ${ownerPath} (${generatedOwner.input})`);
  }
  const content = behavior || modelReference ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("strong", null, "UI"), /* @__PURE__ */ React.createElement("span", null, parts.map((part, index) => /* @__PURE__ */ React.createElement(React.Fragment, { key: index }, index ? " \xB7 " : "", part)))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("strong", null, "Field"), /* @__PURE__ */ React.createElement("span", null, "Add a UI annotation"));
  if (canEditProperty) {
    const inlineHost = document.createElement("div");
    inlineHost.className = "schema-ui-annotation-inline";
    inlineHost.hidden = true;
    const editorIndex = sessionContext.schemaUiAnnotationEditorEntries.push({
      entry: {
        file: propertySource?.file,
        path: propertySource?.path,
        propertyName,
        displayTitle: editorOptions.displayTitle || propertyName,
        widget: sessionContext.fieldUiBehavior(schema)?.payload?.widget?.type || sessionContext.schemaWidget(sessionContext.legacyFieldUiView(schema)) || sessionContext.widgetFromAnnotation(schema) || "",
        widgetOptions: editorOptions.widgetOptions || [],
        widgetContexts: editorOptions.widgetContexts || {},
        schema: sessionContext.cloneJson(schema),
        catalog: sessionContext.activeApplicationPackage?.annotationCatalog,
        fieldContext: sessionContext.activeApplicationPackage?.fieldUiContext
      },
      host: inlineHost,
      titleHost: null
    }) - 1;
    return {
      editorIndex,
      html: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "schema-field-ui-summary schema-field-ui-summary-trigger" + (behavior || modelReference ? "" : " schema-field-edit-trigger"), "data-schema-ui-annotation-editor": editorIndex, "aria-expanded": "false", "aria-label": "Edit UI annotation for " + (propertyName || "this field"), title: "Edit this field" }, content, /* @__PURE__ */ React.createElement("span", { className: "schema-field-ui-summary-action" }, "Edit")), /* @__PURE__ */ React.createElement("div", { "data-schema-ui-annotation-inline-host": editorIndex }))
    };
  }
  return { editorIndex: null, html: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-field-ui-summary" }, content)) };
}
function schemaValidationSummary(sessionContext, rules, label = "Validation", note = "", binding = null, fieldOnly = false) {
  if (!Array.isArray(rules) || !rules.length) return "";
  const protectedRules = rules.map((rule) => {
    const paths = [
      rule.pointer,
      typeof rule.pointer === "string" ? `${rule.pointer}/assert` : null,
      ...(rule.controls || []).map((control) => control.pointer)
    ].filter((pointer) => typeof pointer === "string").map(sessionContext.schemaValidationPointerPath);
    const generatedOwner = rule.file === sessionContext.activeApplicationPackage?.rootDocumentFile ? paths.map((path) => sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, path)).find(Boolean) : null;
    return generatedOwner ? { ...rule, generatedOwner } : rule;
  });
  const index = sessionContext.schemaValidationDialogEntries.push({ rules: protectedRules, label, note, binding, fieldOnly }) - 1;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "schema-validation-trigger", "data-schema-validation-dialog": index, "aria-haspopup": "dialog", "aria-label": label + ": " + rules.length + " checks. Show details." }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("b", null, rules.length)));
}
function schemaValidationContext(sessionContext, rules, binding) {
  if (!Array.isArray(rules) || !rules.length) return "";
  const note = "These checks read the selected model scope. Some use dynamic collection paths, so their exact field target is not resolved here.";
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-validation-context" }, sessionContext.schemaValidationSummary(rules, "Model checks", note, binding)));
}
function renderSchemaAuthoringInputs(sessionContext, { restoreRows = {} } = {}) {
  const operation = sessionContext.$("#schema-authoring-operation")?.value, host = sessionContext.$("#schema-authoring-inputs");
  if (!host) return;
  host.oninput = null;
  host.onchange = null;
  const inspecting = operation === "inspect-existing-structure";
  sessionContext.$("#schema-authoring-title").textContent = inspecting ? "Inspect schema structure" : operation === "project-integration" ? "Project integration" : "Add schema structure";
  sessionContext.$("#schema-authoring-description").textContent = operation === "project-integration" ? "Edit project integration values in tables, then preview and apply the generated contracts." : inspecting ? "Review existing fields in tables, edit supported cells, then preview before applying." : "Choose one design input. The editor will show the resulting project tree and generated schema code before applying it.";
  sessionContext.$("#schema-authoring-preview-button").hidden = false;
  sessionContext.$("#schema-authoring-preview-button").disabled = false;
  sessionContext.$("#schema-authoring-preview-button").textContent = inspecting ? "Preview changes" : "Preview";
  sessionContext.$("#schema-authoring-apply").hidden = false;
  sessionContext.$("#schema-authoring-cancel").textContent = inspecting ? "Close" : "Cancel";
  if (inspecting) {
    sessionContext.renderSchemaStructureInspection();
    return;
  }
  const field = (id, label, type = "text", placeholder = "", isRequired = true) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, label, /* @__PURE__ */ React.createElement("input", { id, type, ...placeholder ? { "placeholder": placeholder } : {}, ...isRequired ? { "required": true } : {} })));
  const identity = () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("fieldset", { className: "schema-authoring-identity" }, /* @__PURE__ */ React.createElement("legend", null, "Generated identity fields"), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-identity-id", type: "checkbox" }), " Include required ID"), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-identity-name", type: "checkbox" }), " Include required name")));
  const required = () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-required", type: "checkbox" }), "Required under the parent"));
  const title = (isRequired = true) => field("schema-authoring-title-input", "Readable title", "text", "", isRequired);
  const fieldsTable = (label, note, scoped = false) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, note), /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table", "aria-label": label }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, scoped ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("th", null, "Item kind token (blank = all)")) : null, /* @__PURE__ */ React.createElement("th", null, "Machine key"), /* @__PURE__ */ React.createElement("th", null, "Title"), /* @__PURE__ */ React.createElement("th", null, "Shape"), /* @__PURE__ */ React.createElement("th", null, "Reference key"), /* @__PURE__ */ React.createElement("th", null, "Fixed item count"), /* @__PURE__ */ React.createElement("th", null, "Choices (comma separated)"), /* @__PURE__ */ React.createElement("th", null, "Widget"), /* @__PURE__ */ React.createElement("th", null, "Array item widget"), /* @__PURE__ */ React.createElement("th", null, "Vector labels"), /* @__PURE__ */ React.createElement("th", null, "Required"), /* @__PURE__ */ React.createElement("th", null, "Hidden in project form"), /* @__PURE__ */ React.createElement("th", null, "Default JSON"), /* @__PURE__ */ React.createElement("th", null, "Fixed JSON"), /* @__PURE__ */ React.createElement("th", null))), /* @__PURE__ */ React.createElement("tbody", { id: "schema-authoring-field-rows" }))), /* @__PURE__ */ React.createElement("button", { className: "button", id: "schema-authoring-add-field-row", type: "button" }, "Add field row"));
  const setupFieldRows = (scoped = false) => {
    const rows = sessionContext.$("#schema-authoring-field-rows");
    const addRow = () => {
      const row = document.createElement("tr");
      row.dataset.schemaAuthoringFieldRow = "true";
      const rowMount = renderOwnedView(row, /* @__PURE__ */ React.createElement(React.Fragment, null, scoped ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-kind-token": true, "aria-label": "Item kind token", placeholder: "All kinds" }))) : null, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-key": true, "aria-label": "Machine key" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-title": true, "aria-label": "Readable title", placeholder: "Optional" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { "data-field-shape": true, "aria-label": "Value shape" }, /* @__PURE__ */ React.createElement("option", { value: "string" }, "String"), /* @__PURE__ */ React.createElement("option", { value: "number" }, "Number"), /* @__PURE__ */ React.createElement("option", { value: "integer" }, "Integer"), /* @__PURE__ */ React.createElement("option", { value: "boolean" }, "Boolean"), /* @__PURE__ */ React.createElement("option", { value: "object" }, "Object"), /* @__PURE__ */ React.createElement("option", { value: "array" }, "Array"), /* @__PURE__ */ React.createElement("option", { value: "array-number" }, "Array of numbers"), /* @__PURE__ */ React.createElement("option", { value: "reference" }, "Reusable reference"), /* @__PURE__ */ React.createElement("option", { value: "array-reference" }, "Array of references"), /* @__PURE__ */ React.createElement("option", { value: "null" }, "Null"))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-reference-key": true, "aria-label": "Reusable reference key", placeholder: "e.g. quantity" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", step: "1", "data-field-item-count": true, "aria-label": "Fixed array item count" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-choices": true, "aria-label": "Allowed choices, comma separated" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { "data-field-widget": true, "aria-label": "Editor widget" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Default"), /* @__PURE__ */ React.createElement("option", { value: "valueControl" }, "Value control"), /* @__PURE__ */ React.createElement("option", { value: "referenceSelector" }, "Reference selector"), /* @__PURE__ */ React.createElement("option", { value: "quantity" }, "Quantity"), /* @__PURE__ */ React.createElement("option", { value: "quantityVector" }, "Quantity vector"), /* @__PURE__ */ React.createElement("option", { value: "tree" }, "Tree children"))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("select", { "data-field-item-widget": true, "aria-label": "Array item widget" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Default"), /* @__PURE__ */ React.createElement("option", { value: "valueControl" }, "Value control"), /* @__PURE__ */ React.createElement("option", { value: "quantity" }, "Quantity"))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-component-labels": true, "aria-label": "Quantity vector labels, comma separated", placeholder: "x-position, y-position" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "data-field-required": true, "aria-label": "Required" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "data-field-hidden": true, "aria-label": "Hidden in project form" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-default": true, "aria-label": "Default JSON", placeholder: "Optional" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-field-fixed": true, "aria-label": "Fixed JSON", placeholder: "Optional" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-remove-field-row": true }, "Remove"))));
      row.querySelectorAll("input,select").forEach((control) => control.addEventListener("input", sessionContext.invalidateSchemaAuthoringPreview));
      row.querySelector("[data-remove-field-row]").addEventListener("click", () => {
        rowMount.dispose();
        row.remove();
        sessionContext.invalidateSchemaAuthoringPreview();
      });
      rows.append(row);
    };
    sessionContext.$("#schema-authoring-add-field-row").addEventListener("click", () => {
      addRow();
      sessionContext.invalidateSchemaAuthoringPreview();
    });
    for (let index = 0; index < (Number.isInteger(restoreRows.field) ? restoreRows.field : 4); index++) addRow();
  };
  if (operation === "project-integration") sessionContext.renderProjectIntegrationForm(host, sessionContext.model, sessionContext.invalidateSchemaAuthoringPreview, { schemaPath: sessionContext.openedDocumentPath(), widgetCatalog: sessionContext.activeApplicationPackage?.widgetCatalog });
  else if (operation === "bind-tree-group") renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-model-path", "Model path (start with model)", "text", "model.geometry.features"), title(), /* @__PURE__ */ React.createElement("label", null, "Section binding", /* @__PURE__ */ React.createElement("select", { id: "schema-authoring-section-kind" }, /* @__PURE__ */ React.createElement("option", { value: "collection" }, "Collection"), /* @__PURE__ */ React.createElement("option", { value: "objectRoot" }, "Object root"), /* @__PURE__ */ React.createElement("option", { value: "group" }, "Display section on model root"))), /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "Binds this heading to a real schema location and creates missing object path segments. Collections and object roots get the standard tree behavior automatically.")));
  else if (operation === "display-group") renderOwnedView(host, title());
  else if (operation === "object-node") renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-key", "Machine key"), title(), identity(), required()));
  else if (operation === "collection") renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-key", "Machine key"), title(), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-show-heading", type: "checkbox", defaultChecked: true }), "Show collection heading"), field("schema-authoring-item-class", "Item class", "text", "Optional CSS class", false), required()));
  else if (operation === "bind-existing-field-tree") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "Existing field", /* @__PURE__ */ React.createElement("select", { id: "schema-authoring-existing-field", "aria-label": "Existing field" })), title(false), /* @__PURE__ */ React.createElement("label", null, "Tree role", /* @__PURE__ */ React.createElement("select", { id: "schema-authoring-existing-tree-role" }, /* @__PURE__ */ React.createElement("option", { value: "optionalItem" }, "Optional item"), /* @__PURE__ */ React.createElement("option", { value: "objectRoot" }, "Object root"), /* @__PURE__ */ React.createElement("option", { value: "collection" }, "Collection"))), field("schema-authoring-item-class", "Item class", "text", "Optional CSS class", false), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-show-heading", type: "checkbox", defaultChecked: true }), "Show collection heading"), field("schema-authoring-visible-option", "Visible when editor option is enabled", "text", "Optional option key", false), /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "Places a field already declared on this object under its project-tree item. The schema property and its value remain unchanged.")));
    const declaration = sessionContext.valueAt(sessionContext.schemaAuthoringDialogState?.target?.itemPath || []);
    const select = sessionContext.$("#schema-authoring-existing-field");
    renderOwnedView(select, /* @__PURE__ */ React.createElement(React.Fragment, null, Object.keys(declaration?.properties || {}).map((key) => /* @__PURE__ */ React.createElement("option", { key, value: key }, key))));
    sessionContext.$("#schema-authoring-title-input").placeholder = "Use the existing field title";
    const role = sessionContext.$("#schema-authoring-existing-tree-role"), heading = sessionContext.$("#schema-authoring-show-heading");
    const refresh = () => {
      heading.closest("label").hidden = role.value !== "collection";
    };
    role.addEventListener("change", refresh);
    refresh();
  } else if (operation === "collection-tree-presentation") renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-show-heading", type: "checkbox" }), "Show collection heading"), field("schema-authoring-item-class", "Item class", "text", "Optional CSS class", false), /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "Controls how this collection appears in the project tree. Hiding the heading displays its item kinds at the parent level.")));
  else if (operation === "repair-collection-actions") renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "Regenerate the selected array collection\u2019s insertion action targets from its existing item kinds. Preview the affected action entries before applying.")));
  else if (operation === "object-requirements") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-requirements" }, /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-requirement-actions" }, /* @__PURE__ */ React.createElement("strong", null, "Required properties"), /* @__PURE__ */ React.createElement("button", { className: "button", id: "schema-authoring-require-all", type: "button" }, "Require all"), /* @__PURE__ */ React.createElement("button", { className: "button", id: "schema-authoring-clear-required", type: "button" }, "Clear all")), /* @__PURE__ */ React.createElement("div", { id: "schema-authoring-required-keys", className: "schema-authoring-required-keys" }), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-closed-object", type: "checkbox" }), "Closed object (no undeclared properties)"), /* @__PURE__ */ React.createElement("p", { id: "schema-authoring-entry-schema-note", className: "settings-empty", hidden: true }, "This object has an entry schema, so its extra properties must remain available."))));
    const declaration = sessionContext.valueAt(sessionContext.schemaAuthoringDialogState?.target?.itemPath || []);
    const requiredKeys = new Set(Array.isArray(declaration?.required) ? declaration.required : []);
    const rows = sessionContext.$("#schema-authoring-required-keys");
    const keys = Object.keys(declaration?.properties || {});
    renderOwnedView(rows, keys.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, keys.map((key) => /* @__PURE__ */ React.createElement("label", { key, className: "schema-authoring-required-key" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "data-required-key": key, defaultChecked: requiredKeys.has(key) }), /* @__PURE__ */ React.createElement("span", null, key)))) : /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "This object has no declared properties."));
    sessionContext.$("#schema-authoring-require-all").addEventListener("click", () => {
      rows.querySelectorAll("[data-required-key]").forEach((input) => input.checked = true);
      sessionContext.invalidateSchemaAuthoringPreview();
    });
    sessionContext.$("#schema-authoring-clear-required").addEventListener("click", () => {
      rows.querySelectorAll("[data-required-key]").forEach((input) => input.checked = false);
      sessionContext.invalidateSchemaAuthoringPreview();
    });
    const closed = sessionContext.$("#schema-authoring-closed-object");
    closed.checked = declaration?.additionalProperties === false;
    if (declaration?.additionalProperties && typeof declaration.additionalProperties === "object") {
      closed.disabled = true;
      sessionContext.$("#schema-authoring-entry-schema-note").hidden = false;
    }
  } else if (operation === "nest-existing-fields") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-key", "Nested object key"), title(), field("schema-authoring-nested-definition", "Reusable definition key", "text", "Optional: leave blank for an inline object", false), /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "Select direct fields to move into the new object. Each field keeps its complete schema declaration, including its UI annotations and validation keywords. Required fields become required inside the new object."), /* @__PURE__ */ React.createElement("div", { id: "schema-authoring-nest-keys", className: "schema-authoring-required-keys", role: "group", "aria-label": "Fields to nest" }), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-required", type: "checkbox" }), "Require the nested object under its parent"), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-closed-object", type: "checkbox", defaultChecked: true }), "Closed nested object"), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-insert-first", type: "checkbox" }), "Place nested object before other fields")));
    const targetPath = sessionContext.schemaAuthoringDialogState?.target?.itemPath || [];
    const declaration = sessionContext.valueAt(targetPath);
    const rows = sessionContext.$("#schema-authoring-nest-keys");
    renderOwnedView(rows, /* @__PURE__ */ React.createElement(React.Fragment, null, Object.entries(declaration?.properties || {}).map(([key, child]) => {
      const generated = sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, [...targetPath, "properties", key]);
      return /* @__PURE__ */ React.createElement("label", { key, className: "schema-authoring-required-key", title: generated ? `Generated by ${generated.input}` : void 0 }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "data-nest-key": key, disabled: Boolean(generated) }), /* @__PURE__ */ React.createElement("span", null, child?.title ? `${key} \xB7 ${child.title}` : key, generated ? " \xB7 generated" : ""));
    })));
  } else if (operation === "collection-item-policy") {
    const policy = sessionContext.schemaSingleItemPolicy(sessionContext.model, sessionContext.schemaAuthoringDialogState?.target?.itemPath || []);
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { id: "schema-authoring-item-policy-summary", className: "settings-empty" }), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-store-discriminator", type: "checkbox" }), " Store item-kind discriminator in project JSON"), field("schema-authoring-discriminator", "Discriminator key", "text", "type", false), field("schema-authoring-token", "Item kind token", "text", "e.g. addressSelection", false), /* @__PURE__ */ React.createElement("p", { id: "schema-authoring-item-policy-note", className: "settings-empty" })));
    sessionContext.$("#schema-authoring-item-policy-summary").textContent = `${policy.title} \xB7 ${policy.path.join(" / ")}. Current storage: ${policy.stored ? `${policy.key} = ${policy.token}` : "no discriminator field"}.`;
    sessionContext.$("#schema-authoring-store-discriminator").checked = policy.stored;
    sessionContext.$("#schema-authoring-discriminator").value = policy.key;
    sessionContext.$("#schema-authoring-token").value = policy.token;
    sessionContext.$("#schema-authoring-item-policy-note").textContent = policy.stored && !policy.generated ? "This field was not generated by guided authoring. Its storage policy remains editable in the original declaration." : "A single item kind can be selected by its collection action without storing a type field on each project item.";
    if (policy.stored && !policy.generated) sessionContext.$("#schema-authoring-store-discriminator").disabled = true;
    const refresh = () => {
      const enabled = sessionContext.$("#schema-authoring-store-discriminator").checked;
      sessionContext.$("#schema-authoring-discriminator").disabled = !enabled;
      sessionContext.$("#schema-authoring-token").disabled = !enabled;
    };
    sessionContext.$("#schema-authoring-store-discriminator").addEventListener("change", refresh);
    refresh();
  } else if (operation === "collection-item-kind") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-token", "Variant token"), title(), field("schema-authoring-discriminator", "Discriminator key"), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-store-discriminator", type: "checkbox", defaultChecked: true }), " Store item-kind discriminator in project JSON"), field("schema-authoring-variant-key", "Reusable item kind key", "text", "e.g. rectangle", false), field("schema-authoring-union-key", "Reusable union key", "text", "e.g. domainGeometryFeature", false), /* @__PURE__ */ React.createElement("label", null, "Geometry dimension", /* @__PURE__ */ React.createElement("select", { id: "schema-authoring-geometry-dimension" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Not applicable"), /* @__PURE__ */ React.createElement("option", { value: "2" }, "2D"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "3D"))), /* @__PURE__ */ React.createElement("label", { className: "schema-authoring-checkbox" }, /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-geometry-group", type: "checkbox" }), " Geometry group item"), identity(), fieldsTable("Collection item fields", "A single kind can omit its stored discriminator. Reusable item-kind mode adds a named definition to a shared oneOf union and creates the collection action.")));
    sessionContext.$("#schema-authoring-store-discriminator").addEventListener("change", () => {
      sessionContext.$("#schema-authoring-discriminator").disabled = !sessionContext.$("#schema-authoring-store-discriminator").checked;
    });
    setupFieldRows();
  } else if (operation === "collection-item-kinds-table") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-kind-options" }, field("schema-authoring-union-key", "Reusable union key", "text", "Optional for object maps; required for multiple array kinds", false), field("schema-authoring-discriminator", "Discriminator key", "text", "Leave blank for kinds without a type field", false), identity()), /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "Add one row per item kind. A blank discriminator creates no type field; the reusable key selects array insertion kinds. For shared fields, leave the item kind token blank in the field table. Object maps receive an additional-properties union and an entry branch in the project tree."), /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table", "aria-label": "Item kinds to add" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Variant token"), /* @__PURE__ */ React.createElement("th", null, "Readable title"), /* @__PURE__ */ React.createElement("th", null, "Reusable item key"), /* @__PURE__ */ React.createElement("th", null))), /* @__PURE__ */ React.createElement("tbody", { id: "schema-authoring-kind-rows" }))), /* @__PURE__ */ React.createElement("button", { className: "button", id: "schema-authoring-add-kind-row", type: "button" }, "Add item kind row"), fieldsTable("Item kind fields", "Each field row may apply to all item kinds or only the matching token. Required ID and name are generated once per kind.", true)));
    const kindRows = sessionContext.$("#schema-authoring-kind-rows");
    const addKindRow = () => {
      const row = document.createElement("tr");
      row.dataset.schemaAuthoringKindRow = "true";
      const rowMount = renderOwnedView(row, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-kind-token": true, "aria-label": "Variant token", placeholder: "e.g. pointSource" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-kind-title": true, "aria-label": "Item kind title", placeholder: "Point Source" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-kind-key": true, "aria-label": "Reusable item key", placeholder: "pointSource" })), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-remove-kind-row": true }, "Remove"))));
      row.querySelector("[data-remove-kind-row]").addEventListener("click", () => {
        rowMount.dispose();
        row.remove();
        sessionContext.invalidateSchemaAuthoringPreview();
      });
      kindRows.append(row);
    };
    sessionContext.$("#schema-authoring-add-kind-row").addEventListener("click", () => {
      addKindRow();
      sessionContext.invalidateSchemaAuthoringPreview();
    });
    for (let index = 0; index < (Number.isInteger(restoreRows.kind) ? restoreRows.kind : 2); index++) addKindRow();
    setupFieldRows(true);
    sessionContext.$("#schema-authoring-discriminator").value = "type";
    sessionContext.$("#schema-authoring-identity-id").checked = true;
    sessionContext.$("#schema-authoring-identity-name").checked = true;
  } else if (operation === "shared-definition-collection") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-definition-key", "Reusable definition key"), title(), required(), fieldsTable("Reusable definition fields", "First use creates a shared, closed object definition from these rows. Later collections can reuse the same definition key with the field rows left blank. Widget and hidden annotations are generated from the selected columns.")));
    setupFieldRows();
    sessionContext.$("#schema-authoring-definition-key").value = "definition";
    sessionContext.$("#schema-authoring-title-input").value = "Definition";
  } else if (operation === "reusable-schema-definition") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-key", "Definition key"), title(false), /* @__PURE__ */ React.createElement("label", null, "Definition shape", /* @__PURE__ */ React.createElement("select", { id: "schema-authoring-definition-kind" }, /* @__PURE__ */ React.createElement("option", { value: "object" }, "Closed object"), /* @__PURE__ */ React.createElement("option", { value: "string" }, "String"), /* @__PURE__ */ React.createElement("option", { value: "number" }, "Number"), /* @__PURE__ */ React.createElement("option", { value: "integer" }, "Integer"), /* @__PURE__ */ React.createElement("option", { value: "boolean" }, "Boolean"), /* @__PURE__ */ React.createElement("option", { value: "null" }, "Null"), /* @__PURE__ */ React.createElement("option", { value: "array" }, "Array"), /* @__PURE__ */ React.createElement("option", { value: "union" }, "Union of reusable definitions"))), /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-definition-scalar" }, /* @__PURE__ */ React.createElement("label", null, "Minimum length", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-definition-min-length", type: "number", min: "0", step: "1" })), /* @__PURE__ */ React.createElement("label", null, "Maximum length", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-definition-max-length", type: "number", min: "0", step: "1" })), /* @__PURE__ */ React.createElement("label", null, "Regular expression pattern", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-definition-pattern", type: "text", placeholder: "Optional" })), /* @__PURE__ */ React.createElement("label", null, "Allowed choices (one string per line)", /* @__PURE__ */ React.createElement("textarea", { id: "schema-authoring-definition-choices", rows: Number("5"), placeholder: "1\nm\nmm" })), /* @__PURE__ */ React.createElement("label", null, "Expression namespaces (comma separated)", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-expression-namespaces", type: "text", placeholder: "definitions, operators" })), /* @__PURE__ */ React.createElement("label", null, "Minimum", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-definition-minimum", type: "number", step: "any" })), /* @__PURE__ */ React.createElement("label", null, "Maximum", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-definition-maximum", type: "number", step: "any" }))), /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-definition-array" }, /* @__PURE__ */ React.createElement("label", null, "Array item shape", /* @__PURE__ */ React.createElement("select", { id: "schema-authoring-definition-item-shape" }, /* @__PURE__ */ React.createElement("option", { value: "number" }, "Number"), /* @__PURE__ */ React.createElement("option", { value: "reference" }, "Reusable reference"))), /* @__PURE__ */ React.createElement("label", null, "Item reference key", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-definition-reference-key", type: "text" })), /* @__PURE__ */ React.createElement("label", null, "Fixed item count", /* @__PURE__ */ React.createElement("input", { id: "schema-authoring-definition-item-count", type: "number", min: "0", step: "1" }))), /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-definition-union" }, /* @__PURE__ */ React.createElement("label", null, "Member definition keys (one per line)", /* @__PURE__ */ React.createElement("textarea", { id: "schema-authoring-definition-members", rows: Number("5"), placeholder: "rectangle\ncircle" }))), /* @__PURE__ */ React.createElement("div", { className: "schema-authoring-definition-object" }, fieldsTable("Reusable object fields", "Object definitions are closed. Use reusable references and fixed-length arrays to factor repeated schema shapes."))));
    setupFieldRows();
    sessionContext.$("#schema-authoring-key").value = "quantity";
    sessionContext.$("#schema-authoring-title-input").value = "Quantity";
  } else if (operation === "settings-field") renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, field("schema-authoring-key", "Machine key"), title(), /* @__PURE__ */ React.createElement("label", null, "Value shape", /* @__PURE__ */ React.createElement("select", { id: "schema-authoring-shape" }, /* @__PURE__ */ React.createElement("option", { value: "string" }, "String"), /* @__PURE__ */ React.createElement("option", { value: "number" }, "Number"), /* @__PURE__ */ React.createElement("option", { value: "integer" }, "Integer"), /* @__PURE__ */ React.createElement("option", { value: "boolean" }, "Boolean"), /* @__PURE__ */ React.createElement("option", { value: "object" }, "Object"), /* @__PURE__ */ React.createElement("option", { value: "array" }, "Array"), /* @__PURE__ */ React.createElement("option", { value: "null" }, "Null"))), /* @__PURE__ */ React.createElement("label", null, "Fixed value (JSON)", /* @__PURE__ */ React.createElement("textarea", { id: "schema-authoring-fixed", rows: Number("2"), "aria-label": "Fixed value as JSON", placeholder: "Leave blank unless this field is fixed" })), /* @__PURE__ */ React.createElement("label", null, "Default value (JSON)", /* @__PURE__ */ React.createElement("textarea", { id: "schema-authoring-default", rows: Number("3"), "aria-label": "Default value as JSON", placeholder: "Leave blank when there is no default" })), /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, 'Use a fixed value for a discriminator such as application = "my-app". Otherwise enter a JSON default used for new projects and inserted collection items.'), required()));
  else if (operation === "settings-fields") {
    renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, title(), fieldsTable("Settings fields to add", "Enter repeated field facts once per row. Required and default values are applied together; Hidden adds the standard project form hidden annotation.")));
    setupFieldRows();
  } else host.replaceChildren();
  if (operation === "collection" || operation === "collection-tree-presentation") {
    const target = sessionContext.schemaAuthoringDialogState?.target;
    const current = sessionContext.schemaCollectionTreePresentation(sessionContext.model, target?.itemPath || [], target?.schemaProjection?.binding || []);
    sessionContext.$("#schema-authoring-show-heading").checked = operation === "collection" ? true : current?.showHeading !== false;
    sessionContext.$("#schema-authoring-item-class").value = operation === "collection" ? "" : current?.itemClass || "";
  }
  if (operation === "collection-item-kind") {
    sessionContext.$("#schema-authoring-discriminator").value = "type";
    sessionContext.$("#schema-authoring-identity-id").checked = true;
    sessionContext.$("#schema-authoring-identity-name").checked = true;
  }
  if (operation === "reusable-schema-definition") {
    const refreshDefinitionShape = () => {
      const kind = sessionContext.$("#schema-authoring-definition-kind").value;
      sessionContext.$(".schema-authoring-definition-object").hidden = kind !== "object";
      sessionContext.$(".schema-authoring-definition-array").hidden = kind !== "array";
      sessionContext.$(".schema-authoring-definition-union").hidden = kind !== "union";
      sessionContext.$(".schema-authoring-definition-scalar").hidden = !["string", "number", "integer", "boolean", "null"].includes(kind);
    };
    sessionContext.$("#schema-authoring-definition-kind").addEventListener("change", refreshDefinitionShape);
    refreshDefinitionShape();
  }
  if (operation === "bind-tree-group") {
    const current = sessionContext.schemaAuthoringDialogState?.target?.itemPath;
    const descriptor = Array.isArray(current) ? sessionContext.valueAt(current) : null;
    if (descriptor?.title) sessionContext.$("#schema-authoring-title-input").value = descriptor.title;
    const defaults = {
      "Definitions": ["model", "group"],
      "Geometry features": ["model.geometry.features", "collection"],
      "Integration operators": ["model.integrationOperators", "collection"],
      "Mesh": ["model.mesh", "objectRoot"],
      "Physics": ["model.physics", "objectRoot"],
      "Study": ["model.study", "collection"],
      "Results": ["model.results", "collection"]
    };
    const preset = defaults[descriptor?.title];
    if (preset) {
      sessionContext.$("#schema-authoring-model-path").value = preset[0];
      sessionContext.$("#schema-authoring-section-kind").value = preset[1];
    }
  }
}
function createController(context) {
  return {
    validateBulkSchemaCandidate: validateBulkSchemaCandidate.bind(null, context),
    applyBulkSchemaCandidate: applyBulkSchemaCandidate.bind(null, context),
    validateGeneratedOverlayCandidate: validateGeneratedOverlayCandidate.bind(null, context),
    validateFactoredSchemaCandidate: validateFactoredSchemaCandidate.bind(null, context),
    schemaAuthoringTools: schemaAuthoringTools.bind(null, context),
    openSchemaAuthoringTool: openSchemaAuthoringTool.bind(null, context),
    visibleSchemaAuthoringTools: visibleSchemaAuthoringTools.bind(null, context),
    renderSchemaAuthoringToolButtons: renderSchemaAuthoringToolButtons.bind(null, context),
    resolveSchemaWidgetPresentation: resolveSchemaWidgetPresentation.bind(null, context),
    schemaUiWidgetOptions: schemaUiWidgetOptions.bind(null, context),
    schemaUiWidgetContexts: schemaUiWidgetContexts.bind(null, context),
    schemaFieldUiSummary: schemaFieldUiSummary.bind(null, context),
    schemaValidationPointerPath: schemaValidationPointerPath.bind(null, context),
    schemaValidationSummary: schemaValidationSummary.bind(null, context),
    schemaValidationRulesForField: schemaValidationRulesForField.bind(null, context),
    schemaValidationContext: schemaValidationContext.bind(null, context),
    applySchemaUiAnnotation: applySchemaUiAnnotation.bind(null, context),
    applySchemaValidationExpression: applySchemaValidationExpression.bind(null, context),
    openStructuredValidationRule: openStructuredValidationRule.bind(null, context),
    applicationSchemaApi: applicationSchemaApi.bind(null, context),
    modelEditorSchemaForPath: modelEditorSchemaForPath.bind(null, context),
    modelEditorSchemaProperty: modelEditorSchemaProperty.bind(null, context),
    modelEditorSchemaItem: modelEditorSchemaItem.bind(null, context),
    resolveModelEditorSchema: resolveModelEditorSchema.bind(null, context),
    schemaAuthoringTargetForPropertyPath: schemaAuthoringTargetForPropertyPath.bind(null, context),
    selectSchemaAuthoringTargetPath: selectSchemaAuthoringTargetPath.bind(null, context),
    schemaAuthoringOptionsForTarget: schemaAuthoringOptionsForTarget.bind(null, context),
    schemaInspectionTargetPath: schemaInspectionTargetPath.bind(null, context),
    renderSchemaStructureInspection: renderSchemaStructureInspection.bind(null, context),
    schemaInspectionEdits: schemaInspectionEdits.bind(null, context),
    renderSchemaAuthoringInputs: renderSchemaAuthoringInputs.bind(null, context),
    initializeSchemaAuthoringPreview: initializeSchemaAuthoringPreview.bind(null, context),
    schemaAuthoringRelevantCode: schemaAuthoringRelevantCode.bind(null, context),
    closeSchemaAuthoringDialog: closeSchemaAuthoringDialog.bind(null, context),
    openSchemaAuthoringDialog: openSchemaAuthoringDialog.bind(null, context),
    invalidateSchemaAuthoringPreview: invalidateSchemaAuthoringPreview.bind(null, context),
    schemaAuthoringFormInput: schemaAuthoringFormInput.bind(null, context),
    schemaGeneratedPathsWithin: schemaGeneratedPathsWithin.bind(null, context),
    schemaValidationProgramEntries: schemaValidationProgramEntries.bind(null, context),
    schemaDocumentWithProgramValue: schemaDocumentWithProgramValue.bind(null, context),
    applySchemaValidationProgramEdit: applySchemaValidationProgramEdit.bind(null, context),
    addSchemaValidationProgram: addSchemaValidationProgram.bind(null, context),
    applySchemaAuthoringOperation: applySchemaAuthoringOperation.bind(null, context),
    schemaChoiceSelectionKey: schemaChoiceSelectionKey.bind(null, context),
    schemaChoiceApplies: schemaChoiceApplies.bind(null, context),
    flushSchemaChoiceEditor: flushSchemaChoiceEditor.bind(null, context),
    schemaValueCompatibilityApplies: schemaValueCompatibilityApplies.bind(null, context),
    flushSchemaAnnotationEditor: flushSchemaAnnotationEditor.bind(null, context),
    flushSchemaUiEditor: flushSchemaUiEditor.bind(null, context),
    flushSchemaGraphicsEditor: flushSchemaGraphicsEditor.bind(null, context),
    flushSchemaGlobalUiEditor: flushSchemaGlobalUiEditor.bind(null, context),
    flushSchemaDraftEditors: flushSchemaDraftEditors.bind(null, context),
    refreshSelectedSchemaDeclarationLabel: refreshSelectedSchemaDeclarationLabel.bind(null, context),
    schemaDocumentNumericFieldError: schemaDocumentNumericFieldError.bind(null, context),
    schemaActionFacingError: schemaActionFacingError.bind(null, context),
    schemaArrayItemStructureLabel: schemaArrayItemStructureLabel.bind(null, context),
    selectedDocumentSchema: selectedDocumentSchema.bind(null, context),
    schemaVariantStatus: schemaVariantStatus.bind(null, context),
    applySchemaComponentVariant: applySchemaComponentVariant.bind(null, context),
    saveSchemaComponentVariant: saveSchemaComponentVariant.bind(null, context),
    resolveUiProfileSchemaReference: resolveUiProfileSchemaReference.bind(null, context),
    validateUiProfileSchema: validateUiProfileSchema.bind(null, context),
    schemaFieldContext: schemaFieldContext.bind(null, context),
    settingsSchemaHasChoiceDependency: settingsSchemaHasChoiceDependency.bind(null, context),
    schemaDocumentPointer: schemaDocumentPointer.bind(null, context),
    resetSchemaAuthoringEditors: resetSchemaAuthoringEditors.bind(null, context),
    schemaLocalDefinitionDialogTarget: schemaLocalDefinitionDialogTarget.bind(null, context),
    syncSchemaStructureDialogHeader: syncSchemaStructureDialogHeader.bind(null, context),
    currentSchemaStructureDialogTarget: currentSchemaStructureDialogTarget.bind(null, context),
    schemaStructureDialogTargetIsCurrent: schemaStructureDialogTargetIsCurrent.bind(null, context),
    restoreSchemaStructureDialogParent: restoreSchemaStructureDialogParent.bind(null, context),
    finishSchemaStructureDialog: finishSchemaStructureDialog.bind(null, context),
    navigateSchemaStructureDialog: navigateSchemaStructureDialog.bind(null, context),
    backSchemaStructureDialog: backSchemaStructureDialog.bind(null, context),
    openSchemaStructureDialog: openSchemaStructureDialog.bind(null, context),
    showSchemaGraphicsContext: showSchemaGraphicsContext.bind(null, context),
    showSchemaGraphicsDesign: showSchemaGraphicsDesign.bind(null, context),
    showSchemaGlobalUiDesign: showSchemaGlobalUiDesign.bind(null, context),
    renderSchemaTduvOverview: renderSchemaTduvOverview.bind(null, context)
  };
}
export {
  createController
};

//# sourceMappingURL=schema-controller.js.map
