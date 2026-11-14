/** Typed, application-neutral rows for authoring several reusable schemas together. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const at = (value, path) => path.reduce((node, part) => node?.[part], value);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;





const facts = [
  ['node', 'Schema node'], ['type', 'Type'], ['ref', 'Local reference'],
  ['false', 'Reject every value'], ['true', 'Accept every value'],
  ['require', 'Require property'], ['enumText', 'Allowed text choice'],
  ['constText', 'Fixed text'], ['constNumber', 'Fixed number'],
  ['constBoolean', 'Fixed true / false'], ['constNull', 'Fixed null'],
  ['constEmptyObject', 'Fixed empty object'],
  ['minLength', 'Minimum text length'], ['maxLength', 'Maximum text length'],
  ['pattern', 'Text pattern'], ['minimum', 'Minimum number'],
  ['maximum', 'Maximum number'], ['minItems', 'Minimum items'],
  ['maxItems', 'Maximum items'], ['uniqueItems', 'Unique items'],
  ['minProperties', 'Minimum properties'], ['maxProperties', 'Maximum properties'],
  ['title', 'Title'], ['description', 'Description'],
];
const factSet = new Set(facts.map(([key]) => key));
const schemaTypes = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']);
const mapRelations = new Set(['properties', '$defs', 'patternProperties', 'dependentSchemas']);
const listRelations = new Set(['oneOf', 'anyOf', 'allOf', 'prefixItems']);
const directRelations = new Set(['items', 'additionalProperties', 'contains', 'not', 'if', 'then', 'else', 'propertyNames']);
const simpleKeywords = new Set(['type', '$ref', 'required', 'enum', 'const', 'minLength',
  'maxLength', 'pattern', 'minimum', 'maximum', 'minItems', 'maxItems',
  'uniqueItems', 'minProperties', 'maxProperties', 'title', 'description']);

function definitionKey(text) {
  const key = String(text || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)
    || ['__proto__', 'constructor', 'prototype'].includes(key))
    throw new Error(`Definition key ${key || '(blank)'} needs letters, numbers, underscores, or hyphens.`);
  return key;
}
function parseNodePath(text) {
  const value = String(text || '').trim().replace(/^\//, '');
  if (!value) return [];
  const encoded = value.split('/');
  if (encoded.some(part => !part || /~(?![01])/.test(part)))
    throw new Error(`${text}: use / between schema relations and escape ~ or / in names.`);
  const parts = encoded.map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  for (let index = 0; index < parts.length;) {
    const relation = parts[index];
    if (mapRelations.has(relation)) {
      if (!parts[index + 1] || ['__proto__', 'constructor', 'prototype'].includes(parts[index + 1]))
        throw new Error(`${text}: ${relation} needs a safe field name.`);
      index += 2;
    } else if (listRelations.has(relation)) {
      if (!/^(0|[1-9]\d*)$/.test(parts[index + 1] || '')
        || Number(parts[index + 1]) > 1000)
        throw new Error(`${text}: ${relation} needs a zero-based item number.`);
      index += 2;
    } else if (directRelations.has(relation)) index += 1;
    else throw new Error(`${text}: ${relation} is not a supported schema relation.`);
  }
  return parts;
}
function nodePathText(parts) {
  return parts.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}
function schemaLocation(definitions, key, parts) {
  let owner = definitions, member = key;
  let node = owner[member];
  if (node === undefined) node = owner[member] = {};
  for (let index = 0; index < parts.length;) {
    if (!isObject(node)) throw new Error(`${key}: a child path passes through a non-object schema.`);
    const relation = parts[index];
    if (mapRelations.has(relation)) {
      const name = parts[index + 1];
      if (node[relation] === undefined) node[relation] = {};
      if (!isObject(node[relation])) throw new Error(`${key}: ${relation} is not an object map.`);
      owner = node[relation]; member = name; index += 2;
    } else if (listRelations.has(relation)) {
      const item = Number(parts[index + 1]);
      if (node[relation] === undefined) node[relation] = [];
      if (!Array.isArray(node[relation])) throw new Error(`${key}: ${relation} is not a list.`);
      if (item > node[relation].length) throw new Error(`${key}: add earlier ${relation} positions first.`);
      owner = node[relation]; member = item; index += 2;
    } else {
      owner = node; member = relation; index += 1;
    }
    if (owner[member] === undefined) {
      if (Array.isArray(owner) && member === owner.length) owner.push({});
      else Object.defineProperty(owner, member, { value: {}, writable: true, enumerable: true, configurable: true });
    }
    node = owner[member];
  }
  return { owner, member, node };
}
const nonnegative = (value, label) => {
  if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new Error(`${label} needs a nonnegative whole number.`);
  return Number(value);
};
const numeric = (value, label) => {
  if (!value.trim() || !Number.isFinite(Number(value))) throw new Error(`${label} needs a finite number.`);
  return Number(value);
};
function addFact(definitions, row) {
  const key = definitionKey(row.definition), parts = parseNodePath(row.path);
  if (!factSet.has(row.fact)) throw new Error(`${key}: choose a supported schema fact.`);
  const { owner, member, node } = schemaLocation(definitions, key, parts);
  const value = String(row.value ?? ''), label = `${key}/${nodePathText(parts)} ${row.fact}`;
  if (row.fact === 'false' || row.fact === 'true') {
    if (value.trim()) throw new Error(`${label}: leave the value cell empty.`);
    if (isObject(node) && Object.keys(node).length) throw new Error(`${label}: this schema already has child facts.`);
    owner[member] = row.fact === 'true'; return;
  }
  if (!isObject(node)) throw new Error(`${label}: a Boolean schema cannot have other facts.`);
  switch (row.fact) {
    case 'node': if (value.trim()) throw new Error(`${label}: leave the value cell empty.`); return;
    case 'type':
      if (!schemaTypes.has(value)) throw new Error(`${label}: choose a JSON Schema type.`);
      node.type = value; return;
    case 'ref':
      if (!value.startsWith('#/')) throw new Error(`${label}: enter a local #/ reference.`);
      node.$ref = value; return;
    case 'require':
      if (!value || ['__proto__', 'constructor', 'prototype'].includes(value))
        throw new Error(`${label}: enter a property name.`);
      (node.required ||= []);
      if (!node.required.includes(value)) node.required.push(value);
      return;
    case 'enumText':
      (node.enum ||= []);
      if (!node.enum.includes(value)) node.enum.push(value);
      return;
    case 'constText': node.const = value; return;
    case 'constNumber': node.const = numeric(value, label); return;
    case 'constBoolean':
      if (!['true', 'false'].includes(value)) throw new Error(`${label}: enter true or false.`);
      node.const = value === 'true'; return;
    case 'constNull': node.const = null; return;
    case 'constEmptyObject': node.const = {}; return;
    case 'uniqueItems':
      if (!['true', 'false'].includes(value)) throw new Error(`${label}: enter true or false.`);
      node.uniqueItems = value === 'true'; return;
    case 'minLength': case 'maxLength': case 'minItems': case 'maxItems':
    case 'minProperties': case 'maxProperties':
      node[row.fact] = nonnegative(value, label); return;
    case 'minimum': case 'maximum': node[row.fact] = numeric(value, label); return;
    case 'pattern':
      try { new RegExp(value); } catch { throw new Error(`${label}: enter a regular expression.`); }
      node.pattern = value; return;
    case 'title': case 'description': node[row.fact] = value; return;
    default: throw new Error(`${label}: unsupported fact.`);
  }
}
function flattenDefinition(value) {
  const rows = [], unsupported = [];
  const push = (path, fact, text = '') => rows.push({ path: nodePathText(path), fact, value: String(text) });
  const visit = (node, path) => {
    if (node === false || node === true) { push(path, String(node)); return; }
    if (!isObject(node)) { unsupported.push(nodePathText(path)); return; }
    if (!Object.keys(node).length) push(path, 'node');
    for (const [key, item] of Object.entries(node)) {
      if (mapRelations.has(key)) {
        if (!isObject(item)) { unsupported.push(`${nodePathText(path)}/${key}`); continue; }
        for (const [name, child] of Object.entries(item)) visit(child, [...path, key, name]);
      } else if (listRelations.has(key)) {
        if (!Array.isArray(item)) { unsupported.push(`${nodePathText(path)}/${key}`); continue; }
        item.forEach((child, index) => visit(child, [...path, key, index]));
      } else if (directRelations.has(key)) visit(item, [...path, key]);
      else if (key === 'required' && Array.isArray(item) && item.every(v => typeof v === 'string'))
        item.forEach(name => push(path, 'require', name));
      else if (key === 'enum' && Array.isArray(item) && item.every(v => typeof v === 'string'))
        item.forEach(choice => push(path, 'enumText', choice));
      else if (key === 'const') {
        if (typeof item === 'string') push(path, 'constText', item);
        else if (typeof item === 'number' && Number.isFinite(item)) push(path, 'constNumber', item);
        else if (typeof item === 'boolean') push(path, 'constBoolean', item);
        else if (item === null) push(path, 'constNull');
        else if (isObject(item) && !Object.keys(item).length) push(path, 'constEmptyObject');
        else unsupported.push(`${nodePathText(path)}/const`);
      } else if (simpleKeywords.has(key)) {
        if (['string', 'number', 'boolean'].includes(typeof item)) push(path, key === '$ref' ? 'ref' : key, item);
        else unsupported.push(`${nodePathText(path)}/${key}`);
      } else unsupported.push(`${nodePathText(path)}/${key}`);
    }
  };
  visit(value, []);
  return { rows, unsupported };
}

export function schemaWithDefinitionRows(document, rows, generatedOwnerAtPath = null) {
  if (!isObject(document) || !Array.isArray(rows) || !rows.length)
    throw new Error('Add typed definition rows before previewing.');
  const next = clone(document), definitions = next.$defs ||= {};
  if (!isObject(definitions)) throw new Error('The root $defs map is not an object.');
  const grouped = new Map();
  for (const row of rows) {
    const key = definitionKey(row.definition);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  for (const key of grouped.keys()) {
    if (generatedOwnerAtPath?.(document, ['$defs', key]))
      throw new Error(`${key} is generated by another guided input.`);
    if (Object.hasOwn(document.$defs || {}, key)) {
      const { unsupported } = flattenDefinition(document.$defs[key]);
      if (unsupported.length) throw new Error(`${key} contains unsupported facts at ${unsupported[0]}; it is preserved.`);
    }
    definitions[key] = {};
  }
  for (const rowsForKey of grouped.values()) {
    for (const row of rowsForKey) addFact(definitions, row);
  }
  for (const key of grouped.keys()) {
    const { unsupported } = flattenDefinition(definitions[key]);
    if (unsupported.length) throw new Error(`${key} has unsupported facts at ${unsupported[0]}.`);
  }
  for (const rowsForKey of grouped.values()) {
    for (const row of rowsForKey.filter(entry => entry.fact === 'ref')) {
      const parts = row.value.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
      if (at(next, parts) === undefined) throw new Error(`${row.definition}: ${row.value} does not exist.`);
    }
  }
  return next;
}


export { flattenDefinition, facts };
export { createDefinitionWorksheetDialog } from './schema-definition-worksheet-dialog.js';
