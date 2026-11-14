/** Guided, application-neutral factoring of an inline JSON Schema declaration. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const startsWithPath = (path, prefix) => path.length >= prefix.length
  && prefix.every((part, index) => part === path[index]);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
const at = (value, path) => {
  let node = value;
  for (const part of path) {
    if ((!isObject(node) && !Array.isArray(node)) || !Object.hasOwn(node, part)) return undefined;
    node = node[part];
  }
  return node;
};



export function parseSchemaPointer(text) {
  if (typeof text !== 'string' || !text.startsWith('#/'))
    throw new Error('Enter a local schema pointer starting with #/.');
  const path = text.slice(2).split('/').map(part => {
    if (/~(?![01])/.test(part)) throw new Error('The schema pointer has an invalid escape.');
    return part.replace(/~1/g, '/').replace(/~0/g, '~');
  });
  if (!path.length || path.some(part => !part || ['__proto__', 'constructor', 'prototype'].includes(part)))
    throw new Error('Choose a named schema declaration below the root.');
  return path;
}

/** Only schema relation paths are accepted; annotation objects cannot be factored. */
function declarationAt(schema, path) {
  let node = schema;
  for (let index = 0; index < path.length;) {
    const relation = path[index++];
    if (!isObject(node)) throw new Error('The selected path is not a schema declaration.');
    if (['properties', 'patternProperties', 'dependentSchemas', '$defs'].includes(relation)) {
      const name = path[index++];
      if (name === undefined || !isObject(node[relation]) || !Object.hasOwn(node[relation], name))
        throw new Error('The selected schema declaration no longer exists.');
      node = node[relation][name];
    } else if (['items', 'additionalProperties', 'not', 'if', 'then', 'else',
      'contains', 'propertyNames', 'unevaluatedProperties', 'unevaluatedItems'].includes(relation)) {
      if (!Object.hasOwn(node, relation)) throw new Error('The selected schema declaration no longer exists.');
      node = node[relation];
    } else if (['allOf', 'anyOf', 'oneOf', 'prefixItems'].includes(relation)) {
      const position = path[index++];
      if (!/^\d+$/.test(position || '') || !Array.isArray(node[relation])
        || Number(position) >= node[relation].length)
        throw new Error('The selected schema branch no longer exists.');
      path[index - 1] = Number(position);
      node = node[relation][Number(position)];
    } else {
      throw new Error('The selected path is not a schema declaration.');
    }
  }
  if (node !== true && node !== false && !isObject(node))
    throw new Error('The selected path is not a schema declaration.');
  return node;
}

const normalized = value => {
  if (Array.isArray(value)) return value.map(normalized);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalized(value[key])]));
};
const sameSchema = (left, right) => JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
const factoredPath = (path, source, destination) => startsWithPath(path, source)
  ? [...destination, ...path.slice(source.length)] : [...path];

function inspectAnchors(node) {
  if (Array.isArray(node)) return node.some(inspectAnchors);
  if (!isObject(node)) return false;
  if (['$id', '$dynamicAnchor', '$recursiveAnchor', '$dynamicRef', '$recursiveRef']
    .some(key => Object.hasOwn(node, key))) return true;
  return Object.values(node).some(inspectAnchors);
}

function remapPointerStrings(node, from, to) {
  if (typeof node === 'string') return node === from || node.startsWith(`${from}/`)
    ? `${to}${node.slice(from.length)}` : node;
  if (Array.isArray(node)) return node.map(value => remapPointerStrings(value, from, to));
  if (!isObject(node)) return node;
  for (const [key, value] of Object.entries(node)) {
    // Ownership paths are JSON arrays with their own structural remapping below.
    if (key === 'x-fullmeta-ui-generated') continue;
    node[key] = remapPointerStrings(value, from, to);
  }
  return node;
}

function hasPointerInto(node, target) {
  if (typeof node === 'string') return node === target || node.startsWith(`${target}/`);
  if (Array.isArray(node)) return node.some(value => hasPointerInto(value, target));
  if (!isObject(node)) return false;
  return Object.values(node).some(value => hasPointerInto(value, target));
}

/** Move or explicitly replace one declaration and reconcile its generated provenance. */
export function schemaWithFactoredDefinition(schema, { sourcePointer, mode = 'extract', definitionKey },
  generatedOwnerAtPath = null) {
  if (!isObject(schema)) throw new Error('Open a schema document first.');
  const sourcePath = parseSchemaPointer(sourcePointer);
  const source = declarationAt(schema, sourcePath);
  if (isObject(source) && typeof source.$ref === 'string')
    throw new Error('This declaration already refers to another schema.');
  if (inspectAnchors(source))
    throw new Error('This declaration contains an ID or dynamic anchor/reference; keep it inline until those scopes are reviewed.');
  if (typeof definitionKey !== 'string' || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(definitionKey)
    || ['__proto__', 'constructor', 'prototype'].includes(definitionKey))
    throw new Error('Enter a reusable definition key using letters, numbers, underscores, or hyphens.');
  if (!['extract', 'link', 'replace'].includes(mode)) throw new Error('Choose Extract, Link, or Replace.');
  if (schema.$defs !== undefined && !isObject(schema.$defs))
    throw new Error('The root $defs declaration must be an object.');
  const destinationPath = ['$defs', definitionKey], destinationPointer = pointer(destinationPath);
  if (startsWithPath(destinationPath, sourcePath) || startsWithPath(sourcePath, destinationPath))
    throw new Error('The reusable definition cannot contain its own source.');
  const existing = Object.hasOwn(schema.$defs || {}, definitionKey);
  if (mode === 'extract' && existing) throw new Error(`Definition ${definitionKey} already exists. Choose another key or Link.`);
  if (mode !== 'extract' && !existing) throw new Error(`Definition ${definitionKey} does not exist. Choose Extract.`);
  if (mode === 'link' && !sameSchema(source, schema.$defs[definitionKey]))
    throw new Error('Link requires an equivalent existing definition. Extract this declaration into a new key instead.');
  if (mode !== 'extract' && hasPointerInto(schema.$defs[definitionKey], pointer(sourcePath)))
    throw new Error('The existing definition refers back to this source; linking it would create a reference cycle.');
  if (mode === 'extract' && hasPointerInto(source, destinationPointer))
    throw new Error('The inline declaration already refers to the proposed new definition key. Choose another key.');
  const registry = schema['x-fullmeta-ui-generated'];
  const ownership = Array.isArray(registry?.fields) ? registry.fields : [];
  if (registry !== undefined && (!isObject(registry)
    || registry.schema !== 'fullmeta-ui-generated/1' || !Array.isArray(registry.fields)))
    throw new Error('Generated-field ownership is malformed. Repair it before factoring.');
  const ownedAncestor = ownership.find(entry => Array.isArray(entry?.path)
    && startsWithPath(sourcePath, entry.path));
  if (ownedAncestor || generatedOwnerAtPath?.(schema, sourcePath))
    throw new Error('This declaration is generated by another guided input; edit its owning input first.');
  const descendantOwned = ownership.filter(entry => Array.isArray(entry?.path)
    && startsWithPath(entry.path, sourcePath));
  const dependentOwners = ownership.filter(entry => Array.isArray(entry?.owner?.path)
    && startsWithPath(entry.owner.path, sourcePath));
  if (mode === 'link' && (descendantOwned.length || dependentOwners.length))
    throw new Error('This declaration owns generated data. Extract it to a new definition so ownership can move with it.');

  const next = clone(schema);
  if (mode === 'extract') (next.$defs ||= {})[definitionKey] = clone(source);
  const parent = at(next, sourcePath.slice(0, -1));
  parent[sourcePath.at(-1)] = { $ref: destinationPointer };
  remapPointerStrings(next, pointer(sourcePath), destinationPointer);
  let retiredOwnership = 0;
  if (mode === 'replace' && next['x-fullmeta-ui-generated']) {
    const fields = next['x-fullmeta-ui-generated'].fields;
    next['x-fullmeta-ui-generated'].fields = fields.filter(entry => {
      const affected = startsWithPath(entry.path, sourcePath)
        || startsWithPath(entry.owner.path, sourcePath);
      if (affected) retiredOwnership += 1;
      return !affected;
    });
  }
  if (mode === 'extract') {
    for (const entry of next['x-fullmeta-ui-generated']?.fields || []) {
      entry.path = factoredPath(entry.path, sourcePath, destinationPath);
      entry.owner.path = factoredPath(entry.owner.path, sourcePath, destinationPath);
    }
    const seen = new Set();
    for (const entry of next['x-fullmeta-ui-generated']?.fields || []) {
      const id = JSON.stringify(entry.path);
      if (seen.has(id) || at(next, entry.path) === undefined)
        throw new Error('Factoring would leave a duplicate or missing generated-field owner.');
      seen.add(id);
      if (entry.owner.path.length && at(next, entry.owner.path) === undefined)
        throw new Error('Factoring would leave a generated field without its owning declaration.');
    }
  }
  return { document: next, sourcePath, destinationPath, mode,
    movedGenerated: mode === 'extract' ? descendantOwned.length : 0,
    movedOwners: mode === 'extract' ? dependentOwners.length : 0,
    retiredOwnership };
}

/** The dialog shows generated code before applying a structural refactor. */

export { createDefinitionRefactorDialog } from './schema-extra-candidate-dialogs.js';
