# FullMeta documentation

FullMeta opens JSON documents through their interpreting schemas. A document's `x-fullmeta-schema` reference selects the schema, whose UI declarations select a registered React/JSX editor. Human controls and WebMCP use the same application actions and document state.

The workspace entry, `index.json`, references `platform/workspace/workspace.schema.json` and uses this same loading path. FullMeta remains the actual root; Explorer presents `projects/` as its visual root, expanded and selected. File > Open can still browse all of FullMeta to choose schemas or other documents. Graphics Console shows Applications. Settings shows project folders as cards; their headings browse folders and each eligible application/document row has its own Open button. Several application models can share one folder. JSON without an interpreting-schema reference remains inspectable without Open. An application ID is not required when a schema selects its own editor, as `index.json` does. Nested branches keep their complete workspace-relative paths. Folder/file SVG icons come from the interpreting schema's editor options.

## Using the interface

- **File:** Open uses the in-application workspace picker. Project/schema editors retain their normal New, Save and Save As actions. Workspace New creates an application through the existing form. Select a registered project folder to enable Delete project and its normal confirmation. Save As keeps the existing same-folder copy behavior.
- **Edit:** Copy, Cut, Paste and Select All operate on the active text control. They preserve its ordinary draft/input handling. Undo/Redo are not advertised as a document history feature.
- **View:** Choose Tree on the left with Graphics above Settings, or Tree | Settings | Graphics. Drag the separators or focus them and use the arrow keys to resize. An application's schema can set `x-fullmeta-ui-modelEditor.layout.defaultLayout` to `stacked` or `columns`; the View menu overrides it for the current mounted session.
- **Help:** Documentation opens `docs/README.md` beside the active interpreting schema. The workspace uses this guide; schema authoring uses the [Schema Editor guide](../../schema-editor/docs/README.md), and FEM models use the [FEM guide](../../../applications/fem/docs/README.md). About reports the application/build version.

In Explorer, right-click a folder under `projects/` or a file inside such a folder and choose **Delete**. Each action opens a confirmation showing the full path; deleting a folder also removes its contents and subfolders. Deletion stays within `projects/`, which cannot itself be deleted, and folders containing active project operations are protected.

File and batch-import dialogs stay within the FullMeta workspace. Cancelling a nested picker preserves its parent draft. Human editing and WebMCP do not require watch mode. Optional source watch rebuilds and reloads/replays development state; it does not grant extra document or native-operation permissions.

Select a `.md` file in Explorer to render Markdown in Graphics Console, with its details in Settings. The preview is read only and retains safe text/code rendering. Try [the SRR example README](../../../applications/fem/examples/srr_tr_unit1/README.md). View uses the names **Stacked** and **Columns**, with the selected layout marked by a right-aligned SVG tick.

See [workspace files and layouts](workspace-files-and-layout.md) for the path, picker, layout and replay contracts, and [frontend development](../../ui/frontend-development.md) for build/watch commands.

The [FEM public guide](../../../applications/fem/docs/README.md) and [Model 2 format](../../../applications/fem/docs/fullmeta-model-2.md) support users and agents authoring project JSON. The current FEM schema is minimal; these public references distinguish the format from the application capabilities actually delivered.

This source checkout includes the developer guides below. A separately packaged documentation extractor may contain only documentation; the runtime and installed applications remain separate packages.

## Start here

- [Create a FullMeta application](../../docs/application-development.md) explains schema-only applications, catalog registration, and when an application needs its own runtime.
- [FEM Model 2 format](../../../applications/fem/docs/fullmeta-model-2.md) defines project values, quantities, profiles and references for model-authoring agents.
- [Experimental first-order E-H formulation](../../../applications/fem/docs/first-order-eh-formulation.md) documents the current numerical scope of that solver mode.

## Detailed references

- [Application catalog](../../../applications/README.md) gives the runtime registration rules.
- [FEM model guide](../../../applications/fem/docs/README.md) introduces the public project format and available application workflows.
- [FEM native executables](../../../applications/fem/fem-rust/README.md) describes solver boundaries, executable commands and scenario extension points.

## Current conventions

- Application IDs use lowercase letters, digits, and hyphens; they start with a letter.
- A project's schema declares its application ID and the relative `x-fullmeta-schema` property used to load that schema.
- Schema validation programs use `x-fullmeta-rules`.
- Application public guides describe their model and storage interfaces separately from the workspace tree's general nested-file navigation. Builder specifications may remain private; public document authoring does not depend on them.
- Platform runtime packages include curated workspace/shared Help entries. Historical evidence and specification archives remain separate. The standalone documentation extractor does not install FullMeta, an application or a project.

Code paths in these guides refer to the FullMeta source tree. The standalone documentation extractor contains documentation only; it does not bundle FullMeta executables or source code.

Updated: 2026-11-08.
