/** Application-neutral authoring of object field conditions and map value schemas. */
import { contractFromFlatRows, flatContractRows } from './schema-root-contract-flat.js';
import { FIELD_UI_BEHAVIOR_KEY, UI_BEHAVIOR_FORMAT, fieldUiBehaviorIssue } from "../../annotation-language.js";

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const at = (source, path) => path.reduce((value, key) => value?.[key], source);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;







/** Follow only JSON Schema slots, including namespaces inside $defs. */
function objectDeclarations(schema) {
  const found = [], visited = new Set();
  const schemaKeys = new Set(['$ref', '$defs', 'type', 'properties', 'patternProperties',
    'items', 'additionalProperties', 'oneOf', 'anyOf', 'allOf', 'if', 'then', 'else',
    'not', 'const', 'enum', 'required', 'title', 'description']);
  function visit(node, path, depth = 0, definition = false) {
    if (!isObject(node) || depth > 32 || visited.has(node)) return;
    visited.add(node);
    if (node.type === 'object' || isObject(node.properties))
      found.push({ path, label: node.title || path.at(-1) || 'Schema root' });
    for (const key of ['$defs', 'properties', 'patternProperties']) {
      if (!isObject(node[key])) continue;
      for (const [name, child] of Object.entries(node[key]))
        visit(child, [...path, key, name], depth + 1, key === '$defs');
    }
    for (const key of ['items', 'additionalProperties', 'if', 'then', 'else', 'not'])
      if (isObject(node[key])) visit(node[key], [...path, key], depth + 1);
    for (const key of ['oneOf', 'anyOf', 'allOf', 'prefixItems'])
      if (Array.isArray(node[key])) node[key].forEach((child, index) =>
        visit(child, [...path, key, index], depth + 1));
    if (definition && Object.keys(node).length && Object.keys(node).every(key =>
      !schemaKeys.has(key) && !key.startsWith('x-') && isObject(node[key]))) {
      for (const [key, child] of Object.entries(node))
        visit(child, [...path, key], depth + 1, true);
    }
  }
  visit(schema, []);
  return found;
}

const onlyKeys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));
const scalarKind = value => value === null ? 'null' : typeof value === 'number'
  ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'string' ? 'string' : '';
const scalarText = value => value === null ? '' : String(value);
const scalarValue = (kind, text, label) => {
  if (kind === 'null') return null;
  if (kind === 'string') return text;
  if (kind === 'boolean') {
    if (!['true', 'false'].includes(text.trim())) throw new Error(`${label} needs true or false.`);
    return text.trim() === 'true';
  }
  if (kind === 'number') {
    if (!text.trim() || !Number.isFinite(Number(text))) throw new Error(`${label} needs a finite number.`);
    return Number(text);
  }
  throw new Error(`${label} has an unknown value type.`);
};
const referenceExists = (document, value) => {
  if (typeof value !== 'string' || !value.startsWith('#/')) return false;
  const path = value.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  return at(document, path) !== undefined;
};
const optionalCount = (text, label) => {
  if (!String(text).trim()) return undefined;
  const number = Number(text);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${label} needs a non-negative whole number.`);
  return number;
};
const optionalNumber = (text, label) => {
  if (!String(text).trim()) return undefined;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error(`${label} needs a finite number.`);
  return number;
};

function conditionalDraft(schema) {
  if (!isObject(schema) || !onlyKeys(schema, ['if', 'then'])
    || !isObject(schema.if) || !isObject(schema.then)
    || !onlyKeys(schema.if, ['required', 'properties'])
    || !Array.isArray(schema.if.required) || schema.if.required.length !== 1)
    return { kind: 'custom', source: clone(schema) };
  const when = schema.if.required[0];
  if (typeof when !== 'string' || !when) return { kind: 'custom', source: clone(schema) };
  let comparison = 'present', valueType = 'string', value = '';
  if (schema.if.properties !== undefined) {
    if (!isObject(schema.if.properties) || Object.keys(schema.if.properties).length !== 1
      || !isObject(schema.if.properties[when])
      || !onlyKeys(schema.if.properties[when], ['const'])
      || !Object.hasOwn(schema.if.properties[when], 'const'))
      return { kind: 'custom', source: clone(schema) };
    comparison = 'equals';
    valueType = scalarKind(schema.if.properties[when].const);
    if (!valueType) return { kind: 'custom', source: clone(schema) };
    value = scalarText(schema.if.properties[when].const);
  }
  let effect, target;
  if (onlyKeys(schema.then, ['required']) && Array.isArray(schema.then.required)
    && schema.then.required.length === 1) {
    effect = 'require'; target = schema.then.required[0];
  } else if (onlyKeys(schema.then, ['not']) && isObject(schema.then.not)
    && onlyKeys(schema.then.not, ['required'])
    && Array.isArray(schema.then.not.required) && schema.then.not.required.length === 1) {
    effect = 'prohibit'; target = schema.then.not.required[0];
  } else return { kind: 'custom', source: clone(schema) };
  if (typeof target !== 'string' || !target) return { kind: 'custom', source: clone(schema) };
  return { kind: 'guided', when, comparison, valueType, value, effect, target };
}

function simpleValueDraft(schema) {
  if (!isObject(schema) || !onlyKeys(schema,
    ['type', '$ref', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum'])) return null;
  const kind = schema.type || (schema.$ref ? 'reference' : '');
  if (!['string', 'number', 'integer', 'boolean', 'null', 'reference'].includes(kind)) return null;
  if (schema.$ref !== undefined && typeof schema.$ref !== 'string') return null;
  if (kind === 'reference' && !schema.$ref) return null;
  if (['boolean', 'null', 'reference'].includes(kind)
    && ['minLength', 'maxLength', 'pattern', 'minimum', 'maximum'].some(key => key in schema)) return null;
  if (kind !== 'string' && ['minLength', 'maxLength', 'pattern'].some(key => key in schema)) return null;
  if (!['number', 'integer'].includes(kind) && ['minimum', 'maximum'].some(key => key in schema)) return null;
  return { kind, reference: schema.$ref || '', minimum: schema.minimum ?? schema.minLength ?? '',
    maximum: schema.maximum ?? schema.maxLength ?? '', pattern: schema.pattern || '' };
}

function widgetAnnotationDraft(schema) {
  if (!isObject(schema) || !Object.hasOwn(schema, FIELD_UI_BEHAVIOR_KEY))
    return { mode: 'none', source: null, type: '', settingsRows: [] };
  const behavior = schema[FIELD_UI_BEHAVIOR_KEY];
  if (fieldUiBehaviorIssue(behavior)) return null;
  const widget = behavior.payload.widget;
  return { mode: widget ? 'widget' : 'none', source: clone(behavior),
    type: widget?.type || '', settingsRows: widget ? flatContractRows(widget.settings) : [] };
}

function withWidgetAnnotation(schema, draft, label) {
  if (!draft) return schema;
  const behavior = draft.source ? clone(draft.source) : {
    format: UI_BEHAVIOR_FORMAT, target: { kind: 'field' },
    context: 'projectEditing', payload: {},
  };
  if (draft.mode === 'widget') {
    const type = String(draft.type || '');
    if (!type.trim()) throw new Error(`${label} needs a widget type.`);
    const rows = draft.settingsRows.filter(row => String(row.path || '').trim());
    const settings = contractFromFlatRows('object', rows);
    const prior = isObject(behavior.payload.widget) ? behavior.payload.widget : {};
    behavior.payload.widget = { ...prior, type, settings };
  } else if (draft.mode === 'none') delete behavior.payload.widget;
  else throw new Error(`${label} has an unknown widget annotation mode.`);
  if (Object.keys(behavior.payload).length) schema[FIELD_UI_BEHAVIOR_KEY] = behavior;
  return schema;
}

function valueOptionDraft(schema) {
  const ui = widgetAnnotationDraft(schema);
  if (!ui) return { kind: 'custom', source: clone(schema) };
  const declaration = isObject(schema) ? { ...schema } : schema;
  if (isObject(declaration)) delete declaration[FIELD_UI_BEHAVIOR_KEY];
  const simple = simpleValueDraft(declaration);
  if (simple) return { ...simple, shape: simple.kind, ui };
  if (isObject(declaration) && declaration.type === 'object'
    && onlyKeys(declaration, ['type', 'properties', 'required', 'additionalProperties'])
    && isObject(declaration.properties)
    && (declaration.additionalProperties === undefined || typeof declaration.additionalProperties === 'boolean')
    && (declaration.required === undefined || Array.isArray(declaration.required))) {
    const fields = Object.entries(declaration.properties).map(([key, fieldDeclaration]) => {
      const draft = simpleValueDraft(fieldDeclaration);
      return draft ? { key, ...draft, required: declaration.required?.includes(key) || false } : null;
    });
    if (fields.every(Boolean) && (declaration.required || []).every(key => key in declaration.properties))
      return { kind: 'object', shape: 'object', fields,
        closed: declaration.additionalProperties === false, ui };
  }
  return { kind: 'custom', source: clone(schema) };
}

function mapDraft(schema) {
  const value = schema.additionalProperties;
  if (value === undefined) return { mode: 'unspecified', wrapped: false, options: [] };
  if (value === false) return { mode: 'forbid', wrapped: false, options: [] };
  if (value === true) return { mode: 'allow', wrapped: false, options: [] };
  if (!isObject(value)) return { mode: 'custom', source: clone(value), options: [] };
  if (onlyKeys(value, ['oneOf']) && Array.isArray(value.oneOf))
    return { mode: 'schema', wrapped: true, options: value.oneOf.map(valueOptionDraft) };
  return { mode: 'schema', wrapped: false, options: [valueOptionDraft(value)] };
}

function makeSimpleValue(document, draft, label) {
  const schema = {};
  if (!['string', 'number', 'integer', 'boolean', 'null', 'reference'].includes(draft.kind))
    throw new Error(`${label} needs a value shape.`);
  if (draft.reference) {
    if (!referenceExists(document, draft.reference))
      throw new Error(`${label} reference must point to an existing local schema.`);
    schema.$ref = draft.reference;
  }
  if (draft.kind === 'reference') {
    if (!schema.$ref) throw new Error(`${label} needs a local schema reference.`);
    return schema;
  }
  schema.type = draft.kind;
  if (draft.kind === 'string') {
    const min = optionalCount(draft.minimum, `${label} minimum length`);
    const max = optionalCount(draft.maximum, `${label} maximum length`);
    if (min !== undefined) schema.minLength = min;
    if (max !== undefined) schema.maxLength = max;
    if (min !== undefined && max !== undefined && min > max)
      throw new Error(`${label} minimum length exceeds maximum length.`);
    if (draft.pattern) {
      try { new RegExp(draft.pattern); } catch { throw new Error(`${label} pattern is not a regular expression.`); }
      schema.pattern = draft.pattern;
    }
  } else if (['number', 'integer'].includes(draft.kind)) {
    const min = optionalNumber(draft.minimum, `${label} minimum`);
    const max = optionalNumber(draft.maximum, `${label} maximum`);
    if (min !== undefined) schema.minimum = min;
    if (max !== undefined) schema.maximum = max;
    if (min !== undefined && max !== undefined && min > max)
      throw new Error(`${label} minimum exceeds maximum.`);
  }
  return schema;
}

function makeValueOption(document, option, index) {
  if (option.kind === 'custom') return clone(option.source);
  if (option.shape !== 'object') return withWidgetAnnotation(
    makeSimpleValue(document, option, `Value option ${index + 1}`), option.ui,
    `Value option ${index + 1}`);
  const properties = {}, required = [], seen = new Set();
  if (!option.fields.length) throw new Error(`Value option ${index + 1} needs at least one object field.`);
  for (const [fieldIndex, row] of option.fields.entries()) {
    const key = row.key.trim();
    if (!key || seen.has(key)) throw new Error(`Value option ${index + 1} field ${fieldIndex + 1} needs a unique key.`);
    seen.add(key);
    properties[key] = makeSimpleValue(document, row, `Value option ${index + 1} field ${key}`);
    if (row.required) required.push(key);
  }
  return withWidgetAnnotation({ type: 'object', properties,
    ...(required.length ? { required } : {}),
    ...(option.closed ? { additionalProperties: false } : {}) },
  option.ui, `Value option ${index + 1}`);
}

/** Apply only guided object rules, leaving every unrelated schema field untouched. */
export function schemaWithObjectRules(document, ownerPath, changes, generatedOwnerAtPath = null) {
  const owner = at(document, ownerPath);
  if (!isObject(owner) || !(owner.type === 'object' || isObject(owner.properties)))
    throw new Error('Choose an object declaration.');
  if (!Object.hasOwn(changes, 'conditions') && !Object.hasOwn(changes, 'map'))
    throw new Error('Edit a condition or an object-map rule before previewing.');
  const candidate = clone(document), next = at(candidate, ownerPath);
  if (Object.hasOwn(changes, 'conditions')) {
    if (generatedOwnerAtPath?.(document, [...ownerPath, 'allOf']))
      throw new Error('These conditional clauses are generated by another guided input.');
    const clauses = [];
    for (const [index, row] of changes.conditions.entries()) {
      if (row.kind === 'custom') { clauses.push(clone(row.source)); continue; }
      const when = row.when.trim(), target = row.target.trim();
      if (!when || !target) throw new Error(`Condition row ${index + 1} needs both field keys.`);
      if (!['present', 'equals'].includes(row.comparison)
        || !['require', 'prohibit'].includes(row.effect))
        throw new Error(`Condition row ${index + 1} needs a supported condition and effect.`);
      const whenSchema = { required: [when] };
      if (row.comparison === 'equals') whenSchema.properties = {
        [when]: { const: scalarValue(row.valueType, row.value, `Condition row ${index + 1}`) },
      };
      clauses.push({ if: whenSchema,
        then: row.effect === 'require' ? { required: [target] } : { not: { required: [target] } } });
    }
    if (clauses.length) next.allOf = clauses; else delete next.allOf;
  }
  if (Object.hasOwn(changes, 'map')) {
    if (generatedOwnerAtPath?.(document, [...ownerPath, 'additionalProperties']))
      throw new Error('This object-map value rule is generated by another guided input.');
    const map = changes.map;
    if (map.mode === 'unspecified') delete next.additionalProperties;
    else if (map.mode === 'forbid') next.additionalProperties = false;
    else if (map.mode === 'allow') next.additionalProperties = true;
    else if (map.mode === 'schema') {
      if (!map.options.length) throw new Error('Add at least one value option for object-map keys.');
      const options = map.options.map((option, index) => makeValueOption(candidate, option, index));
      next.additionalProperties = map.wrapped || options.length > 1 ? { oneOf: options } : options[0];
    } else if (map.mode === 'custom') next.additionalProperties = clone(map.source);
    else throw new Error('Choose an object-map rule.');
  }
  if (same(document, candidate)) throw new Error('The object rules are unchanged.');
  return candidate;
}


export { objectDeclarations, conditionalDraft, mapDraft };
export { createObjectRulesDialog } from './schema-object-rules-dialog.js';
