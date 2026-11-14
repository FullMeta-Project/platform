/** Shared, read-only path discovery for schema authoring controls. */
import { jsonPointerFromPath, jsonPointerPath } from '../../../js/services.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const escape = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');

export function schemaAuthoringPathRepresentations(path = []) {
  const parts = path.map(String);
  const referenceRepresentable = parts.length > 0 && parts.every(part => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(part));
  return { dataPointer: parts.length ? `/${parts.map(escape).join('/')}` : '',
    referencePath: referenceRepresentable ? parts.join('.') : null, referenceRepresentable };
}

/** Include source declarations and model paths reached through local references.
 * Recursive references terminate at their first repeated ancestor. No $ref is fetched.
 */
export function schemaAuthoringPathEntries(schema) {
  const entries = [], seen = new Set();
  const visit = (node, schemaPath, dataPath, ancestors = new Set(), depth = 0) => {
    if (!object(node) || depth > 48 || entries.length >= 6000 || ancestors.has(node)) return;
    const schemaPointer = jsonPointerFromPath(schemaPath);
    const representations = dataPath === null ? { dataPointer: null, referencePath: null, referenceRepresentable: false }
      : schemaAuthoringPathRepresentations(dataPath);
    const key = `${schemaPointer}\n${representations.dataPointer ?? '(unbound)'}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ schemaPath: [...schemaPath], schemaPointer, ...representations,
      title: node.title || String(schemaPath.at(-1) ?? 'Schema root'),
      type: typeof node.type === 'string' ? node.type : '' });
    const next = new Set(ancestors); next.add(node);
    if (typeof node.$ref === 'string' && node.$ref.startsWith('#')) {
      const targetPath = jsonPointerPath(node.$ref);
      if (targetPath) visit(targetPath.reduce((value, part) => value?.[part], schema), targetPath, dataPath, next, depth + 1);
    }
    for (const map of ['properties', '$defs', 'patternProperties', 'dependentSchemas']) {
      if (!object(node[map])) continue;
      for (const [name, child] of Object.entries(node[map])) visit(child, [...schemaPath, map, name],
        map === 'properties' && dataPath !== null ? [...dataPath, name] : null, next, depth + 1);
    }
    for (const name of ['items', 'additionalProperties', 'contains', 'propertyNames', 'if', 'then', 'else', 'not']) {
      const childData = ['items', 'additionalProperties'].includes(name) && dataPath !== null ? [...dataPath, '*']
        : ['if', 'then', 'else', 'not'].includes(name) ? dataPath : null;
      visit(node[name], [...schemaPath, name], childData, next, depth + 1);
    }
    for (const name of ['oneOf', 'anyOf', 'allOf', 'prefixItems']) {
      if (!Array.isArray(node[name])) continue;
      node[name].forEach((child, index) => visit(child, [...schemaPath, name, index],
        name === 'prefixItems' && dataPath !== null ? [...dataPath, String(index)] : dataPath, next, depth + 1));
    }
  };
  visit(schema, [], []);
  return entries;
}

