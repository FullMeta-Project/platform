/** Application-neutral authoring of nested JSON Schema object and array fields. */

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const at = (value, path) => path.reduce((node, key) => node?.[key], value);
const samePath = (a, b) => a.length === b.length && a.every((part, index) => part === b[index]);
const prefix = (a, b) => a.length <= b.length && a.every((part, index) => part === b[index]);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
const types = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];
const combined = ['oneOf', 'anyOf', 'allOf', 'if', 'then', 'else', 'not'];

function inferredType(node) {
  if (typeof node?.type === 'string') return node.type;
  if (isObject(node?.properties) || Object.hasOwn(node || {}, 'additionalProperties')) return 'object';
  if (isObject(node?.items)) return 'array';
  return '';
}

function children(node, path, includeBranches = false) {
  const result = [];
  for (const mapKey of ['properties', 'patternProperties', '$defs', 'dependentSchemas']) {
    if (!isObject(node?.[mapKey])) continue;
    for (const [key, value] of Object.entries(node[mapKey])) {
      if (isObject(value)) result.push({ path: [...path, mapKey, key], value, relation: mapKey, key });
    }
  }
  for (const key of ['items', 'additionalProperties']) {
    if (isObject(node?.[key])) result.push({ path: [...path, key], value: node[key], relation: key, key });
  }
  if (includeBranches) {
    for (const key of ['oneOf', 'anyOf', 'allOf', 'prefixItems']) {
      if (!Array.isArray(node?.[key])) continue;
      node[key].forEach((value, index) => {
        if (isObject(value)) result.push({ path: [...path, key, index], value, relation: key, key: String(index + 1) });
      });
    }
    for (const key of ['if', 'then', 'else', 'not', 'contains', 'propertyNames']) {
      if (isObject(node?.[key])) result.push({ path: [...path, key], value: node[key], relation: key, key });
    }
  }
  return result;
}

/** A target can be selected even when it is not represented in the project tree. */
export function nestedStructureTargets(schema) {
  const targets = [];
  const visit = (node, path, depth = 0) => {
    if (!isObject(node) || depth > 40) return;
    const kind = inferredType(node);
    if (kind === 'object' || kind === 'array')
      targets.push({ path, kind, title: node.title || path.at(-1) || 'Schema root' });
    for (const child of children(node, path, true)) visit(child.value, child.path, depth + 1);
  };
  visit(schema, []);
  return targets;
}

function nestedRows(schema, selectedPath) {
  const rows = [];
  const visit = (node, path, depth, relation = '', key = '') => {
    if (!isObject(node) || depth > 24) return;
    rows.push({ path, depth, relation, key, value: node });
    for (const child of children(node, path)) {
      if (child.relation === '$defs' || child.relation === 'patternProperties'
        || child.relation === 'dependentSchemas') continue;
      visit(child.value, child.path, depth + 1, child.relation, child.key);
    }
  };
  visit(at(schema, selectedPath), selectedPath, 0);
  return rows;
}






const stringEnum = node => !Object.hasOwn(node, 'enum') ||
  Array.isArray(node.enum) && node.enum.every(value => typeof value === 'string' && !value.includes('\n'));
const pathOwner = (schema, path, ownerAtPath) => {
  if (typeof ownerAtPath !== 'function') return null;
  for (let length = path.length; length >= 0; length--) {
    const owner = ownerAtPath(schema, path.slice(0, length));
    if (owner) return owner;
  }
  return null;
};
const safeKey = key => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) &&
  !['__proto__', 'constructor', 'prototype'].includes(key);
const labels = { properties: 'field', items: 'array item', additionalProperties: 'object entry' };

/** The same controls inspect loaded structure and edit a private draft. */

export { createNestedStructureDialog } from './schema-extra-candidate-dialogs.js';
