# Workspace files and layouts

The FullMeta folder is the workspace boundary. Browser paths are relative to this root, such as `applications/fem/docs/fullmeta-model-2.md` or `projects/study/branch/model.json`; they are not operating-system absolute paths.

The workspace entry is `index.json`, interpreted by `workspace.schema.json`. The interpreting schema selects the registered `workspaceEditor` JSX provider through `x-fullmeta-ui-editor`. The ordinary document loader resolves that declaration. Applications are discovered from each application's root `catalog.json`; projects are discovered from folders under `projects/`. Application and project lists are not copied into the workspace document.

Public documentation entry points live beside their interpreting schemas. `platform/workspace/docs/README.md` is the workspace guide for `platform/workspace/workspace.schema.json`; shared developer and integration references live under `platform/docs/`. Each owner may keep a separate builder-only `specification/` folder. Public guides and formats must work when that folder is omitted. FEM-specific public references and builder requirements belong under `applications/fem/`, with one authoritative copy of each contract. Schemas may carry optional root `author` attribution, supported by `platform/schema-editor/schema-editor.schema.json` and automatically rendered in ordinary Settings. Current attribution is Jensen Li and Yuee Li for FEM, and Jensen Li for the Schema Editor and workspace schemas. This is schema metadata, not a required model-data field or proof of application acceptance.

## Folder roles and contextual Help

| Location | Role |
| --- | --- |
| `platform/workspace/workspace.schema.json` and `platform/workspace/docs/README.md` | Interpret the workspace document and provide its public Help entry. Shared developer references and historical records have separate owners. |
| `applications/fem/fem.schema.json` and `applications/fem/docs/README.md` | Interpret FEM model documents and provide their application guide. The guide states the current paused/minimal implementation status. |
| Optional `specification/` beside an interpreting schema | Builder requirements that may remain private. Public model authoring and Help do not require this folder. |
| `applications/fem/ui/widgets/` | Future application-owned visual widgets when the build requires them; no empty UI tree is needed for a schema-only application. |
| `applications/fem/fem-rust/` and `mesh-rust/` | Retained native sources and developer interfaces, separate from end-user model Help. |
| `platform/schema-editor/schema-editor.schema.json` and `platform/schema-editor/docs/README.md` | Own the Schema Editor interpreting schema and its shared schema-authoring Help. |
| `platform/schema-editor/templates/empty.schema.json` | Shared starter consumed by JavaScript/Rust schema-creation paths; it is a template, not another interpreter. |
| `platform/contracts/fullmeta-model-runtime-1.schema.json` | UI-independent runtime binding contract, alongside the native operation authority. |
| `platform/js/` | Shared data interpretation, services and stable service facades. |
| `platform/ui/` | React/JSX widgets, presentation/runtime controllers and frontend developer documentation. |
| `platform/ui/schemas/` | Contracts shared across widgets, such as UI annotation/catalog envelopes; widget-specific contracts stay with their widgets. |

Help resolves `new URL('docs/README.md', interpretingSchemaUrl)` inside FullMeta. It uses the current interpreting schema, not the open document's directory, an application ID or a hardcoded application branch. Thus opening a FEM model uses [FEM Help](../../../applications/fem/docs/README.md), while opening the FEM schema for editing uses [Schema Editor Help](../../schema-editor/docs/README.md). The workspace uses [workspace Help](README.md). A missing/outside schema or unavailable guide produces an explicit local-documentation error; it does not silently substitute the workspace guide. About remains the shared package/build view.

Contract-only schemas do not require fictitious application packages or duplicated `docs/` folders. Add a sibling guide where an interpreting schema supplies a user-facing document/editor context. Historical records remain immutable; they do not compete with `applications/fem/specification/` as an active FEM authority.

The actual workspace root is FullMeta. The index Explorer's **visual root is `projects/`**, expanded and selected initially; this presentation choice does not change storage or file identities. `index.json` declares it through `explorer.root`. File > Open still browses the whole FullMeta workspace, including `platform/` and `applications/`. Explorer loads folders as they are expanded and supports paged listings. Graphics Console retains the Applications overview while browsing. Settings shows cards for usable interpreted JSON documents directly in the selected folder and in its immediate subfolders. A subfolder gets a card only when it contains at least one direct JSON document with a usable interpreting-schema reference. The view never aggregates grandchildren. A folder can contain models for several applications; each eligible JSON document is shown as its own row with an Open action through the universal loader. Documents retain their complete workspace-relative paths.

Open is offered only for valid JSON with a syntactically valid local `x-fullmeta-schema` reference. JSON without an interpreting schema stays available in the Explorer and can be previewed, but does not appear as a document card. An application ID alone does not determine eligibility: `index.json` has a schema-selected editor without an application ID. Resolving the actual schema and editor remains the loader's authority; declaring a reference is not proof that its target or application is valid.

Current-folder discovery works in bounded batches of at most 32 directory pages and 100 JSON documents, with an explicit Discover more action. Document-card summaries retain the filename/path plus title, application and schema reference when available. These are display facts from JSON, not schema validation or numerical acceptance. Individual non-folder selections show their own file details. Selecting a file does not execute or rewrite it.

Explorer SVG icons are declared by the interpreting schema at `x-fullmeta-ui-editor.options.explorerIcons`, using the existing checked editor-options contract. JSX renders the strings as encoded image resources. Folder, open folder, ordinary file, JSON and schema roles share this declaration path; the current defaults live in `workspace.schema.json`.

Selecting a Markdown file renders a safe formatted preview in Graphics Console and keeps its path/details in Settings. This behavior is declared by the checked `markdownPreview` editor option in `workspace.schema.json`. Applications stay mounted and return when a folder or JSON file is selected. The preview shows headings, lists, links and code; raw HTML remains text. Files are bounded at 2 MiB and large previews explicitly report their 64K-character display limit. An example is [the SRR example README](../../../applications/fem/examples/srr_tr_unit1/README.md).

File > Open, New's schema and destination-folder selection, and the schema/annotation/widget batch import controls use the shared in-application picker. Its folders, selected path, pending filter/path text and cancellation are also available through normal WebMCP commands. Choosing a batch file fills the existing draft; Preview, Apply and Save remain separate existing transactions. Cancelling a nested picker preserves its parent dialog's unfinished inputs. Save As retains the existing same-folder copy contract, including its source-hash and no-overwrite checks.

The workspace keeps the original application/project actions. Delete application remains on its Applications card. Selecting a registered project folder enables File > Delete project, which opens the existing confirmation and handler; opening a document is a separate action from deleting its whole project folder. Explorer's context menu also offers Delete for folders at any depth under `projects/` and files inside those folders. Separate confirmations name the exact path; the folder confirmation warns about subfolders. The server confines deletion to `projects/`, protects the root itself, and checks for active operations in descendant folders before folder deletion. The separate Delete project action continues to verify that its target is a project.

View offers two arrangements of the existing panes:

| Value | Arrangement |
| --- | --- |
| `stacked` | Tree on the left; Graphics Console above Settings on the right |
| `columns` | Tree, Settings, Graphics Console from left to right |

Both separators support pointer dragging and keyboard resizing. Stacked starts with equal Graphics and Settings heights (50:50); dragging or replay can retain a different split. Layout changes move the existing pane presentation without recreating the document, controls or raw drafts. The canonical file path is displayed below the menus, beside the save/validation state.

The menu labels are **Stacked** and **Columns**, with descriptive tooltips. One menu opens at a time; labels align left and shortcuts align right. The selected-layout tick is a right-aligned inline SVG mask in the shared stylesheet.

An application schema may select its initial layout through the existing UI declaration:

```json
"x-fullmeta-ui-modelEditor": {
  "schema": "fullmeta-model-editor-ui/1",
  "roles": {},
  "panels": [],
  "layout": { "defaultLayout": "columns" }
}
```

Omission retains `stacked`. A View-menu choice overrides the default for that application in the mounted editor session. It does not modify model JSON or the application schema. Presentation replay restores the chosen arrangement and unfinished file-dialog state without accepting a file, creating a document or saving a copy. A changed interpreting schema still uses the normal source-conflict checks before replacing pending human input.

The shared file APIs are read-only:

| Route | Contract |
| --- | --- |
| `GET /api/workspace/files?folder=.&extensions=.json,.tsv,.txt` | Bounded directory/file metadata. `offset`/`limit` page the combined sorted result; `nextOffset` signals another page. `extensions=*` lists all regular-file metadata for the workspace Explorer. |
| `GET /api/workspace/file?path=docs/example.txt` | UTF-8 JSON/TSV/TXT/Markdown content, exact-byte SHA-256 and byte count; at most 2 MiB. No automatic application execution. |
| `GET /api/workspace/document-info?path=projects/example/model.json` | Bounded JSON display facts for cards: title, application, format, interpreting schema, byte count and hash. Invalid JSON is reported as a display diagnostic, without executing or changing a document. |

These routes reject absolute/parent paths, hidden paths, symbolic links/junctions, and dependency/build folders. Listings omit hidden entries and `node_modules`/`target`. Metadata access to another file type does not enable text importing or executing it. A folder has a 20,000-entry bound; pages contain at most 500 entries. Human controls and WebMCP use the same checked services and state guards.

The implementation acceptance and remaining limits are recorded in [verification](../../docs/operation-contract-upgrade-verification.md), [evidence](../../docs/operation-contract-upgrade-evidence.json), and the [current specification freeze](../../docs/operation-contract-platform-freeze.json). The FEM application build remains paused; this platform behavior does not certify all FEM numerical profiles or project lifecycle routes.
