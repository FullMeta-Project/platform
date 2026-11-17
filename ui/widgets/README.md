# Widget packages

Each visual widget folder has authoritative `widget.jsx`, compiled to the public
`widget.js` and source map. Edit JSX, not its generated sibling. Pure behavior
and data providers remain ordinary JS. Callers in the
editor, applications, schemas, and other widget folders import supported named
exports from that entry. Files such as `runtime.js`, `design-editor.js`,
`actions.js`, and `contract.js` implement the widget and are used directly only
by sibling modules. Styles, widget-specific JSON schemas, and their JavaScript
validation adapters remain in the widget folder. Public validation functions are
also exported through `widget.js`.

The source entry explicitly re-exports the runtime, action, validation, and authoring
operations a caller can use. Internal modules import their sibling implementations
directly, so they do not create a cycle through their own public entry.

`shared/` contains support used by several widgets, including table data,
row ordering, plotting palettes, scalar surfaces, and schema authoring controls.
Shared helpers are not independently registered widgets.

The Graphics registries belong to `graphics-console/` and are exported through
its `widget.js`. Cross-widget annotation routing and design dispatch live in
`shared/`. There are no loose JavaScript implementation files in this directory.

## Discovery

`catalog.json` lists each public module, its named exports, purpose, field renderer
and authoring entry where applicable, and Graphics data contract. Module paths
are relative to the catalog. Applications can provide their own catalog with the
same `fullmeta-widget-catalog/1` format and unique widget IDs.
Both catalogs declare the shared contract in
`platform/ui/schemas/fullmeta-ui-widget-catalog-1.schema.json`, using a path
relative to each catalog. The loader applies that
contract before resolving modules, exported names, authoring tools and dependencies.
Field widgets can publish their default `schemaAuthoringProfile` in the catalog;
its validation contract path is relative to that widget's `widget.js` module.

Catalog presentation declarations can use `"presentation": true` for the shared
`fullmeta-react-widget/1` interface with public `Widget` and `mountWidget` exports.
A partial object overrides individual defaults, for example
`"presentation": { "mount": "mountEditor" }`. The loader expands these once at
the catalog boundary; every consumer receives the existing explicit interface.
Declared field, authoring, Graphics, editor and presentation capability symbols
are inferred as public exports. An optional `exports` array adds other supported
ABI names; complete existing lists remain valid. The build checks inferred and
explicit names against the pending compiled modules before publishing them.
Unadvertised helper exports do not need a second catalog listing.

For example, an application catalog can contain this entry:

```json
{
  "id": "materialChoice",
  "label": "Material choice",
  "category": "field",
  "module": "material-selector/widget.js",
  "presentation": true
}
```

The module path is always declared in the catalog and can differ from the widget
ID. A model field continues to select the ID and settings in the existing
`x-fullmeta-ui-behavior` envelope. Fields never repeat the module, component or
mount names. Normalization retains nested settings/metadata and does not modify
catalog inputs or relax the UI contract's rejection of unknown declaration keys.

Platform and application UI packages use the same layout: `ui/widgets/catalog.json`,
one folder per widget, and `ui/widgets/shared/` for support. `ui/schemas/` holds
contracts shared across widget packages, such as the platform catalog and UI
annotation envelope. Applications reuse those platform contracts and only add an
application `ui/schemas/` folder when they need their own shared UI contracts.

A schema declares its catalog paths in
`x-fullmeta-ui-graphicsInterfaces.catalogs`. Those paths are relative to the
schema file. For FEM they are `../../platform/ui/widgets/catalog.json` and
`ui/widgets/catalog.json`. The generic loader in `shared/catalog.js` combines them and
reports duplicate catalog or widget IDs.
Optional `uses` IDs declare dependencies on other entries in the combined
catalogs. For example, the FEM vector component provider uses the shared
`quantityVector` widget; it supplies metadata without duplicating its renderer.

In the schema editor, **Project integration → Widget catalogs** edits the path
table and loads the combined list. **Use catalog widget** fills a Graphics
registration row from the selected public interface. Field annotation dropdowns
use catalog field entries that have a matching authoring profile. Panels and
providers are listed for inspection; they require their own host contracts and
are not offered as field renderers. Catalog discovery does not execute widgets.
Existing schema bindings and application factories still decide when widgets run.

| Interface | Catalog declaration | Host responsibility |
| --- | --- | --- |
| React presentation | `presentation: true`, a partial object, or explicit `format`, `component`, `mount` | Supply JSON `view` and separate commands/context; own update/disposal |
| Field control | `field.render` | Supply the field value, schema, path and editor context |
| Graphics renderer | `graphics.render` or `graphics.descriptor` | Supply normalized data and canvas or scene context |
| Annotation designer | `authoring.render` | Supply the declaration and receive its draft |
| Authoring table | `authoring.tools[].entry` | Supply document transactions, candidate validation and Apply callbacks |
| Application component | `category: component`, with optional `uses` | Supply its application context through the registered application hook |
| Document editor | `editor.mount`, with `editor.options` | Resolve the interpreting schema, supply document services, and mount the editor in a page container |

Field renderer IDs and Graphics descriptors come from the shared catalog.
The platform's explicit module imports supply their executable functions. An
application supplies its own renderer factories and component hooks; its schema
selects their usage. A catalog addition advertises a public interface and does
not grant arbitrary code an editor transaction.

The `modelEditor` catalog entry supplies default schema-authoring presentation,
document widgets, and tool labels, groups, and host command IDs. The interpreting
schema can override these defaults under `x-fullmeta-ui-schemaAuthoring.presentation`.
Field-widget profiles are discovered from each widget's catalog entry, with
schema-local profiles taking precedence when present. Validation table and recipe
tools name `validationProgram` and its public authoring exports; other tools are
editor commands that coordinate schema transactions. They do not become field
widgets simply because they use tables.

The editor supplies document context and handles document transactions, validation,
and persistence. Widgets render and edit the inputs supplied by their host.
Application adapters interpret solver or application model data before passing
normalized inputs to the shared widgets. FEM field artifacts are handled under
`applications/fem3/js/results/`; the shared colorbar receives only a numeric
range, label, units, and color function.

The composite `modelEditor` widget owns the complete tree/graphics/settings layout.
An interpreting schema selects it with `x-fullmeta-ui-editor.widget`; the catalog
owns the module path and mount export. `x-fullmeta-ui-editor.options` is validated
against the catalog's option contract. The **Editor widget** authoring table reads
and writes that declaration and creates its controls from the selected catalog entry.
The top-level `platform/loader.html` page and `platform/loader.js` form a generic
document host. They resolve the interpreting schema and mount its catalog-selected
editor; editor panel markup belongs to the widget.
Widgets may use the browser-safe `platform/js/services.js` public interface.

Shared numeric [table selection](shared/tables/README.md) and [plotting support](shared/plots/README.md) are documented beside their supporting modules.

Install scanner dependencies with `npm --prefix scripts ci` from the FullMeta
root. They stay in `scripts/node_modules/`. Run
`node scripts/check-widget-boundaries.mjs` from the FullMeta root to check
public entry usage, runtime named imports, catalog completeness, merged catalog
dependencies, Graphics registration exports, application module paths and the
interpreting schema's authoring command bindings. Source-location notes can
describe private implementations. Only public registration entries promise an
exported symbol. This command performs a static dependency scan; it does not run
tests or invoke the registered widgets.
