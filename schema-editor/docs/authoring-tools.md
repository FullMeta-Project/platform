# Schema authoring tools

Open an application schema in Schema Editor and use its root Settings to open
the authoring tools. A tool's target is a schema declaration, not a project
value. Stage changes, choose **Preview**, review the proposed candidate, and
choose **Apply** to update the open schema draft. **Save** writes the draft;
**Validate** checks the current schema separately. If the target or draft has
changed since Preview, preview again before applying.

## Fields, structure and annotations

| Tool | Use |
| --- | --- |
| **Bulk schema authoring…** | Stage Structure and Constraints rows in one batch. Add parents before their children. Import JSON or TSV, then preview the combined result. The nested-structure and field-constraint tools are also available from this workflow. |
| **Other UI annotations…** | Edit supported field visibility, choices, defaults, descriptions and reference facts while preserving widget settings. TSV rows use field key, fact and value. Hidden accepts true or false; defaults use JSON; reference paths use dotted keys. Compound filters stay intact when editing other reference settings. |
| **Bulk widget settings…** | Choose field widgets from the catalog and edit their settings. Imported TSV rows use field JSON Pointer, widget ID, set/remove, setting JSON Pointer and JSON value. |
| **Bulk collection actions…** | Configure declared collection move behavior and insertion effects. Expanded rows can add, duplicate, remove or import effects. |
| **Bulk field references…** | Configure reference scope, target path/property, label, filters, uniqueness and deletion behavior. Complex existing filters are preserved unless explicitly edited. |
| **Object rules…** | Select an object and enable the field-condition or object-map sections you intend to change. |
| **Generated field overlays…** | Edit supported surrounding annotations or constraints on generated fields; generated core keywords remain protected. |

Field UI declarations, widget profiles and their scope are explained in the
[annotation language](ui-annotation-language.md). Widget-specific settings and
data shapes are linked from [Using shared UI widgets](shared-widgets.md).

## Validation and reusable declarations

**Validation requirements…** authors application validation programs. Follow
[Validation rules for an application](validation-rules.md) to save a rule and
then verify its effect on a project model.

| Tool | Use |
| --- | --- |
| **Root contracts…** | Select an existing root extension or create an `x-` key. Edit nested values or load typed path/type/value rows for the selected extension. |
| **Root schema constraints…** | Independently enable changes to ordered root composition or a When / Then / Otherwise condition. |
| **Conditional definitions…** | Mark supported conditional reusable definitions for update; unmarked and unsupported definitions remain unchanged. |
| **Local definitions…** | Load or create definitions under an available `$defs` owner using typed path rows. |
| **Reusable definition worksheet…** | Enter typed facts or load a supported existing definition. Each named definition is reconstructed from its rows: removing a loaded row removes that fact; other definitions remain unchanged. |
| **Patch reusable definitions…** | Set or remove typed relative paths in selected reusable definitions. |
| **Factor schema reference…** | Extract an eligible inline declaration, link an identical existing definition, or explicitly replace it. Review references and ownership in Preview. |
| **Copy reusable definitions…** | Copy selected missing definitions to sibling owners, optionally remapping relative references. Existing target definitions are preserved. |

## Tree, runtime and editor integration

**Tree annotations…** edits supported tree labels, links, visibility and icons.
**Runtime API routes…** binds declared actions to known native operation
contracts or explicitly entered route metadata; the application must still
provide the registered runtime. **Schema branch audit…** is a read-only inventory
of the current document, with a Refresh control. Its counts distinguish logical field paths, declaring branches, UI behavior
facts, stored UI annotation keys and top-level validation rules. They describe
structure and do not establish application completeness.

**Editor widget…** chooses the document editor component from loaded catalogs
and edits its options. **Use platform default** removes the explicit editor
selection when applied. A different editor starts with its own options; an
unchanged saved selection retains its existing options. Project integration is a
separate set of controls for storage, runtime resources, catalogs, graphics and
application registration.

Closing a candidate dialog without Apply leaves the document draft unchanged.
Invalid input is retained for correction while the dialog is open. Batch tools
identify their target; load or clear edited import text before Preview, and
review any discard warning before changing targets.


**Factor schema reference** offers extract, link and replace. Extract creates a
new root definition; link requires an equivalent existing definition; replace
points the selected declaration at an existing definition even if its behavior
differs. Preview the candidate before applying replace. **Copy reusable
definitions** copies only missing definitions to sibling owners. Its optional
reference remapping and constant adaptation apply throughout each copied
definition. With remapping enabled, references beginning with the source owner path are changed to the target owner path. Constant adaptation changes matching source-owner constants to the target owner name.

Collection insertion effects are declarations in the application schema. The
current native executor supports appendUnique, including scoped targets and
optional reference or relationship gates. Saving an effect does not establish
that an application route invokes it. Verify the configured route using a representative project.

The root condition editor generates property/constant checks without adding
JSON Schema required clauses. If a condition should apply only when a property
is present, add the appropriate presence constraint separately and test both
present and absent project values.

The conditional-definitions tool has a single Require When switch for an entire
property path. An existing condition that requires only some segments cannot be
represented exactly by that switch; inspect Preview before applying its update.

The reference filter editor supports one condition or a oneOf list. A oneOf
filter accepts a target that matches exactly one listed condition; a target
matching multiple conditions is excluded. An unsupported complex filter is
preserved until explicitly replaced.
