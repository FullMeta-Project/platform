# Workspace and menus

FullMeta opens JSON documents through their interpreting schemas. The workspace is the FullMeta folder; the Explorer presents `projects/` as its visual root, while File > Open can browse the workspace. Applications appear in Graphics Console. Project folders can contain nested folders and documents belonging to different applications.

- **File:** Open a document with the workspace picker. Available New, Save and Save As actions depend on the active editor. Workspace New creates an application.
- **Edit:** Copy, Cut, Paste and Select All work with the active text control.
- **View:** Switch between the available panel layouts and resize panels using their separators or arrow keys.
- **Help:** Documentation opens this platform guide in the workspace. An application document opens the guide beside its interpreting schema; schema editing opens the Schema Editor guide. About shows the current package and frontend version information.

In Explorer, use the context menu to delete a project or a file inside it. The confirmation identifies the target. Project deletion removes the selected folder and its contents; `projects/` itself is protected, as are folders with active operations.

The workspace picker confines file choices to FullMeta. A JSON document needs an `x-fullmeta-schema` reference to open in its interpreting editor; other JSON files can still be inspected. Selecting a Markdown file displays a read-only preview.

See [platform architecture](architecture.md) for shared components and [application development](application-development.md) for creating an application.
