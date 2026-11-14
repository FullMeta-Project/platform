/** Locate one editable shared widget inherited by a schema declaration. */
import { schemaWidgetDesignContext } from './schema-widget-context.js';
import { hasWidgetDesignEditor } from "../shared/design-editor.js";
import { schemaWidget } from "../shared/schema-widget.js";

/**
 * Return the source of a single inherited widget, or null when the declaration
 * has its own widget, has no inherited widget, or inherits several candidates.
 * The lookup follows only resolvable local and linked $refs/allOf branches; it
 * reads existing documents and never fetches or edits a source.
 */
export function inheritedSchemaWidget({ document, path = [], file, presentationFor } = {}) {
  const context = schemaWidgetDesignContext({ document, path, file });
  const source = context.parts[0];
  if (!source || schemaWidget(source.schema) || presentationFor?.(source.schema)) return null;

  const candidates = context.resolve(source).parts.slice(1).flatMap(part => {
    const presentation = presentationFor?.(part.schema);
    const widget = presentation?.widget || schemaWidget(part.schema);
    return widget && (presentation?.profile?.editor === 'annotation' || hasWidgetDesignEditor(widget))
      ? [{ part, widget }] : [];
  });
  if (candidates.length !== 1) return null;

  const { part, widget } = candidates[0];
  const label = typeof part.schema.title === 'string' && part.schema.title.trim()
    ? part.schema.title : String(part.path.at(-1) ?? widget);
  return { file: part.file, path: [...part.path], pointer: part.pointer, widget, label };
}
