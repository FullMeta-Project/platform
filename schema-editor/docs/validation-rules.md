# Authoring validation for an application

Use Schema Editor to declare validation for project models interpreted by an
application schema. Structural constraints such as types, required members,
bounds and enumerated values belong in JSON Schema. FullMeta validation programs
can express additional checks involving model data, references, collections,
expressions or quantities. Application runtime code may perform additional
checks at the point where it consumes the model.

## Author and run a rule

1. Open the application schema in Schema Editor and choose **Validation
   requirements…**. Select the program to edit or add another program for the
   appropriate validation boundary.
2. Add a requirement. Give it an identifier and name, select its stage and
   subject scope, and choose a constraint and its operands. Set the diagnostic
   path and message. Optional scope filters and applicability conditions restrict
   when it applies. Use the path picker to select the correct model-data path.
3. Preview the complete candidate, review its generated executable rules, then
   Apply. Save persists the application schema. Validate the schema document to
   check the declaration; this is separate from validating a project model.
4. Open a project that references that application schema. Validate a valid
   project, a project that violates the rule and the repaired project. Observe
   the diagnostic and its path. The application must invoke the relevant program
   for a particular action or runtime boundary; merely saving a declaration does
   not make every possible application operation call it.

For example, a requirement can select the model root, use `memberOf` for the
field `/gridSize`, compare it to the literal array `[64, 128, 256]`, and report
`Choose a supported grid size.` at `/gridSize`. A project with `gridSize: 64`
passes this rule; one with `gridSize: 96` fails it. Give the project schema
compatible structural constraints so the semantic rule is reached.

The current authoring UI stores `fullmeta-declarative-rules/1` records in the
program's `declarative` property and produces the executable `rules` array. The
runtime executes the saved `rules` array. Preview and Apply keep the source and
generated output consistent; if they do not match, review and explicitly
regenerate rather than silently overwriting them. Existing native-only rule
programs remain data that must be preserved; the current declarative replacement
flow is explicit. The exact source format, supported predicates, scopes, operand
types and compiler boundary are described in the [validation language reference](../../docs/declarative-validation-language.md).
The model runtime reference
describes the executable rule forms and data selectors consumed by the runtime.

The current requirement selector includes presence (`required`, `forbidden`,
`nonblank`), equality and ordering (`equals`, `notEquals`, `lessThan`,
`lessOrEqual`, `greaterThan`, `greaterOrEqual`, `minimum`, `maximum`, `range`),
membership and set relations (`memberOf`, `notMemberOf`, `memberOfDifference`,
`subset`, `setEqual`, `disjoint`), collection uniqueness (`unique`, `uniqueBy`,
`uniqueCanonicalMapBy`), collection counts (`minCount`, `maxCount`,
`countRange`, `countAtMost`, `productAtMost`), `keyMatchesField`, and
`semanticCheck`. The controls use readable labels for those stored type tokens.
Use the language reference and widget contract for each predicate's supported
operands, type rules and diagnostics; a choice in the selector does not install
an application runtime action.

The validation badge beside a schema field is a navigation and expression-editing
view of an assertion in a root program. Its editable text maps to the existing
expression representation; it is not a separate runtime language. See
[editing schema documents](schema-document-editing.md#editing-validation-expressions)
and the [expression editing record](validation-expression-language-plan.md).

The Schema Editor's own schema may display **V · rules 0** while still offering
validation authoring. That counter describes top-level executable rules in the
open schema document; it does not count the validation rules that authors may
create in other application schemas or the interpreter's validation-program
declarations.
