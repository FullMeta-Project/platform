# Workspace application contract

This shared contract defines how an application integrates with FullMeta's universal loader, workspace, files, layout and menus. Read it with the [application platform contract](application-platform-contract.md). An application declares its own data, actions and defaults; it reuses the shared workspace behavior.

## Universal routing and schema ownership

The root [index.html](../../index.html) bootstraps [index.json](../../index.json), a `fullmeta-workspace/1` document interpreted by [workspace.schema.json](../workspace/workspace.schema.json). Its `x-fullmeta-ui-editor.widget` selects the registered `workspaceEditor`. The [universal loader](../loader.html) uses this same interpreting-schema/catalog route for the workspace, Schema Editor and project models.

Every loadable JSON document declares its relative `x-fullmeta-schema`. Every owned standalone schema also declares its interpreter. Preserve full canonical FullMeta-relative IDs and relative schema/resource resolution; a basename or application ID is not a routing key. Supporting runtime and widget-contract schemas can use Schema Editor without becoming fictitious applications.

The [Schema Editor](../schema-editor/schema-editor.schema.json) owns its sibling guide and [single empty-schema template](../schema-editor/templates/empty.schema.json), shared by browser/Rust creation paths. UI-independent runtime contracts live under `platform/contracts/`; cross-widget contracts live under `platform/ui/schemas/`. Optional schema-root string `author` metadata uses ordinary declared Settings fields; it does not need a specialized author widget or imply runtime capabilities.

## Workspace selection and presentation

FullMeta is the actual root. The workspace Explorer visually starts at `projects/`, configured by `index.json`'s `explorer.root`, expanded/selected initially. Canonical paths retain the `projects/` prefix. File > Open can browse the whole allowed workspace, including application folders and platform schemas.

In the shared Model Editor, a registered Model 2 application's tree root shows
the display name from its application catalog registration. The canonical
document path remains on the status row, and the root's collapse state remains
keyed to the project identity. Schema documents keep their own declared title.
Applications do not need per-schema root-label declarations for this shared
presentation.

| Pane | Shared behavior |
| --- | --- |
| Explorer | Expand immediate directories, select complete paths, refresh and page bounded listings. Equal basenames in different branches are distinct files. |
| Graphics Console | Applications retain authoritative catalog IDs, availability, creation and navigation. An enabled Markdown preview temporarily hides the still-mounted Applications view. |
| Settings | Responsive folder cards contain separate application/JSON rows. Folder headings browse. Each eligible document row has its own Open action; selecting a folder never opens its first JSON automatically. Selected files show their path/details. |

Directory/row selection, expansion, refresh, pagination, Open and layouts use normal shared semantic actions. WebMCP inspection exposes current Explorer/layout state. Stale, unavailable, unlisted or foreign-owner paths must not open another file. Workspace configuration/details remain read only; creation/deletion use their existing validated forms.

Open eligibility requires a bounded summary reporting valid JSON and a syntactically valid local `x-fullmeta-schema`. JSON without such a reference remains inspectable with read-only details/preview and no Open action. An application ID is neither required nor sufficient; the workspace document itself has none. Eligibility does not prove the schema exists or is valid: loader/editor resolution remains authoritative.

Folder-card discovery is incremental, at most 32 directory requests and 100 added JSON documents per batch. **Discover more** explicitly continues its queue. Keep complete nested paths and discard stale discoveries/previews when selection changes. This recursive discovery is separate from immediate-child Explorer pagination and must not eagerly traverse the workspace. Display summaries do not interpret or validate a model.

A registered project selection enables File > Delete project through its existing confirmation and handler. Application deletion belongs to its Applications card. Opening/browsing/selecting a folder is never deletion; deletion requires its separate normal confirmation/submission.

Explorer icons come from checked `x-fullmeta-ui-editor.options.explorerIcons` SVG strings with optional `folder`, `folderOpen`, `file`, `json` and `schema` roles. Expanded folders and schema/JSON files use their respective roles, with generic fallback. Encode decorative 16px image resources; never insert SVG/HTML markup into the document.

The checked boolean `x-fullmeta-ui-editor.options.markdownPreview` defaults to false and is enabled by the workspace schema. When enabled, selecting `.md` renders the shared safe Markdown reader in Graphics while Settings retains details. Limit display to 65,536 characters with an explicit truncation notice, use bounded UTF-8 reads, and never insert raw HTML or execute the document. Fenced `math` blocks use the shared MathJax typesetter in both this preview and the browser documentation viewer; if MathJax cannot load, show the equation source as readable text. Folder/JSON selection restores the original mounted Applications view. This contract adds no Markdown editor/save or wiki behavior.

## In-application file selection

Open, New's schema selection/destination Browse and supported authoring imports use the workspace picker. Ordinary selection requires no native OS file dialog or hidden native file input. The picker offers breadcrumbs, raw relative folder text, Up/Go, local filter, paged entries, explicit selection, Cancel and the owning accept action.

| Flow | Explicit acceptance does |
| --- | --- |
| Open JSON | Pass the complete folder/filename through normal Open, unsaved-draft choice and interpreting-schema/application routing. |
| New schema selection | Resolve the selected schema/package and reopen the normal New form; selection alone creates nothing. |
| New destination | Update the parent's raw existing-folder destination. Ordinary Create still validates/writes; declared automatic project destinations remain authoritative. |
| Annotation/widget import | Feed accepted TSV/TXT text to the existing staged parser/candidate transaction. |
| Combined schema batch | Feed supported JSON/TSV/TXT to the structure/constraint parser with ordinary atomic staging, Preview and Apply. |

Browsing/selecting alone does not open, create, save or import. Nested pickers belong to the active authoring/New dialog. Cancel preserves the parent and its raw draft. Owner close/replacement or disposal prevents late reads from importing into another target and releases listeners/view/import registrations.

Human controls and semantic commands use the same file controller. Current public interfaces include `document.openPicker`, `document.newDialog`, `document.saveAsDialog`, `document.fileDialog.state/update/browse/submit`, and `workspace.picker.state/import/navigate/more/update/select/accept/cancel`. Discover their installed argument schemas. Arguments are semantic paths/raw values, not file-input events, callbacks or executable instructions. Save As retains a read-only source folder; destination Browse is for New's declared destination.

`files.picker.availableImports` exposes registered `{key,label,ownerKey,extensions,available}` actions for the current authoring dialog. `workspace.picker.import` accepts only its current key and optional folder, reveals its disclosure and uses the same checked human action. Reject disabled, explicitly hidden, disconnected and foreign-owner controls. Opening reads only a directory listing; acceptance/read/import is separate. JSON cannot override callbacks.

## Bounded workspace services

Workspace discovery/text services are checked local-origin GETs. Paths use forward-slash workspace-relative strings; `.` is FullMeta. Reject traversal, absolute/hidden paths, symlinks/junctions, dependency/build folders and outside-root files. Metadata/read operations cannot create, overwrite, execute or relocate files.

| API | Contract |
| --- | --- |
| `GET /api/workspace/files?folder=.&extensions=.json,.tsv,.txt&offset=0&limit=500` | `fullmeta-workspace-files/1`: root/folder/nullable parent, directory name/path rows, file name/path/bytes rows, offset/limit/total/nullable nextOffset. Directories precede files. Default page 200, maximum 500; scan at most 20,000 entries. `extensions=*` widens metadata types only. |
| `GET /api/workspace/file?path=<relative-file>` | `fullmeta-workspace-file/1`: canonical path, UTF-8 text, bytes and SHA-256 contentHash. JSON/TSV/TXT/Markdown reads are limited to 2 MiB. Metadata visibility does not permit arbitrary binary reads. |
| `GET /api/workspace/document-info?path=<relative-json>` | `fullmeta-workspace-document-info/1`: path, bytes/hash, validJson, nullable title/application/modelFormat/schemaReference display facts. Parse at most 2 MiB; invalid JSON yields a display diagnostic without interpretation, validation or effects. |

Use normal document/action services for model Open/Save/Create. The bounded text-import limit does not redefine the application's model format. Preserve the folder when resolving a reference; never infer a schema from a filename. The picker uses the editor's fixture-aware request boundary, and fixture responses do not establish live filesystem/native acceptance.

## Layout and status

View offers `stacked` (**Stacked**: Tree left, Graphics above Settings right) and `columns` (**Columns**: Tree | Settings | Graphics). Stacked starts with equal Graphics/Settings heights, 50:50 excluding the separator. Both dividers remain draggable and keyboard-resizable; orientation, arrow behavior and accessible values follow the current arrangement. Viewport constraints can clamp usable pane sizes.

Switching layout keeps the same mounted editors, document/raw drafts, selection, graphics and operation lifetime. It does not Apply, Save or restart work. The active label has a right-hand 16px tick from the shared inline SVG resource, not a Unicode marker or model field.

An application's existing `x-fullmeta-ui-modelEditor` declaration may include:

```json
"layout": {"defaultLayout": "columns"}
```

This is an optional fragment, not a replacement for other required annotation members. Only `stacked`/`columns` are valid; omission defaults to stacked. A current-session choice overrides the application's default. Layout, divider sizes and overrides are presentation state, never project data. Replay may retain an explicitly resized split and uses the same controller without changing schema defaults.

The canonical file ID is on the status row beneath the menus, alongside applicable Saved/Validation indicators. Preserve the complete relative path; schema-only badges remain conditional.

## Documentation and menus

Workspace and model/schema editors expose File, Edit, View and Help. File retains the current editor's normal New/Open/Save/Save As availability; Exit returns to the workspace through its unsaved-draft guard. One menu opens at a time. Labels align left, shortcuts right; opening another menu, selecting an action, outside pointer input or Escape closes it. Escape returns focus to its summary. Menu actions are flat text rows rather than rounded-button controls.

Edit targets the active plain-text input/textarea, preserving selection/caret while the menu opens. Copy/Cut/Paste/Select All use ordinary raw-input handlers and read-only/disabled/hidden/modal/max-length/stale-target checks. An asynchronous clipboard response cannot edit a different control; empty edits do not dirty a document. This is not a document Undo/Redo history.

Human actions use the browser clipboard through their normal gesture. Semantic `edit.copy` returns selected text; `edit.paste` requires explicit text and cannot read the OS clipboard. `edit.cut`, `edit.selectAll` and `edit.inspect` retain the same target checks. Command JSON cannot inject clipboard privileges or DOM selectors.

Help resolves `new URL('docs/README.md', interpretingSchemaUrl)` inside FullMeta and reads through the bounded service. Always use the interpreter, including when the open JSON is itself a schema. A project model uses its application's guide; editing that schema uses the Schema Editor interpreter's guide; the workspace uses its root guide. Missing/outside context or unavailable local documentation yields an explicit error with no silent root-guide substitution.

Safe React rendering supports headings, lists, links and code without raw HTML. Documentation links navigate only after explicit user action. About reports actual package version, frontend mode/revision and React version independently of application capabilities. Escape/Close dismisses Help; late responses or changed schema context must not display an old guide. `help.open` chooses docs/about; `help.close` uses the same controller. `fullmeta-standard-menus/1` checkpoints restore presentation only, never clipboard edits.

## Save and presentation restoration

Save As is a copy in the current source folder with its existing identity/allocation, value/source-byte preservation, collision and expected-content-hash rules. It does not relocate a document or rewrite relative schema/resource references. Raw filename validation and normal overwrite/conflict behavior remain authoritative. Ordinary Save and native automatic Save keep their transaction semantics.

`fullmeta-file-presentation/1` and `fullmeta-workspace-picker/1` retain pending New/Save As raw fields, applicable choices/owner, folder/selection, complete checked bounded listings, local filter/path text and focus/caret. Restore reopens presentation only: no selected-file read, acceptance, import, creation, Save or operation restart. A retained listing can reopen with zero directory requests; explicit later navigation uses the normal service.

Validate checkpoint path/types/rows and import-owner declarations before closing/changing state. Restore the authoring parent through its controller before rebinding its import action. JSON cannot supply functions, DOM references or stale callbacks. Invalid raw filename/folder text remains repairable; actual Go/Create/Save still validates.

## Application integration acceptance

Verify schema-selected loader/editor routing, declared layout default and override, real pointer/keyboard resizing, same mounted controls/drafts and normal file/menu/Help actions. Check human and semantic paths against the same candidate. Include same basenames in nested folders, several application models in one folder, schema-less JSON and schema-selected documents without an application ID. Do not open an arbitrary first file or infer eligibility from an application ID.

Cover bounded discovery/More, late responses and owner replacement, selection beyond a listing page, nested picker Cancel, pending raw New/Save As and import checkpoints restored without effects, malformed/stale state, source/collision failures and same-folder Save As/reopen. Deletion selection/open must not delete; test the separate confirmation without deleting existing user projects.

Check exact menus, focus/caret/clipboard guards, safe local guide links and errors, actual About facts, Help from a real project model and from its schema, and application guide freshness. Where Markdown preview is enabled, verify escaped raw HTML, read-only/truncation bounds and restored Applications presentation. Keep native/domain application acceptance separate from workspace success.

Reference checks include layout, picker/restoration, Edit/Help, semantic file commands and workspace HTTP services. Applications inherit these platform contracts rather than replacing shared workspace code to register themselves.
