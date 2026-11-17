# Document Kernels and interpreting schemas

Updated: 8 November 2026.

## Canonical file identity

Each opened JSON document has a canonical file ID relative to FullMeta, such as `projects/example/model.json`. The Rust Kernel uses that ID to coordinate document-bound requests. A model and its interpreting schema are separate documents with separate contexts. Different documents can share the same interpreter without sharing their document state.

The file identity is independent of an application's ID, a model's display name and a schema's logical `$id`. Workspace path validation rejects escapes and linked file/directory components. Browser tabs retain local drafts; ordinary save and source-hash guards still apply when several views address one file.

## Interpreting schema

Every owned standalone schema and every loadable FullMeta document declares `x-fullmeta-schema`. The reference resolves relative to the opened document. The schema selected by that reference supplies interpretation; its checked UI declarations select a registered editor or widget provider. The universal loader does not infer an application from a filename or folder name.

| Opened document | Interpreting schema | Documentation |
| --- | --- | --- |
| `index.json` | `platform/workspace/workspace.schema.json` | `platform/docs/README.md` |
| An application document | Its application's interpreting schema | `docs/README.md` beside that schema |
| An application schema | `platform/schema-editor/schema-editor.schema.json` | `platform/schema-editor/docs/README.md` |
| The Schema Editor schema itself | Its self-reference | The same Schema Editor guide |
| The runtime contract schema | The Schema Editor schema | The same Schema Editor guide |

Help follows the interpreting schema. The workspace schema opens the platform guide; other interpreting schemas resolve their sibling `docs/README.md`. A missing guide or invalid context is reported explicitly. About reports the current package and frontend facts independently of application capabilities.

Schema `$id` values remain logical identifiers; physical ownership can change while those identifiers stay stable. The exact supported retired schema paths map to their canonical locations before loading and activation. Other paths use ordinary confinement checks. The build/watch preflight checks interpreter declarations and chains for all owned standalone schemas, excluding embedded fragments, fixtures, dependencies and archives.

## Scheduling and native operations

`npm start` launches the Rust Kernel HTTP process. It serves workspace assets, reads and saves documents through checked APIs, and dispatches declared native programs. Document-bound requests carry the canonical file identity, including the URI-encoded `x-fullmeta-document` header where applicable. A busy document can reject opening with HTTP 409 and `DOCUMENT_BUSY`; a different document retains its independent context.

An operation uses the interpreting-schema selection and source snapshot established for that operation. Editing the schema document does not silently replace an active native operation's inputs. Source conflicts, cancellation, retries and operation IDs are separate from document identity. Schema-declared read-only observation routes may use their explicit supported opt-in; write and execution paths retain their normal scheduling and filesystem guards.

POST JSON-program routes can make that opt-in conditional with
`readOnlyDuringOperation: {bodyPointer: "/reconcile", equals: false}`. Only an
explicit match in valid request JSON bypasses the active document queue.
Absent values, malformed bodies and reconciliation requests keep normal
scheduling. The selected application/schema, handler and protocol are checked
before applying either the boolean or conditional opt-in.

Native dispatch selects only registered executables and entries, uses the declared JSON/NDJSON protocol, and never invokes an arbitrary shell. Opted-in native operations additionally use the shared contract authority for identity, request/result/event checks and artifact handling. A declaration selects capabilities; it does not implement the application behavior itself.

## Browser and application ownership

The browser uses Core and Model WASM for expression, quantity, schema and validation work. React/JSX renders the application, while human controls and WebMCP dispatch the same guarded session commands. React's private rendering tree is not the AI protocol. Source watch and replay are optional development tooling; normal editing and Help work without them.

Shared code owns document services, schema loading, the loader/session boundary and common widgets. Each application owns its schema, native/domain behavior, application widgets and documentation. The Kernel's document context is distinct from Core's compiled language context, which owns prepared expressions and their evaluation state.

See [platform architecture](architecture.md), the [runtime declaration contract](../contracts/fullmeta-model-runtime-1.schema.json), and the [native operation contract](native-operation-contract.md) for the shared interfaces.
