# Editing runtime

`editing-store.js` owns serializable reducer state and atomic batches. Its host adapter exposes an existing editor's canonical document without copying it into a competing store. Commands check revisions, serialize inputs/results, publish completion and report command time. React selectors subscribe to the same state used by human controls and the developer bridge. UI and AI commands must call the same validated operation.

`types.d.ts` defines component, field, command, provider and mount boundaries. Actual UI sources use JSX; parsing, transactions, projections and resource ownership remain ordinary JavaScript. `lifecycle.js` releases owned mounts, listeners and observers exactly once. `editor-host.js` composes schema-selected editors through their public catalog interface.

This public state and command model is the AI interface. React's private Fiber tree is not a protocol. Source-file watching and scenario replay live in the debug/tooling layer.

`webmcp.js` registers supplied page/controller descriptors through the native Document API, with an isolated old navigator fallback. Its async status reports actual registration and failures without claiming external-agent connectivity. Registration lifetime and execution cancellation are separate; cleanup cannot substitute for a domain command such as Stop. See [developer transport documentation](../editor-debugging.md#native-webmcp-registration).
