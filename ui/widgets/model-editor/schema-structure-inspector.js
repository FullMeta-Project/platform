// A read-only projection of schema declarations into the guided author's table vocabulary.
// Keep the source paths and unprojected keywords visible: a table must never imply that
// annotations, conditions, or validation rules disappeared during reconstruction.
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;

function atPath(document, path) {
  return path.reduce((value, part) => value?.[part], document);
}

function referencePath(reference) {
  if (typeof reference !== 'string' || !reference.startsWith('#/')) return null;
  return reference.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function resolvedSchema(document, schema, seen = new Set()) {
  let current = schema, path = null;
  while (isRecord(current) && typeof current.$ref === 'string') {
    path = referencePath(current.$ref);
    if (!path) return { schema: current, path: null, issue: `External reference ${current.$ref}` };
    const key = JSON.stringify(path);
    if (seen.has(key)) return { schema: current, path, issue: `Recursive reference ${current.$ref}` };
    seen.add(key);
    current = atPath(document, path);
    if (!isRecord(current)) return { schema: null, path, issue: `Unresolved reference ${schema.$ref}` };
  }
  return { schema: current, path, issue: '' };
}

function generatedBy(document, path) {
  const labels = new Set();
  for (const entry of document?.['x-fullmeta-ui-generated']?.fields || []) {
    if (!Array.isArray(entry?.path) || !path.every((part, index) => entry.path[index] === part)) continue;
    if (typeof entry.owner?.input === 'string') labels.add(entry.owner.input);
  }
  return [...labels];
}

function shapeOf(schema) {
  if (!isRecord(schema)) return 'Unspecified';
  if (schema.$ref) return 'Reusable reference';
  if (schema.type === 'array') {
    if (schema.items?.$ref) return 'Array of references';
    if (typeof schema.items?.type === 'string') return `Array of ${schema.items.type}`;
    if (Array.isArray(schema.items?.oneOf)) return 'Array of oneOf';
    if (Array.isArray(schema.items?.anyOf)) return 'Array of anyOf';
    return 'Array';
  }
  if (Array.isArray(schema.oneOf)) return 'One of';
  if (Array.isArray(schema.anyOf)) return 'Any of';
  if (Array.isArray(schema.allOf)) return 'All of';
  return Array.isArray(schema.type) ? schema.type.join(' / ') : schema.type || 'Unspecified';
}

function unprojected(schema, represented) {
  if (!isRecord(schema)) return {};
  return Object.fromEntries(Object.entries(schema).filter(([key]) => !represented.has(key)));
}

function fieldRow(document, schema, path, key, required) {
  const behavior = schema?.['x-fullmeta-ui-behavior']?.payload || {};
  const itemBehavior = schema?.items?.['x-fullmeta-ui-behavior']?.payload || {};
  const widget = behavior.widget?.type || '';
  const count = Number.isInteger(schema?.minItems) && schema.minItems === schema.maxItems
    ? schema.minItems : '';
  const reference = schema?.$ref || schema?.items?.$ref || '';
  const represented = new Set([
    'title', 'type', '$ref', 'items', 'enum', 'default', 'const', 'x-fullmeta-ui-behavior',
  ]);
  if (count !== '') { represented.add('minItems'); represented.add('maxItems'); }
  const additional = unprojected(schema, represented);
  if (schema?.items !== undefined && !isRecord(schema.items)) additional['items'] = schema.items;
  const itemAdditional = unprojected(schema?.items, new Set(['type', '$ref', 'x-fullmeta-ui-behavior']));
  if (Object.keys(itemAdditional).length) additional['items: other keywords'] = itemAdditional;
  if (isRecord(schema?.['x-fullmeta-ui-behavior'])) {
    additional['UI behavior (complete annotation)'] = schema['x-fullmeta-ui-behavior'];
  }
  if (isRecord(schema?.items?.['x-fullmeta-ui-behavior'])) {
    additional['array item UI behavior (complete annotation)'] = schema.items['x-fullmeta-ui-behavior'];
  }
  const resolved = reference ? resolvedSchema(document, schema?.$ref ? schema : schema?.items) : null;
  if (resolved?.schema && !isStructural(resolved.schema)) {
    additional['referenced definition'] = {
      source: resolved.path ? pointer(resolved.path) : reference,
      ...resolved.schema,
    };
  }
  if (resolved?.issue) additional['reference issue'] = resolved.issue;
  const owners = generatedBy(document, path);
  return {
    key, title: schema?.title || '', shape: shapeOf(schema), reference,
    itemCount: count, choices: Array.isArray(schema?.enum) ? schema.enum : null,
    widget, itemWidget: itemBehavior.widget?.type || '',
    vectorLabels: behavior.widget?.settings?.componentLabels || [],
    required, hidden: behavior.presentation?.hidden === true,
    defaultValue: Object.hasOwn(schema || {}, 'default') ? schema.default : undefined,
    fixedValue: Object.hasOwn(schema || {}, 'const') ? schema.const : undefined,
    source: pointer(path), path: [...path], generatedBy: owners, additional,
  };
}

function isStructural(schema) {
  return isRecord(schema) && (schema.type === 'object' || schema.type === 'array'
    || isRecord(schema.properties) || isRecord(schema.additionalProperties)
    || isRecord(schema.items) || ['oneOf', 'anyOf', 'allOf'].some(key => Array.isArray(schema[key])));
}

function branchTitle(document, schema, index) {
  if (schema?.title) return schema.title;
  const resolved = resolvedSchema(document, schema);
  if (resolved.schema?.title) return resolved.schema.title;
  if (resolved.path?.[0] === '$defs') return resolved.path[1];
  return `Branch ${index + 1}`;
}

/** Describe the complete selected declaration as tables without changing its source. */
export function inspectSchemaStructure(document, selectedPath = []) {
  const sections = [];
  const visit = (declaration, path, label, ancestors = new Set()) => {
    if (!isRecord(declaration)) return;
    const sourceRef = declaration.$ref || '';
    const resolved = resolvedSchema(document, declaration, new Set(ancestors));
    const schema = resolved.schema;
    const effectivePath = resolved.path || path;
    const identity = JSON.stringify(effectivePath);
    const section = {
      label, source: pointer(path), definitionSource: resolved.path ? pointer(resolved.path) : '',
      sourceRef, shape: shapeOf(schema || declaration), rows: [],
      additional: {}, generatedBy: generatedBy(document, effectivePath),
      issue: resolved.issue,
    };
    sections.push(section);
    if (!isRecord(schema) || resolved.issue || ancestors.has(identity)) {
      if (ancestors.has(identity)) section.issue = `Recursive structure at ${pointer(effectivePath)}`;
      return;
    }
    const lineage = new Set([...ancestors, identity]);
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    for (const [key, field] of Object.entries(properties)) {
      const fieldPath = [...effectivePath, 'properties', key];
      section.rows.push(fieldRow(document, field, fieldPath, key, required.has(key)));
    }
    section.additional = unprojected(schema, new Set([
      'title', 'description', 'type', 'properties', 'required', 'items', 'additionalProperties',
      'oneOf', 'anyOf', 'allOf', '$ref',
    ]));
    if (sourceRef) {
      const siblings = unprojected(declaration, new Set(['$ref']));
      if (Object.keys(siblings).length) section.additional['reference source annotations'] = siblings;
    }
    if (schema.description) section.description = schema.description;
    if (Array.isArray(schema.required)) {
      const orphaned = schema.required.filter(key => !Object.hasOwn(properties, key));
      if (orphaned.length) section.additional['required keys without property rows'] = orphaned;
    }
    if (schema.additionalProperties === false) section.closedObject = true;
    else if (schema.additionalProperties === true) section.openObject = true;
    if (schema.type === 'array') {
      section.arrayLimits = { minItems: schema.minItems, maxItems: schema.maxItems };
    }
    if (isRecord(schema.items)) visit(schema.items, [...effectivePath, 'items'], `${label} → array item`, lineage);
    if (isRecord(schema.additionalProperties)) visit(schema.additionalProperties,
      [...effectivePath, 'additionalProperties'], `${label} → object entry`, lineage);
    for (const combination of ['oneOf', 'anyOf', 'allOf']) {
      if (!Array.isArray(schema[combination])) continue;
      schema[combination].forEach((branch, index) => visit(branch,
        [...effectivePath, combination, index], `${label} → ${combination} ${index + 1}: ${branchTitle(document, branch, index)}`, lineage));
    }
    for (const [key, field] of Object.entries(properties)) {
      const fieldResolved = resolvedSchema(document, field);
      if (!isStructural(field) && !isStructural(fieldResolved.schema)) continue;
      visit(field, [...effectivePath, 'properties', key], `${label} → ${field.title || key}`, lineage);
    }
  };
  visit(atPath(document, selectedPath), selectedPath, 'Selected declaration');
  return sections;
}
