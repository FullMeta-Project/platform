# Shared platform JavaScript

This directory holds application-neutral services shared by the launcher, widgets, application packages and Model library. Application-specific modules belong under `applications/<application-id>/js/`. React views and UI session/resource coordination live under `platform/ui/`.

Implementations are grouped by responsibility. The former flat filenames remain
small public re-export facades, preserving application imports and relative
schema/resource semantics during this migration.

| Folder | Responsibility |
| --- | --- |
| `application/` | Application discovery, package activation, catalog React providers |
| `document/` | Canonical data, transactions, IDs/items and storage policy |
| `schema/` | Schema loading, interpretation and path/reference resolution |
| `runtime/` | Runtime capabilities/contracts and native program registry |
| `debug/` | Data-only state, fixture services and replay/watch controller |

`platform/ui/runtime/` owns UI commands, projections, lifecycle and WebMCP
registration. `platform/ui/debug/` owns the optional JSX dock and loopback
transport. The actual editor-host implementation is now
`platform/ui/runtime/editor-host.js`; `editor-host.js` here remains its stable
facade. Central catalog/annotation contracts stay in `platform/ui/schemas/`.

| Modules | Responsibility |
| --- | --- |
| `application-catalog.js`, `application-packages.js` | Discover registered applications and load their declared packages and schemas. |
| `editor-host.js` | Read a document's interpreting schema, resolve its editor through the widget catalog, and invoke the public mount interface. |
| `schema-document-loader.js`, `schema-document.js`, `schema-paths.js` | Load schema graphs, identify schema documents, navigate JSON Pointers/references and resolve declared paths. |
| `document-state.js`, `model-capabilities.js`, `runtime-contract.js` | Maintain document-scoped state and schema-declared runtime capabilities and compatibility contracts. |
| `model-edit-transactions.js`, `model-item-operations.js` | Provide shared model transactions, IDs and item operations. |
| `project-storage.js` | Read and validate schema-declared storage paths. |
| `external-program-registry.js` | Resolve declared executable paths for native command tests and developer audit tools. The production Rust server resolves its own registry. |
| `services.js` | Expose browser-safe shared services to UI widgets. Node-only utilities have separate imports. |

The Core and Model JavaScript APIs belong to their Rust libraries: `platform/core-rust/js/api.js` and `platform/model-rust/js/api.js`. Each library's `wasm/` folder holds its deployed module; compiler output stays in its `.build/` folder. Shared plotting and table renderers belong under `platform/ui/widgets/`, with supporting modules under its `shared/` folder.

`platform/editor-host.json` supplies the default schema and editor for an empty workspace and schemas without an explicit editor selection. Each application package supplies its schema, document metadata, tree actions and operation policy.

The JavaScript schema loader keeps stable canonical `$id` identifiers when folders change. Relative external `$ref` paths are local imports resolved against the declaring file's location, confined to the FullMeta workspace, and normalized to the imported document's canonical identifier when loaded. Absolute identifiers retain the logical identifier-directory mapping used by existing schema graphs. This lets widget contracts import a sibling widget's contract without tying their public identifiers to the folder layout.

This physical-import convention applies to the JavaScript loader used by browser and Node callers. The native Rust file loader still requires imported files to follow the root identifier's directory mapping. Browser-loaded schema documents are normalized before they are supplied to the Model WASM library.

Widget styles live in the corresponding widget folders, including `platform/ui/widgets/json-choice-table/widget.css`.

Acorn is a development dependency used by `scripts/check-widget-boundaries.mjs` through `scripts/node_modules/`. Its manifest and lockfile live in `scripts/`; install it from the FullMeta root with `npm --prefix scripts ci`. No browser copy is shipped here.

The workspace's compatibility embedding entry is `platform/workspace/js/launcher.js`. The root `index.html` redirects to the universal loader.

The model-editor widget owns its availability rules, operation progress, compatibility messages and schema-document interpretation. Its public interface is `platform/ui/widgets/model-editor/widget.js`. Shared services are exposed through `platform/js/services.js`.

Five unused legacy server modules were retired to `backup/unused-editor-services-2026-10-29/`. The former `platform/js/editor/README.md` is merged here; originals of relocated files are preserved under `backup/editor-support-relocation-2026-10-29/`.

The remaining unused Node server adapters, document-discovery/schema-copy helpers, JavaScript hash and solver bookkeeping helpers, and their obsolete tests were retired to `backup/legacy-node-adapters-retirement-2026-10-29/`. Current project discovery, creation, document snapshots and native command dispatch belong to `platform/kernel-server-rust/`. Native command tests and developer audit tools remain active.
