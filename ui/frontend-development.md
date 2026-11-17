# React + JSX frontend build and watch contract

The platform serves compiled JavaScript through the existing Rust host at
`http://127.0.0.1:8765/`. JSX is an implementation format for shared or
application-owned visual components. Schema authors continue to select widgets
and actions through the existing declarative interface. The
[visible debugging guide](editor-debugging.md) documents the actual state,
command, fixture and same-session replay controls.

## Install and build

Frontend tools are pinned in `scripts/package.json` and `scripts/package-lock.json`:
React/React DOM 19.3.1, esbuild 0.28.2, and acorn-jsx 5.3.2. From the workspace root:

```powershell
npm ci --prefix scripts
node scripts/build-frontend.mjs
node scripts/check-widget-boundaries.mjs --platform
```

`node scripts/build-frontend.mjs --production` creates a minified production
runtime. Both modes emit external source maps containing original source text.
The build preserves license notices next to the shared React runtime.
The root `prestart` and `prebuild:runtime` npm lifecycle scripts compile these
assets before `npm start` and `npm run build:runtime`, respectively. Directly
invoking a native builder script does not invoke npm lifecycle hooks.

`scripts/frontend.config.json` declares source/watch roots and output paths.
The compiler discovers `.jsx` throughout `platform/ui/` and
`applications/{APP_ID}/ui/`, skipping dependencies, native build outputs and
scratch folders. It supports an application with no UI folder or browser assets.

Each `Component.jsx` compiles to a sibling `Component.js` and `Component.js.map`.
Treat generated siblings as build outputs and edit the JSX source. Widget
catalogs, application packages and providers expose compiled `.js` entry points;
they do not send raw JSX to the browser. Boundary checks parse JS, MJS and JSX,
so JSX source retains the same public `widget.js` import rules.

## One React instance and explicit mount adapters

JSX modules import React and hooks from the local shared runtime rather than
bare npm specifiers or a CDN. For a platform tree component, for example:

```jsx
import React, { useRef } from '../shared/react/react-runtime.js';

export function Caption({ text }) {
  const reference = useRef(null);
  return <span ref={reference}>{text}</span>;
}
```

Application-owned components use the appropriate relative path to
`platform/ui/widgets/shared/react/react-runtime.js`. The build bundles React,
React DOM and their scheduler once at that path. It exports React as default,
stable React APIs, `createRoot`, `hydrateRoot`, `createPortal` and `flushSync`.
The JSX transform uses `React.createElement` and `React.Fragment`; no second
React copy or automatic JSX runtime is introduced by a component build.

Public widget/provider adapters continue to own props, event callbacks and
lifecycle/disposal. Components call the supplied normal editor commands; they do
not implement competing validation or backend operations. All 25 visual catalog
packages have authoritative `widget.jsx` entries. Two behavior/data packages stay
plain JS. Legacy HTML return interfaces use isolated rendering adapters; canvas
kernels and native resources have explicit React mount/disposal adapters.
Functions, DOM nodes, React roots and graphics resources remain outside
serializable editor/debug state.

## Compile, link and check before publishing

The build parses every JSX source, links the browser module graph against an
in-memory output overlay, and checks JSX, declaration files and explicitly
checked JSDoc modules with TypeScript. Imported legacy JavaScript is inferred;
this does not mean every historic JS module is strictly typed. Catalog, provider
and authoring bindings have a separate boundary check. An unowned manual `.js`
sibling is never silently overwritten by introducing a `.jsx` sibling.

Rendering exports use `fullmeta-react-widget/1`: catalog `presentation: true`
normalizes to public `Widget` and `mountWidget` exports. Partial objects override
these defaults, and fully explicit declarations remain supported. The normalized
`presentation.component` identifies the public React component and
`presentation.mount` owns imperative mounting. The build and runtime use the same
catalog normalizer and check all inferred capability exports plus additive
`exports` names. `WidgetProps.view` is JSON data; commands, context, DOM
resources and callbacks stay outside it. See `runtime/types.d.ts` and the public
`SchemaField`, `SchemaObject`, `SchemaStructure` and `SettingRow` exports.

## Visible build/reload/replay

```powershell
node scripts/frontend-watch.mjs
```

This command watches frontend files and compiles successful revisions. Start
the Rust host separately with the existing server command. The watcher creates
no web server, proxy, API route or additional origin. Existing HTTP/native
dispatch and schema/artifact resolution stay under the Rust host.

The watcher publishes the static `/platform/ui/frontend-build.json` resource:

| Field | Meaning |
| --- | --- |
| `format` | `fullmeta-frontend-build/1` |
| `status` | `ready` or `error` |
| `revision` | Successful content/mode revision; on error, the last good revision |
| `lastGoodRevision` | Most recent fully compiled revision, or null |
| `inputRevision` | Fingerprint of the attempted source inputs |
| `mode` | `development` or `production` |
| `watching` | Whether a watcher currently owns the build loop |
| `watchMode` | `build-reload-replay` while managed by the watcher |
| `sources`, `outputs` | Workspace-relative JSX sources and generated assets for a successful build |
| `error` | Compiler feedback when the current attempt failed |

The visible debugging client can poll this resource without caching. It reloads
only when a new successful revision appears. For code changes it restores its
serializable checkpoint and reruns the selected scenario through normal commands.
Changed schema/package sources load the fresh document and a new replay baseline;
pending human drafts block reinterpretation and show a source conflict. An older
checkpoint never replaces a newly edited schema file. Fixture/live
service mode belongs to that client and must remain visible. The build watcher
never loads a fixture, dispatches an editor command or launches an operation.

This implementation is **build + browser reload + scenario replay**, not React
Fast Refresh or state-preserving hot module replacement. Code-only preview and
scenario rerun are separate controls. Restart the watcher after changing compiler
code or its installed dependencies. Ordinary UI JS/JSX, styles, markup, catalog
and schema changes are watched. The revision resource identifies the same visible
browser session receiving debugging commands; it does not imply a second browser.

Every JSX source must compile, link and pass its type checks before assets publish.
A syntax, import, type or watched JSON parse failure
keeps last-good assets, records an error revision and permits correction/recovery.
Generated siblings, maps and the revision manifest are excluded from watch input
fingerprints, preventing build loops. Real-browser focus, keyboard, drag/dialog,
layout and canvas checks remain required alongside state/action replay.

## Verification

`node --test tests/frontend-build.test.js` checks real JSX compilation, the
single runtime, source maps, atomic syntax-failure rejection/recovery, watch
revisions/stopping and minimal-application discovery. `--platform` boundary scope
checks platform runtime imports and public widget exports without requiring
retired application test assets. Run the full boundary checker without that flag
when auditing all application/source/test references in a complete checkout.

Tool API references: [React createRoot](https://react.dev/reference/react-dom/client/createRoot),
[React flushSync](https://react.dev/reference/react-dom/flushSync),
[esbuild API](https://esbuild.github.io/api/), and
[Acorn JSX parser](https://github.com/acornjs/acorn-jsx).
