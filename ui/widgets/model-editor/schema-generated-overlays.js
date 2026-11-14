/** Typed, reversible overlays on fields made by guided schema authoring. */
import { schemaWithDefinitionPatches } from './schema-definition-patches.js';
import { flatContractRows } from './schema-root-contract-flat.js';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const startsWith = (path, prefix) => path.length >= prefix.length
  && prefix.every((part, index) => path[index] === part);
const at = (root, path) => path.reduce((node, part) => node?.[part], root);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
const dangerous = new Set(['__proto__', 'constructor', 'prototype']);




const valueTypes = [
  ['string', 'Text'], ['escaped-string', 'Escaped text'], ['reference', 'Reference'],
  ['number', 'Number'], ['boolean', 'True / false'], ['null', 'Null'],
  ['object', 'Object'], ['array', 'Array'],
];

function pathFromPointer(value, document) {
  const text = String(value || '').trim();
  if (!text.startsWith('#/')) throw new Error(`${text || '(blank)'}: enter a field pointer beginning with #/.`);
  const parts = text.slice(2).split('/');
  if (parts.some(part => !part || /~(?![01])/.test(part)))
    throw new Error(`${text}: use valid JSON pointer escapes ~0 and ~1.`);
  const path = [];
  let node = document;
  for (const part of parts) {
    const decoded = part.replace(/~1/g, '/').replace(/~0/g, '~');
    const key = Array.isArray(node) && /^(0|[1-9]\d*)$/.test(decoded)
      ? Number(decoded) : decoded;
    path.push(key);
    node = node?.[key];
  }
  return path;
}

function generatedField(document, fieldPath) {
  const propertyIndex = fieldPath.lastIndexOf('properties');
  if (propertyIndex < 0 || propertyIndex !== fieldPath.length - 2)
    throw new Error(`${pointer(fieldPath)} must identify a declared property field.`);
  if (fieldPath.some(part => dangerous.has(part)))
    throw new Error(`${pointer(fieldPath)} contains a reserved object key.`);
  const field = at(document, fieldPath);
  if (!isObject(field)) throw new Error(`${pointer(fieldPath)} is not an object field declaration.`);
  const records = document['x-fullmeta-ui-generated']?.fields;
  if (!Array.isArray(records)) throw new Error('This schema has no generated-field ownership records.');
  const ancestor = records.find(entry => Array.isArray(entry?.path)
    && entry.path.length < fieldPath.length && startsWith(fieldPath, entry.path));
  if (ancestor) throw new Error(`${pointer(fieldPath)} is inside another generated fragment.`);
  const whole = records.find(entry => same(entry?.path, fieldPath));
  const children = records.filter(entry => Array.isArray(entry?.path)
    && entry.path.length > fieldPath.length && startsWith(entry.path, fieldPath));
  if (!whole && !children.length)
    throw new Error(`${pointer(fieldPath)} is not a generated field. Use the ordinary definition patch table.`);
  if (whole && children.length)
    throw new Error(`${pointer(fieldPath)} has overlapping generated owners; repair that ownership before adding overlays.`);
  return { field, records, whole, children };
}

/** Narrow whole-field ownership to its existing direct keywords before applying additive facts. */
export function schemaWithGeneratedFieldOverlays(document, edits) {
  if (!isObject(document) || !Array.isArray(edits) || !edits.length)
    throw new Error('Add or import at least one typed overlay row.');
  const next = structuredClone(document), fields = new Map(), split = [];
  for (const [index, edit] of edits.entries()) {
    const fieldPath = pathFromPointer(edit.definition, document), name = pointer(fieldPath);
    const relative = String(edit.path || '').trim().replace(/^\//, '');
    if (!relative) throw new Error(`Row ${index + 1}: enter a path inside ${name}.`);
    if (!['set', 'remove'].includes(edit.operation))
      throw new Error(`Row ${index + 1}: choose Set or Remove.`);
    if (!fields.has(name)) fields.set(name, fieldPath);
    generatedField(document, fieldPath);
  }
  for (const [name, fieldPath] of fields) {
    const { field, records, whole } = generatedField(next, fieldPath);
    if (!whole) continue;
    const keys = Object.keys(field);
    if (!keys.length) throw new Error(`${name} has no generated keyword to protect.`);
    const index = records.indexOf(whole);
    records.splice(index, 1, ...keys.map(key => ({
      path: [...fieldPath, key], owner: structuredClone(whole.owner),
    })));
    split.push({ path: name, keys });
  }
  // The ordinary typed patch writer now sees protected generated children.
  // It rejects any change to a core keyword or an ancestor of one.
  const result = schemaWithDefinitionPatches(next, edits);
  return { ...result, split };
}

function availableFields(document) {
  const records = document?.['x-fullmeta-ui-generated']?.fields || [];
  const choices = new Set();
  for (const entry of records) {
    if (!Array.isArray(entry?.path)) continue;
    const index = entry.path.lastIndexOf('properties');
    if (index < 0 || index + 1 >= entry.path.length) continue;
    const path = entry.path.slice(0, index + 2);
    if (isObject(at(document, path))) choices.add(pointer(path));
  }
  return [...choices].sort();
}

function editableOverlayRows(document, fieldPath) {
  const { field, records, whole } = generatedField(document, fieldPath);
  if (whole) return [];
  const protectedKeys = new Set(records.filter(entry => Array.isArray(entry?.path)
    && startsWith(entry.path, fieldPath) && entry.path.length > fieldPath.length)
    .map(entry => entry.path[fieldPath.length]));
  const overlays = Object.fromEntries(Object.entries(field).filter(([key]) => !protectedKeys.has(key)));
  return flatContractRows(overlays);
}

/** Application-neutral dialog; file import fills the table directly. */

export { availableFields, editableOverlayRows };

export { createGeneratedFieldOverlaysDialog } from './schema-extra-candidate-dialogs.js';
