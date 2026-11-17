# Using shared UI widgets in an application

Shared widgets are registered in the widget catalog.
The Schema Editor uses some of them while editing schemas. Application authors
can also select supported catalog widgets for fields, trees, graphics and other
surfaces in their own interpreting schemas. The shared UI reference
identifies the widget families and links their individual settings and data
contracts.

For example, `valueControl` can present primitive text, a number or an enum;
`quantity` presents an expression and unit; `referenceSelector` presents values
provided by the host; and `repeatableChoiceTable` manages an ordered collection
of selected choices. Their settings and model value shapes differ, so consult
the linked widget-specific contract before configuring the field.

For a project field, select the declaration and configure its
`x-fullmeta-ui-behavior` field envelope through the appropriate widget settings
control. The JSON Schema declaration still owns the stored value shape and
structural constraints. Widget settings describe presentation and interaction;
an application supplies any required options, provider data and domain-specific
meaning. The [annotation language](ui-annotation-language.md) describes the
field envelope and the separate schema-authoring profile.

Preview and Apply the schema edit, Save and reopen the schema, then open a
representative project interpreted by it. Check the visible control, labels,
available choices and selected value. Edit a value, Save and reopen the project
to confirm the intended JSON path and value changed. Also check empty and invalid
values, missing references and optional fields when the application can contain
them. Graphics and component widgets use their documented normalized input and
host interfaces rather than a field annotation when their catalog contract
specifies those interfaces.

For a reusable graphics widget, declare its shared renderer and model-data
binding in the interpreting schema's Graphics console, then open a disposable
project that supplies representative normalized data through the normal loader.
Canvas renderers use the graphics surface; a declared `table` layer is rendered
as semantic, accessible table content alongside it. Check the first view
immediately after load, each relevant selection change, empty or invalid data,
and recovery with new data. The project must not depend on a tree click to make
its initial graphics appear. Save and reopen the project to verify that the
declared model data remains intact. A visual component with
no project data of its own still needs a representative host replay; direct
component checks are useful for diagnosis but do not establish that the project
host supplies and refreshes its inputs correctly.

The View menu's Stacked and Columns choices also change the Settings/Graphics
separator direction. Stacked uses a horizontal handle and up/down resizing;
Columns uses a vertical handle and left/right resizing. The tree separator stays
vertical in both layouts.

Adding a widget declaration does not implement an application-specific provider
or adapter. If a shared widget does not cover the required interaction, an
application can provide its own widget using the documented package and provider
interfaces.

Repeatable choice tables manage ordered selections and can maintain configured
sibling mirrors. The current implementation has known limitations for primitive
rows and choice identities of different JSON types. Check those combinations in
a representative project before relying on them.

Quantity presence and companion-property changes are owned by the Model Editor
host. Activating an optional field retains existing companions and initializes
missing companions where defaults are available. A quantity expression and its
unit are edited separately. A saved unit that is not offered by the current
provider remains selected and is labeled unavailable until explicitly replaced.
For a provider-sourced quantity vector, component descriptors are matched to
saved entries by position. Keep descriptor order stable: changing it changes
which label is shown for each existing value. A failed or empty descriptor
provider is reported while the saved entries remain visible.

A keyed choice matrix stores assignments by source key and represents the
omitted choice by an absent map entry. Its Add action searches for an unused
combination up to a configurable limit; reaching the limit does not prove that
no combination exists.

Reference options and dynamic property descriptors come from the host or an
application provider. The reference selector identifies an unavailable saved
value and reports malformed or failed providers without replacing that value.
It returns to normal selection when valid options are available again.

Tree selection and expansion change the view; model edits use host commands.
An item whose `enabled` value is `false` cannot be selected unless the
descriptor that creates that item sets `selectDisabledItems` to `true`. For an
`objectProperties` descriptor, set it there rather than only on its enclosing
`objectRoot`. The disabled item remains visible with a reason for its state.
Set `selectDisabledItems` when users need to open a disabled record and change
its enabled value. Check the declared selection policy in the host where the
widget is used.

Changing a scan from explicit values to a range can discard intermediate
values. Before changing a scan with intermediate values, the editor asks for
confirmation. Cancel leaves the scan unchanged. Confirm uses the first and last
quantities as range endpoints and does not restore discarded values if you
switch back to explicit mode. Review the converted values before applying and
saving them.

Graphics views depend on the current data supplied by the application. When data
is empty or invalid, check that the host shows an appropriate state instead of a
previous plot.

An ordinary `id` field is editable unless its schema makes it read-only. A
repeatable-choice table's `generatedIdProperty` identifies a generated row ID;
the editor protects that field from ordinary edits. Declare other generated
identities as read-only in their schema. The primitive value control edits
simple numeric or string arrays as comma-separated text. Arrays whose values
cannot be represented safely that way, including mixed types and strings with
commas, empty strings or surrounding whitespace, are shown without an editing
control so their saved values remain intact.
