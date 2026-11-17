# HTTP API and executable registries

FullMeta has two related registries:

1. The **HTTP API registry** says which local HTTP calls exist, their method, and which layer handles each call.
2. The **executable registry** says which native programs an application schema makes available and which command entries Rust may invoke.

These are separate contracts. An HTTP route selects a capability; it does not let a browser submit an arbitrary executable path or shell command.

## Route registration rule

Every supported HTTP API call must match one registered route and method. Shared host APIs are registered by the Rust Kernel. Application APIs are declared by the selected model schema under `x-fullmeta-runtime.editorApi`, or by another explicit Rust-owned route contract. A schema declaration provides the route, method, input/output shape, handler ID, and—where native execution is needed—the registered program and protocol.

An `operationId` is a value carried by a registered operation or its cancel/finish API. It is not an API name and must not select a handler or executable. Rust validates operation IDs and tracks the corresponding live process/storage operation. Rust never forwards an API request to JavaScript: a route with only a legacy JavaScript handler, or an unknown `/api/...` path, ends at Rust with HTTP 404. The shared model-document routes are Rust-owned. The compatibility worker has been removed from server startup.

## Compact native operation bindings

An API contract can opt into the application-owned, versioned [native operation authority](native-operation-contract.md):

```json
{
  "route": "/api/geometry/check",
  "operationContract": { "id": "mesh.check", "version": 1 },
  "externalProgram": { "registryId": "geometry" }
}
```

`operationContract` belongs to the API contract. The declared executable alias `geometry` is separate from the native program identity; the registered executable and allowed entry still have to match. The normalizer fills descriptor-owned method, entry, protocol and content-type defaults, preserves explicit compatible overrides, and rejects conflicts. An omitted digest resolves to the installed authority identity; an explicit stale digest is rejected.

The frontend, native self-description and Kernel use the selected application's authority for request/result/event checks. Stream success requires a valid terminal event, successful process exit and checked artifacts. Native domains retain model meaning and precise diagnostics. Existing unbound API/program declarations keep their documented legacy behavior. These contracts do not create a runtime capability in a schema that has not declared one.

## Executable registry

The application schema owns the program declarations in `x-fullmeta-runtime.externalPrograms`. The shared shape is defined by [`fullmeta-model-runtime-1.schema.json`](../contracts/fullmeta-model-runtime-1.schema.json). A declaration includes:

- a workspace-relative executable path;
- `pathType`, which says whether the path is relative to the workspace or the schema;
- `allowedEntries`, the exact command-entry allowlist.

Rust reads the registry from the active schema, resolves the executable inside the FullMeta workspace, checks that the requested entry is allowlisted, validates the working directory and arguments, and launches the program directly without a shell. For schema-declared APIs Rust also owns JSON/NDJSON transport, cancellation, and any declared output-file checks. Application programs own the meaning of their inputs and outputs.

Each application owns its program declarations and documents its own executable entries. The Kernel applies the same registry rules to every application.

## API registry and current dispatch

The Rust route table and the schema declarations together define the current public API. Rust rejects API paths without a Rust handler. The compatibility worker and its request fallback have been removed.

### Rust-owned routes

| Route | Method | Registration/handler | Status |
| --- | --- | --- | --- |
| `/api/server/status` | `GET` | Rust Kernel route table | Rust handles it directly. |
| `/api/server/shutdown` | `POST` | Rust Kernel route table | Rust handles it directly with the server-control token. |
| `/api/kernel/core` | `POST` | Rust Kernel route table | Calls the linked native Core library. |
| `/api/kernel/command/run` | `POST` | Rust Kernel route table plus the active schema's program registry | Rust validates the registered program and runs the declared entry. The application assembles the command request. |
| `/api/kernel/artifact` | `GET` | Rust Kernel route table | Reads a checked workspace artifact. |
| `/api/kernel/storage/remove-matching-directories` | `POST` | Rust route plus schema-declared `schemaOperation` / `storageOperation` | Performs the generic, checked storage operation declared by the active schema. |
| `/api/model/operation/cancel` | `POST` | Rust Kernel route table | Cancels a registered command, streaming program, or storage operation. |
| `/api/model/operation/finish` | `POST` | Rust Kernel route table | Closes the browser-side operation lifecycle after the work has stopped. |
| `/api/model-editor/info` | `GET` | Rust Kernel route table + selected schema compatibility declaration | Reports compatibility values by reading the schema's declared `capabilityAnnotation` and `compatibility` paths. |
| `/api/project/create` | `POST` | Active schema: `kernel.workspace.project.create` | Rust creates a schema-configured project folder and stores the initial model JSON prepared by the browser application package. |
| `/api/project/delete` | `POST` | Active schema: `kernel.workspace.project.delete` | Rust safely removes a project folder under the schema-declared project root. |
| `/api/model/create` | `POST` | Active schema: `kernel.workspace.model.create` | Rust stores browser-prepared model JSON in a checked project folder. |
| `/api/model/runs` | `GET` | Active schema: `kernel.workspace.model.runs` | Rust reads run manifests and projects/sorts their fields using the active schema contract. |
| `/api/program/schema-match` | `POST` | Rust program-document handler | Searches for matching JSON documents by name and SHA-256. |
| `/api/program/document/save` | `POST` | Rust program-document handler | Saves a declaration with an expected-content-hash check. |
| `/api/program/document/create` | `POST` | Rust program-document handler | Creates a new declaration without replacing an existing file. |
| `/api/models` | `GET` | Rust shared model-document handler | Lists model documents and project folders from generic document metadata. |
| `/api/model` | `GET` | Rust shared model-document handler | Reads a model JSON document and returns its canonical content hash. |
| `/api/model/save` | `POST` | Rust shared model-document handler | Saves the current model with optimistic conflict detection and atomic replacement. |
| `/api/model/document/save-as` | `POST` | Rust shared model-document handler | Creates a model JSON copy without replacing an existing file. |
| `/api/model/file-match` | `POST` | Rust shared model-document handler | Finds a model document matching its filename and raw content hash. |
| Static workspace files | `GET`, `HEAD` | Rust static-file handler | Serves browser assets directly from the workspace. This is not an API route. |

The Kernel handles these routes and schema-driven dispatchers.

### Schema-registered application APIs

Applications declare their own routes in `x-fullmeta-runtime.editorApi`. The Kernel dispatches supported native-program and storage-operation contracts; the application owns its domain behavior. Consult the application guide for its routes.

### Shared model-document routes

These shared Model Editor routes are now implemented directly by the Rust server. They use generic document metadata, workspace path checks, content hashes, and atomic file writes; model-schema validation remains in the browser application package. The project listing contains common project/model metadata and identity mismatch status. Application-specific summaries are not synthesized by the Rust host.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/models` | `GET` | Lists model documents and project folders for the launcher/editor. Reads each application's declared storage metadata where needed; no application-specific handlers run. |
| `/api/model/file-match` | `POST` | Finds a model document matching its filename and raw SHA-256 content hash. |
| `/api/model/document/save-as` | `POST` | Saves a model document copy in the same workspace folder without replacing an existing file. |
| `/api/model` | `GET` | Reads a model JSON document and returns its canonical content hash. |
| `/api/model/save` | `POST` | Saves the current model with optimistic conflict detection and atomic replacement. The browser package performs application-schema validation before submission. |

## Target dispatch flow

1. The browser calls a named HTTP route and supplies the opened-document/application/schema context when that API requires it.
2. Rust matches the route and method against its shared route table or the selected schema's `editorApi` declaration.
3. Rust applies the declared protocol: a native registered program, a generic storage operation, or a Rust-owned file/editor handler.
4. If no Rust handler matches, Rust returns 404, including when the schema only declares a JavaScript compatibility handler. It does not forward the request to JavaScript or infer an executable from request data.

Command construction belongs to the application package and domain behavior belongs to registered application executables. The Rust Kernel remains application-neutral: it validates registrations and transports data, processes and files according to generic contracts.

## Compatibility worker retirement

`compat-api-worker.js` has been deleted. The Rust server starts without Node, owns the only HTTP listener, handles its registered Rust/schema routes, and returns 404 for unknown routes and routes whose only declaration names a JavaScript handler. No remaining worker implementation was copied to another program layer; application behavior stays in the already-registered browser package and native executables.
