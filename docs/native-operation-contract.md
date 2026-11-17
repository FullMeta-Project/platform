# Native operation contract

This shared contract governs application runtime declarations and opted-in native operations. Read it with the [application platform contract](application-platform-contract.md) and [frontend provider contract](frontend-provider-contract.md). An application specifies which installed operations, routes, inputs, outputs and domain cases it requires.

## Declaration and authority

The [runtime declaration schema](../contracts/fullmeta-model-runtime-1.schema.json) describes `x-fullmeta-runtime`, including storage, executable registrations and APIs. The [API/executable registry guide](api-and-executable-registries.md) describes the host boundary. An HTTP route selects a registered capability; it does not permit arbitrary executable paths, shell commands or native entry overrides.

Each application owns its operation authority in a JSON file beside its model schema, declared by `x-fullmeta-runtime.operationRegistry`. The shared Rust boundary crate interprets the selected registry without embedding application declarations. The Kernel, frontend and application executable check the registry's exact-byte SHA-256 digest and operation versions. An executable's `--describe-operations` remains available before an application schema is loaded. The platform's empty [registry](../contracts/native-operations.json) contains no application operations.

An API opts in with `operationContract: {id, version}`. An omitted digest resolves to the selected application's registry. An explicit stale digest, unknown operation or unsupported version fails before execution. Registry names are sibling JSON filenames; the Kernel rejects paths escaping the schema directory. The native program identity is separate from the application's executable-registry alias; the application chooses its alias and checked deployment path explicitly.

Contracts are additive. Preserve the application's declared backend compatibility value, legacy routes/entries and their request semantics. An unbound API retains its explicit legacy behavior; it does not silently acquire a native contract. A selected operation does not choose a domain profile, insert model defaults, implement an application package, repair missing metadata or authorize an additional executable.

## Compact routes

A route supplies its route path, registered program alias and operation identity. For example, using an installed descriptor:

```json
{
  "geometryCheck": {
    "route": "/api/example/geometry-check",
    "externalProgram": {"registryId": "geometry"},
    "operationContract": {"id": "mesh.check", "version": 1}
  }
}
```

The application replaces the example route/alias with its own declarations and selects only a descriptor it needs. Its separate `externalPrograms.geometry` registration owns the executable, `pathType` and allowed entries. No executable is inferred from an alias, operation ID or widget folder.

The shared resolver supplies descriptor-owned method, handler, input/output content types, native entry/protocol and schema bindings. A compatible explicit value is retained; conflicting method/entry/protocol/content type or a simultaneous storage `schemaOperation` fails. Missing required registration is not repaired by normalization. Unsupported keys remain invalid rather than being erased.

Keep compact declarations compact in saved source. No-op Preview/Apply, targeted edits and Save/reopen must preserve supported unknown route/input/output metadata and explicit legacy facts. Resolved defaults are inspection facts, not an instruction to expand every saved declaration.

The ordinary **Runtime API routes** authoring dialog selects a supported operation/version and external program registry. Descriptor-owned inferred controls are visible and disabled while bound; supported advanced metadata remains available. Unsupported existing versions and conflicts remain repairable raw drafts and fail Preview without source mutation. Apply and Save are separate transactions. The [Schema Editor guide](../schema-editor/docs/README.md) covers authoring steps.

## One declared action and execution path

A native action selects one operation API role through its existing execution declaration. For the example route above:

```json
{
  "operation": "mesh.check",
  "inputs": {"model": "document.model"},
  "api": {"run": "geometryCheck"},
  "workflow": {"kind": "nativeOperation", "apiRole": "run"}
}
```

The action's operation matches its API's identity. `nativeOperation` is an installed generic host workflow, not a second application-native dispatcher. Human controls, JSX callbacks and WebMCP invoke the same declared action service, current document and operation state.

By default the resolved input map is the native request body. A workflow may
select one declared input with `input: "model"` when the descriptor expects that
value directly. `requestHeaders` maps a header to `{input: "name", encoding:
"text"}` or `"percent"`. Each name must be an execution input, and each header
must be declared by the selected API's `externalProgram.requestEnvironment` as
a header source. Values are nonempty strings without header control characters.
The host rechecks this context after Save, retains its own operation/digest and
document context, and uses the same fixture-aware transport. These declarations
do not add fields to the opaque model or permit arbitrary headers.

A workflow's optional `progress` map selects `message`, `completed` and `total`
with JSON Pointers into each event. Its `details` array contains records with
`pointer`, `label` and optional `unit`. The host retains a field when an event
omits it; explicit null counts or details clear that value. Counts must be
nonnegative safe integers with completed no greater than total. A known positive
total gives proportional fill, including zero completed; an unknown/zero total
remains indeterminate. Detail fields are finite scalar values. These mappings
contain no application-specific field names in the shared workflow.

`operation.execute` is the semantic host command. Generated `fullmeta_operation_<action-id>` tools expose only declared native-operation actions, accept the descriptor's typed input and optional current `expectedRevision`, rediscover binding/availability and invoke the same handler. A registry entry alone does not create an action or tool. Discover actual tool names/schemas in the current browser session rather than constructing them from labels.

Before execution, settle the visible draft through normal handlers, reject invalid or pending raw edits, run required model/stage validation and require the operation input's model to equal the visible canonical document. Artifact-producing work uses normal Save when required and checks the document again afterward. A failed/conflicting Save, changed model/source, stale revision or unavailable/busy/read-only action cannot execute. Preserve service-mode and current-context guards throughout asynchronous preparation.

Project models remain opaque domain data at the generic boundary. Do not strip unknown supported metadata, reorder arrays, create absent optional members, substitute unsupported fields or reshape a valid native result solely to satisfy a copied abbreviated shape. The installed authority defines actual request/result/event types; the application defines domain meanings and operation selection.

Fixture execution requires an explicit registered response with no live fallback. It does not establish native execution, filesystem effects or domain correctness. Checkpoint restoration does not restart work. Cancellation remains the ordinary guarded Stop/`operation.cancel` interrupt while an action is pending. Removing a tool or restoring state does not authorize Save, Stop or another native action.

## Transport, diagnostics and successful completion

The Kernel checks the selected executable's self-description and digest before launch, validates input, validates the JSON result or each NDJSON event, and checks terminal outcome and required artifacts. Unsupported schema-only JavaScript handlers or unknown routes are not forwarded to a browser worker; the host's registered Rust handlers remain authoritative.

Diagnostics retain `code`, `message`, `stage`, `path` and operation/run identity when available. Transport paths use JSON Pointer. Domain failures preserve their real message/stage; use `path: null` when no precise pointer exists. Show the actual diagnostic rather than fabricated success or an invented repair location.

A streamed success requires the contract's valid terminal event, successful process exit and checked required artifacts. A missing terminal, error/cancelled terminal, event after terminal, nonzero exit, invalid shape, missing/duplicate artifact or cross-run output prevents success. Where the operation delegates to a scenario worker and durable receipt, successful completion is withheld until the worker exits and the checked receipt is synced. A progress event is not a terminal success.

Artifacts are checked regular files within their declared workspace/run and operation identity. Apply descriptor-specific size/empty-file rules only. A permitted empty stderr log must still exist and belong to the run; that exception cannot excuse an empty CSV, geometry/map, required record or another required log. The application records the concrete operation-specific exception and output obligations it relies on.

## Retry, observation and cancellation

Use each operation's declared retry semantics. For a durable operation, reuse the operation ID only with the exact recorded context. The fingerprint covers the submitted model, selected application work unit, canonical document, interpreting-schema path/bytes and operation-registry identity. Changed values, array order, unknown metadata, selection, schema or contract identity conflict; an attempted retry must not launch a second worker.

Completed retries validate the durable receipt and existing outputs before returning the recorded success. Failed or cancelled retries return the recorded terminal outcome. An in-flight duplicate reports that it is already running and is observed through the normal declared status interface. A missing receipt or required artifact fails rather than silently rerunning work or accepting stale data. A genuinely new operation after failure uses a new ID and the ordinary input/availability checks.

Cancellation uses the original run/operation context. The native cancellation entry reports the locked outcome so the host can distinguish cancellation from a completion that already won. Terminal failure/cancellation winners remain preserved under the run-record lock. Native cancellation and process termination are bounded. Retained UI presentation alone does not prove a worker is alive.

Read-only observation is a separate declared capability. It must retain document/schema/program/path/identity checks and must not mutate model JSON, run records, artifacts or operation state. Unmarked routes retain normal document scheduling; a generic debug or read-only label does not bypass it.

For a POST `kernel.program.json` route using `json-stdio`,
`readOnlyDuringOperation` may be a boolean or
`{"bodyPointer":"/reconcile","equals":false}`. The conditional form opts in
only when valid request JSON contains the explicitly equal value at that RFC
6901 pointer. Missing, differently typed or malformed values stay queued.
This lets one declared endpoint distinguish observation from reconciliation;
it does not relax the endpoint's ordinary context, program or path checks.

## Application acceptance

Identify the authority, generated declarations, actual native executable, selected schema/package and frontend candidate together. Verify self-description and the actual Kernel capability identity. Distinguish these binding checks from launching real operations.

For every selected operation, cover valid and malformed input, semantic failure, stale identity/version/digest, ordinary source/Save/revision guards, actual effect/output checks, terminal/exit/artifact failures and applicable retry/cancellation races. Exercise the same action through human controls and semantic tools. Record exact outputs and diagnostics; counts alone do not describe coverage.

The application additionally proves its complete route/profile/workflow matrix and domain outcomes, including meaningful nontrivial numerical cases where required. A platform-native pilot or contract-compliant transport does not establish the finished application's domain correctness. Application-owned integration failures require application repair; a fixed external dependency failure remains an explicitly identified unverified dependency case.

The [native resolver](../js/runtime/native-operations.js), operation session tests, authoring tests, Kernel boundary tests and actual integration fixtures are public reference points for this shared boundary, not a substitute for application acceptance.
