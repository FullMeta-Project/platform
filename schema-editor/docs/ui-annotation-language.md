# FullMeta UI Annotation Design and Language

**Status:** Current implementation, `fullmeta-ui-behavior/1`  
**Last updated:** 2026-10-28

This document describes how FullMeta stores and consumes UI annotations on JSON Schema documents. It covers both project-field annotations and reusable widget authoring profiles. The completed [migration record](../../../backup/documentation-archive-2026-10-28/ui-annotation-language-unification-plan.md) is archived under `backup/`.

## 1. Design goals

- Keep UI metadata beside the schema declaration or interpreter setting that owns it.
- Make the annotation's target and consuming context explicit.
- Use a versioned common envelope while allowing each target/context pair to have its own payload contract.
- Keep UI behavior separate from project data shape and JSON Schema data validation.
- Keep reusable widget authoring behavior generic; application-specific choices and data providers remain with the application package.

## 2. Two annotation scopes

| Scope | Target and context | Stored at | Consumed by | Purpose |
| --- | --- | --- | --- | --- |
| Field behavior | `field` / `projectEditing` | Inline on an application JSON Schema declaration | Project editor/runtime form | Presents one field, selects its widget, and supplies settings for that field |
| Widget authoring profile | `widget` / `schemaAuthoring` | Under `x-fullmeta-ui-schemaAuthoring.profiles` in the schema interpreter (`platform/schema-editor/schema-editor.schema.json`) | Schema editor | Describes how schema authors edit a widget's field annotation |

An interpreting schema is the UI contract for the JSON file being opened. Field-based annotations describe the behavior of particular fields when that schema interprets a project JSON document. Global widget-based profiles describe the authoring UI used when a schema JSON document is being edited. The target and context identify which behavior FullMeta should consume.

For example, field annotations in `applications/fem/fem.schema.json` shape controls shown for a FEM project model. When that schema file itself is opened for editing, the widget authoring profiles in its interpreter, `platform/schema-editor/schema-editor.schema.json`, shape the controls for editing those annotations. The two scopes share the `fullmeta-ui-behavior/1` language and may coexist in an interpreting schema. A widget authoring profile is reusable across fields; it does not automatically apply runtime settings to every use of that widget.

Other root-level extensions, such as tree composition and graphics-console declarations, configure whole-document surfaces. They remain separate from the field annotation envelope described here.

Tree composition is recursive at every level. A bound node takes its visible name from the JSON Schema declaration's `title`; an unbound grouping node has its own `title` and `children`. This keeps the tree caption in one place rather than repeating it as a tree label. Project items still use their instance `name`, with `id` generated for internal references.

Tree presentation uses one optional `payload.presentation.icon` SVG string on the visible node's source declaration or, for an unbound group, on its recursive tree node. The same key serves ordinary items, sections, recursive groups, and the root. Reference wrappers do not carry a second icon for a declaration that is edited elsewhere. Schema tree navigation follows visible parents even when a shared declaration is stored under `$defs`.

## 3. Common envelope

The shared language identifier is `fullmeta-ui-behavior/1`; field annotations use the extension key `x-fullmeta-ui-behavior`.

```json
{
  "format": "fullmeta-ui-behavior/1",
  "target": { "kind": "field" },
  "context": "projectEditing",
  "payload": {}
}
```

The envelope has four parts:

- `format` identifies the language version.
- `target` says what the annotation applies to: a `field` or a named `widget`.
- `context` says which editor/runtime consumes it: `projectEditing` or `schemaAuthoring`.
- `payload` contains fields meaningful to that target and context.

The language deliberately shares the envelope, not one universal payload. A field's presentation and runtime widget settings are different data from a widget profile's authoring form. The schema contract uses discriminated branches and the JavaScript validators enforce valid target/context combinations.

## 4. Field behavior

Attach a field envelope directly to the declaration it decorates, including nested declarations such as object properties or array items. The declaration location identifies the field; `target.kind` repeats that scope so tools can validate it consistently.

```json
{
  "type": "string",
  "title": "Coordinate filter (equals zero)",
  "x-fullmeta-ui-behavior": {
    "format": "fullmeta-ui-behavior/1",
    "target": { "kind": "field" },
    "context": "projectEditing",
    "payload": {
      "widget": {
        "type": "valueControl",
        "settings": {
          "hiddenWhenSiblingPropertyEquals": {
            "property": "entity",
            "value": "domain"
          },
          "optionalToggleLabel": "Restrict by coordinate"
        }
      }
    }
  }
}
```

The JSON property key is the exact key stored in project JSON. The declaration's standard JSON Schema `title` is the readable caption shown beside that field in both schema view and project settings. Authors edit this one caption in the **Title** control. When `title` is absent, the editor derives a caption from the property key. `payload.presentation` holds general field presentation annotations, and optional `payload.widget` selects a specialized control and supplies its behavior settings. Field captions are not duplicated as `label` in either annotation branch. Labels for separate controls, choices, actions, and tree groups remain in their own settings. The relevant widget contract and application package validate supported values.

At runtime, the schema-driven form resolves the schema declaration, reads its `projectEditing` field annotation, selects the requested renderer, and passes presentation/widget settings to it. The value being rendered still comes from the project JSON. UI annotations do not get copied into that JSON and do not change its validation rules or Rust data model.

For example, `properties.incidentField` is the project key, while `title: "Incident factor"` is its caption. The widget annotation can still specify `quantity` and its unit behavior. A project item separately has a generated instance `id` and an editable instance `name`; neither is another caption for the `incidentField` schema declaration.

## 5. Widget authoring profiles

The interpreter owns reusable authoring profiles in a distinct root extension, outside its schema declaration tree:

```json
{
  "x-fullmeta-ui-schemaAuthoring": {
    "schema": "fullmeta-ui-schema-authoring/1",
    "format": "fullmeta-ui-behavior/1",
    "context": "schemaAuthoring",
    "presentation": {},
    "profiles": {
      "valueControl": {
        "format": "fullmeta-ui-behavior/1",
        "target": { "kind": "widget", "name": "valueControl" },
        "context": "schemaAuthoring",
        "payload": {
          "annotationKey": "x-fullmeta-ui-valueControl",
          "authoring": { "mode": "schemaValueForm" }
        }
      }
    }
  }
}
```

This is a minimal structural example; production profiles also declare the controls, labels, layout, visibility, and validation behavior needed by the schema editor. The profile map key and `target.name` must match. The supported authoring modes are currently `tree`, `configuredArray`, `schemaValueForm`, and `annotationForm`.

The profile describes how the schema editor presents and edits a field's widget annotation. It can identify the annotation key and a settings validation contract, and can select a built-in authoring mode or registered editor behavior. It is metadata, not executable code. Specialized behavior continues to be implemented by registered JavaScript editors/renderers where declarative controls are insufficient.

## 6. Resolution and validation

- The project editor consumes field-targeted `projectEditing` envelopes. The schema editor consumes widget-targeted `schemaAuthoring` profiles from the interpreter.
- Invalid envelope versions, targets, contexts, or payload structures are rejected by the language validators. Widget settings are also checked against their applicable widget contracts.
- Schema declaration resolution continues to support linked/imported and composed declarations. Annotation edits are made against the source declaration rather than writing metadata into project data.
- JSON Schema remains the authority for model data shape and validation. The UI language only describes presentation and editing behavior.
- The annotation catalog (`platform/ui/annotation-catalog.json`) supplies common presentation fields and widget mappings to authoring/routing code. The language schema (`platform/ui/schemas/fullmeta-ui-behavior-1.schema.json`) describes the versioned envelope; `platform/ui/annotation-language.js` validates that envelope and projects it into the in-memory view used by existing renderers.

## 7. Compatibility

The v1 field envelope is the only supported field-annotation format. Readers do not infer or normalize legacy field annotation keys; schemas using those keys must be migrated before use. Schema authoring writes the v1 envelope. The renderer view helper only projects that envelope into an in-memory shape for existing widget code; it does not accept an older stored format. Widget authoring profiles have one supported location: `x-fullmeta-ui-schemaAuthoring.profiles` on the interpreter. The retired application-schema `x-fullmeta-schemaWidgetConfig` link is no longer read; profiles must live in the interpreter.

New field annotations belong under `x-fullmeta-ui-behavior`. New reusable authoring profiles belong in `x-fullmeta-ui-schemaAuthoring.profiles` on the interpreter. Do not add a per-application pointer to a widget profile file.

## 8. Runtime widget defaults as a future extension

The current language does **not** support a global widget profile that automatically applies runtime settings to every field using that widget. The current `widget` / `schemaAuthoring` profile configures the schema editor only. A project that needs a widget on a particular field should put the widget selection and settings in that field's `projectEditing` envelope; the project JSON itself can remain unchanged.

If reusable runtime defaults are needed later, add an explicitly runtime-scoped profile and define precedence, for example: widget defaults first, then field-specific settings override them. That requires a runtime resolver and validation rules. It should not reinterpret current schema-authoring profiles as runtime defaults. A language version change or an explicitly specified new branch should establish this combination before it is used.

## 9. Source map

- [Language schema](../../ui/schemas/fullmeta-ui-behavior-1.schema.json)
- [Annotation catalog](../../ui/annotation-catalog.json)
- [Language helpers and renderer projection](../../ui/annotation-language.js)
- [Schema interpreter and authoring profiles](../schema-editor.schema.json)
- [Project form resolver](../../ui/widgets/model-editor/schema-form.js)
- [Archived migration record](../../../backup/documentation-archive-2026-10-28/ui-annotation-language-unification-plan.md)
