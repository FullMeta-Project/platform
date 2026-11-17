// Generated from settings-controller.jsx by scripts/build-frontend.mjs.
import { hasSettingsDraft, modelWithEditorSettingsDraft, editorSettingsDraftIsValid, fitSettingsColumnsToPane, updateApplySettingsVisibility, initializeSettingsSurface, applyCurrentSettingsDraft, updateFieldSummary, renderFieldSettings, definitionLabel, definitionControlLabel, definitionCollectionConfig, definitionCollectionPath, definitionCollectionKindForPath, definitionCollectionLabel, refreshDefinitionRow, setDefinitionInputError, commitDefinitionInput, commitSettingsInput, applySettingsDraftAfterFieldBlur, reportDefinitionChange, defaultValueForOptionalField, restoreMovedRowFocus, moveSettingsTableRow, selectDefinitionCollection, settingsInsertionTarget, syncResultSettingsDraft, updateFieldPlotRecipe, updateFieldCutPlanePosition } from "./settings-controller-actions.js";
import React from "../../shared/react/react-runtime.js";
import { renderOwnedView, joinView } from "../../../runtime/owned-view.js";
import { SchemaField, SchemaObject, SchemaStructure } from "../schema-form.js";
import { RowMoveControls } from "../../shared/react/collection-controls.js";
import { projectSchemaObjectFields } from "../../../runtime/schema-form-projection.js";
import { schemaWidget } from "../../shared/schema-widget.js";
function ModelOverviewIdentityRows({ projectId, projectName }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Model ID"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { key: `model-id:${projectId}`, className: "settings-generated-id", type: "text", defaultValue: projectId, readOnly: true, "aria-readonly": "true", "aria-label": "Model ID", title: "Model ID is read-only in the editor." }))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Display name"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { key: `model-name:${projectId}`, type: "text", "data-project-name": "true", "data-original-value": projectName, maxLength: 120, defaultValue: projectName, "aria-label": "Display name" }))));
}
function renderSettingsTable(sessionContext) {
  sessionContext.schemaValidationDialogEntries = [];
  sessionContext.schemaUiAnnotationEditorEntries = [];
  sessionContext.$("#selection-parent").hidden = sessionContext.activeApplicationPackage?.kind !== "schemaDocument" || !sessionContext.selectedPath?.length;
  if (!sessionContext.selectedCollection && !sessionContext.hasSettingsDraft() && sessionContext.selectedPath) {
    const selectedValue = sessionContext.selectedDocumentValue();
    if (selectedValue && typeof selectedValue === "object") {
      sessionContext.settingsDraft = sessionContext.cloneJson(selectedValue);
      sessionContext.settingsDraftDirty = false;
    }
  }
  sessionContext.renderFieldSettings();
  sessionContext.ensureSelectedResultActionLoad(sessionContext.isResultPath(sessionContext.selectedPath) ? sessionContext.valueAt(sessionContext.selectedPath) : null);
  sessionContext.updateApplySettingsVisibility();
  const body = sessionContext.settingsTable.tBodies[0];
  const settingsIdentity = [sessionContext.loadedModelFolder || "", sessionContext.loadedModelFile || sessionContext.openedDocumentPath?.() || ""].join("|");
  const modelOverview = sessionContext.activeApplicationPackage?.kind !== "schemaDocument" && sessionContext.activeApplicationPackage?.kind !== "schemaProject" && !sessionContext.selectedCollection && !sessionContext.selectedPath;
  sessionContext.settingsTable.classList.toggle("hidden", false);
  sessionContext.updateFieldSummary({ overview: modelOverview });
  if (modelOverview) {
    const profile = sessionContext.activeScenario();
    const projectId = sessionContext.model?.metadata?.id || "";
    sessionContext.$("#selection-title").textContent = "Model settings";
    sessionContext.$("#selection-path").textContent = `model \u203A ${profile?.name || "Model settings"}`;
    sessionContext.$("#editor-note").textContent = (sessionContext.activeApplicationPackage?.modelEditorUi?.overviewNote || "").replaceAll("{file}", sessionContext.loadedModelFile || sessionContext.defaultModelManifestFile);
    sessionContext.settingsTable.classList.remove("definition-table");
    sessionContext.settingsTable.dataset.columnResizeKey = `project-metadata:${projectId}`;
    sessionContext.settingsTable.setAttribute("aria-label", "Model settings");
    renderOwnedView(sessionContext.settingsTable.tHead, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Setting"), /* @__PURE__ */ React.createElement("th", null, "Value"))));
    const projectName = sessionContext.model?.metadata?.name || "", description = sessionContext.model?.metadata?.description || "";
    renderOwnedView(body, /* @__PURE__ */ React.createElement(React.Fragment, { key: settingsIdentity }, /* @__PURE__ */ React.createElement(ModelOverviewIdentityRows, { projectId, projectName }), sessionContext.projectRoutingSettingsRows(), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Description"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("textarea", { key: `model-description:${projectId}`, "data-project-description": true, maxLength: Number("2000"), rows: Number("3"), "aria-label": "Model description" }, description))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Model folder"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "project-folder-value" }, sessionContext.loadedModelFolder || "."))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Model JSON"), /* @__PURE__ */ React.createElement("td", null, sessionContext.loadedModelFile || sessionContext.modelManifestFile))));
    return;
  }
  if (sessionContext.activeApplicationPackage?.kind === "schemaProject" && !sessionContext.selectedCollection && !sessionContext.selectedPath) {
    sessionContext.settingsTable.classList.remove("definition-table");
    sessionContext.settingsTable.dataset.columnResizeKey = "schema-project-overview";
    sessionContext.settingsTable.setAttribute("aria-label", "Schema-authored project overview");
    sessionContext.$("#selection-title").textContent = "Project overview";
    sessionContext.$("#selection-path").textContent = `${sessionContext.model.application} \xB7 ${sessionContext.loadedModelFolder || "."}/${sessionContext.loadedModelFile || sessionContext.modelManifestFile}`;
    sessionContext.$("#editor-note").textContent = "This model uses the generic schema editor. Add tree bindings to its schema to expose editable project sections here.";
    renderOwnedView(sessionContext.settingsTable.tHead, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Project"), /* @__PURE__ */ React.createElement("th", null, "Value"))));
    renderOwnedView(body, /* @__PURE__ */ React.createElement(React.Fragment, { key: settingsIdentity }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Model ID"), /* @__PURE__ */ React.createElement("td", null, sessionContext.model.id || sessionContext.model.metadata?.id || "")), sessionContext.projectRoutingSettingsRows(), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Project JSON"), /* @__PURE__ */ React.createElement("td", null, sessionContext.loadedModelFolder || ".", "/", sessionContext.loadedModelFile || sessionContext.modelManifestFile)), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2"), className: "settings-empty" }, "Use Validate to check JSON Schema constraints. Application-specific graphics, defaults and actions become available through the package registered for the selected schema."))));
    return;
  }
  sessionContext.settingsTable.classList.remove("hidden");
  if (sessionContext.selectedCollection) {
    sessionContext.renderDefinitionTable();
    return;
  }
  if (sessionContext.selectedPath) sessionContext.$("#selection-title").textContent = sessionContext.selectedPath.length ? sessionContext.activeApplicationPackage?.kind === "schemaDocument" ? sessionContext.selectedLabel || "Schema declaration" : sessionContext.settingPanelActionTitle(sessionContext.valueAt(sessionContext.selectedPath), sessionContext.selectedPath) || sessionContext.selectedLabel || "Settings" : sessionContext.selectedLabel || "Document settings";
  if (sessionContext.activeApplicationPackage?.kind === "schemaDocument" && sessionContext.selectedPath?.length === 0) {
    sessionContext.$("#selection-path").textContent = "document";
    sessionContext.$("#editor-note").textContent = "Edit the declared document fields, or select a tree item to edit its original JSON value.";
  }
  sessionContext.settingsTable.classList.remove("definition-table");
  sessionContext.settingsTable.dataset.columnResizeKey = "settings-item";
  sessionContext.settingsTable.setAttribute("aria-label", "Selected item type settings");
  renderOwnedView(sessionContext.settingsTable.tHead, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Setting"), /* @__PURE__ */ React.createElement("th", null, "Value"))));
  if (!sessionContext.hasSettingsDraft() || !sessionContext.selectedPath) {
    sessionContext.schemaChoiceEditor = null;
    sessionContext.schemaChoiceKey = null;
    sessionContext.schemaChoiceState = null;
    sessionContext.schemaChoiceChanged = false;
    sessionContext.schemaAnnotationEditor = null;
    sessionContext.schemaAnnotationKey = null;
    sessionContext.schemaAnnotationState = null;
    sessionContext.schemaAnnotationChanged = false;
    sessionContext.schemaUiEditor = null;
    sessionContext.schemaUiKey = null;
    sessionContext.schemaUiState = null;
    sessionContext.schemaUiChanged = false;
    renderOwnedView(body, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2"), className: "settings-empty" }, "Select a model tree item to edit its settings."))));
    return;
  }
  const settingsSchema = sessionContext.selectedDocumentSchema();
  const declaredSettingsNotes = joinView(sessionContext.modelEditorNotes(sessionContext.activeApplicationPackage?.modelEditorUi, "settings", sessionContext.selectedPath, sessionContext.settingsDraft, { profileCopy: sessionContext.activeUiProfile?.copy, model: sessionContext.model, capabilities: sessionContext.engineCapabilities }).map((note) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2"), className: "settings-empty" }, note)))), "");
  const widgetRenderers = {
    ...sessionContext.activeApplicationWidgetRenderers || {}
  };
  const settingsContext = sessionContext.schemaFieldContext(widgetRenderers);
  const rootUi = sessionContext.resolveModelEditorSchema(settingsSchema)?.["x-fullmeta-ui"] || {};
  const documentRoot = sessionContext.activeApplicationPackage?.kind === "schemaDocument" && sessionContext.selectedPath.length === 0 && sessionContext.activeApplicationPackage.modelSchema?.["x-fullmeta-ui"]?.structuralEditing === true && !rootUi.widget;
  const declaredRootProperties = documentRoot ? sessionContext.resolveModelEditorSchema(settingsSchema)?.properties || {} : {};
  const documentMetadataKeys = documentRoot ? projectSchemaObjectFields({ value: sessionContext.settingsDraft, path: [], schemaNode: settingsSchema, context: settingsContext }).filter((field) => field.present && field.showField && (field.value === null || typeof field.value !== "object")).map((field) => field.key) : [];
  const documentMetadataRows = documentMetadataKeys.length ? /* @__PURE__ */ React.createElement(
    SchemaObject,
    {
      value: sessionContext.settingsDraft,
      path: [],
      schemaNode: settingsSchema,
      context: settingsContext,
      skip: Object.keys(declaredRootProperties).filter((key) => !documentMetadataKeys.includes(key))
    }
  ) : null;
  const schemaDocumentLeaf = sessionContext.activeApplicationPackage?.kind === "schemaDocument" && sessionContext.selectedPath.length > 0 && (sessionContext.settingsDraft === null || typeof sessionContext.settingsDraft !== "object" || Array.isArray(sessionContext.settingsDraft));
  const selectedScalarValue = sessionContext.settingsDraft === null || ["string", "number", "boolean"].includes(typeof sessionContext.settingsDraft);
  const schemaStructureEditing = sessionContext.activeApplicationPackage?.kind === "schemaDocument" && sessionContext.activeApplicationPackage.modelSchema?.["x-fullmeta-ui"]?.structuralEditing === true && !rootUi.widget;
  const selectedGeneratedOwner = schemaStructureEditing && Array.isArray(sessionContext.selectedPath) ? sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, sessionContext.selectedPath) : null;
  const generatedPaths = schemaStructureEditing ? sessionContext.schemaGeneratedPathsWithin(sessionContext.model, sessionContext.selectedPath || []) : [];
  const schemaGeneratedUiOwner = schemaStructureEditing && Array.isArray(sessionContext.selectedPath) ? sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, [...sessionContext.selectedPath, "x-fullmeta-ui"]) || sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, [...sessionContext.selectedPath, sessionContext.FIELD_UI_BEHAVIOR_KEY]) : null;
  const schemaGeneratedChoiceOwner = schemaStructureEditing && Array.isArray(sessionContext.selectedPath) ? sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, [...sessionContext.selectedPath, "enum"]) || generatedPaths.some((path) => path[0] === "enum") : null;
  const schemaGeneratedUiDescendant = generatedPaths.some((path) => path[0] === "x-fullmeta-ui" || path[0] === sessionContext.FIELD_UI_BEHAVIOR_KEY);
  const schemaUiAnnotationLocked = Boolean(schemaGeneratedUiOwner || schemaGeneratedUiDescendant);
  const schemaWidgetSpecializations = schemaStructureEditing && (!sessionContext.selectedPath.length || generatedPaths.length === 0) && sessionContext.activeApplicationPackage.schemaEditorPresentation?.widgetSpecializations === true;
  const schemaWidgetProfiles = schemaWidgetSpecializations && sessionContext.isRecord(sessionContext.activeApplicationPackage.schemaEditorPresentation?.widgets) ? sessionContext.activeApplicationPackage.schemaEditorPresentation.widgets : {};
  const selectedSchemaWidgetPresentation = schemaWidgetSpecializations ? sessionContext.resolveSchemaWidgetPresentation(sessionContext.settingsDraft, schemaWidgetProfiles) : null;
  const schemaAnnotationWidget = selectedSchemaWidgetPresentation?.profile.editor === "annotation" ? selectedSchemaWidgetPresentation.widget : null;
  const schemaWidgetProfile = selectedSchemaWidgetPresentation?.profile || null;
  const inheritedWidget = schemaWidgetSpecializations && sessionContext.selectedPath.length > 0 && sessionContext.settingsDraft && typeof sessionContext.settingsDraft === "object" && !Array.isArray(sessionContext.settingsDraft) && (typeof sessionContext.settingsDraft.$ref === "string" || Array.isArray(sessionContext.settingsDraft.allOf)) ? sessionContext.inheritedSchemaWidget({
    document: sessionContext.model,
    path: sessionContext.selectedPath,
    file: sessionContext.activeApplicationPackage.rootDocumentFile,
    presentationFor: (value) => sessionContext.resolveSchemaWidgetPresentation(value, schemaWidgetProfiles)
  }) : null;
  const schemaArrayWidgetDesign = schemaStructureEditing && schemaWidgetProfile?.schemaLayout === "array" && sessionContext.settingsDraft && typeof sessionContext.settingsDraft === "object" && !Array.isArray(sessionContext.settingsDraft) && (sessionContext.settingsDraft.type === "array" || Object.hasOwn(sessionContext.settingsDraft, "items") || Object.hasOwn(sessionContext.settingsDraft, "prefixItems"));
  const nextAnnotationKey = schemaAnnotationWidget ? sessionContext.schemaChoiceSelectionKey() : null;
  if (sessionContext.schemaAnnotationEditor && sessionContext.schemaAnnotationChanged && sessionContext.schemaAnnotationKey === nextAnnotationKey) {
    sessionContext.schemaAnnotationState = sessionContext.schemaAnnotationEditor.snapshot();
  } else if (sessionContext.schemaAnnotationKey !== nextAnnotationKey) {
    sessionContext.schemaAnnotationState = null;
    sessionContext.schemaAnnotationChanged = false;
  }
  sessionContext.schemaAnnotationEditor = null;
  sessionContext.schemaAnnotationKey = nextAnnotationKey;
  let schemaAnnotationHost = null;
  if (schemaAnnotationWidget) {
    schemaAnnotationHost = document.createElement("div");
    const sourceFile = sessionContext.openedDocumentPath();
    const sourceDocument = sessionContext.model;
    let widgetContext = schemaWidgetProfile.context === "schemaWidget" ? sessionContext.schemaWidgetDesignContext({
      document: sourceDocument,
      path: sessionContext.selectedPath,
      file: sourceFile
    }) : null;
    const fieldName = String(sessionContext.selectedPath.at(-1) ?? "");
    widgetContext = {
      ...widgetContext || {},
      schemaVariantCopy: sessionContext.activeApplicationPackage.schemaVariantCopy?.[schemaAnnotationWidget],
      schemaVariants: (source) => sessionContext.activeApplicationPackage.schemaVariantProviders?.[schemaAnnotationWidget]?.(
        source,
        sessionContext.activeApplicationPackage.schemaSourceFiles(sessionContext.model),
        fieldName
      ) ?? [],
      applySchemaVariant: (variant, rowValues) => sessionContext.applySchemaComponentVariant(
        variant,
        rowValues,
        schemaAnnotationWidget,
        schemaWidgetProfile
      ),
      saveSchemaVariant: (variant) => sessionContext.saveSchemaComponentVariant(variant, schemaAnnotationWidget, schemaWidgetProfile)
    };
    sessionContext.schemaAnnotationEditor = sessionContext.mountSchemaAnnotationAuthoring({
      container: schemaAnnotationHost,
      declaration: sessionContext.settingsDraft,
      widget: schemaAnnotationWidget,
      state: sessionContext.schemaAnnotationState,
      configuration: schemaWidgetProfile,
      fieldContext: sessionContext.activeApplicationPackage.fieldUiContext,
      context: schemaWidgetProfile?.schemaLayout === "focused" || schemaArrayWidgetDesign ? { ...widgetContext || {}, presentation: "focused" } : widgetContext,
      onDraftChange(snapshot) {
        sessionContext.schemaAnnotationState = snapshot;
        sessionContext.schemaAnnotationChanged = true;
        sessionContext.settingsDraftDirty = true;
        sessionContext.updateApplySettingsVisibility();
        sessionContext.syncModelActionAvailability();
        sessionContext.setStatus(schemaWidgetProfile?.authoring?.draftStatus || `Updated the ${schemaAnnotationWidget} settings. Apply item and Save to keep the change.`);
      }
    });
  }
  const uiGroup = sessionContext.legacyFieldUiView(sessionContext.settingsDraft)?.["x-fullmeta-ui"];
  const uiGroupPresent = schemaStructureEditing && !schemaUiAnnotationLocked && uiGroup && typeof uiGroup === "object" && !Array.isArray(uiGroup);
  const schemaTitleEditable = schemaStructureEditing && sessionContext.isRecord(sessionContext.settingsDraft) && !documentMetadataKeys.includes("title") && !sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, [...sessionContext.selectedPath, "title"]) && (sessionContext.schemaDeclarationScope(sessionContext.selectedPath) === "schema" || sessionContext.selectedSchemaProjection && sessionContext.samePath(sessionContext.selectedSchemaProjection.path, sessionContext.selectedPath) || sessionContext.schemaTreeButtonForSelection(sessionContext.selectedPath));
  const nextUiKey = uiGroupPresent && sessionContext.activeApplicationPackage.annotationCatalog ? sessionContext.schemaChoiceSelectionKey() : null;
  if (sessionContext.schemaUiEditor && sessionContext.schemaUiChanged && sessionContext.schemaUiKey === nextUiKey) sessionContext.schemaUiState = sessionContext.schemaUiEditor.snapshot();
  else if (sessionContext.schemaUiKey !== nextUiKey) {
    sessionContext.schemaUiState = null;
    sessionContext.schemaUiChanged = false;
  }
  sessionContext.schemaUiEditor = null;
  sessionContext.schemaUiKey = nextUiKey;
  let schemaUiHost = null;
  if (nextUiKey) {
    schemaUiHost = document.createElement("div");
    sessionContext.schemaUiEditor = sessionContext.mountSchemaUiAnnotationAuthoring({
      container: schemaUiHost,
      declaration: sessionContext.settingsDraft,
      catalog: sessionContext.activeApplicationPackage.annotationCatalog,
      fieldContext: sessionContext.activeApplicationPackage.fieldUiContext,
      excludedKeys: [...sessionContext.schemaAnnotationEditor?.ownedUiAnnotations || []],
      state: sessionContext.schemaUiState,
      onDraftChange(snapshot) {
        sessionContext.schemaUiState = snapshot;
        sessionContext.schemaUiChanged = true;
        sessionContext.settingsDraftDirty = true;
        sessionContext.updateApplySettingsVisibility();
        sessionContext.syncModelActionAvailability();
        sessionContext.setStatus("Updated the UI annotations. Apply item and Save to keep the change.");
      }
    });
    if (!sessionContext.schemaUiEditor.handledKeys.length) {
      sessionContext.schemaUiEditor = null;
      schemaUiHost = null;
    }
  }
  const schemaChoices = schemaStructureEditing && !schemaGeneratedChoiceOwner && sessionContext.schemaChoiceApplies(sessionContext.settingsDraft, sessionContext.selectedPath) && !sessionContext.schemaAnnotationEditor?.handlesChoices;
  const schemaProjectionGroup = schemaStructureEditing && sessionContext.isRecord(sessionContext.settingsDraft) && sessionContext.schemaDeclarationScope(sessionContext.selectedPath) !== "schema" && sessionContext.selectedSchemaProjection && sessionContext.samePath(sessionContext.selectedSchemaProjection.path, sessionContext.selectedPath);
  const schemaAnnotationPicker = schemaStructureEditing && !schemaUiAnnotationLocked && (sessionContext.schemaChoiceApplies(sessionContext.settingsDraft, sessionContext.selectedPath) || schemaProjectionGroup) && sessionContext.activeApplicationPackage.annotationCatalog;
  const nextChoiceKey = schemaChoices ? sessionContext.schemaChoiceSelectionKey() : null;
  if (sessionContext.schemaChoiceEditor && sessionContext.schemaChoiceChanged && sessionContext.schemaChoiceKey === nextChoiceKey) sessionContext.schemaChoiceState = sessionContext.schemaChoiceEditor.snapshot();
  else if (sessionContext.schemaChoiceKey !== nextChoiceKey) {
    sessionContext.schemaChoiceState = null;
    sessionContext.schemaChoiceChanged = false;
  }
  sessionContext.schemaChoiceEditor = null;
  sessionContext.schemaChoiceKey = nextChoiceKey;
  const schemaOmitKeys = [
    ...documentMetadataKeys,
    ...schemaChoices || sessionContext.schemaAnnotationEditor?.handlesChoices ? ["enum"] : [],
    ...sessionContext.schemaAnnotationEditor?.handlesDefault ? ["default"] : [],
    ...sessionContext.schemaAnnotationEditor ? [sessionContext.FIELD_UI_BEHAVIOR_KEY] : [],
    ...uiGroupPresent ? [sessionContext.FIELD_UI_BEHAVIOR_KEY] : [],
    ...schemaArrayWidgetDesign ? ["description", "minItems", "maxItems", "uniqueItems", "items", "prefixItems"] : []
  ];
  const effectivePropertySources = schemaStructureEditing ? sessionContext.activeApplicationPackage.schemaEditorEffectiveProperties?.(sessionContext.settingsDraft, sessionContext.selectedPath) || [] : [];
  const declarationAuthoring = schemaStructureEditing && sessionContext.activeApplicationPackage.modelSchema?.["x-fullmeta-ui"]?.declarationAuthoring === true && sessionContext.settingsDraft && typeof sessionContext.settingsDraft === "object" && !Array.isArray(sessionContext.settingsDraft) ? sessionContext.schemaDeclarationScope(sessionContext.selectedPath) : "";
  const schemaReferenceDocument = sessionContext.model;
  const schemaOverviewConfiguration = schemaStructureEditing && sessionContext.isRecord(sessionContext.activeApplicationPackage.schemaEditorPresentation?.declarationOverview) ? sessionContext.activeApplicationPackage.schemaEditorPresentation.declarationOverview : null;
  const schemaOverviewSourceFile = sessionContext.activeApplicationPackage.rootDocumentFile;
  const schemaOverviewDocument = schemaOverviewConfiguration && sessionContext.settingsDraftDirty ? sessionContext.modelWithEditorSettingsDraft(schemaReferenceDocument, sessionContext.selectedPath, sessionContext.settingsDraft) : schemaReferenceDocument;
  const schemaOverviewFor = (file, path) => {
    if (!schemaOverviewConfiguration || typeof file !== "string" || !Array.isArray(path)) return null;
    const source = file === schemaOverviewSourceFile ? schemaOverviewDocument : null;
    if (!sessionContext.isRecord(source)) return null;
    try {
      return sessionContext.schemaDeclarationOverview({
        document: source,
        file,
        path,
        configuration: schemaOverviewConfiguration,
        widgetProfiles: schemaWidgetProfiles
      });
    } catch {
      return null;
    }
  };
  const schemaOverviewFieldSources = [];
  const schemaOverviewVariantSources = [];
  const renderSchemaOverview = (overview) => {
    if (overview?.kind === "choices" && overview.variants?.length) {
      const heading2 = overview.heading || "Allowed forms";
      const preview2 = overview.variants.slice(0, overview.maxPreviewFields);
      const remaining2 = overview.variants.length - preview2.length;
      const variantRows = joinView(overview.variants.map((variant) => {
        const index = schemaOverviewVariantSources.push(variant) - 1;
        const fields = (variant.fields || []).filter((field) => field.previewable !== false).map((field) => field.label).slice(0, overview.maxPreviewFields);
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-variant" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, variant.label), fields.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, fields.join(", "))) : null, variant.description ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, variant.description)) : null), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-open-schema-overview-variant": index }, "Open")));
      }), "");
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-overview" }, /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-overview-summary" }, /* @__PURE__ */ React.createElement("strong", null, heading2, ":"), " ", preview2.map((variant) => variant.label).join(", "), remaining2 ? `${preview2.length ? ", " : ""}+${remaining2} more` : null), /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-variants" }, variantRows)));
    }
    if (!overview?.fields?.length) return "";
    const previewableFields = overview.fields.filter((field) => field.previewable !== false);
    const previewFields = previewableFields.slice(0, overview.maxPreviewFields);
    const preview = previewFields.map((field) => `${field.label}${field.required ? " (required)" : ""}`);
    const remaining = previewableFields.length - previewFields.length;
    const heading = overview.heading || "Fields";
    const focusedFields = previewableFields.length ? previewableFields : overview.fields;
    const otherFields = previewableFields.length ? overview.fields.filter((field) => field.previewable === false) : [];
    const renderFieldRow = (field) => {
      const index = schemaOverviewFieldSources.push(field) - 1;
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, field.label), field.label !== field.key ? /* @__PURE__ */ React.createElement(React.Fragment, null, " ", /* @__PURE__ */ React.createElement("code", null, field.key)) : null, field.required ? /* @__PURE__ */ React.createElement(React.Fragment, null, " ", /* @__PURE__ */ React.createElement("span", { className: "schema-declaration-required" }, "Required")) : null, field.description ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, field.description)) : null), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-open-schema-overview-field": index }, "Open")));
    };
    const fieldRows = joinView(focusedFields.map(renderFieldRow), "");
    const otherRows = joinView(otherFields.map(renderFieldRow), "");
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-overview" }, previewableFields.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-overview-summary" }, /* @__PURE__ */ React.createElement("strong", null, heading, ":"), " ", /* @__PURE__ */ React.createElement("span", { className: "schema-declaration-overview-preview" }, preview.join(", "), remaining ? `${preview.length ? ", " : ""}+${remaining} more` : null))) : null, /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", null, "View and edit ", focusedFields.length, " field", focusedFields.length === 1 ? null : /* @__PURE__ */ React.createElement(React.Fragment, null, "s")), /* @__PURE__ */ React.createElement("ul", null, fieldRows), otherFields.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("details", { className: "schema-declaration-other-fields" }, /* @__PURE__ */ React.createElement("summary", null, "Other schema fields (", otherFields.length, ")"), /* @__PURE__ */ React.createElement("ul", null, otherRows))) : null)));
  };
  const schemaActionSource = schemaStructureEditing && sessionContext.isRecord(sessionContext.settingsDraft) ? sessionContext.schemaActionSourceForDeclaration({ document: schemaReferenceDocument, path: sessionContext.selectedPath, value: sessionContext.settingsDraft }) : null;
  const schemaActionSourceGenerated = schemaActionSource && (sessionContext.schemaGeneratedOwnerAtPath(sessionContext.model, schemaActionSource.path) || sessionContext.schemaGeneratedPathsWithin(sessionContext.model, schemaActionSource.path).length > 0);
  if (schemaActionSource && !schemaActionSourceGenerated && sessionContext.samePath(schemaActionSource.path, sessionContext.selectedPath)) schemaOmitKeys.push("x-fullmeta-editorActions");
  const schemaDefinitionChoices = declarationAuthoring ? Object.keys(schemaReferenceDocument?.$defs || {}).map((name) => ({
    name,
    reference: `#/$defs/${name.replace(/~/g, "~0").replace(/\//g, "~1")}`
  })) : [];
  let schemaRows;
  if (schemaStructureEditing) schemaRows = /* @__PURE__ */ React.createElement(
    SchemaStructure,
    {
      context: settingsContext,
      value: sessionContext.settingsDraft,
      label: sessionContext.selectedLabel || "Value",
      required: sessionContext.resolveModelEditorSchema(settingsSchema)?.required || [],
      omitKeys: [...schemaOmitKeys, "title", "description"],
      declarationAuthoring,
      definitionChoices: schemaDefinitionChoices,
      includeDeclarationAuthoring: false,
      generatedPaths
    }
  );
  else if (schemaDocumentLeaf && (Array.isArray(sessionContext.settingsDraft) || sessionContext.settingsDraft === null)) {
    const type = Array.isArray(sessionContext.settingsDraft) ? "json-array" : "json-value", raw = settingsContext.readDraft?.([]) ?? JSON.stringify(sessionContext.settingsDraft, null, 2);
    schemaRows = /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, sessionContext.selectedLabel || "Value"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
      "textarea",
      {
        "data-setting-path": "[]",
        "data-setting-type": type,
        "aria-label": sessionContext.selectedLabel || "JSON value",
        value: raw,
        onChange: (event) => settingsContext.onCommand({ type: "field.change", path: [], value: event.target.value, rawValue: event.target.value, valueType: type }, event)
      }
    )));
  } else if (schemaDocumentLeaf || selectedScalarValue || rootUi.widget || schemaWidget(settingsSchema)) schemaRows = /* @__PURE__ */ React.createElement(
    SchemaField,
    {
      label: sessionContext.selectedLabel || "Value",
      value: sessionContext.settingsDraft,
      path: [],
      schemaNode: settingsSchema,
      context: settingsContext
    }
  );
  else schemaRows = /* @__PURE__ */ React.createElement(SchemaObject, { value: sessionContext.settingsDraft, path: [], schemaNode: settingsSchema, context: settingsContext });
  const visibleEffectivePropertySources = effectivePropertySources.map((property, index) => ({ property, index })).filter(({ property }) => {
    const schema = property.schema || {};
    return !Object.hasOwn(schema, "const") && !(Array.isArray(schema.enum) && schema.enum.length === 1);
  });
  const validationBaseBinding = Array.isArray(sessionContext.selectedSchemaProjection?.binding) ? sessionContext.selectedSchemaProjection.binding : null;
  const validationSources = schemaStructureEditing && validationBaseBinding && sessionContext.activeApplicationPackage?.kind === "schemaDocument" ? sessionContext.activeApplicationPackage.schemaSourceFiles?.(sessionContext.model) || [] : [];
  const annotatedEffectivePropertyCount = visibleEffectivePropertySources.filter(({ property }) => sessionContext.fieldUiBehavior(property.schema, { context: "projectEditing" }) || sessionContext.isRecord(property.schema?.["x-fullmeta-modelReference"])).length;
  const inlineWidgetOptions = sessionContext.schemaUiWidgetOptions(sessionContext.activeApplicationPackage?.annotationCatalog, schemaWidgetProfiles);
  const effectivePropertyRows = visibleEffectivePropertySources.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { colSpan: Number("2") }, visibleEffectivePropertySources.some(({ property }) => property.scope === "shared") ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Effective properties \xB7 shared and inline") : /* @__PURE__ */ React.createElement(React.Fragment, null, "Declared properties"), annotatedEffectivePropertyCount ? /* @__PURE__ */ React.createElement(React.Fragment, null, " \xB7 ", annotatedEffectivePropertyCount, " annotated fields") : null)), joinView(visibleEffectivePropertySources.map(({ property, index }) => {
    const widget = sessionContext.resolveSchemaWidgetPresentation(property.schema, schemaWidgetProfiles)?.widget || sessionContext.widgetFromAnnotation(property.schema) || (property.schema?.$ref ? "reference" : property.schema?.type || "schema");
    const scope = property.scope === "shared" ? "Shared" : "Inline";
    const overview = schemaOverviewFor(property.file, property.path);
    const label = schemaOverviewConfiguration?.propertyLabels === true && overview?.label || property.name;
    const description = schemaOverviewConfiguration?.propertyDescriptions === true && overview?.description || "";
    const editorContexts = sessionContext.schemaUiWidgetContexts({
      options: inlineWidgetOptions,
      document: sessionContext.model,
      file: property.file,
      path: property.path,
      fieldName: property.name
    });
    const uiSummary = sessionContext.schemaFieldUiSummary(property.schema, index, property.name, property, {
      displayTitle: label,
      widgetOptions: inlineWidgetOptions,
      widgetContexts: editorContexts
    });
    const titleMarkup = uiSummary.editorIndex === null ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "schema-declaration-property-label" }, label)) : /* @__PURE__ */ React.createElement("span", { className: "schema-declaration-property-label" }, /* @__PURE__ */ React.createElement("span", { "data-schema-ui-annotation-title-label": uiSummary.editorIndex }, label), /* @__PURE__ */ React.createElement("span", { "data-schema-ui-annotation-title-host": uiSummary.editorIndex }));
    const validationRules = validationBaseBinding ? sessionContext.schemaValidationRulesForField([...validationBaseBinding, property.name], validationSources) : [];
    const propertyBinding = validationBaseBinding ? [...validationBaseBinding, property.name] : null;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, titleMarkup, /* @__PURE__ */ React.createElement("code", { className: "schema-declaration-property-key" }, property.name)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-property-meta" }, /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, widget, " \xB7 ", scope), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-open-effective-schema-property": index }, "Open")), uiSummary.html, sessionContext.schemaValidationSummary(validationRules, "Validation", "", propertyBinding, true), description ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "schema-declaration-description" }, description)) : null, renderSchemaOverview(overview))));
  }), "")) : null;
  const validationContextRules = validationBaseBinding ? sessionContext.validationProgramDesigner.rulesForBinding(validationBaseBinding, validationSources) : [];
  const validationContextRow = schemaStructureEditing && validationContextRules.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, sessionContext.schemaValidationContext(validationContextRules, validationBaseBinding)))) : null;
  const schemaAnnotationRawRow = sessionContext.schemaAnnotationEditor && schemaWidgetProfile?.rawAnnotation === "advanced" && schemaWidgetProfile.rawAnnotationPlacement === "otherFields" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-raw" }, /* @__PURE__ */ React.createElement("summary", null, "Advanced raw annotation"), /* @__PURE__ */ React.createElement("div", { className: "schema-widget-advanced-content" }, /* @__PURE__ */ React.createElement("input", { type: "text", "data-schema-structure-name": true, defaultValue: sessionContext.schemaAnnotationEditor.annotationKey, "aria-label": "Raw annotation property name" }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "open", "data-schema-structure-path": JSON.stringify(sessionContext.schemaAnnotationEditor.annotationPath || [sessionContext.schemaAnnotationEditor.annotationKey]) }, "Open"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "rename", "data-schema-structure-path": JSON.stringify(sessionContext.schemaAnnotationEditor.annotationPath || [sessionContext.schemaAnnotationEditor.annotationKey]) }, "Rename"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "remove", "data-schema-structure-path": JSON.stringify(sessionContext.schemaAnnotationEditor.annotationPath || [sessionContext.schemaAnnotationEditor.annotationKey]) }, "Remove")))))) : null;
  const schemaAnnotationRow = sessionContext.schemaAnnotationEditor ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, schemaWidgetProfile?.showHeading === true ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-widget-heading" }, "Widget \xB7 ", schemaAnnotationWidget)) : null, /* @__PURE__ */ React.createElement("div", { "data-schema-annotation-host": true }), schemaWidgetProfile?.rawAnnotation === "advanced" && schemaWidgetProfile.rawAnnotationPlacement !== "otherFields" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-raw" }, /* @__PURE__ */ React.createElement("summary", null, "Advanced raw annotation"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-schema-structure-name": true, defaultValue: sessionContext.schemaAnnotationEditor.annotationKey, "aria-label": "Raw annotation property name" }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "open", "data-schema-structure-path": JSON.stringify(sessionContext.schemaAnnotationEditor.annotationPath || [sessionContext.schemaAnnotationEditor.annotationKey]) }, "Open"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "rename", "data-schema-structure-path": JSON.stringify(sessionContext.schemaAnnotationEditor.annotationPath || [sessionContext.schemaAnnotationEditor.annotationKey]) }, "Rename"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "remove", "data-schema-structure-path": JSON.stringify(sessionContext.schemaAnnotationEditor.annotationPath || [sessionContext.schemaAnnotationEditor.annotationKey]) }, "Remove")))) : null))) : null;
  const leadSchemaAnnotationRow = schemaStructureEditing && schemaWidgetProfile?.placement === "primary" ? schemaAnnotationRow : null;
  const trailingSchemaAnnotationRow = leadSchemaAnnotationRow ? null : schemaAnnotationRow;
  const schemaTitleRow = schemaTitleEditable && sessionContext.schemaStructureDialogState ? (() => {
    const explicit = typeof sessionContext.settingsDraft.title === "string" ? sessionContext.settingsDraft.title : "";
    const current = sessionContext.effectiveSchemaTreeLabel(sessionContext.settingsDraft, sessionContext.selectedPath?.at(-1) || sessionContext.selectedLabel);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("section", { className: "schema-focused-declaration" }, /* @__PURE__ */ React.createElement("label", null, "Title", /* @__PURE__ */ React.createElement("input", { type: "text", "data-setting-path": '["title"]', "data-setting-type": "string", "data-setting-optional": "true", "aria-label": "Schema title", defaultValue: explicit, placeholder: current })), /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, "Readable caption shown in schema view and project settings. Leave blank to omit the title.")))));
  })() : "";
  const schemaActionRows = schemaActionSource && !schemaActionSourceGenerated ? (() => {
    const actions = schemaActionSource.actions || [];
    const direct = sessionContext.samePath(schemaActionSource.path, sessionContext.selectedPath);
    const sourceAttribute = direct ? {} : { "data-setting-source-path": JSON.stringify(schemaActionSource.path) };
    const rows = joinView(actions.map((value, index) => {
      if (!sessionContext.isRecord(value)) return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-focused-action" }, /* @__PURE__ */ React.createElement("strong", null, "Item ", index + 1), /* @__PURE__ */ React.createElement("span", null, "Open the full action definition to edit this value.")));
      const action = value;
      const name = typeof action.defaults?.name === "string" ? action.defaults.name : null;
      const actionLabel = typeof action.label === "string" ? action.label : "";
      const heading = actionLabel || `Item ${index + 1}`;
      const labelPath = JSON.stringify(["x-fullmeta-editorActions", index, "label"]);
      const namePath = JSON.stringify(["x-fullmeta-editorActions", index, "defaults", "name"]);
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-focused-action" }, /* @__PURE__ */ React.createElement("strong", null, heading), /* @__PURE__ */ React.createElement("div", { className: "schema-focused-action-fields" }, /* @__PURE__ */ React.createElement("label", null, "Add menu label", /* @__PURE__ */ React.createElement("input", { type: "text", "data-setting-path": labelPath, ...sourceAttribute, "data-setting-type": "string", "data-schema-action-facing": "true", "aria-label": "Item " + (index + 1) + " add menu label", defaultValue: actionLabel })), name !== null ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", null, "New item name", /* @__PURE__ */ React.createElement("input", { type: "text", "data-setting-path": namePath, ...sourceAttribute, "data-setting-type": "string", "data-schema-action-facing": "true", "aria-label": "Item " + (index + 1) + " new item name", defaultValue: name }))) : null)));
    }), "");
    const advanced = direct ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-raw" }, /* @__PURE__ */ React.createElement("summary", null, "Full action definitions"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-schema-structure-name": true, defaultValue: "x-fullmeta-editorActions", "aria-label": "Raw action property name" }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "open", "data-schema-structure-path": '["x-fullmeta-editorActions"]' }, "Open"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "rename", "data-schema-structure-path": '["x-fullmeta-editorActions"]' }, "Rename"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "remove", "data-schema-structure-path": '["x-fullmeta-editorActions"]' }, "Remove")))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-raw" }, /* @__PURE__ */ React.createElement("summary", null, "Full action definitions"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-open-schema-action-source": true }, "Open source declaration"))));
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("section", { className: "schema-focused-declaration" }, /* @__PURE__ */ React.createElement("h3", null, "Item actions"), actions.length ? rows : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, "No item actions declared.")), advanced))));
  })() : "";
  const schemaGuidanceRows = schemaStructureEditing && sessionContext.settingsDraft && typeof sessionContext.settingsDraft === "object" && !Array.isArray(sessionContext.settingsDraft) ? /* @__PURE__ */ React.createElement(SchemaStructure, { context: settingsContext, ...{ value: sessionContext.settingsDraft, label: sessionContext.selectedLabel || "Value", omitKeys: schemaOmitKeys, declarationAuthoring, definitionChoices: schemaDefinitionChoices, includeKeys: schemaTitleEditable ? ["description"] : ["title", "description"], includeAddPropertyRow: false, generatedPaths } }) : null;
  const selectedSchemaOverview = schemaOverviewFor(schemaOverviewSourceFile, sessionContext.selectedPath);
  const schemaShapeSummary = schemaStructureEditing && !schemaArrayWidgetDesign && sessionContext.settingsDraft && typeof sessionContext.settingsDraft === "object" && !Array.isArray(sessionContext.settingsDraft) ? (() => {
    const type = typeof sessionContext.settingsDraft.type === "string" && sessionContext.settingsDraft.type ? sessionContext.settingsDraft.type : sessionContext.settingsDraft.properties && typeof sessionContext.settingsDraft.properties === "object" ? "object" : Object.hasOwn(sessionContext.settingsDraft, "items") || Object.hasOwn(sessionContext.settingsDraft, "prefixItems") ? "array" : "schema";
    const propertyCount = Object.keys(sessionContext.settingsDraft.properties || {}).length;
    const requiredCount = Array.isArray(sessionContext.settingsDraft.required) ? sessionContext.settingsDraft.required.length : 0;
    const itemKey = Array.isArray(sessionContext.settingsDraft.prefixItems) ? "prefixItems" : Object.hasOwn(sessionContext.settingsDraft, "items") ? "items" : null;
    const details = type === "object" ? `${propertyCount} declared propert${propertyCount === 1 ? "y" : "ies"}${requiredCount ? ` \xB7 ${requiredCount} required` : ""}` : type === "array" ? sessionContext.schemaArrayItemStructureLabel(sessionContext.settingsDraft) : "";
    const openItemStructure = itemKey ? /* @__PURE__ */ React.createElement(React.Fragment, null, " ", /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "open", "data-schema-structure-path": JSON.stringify([itemKey]) }, "Open item structure")) : null;
    if (type === "schema" && !details && selectedSchemaOverview?.kind !== "choices") return "";
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, `${type === "schema" ? "Schema" : type[0].toUpperCase() + type.slice(1)}${details ? ` \xB7 ${details}` : ""}`), openItemStructure, selectedSchemaOverview?.kind === "array" || selectedSchemaOverview?.kind === "choices" ? renderSchemaOverview(selectedSchemaOverview) : null)));
  })() : schemaStructureEditing && !schemaArrayWidgetDesign && Array.isArray(sessionContext.settingsDraft) ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, "Array \xB7 ", sessionContext.settingsDraft.length, " item", sessionContext.settingsDraft.length === 1 ? null : /* @__PURE__ */ React.createElement(React.Fragment, null, "s"))))) : null;
  const regularSchemaRows = /* @__PURE__ */ React.createElement(React.Fragment, null, schemaRows || (effectivePropertyRows ? null : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2"), className: "settings-empty" }, "Select a model tree item to edit its settings.")))), effectivePropertyRows);
  const arrayItemKey = Array.isArray(sessionContext.settingsDraft?.prefixItems) ? "prefixItems" : Object.hasOwn(sessionContext.settingsDraft || {}, "items") ? "items" : null;
  const arrayItemPath = arrayItemKey ? JSON.stringify([arrayItemKey]) : "";
  const schemaArrayDeclarationRow = schemaArrayWidgetDesign ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("section", { className: "schema-array-declaration" }, /* @__PURE__ */ React.createElement("div", { className: "schema-array-declaration-heading" }, /* @__PURE__ */ React.createElement("h3", null, "Array declaration"), /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, "Type \xB7 Array")), /* @__PURE__ */ React.createElement("div", { className: "schema-array-declaration-grid" }, /* @__PURE__ */ React.createElement("label", { className: "schema-array-description" }, "Description", /* @__PURE__ */ React.createElement("input", { type: "text", "data-setting-path": '["description"]', "data-setting-type": "string", "aria-label": "Array description", defaultValue: typeof sessionContext.settingsDraft.description === "string" ? sessionContext.settingsDraft.description.replace(/\s*\r?\n\s*/g, " ") : "" })), /* @__PURE__ */ React.createElement("label", null, "Minimum items", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", step: "1", "data-setting-path": '["minItems"]', "data-setting-type": "number", "data-setting-optional": "true", "data-setting-nonnegative-integer": "true", "data-setting-array-bound": "minItems", "aria-label": "Minimum items", defaultValue: sessionContext.settingsDraft.minItems ?? "" })), /* @__PURE__ */ React.createElement("label", null, "Maximum items", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", step: "1", "data-setting-path": '["maxItems"]', "data-setting-type": "number", "data-setting-optional": "true", "data-setting-nonnegative-integer": "true", "data-setting-array-bound": "maxItems", "aria-label": "Maximum items", defaultValue: sessionContext.settingsDraft.maxItems ?? "" })), /* @__PURE__ */ React.createElement("label", null, "Unique items", /* @__PURE__ */ React.createElement("select", { "data-setting-path": '["uniqueItems"]', "data-setting-type": "optional-boolean", "aria-label": "Unique items", key: String(sessionContext.settingsDraft.uniqueItems), defaultValue: sessionContext.settingsDraft.uniqueItems === void 0 ? "" : String(sessionContext.settingsDraft.uniqueItems) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Not specified"), /* @__PURE__ */ React.createElement("option", { value: "true" }, "Yes"), /* @__PURE__ */ React.createElement("option", { value: "false" }, "No")))), /* @__PURE__ */ React.createElement("div", { className: "schema-array-item-structure" }, /* @__PURE__ */ React.createElement("strong", null, "Item structure"), /* @__PURE__ */ React.createElement("span", null, arrayItemKey ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Each item \xB7 ", sessionContext.schemaArrayItemStructureLabel(sessionContext.settingsDraft)) : sessionContext.schemaArrayItemStructureLabel(sessionContext.settingsDraft)), arrayItemKey ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "open", "data-schema-structure-path": arrayItemPath }, "Open ", arrayItemKey === "prefixItems" ? /* @__PURE__ */ React.createElement(React.Fragment, null, "positional schemas") : /* @__PURE__ */ React.createElement(React.Fragment, null, "item schema"))) : null), selectedSchemaOverview?.kind === "array" ? renderSchemaOverview(selectedSchemaOverview) : null)))) : null;
  const arrayWidgetAdvancedRows = schemaArrayWidgetDesign ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-advanced" }, /* @__PURE__ */ React.createElement("summary", null, "Other schema fields (expand to view)"), /* @__PURE__ */ React.createElement("div", { className: "schema-widget-advanced-content" }, /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "These schema fields are preserved here for inspection and editing. Array limits and the nested item schema are also available above."), /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-widget-advanced-table" }, /* @__PURE__ */ React.createElement("tbody", null, schemaRows, schemaAnnotationRawRow))))))) : null;
  const schemaWidgetAdvancedRows = schemaStructureEditing && !schemaArrayWidgetDesign && schemaAnnotationWidget && schemaWidgetProfile?.advancedFields === "collapsed" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-advanced" }, /* @__PURE__ */ React.createElement("summary", null, "Other schema fields (expand to view)"), /* @__PURE__ */ React.createElement("div", { className: "schema-widget-advanced-content" }, /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, schemaWidgetProfile?.advancedFieldsNote || "These schema fields are preserved here for inspection and editing, including validation rules and nested schema structure."), /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-widget-advanced-table" }, /* @__PURE__ */ React.createElement("tbody", null, schemaRows, schemaAnnotationRawRow))))))) : null;
  const generalSchemaAdvancedRows = schemaStructureEditing && !schemaArrayWidgetDesign && !schemaAnnotationWidget ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-advanced" }, /* @__PURE__ */ React.createElement("summary", null, "Other schema fields (expand to view)"), /* @__PURE__ */ React.createElement("div", { className: "schema-widget-advanced-content" }, /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "These schema fields are preserved here for inspection and editing, including validation rules, object and array structure, and raw keywords."), /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table schema-widget-advanced-table" }, /* @__PURE__ */ React.createElement("tbody", null, schemaRows))))))) : null;
  const focusedSchemaRows = arrayWidgetAdvancedRows || schemaWidgetAdvancedRows || generalSchemaAdvancedRows || (schemaStructureEditing ? /* @__PURE__ */ React.createElement(React.Fragment, null, schemaGuidanceRows, effectivePropertyRows) : regularSchemaRows);
  const rootSchemaTools = schemaStructureEditing && sessionContext.selectedPath?.length === 0 ? (() => {
    const readiness = sessionContext.activeApplicationPackage?.schemaReadiness?.(sessionContext.model) || [];
    const creationIssue = sessionContext.activeApplicationPackage?.projectCreationIssue?.(sessionContext.model) ?? "This schema package does not provide schema-based project creation.";
    const programs = sessionContext.schemaValidationProgramEntries(sessionContext.model);
    const readinessMarkup = joinView(readiness.map((entry) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("li", { className: "schema-readiness-item " + (entry.ready ? "ready" : "pending") }, /* @__PURE__ */ React.createElement("strong", null, entry.ready ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Ready") : /* @__PURE__ */ React.createElement(React.Fragment, null, "Needs input"), " \xB7 ", entry.label), entry.issue ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, entry.issue)) : null))), "");
    const ruleMarkup = programs.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-validation-program-grid" }, /* @__PURE__ */ React.createElement("div", { className: "schema-validation-program-tree", "data-schema-validation-program-tree": true }), /* @__PURE__ */ React.createElement("div", { className: "schema-validation-program-settings", "data-schema-validation-program-settings": true }))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "No validation program yet. Add one here, then add assertions, selectors, variable bindings and conditions in the structured editor."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-add-validation-program": true }, "Add validation program"));
    const groups = /* @__PURE__ */ new Map();
    for (const tool of sessionContext.visibleSchemaAuthoringTools()) {
      if (!groups.has(tool.group)) groups.set(tool.group, []);
      groups.get(tool.group).push(tool);
    }
    const toolMarkup = joinView([...groups].map(([group, tools]) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", null, group), joinView(tools.map((tool) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-authoring-tool": tool.id }, tool.label, "\u2026"))), ""))), "");
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("section", { className: "schema-root-authoring-tools" }, /* @__PURE__ */ React.createElement("h3", null, "Build a project from this schema"), /* @__PURE__ */ React.createElement("ul", { className: "schema-readiness" }, readinessMarkup), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button primary", "data-schema-create-project": true, ...creationIssue ? { "disabled": true } : {}, ...creationIssue ? { "title": creationIssue } : {} }, "Create project from this schema"), creationIssue ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, creationIssue)) : null, toolMarkup, ruleMarkup))));
  })() : "";
  const schemaChoicesVisible = schemaChoices && Array.isArray(sessionContext.settingsDraft?.enum) && sessionContext.settingsDraft.enum.length > 0;
  const schemaChoiceEditorRow = schemaChoicesVisible ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("div", { "data-schema-choice-editor": true })))) : null;
  const schemaAuthoringAdvancedRows = schemaStructureEditing && (schemaChoices && !schemaChoicesVisible || schemaAnnotationPicker || uiGroupPresent) ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-advanced", "data-schema-authoring-advanced": true }, /* @__PURE__ */ React.createElement("summary", null, "Advanced schema options"), /* @__PURE__ */ React.createElement("div", { className: "schema-widget-advanced-content" }, schemaChoices && !schemaChoicesVisible ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h3", null, "Allowed values"), /* @__PURE__ */ React.createElement("div", { "data-schema-choice-editor": true }))) : null, uiGroupPresent ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h3", null, "Presentation annotations"), sessionContext.schemaUiEditor ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { "data-schema-ui-annotation-host": true })) : null, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-raw" }, /* @__PURE__ */ React.createElement("summary", null, "Advanced raw UI annotations"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "open", "data-schema-structure-path": '["x-fullmeta-ui-behavior"]' }, "Open"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-schema-structure-action": "remove", "data-schema-structure-path": '["x-fullmeta-ui-behavior"]' }, "Remove"))))) : null, schemaAnnotationPicker ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h3", null, "Add presentation annotation"), /* @__PURE__ */ React.createElement("div", { "data-schema-annotation-picker": true }))) : null))))) : null;
  const schemaRelatedSources = schemaStructureEditing && Array.isArray(sessionContext.selectedSchemaProjection?.relatedSources) ? sessionContext.selectedSchemaProjection.relatedSources.filter((source, index, sources) => typeof source?.label === "string" && typeof source.file === "string" && Array.isArray(source.path) && !sources.slice(0, index).some((previous) => previous?.file === source.file && sessionContext.samePath(previous.path, source.path))) : [];
  const schemaRelatedSourcesRow = schemaRelatedSources.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("details", { className: "schema-widget-advanced" }, /* @__PURE__ */ React.createElement("summary", null, "Related schema declarations"), /* @__PURE__ */ React.createElement("div", { className: "schema-widget-advanced-content" }, joinView(schemaRelatedSources.map((source, index) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "schema-declaration-variant" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, source.label), /* @__PURE__ */ React.createElement("span", null, source.file, sessionContext.schemaDocumentPointer(source.path))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-open-related-schema-source": index }, "Open")))), "")))))) : null;
  const schemaPrimaryRows = schemaStructureEditing ? sessionContext.activeApplicationPackage.schemaEditorPresentation?.propertiesFirst === true ? /* @__PURE__ */ React.createElement(React.Fragment, null, schemaShapeSummary, validationContextRow, schemaGuidanceRows, effectivePropertyRows, schemaChoicesVisible ? schemaChoiceEditorRow : null, schemaActionRows) : /* @__PURE__ */ React.createElement(React.Fragment, null, schemaActionRows, schemaShapeSummary, validationContextRow, schemaGuidanceRows, effectivePropertyRows, schemaChoicesVisible ? schemaChoiceEditorRow : null) : null;
  const settingsRows = selectedGeneratedOwner ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("div", { className: "settings-generated-id" }, "Generated by guided schema authoring."), /* @__PURE__ */ React.createElement("div", { className: "settings-empty" }, "Owner: ", selectedGeneratedOwner.path?.length ? selectedGeneratedOwner.path.join(" / ") : "schema root", " \xB7 ", selectedGeneratedOwner.input, ". Edit the owning choice with a guided authoring operation.")))) : /* @__PURE__ */ React.createElement(React.Fragment, null, declaredSettingsNotes, schemaTitleRow, schemaArrayDeclarationRow, leadSchemaAnnotationRow, schemaPrimaryRows, focusedSchemaRows, inheritedWidget ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Inherited UI widget"), /* @__PURE__ */ React.createElement("td", null, inheritedWidget.label, " \xB7 ", inheritedWidget.file, inheritedWidget.pointer, " ", /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "data-open-inherited-widget": true }, "Open source")))) : null, trailingSchemaAnnotationRow, schemaRelatedSourcesRow, schemaAuthoringAdvancedRows);
  const documentWidgets = sessionContext.activeApplicationPackage?.kind === "schemaDocument" ? sessionContext.activeApplicationPackage.schemaEditorPresentation?.documentWidgets || [] : [];
  const documentWidget = sessionContext.documentWidgetAtPath(documentWidgets, sessionContext.selectedPath);
  const sourceWidget = sessionContext.selectedPath.length === 0 && documentWidget?.widget === "source" ? documentWidget : null;
  const graphicsWidget = documentWidget?.widget === "graphicsConsole" ? documentWidget : null;
  const interfacesWidget = documentWidget?.widget === "graphicsInterfaces" ? documentWidget : null;
  const structuredWidget = documentWidget?.widget === "structured" ? documentWidget : null;
  const contentRows = sourceWidget ? /* @__PURE__ */ React.createElement(React.Fragment, null, rootSchemaTools, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("div", { "data-document-widget-index": true }))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("details", { className: "schema-source-widget" }, /* @__PURE__ */ React.createElement("summary", null, "Widget \u2192 ", sourceWidget.widget, " \xB7 ", sourceWidget.label), /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table" }, /* @__PURE__ */ React.createElement("tbody", null, settingsRows)))))) : graphicsWidget ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("div", { className: "schema-widget-heading" }, "Widget \u2192 ", graphicsWidget.widget), /* @__PURE__ */ React.createElement("div", { "data-document-widget-editor": true }), /* @__PURE__ */ React.createElement("div", { "data-document-widget-related": true }))), settingsRows) : interfacesWidget ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("div", { className: "schema-widget-heading" }, "Widget \u2192 ", interfacesWidget.label), /* @__PURE__ */ React.createElement("div", { "data-document-widget-editor": true })))) : structuredWidget ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("div", { className: "schema-widget-heading" }, "Widget \u2192 ", structuredWidget.label), /* @__PURE__ */ React.createElement("div", { "data-document-widget-editor": true })))) : /* @__PURE__ */ React.createElement(React.Fragment, null, rootSchemaTools, settingsRows);
  renderOwnedView(body, /* @__PURE__ */ React.createElement(React.Fragment, { key: settingsIdentity }, documentMetadataRows, contentRows));
  const documentWidgetIndex = body.querySelector("[data-document-widget-index]");
  if (documentWidgetIndex) sessionContext.mountDocumentWidgetIndex(documentWidgetIndex, {
    widgets: documentWidgets,
    sourceDocument: sessionContext.model,
    open(widget) {
      sessionContext.selectItem(widget.label, widget.path, null);
      sessionContext.settingsTable.parentElement.scrollTop = 0;
    },
    create(widget) {
      try {
        if (!Array.isArray(widget.path) || !widget.path.length || widget.initialValue === void 0) throw new Error("This resource has no schema-valid initial value.");
        if (sessionContext.documentValueAtPath(sessionContext.model, widget.path) !== void 0) throw new Error(`${widget.label} is already declared.`);
        const candidate = sessionContext.cloneJson(sessionContext.model);
        let owner = candidate;
        for (const key of widget.path.slice(0, -1)) {
          if (!sessionContext.isRecord(owner[key])) owner[key] = {};
          owner = owner[key];
        }
        owner[widget.path.at(-1)] = sessionContext.cloneJson(widget.initialValue);
        const errors = sessionContext.validateFullMetaModelWithRules(candidate);
        if (errors.length) throw new Error(`Could not create ${widget.label}: ${errors[0]}`);
        sessionContext.model = candidate;
        sessionContext.selectedPath = widget.path.slice();
        sessionContext.selectedCollection = null;
        sessionContext.selectedLabel = widget.label;
        sessionContext.selectedSchemaProjection = null;
        sessionContext.settingsDraft = sessionContext.cloneJson(widget.initialValue);
        sessionContext.settingsDraftDirty = false;
        sessionContext.renderModel();
        sessionContext.setStatus(`Created ${widget.label}. Save to keep the change.`, "good");
      } catch (error) {
        sessionContext.setStatus(error.message, "error");
      }
    }
  });
  body.querySelector("[data-schema-create-project]")?.addEventListener("click", () => {
    sessionContext.openNewModelDialog({ fromSchema: true }).catch((error) => sessionContext.setStatus(`Could not start a project from this schema. ${error.message}`, "error"));
  });
  body.querySelector("[data-schema-add-validation-program]")?.addEventListener("click", sessionContext.addSchemaValidationProgram);
  for (const trigger of body.querySelectorAll("[data-schema-authoring-tool]")) trigger.addEventListener("click", () => {
    try {
      void sessionContext.openSchemaAuthoringTool(trigger.dataset.schemaAuthoringTool, []).catch((error) => sessionContext.setStatus(error.message, "error"));
    } catch (error) {
      sessionContext.setStatus(error.message, "error");
    }
  });
  const programTree = body.querySelector("[data-schema-validation-program-tree]");
  const programSettings = body.querySelector("[data-schema-validation-program-settings]");
  if (programTree && programSettings) {
    const designer = sessionContext.createValidationProgramDesigner({
      treeParent: programTree,
      settingsParent: programSettings,
      onApply: (entry) => {
        try {
          sessionContext.applySchemaValidationProgramEdit(entry);
        } catch (error) {
          sessionContext.setStatus(error.message, "error");
        }
      }
    });
    designer.update(sessionContext.activeApplicationPackage.schemaSourceFiles(sessionContext.model));
  }
  body.querySelectorAll("[data-schema-validation-dialog]").forEach((button) => button.addEventListener("click", () => {
    const entry = sessionContext.schemaValidationDialogEntries[Number(button.dataset.schemaValidationDialog)];
    if (!entry) return;
    sessionContext.validationExpressionDialog.open(entry);
  }));
  body.querySelectorAll("[data-schema-ui-annotation-inline-host]").forEach((placeholder) => {
    const record = sessionContext.schemaUiAnnotationEditorEntries[Number(placeholder.dataset.schemaUiAnnotationInlineHost)];
    if (record) placeholder.replaceChildren(record.host);
  });
  body.querySelectorAll("[data-schema-ui-annotation-title-host]").forEach((titleHost) => {
    const record = sessionContext.schemaUiAnnotationEditorEntries[Number(titleHost.dataset.schemaUiAnnotationTitleHost)];
    if (record) record.titleHost = titleHost;
  });
  if (sessionContext.schemaAnnotationEditor) body.querySelector("[data-schema-annotation-host]").replaceChildren(schemaAnnotationHost);
  if (sessionContext.schemaUiEditor) body.querySelector("[data-schema-ui-annotation-host]").replaceChildren(schemaUiHost);
  const documentWidgetEditor = body.querySelector("[data-document-widget-editor]");
  if (documentWidgetEditor) documentWidgetEditor.append(sessionContext.schemaGraphicsHost);
  if (documentWidgetEditor && interfacesWidget) documentWidgetEditor.append(sessionContext.schemaGlobalUiHost);
  if (documentWidgetEditor && structuredWidget) documentWidgetEditor.append(sessionContext.schemaGlobalUiHost);
  const relatedHost = body.querySelector("[data-document-widget-related]");
  if (relatedHost) renderOwnedView(relatedHost, /* @__PURE__ */ React.createElement(React.Fragment, null, graphicsWidget.related.map((resource, index) => /* @__PURE__ */ React.createElement("button", { key: JSON.stringify(resource.path) + index, type: "button", className: "button", disabled: sessionContext.documentValueAtPath(sessionContext.model, resource.path) === void 0, onClick: (event) => sessionContext.openSchemaStructureDialog({ label: resource.label, path: resource.path, projection: null }, event.currentTarget) }, "Open ", resource.label))));
  sessionContext.showSchemaGraphicsDesign(sessionContext.selectedPath, sessionContext.settingsDraft);
  sessionContext.showSchemaGlobalUiDesign(sessionContext.selectedPath, sessionContext.settingsDraft);
  body.querySelector("[data-open-schema-action-source]")?.addEventListener("click", (event) => {
    if (!schemaActionSource) return;
    const label = `${sessionContext.selectedLabel} \xB7 item actions`;
    sessionContext.openSchemaStructureDialog({ label, path: schemaActionSource.path, projection: null }, event.currentTarget);
  });
  body.querySelectorAll("[data-open-effective-schema-property]").forEach((button) => button.addEventListener("click", () => {
    const property = effectivePropertySources[Number(button.dataset.openEffectiveSchemaProperty)];
    if (!property) return;
    const label = `${sessionContext.selectedLabel} \xB7 ${property.name}`;
    sessionContext.openSchemaStructureDialog({ label, path: property.path, projection: null }, button);
  }));
  body.querySelectorAll("[data-schema-ui-annotation-editor]").forEach((button) => button.addEventListener("click", () => {
    const record = sessionContext.schemaUiAnnotationEditorEntries[Number(button.dataset.schemaUiAnnotationEditor)];
    if (record) sessionContext.schemaUiAnnotationEditor.open(record.entry, record.host, button, record.titleHost);
  }));
  body.querySelectorAll("[data-open-schema-overview-field]").forEach((button) => button.addEventListener("click", () => {
    const field = schemaOverviewFieldSources[Number(button.dataset.openSchemaOverviewField)];
    if (!field) return;
    const label = `${sessionContext.selectedLabel} \xB7 ${field.label}`;
    sessionContext.openSchemaStructureDialog({ label, path: field.path, projection: null }, button);
  }));
  body.querySelectorAll("[data-open-schema-overview-variant]").forEach((button) => button.addEventListener("click", () => {
    const variant = schemaOverviewVariantSources[Number(button.dataset.openSchemaOverviewVariant)];
    if (!variant) return;
    const label = `${sessionContext.selectedLabel} \xB7 ${variant.label}`;
    sessionContext.openSchemaStructureDialog({ label, path: variant.path, projection: null }, button);
  }));
  body.querySelectorAll("[data-open-related-schema-source]").forEach((button) => button.addEventListener("click", () => {
    const source = schemaRelatedSources[Number(button.dataset.openRelatedSchemaSource)];
    if (!source) return;
    sessionContext.openSchemaStructureDialog({ label: source.label, path: source.path, projection: null }, button);
  }));
  body.querySelector("[data-open-inherited-widget]")?.addEventListener("click", () => {
    const source = { sourceFile: inheritedWidget.file, path: inheritedWidget.path, label: inheritedWidget.label, sourcePointer: inheritedWidget.pointer };
    sessionContext.selectItem(source.label, source.path, null);
  });
  if (schemaChoices) {
    sessionContext.schemaChoiceEditor = sessionContext.mountSchemaChoiceAuthoring({
      container: body.querySelector("[data-schema-choice-editor]"),
      declaration: sessionContext.settingsDraft,
      state: sessionContext.schemaChoiceState,
      onDraftChange(snapshot) {
        sessionContext.schemaChoiceState = snapshot;
        sessionContext.schemaChoiceChanged = true;
        sessionContext.settingsDraftDirty = true;
        sessionContext.updateApplySettingsVisibility();
        sessionContext.syncModelActionAvailability();
        sessionContext.setStatus("Updated allowed values. Apply item and Save to keep the change.");
      }
    });
  }
  if (schemaAnnotationPicker) {
    const catalog = sessionContext.activeApplicationPackage.annotationCatalog;
    sessionContext.mountSchemaAnnotationPicker({
      container: body.querySelector("[data-schema-annotation-picker]"),
      declaration: sessionContext.settingsDraft,
      catalog: schemaProjectionGroup ? { presentationFields: catalog.presentationFields?.filter((field) => field.key === "icon") || [] } : catalog,
      isRootSchema: sessionContext.selectedPath.length === 0,
      fieldContext: sessionContext.activeApplicationPackage.fieldUiContext,
      onAdd(next, { kind, path, key }) {
        try {
          if (!sessionContext.commitInputsBeforeRowMove()) return;
          sessionContext.flushSchemaDraftEditors();
          const added = path.reduce((value, part) => value?.[part], next);
          const addedBehavior = sessionContext.fieldUiBehavior(next);
          const draft = sessionContext.legacyFieldUiView(sessionContext.settingsDraft);
          if (!sessionContext.isRecord(draft["x-fullmeta-ui"])) draft["x-fullmeta-ui"] = {};
          if (kind === "type") {
            for (const type of sessionContext.activeApplicationPackage.annotationCatalog?.types || []) if (typeof type?.key === "string") delete draft[type.key];
            draft["x-fullmeta-ui"].widget = addedBehavior?.payload?.widget?.type;
            draft[key] = sessionContext.cloneJson(added);
          } else draft["x-fullmeta-ui"][key] = sessionContext.cloneJson(added);
          const encoded = sessionContext.writeFieldUiBehavior(draft, { context: sessionContext.fieldUiBehavior(sessionContext.settingsDraft)?.context || sessionContext.activeApplicationPackage.fieldUiContext || "projectEditing" });
          sessionContext.settingsDraft = encoded;
          sessionContext.settingsDraftDirty = true;
          sessionContext.renderSettingsTable();
          sessionContext.updateApplySettingsVisibility();
          sessionContext.updateModelEditState();
          sessionContext.syncModelActionAvailability();
          sessionContext.setStatus(`Added ${key}. Apply item and Save to keep the annotation.`);
        } catch (error) {
          sessionContext.setStatus(error.message, "error");
        }
      }
    });
  }
}
function projectRoutingSettingsRows(sessionContext) {
  const application = String(sessionContext.model?.application ?? ""), schema = String(sessionContext.model?.["x-fullmeta-schema"] ?? "");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Application"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-project-routing": "application", maxLength: Number("120"), defaultValue: application, "aria-label": "Project application" }))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Schema path"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("input", { type: "text", "data-project-routing": "schema", maxLength: Number("512"), defaultValue: schema, "aria-label": "Project schema path" }))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2") }, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-project-routing-apply": true, disabled: true }, "Apply routing fields"), /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, " Save after applying. Reopen the project to load the selected application and schema."))));
}
function renderDefinitionTable(sessionContext) {
  const kind = sessionContext.selectedCollection, config = sessionContext.definitionCollectionConfig(kind), isParameters = Boolean(config.showResolvedValue), definitions = sessionContext.valueAt(sessionContext.definitionCollectionPath(kind)) || [], body = sessionContext.settingsTable.tBodies[0];
  const columns = isParameters ? ["Symbol", "Expression", "Unit", "Value", "Description", ""] : ["Symbol", "Expression", "Unit", "Description", ""];
  sessionContext.settingsTable.classList.add("definition-table");
  sessionContext.settingsTable.dataset.columnResizeKey = `definitions:${sessionContext.model.metadata.id}:${kind}`;
  sessionContext.settingsTable.setAttribute("aria-label", config.tableLabel);
  renderOwnedView(sessionContext.settingsTable.tHead, /* @__PURE__ */ React.createElement("tr", null, columns.map((column, index) => /* @__PURE__ */ React.createElement("th", { key: index }, column || "Actions"))));
  let resolved = null, resolveError = "";
  if (isParameters) try {
    resolved = sessionContext.resolveModelParameters(sessionContext.modelValueAtRole(config.symbolRole));
  } catch (error) {
    resolveError = error.message;
  }
  const rows = definitions.map((definition, index) => {
    const label = sessionContext.definitionControlLabel(definition), input = (field, value) => {
      const expression = field === "symbol" || field === "expression";
      return /* @__PURE__ */ React.createElement("input", { className: `definition-input ${field === "description" ? "definition-description" : ""}`, type: "text", autoComplete: expression ? "off" : void 0, autoCapitalize: expression ? "off" : void 0, spellCheck: expression ? false : void 0, "data-definition-index": index, "data-definition-field": field, "data-definition-committed-value": value ?? "", defaultValue: value ?? "", "aria-label": `${label} ${field}` });
    };
    const unit = /* @__PURE__ */ React.createElement("select", { key: definition.unit ?? "1", "data-definition-index": index, "data-definition-field": "unit", "data-definition-committed-value": definition.unit ?? "1", "aria-label": `${label} unit`, defaultValue: definition.unit ?? "1" }, sessionContext.modelUnitChoices.map((unit2) => /* @__PURE__ */ React.createElement("option", { key: unit2, value: unit2 }, unit2)));
    let valueCell = "";
    if (isParameters) {
      try {
        const si = resolved?.[definition.symbol]?.value, scale = sessionContext.getUnit(definition.unit).scale;
        valueCell = Number.isFinite(si) ? Number(si / scale).toPrecision(6) : "\u2014";
      } catch {
        valueCell = "\u2014";
      }
      valueCell = /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("td", { className: "definition-value", title: resolveError }, valueCell));
    }
    const moveButtons = /* @__PURE__ */ React.createElement(RowMoveControls, { ...{ index, length: definitions.length, label, attributes: { "data-row-move-scope": "model", "data-row-move-path": JSON.stringify(sessionContext.definitionCollectionPath(kind)), "data-row-move-index": index } } });
    return /* @__PURE__ */ React.createElement("tr", { key: `${kind}:${definition.id ?? index}` }, /* @__PURE__ */ React.createElement("td", null, input("symbol", definition.symbol)), /* @__PURE__ */ React.createElement("td", null, input("expression", definition.expression)), /* @__PURE__ */ React.createElement("td", null, unit), valueCell, /* @__PURE__ */ React.createElement("td", null, input("description", definition.description || "")), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { className: "row-actions" }, moveButtons, /* @__PURE__ */ React.createElement("button", { className: "button definition-remove", type: "button", "data-definition-remove": index, "aria-label": `Delete ${label}` }, "Delete"))));
  });
  const emptyLabel = config.emptyLabel, addLabel = config.addLabel;
  renderOwnedView(body, /* @__PURE__ */ React.createElement(React.Fragment, null, definitions.length ? rows : /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: columns.length, className: "settings-empty" }, "No ", emptyLabel, " defined yet.")), /* @__PURE__ */ React.createElement("tr", { className: "definition-table-foot" }, /* @__PURE__ */ React.createElement("td", { colSpan: columns.length }, /* @__PURE__ */ React.createElement("button", { className: "button", type: "button", "data-definition-add": true }, "Add ", addLabel)))));
}
function renderSelectedItemSettings(sessionContext, label, path) {
  sessionContext.updateSelectionActionVisibility();
  sessionContext.updateWorkflowPanels();
  try {
    sessionContext.renderSettingsTable();
    return true;
  } catch (error) {
    console.error("Settings render failed", error);
    sessionContext.settingsTable.classList.remove("hidden", "definition-table");
    renderOwnedView(sessionContext.settingsTable.tHead, /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Setting"), /* @__PURE__ */ React.createElement("th", null, "Value"))));
    const value = sessionContext.valueAt(path), serialized = value === void 0 ? "Unavailable" : JSON.stringify(value, null, 2);
    renderOwnedView(sessionContext.settingsTable.tBodies[0], /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: Number("2"), className: "settings-empty" }, "Could not render ", label || "selected item", " settings: ", error.message || String(error))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", null, "Selected JSON value"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("pre", null, serialized)))));
    sessionContext.$("#editor-note").textContent = "The item is selected. Its application settings renderer failed; selection actions remain available.";
    sessionContext.updateApplySettingsVisibility();
    sessionContext.setStatus(`Could not render ${label || "selected item"} settings. ${error.message || String(error)}`, "error");
    return false;
  }
}
function createController(context) {
  return {
    hasSettingsDraft: hasSettingsDraft.bind(null, context),
    modelWithEditorSettingsDraft: modelWithEditorSettingsDraft.bind(null, context),
    editorSettingsDraftIsValid: editorSettingsDraftIsValid.bind(null, context),
    fitSettingsColumnsToPane: fitSettingsColumnsToPane.bind(null, context),
    updateApplySettingsVisibility: updateApplySettingsVisibility.bind(null, context),
    initializeSettingsSurface: initializeSettingsSurface.bind(null, context),
    applyCurrentSettingsDraft: applyCurrentSettingsDraft.bind(null, context),
    updateFieldSummary: updateFieldSummary.bind(null, context),
    renderFieldSettings: renderFieldSettings.bind(null, context),
    renderSettingsTable: renderSettingsTable.bind(null, context),
    definitionLabel: definitionLabel.bind(null, context),
    definitionControlLabel: definitionControlLabel.bind(null, context),
    definitionCollectionConfig: definitionCollectionConfig.bind(null, context),
    definitionCollectionPath: definitionCollectionPath.bind(null, context),
    definitionCollectionKindForPath: definitionCollectionKindForPath.bind(null, context),
    definitionCollectionLabel: definitionCollectionLabel.bind(null, context),
    projectRoutingSettingsRows: projectRoutingSettingsRows.bind(null, context),
    renderDefinitionTable: renderDefinitionTable.bind(null, context),
    refreshDefinitionRow: refreshDefinitionRow.bind(null, context),
    setDefinitionInputError: setDefinitionInputError.bind(null, context),
    commitDefinitionInput: commitDefinitionInput.bind(null, context),
    commitSettingsInput: commitSettingsInput.bind(null, context),
    applySettingsDraftAfterFieldBlur: applySettingsDraftAfterFieldBlur.bind(null, context),
    reportDefinitionChange: reportDefinitionChange.bind(null, context),
    defaultValueForOptionalField: defaultValueForOptionalField.bind(null, context),
    restoreMovedRowFocus: restoreMovedRowFocus.bind(null, context),
    moveSettingsTableRow: moveSettingsTableRow.bind(null, context),
    renderSelectedItemSettings: renderSelectedItemSettings.bind(null, context),
    selectDefinitionCollection: selectDefinitionCollection.bind(null, context),
    settingsInsertionTarget: settingsInsertionTarget.bind(null, context),
    syncResultSettingsDraft: syncResultSettingsDraft.bind(null, context),
    updateFieldPlotRecipe: updateFieldPlotRecipe.bind(null, context),
    updateFieldCutPlanePosition: updateFieldCutPlanePosition.bind(null, context)
  };
}
export {
  ModelOverviewIdentityRows,
  createController
};

//# sourceMappingURL=settings-controller.js.map
