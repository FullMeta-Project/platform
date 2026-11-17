# FullMeta Model

`fullmeta-model` is the Rust model-contract, declarative validation and JSON-edit layer. It builds as a native Rust library (`rlib`) and as a WebAssembly module (`cdylib`). It depends on `core-rust` for expression and quantity algorithms. Tree edits, symbol rewriting, reference maintenance and semantic checks use the supplied schema's declarations. The library requires an explicit logical schema context. Application discovery and application-specific metadata extraction live in the caller. The generic framework retains FullMeta editing annotations, ID/name conventions and the supported subset of JSON Schema.

## Layout

| Path | Role |
| --- | --- |
| `src/` | Rust library source. |
| `js/api.js` | Public JavaScript API, used by browsers and Node.js. |
| `wasm/fullmeta-model.wasm` | Deployed WASM loaded by that API. |
| `build-wasm.mjs` | Builds in this crate's `.build/` and publishes the WASM here. |

Runtime distributions must retain `js/` and `wasm/` even when Rust sources and compiler caches are omitted.

## Request boundary

The module currently provides:

- `validate_schema`: validates `request.model` against the required `request.schema`. Optional `request.documents` supplies its referenced schema documents.
- `validate_json_schema`: validates `request.value` against the required `request.schema`, with the same optional `documents` context.
- `validate_json_schema_at`: validates `request.value` against the object or boolean schema selected by the root-local JSON Pointer `request.schemaPath`. References keep their meaning in the supplied root schema; optional `documents` are prepared with that fragment as an explicit entry point. The JavaScript helper `validateSchemaFragment(value, fragment, root)` provides the same operation for a predicate object. A fragment contained in that root retains its original location and resource scope; a detached fragment is interpreted in the supplied root's scope.
- `validate_rules`: executes the supplied schema's `x-fullmeta-rules` program against `request.model`, using optional `request.context` and `request.documents`. The program may explicitly select additional schema definitions through its `entrypoints` list. This operation is separate from structural validation and is not implicitly added to editor transactions.
- `schema_resolve`: resolves a fragment's top-level `$ref` chain, retaining alternatives and sibling annotations.
- `schema_at_path`: finds the effective schema for `request.path` in `request.model`. Paths contain object keys and nonnegative array indexes, including the empty root path. `resolveVariant: false` retains the terminal alternatives for controls that offer a choice of variants.
- `schema_property` / `schema_item`: obtains a raw property or array-item rule after resolving the parent's active schema. `request.value` is optional for incomplete drafts. The key or index is supplied as `request.key` or `request.index`.
- `transaction` / `validated_transaction`: replace, insert, clone and remove items; move items between schema-enabled collections; rename a declared symbol and its uses; or report deletion blockers. `move_item` accepts source/destination paths; `rename_symbol` accepts a declaration path and `nextSymbol`. The previous move and collection/index rename names remain compatibility aliases. Insertions take complete item data. `validated_transaction` returns the candidate model and its structural validation errors.

Browser callers use `platform/model-rust/js/api.js`. The application calls `configureModelSchema(schema, documents)` with the root schema and its referenced documents; the JavaScript adapter bundles references and registers the prepared schema in WASM. Browser registrations are tab-local. WASM performs no filesystem or manifest loading and embeds no application schema. Native callers use the native model interface and supply their own schema and application policy.

### Additional public data operations

The following operations expose the model library's public data-based Rust
functions. They accept explicit inputs and do not depend on the active editor
schema. JavaScript callers can use the matching named functions in `js/api.js`
or `modelRequest(operation, fields)`:

| Operation | Fields | Result |
| --- | --- | --- |
| `argv_decode` | `arguments`, `declaration`, `schema` | Decoded argument data. |
| `argv_string_value` | `value`, `declaration`, `schema` | Normalized string. |
| `program_registry` | `documents` | Registered external-program declarations. |
| `validate_rule_declaration` | `model`, `schema`, `declaration`; optional `documents`, `context` | Validation errors. |
| `resolve_options` | `resolution`, `optionSets`, `conditionalRules`, `sources`, `context` | Resolved options. |
| `validate_resolved_number` | `value`, `rules`, `unit`; optional `path` | Validation errors. |
| `numeric_bounds` | `value`, `rules`, `unit`; optional `path`, `errors` | Existing and newly appended errors. |
| `validate_semantic_collections`, `validate_semantic_expressions`, `validate_semantic_quantities` | `input` | The respective native semantic validation report. |
| `unique_id_errors` | `value` | Duplicate-ID errors. |
| `bundle_schema` | `schema`; optional `documents` | Bundled schema. |
| `bundle_schema_with_entrypoints` | `schema`; optional `documents`, `entrypoints` | Bundled schema with explicit entry points. |

For numeric bounds, JSON `null` represents the native API's deferred/non-finite
sentinel. JSON cannot directly represent NaN or infinity. Both schema-bundling
operations use the supplied documents; they do not read files.

### Schema-context handles

`schema_context_new` takes `schema` plus optional `documents` and `entrypoints`.
`schema_context_from_documents` takes a root-first `documents` array. Each
returns an integer handle for a reusable `SchemaContext`. The operations
`schema_context_root`, `schema_context_documents`,
`schema_context_document_annotations` (`key`),
`schema_context_schema_annotations` (`key`), and
`schema_context_model_role_values` (`model`, `role`) take that handle and return
the corresponding data. `schema_context_take_root` returns the root and consumes
the handle; `schema_context_release` releases it without returning the root.

### Complex quantities

`evaluate_complex_quantity` takes `quantity`, `symbols`, `policy`, and optional
`path`; it returns `{re, im}`. `compile_complex_quantity` takes `quantity`,
`policy`, and optional `path` and returns a handle. Evaluate it with
`evaluate_compiled_complex_quantity` (`handle`, `symbols`, optional `path`) or
`evaluate_compiled_complex_quantity_batch` (`handle`, `symbolTables`, optional
`path`). Release it with `release_compiled_complex_quantity`. Symbol tables use
the native JSON format, mapping each name to `{value, dimension}`. A batch fails
as a whole if any evaluation fails.

Context and complex handles are local to the WASM instance, are never reused,
and must be explicitly released. There may be at most 1024 live model handles.
Rust callback closures are represented by caller-supplied JSON symbol tables at
this boundary.

The native `schema_documents::load_schema_documents`, `SchemaContext::from_path`,
`runtime_paths::installation_root`, `external_program_path`, and
`runtime_tool_path` require filesystem and installation access and are not
implemented as browser-WASM operations. The host must load and check files and
provide document data or checked paths to its caller. JavaScript callers can
pass an explicit host to `loadSchemaDocumentsFromHost`,
`schemaContextFromHostPath`, `installationRootFromHost`,
`externalProgramPathFromHost`, and `runtimeToolPathFromHost`. The host must
provide the matching `loadSchemaDocuments`, `installationRoot`,
`externalProgramPath`, and `runtimeToolPath` methods and is responsible for
filesystem access, link checks, confinement and native path semantics. No host
is installed implicitly. The data-based `program_registry` operation remains
available in WASM.

`validate_model` combines structural validation with any schema-declared rules. `study_result_csv_columns` is rejected because result-output contracts belong to the caller. The JavaScript compatibility helper `validateModel()` performs structural schema validation only; callers that need rule validation can use the corresponding validation report APIs. Applications own any additional domain-specific checks.

## Schema navigation

The public native `navigation` module and the JSON operations above share the model library's reference, branch-selection and merge machinery. Presentation queries combine active property constraints and `x-fullmeta-ui` metadata, preserve parent annotations and support incomplete drafts. Strict transaction navigation retains its editing invariants. The returned effective schema is for navigation and presentation; structural validation always uses the original schema with its composition intact.

Fragment operations select their input using `schemaPath` within the supplied root. They also accept `schemaNode` for a fragment already bound to that prepared root, including a previous navigation result. Supply exactly one of these fields. The JavaScript adapter retains this reference context for returned schema nodes; keep returned nodes immutable and retain their object identity when making subsequent navigation calls. Presentation labels can be supplied separately. Imported or original unused definitions should be selected from their original schema context so their references can be prepared explicitly.

Applications can use `platform/model-rust/js/api.js` for generic reference, path, property and item lookups and supply their own actions and defaults. Model values are supplied per operation. The WASM `SCHEMAS` map retains `RegisteredSchema { source, bundled, rule_context }` by schema handle in the browser; JavaScript retains its corresponding bundle and navigation caches. Browser tabs load separate WASM instances. The Rust Kernel does not retain model-WASM registrations. See [Document Kernels and interpreting schemas](../docs/kernel-contexts-and-interpreting-schemas.md) for storage ownership and lifetime.

## Declarative editing

`src/edit_schema.rs` navigates active references, composition, conditions and variants, discovers enclosing scopes and resolves reference candidates. Navigation supports explicitly declared properties and additional properties; nonempty `patternProperties` needs explicit property declarations. `src/edit_symbols.rs` performs namespace-aware value/call renames, preserving identifier boundaries and using the expression parser for function calls. `src/edit_effects.rs` applies the small set of policies below. Collection paths, geometry type lists, output directories and result suffixes are supplied by the schema.

The application schema uses `x-fullmeta-edit` to declare:

- `scope`: a named enclosing editing scope. `root`/`model` mean the document root for reference compatibility.
- `symbol`: a `namespace`, `kind` (`value` or `call`), and optional `scope`. Symbol namespaces default to the document root. `expression.namespaces` marks strings that reference those declarations.
- `expression.localBindings`: optional contextual value bindings. Each entry names a declaration `namespace` and nonempty `symbols`. Without call selectors those names are local throughout the expression. Optional `callNames` and/or `callReferences` limit a binding to matching call arguments, including nested expressions. A call reference uses the ordinary `scope`, `targetPath`, `targetProperty` and optional `targetSchema` contract to obtain callable names from the original document. Local symbols shadow value declarations in that namespace; other namespaces and occurrences outside the scope still rename. A rename that would capture an existing declaration reference with a local name is rejected. Call names themselves retain their ordinary call-symbol bindings. The expression AST resolves occurrences while the edit retains original whitespace, grouping and numeric spelling. An incomplete scoped expression or malformed binding rejects the transaction before publication. Declare these only where the consuming evaluator actually gives contextual names precedence; they do not change evaluation semantics. The shared engine contains no application-specific callable names or local symbols.
- `move`: a shared collection `group`, enclosing `scope`, and accepted `itemSchema`. Self-descendant prevention and array-index adjustments remain generic tree operations.
- `clone.enabled`: duplication availability, with optional `clone.message`. `cloneReference: "firstUnused"` allocates a target using the property's reference eligibility and uniqueness contract.
- `objectKeyFrom`: on a dynamic object-entry schema, names the string item property that must also be its parent object key. `set_item` moves the entry when that property changes and rejects empty or occupied keys.
- `cloneTemplate`: a string using `{item.property}` fields from the cloned item and `{extension}` from the original target filename. Templates apply only to properties present in the clone.
- `onInsert`: `appendUnique` effects with `scope`, `targetPath` and item-relative `valuePath`. Paths support `*` expansion. `create` permits creating a missing schema-declared array; `requireValidReference` gates the effect on a valid, unoccupied item reference. Optional `related` joins a scoped record collection using declared equality paths.

`x-fullmeta-modelReference` declarations supply target paths and uniqueness. Optional `targetSchema` is an object or boolean JSON Schema applied to each candidate target using the supplied root schema. For example, `{"type":"object","required":["entity"],"properties":{"entity":{"const":"domain"}}}` constrains a candidate's properties without requiring the model library to interpret them. The previous `entity`, `entities`, `targetType`, `targetIntegrationKind` and `targetContracts` eligibility aliases are retired. The browser and native editing library use the same schema predicates.

`keyReference: true` on an object-valued `x-fullmeta-modelReference` binds its keys to the declared eligible targets. A `rename_symbol` or complete-item symbol edit renames existing bound keys exactly, preserving their values and unrelated draft keys. Scope, target property/filter and enclosing `x-fullmeta-symbolReferenceContext` apply. File-only contexts therefore keep literal column keys. Simultaneous key swaps use the original bindings; nested maps move deepest first. An occupied destination key rejects the whole transaction with the map path and key, without publishing partial edits. Newly introduced maps have no previous binding to retarget. Key matching is exact; suffix variants remain the separate string-value `x-fullmeta-symbolReference` feature.

With `onDelete: "remove"`, reference-map keys are also removed when targets leave the eligible collection during deletion or movement. Existing dangling draft keys remain. ID-keyed memberships need no insertion or reordering updates; positional string-address maintenance is retired because the current model schema accepts membership objects only.

`x-fullmeta-symbolReference` supplies a target collection/property, scope and literal `suffixes`. An enclosing `x-fullmeta-symbolReferenceContext.when` declares a wildcard-capable `path` and `equals` condition, allowing external-data column names to remain independent of model symbols. These annotations are editing contracts, not additional JSON Schema validation keywords. Completeness requirements can be selected explicitly by a validation program while editor structural validation permits incomplete drafts.

Object validation applies `propertyNames` to each property key as a string, including declared and additional properties. It reuses the same schema reference context, string/composition checks, nesting limit and error bound as ordinary values. Name diagnostics identify the owning object and quoted key. This assertion does not constrain object values or apply to non-object instances.

## Declarative validation

`rules::validate(model, schema, documents, context)` executes the root schema's
`x-fullmeta-rules` declaration. It contains a positive `maximumErrors`, a
`rules` array and optional `entrypoints` for additional schema fragments. The
caller owns all four inputs; the interpreter performs no application discovery.

Native callers can also use
`rules::validate_declaration(model, schema, documents, context, declaration)`.
It executes an explicitly selected program against the same borrowed schema,
without copying the schema or assigning application meaning to the selected
annotation name. Applications can use it for model, operation-argument,
registration and installed-metadata validation boundaries.

Rules use the following control forms:

- `let` plus `value` binds an evaluated expression.
- `forEach` plus `as`, optional `indexAs`/`pathAs`, and `rules` visits selected
  values. `forEachTree` additionally follows a declared `children` query.
- `if` selects `then` or `else` rule arrays. `when` optionally gates one rule.
- `assert` evaluates a boolean relation and reports its declared `message`.
- `check` invokes `schema`, `uniqueIds`, `expression`, `quantity`, `options` or `rules`.
  `input` is evaluated explicitly; `bind` retains the result, and check errors
  enter the report. `haltOnErrors` stops subsequent stages after failure.

A `rules` check takes an explicit `value` and `declaration`, plus an optional
`context` (otherwise inherited), so several validation boundaries can reuse one
authored program. Each call has its own bindings; the logical schema and supplied
documents are borrowed. Recursive calls have a bounded depth.

Expressions select explicit data with `model`, `schema`, `context`, or `var`
descriptors and JSON Pointer or array paths. Queries declare `from` and support
wildcard paths, `where`, and `basePath`. `object` and `array` constructors evaluate
their children; `literal` preserves supplied data unchanged. Operations declared
by `op` include comparisons, set membership, uniqueness, map/filter/lookup joins,
coalescing, conditional choice, map construction, vector norms and schema
navigation. Collection concatenation and text construction are separate
operations; `trim` removes surrounding whitespace from an explicit string.
Paths and diagnostics remain schema data.

`product` multiplies an explicit array of nonnegative integers using checked
64-bit arithmetic. The empty product is one. Overflow is an arithmetic error;
application limits and diagnostics are expressed separately by schema rules.
`productAtMost` compares the mathematical product with a nonnegative integer
limit without overflowing. A zero factor gives a zero product, including when
other factors are large; the empty product is one.

String `pattern` constraints use a cached regular-expression engine instead of
a list of recognized application patterns. Anchored leading positive/negative
lookaheads are supported through independent anchored matches. Other constructs
unsupported by the engine produce a schema diagnostic rather than being ignored.

The reusable mechanisms are implemented in `rules_graph.rs`,
`semantic_expressions.rs`, `semantic_quantities.rs` and `rules_options.rs`.
Expression checks take explicit rows, symbol scopes and callable catalogs.
Quantity checks take explicit symbols, units, permitted functions, bounds and
sampling declarations; a deferred value is not evaluated at an invented sample.
Option checks take named value sources, source precedence, contextual defaults
and conditional allowed sets. These APIs contain no application field lists,
scenario IDs, material concepts or hardcoded application-tree routes.

`runtime_expressions.rs` binds expression policies through the generic rule
graph. Callers use `fullmeta-core` directly for compiled real expressions,
quantities and parameter resolution. Typed symbol callbacks retain caller
ownership and avoid JSON conversion at each numerical sample. Caller-supplied
policies select functions, built-in names, dimensional tolerance and numerical
conventions. Complex quantities use the model library's compiled complex
quantity API.

The `quantity` semantic check and the `expression` check with `kind: "parameters"`
accept an optional `evaluationPolicy` containing the complete real-expression
policy used by the compiled runtime. Supply it from the application's declared
policy to apply its function catalog, built-ins, dimension tolerance and numeric
conventions to resolved real values. Omitting it retains the earlier behavior for
existing callers. Deferred real quantities use the same policy for dimension
inference; their numerical values and finite-intermediate behavior are checked
when actual runtime samples are evaluated.

The declaration determines which checks run; evaluation still executes code.
Adding a criterion expressible in the existing vocabulary requires a schema
change. Adding an operation requires a generic implementation and rebuilding
consumers. Applications can reuse these mechanisms while supplying different
model trees, catalogs and context data.

## Explicit argument declarations

`argv::decode(arguments, declaration, schema)` decodes an explicit argument
vector using caller-supplied global options, mode selectors, positional captures
and option descriptors. Arity, occurrence limits, argument/value schemas,
combinations and diagnostics belong to the declaration. The result retains the
forwarding vector and decoded values. Help tokens and output settings are also
declaration data. The decoder assigns no application meaning to names or modes.

`argv::string_value` applies declared string normalization (`trim`, `replace`,
`stripPrefix`) and the supplied schema predicate. File inspection, platform path
resolution and process execution remain operations of the native caller.

## Explicit schema contexts

Every schema-backed request requires its schema on native and WASM targets. There is no embedded application schema fallback, model-version selection, application manifest reader or implicit installed-document lookup. Missing external documents are errors. A root schema and its reference imports form one logical schema; they are not separate application metadata sources.

Native callers construct `SchemaContext::new(root, documents)`. Its `root()` is a bundled schema with local references; `documents()` retains the supplied original declarations. `new_with_entrypoints(root, documents, pointers)` also prepares explicitly selected definitions for other operations, such as request validation, while preserving root-relative references. Generic annotation queries expose document annotations and reachable schema nodes without interpreting application-specific keys. `model_role_values(model, role)` finds values marked by `x-fullmeta-role` in the active schema. Roles are opaque strings (or lists of strings) declared on schema nodes; the calling application determines their meaning. Schema-node queries follow the root and requested entry-point reference graph. Within annotations, only the exact `x-fullmeta-modelReference.targetSchema` position is traversed as schema, including its references. Other annotations, defaults and arbitrary data remain data.

The optional native `schema_documents::load_schema_documents(root_path)` loads an explicitly selected root file and follows its local reference graph. It performs no application discovery and no network requests. The loader preserves document annotations and root-then-import order. Applications may instead provide documents directly or supply an already bundled schema, including in WASM requests.

A native application selects its schema and can cache a context for generic validation and schema queries. The application interprets its own role annotations, domain-specific declarations and data. Model and schema ownership remain with the caller; the shared model library does not assign application-specific meanings to those declarations.

## Build the WASM module

Install the Rust `wasm32-unknown-unknown` target, then run:

```sh
npm run build:model-wasm
```

The WASM module is built in `platform/model-rust/.build/wasm/` and copied to `platform/model-rust/wasm/fullmeta-model.wasm`. Cargo compiles it against the current `platform/core-rust` source. Running `npm run build:core-wasm` also rebuilds and publishes model WASM, so the normal core build refreshes both compiled copies. Set `FULLMETA_RUST_TOOLCHAIN` to select an installed toolchain when needed.

Browser callers load the module through the JavaScript adapter. Each operation sends one JSON request and receives one JSON response. The Rust Kernel uses native platform components rather than a JavaScript compatibility worker.

## Runtime policy binding over JSON and WASM

`bind_runtime_policy` takes explicit `model`, `schema`, `context` and
`declaration` fields and returns `runtime_expressions::bind_policy`'s evaluated
JSON value. It evaluates the existing generic rule graph; no model paths,
annotation names or application defaults are implicit. The schema may instead
be supplied through a registered `schemaHandle`, with the same binding result.
`bindRuntimePolicy(model, context, declaration, schema = configuredSchema())`
is the public JavaScript helper. Callers select their own declaration and
context, then may supply the returned data to the Core's optional
`evaluationPolicy` argument. Native policy adapters and the Core JSON boundary
share `EvaluationPolicy::from_json` for checked real-policy conversion.
