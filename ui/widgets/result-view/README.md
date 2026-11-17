# Result view composition

`widget.js` interprets a result scene from the shared graphics-console contract. It composes existing renderers; it does not parse results, fetch artifacts, or decide which tree item is a result.

`resolveResultView({ scene, widgets, dimension, selectedTabId })` reads the scene's `kind` and registered widgets. A `layered` scene yields its surface renderer and rendered child layers. A `tabs` scene yields its declared tabs and the active renderer. Existing FEM field and global-plot scenes work without new annotations. The renderer's `kind` and data schema describe the expected normalized input; an application adapter supplies that data.

`showResultViewSurface({ view, spatialHost, tabsHost, spatialNote, tabsNote })` switches the host surface based on the resolved scene composition. The host retains its canvas, pointer controls, data loading, and error handling. Plot/table-specific tab controls remain in `../plot-table/widget.js`.
