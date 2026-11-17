# Shared React presentation

JSX sources compile to same-folder `.js` modules and source maps with
`node scripts/build-frontend.mjs`. Browser code imports the local
`react-runtime.js` bundle, never an application-specific React copy. The build
owns that bundle and its license file. Schema authors still use declarations.

`mount.js` provides `mountReactComponent(container, Component, props)` for public
widget adapters. Its returned `update(nextProps)` replaces props and renders the
same root; `dispose()` unmounts it. Mount and update settle synchronously at the
legacy host boundary so existing selection and inspection commands see the
committed DOM. Keep callback functions, DOM nodes and graphics resources in
mount adapters and services, outside serialized editor state.

`surfaces.jsx` exports `SettingsPanel`, `SettingsFields`, `DialogFrame`,
`GraphicsControls`, `SurfaceActions` and `LegacyHost`, plus
`mountSettingsPanel`, `mountSettingsFields`, `mountDialogFrame` and
`mountGraphicsControls`. Each mount takes `(container, props)` and returns the
same update/dispose adapter. Components dispatch supplied callbacks; they do not
implement validation, save policy, model edits or native execution.

`view-projection.js` provides `projectSettingsFields(schema, value, options)`,
`projectDialogView(state)` and `projectGraphicsControlView(state)` for structured
inspection and shared component props. They retain source/schema/data paths,
declared widget/action bindings and supplied diagnostics while excluding service
functions, DOM nodes and graphics resources. Settings defaults remain hints and
never materialize missing model members. Field choice callbacks retain the
native JSON value type. These projectors do not perform application validation.

- Settings fields contain `key`, `label`, `type`, `value`, optional `path`,
  choices, bounds, help/error text and read-only/disabled state. Changes return
  `{key, path, value}` through `onChange`.
- Settings panels add a title/description, state message and declared action
  buttons. Actions return their ID through `onAction(id, event)`.
- Dialog frames render a title, note, host-provided content, status, optional
  generated preview and action footer. The caller owns the native `<dialog>`,
  its open/close state and all transaction preconditions.
- Graphics controls render supplied action and field descriptors, with explicit
  live/fixture mode and operation status. The caller owns canvas resources and
  operation progress/cancellation behavior.
- `LegacyHost` intentionally attaches an existing DOM node without taking over
  its internal implementation. It preserves compatible field widgets during
  incremental migration and detaches them when its parent component unmounts.
  The widget owner remains responsible for disposal of those resources.

The tree widget's `projectSchemaTree` is a pure model/schema-to-view projection.
It returns serializable nodes with original source paths and stable IDs. Closed
branches are not populated; expansion reruns the projection with explicit tree
state. `createTreeViewState` and `reduceTreeViewState` manage selection,
expansion and focus without editing the model. `mountReactTree` consumes the
projection and event callbacks while preserving the host's source-path and drag
event boundaries. Existing imperative tree APIs remain available for adapters.

Keep real-browser tests for focus, keyboard interaction, dialogs, dragging,
layout and canvas behavior. Pure projection snapshots establish data behavior,
not browser rendering or runtime rule execution.
