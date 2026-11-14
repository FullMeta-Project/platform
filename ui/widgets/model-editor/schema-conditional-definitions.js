/** Factorized, application-neutral conditional definition authoring. */
import { parseConditionalConstraintRows, formatConditionalConstraintRows }
  from './schema-conditional-row-paste.js';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const at = (source, path) => path.reduce((node, key) => node?.[key], source);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
const refParts = text => typeof text === 'string' && text.startsWith('#/')
  ? text.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~')) : null;





const pathText = parts => Array.isArray(parts) ? parts.every(part => !String(part).includes('.'))
  ? parts.join('.') : `/${parts.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}` : '';
const pathParts = (text, label) => {
  const value = text.trim();
  if (!value) throw new Error(`${label} needs a property path.`);
  const parts = value.startsWith('/')
    ? value.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    : value.split('.').map(part => part.trim());
  if (parts.some(part => !part || part === '[]')) throw new Error(`${label} has an empty segment.`);
  return parts;
};
const kindOf = value => value === null ? 'null' : typeof value;
const readValue = (kind, text, label) => {
  if (kind === 'null') return null;
  if (kind === 'boolean') {
    if (!['true', 'false'].includes(text.trim())) throw new Error(`${label} must be true or false.`);
    return text.trim() === 'true';
  }
  if (kind === 'number') {
    if (!text.trim() || !Number.isFinite(Number(text))) throw new Error(`${label} must be a finite number.`);
    return Number(text);
  }
  if (kind === 'string') return text;
  throw new Error(`${label} has an unknown value type.`);
};
const valueText = value => value === null || value === undefined ? '' : String(value);
const requiredWhen = (path, value, required) => {
  let node = { const: value };
  for (const part of [...path].reverse()) {
    node = { properties: { [part]: node } };
    if (required) node.required = [part];
  }
  return node;
};
const parseWhen = value => {
  const path = []; let node = value, required = true;
  while (isObject(node) && isObject(node.properties) && Object.keys(node.properties).length === 1
    && Object.keys(node).every(key => ['properties', 'required'].includes(key))) {
    const [part] = Object.keys(node.properties);
    if (!Array.isArray(node.required) || node.required.length !== 1 || node.required[0] !== part)
      required = false;
    path.push(part); node = node.properties[part];
  }
  return path.length && isObject(node) && Object.keys(node).length === 1
    && Object.hasOwn(node, 'const') && (node.const === null
      || ['string', 'number', 'boolean'].includes(typeof node.const))
    ? { path, value: node.const, required } : null;
};
const merge = (target, source, label) => {
  if (target === undefined) return clone(source);
  if (!isObject(target) || !isObject(source)) {
    if (JSON.stringify(target) === JSON.stringify(source)) return target;
    throw new Error(`${label} has conflicting constraint rows.`);
  }
  for (const [key, value] of Object.entries(source)) {
    if (key === 'properties') {
      if (!isObject(target.properties)) target.properties = {};
      for (const [name, property] of Object.entries(value))
        target.properties[name] = merge(target.properties[name], property, `${label}.${name}`);
    } else if (key === 'items') target.items = merge(target.items, value, `${label}[]`);
    else if (key === 'allOf') target.allOf = [...(Array.isArray(target.allOf) ? target.allOf : []), ...clone(value)];
    else if (key === 'required') target.required = [...new Set([...(target.required || []), ...value])];
    else if (!Object.hasOwn(target, key)) target[key] = clone(value);
    else if (JSON.stringify(target[key]) !== JSON.stringify(value))
      throw new Error(`${label} has conflicting ${key} rows.`);
  }
  return target;
};
const wrap = (path, leaf) => {
  let node = leaf;
  for (const part of [...path].reverse()) {
    if (part.endsWith('[]')) {
      const key = part.slice(0, -2);
      node = { properties: { [key]: { items: node } } };
    } else node = { properties: { [part]: node } };
  }
  return node;
};
const expandRef = (text, ownerPath) => text.startsWith('@/')
  ? pointer([...ownerPath, ...text.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))])
  : text;
const relativeRef = (ref, ownerPath) => typeof ref === 'string' && ref.startsWith(`${pointer(ownerPath)}/`)
  ? `@/${ref.slice(pointer(ownerPath).length + 1)}` : ref;
const validRef = (document, ref, label) => {
  const path = refParts(ref);
  if (!path || at(document, path) === undefined)
    throw new Error(`${label} must point to an existing local schema declaration.`);
};

function rowSchema(row, ownerPath, document, label) {
  const path = pathParts(row.path, `${label} target`);
  const reference = () => {
    const value = expandRef(row.value.trim(), ownerPath);
    validRef(document, value, label); return value;
  };
  let leaf;
  switch (row.kind) {
    case 'ref': leaf = { $ref: reference() }; break;
    case 'allOfRef': leaf = { allOf: [{ $ref: reference() }] }; break;
    case 'const': leaf = { const: readValue(row.valueKind, row.value, label) }; break;
    case 'enum': {
      const values = row.value.split(',').map(value => value.trim()).filter(Boolean);
      if (!values.length) throw new Error(`${label} needs allowed values.`);
      leaf = { enum: values }; break;
    }
    case 'minItems': case 'maxItems': {
      if (!/^\d+$/.test(row.value.trim())) throw new Error(`${label} needs a nonnegative whole number.`);
      leaf = { [row.kind]: Number(row.value.trim()) }; break;
    }
    case 'false': leaf = false; break;
    case 'conditionalRef': {
      const whenPath = pathParts(row.whenPath, `${label} when`);
      const thenPath = pathParts(row.thenPath, `${label} then`);
      leaf = { if: requiredWhen(whenPath, readValue(row.valueKind, row.whenValue,
        `${label} when value`), true), then: wrap(thenPath, { $ref: reference() }) };
      break;
    }
    default: throw new Error(`${label} has an unsupported constraint type.`);
  }
  return wrap(path, leaf);
}

/** Writes only named conditional definitions; other schema content is unchanged. */
export function schemaWithConditionalDefinitions(document, edits, generatedOwnerAtPath = null) {
  if (!isObject(document) || !Array.isArray(edits) || !edits.length)
    throw new Error('Edit at least one conditional definition before previewing.');
  const next = clone(document), names = new Set();
  for (const [index, edit] of edits.entries()) {
    const ownerPath = edit.ownerPath, key = edit.key?.trim();
    if (!Array.isArray(ownerPath) || !isObject(at(next, ownerPath)?.$defs)
      || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key || ''))
      throw new Error(`Template ${index + 1} needs a definition owner and key.`);
    const path = [...ownerPath, '$defs', key], id = pointer(path);
    if (names.has(id)) throw new Error(`${id} is edited twice.`);
    names.add(id);
    if (generatedOwnerAtPath?.(document, path))
      throw new Error(`${id} is generated by another guided input.`);
    const existing = at(document, path);
    if (existing !== undefined && !parseConditionalDefinition(existing, ownerPath))
      throw new Error(`${id} uses schema features this table cannot edit. It is preserved.`);
    const whenPath = pathParts(edit.whenPath, `${id} when`);
    const value = readValue(edit.whenKind, edit.whenValue, `${id} when value`);
    if (!Array.isArray(edit.rows) || !edit.rows.length)
      throw new Error(`${id} needs at least one Then constraint row.`);
    let then = {};
    for (const [rowIndex, row] of edit.rows.entries())
      then = merge(then, rowSchema(row, ownerPath, next, `${id} row ${rowIndex + 1}`), id);
    at(next, ownerPath).$defs[key] = {
      if: requiredWhen(whenPath, value, edit.requireWhen !== false), then,
    };
  }
  return next;
}

function parseConditionalDefinition(value, ownerPath) {
  if (!isObject(value) || Object.keys(value).some(key => !['if', 'then'].includes(key))) return null;
  const when = parseWhen(value.if);
  if (!when || !isObject(value.then)) return null;
  const rows = [], unsupported = [];
  const visit = (node, path) => {
    if (node === false) { rows.push({ path: pathText(path), kind: 'false', value: '' }); return; }
    if (!isObject(node)) { unsupported.push(pathText(path)); return; }
    for (const [key, item] of Object.entries(node)) {
      if (key === 'properties') {
        if (!isObject(item)) { unsupported.push(pathText(path)); continue; }
        for (const [name, child] of Object.entries(item)) visit(child, [...path, name]);
      } else if (key === 'items') {
        if (!path.length) { unsupported.push('root items'); continue; }
        visit(item, [...path.slice(0, -1), `${path.at(-1)}[]`]);
      } else if (key === '$ref') rows.push({ path: pathText(path), kind: 'ref', value: relativeRef(item, ownerPath) });
      else if (key === 'const') rows.push({ path: pathText(path), kind: 'const',
        value: valueText(item), valueKind: kindOf(item) });
      else if (key === 'enum' && Array.isArray(item) && item.every(v => typeof v === 'string'))
        rows.push({ path: pathText(path), kind: 'enum', value: item.join(', ') });
      else if ((key === 'minItems' || key === 'maxItems') && Number.isInteger(item) && item >= 0)
        rows.push({ path: pathText(path), kind: key, value: String(item) });
      else if (key === 'allOf' && Array.isArray(item) && item.every(v => isObject(v)
        && Object.keys(v).length === 1 && typeof v.$ref === 'string')) {
        for (const entry of item) rows.push({ path: pathText(path), kind: 'allOfRef',
          value: relativeRef(entry.$ref, ownerPath) });
      } else if (key === 'if' && isObject(node.then)) {
        const nested = parseWhen(item), then = node.then;
        let target = then, targetPath = [];
        while (isObject(target) && Object.keys(target).length === 1 && isObject(target.properties)
          && Object.keys(target.properties).length === 1) {
          const [name] = Object.keys(target.properties); targetPath.push(name);
          target = target.properties[name];
        }
        if (nested && isObject(target) && Object.keys(target).length === 1
          && typeof target.$ref === 'string')
          rows.push({ path: pathText(path), kind: 'conditionalRef',
            whenPath: pathText(nested.path), whenValue: valueText(nested.value),
            valueKind: kindOf(nested.value), thenPath: pathText(targetPath),
            value: relativeRef(target.$ref, ownerPath) });
        else unsupported.push(`${pathText(path)} conditional`);
      } else if (key === 'then' && isObject(node.if)) { /* handled with if */ }
      else unsupported.push(`${pathText(path)} ${key}`);
    }
  };
  visit(value.then, []);
  return unsupported.length || !rows.length ? null : {
    whenPath: pathText(when.path), whenKind: kindOf(when.value),
    whenValue: valueText(when.value), requireWhen: when.required, rows,
  };
}


function definitionOwners(document) {
    const result = [];
    const schemaKeys = new Set(['$defs', '$ref', 'type', 'properties', 'patternProperties',
      'items', 'additionalProperties', 'oneOf', 'anyOf', 'allOf', 'if', 'then', 'else',
      'not', 'const', 'enum', 'required', 'title', 'description']);
    const visit = (node, path, depth = 0, definitionValue = false) => {
      if (!isObject(node) || depth > 24) return;
      if (isObject(node.$defs)) result.push({ path, keys: Object.keys(node.$defs) });
      if (isObject(node.$defs)) for (const [name, child] of Object.entries(node.$defs))
        visit(child, [...path, '$defs', name], depth + 1, true);
      for (const key of ['properties', 'patternProperties'])
        if (isObject(node[key])) for (const [name, child] of Object.entries(node[key]))
          visit(child, [...path, key, name], depth + 1);
      for (const key of ['items', 'additionalProperties'])
        if (isObject(node[key])) visit(node[key], [...path, key], depth + 1);
      for (const key of ['oneOf', 'anyOf', 'allOf'])
        if (Array.isArray(node[key])) node[key].forEach((child, index) =>
          visit(child, [...path, key, index], depth + 1));
      // A $defs value can be a namespace of named schemas rather than a schema
      // declaration itself. Follow that map without treating annotation payloads
      // or arbitrary objects elsewhere in the document as definition owners.
      const namespaceEntries = Object.entries(node).filter(([key]) =>
        !['title', 'description', '$comment'].includes(key) && !key.startsWith('x-'));
      if (definitionValue && namespaceEntries.length && namespaceEntries.every(([key, value]) =>
        !schemaKeys.has(key) && isObject(value))) {
        for (const [name, child] of namespaceEntries)
          visit(child, [...path, name], depth + 1, true);
      }
    };
    visit(document, []); return result;
  }

export { parseConditionalDefinition, definitionOwners };
export { createConditionalDefinitionsDialog } from './schema-conditional-definitions-dialog.js';
