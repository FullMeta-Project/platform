# Declarative validation obligations, version 1

`fullmeta-declarative-rules/1` is the authored validation format supported by the
shared Schema Editor. It is independent of React, JSX, application-specific
code, and the persisted project model format. Its compiler emits the existing
FullMeta validation-rule AST for the existing Rust/WASM evaluator.

## Source of truth and compatibility

A validation program stores the authored source in `declarative` and derived
executable output in `rules`:

```json
{
  "maximumErrors": 80,
  "declarative": {
    "format": "fullmeta-declarative-rules/1",
    "obligations": [
      {
        "id": "study_physics",
        "name": "Study Physics link",
        "stage": "model",
        "scope": {"source": "root", "path": "/model/study/*", "nested": []},
        "constraint": {
          "type": "equals",
          "subject": {"field": "/physicsId"},
          "other": {"source": "root", "path": "/model/physics/id"}
        },
        "diagnostic": {
          "path": "/physicsId",
          "message": "Study must select the model Physics."
        }
      }
    ]
  },
  "rules": []
}
```

The empty `rules` above is illustrative, not a valid compiled instance: use
Preview to inspect the complete generated AST and Apply to store both matching
parts. Authored records are the only editable source in declarative mode.
Generated rules are read only. Exact object key ordering is irrelevant to
consistency; values, optional-member presence and array order are significant.

On open, Preview, Apply and Save, the platform checks that `rules` matches the
authored records. A stale or manually changed derived array blocks the candidate
and is never silently overwritten. Review the source and generated representation
and explicitly choose **Regenerate derived rules** to resolve a mismatch. An
unsupported future format is rejected rather than migrated by this action.

A native program with only `rules` remains unchanged and can be inspected in
Schema source. Native JSON/TSV bulk input, the dedicated native editor and the
Schema Editor's native recipe launcher have been retired. Starting a declarative replacement of a nonempty native program is an
explicit choice; no automatic conversion, inferred equivalence, or mixing of two
editable sources occurs. Keep specialized procedural AST rules in a separate
legacy program if they cannot be represented by the reusable vocabulary.

The declarative form supports recursive scopes, named check results and numeric
comparisons, but does not yet cover every native check or cross-scope
relationship. Existing native programs are not silently converted; retain their
source when making a deliberate replacement. Generated `rules` remain
the evaluator's runtime format regardless of how authors enter requirements.

To establish broader language coverage, demonstrate that independent obligations can express
and execute the existing semantic checks and any dependencies between them,
including resolved parameter symbols, quantity dimensions and bounds, and the
relationship between a keyed object member and its key. Verify representative
existing programs retain their behavior and metadata through migration, and
that unsupported programs cannot be silently converted or made uneditable.
Tests of collection traversal, conditional applicability and field comparisons
alone do not establish this broader parity.

| Remaining authoring need | Required declarative behavior to establish broader coverage |
| --- | --- |
| Resolved expressions | Declare symbol collections, allowed functions and scope/arity requirements; use the existing evaluator and retain actionable diagnostics without requiring authors to order statements. |
| Unit-aware quantities | Select a quantity, its expected unit, bounds and symbol environment; retain native dimension, finite-value and deferred-sample checks. |
| Keyed object members | Compare an item's declared identity with its containing object key and identify the failing member. |
| Dependent checks | Named results work at the model root, within an item, and from a parent item to nested children; diagnose cycles and missing inputs. Other cross-scope relationships remain to be evaluated. |
| Existing programs | Preserve unknown metadata and runtime behavior, and provide a checked migration for programs that cannot yet be represented. |

Program metadata and unknown obligation/source metadata survive edits. The
compiler reads recognized fields and does not normalize unrelated declarations.
Preview and Apply operate on a private candidate; Save and Validate remain
separate actions. Application schemas and saved model JSON are not rewritten as
a side effect of opening the editor.

## Obligation identity, scope and execution stage

Each obligation has a stable `id`, a readable `name`, nonblank `stage`, `scope`,
one primary `constraint`, and a diagnostic. IDs begin with a letter and contain
letters, digits, underscores or hyphens. IDs are unique within one program.
Each row states one independent requirement; row ordering is not a dataflow or
variable-binding mechanism. Reordering can affect diagnostic presentation and
which errors fit a program's `maximumErrors`, but does not change predicates.

One target program is one externally selected validation execution boundary.
All its obligations must have the same stage; use separate programs for model,
mesh input, solver input, results or other boundaries. A stage name records the
intended boundary. It does not install a runtime command or add an implicit
`context.stage` filter. A runtime caller still chooses and invokes the declared
program through its existing contract. A blank application does not gain an
operation merely by storing a stage name.

The scope selects every subject item:

- `source`: `root`/`model` for the input model, `schema` for the logical schema,
  or `context` for explicitly supplied runtime context.
- `path`: JSON Pointer relative to that source. The empty string selects its
  root once. `*` selects every array item or map value.
- `nested`: optional ordered scope path records, each relative to the previously
  selected item. These describe data relationships, not executable statements.
  Version 1 supports at most 16 nested levels.
- `when`: an optional declarative condition on the item selected at that scope
  level. Only matching items receive this obligation and its nested scopes. A
  recursive scope still visits descendants of a nonmatching item, so a matching
  descendant is not lost. Scope filters may use named results from an ancestor
  scope or the program root; a same-scope result is not available until after
  the filter has selected its subject.
- `childrenPath`: optional nonempty JSON Pointer relative to each selected item.
  It applies the same obligation to that item and every descendant reached by
  the pointer, including recursively nested descendants. A main or nested scope
  may declare it; for example, `/features/*` visits child feature arrays.
  Diagnostics retain each descendant's original document path.

For example, `scope: {source:"root",path:"/solverProfiles/*",nested:[{path:
"/backends/*"}]}` applies a predicate to every backend in every solver profile.
Adding `when: {type:"equals",subject:{field:"/enabled"},other:{literal:true}}`
to the parent scope limits the nested requirement to enabled profiles.
The author does not write nested loops or binding names. Missing collections
select no subjects, so an independent required/count obligation is needed when
the collection itself must exist or contain entries.

JSON Pointer escapes use `~0` for `~` and `~1` for `/`. No dotted-key paths,
JavaScript expressions, dynamic variable interpolation or URI-fragment prefix
belongs in these data pointers. The shared picker exposes the separate schema
pointer and annotation dotted-path representations where they are valid.

## Operands and reusable predicates

An operand has exactly one of these forms:

| Operand | Meaning |
| --- | --- |
| `{"field":"/id"}` | Read relative to the final selected subject. Empty field path reads the subject itself. |
| `{"source":"root","path":"/externalPrograms"}` | Read from an explicit model/schema/context source. |
| `{"literal":42}` | Literal finite JSON value. Objects that look like ASTs remain literal data. |
| `{"object":{"value":{"field":"/value"}}}` | Assemble an object from named member operands. Each member can itself be any operand. |
| `{"array":[{"field":"/value"},{"literal":0}]}` | Assemble an ordered array from item operands. |
| `{"norm":{"field":"/axis"}}` | Euclidean norm of a numeric vector; malformed vector values produce null. |
| `{"canonicalMap":{"value":{"field":"/membership"},"omitValue":{"literal":"outside"}}}` | Compare a map without entries equal to the declared default value. The source map is unchanged. |
| `{"select":{"kind":"items","from":{"field":"/rows"},"where":{"type":"required","subject":{"field":"/id"}},"value":{"field":"/id"}}}` | Select collection members by a declarative condition and project each matching value. |

Collection selections use `items` for arrays, or `keys`, `values`, or `entries`
for objects. Within their filter and value declarations, field operands read the
selected member. Parent operands can refer to the enclosing subject or selection.
`single: true` returns the sole projected value, or null when no or several
members match. Array selections preserve member order. Object selections do not
promise a particular key order. Invalid source collection types produce false.

`childrenPath` includes descendants before filtering, in preorder, without
changing source data. Traversal is limited to 128 levels and 1,000,000 values.
`flatten: true` combines the projected arrays by one level before `single` is
applied; null contributes no items and each scalar contributes itself.
The expression semantic check accepts `dependencyRows` containing `symbol` and
`expression` members. Its `symbols` result then includes transitive dependencies,
while `directSymbols` records the original expression's symbols. Duplicate
dependency symbols, reachable cycles and paths deeper than 128 levels fail.

The quantity check accepts `kind: "vector"` with 1–64 quantity components in
`value` and an optional same-length `reference`. It applies the ordinary quantity
policy to every component, then exposes SI `components`, Euclidean `norm` and
absolute-component `maximum` under `value`. With a reference it also exposes
`difference`, and for three components `cross`, with the same summaries. Arithmetic
must remain finite. Difference units match the inputs; cross-product units are
the product of the input units. An ordinary quantity check with `optional: true`
returns a deferred null value for absence, while supplied values are validated.
The expression check's `runtimeSymbols` request accepts a five-entry
`dimensionMask`: numeric entries replace parameter dimension components and
null entries preserve them. New runtime descriptors retain their declared units.

Structured operands support at most 16 nested levels and 64 members/items per
container. Object member names are nonreserved identifiers. Nested references
to named check results participate in dependency ordering and cycle detection;
literal JSON remains data. Composition never changes the source model.

A named-result operand normally requires its producer to succeed. Set
`allowErrors: true` on a binding operand to inspect a failed or skipped result
explicitly, including null or its `errors` array. The dependency still runs
before the consumer and retains scope and cycle checks. If any use of the same
binding in that obligation requires success, the ordinary success guard remains.
This supports independent checks that must still run after another check fails.

The `collection` semantic check accepts `value` rows and `kind` equal to
`unique` (the default), `subset`, or `disjoint`. `projections` is an array of
JSON Pointers, defaulting to `[""]`; identical projected values within one row
count once. Uniqueness errors report the value and both zero-based row indexes.
`omitMapValue` removes matching map entries for comparison only. The relation
checks accept a `reference` array and optional `referenceProjection` pointer;
subset errors identify missing values, and disjoint errors identify the
conflicting value and reference row. Inputs are preserved. Object key order is
irrelevant, array order is significant, and numeric equality follows the rule
engine's numeric comparison.

Paths containing wildcards produce arrays. Other paths produce the selected
value or `null` if missing. A path to an array without a wildcard reads the array
itself. A literal cannot contain functions, undefined, nonfinite numbers,
cyclic objects or non-JSON objects.

| Constraint `type` | Additional fields | Requirement |
| --- | --- | --- |
| `required` | — | Subject is neither missing nor null; false, zero and empty text are present. |
| `forbidden` | — | Subject is missing or null. |
| `nonblank` | — | Subject is text containing at least one non-whitespace character. |
| `equals`, `notEquals` | `other` operand | Native JSON value equality or inequality. |
| `unique` | — | Selected array values contain no duplicate native JSON values. |
| `uniqueBy` | `itemPath` JSON Pointer | Values selected from each array item at that path contain no duplicates; an empty path compares each complete item. |
| `uniqueCanonicalMapBy` | `itemPath` JSON Pointer, text `omitValue` | Compare the selected object maps after ignoring entries equal to the supplied text value. Key order does not affect equality. Reject duplicate maps or non-map items, and preserve the original records. |
| `semanticCheck` | `check`, `subjectInput`, `inputs` | Run a reusable `quantity` or `expression` checker with explicitly named input operands. |
| `keyMatchesField` | `itemPath`, optional `entryWhen` | Require each applicable object key to equal a field of its value. |
| `memberOf` | `other` operand | Subject belongs to the selected array or names a key in a selected registry object. |
| `memberOfDifference` | `other` and `excluded` operands | Subject belongs to the first collection or registry and not to the excluded one. |
| `subset`, `setEqual` | `other` operand | Native set membership between two arrays; duplicate multiplicity is irrelevant. |
| `minimum`, `maximum`, `range` | `minimum`, `maximum`, or both | Numeric subject satisfies inclusive finite bounds. |
| `minCount`, `maxCount`, `countRange` | `minimum`, `maximum`, or both | Collection/text length satisfies inclusive nonnegative integer bounds. |

Every constraint requires a `subject` operand. Range minima cannot exceed
maxima. Count bounds must be safe integers. Arrays and objects count entries;
strings use native Unicode scalar-value length; null has count zero. As in the
native evaluator, null represents an empty collection for unique/subset/set
equality. Use a separate required obligation when null should fail. Type guards
compile with predicates so wrong value types produce the authored diagnostic
instead of an avoidable low-level evaluator exception.

This initial vocabulary covers representative Study/Physics linkage,
registry/backend references, and independent notebook title/tag requirements.
Extend it with reusable semantics when multiple authors would otherwise repeat
traversal or expression plumbing; do not add application-specific predicate code
or make free-form expression text the main authoring method.

The editor compares obligations with the same stage, scope and predicate. Its
Boolean identity check recognizes order, grouping, negation, distributivity and
other identities for up to ten distinct predicate atoms per condition. It also
recognizes membership in a set difference as membership in the first collection
and non-membership in the excluded collection. Equality and set equality are
compared symmetrically, and literal collections used as sets are normalized for
order and repeated elements. Atoms are otherwise treated as
opaque: for example, a type-guarded `notMemberOf` is not assumed to be the
logical negation of `memberOf`. The comparison does not interpret arbitrary
expression text. A result is **equivalent**
only when the supported identities prove it; otherwise it is **cannot determine**.
Paths and literal arrays outside set predicates retain their order. Diagnostic
locations and messages may differ, and the editor never automatically merges or
deletes declarations. Click the Subject scope column header to sort displayed
rows ascending, descending, or back into declaration order without rearranging
the saved declarations.

A `semanticCheck` binds its `subject` operand under `subjectInput` and each
`inputs` entry's `operand` under its `name`. Inputs may select a subject field,
another source, or literal JSON. Names must be distinct and cannot be `path`;
the checker receives the obligation's diagnostic path automatically. The
obligation message identifies the check, and the existing evaluator supplies
the specific error detail. Semantic checks are obligations rather than
applicability conditions.

The `uniqueIds` semantic check accepts a `value` input and reports duplicate
IDs within that value. An unconditional root-scoped semantic check can be
marked as the program's single `gate`: if it fails, later checks are stopped.
The prerequisite cannot itself depend on a named result; its execution order
is determined from the declaration, regardless of the row in which it appears.

An unconditional semantic check may set `expose` to a unique name. Other
operands can select its result with `{"binding":"name","path":"/field"}`.
Root-scoped results are available throughout the program; results for a
collection item are available to obligations with the same subject scope or
an explicitly nested child scope, and are isolated per item. The compiler resolves dependencies independently of
row order and rejects missing names, duplicates, incompatible scopes and
cycles. If a producer fails, checks depending on its result are skipped;
unrelated requirements still run. The numerical comparison predicates can
compare two resolved values, for example lower and upper bounds.
The Model runtime contract
describes checker input semantics. The separate compiled numerical evaluation
policy remains a different interface.

For `keyMatchesField`, the subject is a non-wildcard field relative to the
selected subject and must resolve to an object or null. `itemPath` selects the
value to compare within each object member. Optional `entryWhen` is a regular
applicability condition evaluated against the member value. The diagnostic path
is relative to the member; the generated rule retains its original object key.
Use a separate required obligation if an absent collection must fail.

## Declarative applicability and diagnostics

Optional `when` uses a constraint record or a recursive `all`, `any`, or `not`
condition. For example:

```json
{
  "when": {
    "all": [
      {"type":"equals","subject":{"field":"/enabled"},"other":{"literal":true}},
      {"type":"nonblank","subject":{"source":"context","path":"/activeProfile"}}
    ]
  }
}
```

`all` and `any` take nonempty condition arrays; `not` takes one condition.
Condition nesting is limited to 16 levels. The primary constraint remains one
predicate, so separate obligations express separate requirements.

`diagnostic.path` is a relative JSON Pointer from the selected subject and cannot
contain wildcards. Empty or omitted path identifies the subject itself. The
nonblank `diagnostic.message` is shown at that location. Nested collection paths
retain actual indexes/map keys, for example
`$.solverProfiles[0].backends[1].programId`. Diagnostic paths identify data; record
diagnostics separately identify the authored source at
`#/program/declarative/obligations/row/...` with its row and obligation ID.

## Compiler and execution boundary

`compileDeclarativeValidation` is pure and deterministic. Independent
obligations compile to isolated native roots. Where declarations name shared
results, the compiler determines an execution order; declarations sharing an
item result execute inside the same traversal with private per-item bindings.
Nested selectors use native `basePath` and private diagnostic paths. Ordinary
AST operators and type guards express the predicates; the Rust evaluator is
unchanged. Reordering may change diagnostic order and which errors appear when
the configured error limit is reached.

Compiler output is not execution evidence. `validateModelRules` in
`platform/model-rust/js/api.js` invokes the actual WASM `validate_rules` request.
Tests execute both valid and invalid examples through that operation, including
all predicates, nested registration, independent scopes, conditional applicability,
and comparison with equivalent handwritten native AST. Structural schema checks,
static authoring diagnostics, compiler consistency and native execution are
distinct checks and should be reported separately.

Public functions are exported by `validation-program/widget.js`; their pure
implementation lives in `validation-program/declarative-rules.js`:

- `createDeclarativeObligation`, `declarativeConstraintTypes`,
  `declarativeRuleSources`, `declarativeValidationFormat`.
- `compileDeclarativeValidation`, `declarativeValidationDiagnostics`,
  `declarativeProgramState`.
- `programWithDeclarativeObligations` for explicit conversion/regeneration and
  metadata-preserving authored edits.
- `declarativeDocumentDiagnostics`, `assertDeclarativeDocument` for candidate and
  Save guards across recognized validation programs.

## Acceptance and measured authoring comparison

Acceptance requires a self-hosting copy to add/edit obligations, Preview, Apply,
Save, reopen and validate; unrelated declarations and legacy programs remain
unchanged. Generated-output mismatch and malformed later rows must leave the
source and candidate untouched. No disposable schema belongs in the production
schemas folder.

Compare legacy and declarative authoring in the same visible editor on equivalent
simple required-value, nested registration, and relationship/cardinality cases.
Record active editing time separately from wait time, input/edit counts, retries,
errors and native evaluator equivalence. Compiler throughput, JSX rendering time
or a shorter generated representation alone does not establish faster authoring.
Report measured results and their conditions; do not claim a speed-up without
that evidence. This evaluation is independent of the JSX/watch-replay debugging
timing comparison.
