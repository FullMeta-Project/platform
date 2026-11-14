/** Copy reusable definitions between sibling $defs owners in one schema document. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const at = (source, path) => path.reduce((node, key) => node?.[key], source);
const samePath = (left, right) => left.length === right.length
  && left.every((part, index) => part === right[index]);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
const schemaKeys = new Set(['$defs', '$ref', 'type', 'properties', 'patternProperties',
  'items', 'additionalProperties', 'oneOf', 'anyOf', 'allOf', 'if', 'then', 'else',
  'not', 'const', 'enum', 'required', 'title', 'description']);

/** Finds nested $defs owners, including schema namespaces with arbitrary names. */
export function siblingDefinitionOwners(schema) {
  const owners = [], seen = new Set();
  const visit = (node, path, depth = 0, definitionValue = false) => {
    if (!isObject(node) || depth > 32) return;
    if (isObject(node.$defs)) {
      const id = JSON.stringify(path);
      if (!seen.has(id)) {
        owners.push({ path, keys: Object.keys(node.$defs) }); seen.add(id);
      }
      for (const [name, child] of Object.entries(node.$defs))
        visit(child, [...path, '$defs', name], depth + 1, true);
    }
    for (const key of ['properties', 'patternProperties']) {
      if (!isObject(node[key])) continue;
      for (const [name, child] of Object.entries(node[key]))
        visit(child, [...path, key, name], depth + 1);
    }
    for (const key of ['items', 'additionalProperties'])
      if (isObject(node[key])) visit(node[key], [...path, key], depth + 1);
    for (const key of ['oneOf', 'anyOf', 'allOf'])
      if (Array.isArray(node[key])) node[key].forEach((child, index) =>
        visit(child, [...path, key, index], depth + 1));
    const namespaceEntries = Object.entries(node).filter(([key]) =>
      !['title', 'description', '$comment'].includes(key) && !key.startsWith('x-'));
    if (definitionValue && namespaceEntries.length && namespaceEntries.every(([key, value]) =>
      !schemaKeys.has(key) && isObject(value))) {
      for (const [name, child] of namespaceEntries)
        visit(child, [...path, name], depth + 1, true);
    }
  };
  visit(schema, []);
  return owners;
}

const siblingsOf = (owners, sourcePath) => owners.filter(owner =>
  owner.path.length === sourcePath.length && owner.path.length > 0
  && owner.path.slice(0, -1).every((part, index) => part === sourcePath[index])
  && !samePath(owner.path, sourcePath));

function withRemappedOwner(value, sourcePath, targetPath, { remapReferences, adaptConstants }) {
  const sourcePrefix = `${pointer(sourcePath)}/`, targetPrefix = `${pointer(targetPath)}/`;
  const sourceKey = String(sourcePath.at(-1)), targetKey = String(targetPath.at(-1));
  const visit = node => {
    if (Array.isArray(node)) return node.map(visit);
    if (!isObject(node)) return node;
    const result = {};
    for (const [key, value] of Object.entries(node)) {
      let next;
      if (key === '$ref' && remapReferences && typeof value === 'string'
        && value.startsWith(sourcePrefix)) next = `${targetPrefix}${value.slice(sourcePrefix.length)}`;
      else if (key === 'const' && adaptConstants && value === sourceKey)
        next = targetKey;
      else next = visit(value);
      Object.defineProperty(result, key, { value: next, enumerable: true,
        writable: true, configurable: true });
    }
    return result;
  };
  return visit(value);
}

const ownerAtOrAbove = (schema, path, generatedOwnerAtPath) => {
  if (typeof generatedOwnerAtPath !== 'function') return null;
  for (let length = path.length; length >= 0; length--) {
    const owner = generatedOwnerAtPath(schema, path.slice(0, length));
    if (owner) return owner;
  }
  return null;
};

/** Copy only absent definitions. Existing target definitions are left untouched. */
export function schemaWithSiblingDefinitionCopies(schema, { sourceOwnerPath, keys,
  targetOwnerPaths, remapReferences = true, adaptConstants = false }, generatedOwnerAtPath = null) {
  if (!isObject(schema) || !Array.isArray(sourceOwnerPath) || !Array.isArray(keys)
    || !Array.isArray(targetOwnerPaths) || !keys.length || !targetOwnerPaths.length)
    throw new Error('Choose source definitions and at least one sibling owner.');
  const sourceDefinitions = at(schema, sourceOwnerPath)?.$defs;
  if (!isObject(sourceDefinitions)) throw new Error('The selected source no longer owns definitions.');
  const allowedOwners = siblingDefinitionOwners(schema);
  if (!allowedOwners.some(owner => samePath(owner.path, sourceOwnerPath)))
    throw new Error('The selected source owner is no longer available.');
  const next = clone(schema), created = [], skipped = [];
  for (const targetPath of targetOwnerPaths) {
    if (!Array.isArray(targetPath) || !siblingsOf(allowedOwners, sourceOwnerPath)
      .some(owner => samePath(owner.path, targetPath)))
      throw new Error('A target is not a sibling definition owner. Reopen this dialog.');
    const targetDefinitions = at(next, targetPath)?.$defs;
    if (!isObject(targetDefinitions)) throw new Error(`${pointer(targetPath)} has no $defs map.`);
    for (const key of keys) {
      if (typeof key !== 'string' || !Object.hasOwn(sourceDefinitions, key))
        throw new Error(`Source definition ${key} is no longer available.`);
      const targetDefinitionPath = [...targetPath, '$defs', key];
      if (Object.hasOwn(targetDefinitions, key)) {
        skipped.push(targetDefinitionPath); continue;
      }
      if (ownerAtOrAbove(schema, targetDefinitionPath, generatedOwnerAtPath))
        throw new Error(`${pointer(targetDefinitionPath)} is generated by another guided input.`);
      Object.defineProperty(targetDefinitions, key, {
        value: withRemappedOwner(sourceDefinitions[key], sourceOwnerPath,
          targetPath, { remapReferences, adaptConstants }),
        enumerable: true, writable: true, configurable: true,
      });
      created.push(targetDefinitionPath);
    }
  }
  if (!created.length) throw new Error('Every selected definition already exists in the selected sibling owners.');
  return { schema: next, created, skipped };
}


export { createSiblingDefinitionCopyDialog } from './schema-extra-candidate-dialogs.js';
