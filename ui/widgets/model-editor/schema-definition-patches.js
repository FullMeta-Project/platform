/** Application-neutral, typed changes to existing reusable definitions. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isContainer = value => isObject(value) || Array.isArray(value);
const clone = value => structuredClone(value);
const encode = part => String(part).replace(/~/g, '~0').replace(/\//g, '~1');
const pointer = path => `#/${path.map(encode).join('/')}`;
const startsWith = (path, prefix) => path.length >= prefix.length
  && prefix.every((part, index) => path[index] === part);
const at = (root, path) => path.reduce((node, part) =>
  isContainer(node) && Object.hasOwn(node, part) ? node[part] : undefined, root);




const valueTypes = [
  ['string', 'Text'], ['escaped-string', 'Escaped text'], ['reference', 'Reference'],
  ['number', 'Number'], ['boolean', 'True / false'], ['null', 'Null'],
  ['object', 'Object'], ['array', 'Array'],
];
const dangerous = new Set(['__proto__', 'constructor', 'prototype']);
const schemaKeywords = new Set([
  '$anchor', '$comment', '$defs', '$dynamicAnchor', '$dynamicRef', '$id', '$ref', '$schema', '$vocabulary',
  'additionalProperties', 'allOf', 'anyOf', 'const', 'contains', 'contentEncoding', 'contentMediaType',
  'default', 'dependentRequired', 'dependentSchemas', 'deprecated', 'description', 'else', 'enum', 'examples',
  'exclusiveMaximum', 'exclusiveMinimum', 'format', 'if', 'items', 'maximum', 'maxItems', 'maxLength',
  'maxProperties', 'minimum', 'minItems', 'minLength', 'minProperties', 'multipleOf', 'not', 'oneOf',
  'pattern', 'patternProperties', 'prefixItems', 'properties', 'propertyNames', 'readOnly', 'required',
  'then', 'title', 'type', 'unevaluatedItems', 'unevaluatedProperties', 'uniqueItems', 'writeOnly',
]);
const looksLikeSchema = node => isObject(node)
  && Object.keys(node).some(key => schemaKeywords.has(key));

function pointerParts(text, allowEmpty = false) {
  const value = String(text ?? '').trim();
  if (allowEmpty && !value) return [];
  const body = value.startsWith('#/') ? value.slice(2)
    : value.startsWith('/') ? value.slice(1) : value;
  if (!body) throw new Error('Enter a slash-separated path.');
  const parts = body.split('/');
  if (parts.some(part => !part || /~(?![01])/.test(part)))
    throw new Error(`${value}: use / between keys and ~0 or ~1 for literal ~ or /.`);
  return parts.map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function ownerPath(document, label) {
  const value = String(label ?? '').trim();
  const parts = value === '#/' ? []
    : value.startsWith('#/') ? pointerParts(value) : ['$defs', value];
  if (!value || parts.some(part => dangerous.has(part))
    || (!value.startsWith('#/') && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)))
    throw new Error(`${value || '(blank)'}: choose an existing schema owner.`);
  const path = [];
  let node = document;
  for (const part of parts) {
    const key = Array.isArray(node) ? arrayIndex(part, node.length, value, false) : part;
    path.push(key);
    node = isContainer(node) ? node[key] : undefined;
    if (node === undefined) break;
  }
  if (at(document, path) === undefined)
    throw new Error(`${pointer(path)} no longer exists. Reopen the form.`);
  return path;
}

function typedValue(row) {
  const text = String(row.value ?? '');
  switch (row.fact) {
    case 'string': case 'reference': return text;
    case 'escaped-string':
      try { return JSON.parse(`"${text}"`); }
      catch { throw new Error(`${row.path}: use \\n and \\t for line breaks and tabs.`); }
    case 'number': {
      const number = Number(text.trim());
      if (!text.trim() || !Number.isFinite(number))
        throw new Error(`${row.path}: enter a finite number.`);
      return number;
    }
    case 'boolean':
      if (text !== 'true' && text !== 'false')
        throw new Error(`${row.path}: choose true or false.`);
      return text === 'true';
    case 'null':
      if (text) throw new Error(`${row.path}: null needs an empty value.`);
      return null;
    case 'object': case 'array':
      if (text) throw new Error(`${row.path}: a container needs an empty value.`);
      return row.fact === 'object' ? {} : [];
    default: throw new Error(`${row.path}: choose a typed fact.`);
  }
}

function arrayIndex(part, length, path, allowEnd) {
  if (!/^(0|[1-9]\d*)$/.test(part) || !Number.isSafeInteger(Number(part)))
    throw new Error(`${path}: array positions must be whole numbers starting at 0.`);
  const index = Number(part);
  if (index > length || (!allowEnd && index === length))
    throw new Error(`${path}: array position ${index} does not exist; add earlier positions first.`);
  return index;
}

function memberKey(parent, part, path, allowEnd = false) {
  if (Array.isArray(parent)) return arrayIndex(part, parent.length, path, allowEnd);
  if (!isObject(parent)) throw new Error(`${path}: a parent is not an object or array.`);
  if (dangerous.has(part)) throw new Error(`${path}: this object key is reserved.`);
  return part;
}

function scanReferences(node, target, atPath = [], exclude = []) {
  if (startsWith(atPath, exclude)) return null;
  if (typeof node === 'string' && (node === target || node.startsWith(`${target}/`)))
    return pointer(atPath);
  if (!isContainer(node)) return null;
  for (const [name, child] of Object.entries(node)) {
    const found = scanReferences(child, target, [...atPath, Array.isArray(node) ? Number(name) : name], exclude);
    if (found) return found;
  }
  return null;
}

/** Set or remove only explicit paths; all other definition content is retained. */
export function schemaWithDefinitionPatches(document, edits, generatedOwnerAtPath = null) {
  if (!isObject(document) || !Array.isArray(edits) || !edits.length)
    throw new Error('Add or import at least one typed patch row.');
  const next = clone(document), changes = [];
  for (const [index, edit] of edits.entries()) {
    const label = `Row ${index + 1}`;
    const definition = ownerPath(document, edit.definition);
    const relative = pointerParts(edit.path, true);
    const target = [...definition];
    if (!['set', 'remove'].includes(edit.operation))
      throw new Error(`${label}: choose Set or Remove.`);
    if (edit.operation === 'set' && !relative.length)
      throw new Error(`${label}: Set needs a path inside the definition.`);
    if (edit.operation === 'remove' && (edit.fact || edit.value))
      throw new Error(`${label}: Remove needs blank fact and value cells.`);
    if (relative.some(part => dangerous.has(part)))
      throw new Error(`${label}: the path contains a reserved object key.`);
    let owner = at(next, definition), parent = null, key = null;
    if (owner === undefined) throw new Error(`${label}: ${pointer(definition)} was removed earlier in this batch.`);
    if (!relative.length) {
      if (!definition.length) throw new Error(`${label}: the schema root cannot be removed.`);
      const targetPointer = pointer(definition);
      const referrer = scanReferences(next, targetPointer, [], definition);
      if (referrer) throw new Error(`${targetPointer} is still referenced at ${referrer}. Remove or redirect the reference first.`);
      parent = at(next, definition.slice(0, -1)); key = definition.at(-1);
    } else {
      for (let position = 0; position < relative.length - 1; position += 1) {
        const part = relative[position], childKey = memberKey(owner, part, edit.path, edit.operation === 'set');
        target.push(childKey);
        let child = Object.hasOwn(owner, childKey) ? owner[childKey] : undefined;
        if (child === undefined) {
          if (edit.operation !== 'set') throw new Error(`${label}: ${pointer(target)} does not exist.`);
          child = /^(0|[1-9]\d*)$/.test(relative[position + 1]) ? [] : {};
          if (Array.isArray(owner) && childKey === owner.length) owner.push(child);
          else Object.defineProperty(owner, childKey, {
            value: child, enumerable: true, writable: true, configurable: true,
          });
        }
        if (!isContainer(child)) throw new Error(`${label}: ${pointer(target)} is a value, not a container.`);
        owner = child;
      }
      parent = owner;
      key = memberKey(parent, relative.at(-1), edit.path, edit.operation === 'set');
      target.push(key);
    }
    const prior = Object.hasOwn(parent, key) ? clone(parent[key]) : undefined;
    const owned = next['x-fullmeta-ui-generated']?.fields?.find(entry =>
      Array.isArray(entry?.path) && (startsWith(target, entry.path) || startsWith(entry.path, target)));
    if (owned || generatedOwnerAtPath?.(document, target))
      throw new Error(`${label}: ${pointer(target)} is generated by another guided input.`);
    if (edit.operation === 'remove') {
      if (prior === undefined) throw new Error(`${label}: ${pointer(target)} does not exist.`);
      if (Array.isArray(parent)) parent.splice(key, 1);
      else delete parent[key];
      changes.push({ operation: 'remove', path: pointer(target), before: prior, after: undefined });
    } else {
      const after = typedValue(edit);
      if (Array.isArray(parent) && key === parent.length) parent.push(after);
      else Object.defineProperty(parent, key, {
        value: after, enumerable: true, writable: true, configurable: true,
      });
      changes.push({ operation: 'set', path: pointer(target), before: prior, after: clone(after) });
    }
  }
  return { document: next, changes };
}

function availableDefinitions(root) {
  const result = ['#/'], resultSet = new Set(result), seen = new Set();
  const addOwner = path => {
    const label = pointer(path);
    if (!resultSet.has(label)) { resultSet.add(label); result.push(label); }
  };
  const visit = (node, path, depth = 0) => {
    if (!isObject(node) || depth > 25 || seen.has(node)) return;
    seen.add(node);
    // Some applications group reusable subschemas in a plain map inside a
    // definition (for example $defs.femProfiles.acoustic-2d). Offer those
    // nested schemas as owners too; they are not themselves under another
    // $defs keyword, but are valid existing schema owners by JSON pointer.
    if (!looksLikeSchema(node)) for (const [key, child] of Object.entries(node)) {
      if (looksLikeSchema(child)) {
        const childPath = [...path, key];
        addOwner(childPath);
        visit(child, childPath, depth + 1);
      }
    }
    if (isObject(node.$defs)) for (const key of Object.keys(node.$defs)) {
      addOwner([...path, '$defs', key]);
      visit(node.$defs[key], [...path, '$defs', key], depth + 1);
    }
    for (const relation of ['properties', 'patternProperties'])
      for (const [key, value] of Object.entries(node[relation] || {}))
        visit(value, [...path, relation, key], depth + 1);
    for (const relation of ['items', 'additionalProperties', 'if', 'then', 'else', 'not'])
      visit(node[relation], [...path, relation], depth + 1);
    for (const relation of ['allOf', 'anyOf', 'oneOf'])
      node[relation]?.forEach?.((child, index) => visit(child, [...path, relation, index], depth + 1));
  };
  visit(root, []);
  const topLevel = Object.entries(root)
    .filter(([, value]) => isContainer(value))
    .map(([key]) => pointer([key]));
  result.splice(1, 0, ...topLevel);
  if (isObject(root.properties))
    result.splice(result.indexOf('#/properties') + 1, 0,
      ...Object.keys(root.properties).map(key => pointer(['properties', key])));
  return result;
}

const previewText = value => value === undefined ? '(absent)' : JSON.stringify(value);

/** Editable table with a direct TSV import and a review step. */

export { availableDefinitions, valueTypes };
export { createDefinitionPatchesDialog } from './schema-definition-patches-dialog.js';
