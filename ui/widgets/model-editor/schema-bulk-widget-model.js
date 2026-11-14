import {
  FIELD_UI_BEHAVIOR_KEY, UI_BEHAVIOR_FORMAT, fieldUiBehavior, writeFieldUiBehavior,
} from "../../annotation-language.js";

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const clone = value => structuredClone(value);

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const at = (value, path) => path.reduce((node, key) => node?.[key], value);

const pointer = path => `#/${path.map(key => String(key).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;

const schemaConditionKeywords = new Set(['if', 'not']);

const rootSchemaMetadataProperties = new Set(['application', 'metadata', 'modelFormat', 'x-fullmeta-schema']);

export function isExcludedWidgetGuessPath(path) {
  const underCondition = path.some((part, index) => schemaConditionKeywords.has(String(part))
    && !['$defs', 'properties', 'patternProperties'].includes(String(path[index - 1])));
  const rootMetadata = path[0] === 'properties' && rootSchemaMetadataProperties.has(String(path[1]));
  return underCondition || rootMetadata;
}

export function schemaDeclarationPaths(schema) {
  const paths = [];
  const visit = (node, path, depth = 0) => {
    if (!isObject(node) || depth > 32) return;
    if (path.length) paths.push(path);
    for (const key of ['$defs', 'properties', 'patternProperties']) {
      if (!isObject(node[key])) continue;
      for (const [name, child] of Object.entries(node[key]))
        visit(child, [...path, key, name], depth + 1);
    }
    for (const key of ['items', 'additionalProperties', 'not', 'if', 'then', 'else'])
      visit(node[key], [...path, key], depth + 1);
    for (const key of ['oneOf', 'anyOf', 'allOf', 'prefixItems']) {
      if (Array.isArray(node[key])) node[key].forEach((child, index) =>
        visit(child, [...path, key, index], depth + 1));
    }
  };
  visit(schema, []);
  return paths;
}

export function widgetType(field, catalog) {
  const envelope = fieldUiBehavior(field);
  if (typeof envelope?.payload?.widget?.type === 'string') return envelope.payload.widget.type;
  if (typeof field?.['x-fullmeta-ui']?.widget === 'string') return field['x-fullmeta-ui'].widget;
  for (const entry of catalog?.types || []) {
    const name = entry.widget || (entry.widgets?.length === 1 ? entry.widgets[0] : null);
    if (name && isObject(field?.[entry.key])) return name;
  }
  return '';
}

export function widgetSettings(field, catalog) {
  const envelope = fieldUiBehavior(field);
  if (isObject(envelope?.payload?.widget?.settings)) return envelope.payload.widget.settings;
  const type = widgetType(field, catalog);
  const key = (catalog?.types || []).find(entry =>
    (entry.widget || (entry.widgets?.length === 1 ? entry.widgets[0] : null)) === type)?.key;
  return isObject(field?.[key]) ? field[key] : {};
}

export function resolveLocalSchema(schema, declaration) {
  let resolved = declaration;
  const seen = new Set();
  for (let depth = 0; depth < 16 && isObject(resolved); depth++) {
    const reference = resolved.$ref;
    if (typeof reference !== 'string' || !reference.startsWith('#/') || seen.has(reference)) break;
    seen.add(reference);
    const encodedParts = reference.slice(2).split('/');
    if (encodedParts.some(part => /~(?![01])/.test(part))) break;
    const parts = encodedParts.map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
    const target = at(schema, parts);
    if (!isObject(target)) break;
    resolved = { ...target, ...Object.fromEntries(Object.entries(resolved).filter(([key]) => key !== '$ref')) };
  }
  return { schema: resolved };
}

export function schemaType(declaration) {
  if (typeof declaration?.type === 'string') return declaration.type;
  if (Array.isArray(declaration?.type)) return declaration.type;
  if (isObject(declaration?.properties) || Object.hasOwn(declaration || {}, 'additionalProperties')) return 'object';
  if (Object.hasOwn(declaration || {}, 'items') || Array.isArray(declaration?.prefixItems)) return 'array';
  return '';
}

const hasSchemaType = (declaration, expected) => {
  const type = schemaType(declaration);
  return type === expected || Array.isArray(type) && type.includes(expected);
};

export function isScalarInputSchema(declaration) {
  const type = schemaType(declaration);
  const scalarTypes = new Set(['string', 'number', 'integer', 'boolean', 'null']);
  if (Array.isArray(type)) return type.some(value => value !== 'null') && type.every(value => scalarTypes.has(value));
  if (type) return type !== 'null' && scalarTypes.has(type);
  const scalar = value => value === null || ['string', 'number', 'boolean'].includes(typeof value);
  if (Object.hasOwn(declaration || {}, 'const')) return declaration.const !== null && scalar(declaration.const);
  return Array.isArray(declaration?.enum) && declaration.enum.some(value => value !== null)
    && declaration.enum.every(scalar);
}

export function hasQuantityEvidence(schema, declaration, catalog) {
  if (!isObject(declaration)) return false;
  if (widgetType(declaration, catalog) === 'quantity'
    || isObject(declaration['x-fullmeta-quantityValidation'])) return true;
  const resolved = resolveLocalSchema(schema, declaration);
  const properties = resolved.schema?.properties;
  return isObject(properties) && Object.hasOwn(properties, 'expression') && Object.hasOwn(properties, 'unit');
}

export function isQuantityVectorSchema(schema, declaration, catalog) {
  const resolved = resolveLocalSchema(schema, declaration).schema;
  if (!hasSchemaType(resolved, 'array')) return false;
  const itemSchemas = Array.isArray(resolved.prefixItems) ? resolved.prefixItems
    : isObject(resolved.items) ? [resolved.items] : [];
  if (!itemSchemas.length || !itemSchemas.every(item => hasQuantityEvidence(schema, item, catalog))) return false;
  if (Array.isArray(resolved.prefixItems) && resolved.prefixItems.length < 2) return false;
  return resolved.minItems === undefined || resolved.minItems >= 2;
}

export function guessedFieldWidget(schema, declaration, catalog) {
  const resolved = resolveLocalSchema(schema, declaration).schema;
  const type = schemaType(resolved);
  const modelReference = declaration?.['x-fullmeta-modelReference'];
  if (isObject(modelReference) && modelReference.keyReference !== true
    && !hasSchemaType(resolved, 'object') && !hasSchemaType(resolved, 'array'))
    return 'referenceSelector';
  if (isQuantityVectorSchema(schema, declaration, catalog)) return 'quantityVector';
  if (!hasSchemaType(resolved, 'array') && hasQuantityEvidence(schema, declaration, catalog)) return 'quantity';
  if (isScalarInputSchema(resolved)) return 'valueControl';
  return '';
}

export function fieldWithWidgetType(field, type, catalog) {
  if (!isObject(field)) throw new Error('Choose a field declaration.');
  if (type === widgetType(field, catalog)) return clone(field);
  const normalized = writeFieldUiBehavior(clone(field), { context: 'projectEditing' });
  const existing = fieldUiBehavior(normalized);
  const payload = isObject(existing?.payload) ? clone(existing.payload) : {};
  if (type) payload.widget = { type, settings: {} };
  else delete payload.widget;
  if (Object.keys(payload).length) {
    normalized[FIELD_UI_BEHAVIOR_KEY] = {
      ...(existing || {}), format: UI_BEHAVIOR_FORMAT,
      target: { ...(existing?.target || {}), kind: 'field' },
      context: existing?.context || 'projectEditing', payload,
    };
  } else delete normalized[FIELD_UI_BEHAVIOR_KEY];
  return normalized;
}

export function schemaWithBulkWidgetEdits(schema, edits) {
  const candidate = clone(schema);
  for (const { path, declaration } of edits) {
    const parent = at(candidate, path.slice(0, -1)), key = path.at(-1);
    const isIndex = Array.isArray(parent) && /^(0|[1-9]\d*)$/.test(String(key));
    const current = isIndex ? parent[Number(key)] : parent?.[key];
    if ((!isObject(parent) && !Array.isArray(parent)) || !isObject(current) || !isObject(declaration)) {
      throw new Error(`Field ${pointer(path)} changed after the table opened.`);
    }
    if (Array.isArray(parent) && !isIndex) throw new Error(`Field ${pointer(path)} is not a valid array entry.`);
    parent[key] = clone(declaration);
  }
  return candidate;
}

export function settingPointerParts(pointer) {
  if (pointer === '#') return [];
  if (typeof pointer !== 'string' || !pointer.startsWith('#/'))
    throw new Error('A widget setting path must be # or a JSON pointer such as #/dataSource/scope.');
  return pointer.slice(2).split('/').map(part => {
    if (/~(?![01])/.test(part)) throw new Error(`Invalid JSON pointer escape in ${pointer}.`);
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (['__proto__', 'prototype', 'constructor'].includes(key))
      throw new Error('Widget setting paths cannot use prototype keys.');
    return key;
  });
}

export function settingPathEdit(settings, parts, operation, value) {
  if (!parts.length) {
    if (operation === 'remove') return {};
    if (!isObject(value)) throw new Error('Replacing all widget settings requires a JSON object.');
    return clone(value);
  }
  let parent = settings;
  for (const part of parts.slice(0, -1)) {
    if (Array.isArray(parent)) {
      if (!/^\d+$/.test(part)) throw new Error(`Array path segment ${part} must be a nonnegative index.`);
      const index = Number(part);
      if (index >= parent.length) {
        if (operation === 'remove') return settings;
        if (index !== parent.length) throw new Error(`Array index ${part} skips an item.`);
        parent.push({});
      }
      if (!isObject(parent[index]) && !Array.isArray(parent[index])) {
        if (operation === 'remove') return settings;
        throw new Error(`Widget setting path crosses a non-object value at ${part}.`);
      }
      parent = parent[index];
      continue;
    }
    if (!isObject(parent)) throw new Error(`Widget setting path crosses a non-object value at ${part}.`);
    if (!Object.hasOwn(parent, part)) {
      if (operation === 'remove') return settings;
      parent[part] = {};
    }
    if (!isObject(parent[part]) && !Array.isArray(parent[part]))
      throw new Error(`Widget setting path crosses a non-object value at ${part}.`);
    parent = parent[part];
  }
  const key = parts.at(-1);
  if (Array.isArray(parent)) {
    if (key === '-' && operation === 'set') { parent.push(clone(value)); return settings; }
    if (!/^\d+$/.test(key)) throw new Error(`Array path segment ${key} must be a nonnegative index.`);
    const index = Number(key);
    if (operation === 'remove') {
      if (index < parent.length) parent.splice(index, 1);
      return settings;
    }
    if (index > parent.length) throw new Error(`Array index ${key} skips an item.`);
    if (index === parent.length) parent.push(clone(value));
    else parent[index] = clone(value);
    return settings;
  }
  if (!isObject(parent)) throw new Error('Widget setting path must end inside an object.');
  if (operation === 'remove') delete parent[key];
  else parent[key] = clone(value);
  return settings;
}

export function fieldWithWidgetSettingEdit(field, widget, operation, path, value, catalog, profiles) {
  let next = widget ? fieldWithWidgetType(field, widget, catalog) : clone(field);
  const type = widgetType(next, catalog);
  if (!type) throw new Error('Choose a widget before importing its settings.');
  const normalized = writeFieldUiBehavior(next, { context: 'projectEditing' });
  const behavior = fieldUiBehavior(normalized);
  if (!behavior) throw new Error('Could not prepare this field UI behavior for editing.');
  const payload = isObject(behavior.payload) ? clone(behavior.payload) : {};
  const widgetConfig = isObject(payload.widget) ? clone(payload.widget) : { type, settings: {} };
  const settings = isObject(widgetConfig.settings) ? clone(widgetConfig.settings) : {};
  widgetConfig.type = type;
  widgetConfig.settings = settingPathEdit(settings, path, operation, value);
  payload.widget = widgetConfig;
  normalized[FIELD_UI_BEHAVIOR_KEY] = { ...behavior, payload };
  next = normalized;
  return next;
}

export function widgetOptions(profiles, catalog, discovered) {
  if (discovered) return [['', 'Default field editor'], ...discovered.widgets.filter(widget => widget.category === 'field')
    .map(widget => [widget.id, `${widget.label} · ${widget.catalogLabel}${profiles[widget.id]?.editor === 'annotation' ? '' : ' · structured settings'}`])];
  const names = Object.keys(profiles || {}).filter(name => profiles[name]?.editor === 'annotation');
  const labels = new Map((catalog?.types || []).map(entry => [
    entry.widget || (entry.widgets?.length === 1 ? entry.widgets[0] : null), entry.label,
  ]));
  return [['', 'Default field editor'], ...names.sort().map(name => [name, labels.get(name) || name])];
}