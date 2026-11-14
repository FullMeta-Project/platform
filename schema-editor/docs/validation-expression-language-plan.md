# FullMeta validation expression editing

Status: historical implementation record from 2026-10-28. The counts and FEM
observations below describe that check, not a current acceptance result. For the
current authoring workflow see [schema document editing](schema-document-editing.md)
and the [declarative validation language](../../docs/declarative-validation-language.md).

## Source of truth

FullMeta validation programs remain JSON declarations at the schema root (`x-fullmeta-rules` and `x-fullmeta-*Validation`). `model-rust` evaluates those declarations. The expression editor is a reversible text view over their JSON expression nodes; it does not introduce a second validator or change project model JSON. The violet badges identify fields read by assertions. The rules themselves are still stored in the root programs.

## Text language

The parser and printer are in `ui/widgets/validation-program/expression-language.js`. They support JSON scalars and arrays, `$variable`, `model`, `schema`, and `context` references, JSON Pointer suffixes (`·` or the keyboard alias `->`), dynamic path suffixes, ordinary function calls, and the named-argument operations `map`, `filter`, `lookup`, `matches`, and `canonicalMap`. `array(...)`, `object(key: expression, ...)`, `select(from: "root", path: ...)`, and `literal(JSON)` preserve the corresponding JSON constructors. The parser never evaluates JavaScript.

Examples:

```text
not(contains(values($address · "/membership"), "boundary"))
unique(map(as: "entry", items: $sweptParameters, value: $entry · "/parameter"))
select(from: "root", path: "/model/selections/*")
```

The printer only offers an editable textbox when parsing the printed text reconstructs the same JSON value. All 80 FEM assertion expressions and all conditions, selectors, and diagnostic-path expressions associated with their displayed badges pass that check. The whole-program audit visits 432 expression/value slots; 429 use concise text and three unrelated complex slots retain the internal `ast(JSON)` audit wrapper. That wrapper is not accepted by the dialog. The structured program editor remains available for those slots and for full rule editing.

## Editing and diagnostics

Each badge card shows the rule's message and an expanded **Rule logic** section. Its **Assertion** textbox has syntax highlighting and completions for available variables and operation names. A collapsible section exposes the enclosing `if` and `when` conditions, collection and child selectors, and the effective diagnostic path expression when the program defines one. The long scope/read summary is omitted from the main card. Every control carries the exact JSON Pointer and the variables available at that source location.

**Apply rule changes** parses changed controls and commits them as one transaction to the open schema document. The source updater checks the rule and its surrounding context against the values captured when the dialog opened. It refuses stale pointers, stale rules, unavailable variables, malformed syntax, unknown operations, non-boolean conditions or assertions, invalid schema documents, and a pending settings or raw-JSON draft. Failure leaves the open document unchanged and reports an error in the dialog.

If an assertion changes which field it reads, the designer must edit the diagnostic path or collection selector in the same apply. Rules with only the root diagnostic location offer an explicit confirmation to keep it. The editor then rebuilds the badge locations from the updated program. A moved badge may disappear from the currently open field dialog; the card explains where to find it. **Save** persists the open schema through the editor's normal file action.

## Ownership and checks

- `ui/widgets/validation-program/runtime.js` discovers assertions and their source-aware context controls, resolves read paths, and locates badges.
- `ui/widgets/validation-program/expression-dialog.js` handles the card and its atomic apply action.
- `ui/widgets/validation-program/expression-input.js` provides the highlighted text layer and completion choices.
- `ui/widgets/validation-program/expression-source.js` checks source snapshots and replaces exact JSON fields on a clone.
- The Model Editor implementation under `platform/ui/widgets/model-editor/`, mounted through `widget.js` and `runtime.js`, enforces pending-draft and file ownership checks, validates the candidate schema, refreshes the view, and keeps the existing Save path.

`node --test tests/validation-expression-upgrade.test.js` checks assertion and context round trips, syntax and scope rejection, pending-draft blocking, atomic updates, and stale-source protection. `node scripts/roundtrip-validation-programs.mjs` audits all seven FEM programs, reaches a text fixed point, and compares the native validation results of seven saved projects plus two invalid variants each before and after the canonical round trip. The canonical schema was saved and a subsequent audit reported `schemaTextChanged: false`. Browser review confirmed unknown-operation feedback, paired assertion/condition apply, read-target coordination, syntax highlighting, and completion insertion. Temporary UI edits were discarded.
