# Shared UI contracts and widgets

This folder holds application-neutral UI contracts and their reusable renderers.

- `widgets/` holds reusable widget packages and `catalog.json`. Each widget owns its `widget.js` public interface, implementation, styles, and specific JSON contracts and validation adapters. Application code supplies schema resolution and recursive field rendering through callbacks.
- `widgets/shared/` holds support used by several widgets.
- `schemas/` holds the common UI annotation envelope, widget catalog contract, and `contract-validation.js` helper used by widget validation adapters.

Application UI folders follow the same layout. Application packages and catalogs live in `applications/{APP_ID}/ui/widgets/`; an application adds `ui/schemas/` only when it needs additional contracts shared by several of its widgets. Common platform contracts are referenced rather than copied into applications.

React + JSX component sources use the supplied [frontend build and watch workflow](frontend-development.md), compiled public `.js` entries and one shared local React runtime. The [visible editor debugging guide](editor-debugging.md) documents serializable state, normal commands, explicit fixture/live services and same-tab build/reload/replay at the existing localhost origin. Schema authors continue selecting widgets through declarations.

## Shared panel building blocks

| Panel | Generic building blocks | What the application supplies |
|---|---|---|
| Tree | The document-level `x-fullmeta-ui-tree` descriptor and recursive tree widget | The tree declaration/data and application-specific actions or item behavior |
| Settings | `valueControl`, `quantity`, `quantityVector`, `scan`, `scanTable`, `relatedFields`, `repeatableChoiceTable`, `dynamicPropertySet`, `referenceSelector`, `keyedChoiceMatrix`, `tabularSliceSelector` | Schema constraints, widget configuration, and any option/data providers |
| Graphics | `sceneView`, `selectionHighlight`, `plot1d`, `plot2d`, `plot3d`, `table`, and the graphics console contract | Scene, layer, tab, selection, and data-binding declarations plus adapters that map application data into normalized render data |

These cover the reusable patterns identified in the current model schema and editor. The renderers do not contain FEM meanings: application packages provide data, labels, choices, and action handlers at the boundary.

`row-collection`, `repeatable-choice`, and `shared/` provide reusable parts for other widgets; common plotting support is in `shared/plots/`. Plot, scene, tree, and validation-program contracts describe different surfaces, so they do not use the settings-field authoring dialog.

## Unified UI behavior language

Field-level UI behavior is stored inline on its JSON Schema declaration under `x-fullmeta-ui-behavior`. Every field envelope uses `format: "fullmeta-ui-behavior/1"`, `target.kind: "field"`, and `context: "projectEditing"`. Cross-widget presentation belongs in `payload.presentation`; widget-specific behavior belongs in `payload.widget.type` and `payload.widget.settings`. For example:

```json
{
  "title": "Coordinate filter",
  "x-fullmeta-ui-behavior": {
    "format": "fullmeta-ui-behavior/1",
    "target": { "kind": "field" },
    "context": "projectEditing",
    "payload": {
      "widget": { "type": "valueControl", "settings": { "optionalToggleLabel": "Restrict by coordinate" } }
    }
  }
}
```

JSON Schema continues to own the stored value and constraints. `ui/schemas/fullmeta-ui-behavior-1.schema.json` defines the shared envelope branches, `ui/annotation-catalog.json` registers field annotations, and existing widget contract schemas validate each widget's `payload.widget.settings`. The versioned envelope is the only supported stored field-annotation format; schemas using older field keys must be migrated before use.

Global widget authoring profiles live in the interpreter schema, `platform/schema-editor/schema-editor.schema.json`, under `x-fullmeta-ui-schemaAuthoring.profiles`. Each profile uses the same format with `target.kind: "widget"`, a widget name, and `context: "schemaAuthoring"`. Project field settings and schema-authoring profiles are loaded from their respective targets. This is the only supported location for widget authoring profiles; application schemas using the retired `x-fullmeta-schemaWidgetConfig` link must move their profiles into the interpreter.

The interpreter also registers document-wide schema-editing widgets in `x-fullmeta-ui-schemaAuthoring.presentation.documentWidgets`. A widget names a data path in the opened schema and may link to related resource paths. The shared document-resource host opens those paths in Settings; the Graphics console designer is selected by widget type. These registrations only apply to schema documents. The Graphics console and interfaces remain separate root data declarations, while the schema tree displays declarations rather than resource subtrees.

Root-level UI metadata such as graphics consoles, model-editor behavior, and tree declarations remains attached to the document because it configures a document-wide surface rather than one field. The new field envelope does not change project JSON or JSON Schema constraints.

For a schema-selected settings widget, the field caption comes from the declaration's JSON Schema `title`; its widget and behavior come from `payload.widget.type` and `payload.widget.settings`. Model Editor is the schema-authoring surface: it displays field UI annotations on their schema declarations and edits the schema document in place.

Application-owned compositions belong under `applications/<id>/ui/widgets/`. FEM registers its graphics widgets under `applications/fem3/ui/widgets/` and supplies data sources to shared settings widgets. The application package registers these runtime providers.

The shared `scan` widget renders one schema-defined choice and its value mode. Its field settings live at `payload.widget.settings` on the row declaration; the row's JSON Schema defines the linear and explicit-list variants. The `scanTable` widget builds a collection by calling that row renderer, with its settings on the array declaration and its item schema selecting `scan`. The table owns add, remove, and row ordering. Their contracts live beside their implementations in `widgets/scan/fullmeta-ui-scan-1.schema.json` and `widgets/scan-table/fullmeta-ui-scanTable-1.schema.json`; their legacy-named wrapper properties describe payload shapes, not the current stored field keys.

The quantity-vector widget uses `payload.widget.type: "quantityVector"`. Its `payload.widget.settings.componentLabels` name fixed entries, or `componentSource` names an application provider for entries whose labels, units, and optional initial expressions depend on the active model. The shared widget constructs one stored quantity per descriptor and renders each component; it never chooses an application-specific expression. `unitReadOnly` displays provider units without a selector. The model schema independently declares the value as an array with `items`, `minItems`, and `maxItems`; the existing JSON Schema validator checks those rules without widget-specific behavior. The shared contract in `widgets/quantity-vector/fullmeta-ui-quantityVector-1.schema.json` describes the settings payload.

An application package can implement `quantityVectorComponents({ source, model, physics })` and return descriptors with `symbol` or `label` and `unit`. The quantity-vector heading comes from the field name. The effective field's standard JSON Schema `default` supplies initial values. The Model Editor's schema-document authoring profile can use the model schema's `x-fullmeta-ui-program.componentSourceModule` to load `quantityVectorDesignerVariants(source, documents, fieldName)` and find defaults declared by scenario profiles embedded in the same model schema.

The Model Editor edits the full model schema directly. The interpreter schema owns the focused schema-editor fields, layout, and advanced-field behavior for widget profiles; the application schema remains the source of structure, required properties, and model validation. Project model JSON uses the field envelope and its settings controls. Shared form and default-value renderers interpret widget declarations, with runtime callbacks from the host where needed.

The schema editor selects a widget profile by its registered field widget type and authoring mode. Existing authoring modes can be reused by adding a widget-targeted profile to `x-fullmeta-ui-schemaAuthoring.profiles` in the interpreter schema. A new value-control interaction still needs a renderer and action handler in `ui/widgets/`, and its field widget type belongs in the annotation catalog; project model editing does not read the schema-authoring profiles.

Configured array editors select their row controls, default-field bindings, and component-variant write rules from the widget profile. The shared JavaScript control registry implements the named controls; profiles can reuse those controls without adding widget-specific schema-editor branches. Model Editor is the sole schema-document authoring path.

`widgets/model-editor/fullmeta-ui-profile-1.schema.json` defines shared editor layout, tree behavior, and text labels. `widgets/graphics-console/fullmeta-ui-graphics-console-1.schema.json` defines selection rules, scene composition, layers, tabs, data bindings, focus lookups, axes, and renderer appearance. The reusable selection and binding evaluator lives in `widgets/graphics-console/contract.js`. FEM declares its console in `applications/fem3/fem3.schema.json` under `x-fullmeta-ui-graphicsConsole`; its scenario UI profiles retain FEM-specific labels and settings outside the Graphics console. Model Editor edits and consumes this same declaration. The profile schema still accepts its older graphics block so existing application profiles can be read.

The validation-program designer is an application-neutral schema authoring widget under `widgets/validation-program/`. It renders `x-fullmeta-rules` and validation declarations as nested rule sequences and edits rule and expression data through structured fields. Application paths, checks, messages, and policy remain in the owning schema.

The quantity widget is selected with `payload.widget.type: "quantity"` on each quantity-valued field or item. Its value shape and validation remain in the application model schema; shared rendering, the authoring control, and `fullmeta-ui-quantity-1.schema.json` settings contract live together in `widgets/quantity/`. The host supplies compatible unit choices; settings such as `unitGroup`, `unitReadOnly`, and `defaultUnit` describe generic quantity presentation.

The dynamic-property-set widget is selected with `payload.widget.type: "dynamicPropertySet"`. It renders declared object fields and additional field descriptors returned by a host provider. The `source` setting is an opaque provider key: the shared widget does not know what the fields mean or which application registered them. Providers return `{ key, label, default, schema }` descriptors, so each field uses the same schema-driven renderer as ordinary settings.

The reference-selector widget uses `payload.widget.type: "referenceSelector"` with a host reference declaration. It renders one value for a string field or several values for an array field. The application host supplies eligible options as `{ value, label, description? }`; the generic option shape is declared in `widgets/reference-selector/fullmeta-ui-referenceSelector-1.schema.json`. The widget only renders these values and does not decide which records qualify. Its settings optionally set `maxVisibleOptions` and `emptyMessage`. Keep application-specific filtering in the application package.

The tabular-slice-selector widget uses `payload.widget.type: "tabularSliceSelector"` and keeps its configuration in `payload.widget.settings`. Its host resolves the declared `dataSource` to normalized table records. The widget selects one varying column in `slice` mode, or fixes every selectable column in `fixed` mode, and stores the selection in the owner fields named by `varyingColumnProperty` and `fixedValuesProperty`. `tableIdProperty` and `ownerIdProperty` connect the current model item to its table record; `unitProperty` optionally stores the varying column's unit. Table columns use the shared tabular data shape (`key`, `label`, `role`, `unit`, and observed `values`). The widget has no FEM-specific knowledge of where tables come from or what the selected data will be used to display.

The keyed-choice-matrix widget uses `payload.widget.type: "keyedChoiceMatrix"` and keeps its configuration in `payload.widget.settings`. It renders a repeatable set of rows; each row assigns allowed values to keys in a host-provided record collection. The array item's schema declares the allowed values, while the host resolves `choiceSource` to records. `choiceKeyProperty` identifies the record key and `valueMapProperty` identifies the row's key-to-value map. `choiceSetProperty` and `choiceSetsByValue` optionally make the available values depend on another property. `omittedValue` marks the choice represented by a missing map entry. Source-specific options pass through to the host adapter, which can filter records for its application. The renderer and row-edit behavior live under `widgets/keyed-choice-matrix/`.

The plot renderers have public entries in `widgets/plot-1d/widget.js`, `widgets/plot-2d/widget.js`, and `widgets/plot-3d/widget.js`. They consume normalized data supplied by application adapters. `widgets/graphics-console/widget.js` exports the registry assembled from `widgets/catalog.json`. Common drawing support lives in `widgets/shared/plots/`; table data and selection support live in `widgets/shared/tables/`. See [the widget package convention](widgets/README.md) and [plot input contracts](widgets/shared/plots/README.md).

The generic scene-view renderer lives under `widgets/scene-view/`. It consumes normalized `point`, `polyline`, and `triangle` primitives described by its `scene-view-data-1.schema.json` contract. An application converts its geometry or mesh into this scene data; the host retains selection, axes, pointer interaction, and camera controls. The renderer can accept a host projection callback so a scene overlay can share the host's camera.

The `selectionHighlight` widget resolves the graphics console's declared focus mode to target records. It can create an accent overlay from normalized scene primitives tagged with target IDs, so the same selection behavior applies to geometry, networks, and diagrams. Its focus-mode contract lives in `widgets/selection-highlight/fullmeta-ui-selection-highlight-1.schema.json`; the application adapter supplies target records and primitives.

The `valueControl` widget renders schema-declared primitive values and enumerations; it remains the fallback for ordinary fields. Fields needing customized choices can select `payload.widget.type: "valueControl"`; the settings contract and authoring control live together under `widgets/value-control/`. Plain text, number, and boolean fields need no annotation.
