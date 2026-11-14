# Schema authoring guide

This is the local Help entry for documents interpreted by [schema-editor.schema.json](../schema-editor.schema.json), including application schemas and the Schema Editor's own schema. The dedicated `platform/schema-editor/` folder owns this interpreting schema and its user guide. A model interpreted by an application schema uses that schema's sibling `docs/README.md` instead.

This guide describes the Schema Editor and the capabilities available to application authors.

## Author and review a schema

Follow [Schema document editing](schema-document-editing.md) for the tree, field declarations, definitions, structure/constraint batches and authoring dialogs. Select a declaration to edit its ordinary schema fields in Settings. Keep document structure, UI annotations, validation requirements and runtime bindings as separate declarations.

The [authoring tool guide](authoring-tools.md) lists the available tool groups,
their purposes and the main input and transaction boundaries.

Preview creates a checked candidate. Apply changes the open draft; Save persists it. Validate reports the current candidate's checks. Pending raw input, applied edits, saved state and validation freshness remain separate. A rejected batch or stale candidate must not partially apply. Use File > Open and the in-application import pickers for files inside FullMeta.

## Declarative interfaces

- [Validation rules for an application](validation-rules.md) explains how authored requirements become executable rules and how to check them against project models.
- [UI annotation language](ui-annotation-language.md) explains shared UI declarations and their scope.
- [Declarative validation obligations](../../docs/declarative-validation-language.md) specifies `fullmeta-declarative-rules/1`, neutral predicates, scopes, diagnostics and generated executable rules. **Validation requirements** authors obligations; native bulk and dedicated native editing controls have been retired. Existing programs are not converted automatically, and mismatched generated rules require explicit regeneration.
- [Widget packages and catalog interfaces](../../ui/widgets/README.md) and [shared UI contracts](../../ui/README.md) describe registered widgets, checked options, public exports and reuse.
- [Using shared UI widgets](shared-widgets.md) explains their roles in the editor and in application project models.
- [API, executable and compact native bindings](../../docs/api-and-executable-registries.md) describes registry ownership and versioned operation bindings. The [native operation authority](../../contracts/native-operations.json) supplies their descriptors. These bindings select existing declared capabilities; adding a declaration alone does not implement an application operation.
- [Application development](../../docs/application-development.md) distinguishes schema-only applications from application-owned runtime packages.

Schema authors write declarations, not JSX. Application-owned visual components use the supplied framework only when shared widgets do not cover the required behavior.

The Schema Editor uses some shared widgets to edit schema documents. An
application schema can also select other registered widgets for its own project
models. Choose a widget from the catalog, configure its supported settings and
data binding on the application schema, then open a representative project to
check the resulting control and saved value. The widgets available to an
application are not limited to those visible when the editor opens its own
interpreter.

## Files, layouts and development tools

The [workspace/file/layout guide](../../workspace/docs/workspace-files-and-layout.md) covers canonical paths, nested pickers, the two pane arrangements, ordinary menus and contextual Help. Help resolves beside the active interpreting schema, not beside whichever JSON document happens to be open.

For platform or application component work, use the [shared application contract](../../docs/application-platform-contract.md), [frontend build/watch guide](../../ui/frontend-development.md) and [visible debugging guide](../../ui/editor-debugging.md). JSX sources compile to public JavaScript entries. Human editing and WebMCP use the same guarded commands; watch/replay is optional development tooling.

In a browser that supports WebMCP, the open editor exposes discoverable tools to
inspect its current document and invoke supported semantic commands. Discover
the available descriptors and their arguments in that session. These tools use
the same draft, Preview, Apply, Save, validation and target guards as the visible
editor. The [debugging guide](../../ui/editor-debugging.md#native-webmcp-registration)
describes registration status, commands and the separate optional debug bridge.
