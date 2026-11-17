# Validation program designer widget

`widget.js` provides a schema-document editor for top-level `x-fullmeta-rules` and `x-fullmeta-*Validation` declarations. The host supplies the loaded schema documents, tree and settings elements, and callbacks for selection and applying a changed declaration. The host owns persistence and the Save action.

## Public authoring interfaces

| Export from `widget.js` | Purpose |
| --- | --- |
| `createValidationProgramDesigner` | Tree and structured statement editor |
| `createValidationProgramTableDialog` | Declarative requirement authoring |
| `createValidationRuleRecipeTable` | Compatibility API for existing native recipe integrations |
| `createValidationExpressionDialog` | Expression editing with source pointers and variable scope |

The two batch factories receive `getDocument`, `buildCandidate`,
`validateCandidate`, and `applyCandidate`, then return an object with `open()`.
The program table calls `buildCandidate(source, drafts)`; the recipe table calls
`buildCandidate(source, programKey, edits)`. Each returns a candidate document.
The widget previews that candidate and guards against the document changing
before Apply. The editor's transaction wrappers own generated-field permissions,
document validation and persistence.

The shared catalog advertises these authoring exports under `validationProgram`.
The program editor schema selects its batch launchers through
`x-fullmeta-ui-schemaAuthoring.presentation.tools`, using the host command ID,
catalog widget ID and public entry name. These are application-neutral tools.

The tree lists programs and nested statements. The flow panel shows ordered statements, nested loops and true/false branches, plus each statement's data reads and variables it makes available. The settings panel edits the selected program or statement as structured fields, including expression operators, selectors, paths, and nested arrays or objects. Users can add, remove, reorder, and edit rules without editing the complete schema JSON.

Declarative obligations can include recursive descendants in the main or a nested subject scope. Set `childrenPath` to a nonempty JSON Pointer relative to each visited subject, such as `/features/*`. The compiler generates the existing tree traversal and keeps each descendant's diagnostic path. Omit `childrenPath` for a nonrecursive scope. Existing declarative records and native programs are unchanged when this option is absent.

The `uniqueBy` predicate compares a selected field across collection items. Its `itemPath` is a JSON Pointer relative to each item; an empty pointer compares complete items. A separate required-value obligation can report missing fields individually.

The `semanticCheck` obligation selects a shared quantity, expression, unique-ID, or validation-program check and binds named inputs to subject, source, literal or named-result operands. The validation-program check takes a `value` and a `declaration`, and reports nested diagnostics relative to the selected subject. An unconditional check can expose a named result. Root results are available throughout the program; item results are available to the same subject and its nested children and are isolated per item. The compiler determines dependency order and rejects cycles, missing names and incompatible scopes. A dependent check is skipped when its producer fails. The checker supplies detailed diagnostics.

The `productAtMost` constraint compares the product of counts in a collection
against an operand. Each item supplies either a nonnegative integer at
`countPath` or, when that field is absent, an array at `collectionPath` whose
length is its count. Both paths are relative to each item. An empty collection
has product one; a zero count makes the product zero. Invalid counts fail the
requirement, and multiplication does not overflow. The operand supplies the
limit, including from a schema declaration.
The `countAtMost` constraint compares one array's length with an operand in the
same way, without hard-coding the limit in the rule.
The `disjoint` constraint requires two arrays to share no values. A nested
subject can use an `ancestor` operand to read a path from a selected parent
subject: `ancestor: 1` selects the immediate parent. This keeps a requirement
scoped to its own parent rather than all similar records in the document.

The `keyMatchesField` obligation compares each applicable object member's key to a field of its value. An optional entry condition filters members, and diagnostics retain the selected key. Its collection operand is a non-wildcard field relative to the selected subject.

Apply changes the in-memory schema document; the host's Save action persists it. The widget reports basic rule-shape issues. It does not execute the validation program or replace the application's runtime validator. JSON Schema structure constraints remain separate and can be explored in Schema mode.

## Declarative authoring and compatibility

Use **Validation requirements…** to enter independent declarations and their
named dependencies. Preview checks the candidate; Apply changes the document
draft, and Save persists it. Validation executes separately.

The native JSON/TSV bulk controls, dedicated native editor and native recipe
launcher are retired from the Schema Editor. Existing native programs are
preserved and visible in Schema source; switching to declarative replacement remains
explicit and does not infer equivalence. The generated executable rules for a
declarative program are read only. Existing public native parsing and recipe
exports remain available to integrations that still depend on them.

Snapshots containing unfinished text in the retired bulk or native controls are
rejected with a recovery message rather than silently discarded. `validationProgramDiagnostics`
returns static diagnostics, and `assertValidationProgramSemantics` blocks
definite errors. These checks do not replace execution through the application
validator.

## Validation expression dialog

Schema view also uses the validation-program discovery API to place violet validation badges beside fields read by an assertion. The underlying program remains at its top-level `x-fullmeta-rules` or `x-fullmeta-*Validation` declaration. Each discovered assertion carries its source file and JSON Pointer to the rule object.

The dialog's Rule logic section opens by default. Assertion expressions are editable as text. `expression-language.js` handles scalars, arrays, variables, sources, literal JSON, dynamic paths, ordinary operations, named-argument projection operations, and selectors. For example, `not(contains(values($address · "/membership"), "boundary"))` maps to the existing nested `op`/`args` JSON. `->` is an accepted keyboard alias for the middle dot. The parser does not use JavaScript evaluation. `expression-input.js` highlights the text and suggests operation names and available variables.

The card also exposes enclosing `if` and `when` conditions, selectors, and diagnostic-path expressions. Each control carries its own source pointer and variable scope. The editor rejects unknown operators, non-boolean conditions or assertions, unavailable variables, and invalid syntax. A changed assertion read target requires a diagnostic-path or collection-selector edit in the same apply, unless the rule has only a root diagnostic location and the designer explicitly keeps it. Badge locations refresh after applying.

For a whole-program audit, `losslessValidationExpression` wraps the remaining three complex expression/value slots as `ast(JSON)`. The audit script in `scripts/roundtrip-validation-programs.mjs` enables that internal syntax, checks exact JSON equivalence, and repeats until the schema text reaches a fixed point. The dialog parser does not accept `ast(JSON)` edits; those slots remain under the structured editor's controls.

Applying changes replaces only the selected source fields in the open schema document after checking the rule and its context against the dialog's original snapshot. The host checks pending drafts, validates the candidate, and refreshes the in-memory document; its normal Save action persists the change. Project model JSON and the Rust rule interpreter use the same JSON program format as before.
