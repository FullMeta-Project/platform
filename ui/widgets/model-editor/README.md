# Model editor widget

`widget.js` exposes `mountEditor(container, context)` and the schema-authoring interfaces used by other packages. Internal implementation modules are private to this folder. The shared widget catalog declares the mount export and supported options.

The widget creates the tree, graphics and settings panels from `template.html`, loads its styles, then mounts `runtime.js`. The top-level `platform/loader.html` document host supplies a container and starts `platform/loader.js`, which resolves the interpreting schema and mounts its selected editor through the catalog.

The shared editor profile contract, [`fullmeta-ui-profile-1.schema.json`](fullmeta-ui-profile-1.schema.json), belongs to this widget. It describes the layout, tree behavior and labels consumed by the editor. Applications supply their profile data and may extend that shared contract with application-specific settings.

The host gives the container a width and height. The widget fills that space with no outer padding; its header and status bar remain visible while panel contents scroll. The standalone host uses the full viewport.

The interpreting schema selects the editor with `x-fullmeta-ui-editor: { "widget": "modelEditor" }`. Optional `treeWidthPx` and `graphicsHeightPercent` values supply initial layout defaults; existing user panel sizes take precedence. The schema-authoring **Editor widget** table provides catalog choices and option controls. Implementation paths are maintained in the widget catalog.

The host supplies `services` for package loading, document reads, resolving a document's editor and navigation, plus an `initial` opened-document context. The returned handle exposes `openDocument(folder, file)`, `save()`, `hasUnsavedChanges()` and `dispose()`. Disposal refuses pending edits or active operations. This first interface supports one workspace editor per browser document; it does not provide a general page-composition designer or multiple concurrent editor instances.

Pure document mechanisms remain under `platform/js/` and are accessed through its `services.js` public entry. Node-only document discovery stays outside the browser service interface. The shared Core and Model libraries retain their own public APIs.
