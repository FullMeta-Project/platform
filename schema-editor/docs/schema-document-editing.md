# Editing schema documents

Model Editor is the single editor for both project model JSON and schema documents.

## Open a schema

- On the launcher, choose **Edit model schema** on the FEM card to open the configured model schema.
- To open a particular schema directly, use `platform/loader.html?model=applications/fem/fem.schema.json`, replacing the model path with a workspace-relative JSON Schema file. This generic document host mounts the editor selected by the interpreting schema.
- In Model Editor, use **File → Open** to choose a schema document from the workspace.

The document must declare `$schema`, `$id`, and a relative `x-fullmeta-schema` path. That interpreter supplies schema-document validation and the editing controls. The edited schema is one self-contained JSON file; its `$ref` values resolve within that file. Use the regular **Save** action to save that file.

Project model files continue to open in the same page and use the model schema declared by their own `x-fullmeta-schema` property. The editor determines the mode from the opened document; there is no separate Program Editor page or compatibility route.

`platform/schema-editor/schema-editor.schema.json` is the interpreter named by current schema documents. It defines the schema-document editing profile; it is not the retired Program Editor application.

To start a new application, choose **New** beside **Applications** on the launcher and enter its name. FullMeta creates `applications/<id>/<id>.schema.json` and `applications/<id>/catalog.json`, then opens the schema. The starter uses the schema-document interpreter and shared Model Editor. It does not implement application-specific runtime behavior. The platform widget catalog supplies available editor and field widget choices; application-specific widgets and runtime behavior can be added later. The launcher offers project creation and runtime actions once their schema and application package declare the required contracts. Copying a complete application folder into `applications/` makes it discoverable without editing a shared registry.

**File → New…** while editing a schema uses the same `empty.schema.json` starter, then gives the new copy its own path, application ID, and interpreting-schema reference. It does not register another application. For a complete application workflow, see [Create a FullMeta application](../../docs/application-development.md).

## Document-wide widgets

The interpreting schema registers document widgets in `x-fullmeta-ui-schemaAuthoring.presentation.documentWidgets`. Each entry names a widget type and the path to its data in the opened schema. The schema tree shows declarations; document-wide resources are opened from the schema root Settings panel instead of appearing as extra tree branches.

The Graphics console widget edits the opened schema's `x-fullmeta-ui-graphicsConsole` declaration in Settings. Its related Graphics interfaces resource opens the same schema's `x-fullmeta-ui-graphicsInterfaces` declaration, including renderers, actions, and external interfaces. The collapsed Schema source widget at the root exposes the remaining source fields. These widgets apply only while editing a schema; project model JSON keeps its existing tree and Graphics behavior.

## Item names

For a field, schema view shows the readable JSON Schema `title` above the smaller property key. The property key is the exact key stored in JSON. For example, `incidentField` can have `title: "Incident factor"`. The schema editor's **Title** control edits the caption. Gray placeholder text is a generated suggestion and is not stored until the designer enters a title. Widget annotations configure behavior and do not hold another field caption. Labels for choices and buttons name those separate controls.

An item kind has a machine symbol in the schema, such as the `$defs` key `materialAssignment`. Its JSON Schema `title` is the readable type name, such as **Material assignment**, shown in the schema declaration tree. If a declaration has no title, the editor derives a readable name from its symbol. The tree reads each bound declaration's title, including collection titles such as **Geometry features** and **Selections**. **Definitions** uses the same recursive tree controls but is an unbound group: `parameters`, `variables`, and `pointwiseVariables` are separate properties directly under `model` in existing project JSON. Its tree node owns its `title`, icon, and children without adding a `definitions` property to project files. Internal `allOf` composition stays in the schema for validation without adding an imports group to the tree. There is no separate tree-label field.

Each visible schema tree item takes its icon from its own `x-fullmeta-ui-behavior.payload.presentation.icon`. An unbound group such as **Definitions** keeps both its title and icon on its recursive tree node; bound items keep them on their schema declarations. The root uses the same icon field. A reusable declaration may be stored under `$defs`, but the tree breadcrumb and **Up** control follow the visible tree hierarchy. The source path remains available when editing the underlying JSON Schema structure.

A variant can also constrain a model field with `properties.type.const`, for example `"impedance"`. This is the value required in project JSON to identify that item kind; it is not a caption source. `$defs.shared.impedanceBoundary` is the schema reference symbol for that declaration, while `title: "Impedance"` is its editable caption. The project instance's `id` has a different job: it identifies one added item.

Each project item keeps its own stable `id` and user-editable `name`. For example, a material assignment may have `id: "material_2"` and `name: "Copper"`. The instance name is the label shown for that project tree item. Right-click Add commands are actions declared by the interpreting schema and can include the type name in their wording.

## Batch authoring

The schema root's **Bulk schema authoring…** tool combines **Structure** and
**Constraints** modes. Stage parent/child structure in Structure mode, stage
bounds, enum values or other constraints in Constraints mode, then Preview both
modes together and Apply atomically. The detailed nested-structure and field-
constraint tools remain accessible from that dialog.

The combined import accepts JSON rows such as:

```json
[
  {"op":"add","path":"#/properties/settings","value":{"type":"object"},"required":true},
  {"op":"add","path":"#/properties/settings/properties/count","value":{"type":"integer"}},
  {"op":"set","path":"#/properties/settings/properties/count/minimum","value":0}
]
```

TSV uses `Operation`, `Path`, `Value JSON`, `Required` columns. Paths are absolute
schema JSON Pointers within the selected declaration. Add parents before their
children. Replace replaces the staged batch; Clear discards staged work.

**Other UI annotations** edits visibility, defaults, descriptions, choices and
reference bindings. Use **Widget settings** for the full field-widget catalog
and widget-specific parameters. Root contracts identifies the selected extension
by key, type and schema pointer; select an existing extension separately from
creating one. Explicit imports targeting another extension are rejected.

Path pickers distinguish schema declaration pointers, validation-data JSON
Pointers, and annotation reference paths (source plus dotted property keys).
Their Copy controls expose each valid representation. Preview checks a candidate
without changing the open draft; Apply commits the candidate to that draft. The
workflow strip keeps unsaved/saved state and the latest
validation result visible; Save and Validate remain separate actions.

For conditional fields, choose **Object rules…**, select the object declaration,
and enable the section you intend to change. **Root schema constraints…**
similarly separates ordered root composition from the When / Then / Otherwise
condition. Definition tools can load a supported reusable definition, patch typed
paths or factor an inline declaration into a reusable reference. Preview each
candidate and review its target before Apply; Save persists the applied draft.
Use **Bulk collection actions…** to configure move and insertion effects, and
**Bulk field references…** for reference scope, target, filters and deletion
settings. **Tree annotations…**, **Runtime API routes…** and **Schema branch
audit…** address the tree, runtime bindings and read-only branch inventory.
Generated field overlays edit supported surrounding facts while generated core
fields remain protected.

## Editing validation expressions

A violet **Validation N** badge beside a schema field shows assertion rules that read that field or a descendant. The badge is a navigation aid: the rule itself remains in a top-level FullMeta validation program such as `x-fullmeta-rules`. The dialog shows the rule message and expanded logic; its conditions, selectors, and diagnostic path are available in a collapsible section.

Edit the highlighted assertion text and choose **Apply rule changes**. For example, `not(contains(values($address · "/membership"), "boundary"))` is an editable spelling of the underlying JSON `op`/`args` expression. The editor suggests available variables and operation names. The text editor is offered when the expression can round-trip to the same JSON; use the structured editor for other expressions. Apply changes the open schema document; use **Save** afterward. Closing the dialog without applying discards textbox edits.

Expand **Conditions, selectors, and diagnostic path** to edit the `if` and `when` conditions, collection selectors, and error location together with the assertion. A changed read target requires a diagnostic-path or collection-selector edit in the same apply, unless the rule intentionally keeps a root diagnostic location. The editor checks the source rule and its context for intervening changes, then refreshes the field badges. The structured rule editor remains available for the full program tree. Project model JSON continues to use the same validation programs and editing behavior.
