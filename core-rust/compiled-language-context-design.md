# Core DLL language runtime and compiled context

**Status: initial implementation.** Core now owns compiled expression contexts,
pointwise definition plans, operator argument handles, and typed complex and
unit-aware batch evaluators. FEM builds using the three platform DLLs and the
public SDKs, without a supplied core Rust library or core implementation source.
See [core-native.h](core-native.h) for the actual C ABI. This document also
describes longer-term goals and design examples; it is not itself an ABI
specification. Some FEM validation and operator-alias preparation still inspect
the JSON expression tree, so evolving the language may require additional work
at that boundary.

This document describes an application-neutral language service owned by the
FullMeta core DLL. It is intended to let an application prepare expressions and
their relationships once, then evaluate changing numerical inputs efficiently
over many points. FEM is the first intended consumer, but core must not depend
on FEM, a particular model schema, a mesh, or a solver.

The design follows the same broad idea as the existing model schema context:
register relatively stable information once, retain a handle to the prepared
state, and reuse it for later operations. The numerical hot path requires a
typed batch interface in addition to setup and metadata queries.

## Goals and scope

The proposed context will:

1. Accept expression text, named definitions, host-operator declarations,
   symbol declarations and caller-supplied language rules during setup.
2. Parse and validate those expressions in core; discover dependencies and
   compile reusable evaluation plans in core-owned memory.
3. Report the numerical inputs and outputs required for a requested expression
   or operator argument, in stable slot order for that context.
4. Evaluate batches of real or complex numbers without serializing a JSON
   object or performing a name-based DLL callback for every sample.
5. Preserve the unevaluated argument of a registered host operator as an
   opaque expression handle that the host can evaluate in its own domain.
6. Allow a context to be reused while its expressions and compilation rules
   remain valid, and to be released deterministically.

The **completion target** is that FEM and its public SDK dependencies build
and run using the core DLL without access to `core-rust` implementation
source or a supplied `fullmeta_core.rlib` and its matching prebuilt Rust
dependency bundle. This is an end-to-end requirement, not just the completion
of the context API. FEM and its ordinary Cargo dependencies may still generate
temporary `.rlib` files during a normal build; those are not prebuilt core
libraries that must be sent to a colleague.

The context is a platform language mechanism. FEM supplies field values,
coordinates, material values, integration points and integration results;
none of those concepts needs a special meaning in core. Other applications
may provide different symbols and host operators.

Reaching the completion target requires unit-aware quantity evaluation, other
expression inspection paths and the model SDK dependency to migrate as well.
Model DLL and browser Wasm parity must be handled explicitly as described
below; replacing FEM's core `.rlib` does not automatically change those
components.

## What exists today

The current Windows native core interface in
[`core-native.h`](core-native.h) already provides:

- Compilation of an individual complex expression, from source text or a
  supplied JSON AST.
- A thread-local opaque handle, symbol slots, and typed row-major batches.
- An operator slot and a separate opaque handle for the argument of each
  registered single-argument host operator, including nested operators.
- An all-or-nothing output contract for an evaluation batch.

FEM uses those functions for global and integration expressions. It samples
points and sends integrand values in batches. However, it currently still:

- Parses expressions using the statically linked core and sends an AST to the
  DLL during setup.
- Discovers and orders some dependencies itself, and inspects ASTs in study
  preparation, scenario validation and mesh selection.
- Evaluates pointwise definitions using the statically linked core at each
  sampled point before evaluating the integrand.
- Compiles individual expression programs rather than one reusable context
  containing a related set of definitions.
- Uses core Rust quantity and dimension types in FEM and the model SDK. Real
  material and boundary quantity evaluation can occur inside numerical loops.
- Builds with a prebuilt core `.rlib`, matching Rust dependency libraries and
  a procedural-macro DLL; the existing build script checks their Rust compiler
  identity. These supplied build artifacts remain necessary today.

See the current FEM implementations in
[`integration.rs`](../../applications/fem/fem-rust/src/integration.rs),
[`core_language.rs`](../../applications/fem/fem-rust/src/core_language.rs), and
[`study_prepare.rs`](../../applications/fem/fem-rust/src/study_prepare.rs).
The new context is an extension of the existing interface, not a description of
functionality that the current `core_language_*` functions already provide.

## Ownership and application neutrality

| Core language service | Calling application |
| --- | --- |
| Parse expression text and apply the supplied language policy. | Obtain expression text and policy from its own model and schema. |
| Compile definitions, resolve language dependencies and report diagnostics. | Decide which named symbols and operators are meaningful for its task. |
| Assign slots and evaluate typed values and expression arguments. | Bind slots to application values and supply changing numerical data. |
| Represent a host-operator call and its unevaluated argument. | Implement the operator, including any domain-specific sampling or reduction. |
| Own compiled context and expression-handle storage. | Own meshes, fields, external data, output files and numerical algorithms. |

Core must not hard-code names such as `intop`, `x`, `E`, `frequency`, or a
FEM selection. An application may register a host operator called `intop1`
and supply values for `x` and `E`; another application may use unrelated
names and implement an operator differently. Syntax and generic expression
semantics belong to the platform. Application policy, capabilities and the
meaning of external inputs remain application-supplied data.

The context is not a model tree, schema database, solver or mesh cache. It may
store the supplied language declarations and compiled representations needed
to evaluate expressions. It must not retain pointers to caller-owned setup or
batch buffers after a call returns.

### Kernel coordination and local execution

The kernel is the logical coordinator of the document identity and the model
and schema snapshot used by a study. The application supplies the language
declarations derived from that snapshot to the in-process core DLL. The
compiled context and its handles live in the process and thread that create
them; they do not become pointers into the kernel server merely because the
kernel coordinates their identity.

The FEM solver currently runs as a separate process. Its performance-sensitive
batch evaluations should call the DLL loaded in that process, without a
kernel HTTP request for each point or batch. This is an execution design for
the first migration, not a prohibition on a future measured inter-process
language service. The context must be usable by an application without an
application-specific dependency in core.

### Migration inventory: every core dependency

Completion requires each of the following categories to stop requiring the
prebuilt core Rust library. A direct type replacement alone is insufficient
where the old type also exposes algorithms or language-specific behavior.

| Existing dependency | Required destination | Evaluation concern |
| --- | --- | --- |
| Complex values, real quantities, five-component dimensions and other public value records in FEM and the model SDK | A small shared public core SDK with ordinary data types and C-ABI conversion; update the model SDK to use it | Data types do not move numerical algorithms into the SDK. |
| Parsing, inspection, dependency discovery, operator aliases and validation | Core DLL language context or generic inspection queries, with host-supplied policies | Normally setup work; occasional structured requests are acceptable. |
| Global expressions, pointwise definitions and host-operator arguments | Compiled context with opaque child plans and typed batches | May be evaluated for many integration points; do not serialize each row. |
| Unit lookup, parameter resolution, compiled real expressions and quantities | Core DLL generic quantity and policy interfaces | Distinguish setup/constant evaluation from spatially varying hot paths. |
| Material properties and impedance or other boundary quantities | Unit-aware compiled plans and typed evaluation, with metadata identifying position dependencies | Preserve per-material/per-frequency reuse for position-independent values; batch varying values where practical. |
| Complex quantity evaluation currently routed through the model DLL | Keep through a compatible DLL interface or migrate behind the language context, preserving behavior | The model SDK must not import core implementation types; evaluate callback overhead and batching separately. |
| Geometry/mesh inspection, AST-based classification and scenario validation | Generic core inspection capabilities plus application-owned domain decisions | Preserve exact geometry and validation behavior; do not put FEM policy into core. |
| Existing public Rust crate imports in FEM, tests, generated build wiring and the model SDK | Public SDK bindings/data records or DLL operations | Source search and Cargo dependency graph must confirm no remaining FEM build dependency. |

For example, the existing mesh code classifies coordinate expressions as
affine by inspecting an AST; a generic language service may provide the
necessary structural query, while FEM retains the choice of what to do with
the result. The existing mesh-specific expression-to-geometry handling also
needs an explicit compatibility review; eliminating the `.rlib` must not
silently change supported expressions or move mesh policy into core.

## Proposed lifecycle

```text
Application startup / study preparation
    application → core: definitions, source text, operators, rules
    core → application: context handle or setup diagnostics

Metadata discovery, once per requested expression / argument
    application → core: context handle + requested output
    core → application: input slots, output slots, host-operator descriptors

Repeated evaluation
    application → core: handle + typed values for a batch of rows
    core → application: typed result values, or a structured failure

End of use / invalidation
    application → core: release handles
```

The application may cache copies of small, immutable metadata such as slot
names and operator identifiers. The compiled program, dependency graph and
private expression representation remain owned by core. Repeated evaluation
does not re-send source, schema or definition tables.

Context creation is transactional: on failure it returns diagnostics and no
usable handle. A successful context is immutable. Changing definitions or
compilation rules creates a replacement context; a failed replacement must not
invalidate the previously successful one.

## Setup input

The setup representation is a design choice, not a committed wire schema. A
UTF-8 JSON request is acceptable for this infrequent operation, provided the
hot numerical path is typed. Illustrative input:

```json
{
  "definitions": [
    {"name": "q", "expression": "2*x", "scope": "point"},
    {"name": "result", "expression": "offset + intop1(q*E)", "scope": "outer"}
  ],
  "hostOperators": [
    {"name": "intop1", "id": "operator-1", "argumentCount": 1}
  ],
  "inputs": ["x", "E", "offset"],
  "policy": {"exampleOnly": true}
}
```

`scope`, policy fields and the declaration format above are illustrative and
must be specified before implementation. They represent generic evaluation
contexts supplied by the host, not hard-coded FEM categories. A host may also
provide aliases for an operator's stable ID; core must normalize or resolve
them according to the supplied rules without requiring the host to rewrite an
AST. Alias collision behavior must be deterministic and tested.

Setup must address duplicate names, invalid identifiers, unknown symbols,
unsupported functions or arities, conflicting operator names, dependency
cycles, and malformed expressions. Diagnostics must retain useful source
labels and paths supplied at setup. When validation requires application
policy, the application supplies that policy; core does not infer it from an
application name.

Inputs are values that the caller will supply. A literal is part of expression
source; a parameter, frequency, coordinate or field is an input unless it was
explicitly declared invariant and bound as such. The initial design must not
silently treat a value as constant just because it happened to have the same
value in a previous case.

## Compiled definitions and dependencies

The context should compile a set of related definitions, not just one AST per
call. Core owns parsing, symbol and call discovery, validation, and the
evaluation ordering needed for a requested result. External inputs are distinct
from names defined inside the context. Dependencies nested inside a host
operator argument must be included when that argument is prepared.

The context must expose enough information for the host to identify required
external inputs and host operators without reading the AST. Slots may differ
between a root expression and an operator argument. The exact order is stable
for the lifetime of the corresponding handle and must be queried, not assumed
from alphabetical or source order. Metadata must distinguish:

- Required external inputs for this particular evaluation plan.
- Named outputs requested by the host.
- Host-operator result slots required to complete this plan.
- The operator identifier and opaque argument handle associated with each
  operator occurrence, including nested occurrences.

The implementation must preserve existing scope and resolution behavior.
In particular, the current pointwise evaluator can use a supplied symbol value
in preference to a same-named definition. A static dependency graph must not
silently reject or change cases whose cycle or value depends on such an
override. Before finalizing the input contract, characterize the existing
behavior and decide how to represent absent versus supplied values; if
per-row presence can vary, the typed interface needs a presence mechanism or
an equivalent explicit binding. A default numerical zero is not a substitute
for a missing value.

The plan should compute only outputs and dependencies required by the requested
operation when that preserves existing observable behavior. It must not skip
currently required validation, errors or outputs merely as an optimization.
The same definition may need different values in different sampling scopes;
caches of evaluated values must never leak between points, operator calls or
frequency cases.

## Host operators and opaque arguments

A host operator is a generic language boundary. The operator is declared at
setup, and core retains its argument as a compiled expression. Core does not
execute the host's domain operation or inspect domain data.

Using the illustrative setup above, assume all numbers are dimensionless:

```text
q      = 2*x
result = offset + intop1(q*E)
```

One possible execution is:

1. Core exposes the outer expression, its `offset` input, and an operator
   occurrence with ID `operator-1` and an opaque handle for `q*E`.
2. The host selects sample points and prepares the input slots for that
   argument. `q` is defined inside the context, so core can evaluate `q` from
   `x` while evaluating the argument; the host supplies `x` and `E`.
3. For `x = [0.25, 0.75]` and `E = [2, 4]`, core returns `[1, 6]`.
4. The host applies its own weights. With illustrative weights `[0.5, 0.5]`,
   it returns the operator value `3.5` to the outer expression's operator
   slot. With `offset = 3`, the outer result is `6.5`.

Those sample points and weights are entirely host-owned. The core service
neither generates a mesh nor performs the integration.

For nested host operators, querying an argument handle must reveal any nested
operator occurrences and their argument handles. The host evaluates them in
the appropriate host-defined context, supplies each resulting value to its
enclosing expression, and can repeat the process recursively. Nested
operations may have different sampling contexts; a result must not be reused
for another outer row unless the host has established that reuse is valid.
Errors must identify enough context for the host to report the relevant
operator, expression and sample.

For the first context design, prefer an explicit **pull-and-supply** protocol:
the host obtains descriptors and argument handles, performs the operation, and
supplies operator-result slots. This builds on the existing interface and does
not require a DLL callback for every point. A callback or resumable execution
protocol may be considered later if needed, with explicit reentrancy,
threading and failure rules; it is not assumed here.

## Typed batch evaluation

The existing complex representation is two 64-bit floating-point values,
`{re, im}`; a real value can be represented with zero imaginary part. A first
version may use this representation for both real and complex values to match
the current native boundary. A distinct real-only layout can be added later if
measurement justifies it and the ABI advertises it.

For a plan with `S` numerical input slots, `O` host-operator result slots,
`R` output slots and `N` rows, the baseline layout is:

```text
input values:    N × S complex numbers, row-major
operator values: N × O complex numbers, row-major
output values:   N × R complex numbers, row-major
```

For example, each input row is `[x, E]` only if the metadata for that plan
reports `x` then `E`. Constant expressions and plans without host operators
have zero-length corresponding arrays. A zero-row batch is valid and does no
work. Buffers may be null only where their length is zero.

The application owns and supplies the input and output buffers. The contract
must state lengths, element layout, alignment, no-overlap requirements,
checked size multiplication and the maximum accepted allocation/row counts.
Core must not keep pointers after the call. On failure, outputs remain
unchanged; the failure reports at least an error category and, where relevant,
the failing row and expression. Numerical treatment of non-finite values,
division, complex functions and tolerances must follow the selected existing
policy rather than introducing silent changes.

The implementation may use temporary buffers to maintain atomic output, but
should avoid per-row allocation, repeated UTF-8 parsing and repeated symbol
name lookup in core. Buffer reuse or caller-supplied workspace may be explored
after measuring. Batch size is a host-side tuning choice; FEM currently uses
chunks of up to 128 points for integration, which is a starting point, not a
requirement of the new interface.

## Units and evaluation policies

The existing typed complex batch API carries numerical real and imaginary
parts only. It does **not** transmit or check a physical dimension for each
slot. The proposed context must not describe that current API as unit-aware.

The context setup should accept an explicit policy or refer to a separately
versioned policy declaration. The policy defines permitted functions,
built-ins and numerical conventions. It should also identify whether a plan
is numerical-only or requires unit-aware evaluation.

For unit-aware plans, the design must specify how inputs and outputs carry
dimensions, how dimension checks and conversions are performed, and whether
dimensions are fixed for the entire plan or can depend on input values.
Dimension metadata may be registered once only where its invariance has been
established. A first implementation may leave unit-aware quantity evaluation
on its existing interface while supporting numerical-only batched contexts,
but **the overall DLL-only migration is not complete** until every unit-aware
FEM call has a compatible DLL route. No stage may silently discard dimensions
or change existing quantity semantics. Tests must cover temperature as well
as the other supported SI exponents and any accepted legacy dimension form.

The complete interface must support the semantics currently provided by
`QuantityValue`, `CompiledExpression`, `CompiledQuantity`, `get_unit` and
parameter resolution, including caller-supplied real evaluation policies.
The core SDK may define compatible plain data records, but conversion, unit
tables, expression evaluation and dimensional rules stay in the DLL. Existing
model complex-quantity behavior can remain in the model DLL if its public SDK
no longer requires the core Rust implementation types.

For repeated spatial quantities, setup compiles each expression and reports
its symbols, position dependence, expected unit and dimension requirements.
One possible typed layout registers known invariant dimension metadata once
and sends row-major `f64` values for each batch. If a supported expression can
produce dimensions dependent on input values, or if input dimensions vary,
the interface must provide the required per-row dimension information or use
an explicit compatible alternate path. It must not assume invariance to gain
speed. Output units, conversion scale, dimension checks, policy tolerances,
zero handling, finite-value checks and errors must match the current evaluator.

FEM should preserve existing reuse for properties independent of position:
evaluate them once per material tag and applicable frequency or parameter
case, not at every quadrature point. For spatially varying properties and
boundaries, compile once and provide typed point batches where the numerical
loop permits it. Cache only metadata and values proven invariant for the
appropriate scope. The application retains its domain checks, such as material
limits and valid boundary values.

## C ABI and metadata: proposed operations

The following are **logical operations**, not implemented function names or
final C signatures:

| Operation | Purpose |
| --- | --- |
| Query interface and capabilities | Obtain ABI version, supported context features, layouts and semantic version identifiers. |
| Create context | Supply definitions, operator declarations and policies; receive a context handle or diagnostics. |
| Query plan | Obtain a handle or descriptor for a named output and its input/output slots. |
| Query operator occurrence | Obtain its host ID, result slot and an owning opaque argument-plan handle. |
| Evaluate batch | Supply typed input and operator arrays; receive typed outputs. |
| Compile and evaluate quantities | Prepare unit-aware real expressions and quantities; inspect required symbols and evaluate scalar or typed batches with explicit dimension rules. |
| Inspect language data | Resolve units and parameter tables, validate and inspect expressions, and expose generic structural/dependency information required by callers. |
| Query last diagnostic | Copy error category, message and available source/row information. |
| Release plan and context | Release each owning handle according to the lifetime contract. |

The final ABI must use fixed-width scalar types where required, explicit
lengths and caller-owned buffers. It must not expose Rust data structures,
Rust closures or Rust-owned allocations for a caller to free. Metadata string
ownership and validity must be stated; callers should be able to copy names
once and avoid retaining unstable pointers. The setup format and numerical ABI
are independent: JSON at setup does not imply JSON in the evaluation loop.

Existing exports in [`core-native.h`](core-native.h), including individual
expression handles, remain supported during migration. Additive capabilities
and their versions must be discoverable, and unsupported required features must
produce an explicit error rather than quietly using different semantics.

### Public SDK rather than a core Rust implementation dependency

Introduce a small public Rust adapter under `platform/sdk-rust/core/`. This is
proposed, not an existing directory. It should load the Windows x64 DLL, check
the required ABI capabilities, expose safe context/plan owners and provide
plain public numeric/dimension records. It must not include private language
implementation source, embed a copy of the parser/evaluator or link to
`fullmeta-core` as a Rust crate.

Update FEM and `platform/sdk-rust/model/` to share those public records or an
equivalent SDK interface. The model SDK may continue to call the model DLL;
its public types must no longer force a dependency on `fullmeta-core`. Rust
types, `serde_json` values, allocations and compiler-specific ABIs must not
cross a DLL boundary: only documented C-compatible data and explicit buffer
ownership may do so. The SDK's ordinary source is public adapter code that a
colleague can compile; it is not the core language implementation.

## Lifetime, threads and reuse

The current native language handles are thread-local. The conservative first
design keeps that rule: create, use and release a context or plan on its
creating thread. A handle is opaque and must not be serialized to a file,
passed to another process, used after release or reused after the DLL is
unloaded. The proposed ownership rule is that a returned child-plan handle is
independently owned and must be released separately. It retains any context
state it needs, so releasing a parent or the caller's context handle does not
invalidate a live child. This follows the existing expression-argument handle
behavior; memory is reclaimed only after the last owning handle is released.

For parallel evaluation, a host can maintain one equivalent context per worker
thread. The model SDK already uses thread-local handles and cached setup
descriptions; that pattern may be adapted, but the core context's actual
threading behavior must be defined and tested independently. A future
thread-shareable immutable context is possible, but must not be assumed by
clients until the interface explicitly supports it.

During a solver sequence, a context may be cached for reuse across cases when
the expressions and relevant compilation inputs are unchanged. The current
solver sequence already has a cache for solver information; it does not yet
provide this language-context cache. A cache must be bounded and must release
all owning handles on eviction and shutdown. The first implementation may use
a simple context lifetime scoped to a study or sequence instead of a more
general cache.

The cache identity must include, as applicable:

- Expression and definition contents, scopes, names and requested outputs.
- Host-operator identifiers, aliases and declarations.
- Evaluation policy, supported-function and language semantic versions.
- Symbol binding layout, declared types and any dimensions or constants bound
  into the compiled plan.
- The loaded DLL instance and relevant interface/capability version.

Frequency values, field values, point coordinates and other changing inputs
are passed to each evaluation and do not require a recompile solely because
their numbers change. If a supposedly invariant bound value, its type or its
dimension changes, the appropriate context must be rebuilt or rebound. A
cache key must use actual semantic dependencies, not only a study name or
file path. A context prepared in one process cannot be reused by another.

## Versioning and distribution

The intended Windows x64 native distribution is `fullmeta_core.dll` and a
documented C boundary, together with the public core SDK. The ABI version
describes binary compatibility; a separately discoverable language/policy
version describes accepted syntax and behavior. Both matter for caching and
for diagnostics. Updating a DLL must preserve supported older interfaces or
fail clearly when an application requests an unavailable version.

Applications can load a newer compatible DLL without receiving the platform
Rust source. Replacing a DLL on disk does not change code already loaded in a
running process: the host must release its contexts and restart or otherwise
explicitly unload and reload the library under a safe lifecycle. Compilation
manifests that pin DLL hashes must also be updated when distributing a new
build.

The model DLL currently embeds portions of core, and browser model/core Wasm
has its own builds. This context does not automatically make those copies use
the new native DLL. A future language change needs either compatible releases
of those components or a separately designed shared-service arrangement.
Cross-component syntax, validation and numerical parity remain release
requirements. This proposal does not change the Wasm ABI.

### Target source-free FEM package

The intended platform layout for a colleague's FEM build is:

```text
platform/
  core-rust/lib/fullmeta_core.dll
  model-rust/lib/fullmeta_model.dll
  operation-contracts-rust/lib/fullmeta_operation_contracts.dll
  sdk-rust/core/                    # public core bindings and value types
  sdk-rust/model/                   # public model adapter
  sdk-rust/operation-contracts/     # public contracts adapter
```

The colleague also needs the FEM source/package, its Cargo manifests and lock
files, scenario and operation metadata, and the normal third-party Rust build
dependencies and tools. An offline build must have those ordinary packages
available in a Cargo cache or an explicitly supplied vendor directory. The
three DLLs can additionally be staged next to the executable as a runtime
fallback. This tree is the intended end state, not a list of files sufficient
for the current unmodified build.

The colleague must **not** need `platform/core-rust/src/`, a prebuilt
`libfullmeta_core.rlib`, the matching set of prebuilt core Rust dependency
`.rlib` files, or the matching prebuilt `serde_derive` DLL. The same is true
of the model and operation-contracts implementation sources, assuming their
existing DLL/SDK packaging is retained. Standard operating-system and any
actual runtime dependencies of the three binaries remain required and must be
verified for the supported Windows x64 environment.

Cargo may generate its own temporary `.rlib` files and procedural-macro DLLs
for the public SDK and normal third-party packages during compilation. The
requirement is that no prebuilt core Rust artifact bundle or private platform
implementation source must be distributed or linked into FEM. A C ABI does not
by itself impose the old core `.rlib`'s exact Rust compiler identity; the
final documented toolchain still has to satisfy FEM, Cargo, its solver
dependencies, the SDK and the supported target. Dynamic loading through the
SDK should not require a separately supplied GNU DLL import library; if the
implementation instead chooses link-time imports, document and package that
requirement explicitly.

Replace the current standalone build's manually injected core `--extern`
and matching prebuilt-serde graph with an ordinary, reproducible Cargo build
of FEM and the public SDKs. Retain appropriate lockfiles, platform DLL/ABI
checks and packaging integrity checks; do not require a hash of a particular
core DLL merely because of Rust crate identity. If the chosen release process
pins a DLL hash for integrity, updating it must be an explicit packaging step.

## Migration plan

1. **Specify and test compatibility.** Record current parsing, dependency,
   operator alias, pointwise override, numerical and diagnostic behavior.
   Include cases where dependencies occur inside operator arguments.
2. **Create the public core SDK.** Define shared value types and safe DLL
   bindings, and migrate the model SDK away from the `fullmeta-core` Rust
   crate. Keep the existing expression-handle API available.
3. **Add a core-owned context.** Support source-text setup, named definitions,
   generic host operators, metadata and deterministic release.
4. **Move preparation and discovery.** Have FEM request parsing, operator
   mapping and dependency metadata from the platform. Preserve current study
   request and validation behavior during transition; inspect AST-dependent
   mesh-selection and scenario validation separately rather than claiming they
   are already migrated.
5. **Add batched pointwise plans.** Compile a definition set once, gather
   numerical inputs in the host and evaluate pointwise dependencies and
   integrands in batches. Preserve sampling and host integration in FEM.
6. **Move all quantities and remaining core calls.** Add the unit-aware DLL
   interfaces needed by materials, boundaries, geometry, parameters and
   thermal/scenario code. Migrate the other direct static-core imports,
   including AST-related consumers, while retaining application-neutral
   language rules and application-owned numerical/domain behavior.
7. **Cache within the valid lifecycle.** Reuse contexts across frequency
   cases only after the cache key and thread/handle ownership are verified;
   retain the existing optimizations for position-independent values.
8. **Remove the supplied core Rust bundle.** Remove `fullmeta-core` from FEM
   and public SDK dependency graphs, remove the build's core `--extern` and
   compatible prebuilt dependency injection, and switch to the supported
   public-SDK Cargo build. Package and stage the three DLLs and SDKs.
9. **Prove the final package.** Build, run and measure FEM from an isolated
   copy without core/model/contracts implementation sources, core prebuilt
   `.rlib` files or the matching macro DLL. Only this successful final state
   completes the migration.

Each stage must retain a working build and be independently testable. An
intermediate stage may temporarily still use the current core `.rlib`, but it
must be labeled as incomplete; it is not the final distribution. The complete
solution must use the DLLs and public adapters without requiring the core,
model or operation-contracts implementation sources or the supplied core Rust
artifact bundle.

## Verification and performance

Correctness checks must cover:

- Parsing, unsupported input, metadata stability and alias collisions.
- Definition chains, unused definitions, duplicate names, missing values,
  overrides, and both unconditional and override-dependent cycles.
- Real and complex arithmetic; explicit numerical policies and non-finite
  handling; unit-aware behavior when that capability is implemented.
- Empty batches, zero-slot plans, size overflow, buffer ownership and output
  atomicity on a failing row.
- Multiple operator occurrences, nested operators and differing evaluation
  scopes, including an operator inside another operator's argument.
- Context and child-handle release, invalid handles, thread boundaries, cache
  invalidation, context replacement, process lifetime and DLL version errors.
- FEM numerical parity for 2D and 3D domain, boundary, edge and point
  evaluations, field sampling, pointwise definitions, frequency sequences,
  spatially varying material properties and boundary quantities, thermal
  quantities, geometry checks, and unit conversions.
- Existing individual-expression APIs and source-free build compatibility.
- Core/model/Wasm parity for every migrated language behavior where those
  consumers are intended to support the same feature.

### Required proof of the no-core-`.rlib` end state

A successful startup or an existing source-free build using the old prebuilt
bundle is not sufficient. The release candidate must pass all of the
following with the final build and public SDKs:

1. Create an isolated distribution copy containing the intended FEM package,
   the three platform DLLs and public SDKs. Exclude all core/model/contracts
   implementation source, all supplied platform `.rlib` artifacts and the
   supplied matching procedural-macro DLL.
2. Build from a clean target directory with ordinary third-party Cargo
   dependencies available, but no fallback path to the developer's platform
   source, build directory, prebuilt library bundle or stale compiled core
   artifacts. Record the actual commands, toolchain and candidate identity.
3. Inspect the FEM and public SDK Cargo dependency graph and build wiring:
   neither may compile or link the `fullmeta-core` Rust crate or inject a
   prebuilt core library. Temporary Rust libraries created for FEM, public
   SDKs or normal Cargo dependencies are allowed.
4. Start the executable and run numerical cases that exercise parsing,
   pointwise dependencies, opaque operator arguments and real unit-aware
   material/boundary evaluation through the DLL. Compare results and failures
   to the baseline. Do not count a `--help` or startup-only check as proof of
   numerical migration.
5. Verify that a missing or ABI-incompatible core DLL produces a clear error
   on the affected path rather than silently falling back to a statically
   linked private core implementation. Verify compatible DLL replacement and
   capability checks under the documented process-restart and version rules.

If any direct or transitive FEM build dependency on core implementation source
or a supplied core `.rlib` remains, the DLL-only migration is incomplete.

Performance work must measure setup separately from steady-state evaluation.
Use repeated, alternating baseline and candidate runs with identical inputs;
record numerical results, sample counts, definition counts, batch size,
frequency count, timing distribution and relevant memory use. Include both a
pointwise-heavy synthetic case and a representative end-to-end study. Test
unchanged and changed context inputs so caching cannot hide stale results.
Any accepted tolerance or regression threshold should be agreed for the
specific workload; no speedup is assumed by this design.

The benchmark set must also isolate material and boundary hot paths: include
both position-independent properties and spatially varying quantities, and
measure any batch-packing and unit-checking overhead. Preserve exact or
appropriately tolerated numerical outputs and diagnostics. Report the number of
DLL calls and batch sizes where practical; a faster setup phase alone does not
prove the numerical loop is unaffected. If a proposed change has a material
performance regression on an agreed representative workload, investigate and
optimize it or report the limitation before declaring the migration complete.

For context only, the earlier integration-only synthetic comparison was about
0.149 s before and 0.148 s with the existing DLL integration path for 210,000
points. It did not benchmark this proposed context or pointwise-variable
migration. The user's single 21-frequency run was 1:39 versus an earlier
1:44; that observation likewise does not measure the proposed implementation.

## Decisions to finalize before implementation

- The exact setup schema, policy versioning and public C signatures.
- How symbol presence and same-name overrides are represented without
  changing existing behavior, especially across batch rows.
- How scope, nested operators and host-supplied result slots are described in
  metadata and how failures identify their expression and sample.
- The staging and ABI details for unit-aware typed plans. An intermediate
  release may retain the existing quantity interface, but the final no-core-
  `.rlib` target requires a compatible DLL route for all such uses.
- The initial context cache size and whether a context is confined to a study,
  a solver sequence or a bounded per-thread cache.
- Which AST-dependent validation and mesh-classification operations become
  generic core queries, and which remain caller-owned decisions.
