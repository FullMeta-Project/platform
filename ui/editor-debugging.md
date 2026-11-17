# Visible editor state, commands and replay

The development interface drives the normal editor in the same visible browser tab. Keep the existing Rust host at `http://127.0.0.1:8765/`; start it with the usual server command. Compile frontend assets with `npm run build:frontend` or use `npm run watch:frontend` for [build/reload/replay](frontend-development.md).

## Open the development dock

Open a document through `platform/loader.html` and append `debug=1` to its query. For example, an explicitly created disposable schema at `tmp/editor-example/neutral.schema.json` opens at:

```text
http://127.0.0.1:8765/platform/loader.html?model=tmp%2Feditor-example%2Fneutral.schema.json&debug=1
```

Expand **Developer state and replay**. The dock contains a command/scenario JSON area, a results view, service-mode status and these controls. Full state JSON is kept under the collapsed **Raw editor state JSON** disclosure so large schema snapshots do not fill the visible results; export/restore results show concise format/path/count summaries.

- **Export editor state** and **Restore state as fixture**.
- **Dispatch normal command**, **Run visible replay**, **Inspect resolved UI** and **Capture checkpoint**.
- **Use live services**, **Use fixture services**, and **Watch/reload + fixture replay**.

The same dock moves inside the currently open modal authoring dialog because native modal dialogs make the rest of the page inert. Closing the dialog returns the dock to the editor. It remains one controller and one visible browser session.

The ordinary editor tools are `fullmeta_editor_inspect`, `fullmeta_editor_state`, `fullmeta_editor_command` and `fullmeta_editor_checkpoint`. Debug mode additionally offers explicit restore/replay tools. Their current descriptors accept the fields below directly, without an extra `input` wrapper. Native availability is reported by the WebMCP registration status described below. The earlier pilot browser did not expose the API; current browser support must be observed separately. Debug mode also exposes `window.fullmetaDebug` with contract `fullmeta-editor-debug/1`. Browser automation should use registered tools through its supported browser interface, the visible dock or the documented local bridge, not hidden evaluation of page internals.

## Native WebMCP registration

The current WebMCP draft places the producer API on `document.modelContext`. Register a descriptor asynchronously with a registration `AbortSignal`; its completion confirms registration rather than returning a discovery handle. The callback receives a JSON input object and execution options, and can return JSON data. Browser discovery/invocation is distinct from the page's producer registration. [WebMCP draft API](https://webmachinelearning.github.io/webmcp/#model-context-container)

The shared `platform/ui/runtime/webmcp.js` adapter exposes `registerWebMcpTools({document,navigator,tools,onStatus,signal})`, returning `{ready,status,dispose}`. It prefers the current Document API and awaits every registration. Only when that API is absent does it use the old navigator surface with its owned-name `unregisterTool` cleanup. A current registration rejection never triggers a legacy fallback. It validates the complete descriptor set and JSON schemas before registering any tool, and never clears another owner's tools to resolve a duplicate name.

`ready` resolves a data-only `fullmeta-webmcp-registration/1` status. `status()` reports the detected API, native availability, requested/registered/pending names, failures, lifecycle mode and disposal. Unsupported, failed and partially registered states are explicit. `externalAgentVerified:false` means registration has not proved that an external agent discovered or invoked the tools. Fake-API lifecycle regressions likewise do not prove real-browser support. No polyfill or private browser API is installed.

Current callbacks return their handler's JSON value directly; the native consumer serializes that result. Handler/input/result errors become actionable `fullmeta-tool-error/1` data rather than relying on an exception message reaching an agent. The isolated legacy path retains a text-content result envelope. Unregistering tools removes future availability and does not cancel in-flight work. Execution cancellation is a separate signal forwarded to the existing handler; it never silently invokes Stop, discards a draft, rolls back a Save or authorizes a live operation. [Chrome imperative lifecycle and cancellation](https://developer.chrome.com/docs/ai/webmcp/imperative-api#unregister-tools)

All page tools must wrap existing public controller/launcher handlers, schemas and availability guards. Registration adds no business command, permission or backend route. Keep the visible UI synchronized with results and retain explicit fixture/live semantics. Where native support or external discovery is unavailable, use the ordinary dock/local bridge and record that limitation accurately.

| Editor tool | Current direct input |
| --- | --- |
| `fullmeta_editor_inspect` | Optional `section`: `summary` (default), `commands`, `tree`, `settings`, `surface`, `dialogs`, or `all`. Summary avoids dumping full source; commands returns the installed argument schemas and availability. |
| `fullmeta_editor_state` | `{}`; export only, including raw drafts. |
| `fullmeta_editor_command` | `{ "command":"field.set", "args":{ "path":["name"], "value":"Example", "valueType":"string", "expectedRevision":3 } }`; use a current inspected revision and the actual command schema. |
| `fullmeta_editor_checkpoint` | Optional `name` and `panel`: `settings`, `tree`, `dialog` or `canvas`. |
| `fullmeta_editor_restore` (debug) | `{ "state":EXPORTED_STATE, "serviceMode":"fixture", "fixture":{ "responses":{} } }`; fixture is the restore default. |
| `fullmeta_editor_replay` (debug) | A `fullmeta-editor-scenario/1` object with explicit fixture/live mode. |

Ordinary WebMCP commands use the mounted controller's current service mode and normal application transactions; they do not implicitly switch live work to fixtures. The separate local CLI transport defaults command requests to fixture mode as documented below. `operation.cancel` is an explicitly allowlisted interrupt in the host/debug command sessions: one normal Stop request may run while a native application action is pending. A second Stop, ordinary concurrent mutations, service-mode changes, restore and replay remain guarded. Registration abort and browser invocation cancellation do not replace this domain command.

## Normal commands

Enter one `{ "command": "…", "args": { … } }` object in **Command / scenario**, then select **Dispatch normal command**. Inspect results or errors in that same dock. `inspect().commands` reports the installed command names.

| Command | Arguments and effect |
| --- | --- |
| `selection.overview` | `{}`; show document overview through the normal selection path. |
| `selection.select` | `{ "path": ["properties", "title"] }`, optional `label`/`nodeId`; select an existing available data path, resolving its tree projection. A pending draft or disabled/read-only tree node can prevent the change, as in the visible tree. |
| `tree.toggle` | `{ "id": "<resolved tree node ID>", "expanded": true }`; use the stable ID from resolved tree inspection. |
| `schema.openTool` | `{ "id": "bulk-validation", "path": [] }`; open the declared authoring tool at the relevant schema path. Requires the schema-document authoring context; ordinary project models cannot open schema authoring tools. IDs must be declared/available in that context. |
| `validation.addRule` | A declarative obligation or overrides; requires the open Bulk validation rules dialog. Returns the obligation ID. Nonempty legacy programs require the visible explicit replacement choice first. |
| `validation.updateRule` | `{ "id": "<obligation ID>", "patch": { … } }`; update a staged row. Nested members such as `constraint` are replaced as whole records, so include their required fields. |
| `validation.removeRule` | `{ "id": "<obligation ID>" }`; remove a staged row. |
| `validation.preview` | `{}`; run the same Preview checks as the dialog button. Invalid input or an unchanged candidate is rejected. |
| `validation.apply` | `{}`; apply a current valid preview to the document draft. Stale/absent previews fail. Save is separate. |
| `dialog.close` | `{}`; close the active dialog. |
| `dialog.restoreControls` | `{ "state": <exported dialog checkpoint> }`; restore eligible controls through ordinary input/change handlers, including focus/caret and scroll. Does not click Apply, Save or an operation. |
| `draft.apply` | `{}`; use the normal Apply path for the active Settings/JSON draft. |
| `document.open` | `{ "path": "tmp/editor-example/neutral.schema.json" }`; open a canonical workspace document with the ordinary pending-draft guard. |
| `document.save` | `{}`; normal Save, including availability, validation, target and content-hash checks. |
| `document.validate` | `{}`; invoke the declared visible Validate action and surface its result. Structural validation and actual authored-rule execution remain distinct. |
| `operation.cancel` | `{}`; use the active operation's normal cancellation path when available. It never resumes an exported operation snapshot. |
| `graphics.reset` | `{}`; use normal Reset view and redraw the canvas. |

Commands do not bypass host availability, transaction, draft or validation checks. Concurrent replay/restore/commands and conflicting live transactions are guarded. The external `operation.cancel` command is the explicit exception for an active engine operation: it reaches the same cancellation path as Stop, while unrelated commands, replay, restore and mode changes remain blocked. Use the ordinary visible controls for keyboard, pointer, drag/reorder and dialog interaction checks; a command result does not prove those interactions.

## Export and restore

**Export editor state** fills the **Raw editor state JSON** area with `fullmeta-editor-state/1`. It contains document and interpreting schema/application identity, model data, selected path/projection, expanded tree state, Settings/JSON drafts, open authoring dialogs, validation feedback, camera/control values, operation presentation and focus/caret. The Settings panel checkpoint also retains raw invalid control text that has not become a valid model value; restoring it uses the ordinary input/change handlers without clicking Apply or Save.

Restoration requires the same active application and interpreting schema context, a canonical workspace document path and serializable JSON data. Pure workspace preflight checks nested state containers, paths and authoring checkpoints before the editor mutates or closes current dialogs; pending invalid user text remains valid checkpoint data. It rejects active editor transactions and unsupported dialog state. Open the correct interpreting context before restoring. Do not use a checkpoint to switch silently between applications or schema graphs.

Functions, DOM nodes, React roots, canvas/WebGL resources and service handles are excluded. Operation status is restored only as a visibly labeled, noncancellable snapshot; it never launches or resumes a worker. Confirmation and native file dialogs are not automatically accepted/restored. The bulk validation adapter additionally retains its serializable staged table state and revalidates a restored Preview. Generic controls restore with normal input/change events rather than direct model edits or action-button clicks.

The dock's **Restore state as fixture** establishes fixture mode before restoration. The developer controller equivalent is `importState(state, { serviceMode: 'fixture', responses })`; fixture is its default. A controller caller must request `serviceMode: 'live'` explicitly for a live restore. The visible dock always labels the current mode.

## Fixture and live services

**Use live services** enables ordinary real service effects. **Use fixture services** starts a deterministic fixture with no registered responses. Unregistered fixture requests fail with a visible message; they never fall through to live requests. Direct native-file/application network paths are also guarded in fixture mode.

Fixture responses have this shape, embedded in exported state or in a replay scenario's `fixture` member:

```json
{
  "responses": {
    "GET /api/model?folder=tmp%2Feditor-example&file=project.json": {
      "body": {
        "model": { "application": "neutral-example", "title": "Ready" },
        "folder": "tmp/editor-example",
        "file": "project.json",
        "contentHash": "<matching captured content hash>"
      }
    },
    "POST /api/example": { "error": "Deliberate fixture failure" }
  }
}
```

The response key is uppercase HTTP method, a space, and the request path/query. An exact query key wins over a method/path-only key such as `GET /api/model`. `{ "body": value }` supplies the JSON result; a direct JSON value is also supported, including `null`. `{ "error": "message" }` simulates an error. This is an illustrative mapping, not an installed API or a working project package. Use real captured identity fields where an existing command requires them.

Fixture mode does not make Save/Apply interchangeable or prove native execution. A fixture Save response is only a simulated service result. Use isolated disposable files and explicit live services to establish real Save/reopen, validation-rule execution, mesh/Study output, cancellation and artifact behavior.

## Author a small disposable scenario

The following is an example schema document to create deliberately outside `platform/schema-editor/`, at `tmp/editor-example/neutral.schema.json`. Its relative interpreter path is based on that location. Do not overwrite the canonical editor schema with it.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://fullmeta.local/examples/neutral.schema.json",
  "x-fullmeta-schema": "../../platform/schema-editor/schema-editor.schema.json",
  "title": "Neutral authoring example",
  "type": "object",
  "properties": {
    "application": { "const": "neutral-example" },
    "title": { "type": "string" }
  }
}
```

Open that document with `debug=1`, enter the scenario below in **Command / scenario**, and select **Run visible replay**. It stages and previews one obligation on this disposable schema; it does not Apply or Save it. The rule language is documented in [Validation program authoring](widgets/validation-program/README.md).

```json
{
  "format": "fullmeta-editor-scenario/1",
  "name": "Preview one neutral title obligation",
  "serviceMode": "fixture",
  "commands": [
    { "command": "selection.overview", "args": {} },
    { "command": "schema.openTool", "args": { "id": "bulk-validation", "path": [] } },
    {
      "command": "validation.addRule",
      "args": {
        "id": "title-nonblank",
        "name": "Title is nonblank",
        "stage": "model",
        "scope": { "source": "root", "path": "", "nested": [] },
        "constraint": { "type": "nonblank", "subject": { "field": "/title" } },
        "diagnostic": { "path": "/title", "message": "Title must be nonblank." }
      }
    },
    { "command": "validation.preview", "args": {} },
    { "command": "checkpoint", "args": { "name": "Preview ready", "panel": "dialog" } }
  ]
}
```

Scenarios declare fixture or live services explicitly. Optional `initialState` is an exported checkpoint and optional `fixture` supplies response mappings. If `initialState` is omitted, the controller captures and retains the current baseline before executing the scenario. All command names are checked before scenario state changes. Execution stops at the first failed command and retains its trace. Successful results use `fullmeta-editor-replay-result/1`, including per-command `commandMs`, render `settleMs`, total elapsed time and checkpoints. Those timings exclude author reasoning and prepared-input effort.

## Workspace import actions

Batch import controls also have a normal structured action. Open the authoring tool, inspect `section: "files"`, and choose an available `files.picker.availableImports` key. Dispatch `workspace.picker.import` with that `key` and an optional `folder`, then use the ordinary picker navigation, selection and Accept/Cancel commands. The same action serves the human import button; it reveals a collapsed disclosure without simulating a click. Opening lists the folder and does not read/import a file. Explicitly hidden, disabled, disconnected or foreign-owner import controls are unavailable.

## Watch the same tab

Run `npm run watch:frontend` beside the unchanged Rust host. Run/select a fixture scenario in the dock, then enable **Watch/reload + fixture replay**. A new successful `/platform/ui/frontend-build.json` revision triggers a full reload of the same tab once active transactions finish. The controller restores the scenario's retained initial state and fixture responses before replaying it. This prevents an add/delete command from being applied again to the prior final state. With no selected scenario, it restores the checkpoint and captures the settled result.

Compile failure leaves last-good assets in place, reports the error and does not trigger failed-asset replay. Correct the source to recover. Generated siblings/maps/manifests do not trigger build loops. Restart the watcher after compiler/dependency changes; compiler, configuration and lockfile identities participate in revision calculation.

Automatic replay requires fixture services. A selected live scenario is not automatically rerun, including one found in persisted watch state. Run an intended live scenario manually and observe its effects. Watch/reload/replay is distinct from live preview, React Fast Refresh and state-preserving HMR: this first increment uses a full page reload.

## Inspect and capture

**Inspect resolved UI** reports actual tree/Settings projection, source schema/data paths, diagnostic/action bindings, control values/availability, open dialogs, transactions, operation presentation and canvas dimensions. A `checkpoint` scenario step accepts `panel: "tree"`, `"dialog"` or `"canvas"`; omitted/other values select Settings. A canvas checkpoint contains a PNG data URL and bounds. DOM-panel checkpoints contain inspection and bounds; capture their pixels with the connected visible-browser screenshot tool.

Keep real keyboard/focus/caret, drag/reorder, modal, responsive layout and graphics checks in this visible session. Label separate headless/fixture browser sessions explicitly. When comparing workflows, record active input/navigation time and counts, command execution, render/service waits, retries/errors and visual inspection overhead separately. Structured state or JSX alone does not establish a speed improvement.

## Local command bridge

When the browser exposes no WebMCP tools, start `node scripts/editor-debug-bridge.mjs` alongside the Rust host and open the visible editor with `debug=1`. The bridge listens only on `127.0.0.1:8766`; the application remains at `http://127.0.0.1:8765`. The opted-in browser registers the public controller and reports connection status through the developer dock. The bridge is development tooling and adds no Rust or production API route.

Use `node scripts/editor-command.mjs sessions` to list visible sessions. With exactly one connected session, subsequent commands select it automatically; otherwise pass `--session ID`. `inspect` and `state` return compact resolved UI and the data-only snapshot respectively. `checkpoint`, `command`, `replay`, `restore` and `mode` call the same controller methods as the dock. JSON inputs can be supplied with `--file path/to/request.json` or `--json`; a file avoids shell quoting problems.

For example, a local command input file can contain:

```json
{
  "command": "selection.overview",
  "args": {},
  "serviceMode": "fixture",
  "fixture": { "responses": {} }
}
```

Run it with `node scripts/editor-command.mjs command --file path/to/request.json`. Commands default to fixture mode. Intended live operations require explicit `"serviceMode":"live"`; replay scenarios retain their required explicit service mode. Restore input is `{ "state": EXPORTED_STATE }`, defaults to fixture mode, and retains the host's application/schema/source preflight. Mode input is `{ "serviceMode":"fixture", "fixture":{ "responses":{} } }` or an explicit live mode. Checkpoint input accepts `name` and `panel` as above.

Requests use `fullmeta-editor-bridge/1`, include the visible frontend revision, and serialize per session. The CLI reads the current revision from the session listing; `--revision HASH` can assert a known revision. Stale revisions and concurrent requests fail before dispatch. The default timeout is 30 seconds (`--timeout MS`, capped at 120 seconds); a timed-out command keeps its activity slot until the browser reports completion, so timeout cannot silently authorize duplicate mutation. After disconnect or reload, inspect the visible session before retrying an action whose outcome is unknown.

The browser endpoint requires the exact FullMeta origin, `debug=1`, and a session token. Other browser origins, arbitrary evaluation, arbitrary file reads and unregistered commands are rejected. Browser DOM, operation resources and functions are never serialized. Use visible screenshots for pixel acceptance; structured bridge inspection is not a substitute for layout, keyboard, drag or graphics checks. The CLI records request `roundTripMs` and browser execution `elapsedMs`; replay results additionally separate command and settling time. These exclude author input preparation and visual inspection effort.
