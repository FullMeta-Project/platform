# Graphics console

`contract.js` interprets an application-neutral graphics declaration. Its JSON contract is [`fullmeta-ui-graphics-console-1.schema.json`](fullmeta-ui-graphics-console-1.schema.json), alongside the implementation.

Selection focus modes use the shared `../selection-highlight/` widget and its
contract. The console selects the focus mode; the widget resolves targets and
can style normalized scene primitives as a reusable highlight overlay.

The tree sends its selected path, item type, scenario dimension, and selected value to `graphicsSceneForSelection`. Rules are checked in order. The first match selects a scene and may name a focus behavior. Rules can match paths, item types, dimensions, or the presence of properties. A focus behavior starts from a bound value and can follow references through bound collections to identify a feature or selection to highlight. A scene declares either an ordered stack of layers on a surface renderer or an ordered set of tabs. Each layer or tab points to a named input whose source is a model, selected item, runtime value, or view value. The host resolves those sources through `graphicsSceneInputs`.

Model Editor's schema-document mode edits the console declaration through structured controls for scenes, layers, tabs, rules, focus behaviors, bindings, axes, and renderer appearance. Those controls call `graphicsConsoleIssues` before applying a change. An application's `adapters` section declares the scene shape, supported layer and tab roles, required ports, and renderer kinds that its runtime implementation supports. These requirements keep an authoring edit from assigning a renderer to a port or role the runtime cannot use. `presentation` holds the shared axes, renderer titles, visibility of scene switches, and Reset view labels.

An adapter remains application code: it converts the bound inputs to normalized `geometry`, `plot1d`, `plot2d`, `plot3d`, or `table` renderer data. The console controls selection, focus, composition, layer visibility, tab selection, input sources, and appearance; it does not execute a study or generate result data.
