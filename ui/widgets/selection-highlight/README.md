# Selection highlight

`widget.js` resolves a selected tree item to one or more scene targets using
the graphics console's declared focus mode. The mode binds a source and can
follow references through bound collections. The widget returns `{target,
values}` without assuming a particular application domain.

For renderers using normalized scene primitives, `selectionHighlightPrimitives`
creates a styled overlay from primitives tagged with `id` or `ownerId`, or
from an adapter-supplied `identityOf(primitive, index)` mapping. A geometry,
network, or diagram adapter can use the same overlay; adapters may
also render the resolved targets in their own form. The focus-mode contract is
[`fullmeta-ui-selection-highlight-1.schema.json`](fullmeta-ui-selection-highlight-1.schema.json).

`scene-view-data-1.schema.json` permits optional `id` and `ownerId` metadata
on scene primitives. These tags are inert for ordinary rendering and provide
the target match for this overlay.
