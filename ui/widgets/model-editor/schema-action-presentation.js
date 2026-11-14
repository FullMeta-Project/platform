/** Source-anchored, application-neutral labels and editor actions in JSON Schema. */

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const humanize = value => String(value ?? '').replace(/([a-z\d])([A-Z])/g, '$1 $2')
  .replace(/[_.-]+/g, ' ').replace(/^./, first => first.toUpperCase());

function localPointerPath(reference) {
  if (typeof reference !== 'string' || (reference !== '#' && !reference.startsWith('#/'))) return null;
  if (reference === '#') return [];
  try {
    return reference.slice(2).split('/').map(encoded => {
      const token = decodeURIComponent(encoded);
      if (/~(?![01])/.test(token)) throw new Error('Invalid JSON Pointer escape');
      return token.replace(/~1/g, '/').replace(/~0/g, '~');
    });
  } catch {
    return null;
  }
}

function valueAt(document, path) {
  let value = document;
  for (const key of path) {
    if ((!isRecord(value) && !Array.isArray(value)) || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

/**
 * Find the nearest action declaration reached from a schema node through
 * local $ref and array-item declarations. The path always addresses the
 * original document, so an editor can keep the focused fields source-anchored.
 */
export function schemaActionSourceForDeclaration({ document, path = [], value } = {}) {
  if (!isRecord(document) || !Array.isArray(path)) return null;
  const seen = new Set();

  function visit(currentPath, currentValue) {
    const identity = JSON.stringify(currentPath);
    if (seen.has(identity) || !isRecord(currentValue)) return null;
    seen.add(identity);

    if (Array.isArray(currentValue['x-fullmeta-editorActions'])) {
      return { path: [...currentPath], actions: currentValue['x-fullmeta-editorActions'] };
    }

    const referencePath = localPointerPath(currentValue.$ref);
    if (referencePath) {
      const found = visit(referencePath, valueAt(document, referencePath));
      if (found) return found;
    }

    if (isRecord(currentValue.items)) {
      const itemPath = [...currentPath, 'items'];
      const found = visit(itemPath, currentValue.items);
      if (found) return found;
    }

    return null;
  }

  return visit(path, value === undefined ? valueAt(document, path) : value);
}

/** A declaration's title is its readable type name; its symbol is the fallback. */
export function effectiveSchemaTreeLabel(declaration, fallback = 'Declaration') {
  const value = isRecord(declaration) ? declaration : {};
  return value.title || humanize(fallback);
}
