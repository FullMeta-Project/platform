/** Semantic tables for any embedded scenario profiles declared by a schema. */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fieldKeys = { primary: 'fieldVariables', derived: 'derivedFieldVariables', zero: 'zeroFieldVariables' };
const factPathPattern = /^(?:[A-Za-z][A-Za-z0-9_-]*|\{profile\}|\{key\})(?:\.(?:[A-Za-z][A-Za-z0-9_-]*|\{profile\}|\{key\}))*$/;
const text = (value, label) => {
  const result = String(value ?? '').trim();
  if (!result) throw new Error(`Enter ${label}.`);
  return result;
};

function profileSource(document) {
  const choices = document?.properties?.scenario?.properties?.profileId?.enum
    || document?.$defs?.scenario?.properties?.profileId?.enum || [];
  for (const [collectionKey, collection] of Object.entries(document?.$defs || {})) {
    if (!object(collection)) continue;
    const matches = Object.entries(collection).flatMap(([id, schema]) =>
      object(schema) ? Object.entries(schema).filter(([annotation, value]) =>
        /^x-[A-Za-z0-9-]+-scenario$/.test(annotation)
        && object(value?.profile) && value.profile.id === id)
        .map(([annotation]) => ({ id, annotation })) : []);
    if (!matches.length || (choices.length && !choices.every(id => matches.some(match => match.id === id)))) continue;
    const annotation = matches[0].annotation;
    if (matches.some(match => match.annotation !== annotation)) continue;
    return { collectionKey, annotation, profileIds: matches.map(match => match.id) };
  }
  return null;
}

function scalarFacts(value, prefix = '') {
  if (!object(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (object(entry) && typeof entry.expression === 'string' && typeof entry.unit === 'string'
      && Object.keys(entry).every(part => ['expression', 'unit'].includes(part))) {
      return [{ path, kind: 'quantity', value: entry.expression, unit: entry.unit }];
    }
    if (typeof entry === 'string') return [{ path, kind: 'text', value: entry }];
    if (typeof entry === 'number') return [{ path, kind: 'number', value: String(entry) }];
    if (typeof entry === 'boolean') return [{ path, kind: 'boolean', value: String(entry) }];
    if (Array.isArray(entry) && entry.every(item => typeof item === 'string')) {
      return [{ path, kind: 'string list', value: entry.join(', ') }];
    }
    if (Array.isArray(entry) && entry.every(item => typeof item === 'number')) {
      return [{ path, kind: 'number list', value: entry.join(', ') }];
    }
    return object(entry) ? scalarFacts(entry, path) : [];
  });
}

function profileAnnotationFacts(document, source) {
  const grouped = new Map();
  for (const id of source.profileIds) {
    const schema = document.$defs[source.collectionKey][id];
    for (const [annotation, value] of Object.entries(schema)) {
      if (!/^x-[A-Za-z0-9-]+$/.test(annotation) || annotation === source.annotation) continue;
      for (const fact of scalarFacts(value)) {
        const path = fact.path.split('.').map(segment => segment === id ? '{profile}' : segment).join('.');
        const key = JSON.stringify([annotation, path, fact.kind, fact.value, fact.unit || '']);
        if (!grouped.has(key)) grouped.set(key, { profileIds: [], annotation, ...fact, path, repeatKeys: '' });
        grouped.get(key).profileIds.push(id);
      }
    }
  }
  return [...grouped.values()].map(row => ({ ...row, profileIds: row.profileIds.join(', ') }));
}

const dimensionsText = value => Array.isArray(value) ? value.join(', ') : '';
const numbersText = value => Array.isArray(value) ? value.join(', ') : '';

export function profileIntegrationDefaults(document) {
  const source = profileSource(document);
  if (!source) return { source: null, profiles: [], formulations: {}, fieldRows: [], materialRows: [], annotationFacts: [] };
  const profiles = [], formulations = {}, fieldRows = [], materialRows = [];
  for (const id of source.profileIds) {
    const metadata = document.$defs[source.collectionKey][id][source.annotation];
    profiles.push({ id, materialName: metadata.materials?.name || '',
      sweepResultQuantities: Array.isArray(metadata.sweepResultQuantities)
        ? metadata.sweepResultQuantities.join(', ') : '' });
    formulations[id] = Object.keys(metadata.fields?.formulations || {});
    for (const [formulation, definition] of Object.entries(metadata.fields?.formulations || {})) {
      for (const [role, key] of Object.entries(fieldKeys)) {
        for (const variable of definition?.[key] || []) fieldRows.push({
          profileId: id, formulation, role,
          symbol: variable.symbol || '', unit: variable.unit || '',
          solverFamily: variable.solverComponent?.family || '',
          solverAxis: variable.solverComponent?.axis || '',
          zeroInDimensions: dimensionsText(variable.zeroInDimensions),
        });
      }
    }
    for (const property of metadata.materials?.properties || []) materialRows.push({
      profileId: id, key: property.key || '', symbol: property.symbol || '',
      label: property.label || '', unit: property.unit || '',
      representation: property.representation || 'expression',
      defaultExpression: object(property.default) ? property.default.expression || '' : String(property.default ?? ''),
      defaultUnit: object(property.default) ? property.default.unit || '' : '',
      optional: property.optional === undefined ? '' : String(property.optional),
      plottable: property.plottable === undefined ? '' : String(property.plottable),
      implementedValues: numbersText(property.implementedValues),
      description: property.description || '',
    });
  }
  return { source, profiles, formulations, fieldRows, materialRows,
    annotationFacts: profileAnnotationFacts(document, source) };
}

function numericList(value, label, { integers = false } = {}) {
  const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  const numbers = parts.map(Number);
  if (numbers.some(number => !Number.isFinite(number) || (integers && !Number.isInteger(number)))) {
    throw new Error(`${label} must contain numbers separated by commas.`);
  }
  if (new Set(numbers).size !== numbers.length) throw new Error(`${label} must not repeat values.`);
  return numbers;
}

function stringList(value, label) {
  const items = String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  if (new Set(items).size !== items.length) throw new Error(`${label} must not repeat values.`);
  return items;
}

function triState(value, label) {
  if (value === '' || value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${label} must be true or false.`);
}

function factValue(row) {
  const kind = text(row.kind, 'a fact value kind');
  const value = String(row.value ?? '').trim();
  if (kind === 'text') return value;
  if (kind === 'number' && value && Number.isFinite(Number(value))) return Number(value);
  if (kind === 'boolean' && ['true', 'false'].includes(value)) return value === 'true';
  if (kind === 'string list') return stringList(value, 'Fact values');
  if (kind === 'number list') return numericList(value, 'Fact values');
  if (kind === 'quantity') return { expression: text(value, 'a quantity expression'),
    unit: text(row.unit, 'a quantity unit') };
  throw new Error(`Enter a valid ${kind} fact value.`);
}

function setFact(target, path, value) {
  const parts = path.split('.');
  let owner = target;
  for (const part of parts.slice(0, -1)) {
    owner[part] ||= {};
    if (!object(owner[part])) throw new Error(`${path} conflicts with an existing annotation value.`);
    owner = owner[part];
  }
  owner[parts.at(-1)] = value;
}

function deleteFact(target, path) {
  const parts = path.split('.');
  let owner = target;
  for (const part of parts.slice(0, -1)) {
    owner = owner?.[part];
    if (!object(owner)) return;
  }
  if (object(owner)) delete owner[parts.at(-1)];
}

/** Update only semantic field and material declarations in the discovered profiles. */
export function applyProfileIntegration(document, input) {
  const source = profileSource(document);
  const fieldRows = input?.fieldRows || [], materialRows = input?.materialRows || [], profiles = input?.profiles || [],
    annotationFacts = input?.annotationFacts || [];
  if (![fieldRows, materialRows, profiles, annotationFacts].every(Array.isArray)) throw new Error('Profile inputs must be tables.');
  if (!source) {
    if (fieldRows.length || materialRows.length || profiles.length || annotationFacts.length) {
      throw new Error('No embedded scenario profile collection was found.');
    }
    return { changedPaths: [], generatedPaths: [], fieldCount: 0, materialCount: 0, factCount: 0 };
  }
  const known = new Set(source.profileIds);
  const generatedPaths = [], changedPaths = [];
  const metadataFor = id => document.$defs[source.collectionKey][id][source.annotation];
  const knownFormulations = id => new Set(Object.keys(metadataFor(id).fields?.formulations || {}));
  const existingFields = new Map(), existingMaterials = new Map();
  for (const id of source.profileIds) {
    const metadata = metadataFor(id);
    for (const [formulation, definition] of Object.entries(metadata.fields?.formulations || {})) {
      for (const [role, key] of Object.entries(fieldKeys)) {
        for (const variable of definition?.[key] || []) {
          existingFields.set([id, formulation, role, variable.symbol].join('\u0000'), variable);
        }
      }
    }
    for (const property of metadata.materials?.properties || []) {
      existingMaterials.set(`${id}\u0000${property.key}`, property);
    }
  }
  const profileSeen = new Set();
  for (const row of profiles) {
    const id = text(row.profileId || row.id, 'a profile ID');
    if (!known.has(id)) throw new Error(`Profile ${id} is not embedded in the schema.`);
    if (profileSeen.has(id)) throw new Error(`Profile ${id} is listed twice.`);
    profileSeen.add(id);
    const metadata = metadataFor(id);
    metadata.materials ||= { name: '', properties: [] };
    metadata.materials.name = text(row.materialName, `${id} material set name`);
    metadata.sweepResultQuantities = stringList(row.sweepResultQuantities, `${id} sweep quantities`);
  }
  for (const id of source.profileIds) {
    const metadata = metadataFor(id);
    for (const definition of Object.values(metadata.fields?.formulations || {})) {
      for (const key of Object.values(fieldKeys)) definition[key] = [];
    }
  }
  const fieldSeen = new Set();
  for (const row of fieldRows) {
    const profileId = text(row.profileId, 'a field profile ID');
    if (!known.has(profileId)) throw new Error(`Profile ${profileId} is not embedded in the schema.`);
    const formulation = text(row.formulation, `${profileId} formulation`);
    if (!knownFormulations(profileId).has(formulation)) throw new Error(`${profileId} has no ${formulation} formulation.`);
    const role = text(row.role, `${profileId} field role`), key = fieldKeys[role];
    if (!key) throw new Error(`${role} is not a field role.`);
    const symbol = text(row.symbol, `${profileId} field symbol`);
    const unique = [profileId, formulation, role, symbol].join('\u0000');
    if (fieldSeen.has(unique)) throw new Error(`${profileId}/${formulation} repeats ${symbol} in ${role} fields.`);
    fieldSeen.add(unique);
    const unit = text(row.unit, `${symbol} unit`);
    const previousVariable = existingFields.get(unique) || {};
    const variable = { ...previousVariable, symbol, unit };
    delete variable.solverComponent;
    delete variable.zeroInDimensions;
    const solverFamily = String(row.solverFamily || '').trim();
    const solverAxis = String(row.solverAxis || '').trim();
    if (solverAxis && !solverFamily) throw new Error(`Enter a solver family for ${symbol} before an axis.`);
    if (solverFamily) {
      const component = { ...(object(previousVariable.solverComponent) ? previousVariable.solverComponent : {}),
        family: solverFamily };
      if (solverAxis) component.axis = solverAxis;
      else delete component.axis;
      variable.solverComponent = component;
    }
    const zeroInDimensions = numericList(row.zeroInDimensions, `${symbol} zero dimensions`, { integers: true });
    if (zeroInDimensions.length) variable.zeroInDimensions = zeroInDimensions;
    const list = metadataFor(profileId).fields.formulations[formulation][key];
    list.push(variable);
    generatedPaths.push([['$defs', source.collectionKey, profileId, source.annotation,
      'fields', 'formulations', formulation, key, list.length - 1], `${role} field variable`]);
  }
  for (const id of source.profileIds) {
    const metadata = metadataFor(id);
    for (const [formulation, definition] of Object.entries(metadata.fields?.formulations || {})) {
      if (!definition.fieldVariables?.length) throw new Error(`${id}/${formulation} needs at least one primary field.`);
    }
    metadata.materials ||= { name: '', properties: [] };
    metadata.materials.properties = [];
  }
  const materialSeen = new Set();
  for (const row of materialRows) {
    const profileId = text(row.profileId, 'a material profile ID');
    if (!known.has(profileId)) throw new Error(`Profile ${profileId} is not embedded in the schema.`);
    const key = text(row.key, `${profileId} material property key`);
    const unique = `${profileId}\u0000${key}`;
    if (materialSeen.has(unique)) throw new Error(`${profileId} repeats material property ${key}.`);
    materialSeen.add(unique);
    const representation = text(row.representation, `${key} representation`);
    if (!['expression', 'quantity'].includes(representation)) throw new Error(`${key} needs expression or quantity representation.`);
    const unit = text(row.unit, `${key} unit`);
    const defaultExpression = text(row.defaultExpression, `${key} default expression`);
    const previousProperty = existingMaterials.get(unique) || {};
    const property = {
      ...previousProperty,
      key, symbol: text(row.symbol, `${key} symbol`), label: text(row.label, `${key} label`), unit,
      representation, default: representation === 'quantity'
        ? { ...(object(previousProperty.default) ? previousProperty.default : {}),
          expression: defaultExpression, unit: String(row.defaultUnit || '').trim() || unit }
        : defaultExpression,
    };
    for (const controlled of ['optional', 'plottable', 'implementedValues', 'description']) delete property[controlled];
    for (const flag of ['optional', 'plottable']) {
      const value = triState(row[flag], `${key} ${flag}`);
      if (value !== undefined) property[flag] = value;
    }
    const implementedValues = numericList(row.implementedValues, `${key} implemented values`);
    if (implementedValues.length) property.implementedValues = implementedValues;
    if (String(row.description || '').trim()) property.description = String(row.description).trim();
    const list = metadataFor(profileId).materials.properties;
    list.push(property);
    generatedPaths.push([['$defs', source.collectionKey, profileId, source.annotation,
      'materials', 'properties', list.length - 1], 'material property template']);
  }
  const oldFacts = profileAnnotationFacts(document, source);
  const desired = new Set(), factWrites = [];
  for (const row of annotationFacts) {
    const ids = stringList(row.profileIds, 'Profile annotation fact profile IDs');
    if (!ids.length || ids.some(id => !known.has(id))) throw new Error('Choose embedded profile IDs for each annotation fact.');
    const annotation = text(row.annotation, 'a profile annotation key');
    if (!/^x-[A-Za-z0-9-]+$/.test(annotation) || annotation === source.annotation) {
      throw new Error('Use an x- annotation other than the scenario metadata annotation.');
    }
    const path = text(row.path, 'a profile annotation fact path');
    if (!factPathPattern.test(path)) throw new Error(`Enter a dot-separated fact path for ${annotation}.`);
    const repeatKeys = stringList(row.repeatKeys, 'Profile annotation repeat keys');
    if (path.includes('{key}') !== Boolean(repeatKeys.length)) {
      throw new Error(`${annotation}.${path} needs both a {key} segment and repeat keys, or neither.`);
    }
    const value = factValue(row);
    for (const id of ids) {
      for (const repeatKey of repeatKeys.length ? repeatKeys : ['']) {
        if (repeatKey && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(repeatKey)) {
          throw new Error(`Repeat key ${repeatKey} is not a path segment.`);
        }
        const resolvedPath = path.replaceAll('{profile}', id).replaceAll('{key}', repeatKey);
        const key = JSON.stringify([id, annotation, resolvedPath]);
        if (desired.has(key)) throw new Error(`${id} has two values for ${annotation}.${resolvedPath}.`);
        desired.add(key);
        factWrites.push({ id, annotation, path: resolvedPath, value });
      }
    }
  }
  for (const row of oldFacts) {
    for (const id of stringList(row.profileIds, 'Existing profile IDs')) {
      const resolvedPath = row.path.replaceAll('{profile}', id);
      if (desired.has(JSON.stringify([id, row.annotation, resolvedPath]))) continue;
      deleteFact(document.$defs[source.collectionKey][id][row.annotation], resolvedPath);
    }
  }
  for (const { id, annotation, path, value } of factWrites) {
    const schema = document.$defs[source.collectionKey][id];
    schema[annotation] ||= {};
    if (!object(schema[annotation])) throw new Error(`${id} ${annotation} must be an object.`);
    setFact(schema[annotation], path, value);
    generatedPaths.push([['$defs', source.collectionKey, id, annotation, ...path.split('.')],
      'profile annotation fact']);
  }
  for (const id of source.profileIds) changedPaths.push(`/$defs/${source.collectionKey}/${id}/${source.annotation}`);
  for (const { id, annotation } of factWrites) changedPaths.push(`/$defs/${source.collectionKey}/${id}/${annotation}`);
  return { changedPaths: [...new Set(changedPaths)], generatedPaths,
    fieldCount: fieldRows.length, materialCount: materialRows.length, factCount: factWrites.length };
}
