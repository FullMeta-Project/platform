# FullMeta Core

`fullmeta-core` is the shared Rust expression core. It provides a native Rust library (`rlib`) and a WebAssembly module (`cdylib`) from the same source.

Core accepts data tables rather than the FullMeta model tree. Its generic operations cover expression parsing and AST inspection, evaluation against supplied symbol values, unit-aware quantities and parameter tables, and analysis of expression-definition tables using caller-supplied symbol/function/operator rules.

## Layout

| Path | Role |
| --- | --- |
| `src/` | Rust library source. |
| `js/api.js` | Public JavaScript API, used by browsers and Node.js. |
| `wasm/fullmeta-core.wasm` | Deployed WASM loaded by that API. |
| `build-wasm.mjs` | Builds in this crate's `.build/` and publishes the WASM here. |
| `build-native.ps1` | Builds and publishes the Windows core DLL, then removes its temporary build directory. |

Runtime distributions must retain `js/` and `wasm/` even when Rust sources and compiler caches are omitted.

## Build the Windows core DLL

From the FullMeta root, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File platform/core-rust/build-native.ps1
```

Add `-Offline` to use the existing Cargo cache without network access. The
script builds the x86-64 Windows GNU release DLL in `core-rust/.build/native/`,
publishes it and the native header to `lib/`, and removes that temporary folder
and any old `core-rust/target/` even if the build fails.
It then updates the public SDK native bindings; that check also needs the
matching model and operation-contracts DLLs. The browser WASM is built by the
separate command below. Cleaning the target means the next native build will
need to compile its dependencies again.

The application-neutral native language context has an initial implementation.
See the [compiled language context design](compiled-language-context-design.md)
for its current scope and longer-term design.

## Build the browser WASM module

Install the Rust `wasm32-unknown-unknown` target, then run:

```sh
npm run build:core-wasm
```

The build compiles both core and model WASM from the current core source and publishes them to their respective `wasm/` folders. It fails if the core source changes during the build. Intermediate files use `core-rust/.build/wasm/` and `model-rust/.build/wasm/`. Set `FULLMETA_RUST_TOOLCHAIN` when you need to select a specific installed Rust toolchain. The browser loads core for local expression and quantity work. The Rust Kernel links the same crate as a native library; its normal HTTP route does not send browser calculations to the server.

## Request shape

The WASM boundary uses JSON requests and responses over a small C ABI. The
original operations remain available: `inspect_expression`, `evaluate_expression`,
`validate_expression`, `get_unit`, `supported_units`, `evaluate_model_expression`,
`evaluate_quantity`, `infer_quantity_dimension`, `resolve_parameters`,
`analyze_expression_definitions`, and `evaluate_pointwise_fields`.

Additional operations expose the remaining public Rust functions. JavaScript
callers can use the named wrappers in `js/api.js` or `coreRequest` directly:

| JSON operation | Request fields | Result |
| --- | --- | --- |
| `parse_expression` | `expression` | Expression tree, in the same format as `inspect_expression.tree`. |
| `node_symbols`, `node_calls` | `tree` | Unique symbol or call names in a tree. |
| `references_any`, `has_variable_exponent` | `tree`, `names` | Boolean. |
| `evaluate_ast` | `tree`, optional `symbols`, `definitions`, `stack` | Real number. |
| `evaluate_function` | `name`, `args` | Real number. |
| `dimension_from_json` | `dimension` | Five dimension exponents, or `null` for invalid input; four-element legacy vectors are accepted. |
| `infer_quantity_dimension_with_policy` | `quantity`, `evaluationPolicy`, optional `symbols`, `path` | Five dimension exponents. |
| `symbols_from_pairs` | `pairs` as `[name, number]` pairs | Symbol object. |
| `evaluate_complex_call` | `name`, `args` | Complex value `{ "re": number, "im": number }`. |
| `evaluate_complex_ast` | `tree`, `symbols` | Complex value. |
| `evaluate_complex_definitions` | `definitions` as `[name, tree]` pairs, `symbols` | Map of names to complex values. |
| `parse_evaluation_policy`, `validate_evaluation_policy` | `evaluationPolicy` | Normalized policy, or `true` for validation. Unknown policy fields are ignored. |

Complex `symbols` map names to `{ "re", "im" }` values. New operations that
produce non-finite numbers return an error because JSON cannot represent them.
Existing operations retain their established behavior.

### Reusable compiled expressions

`compile_expression` accepts `expression`, `evaluationPolicy` and optional
`path`. `compile_quantity` accepts `quantity`, `evaluationPolicy` and optional
`path`. Each returns a positive integer handle owned by that WASM instance.
Use `compiled_uses_symbol` with `handle` and `name` to inspect it;
`evaluate_compiled` with `handle` and a `symbols` object to evaluate it; or
`evaluate_compiled_batch` with `handle` and an array of `symbolTables` to
evaluate it repeatedly. Both evaluation operations accept an optional `path`
for diagnostic messages. Expression handles return `{value, dimension}`;
quantity handles return a number. Batch results retain the input order and fail
as a whole if any row fails.

Call `release_compiled` with the handle when finished. Released or unknown
handles return errors. There can be at most 1024 live compiled handles per
instance; released handles are not reused. These operations provide the
behavior of Rust's compiled expression and quantity methods using JSON symbol
tables: Rust callback closures themselves cannot cross the WASM boundary.

```js
import {compileExpression, evaluateCompiledBatch, releaseCompiled} from './js/api.js';

const policy = {allowedFunctions: [], builtinSymbols: ['pi', 'e'],
  dimensionTolerance: 1e-10, allowDimensionlessZeroAddition: true,
  requireFiniteIntermediates: true, signZeroMode: 'preserveZero'};
const expression = compileExpression('2*x', policy);
try {
  const values = evaluateCompiledBatch(expression, [{x: 3}, {x: 4}]);
  // values are quantity records with values 6 and 8.
} finally {
  releaseCompiled(expression);
}
```

`analyze_expression_definitions` accepts definition rows, parameter rows, symbol rows, callable rows, and rule tables. The caller supplies FullMeta-specific policy such as reserved names, allowed function arities, integration operator metadata, and scope restrictions. This keeps the Rust engine independent of the FullMeta model tree while letting callers apply their own semantics.

The generic JavaScript bridge is `platform/core-rust/js/api.js`. Applications supply their own policies for the table API. `platform/model-rust/` and `platform/kernel-server-rust/` also depend on this Rust library for shared expression operations.

## Explicit real evaluation policies

`evaluateQuantityExpression(expression, symbols, path, allowedFunctions, evaluationPolicy)`,
`evaluateQuantity(quantity, symbols, path, allowedFunctions, evaluationPolicy)` and
`resolveParameterTable(parameters, reservedSymbols, allowedFunctions, parameterPath, evaluationPolicy)`
accept an optional final explicit policy. The corresponding JSON operations use
`request.evaluationPolicy`. Omission preserves the legacy evaluation path and
defaults exactly. An explicit `null`, partial object or mistyped field is an
error. An explicit policy is authoritative: its `allowedFunctions` and
`builtinSymbols` are used instead of the legacy `allowedFunctions` argument.

A complete policy has string arrays `allowedFunctions` and `builtinSymbols`, a
finite nonnegative `dimensionTolerance`, boolean `allowDimensionlessZeroAddition`
and `requireFiniteIntermediates`, and `signZeroMode` equal to `preserveZero` or
`signedOne`. Empty `allowedFunctions` retains the compiled evaluator's existing
all-supported-functions convention. The Core accepts the evaluated policy data;
it does not read a model schema or implement an application policy DSL.
`EvaluationPolicy::from_json` exposes the same checked conversion to native
callers. Additional policy fields are ignored by this conversion.

These three operations perform real numeric evaluation. The separate
`inferQuantityDimension` API remains static dimensional inference, including its
existing handling of symbolic frequency exponents, and has no new policy argument.
