/** Document-wide authoring widgets declared by the interpreting schema. */
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validPath = path => Array.isArray(path) && path.every(part =>
  (typeof part === 'string' && part.length > 0) || Number.isInteger(part) && part >= 0);
const samePath = (left, right) => Array.isArray(left) && Array.isArray(right)
  && left.length === right.length && left.every((part, index) => part === right[index]);

export function declaredDocumentWidgets(presentation) {
  const entries = presentation?.documentWidgets;
  if (entries === undefined) return [];
  if (!Array.isArray(entries)) throw new Error('Document widgets must be an array.');
  const ids = new Set();
  const paths = new Set();
  return entries.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id
      || typeof entry.label !== 'string' || !entry.label
      || entry.context !== 'schemaAuthoring' || entry.placement !== 'rootSettings'
      || !['graphicsConsole', 'graphicsInterfaces', 'structured', 'source'].includes(entry.widget) || !validPath(entry.path)
      || ids.has(entry.id) || paths.has(JSON.stringify(entry.path))) {
      throw new Error(`Document widget ${index + 1} needs a unique ID, label, schemaAuthoring rootSettings placement, supported widget type, and data path.`);
    }
    ids.add(entry.id);
    paths.add(JSON.stringify(entry.path));
    const related = entry.related === undefined ? [] : entry.related;
    if (!Array.isArray(related) || related.some(resource => !isRecord(resource)
      || typeof resource.label !== 'string' || !resource.label || !validPath(resource.path))) {
      throw new Error(`Document widget ${entry.id} has an invalid related resource.`);
    }
    return { ...entry, related };
  });
}

export function documentWidgetAtPath(widgets, path) {
  return widgets.find(widget => samePath(widget.path, path)) || null;
}

export function documentValueAtPath(document, path) {
  return path.reduce((value, part) => value?.[part], document);
}

