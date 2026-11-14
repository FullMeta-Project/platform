const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const clone = value => structuredClone(value);

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const at = (source, path) => path.reduce((value, key) => value?.[key], source);

const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;

const pathText = value => Array.isArray(value) ? value.map(String).join('.') : typeof value === 'string' ? value : '';

const pathParts = (value, label) => {
  const text = value.trim();
  if (!text) return [];
  const parts = text.split('.').map(part => part.trim());
  if (parts.some(part => !part)) throw new Error(`${label} has an empty path segment.`);
  return parts;
};

const stringValue = value => typeof value === 'string' ? value : '';

const uniquePathText = value => Array.isArray(value) ? value.map(String).join('.') : stringValue(value);

const referenceKeys = ['x-fullmeta-modelReference', 'x-fullmeta-reference'];

const referenceFields = [
  ['scope', 'Scope'], ['targetPath', 'Target path'], ['targetProperty', 'Target property'],
  ['targetLabel', 'Target label'], ['uniqueWithinCollection', 'Unique within collection'],
  ['uniqueProperty', 'Unique property'], ['exceptSiblingProperty', 'Except sibling property'],
  ['onDelete', 'On delete'], ['throughSiblingReference', 'Through sibling reference'],
  ['targetSubcollection', 'Target subcollection'], ['emptyChoiceLabel', 'Empty choice label'],
  ['choiceLabelTemplate', 'Choice label template'],
];

function dimensionText(value) {
  if (!isObject(value)) return '';
  return Object.entries(value).map(([dimension, entities]) => `${dimension}:${Array.isArray(entities) ? entities.join(',') : ''}`).join('; ');
}

function parseDimensions(value) {
  if (!value.trim()) return undefined;
  const output = {};
  for (const section of value.split(';').map(part => part.trim()).filter(Boolean)) {
    const [dimension, ...rest] = section.split(':');
    if (!dimension?.trim() || !rest.length || Object.hasOwn(output, dimension.trim()))
      throw new Error('Dimension filters must use unique rows such as 2:domain,boundary; 3:domain,boundary,edge.');
    const entities = rest.join(':').split(',').map(part => part.trim());
    if (entities.some(part => !part)) throw new Error(`Dimension ${dimension.trim()} has an empty entity.`);
    output[dimension.trim()] = entities;
  }
  return output;
}

function referenceDraft(reference) {
  const value = isObject(reference) ? reference : {};
  return {
    enabled: isObject(reference),
    ...Object.fromEntries(referenceFields.map(([key]) => [key,
      key === 'targetPath' ? pathText(value[key])
        : key === 'uniqueWithinCollection' ? uniquePathText(value[key]) : stringValue(value[key])])),
    keyReference: value.keyReference === true ? 'true' : value.keyReference === false ? 'false' : '',
    entitiesByDimension: dimensionText(value.entitiesByDimension),
    targetSchema: Object.hasOwn(value, 'targetSchema') ? clone(value.targetSchema) : undefined,
  };
}

function referenceFromDraft(original, values, annotationKey) {
  if (!values.enabled) return null;
  const baseline = referenceDraft(original), next = isObject(original) ? clone(original) : {};
  for (const [key] of referenceFields) {
    if (values[key] === baseline[key]) continue;
    const text = values[key].trim();
    if (!text) { delete next[key]; continue; }
    if (key === 'targetPath') next[key] = pathParts(text, 'Target path');
    else if (key === 'uniqueWithinCollection') {
      const parts = pathParts(text, 'Unique collection path');
      next[key] = parts.length === 1 ? parts[0] : parts;
    } else next[key] = text;
  }
  if (values.keyReference !== baseline.keyReference) {
    if (values.keyReference) next.keyReference = values.keyReference === 'true';
    else delete next.keyReference;
  }
  if (values.entitiesByDimension !== baseline.entitiesByDimension) {
    const dimensions = parseDimensions(values.entitiesByDimension);
    if (dimensions) next.entitiesByDimension = dimensions;
    else delete next.entitiesByDimension;
  }
  if (!same(values.targetSchema, baseline.targetSchema)) {
    if (values.targetSchema === undefined) delete next.targetSchema;
    else next.targetSchema = clone(values.targetSchema);
  }
  if (!Array.isArray(next.targetPath) || !next.targetPath.length)
    throw new Error(`${annotationKey}: enter a target path before enabling a reference.`);
  if (Boolean(next.uniqueWithinCollection) !== Boolean(next.uniqueProperty))
    throw new Error(`${annotationKey}: uniqueness needs both a collection and property.`);
  return next;
}

export function schemaWithBulkReferences(schema, edits, generatedOwnerAtPath = null) {
  if (!isObject(schema) || !Array.isArray(edits) || !edits.length)
    throw new Error('Edit at least one reference before previewing.');
  const candidate = clone(schema), touched = new Set();
  for (const edit of edits) {
    const path = edit?.path, key = edit?.annotationKey;
    if (!Array.isArray(path) || !referenceKeys.includes(key) || !isObject(at(schema, path)))
      throw new Error('A reference field changed since the table opened.');
    const identity = `${pointer(path)}/${key}`;
    if (touched.has(identity)) throw new Error(`${identity} was edited twice.`);
    touched.add(identity);
    if (generatedOwnerAtPath?.(schema, path) || generatedOwnerAtPath?.(schema, [...path, key]))
      throw new Error(`${identity} is generated by a guided structure input.`);
    const existing = at(schema, path)?.[key];
    const reference = referenceFromDraft(existing, edit.values, key);
    if (reference === null) delete at(candidate, path)[key];
    else at(candidate, path)[key] = reference;
  }
  return candidate;
}

export {referenceDraft,referenceFromDraft,referenceKeys,referenceFields,pathParts,pathText};
