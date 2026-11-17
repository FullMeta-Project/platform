# Frontend provider contract

This shared contract defines application presentation and editing integration. Read it with the [application platform contract](application-platform-contract.md), [native boundary](native-operation-contract.md) and [workspace integration](workspace-application-contract.md). Domain field behavior and numerical requirements belong to the application specification.

## Source and public modules

Visual components use genuine React/JSX. An application widget normally has authoritative `applications/{APP_ID}/ui/widgets/{widget}/widget.jsx`, a generated public `widget.js`, its external source map, scoped CSS and widget-local contracts/resources. Other presentation modules may also use `.jsx`. Schema/catalog/import URLs expose compiled `.js`; raw JSX is not a browser executable entry.

The frontend builder discovers platform UI and application `ui/` sources. `Component.jsx` produces sibling `Component.js` and `Component.js.map` with original source text. Edit the JSX source. A new JSX source may not overwrite an unowned manual `.js` sibling; establish source ownership first.

Install the pinned tools and run the shared checks from FullMeta:

```powershell
npm ci --prefix scripts
npm run build:frontend
npm run verify:schema-editor
node scripts/check-widget-boundaries.mjs --platform
```

Application imports, resources and registrations also require the application boundary checks selected for that candidate. Root npm `prestart` and `prebuild:runtime` compile frontend assets; directly invoking a native builder does not invoke those hooks. The build/watch guide owns compiler configuration, production mode and source-map details.

Before publication the builder compiles JSX in memory, links browser graphs against pending outputs, validates catalogs and standalone interpreting schemas, and checks JSX/JSDoc plus declaration contracts. Syntax errors, missing imports/exports, unreviewed browser Node builtins, invalid checked props or malformed watched JSON retain the last good published assets. Successful transformation alone is insufficient.

The type gate covers JSX, declarations and explicitly checked JavaScript; it does not establish strict typing or freedom from `any` for all legacy JS. New public components declare their view/command/`WidgetProps` boundary through the supplied types or JSDoc. Document intentional compatibility normalization for retained flattened props.

## One React runtime and catalog

Import React, hooks and mounting primitives from the single local [React runtime](../ui/widgets/shared/react/react-runtime.js). Do not add a CDN runtime, a bare browser React import or an application-private React copy. The synchronous `renderWidgetMarkup`/`renderToStaticMarkup` adapters use that same instance for documented string-return compatibility. Serialized markup has no live React event handlers.

The schema selects registered catalogs using `fullmeta-widget-catalog/1`. A visual entry can declare:

```json
{
  "id": "applicationValue",
  "label": "Application value",
  "category": "field",
  "module": "application-value/widget.js",
  "presentation": true
}
```

The catalog-relative `module` is required and independent of the widget ID. `presentation: true` or `{}` normalizes once to `{format: "fullmeta-react-widget/1", component: "Widget", mount: "mountWidget"}`. A partial object overrides only specified defaults; explicit declarations remain supported. The normalizer infers symbols named by field, authoring, graphics, editor and presentation capabilities; optional `exports` is additive. `uses` dependencies and IDs remain explicit and checked. Preserve supported metadata, reject unsupported keys, and do not mutate the source declaration to make validation pass. Runtime, pending builds and audits use the same normalized ABI. See the [catalog contract](../ui/schemas/fullmeta-ui-widget-catalog-1.schema.json) and widget package convention.

`loadReactWidgetProviders` checks callable public component/mount exports and installs `applicationPackage.reactWidgetProviders`. The live schema form resolves field components by widget ID. A live custom field without a declared React presentation is an error. Where a retained package ABI requires `createWidgetRenderers(context)`, preserve it for its documented synchronous compatibility callers; an HTML-return map does not satisfy the live field-provider contract. Schema-only applications need no invented runtime package or empty widget library.

Runtime applications keep their registered `createApplicationPackage(options)` interface, schema activation, action registry, graphics descriptors and other required package members. The shared schema form or supported `createWidgetComponents` hook supplies `onCommand` to application field components. Adding a provider must not remove the package's other required capabilities.

## Components and normal commands

The shared types define `WidgetProps`, `FieldView`, commands, providers and mounts. The component receives projected `view` and `onCommand`, including stable data path, label, raw/model value, schema/UI facts, diagnostics and availability. Keep units, references, optional-member presence and array identity. In a Settings table, render valid rows/cells rather than arbitrary wrappers inside `tbody`.

For a widget in the package layout above:

```jsx
import React from '../../../../../platform/ui/widgets/shared/react/react-runtime.js';
import {mountReactComponent} from '../../../../../platform/ui/widgets/shared/react/mount.js';

/** @param {import('../../../../../platform/ui/runtime/types').WidgetProps} props */
export function Widget({view, onCommand}) {
  return <tr><td>{view.label}</td><td><input
    aria-label={view.label}
    value={String(view.rawValue ?? view.value ?? '')}
    disabled={view.schema?.readOnly === true}
    onChange={event => onCommand({
      type: 'field.change', path: view.path,
      value: event.target.value, rawValue: event.target.value, valueType: 'string'
    }, event)}
  /></td></tr>;
}
export const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
```

Its standalone container must accept table rows; the live schema form may use the component directly. Use `field.change`/`field.optional` for typed/raw edits and `widget.action` for the installed widget reducer. Include the complete semantic arguments: widget ID, stable path, action name, kind/value/row/key/direction and relevant mode/change data. Application effects use the declared `application.action` boundary and its asynchronous result. A widget must not invent an invisible click target or inspect private DOM state to recover omitted command arguments.

When a scan mode change would discard explicit values, the command returns `confirmationRequired`, a loss message and `confirmationRevision` without editing the draft. To confirm, repeat the same widget action and target with `args.confirmed: true` and the returned value as `expectedRevision`. If the document, selection, draft or revision has changed, request the conversion again. Apply and Save are separate operations.

Human callbacks and external tools invoke the same reducer/transaction, availability and validation. Registering JSX or a catalog entry does not create a domain action or native program. Application effects remain in the declared action service.

## State, drafts and lifetime

Use the existing canonical host state rather than a competing React document store. The [editing store](../ui/runtime/editing-store.js) supplies serializable reducer state and atomic batches; its host adapter exposes the existing host, revisions and command completion. Field parsing and source-preserving transforms remain ordinary JavaScript.

Invalid raw text stays a repairable draft with its diagnostic; it is not a valid model value. Ordinary transactions block dependent actions until required drafts are valid. Selection, expansion, stable row identity, focus/caret, modal raw values, graphics preferences and operation presentation may be serialized. DOM nodes, functions, React roots, workers, fetch clients, native handles and canvas resources may not. Restoring presentation never restarts an operation.

Structured drafts retain each Add-several panel's open state, unloaded text and diagnostic as node `ui` metadata. Checkpoints preserve it through disposal/recreation; parsed JSON excludes it. Nonempty unloaded text blocks reading the value and candidate Preview/Apply until Add or Clear. Invalid numeric text, duplicate names and a rejected later batch row remain repairable. Presentation-only toggles notify mount adapters as presentation changes rather than parsed model edits.

`mountReactComponent` owns one root per container and exposes synchronous `update`, `inspect` and idempotent `dispose`. Dispose children before replacing/removing containers. Release effects, subscriptions, listeners, observers, drawing callbacks and resources when their owner changes, including partial mount failures. The [resource lifecycle](../ui/runtime/lifecycle.js) provides exactly-once cleanup.

Where the package uses `mountEditorPanels({settingsView,settingsTable})`, its optional synchronous return is `undefined`, a disposer or an object with `dispose()`; a Promise is unsupported. The host disposes before old nodes are removed or replacement panels mount. A cleanup error is reported and blocks replacement. Each view also cleans up before its own rerender removes a subtree.

Keep CSS scoped. Catalog provider loading does not invent a stylesheet loader: mount/resource code loads and releases its required styles/assets. Resolve assets relative to their registered application or through the supplied resource resolver, and result files through checked artifact services. No resource may escape its permitted application/workspace boundary. A widget-specific settings/authoring schema stays with its widget; cross-widget contracts stay in `platform/ui/schemas/`. Preview providers must tolerate `model: null` and `selectedPath: null` during startup.

## Validation authoring and candidates

Use [declarative obligations](declarative-validation-language.md), `fullmeta-declarative-rules/1`, where their vocabulary expresses the required predicate. Obligations retain stable ID/name, stage, source/scope with nested relations, one constraint and a repairable diagnostic. Operands distinguish subject fields, explicit model/schema/context sources and literal JSON. Applicability uses declarative `all`/`any`/`not`, not arbitrary JavaScript. Stage metadata does not invoke an operation; the caller selects the program at its declared boundary.

`declarative.obligations` is editable source; `rules` is deterministic derived native AST. Preview/Apply/Save check consistency. A mismatch requires explicit reviewed regeneration and never silently overwrites either representation. Reject unknown formats. Legacy programs retain their supported structured/JSON/TSV tools; replacing a nonempty program is explicit. A predicate outside the declarative vocabulary remains an explicit supported legacy/native program with its required stage and coverage.

Keep maximum-error policy, unrelated programs, metadata and unknown supported extension facts. Executable rule counts describe top-level `rules`; authored obligation counts are separate metadata. Structural validation, authoring/static checks, compiler consistency and actual rule execution are distinct evidence.

Normal authoring stages are separate: stage/load an atomic batch; Preview the full private candidate; Apply only against its unchanged trusted source; Save through the document guard; Validate through the application's normal action; reopen and execute the rules on the intended model/context. Invalid later rows, duplicate IDs or unloaded batch text must not partially replace staged data.

Discover installed command schemas and availability. `schema.batch.preview` and `schema.batch.apply` share the structural batch boundary. The open rule tool's `authoring.validation.batch` stages add/update/remove records atomically; `validation.preview` and `validation.apply` remain separate. Save and Validate are ordinary document commands. A schema-authoring Preview is not execution evidence.

## WebMCP and visible development

Ordinary editor/workspace pages expose their public controller tools without requiring debug mode when the browser supports registration. The [WebMCP adapter](../ui/runtime/webmcp.js) prefers `document.modelContext`, isolates the supported legacy navigator fallback, reports unsupported/partial/rejected registration and releases only its own registrations. Page lifetime, persisted navigation, registration abort and operation cancellation are separate concerns. Removing a tool cannot substitute for Stop.

Inspect current tool descriptors, command schemas, bindings and availability instead of hardcoding a tool/command count. Editor tools provide scoped inspection, JSON-only state export, guarded normal commands and settled panel/canvas checkpoints. Ordinary tools filter development-only restore/replay. Declared application/native actions expose only their registered capabilities. Registration, external discovery and successful invocation are separate evidence; an unsupported browser must be reported honestly.

| Public editor interface | Role |
| --- | --- |
| `fullmeta_editor_inspect` | Compact summary or a scoped resolved commands/tree/settings/surface/dialog view. |
| `fullmeta_editor_state` | Export JSON-only state and pending raw drafts without restoring it. |
| `fullmeta_editor_command` | Invoke an advertised normal command with its source, availability, revision and transaction checks. |
| `fullmeta_editor_checkpoint` | Settle/inspect a named panel or canvas, including canvas PNG pixels. |

When inspection returns a validation result, `validation.current` indicates whether it still applies to the current model and there are no pending Settings, JSON or tree rename drafts. Revalidate after an edit before relying on the previous result.

Workspace interfaces expose its current applications, projects, dialogs, Explorer and normal actions. Discover the currently registered descriptors and browser-provided names; callers must not assume a fixed inventory or reuse a stale tool handle after navigation or registration changes.

Tree actions, inline rename/update/commit/cancel, reorder and application moves follow their offered normal action plans. Reorder requires visible draggable siblings in the same collection/section. Pending JSON/Settings, read-only and action guards still apply. For registered authoring dialogs, `schema.tool.state/update/preview/apply` retain the trusted source/tool/context; updates validate all requested semantic controls and invalidate Preview. Change control-shaping selectors/toggles/names separately and inspect their new anchors, or use the supported atomic value/raw-draft transaction. Arbitrary candidate/source replacement is unsupported.

The visible debugging guide defines optional debug mode and the local bridge. It targets the same visible application session and exposes inspect/state/command/replay/checkpoint/restore/mode through typed requests, not arbitrary JavaScript evaluation, filesystem reads or backend bypasses. Select the actual session and frontend revision. Reject wrong revisions, unsupported/concurrent actions and unknown modes before dispatch; a timed-out action retains its activity slot until browser completion is known.

Development bridge registration uses `fullmeta-editor-bridge/1`, exact-origin/debug opt-in and a session token. It is a loopback development transport, not a production API or another application instance. Use structured JSON files for requests and the installed guide's command shapes. The ordinary WebMCP interface does not require this debug bridge.

Bridge/CLI commands default to fixture services; explicit live actions and replay scenarios declare their mode. Restore defaults to fixture and requires the same application, interpreting schema and canonical document. Ordinary native WebMCP follows the visible session's current mode, initially live, rather than silently switching it. Fixture mappings block unregistered requests without live fallback. They cannot establish filesystem/native correctness.

Watch uses checked build, browser reload and selected scenario replay. It is optional for human editing and semantic commands. Code errors keep the last good view; corrected sources recover. Changed schema/package sources load fresh documents; pending drafts/open authoring dialogs cause a visible revision conflict rather than restoring an old snapshot over a new interpreter. Re-establish the fixture baseline after resolving the conflict. Automatic live replay is blocked. This is not React Fast Refresh or state-preserving HMR.

Keep real-browser keyboard, focus/caret, modal, inline edit/cancel, drag/reorder, responsive layout, camera and pixel checks. Semantic file selection uses the [in-application picker](workspace-application-contract.md#in-application-file-selection); native OS dialog automation is not required. A serializable view cannot establish canvas pixels or pointer geometry. Record command execution/settle/round-trip time separately from human navigation and visual inspection before claiming a workflow speed improvement.

## Application acceptance

Each application widget must resolve its compiled catalog exports and schema binding. Prove a human edit and a WebMCP command reach the same draft/reducer, invalid raw values stay repairable, stale/unavailable actions have no effect, and Apply/Save/reopen preserve the declared data. Author a representative disposable model through these commands, then tune it through ordinary controls.

Identify the same candidate across automated checks, visible interactions, fixture/live replay, validation stages and required native/results cases. Include source/configuration/lockfile and contract identities, generated frontend revision/mode, exact outputs and accurate failure ownership. Provider rendering or a platform freeze does not satisfy application backend, domain or numerical acceptance.
