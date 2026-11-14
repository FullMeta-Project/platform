const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const clone = value => structuredClone(value);

const at = (value, path) => path.reduce((node, key) => node?.[key], value);

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;

const numberText = value => typeof value === 'number' ? String(value) : '';

function localRef(document, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  return at(document, parts);
}

function fieldType(document, declaration, seen = new Set()) {
  if (!isObject(declaration)) return '';
  if (typeof declaration.type === 'string') return declaration.type;
  if (Array.isArray(declaration.type) && declaration.type.length === 1) return declaration.type[0];
  if (isObject(declaration.properties)) return 'object';
  if (isObject(declaration.items) || Array.isArray(declaration.prefixItems)) return 'array';
  if (typeof declaration.$ref === 'string' && !seen.has(declaration.$ref)) {
    seen.add(declaration.$ref);
    return fieldType(document, localRef(document, declaration.$ref), seen);
  }
  if (Object.hasOwn(declaration, 'const')) return declaration.const === null ? 'null' : typeof declaration.const;
  return '';
}

const lowerKind = declaration => Object.hasOwn(declaration, 'exclusiveMinimum') ? 'exclusiveMinimum'
  : Object.hasOwn(declaration, 'minimum') ? 'minimum' : '';

const upperKind = declaration => Object.hasOwn(declaration, 'exclusiveMaximum') ? 'exclusiveMaximum'
  : Object.hasOwn(declaration, 'maximum') ? 'maximum' : '';

const extraKind = declaration => {
  const value = declaration.additionalProperties;
  if (value === undefined) return '';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (isObject(value) && Object.keys(value).every(key => ['type', 'title', 'description'].includes(key))
    && typeof value.type === 'string'
    && ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'].includes(value.type))
    return `type:${value.type}`;
  return 'custom';
};

export function fieldConstraintDraft(document, parentPath, key) {
  const parent = at(document, parentPath), declaration = parent?.properties?.[key];
  if (!isObject(declaration)) throw new Error(`Field ${key} is no longer declared.`);
  const kind = fieldType(document, declaration);
  const lower = lowerKind(declaration), upper = upperKind(declaration);
  const item = isObject(declaration.items) && !['oneOf', 'anyOf', 'allOf', 'if', 'then', 'else', 'not']
    .some(key => Object.hasOwn(declaration.items, key)) ? declaration.items : null;
  const itemKind = item ? fieldType(document, item) : '';
  const itemLower = item ? lowerKind(item) : '', itemUpper = item ? upperKind(item) : '';
  return {
    kind,
    required: Array.isArray(parent.required) && parent.required.includes(key),
    minLength: numberText(declaration.minLength), maxLength: numberText(declaration.maxLength),
    pattern: typeof declaration.pattern === 'string' ? declaration.pattern : '',
    lowerKind: lower, lowerValue: lower ? numberText(declaration[lower]) : '',
    upperKind: upper, upperValue: upper ? numberText(declaration[upper]) : '',
    minItems: numberText(declaration.minItems), maxItems: numberText(declaration.maxItems),
    uniqueItems: typeof declaration.uniqueItems === 'boolean' ? String(declaration.uniqueItems) : '',
    minProperties: numberText(declaration.minProperties), maxProperties: numberText(declaration.maxProperties),
    additionalProperties: extraKind(declaration),
    itemKind,
    itemType: typeof item?.type === 'string' ? item.type : '',
    itemMinLength: numberText(item?.minLength), itemMaxLength: numberText(item?.maxLength),
    itemPattern: typeof item?.pattern === 'string' ? item.pattern : '',
    itemLowerKind: itemLower, itemLowerValue: itemLower ? numberText(item[itemLower]) : '',
    itemUpperKind: itemUpper, itemUpperValue: itemUpper ? numberText(item[itemUpper]) : '',
  };
}

const supported = new Set(['required', 'minLength', 'maxLength', 'pattern', 'lowerKind', 'lowerValue',
  'upperKind', 'upperValue', 'minItems', 'maxItems', 'uniqueItems', 'minProperties',
  'maxProperties', 'additionalProperties', 'itemType', 'itemMinLength', 'itemMaxLength', 'itemPattern',
  'itemLowerKind', 'itemLowerValue', 'itemUpperKind', 'itemUpperValue']);

const typeColumns = {
  string: new Set(['minLength', 'maxLength', 'pattern']),
  number: new Set(['lowerKind', 'lowerValue', 'upperKind', 'upperValue']),
  integer: new Set(['lowerKind', 'lowerValue', 'upperKind', 'upperValue']),
  array: new Set(['minItems', 'maxItems', 'uniqueItems', 'itemType', 'itemMinLength', 'itemMaxLength',
    'itemPattern', 'itemLowerKind', 'itemLowerValue', 'itemUpperKind', 'itemUpperValue']),
  object: new Set(['minProperties', 'maxProperties', 'additionalProperties']),
};

const unsigned = (text, label) => {
  if (!/^\d+$/.test(text.trim())) throw new Error(`${label} must be a nonnegative whole number.`);
  const value = Number(text.trim());
  if (!Number.isSafeInteger(value)) throw new Error(`${label} is too large.`);
  return value;
};

const bound = (text, label) => {
  if (!text.trim() || !Number.isFinite(Number(text))) throw new Error(`${label} must be a finite number.`);
  return Number(text);
};

const setOptional = (target, key, text, parser, label) => {
  if (typeof text !== 'string') throw new Error(`${label} must be entered as text.`);
  if (text.trim()) target[key] = parser(text, label);
  else delete target[key];
};

const numericState = field => ({ lowerKind: lowerKind(field), upperKind: upperKind(field),
  lower: Object.hasOwn(field, 'exclusiveMinimum') ? field.exclusiveMinimum : field.minimum,
  upper: Object.hasOwn(field, 'exclusiveMaximum') ? field.exclusiveMaximum : field.maximum });

function validateConstraintPair(field, kind, label) {
  const minimum = field[`min${label}`], maximum = field[`max${label}`];
  if (minimum !== undefined && maximum !== undefined && minimum > maximum)
    throw new Error(`${kind}: minimum ${label.toLowerCase()} exceeds maximum ${label.toLowerCase()}.`);
}

function validateFieldConstraints(field, kind, key) {
  validateConstraintPair(field, key, 'Length');
  validateConstraintPair(field, key, 'Items');
  validateConstraintPair(field, key, 'Properties');
  if (typeof field.pattern === 'string') {
    try { new RegExp(field.pattern); }
    catch { throw new Error(`${key}: pattern is not a valid regular expression.`); }
  }
  const state = numericState(field);
  if (state.lowerKind && state.upperKind && (state.lower > state.upper
    || state.lower === state.upper && (state.lowerKind === 'exclusiveMinimum'
      || state.upperKind === 'exclusiveMaximum'))) {
    throw new Error(`${key}: numeric lower and upper bounds leave no valid value.`);
  }
  if (kind === 'integer' && state.lowerKind && state.upperKind) {
    const first = state.lowerKind === 'exclusiveMinimum' ? Math.floor(state.lower) + 1 : Math.ceil(state.lower);
    const last = state.upperKind === 'exclusiveMaximum' ? Math.ceil(state.upper) - 1 : Math.floor(state.upper);
    if (first > last) throw new Error(`${key}: no integer satisfies these bounds.`);
  }
}

export function schemaWithBulkFieldConstraints(document, targetPath, edits, generatedOwnerAtPath = null,
  candidateDocument = null) {
  if (!isObject(document) || !Array.isArray(targetPath) || !Array.isArray(edits) || !edits.length)
    throw new Error('Edit at least one field constraint before previewing.');
  const sourceParent = at(document, targetPath);
  if (!isObject(sourceParent?.properties)) throw new Error('Choose an object declaration with property fields.');
  const candidate = candidateDocument || clone(document), nextParent = at(candidate, targetPath);
  const seen = new Set();
  for (const { key, changes } of edits) {
    if (seen.has(key)) throw new Error(`Field ${key} was edited twice.`);
    seen.add(key);
    if (!Object.hasOwn(sourceParent.properties, key) || !isObject(changes))
      throw new Error(`Field ${key} changed after this table opened.`);
    const kind = fieldType(document, sourceParent.properties[key]);
    const allowed = typeColumns[kind] || new Set();
    const field = nextParent.properties[key];
    for (const column of Object.keys(changes)) {
      if (!supported.has(column) || column !== 'required' && !allowed.has(column))
        throw new Error(`${key}: ${column} does not apply to ${kind || 'unknown'} fields.`);
      if (column.startsWith('item') && column !== 'itemType') {
        const itemKind = changes.itemType || fieldConstraintDraft(document, targetPath, key).itemKind;
        const stringColumn = ['itemMinLength', 'itemMaxLength', 'itemPattern'].includes(column);
        if (kind !== 'array' || !(['string'].includes(itemKind) && stringColumn
            || ['number', 'integer'].includes(itemKind) && !stringColumn))
          throw new Error(`${key}: ${column} needs a simple text or numeric item schema.`);
      }
    }
    if (Object.hasOwn(changes, 'required')) {
      if (typeof changes.required !== 'boolean') throw new Error(`${key}: Required must be a checkbox value.`);
      const required = new Set(Array.isArray(nextParent.required) ? nextParent.required : []);
      if (changes.required) required.add(key); else required.delete(key);
      if (required.size || Object.hasOwn(sourceParent, 'required')) nextParent.required = [...required];
      else delete nextParent.required;
    }
    for (const column of ['minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties']) {
      if (Object.hasOwn(changes, column))
        setOptional(field, column, changes[column], unsigned, `${key} ${column}`);
    }
    if (Object.hasOwn(changes, 'pattern')) {
      if (typeof changes.pattern !== 'string') throw new Error(`${key}: pattern must be text.`);
      if (changes.pattern) field.pattern = changes.pattern; else delete field.pattern;
    }
    if (Object.hasOwn(changes, 'lowerKind') || Object.hasOwn(changes, 'lowerValue')) {
      const baseline = fieldConstraintDraft(document, targetPath, key);
      const selected = Object.hasOwn(changes, 'lowerKind') ? changes.lowerKind : baseline.lowerKind;
      const value = Object.hasOwn(changes, 'lowerValue') ? changes.lowerValue : baseline.lowerValue;
      if (!['', 'minimum', 'exclusiveMinimum'].includes(selected)) throw new Error(`${key}: choose a lower bound kind.`);
      delete field.minimum; delete field.exclusiveMinimum;
      if (selected) field[selected] = bound(value, `${key} lower bound`);
    }
    if (Object.hasOwn(changes, 'upperKind') || Object.hasOwn(changes, 'upperValue')) {
      const baseline = fieldConstraintDraft(document, targetPath, key);
      const selected = Object.hasOwn(changes, 'upperKind') ? changes.upperKind : baseline.upperKind;
      const value = Object.hasOwn(changes, 'upperValue') ? changes.upperValue : baseline.upperValue;
      if (!['', 'maximum', 'exclusiveMaximum'].includes(selected)) throw new Error(`${key}: choose an upper bound kind.`);
      delete field.maximum; delete field.exclusiveMaximum;
      if (selected) field[selected] = bound(value, `${key} upper bound`);
    }
    if (Object.hasOwn(changes, 'uniqueItems')) {
      if (changes.uniqueItems === '') delete field.uniqueItems;
      else if (['true', 'false'].includes(changes.uniqueItems)) field.uniqueItems = changes.uniqueItems === 'true';
      else throw new Error(`${key}: choose a Unique items value.`);
    }
    if (Object.hasOwn(changes, 'additionalProperties')) {
      const current = extraKind(sourceParent.properties[key]);
      if (current === 'custom') throw new Error(`${key}: complex extra property rules require the field editor.`);
      const choice = changes.additionalProperties;
      if (choice === '') delete field.additionalProperties;
      else if (choice === 'true' || choice === 'false') field.additionalProperties = choice === 'true';
      else if (/^type:(string|number|integer|boolean|object|array|null)$/.test(choice)) {
        const existing = sourceParent.properties[key].additionalProperties;
        field.additionalProperties = {
          ...(isObject(existing) ? clone(existing) : {}), type: choice.slice(5),
        };
      }
      else throw new Error(`${key}: choose an extra property rule.`);
    }
    if (Object.keys(changes).some(column => column.startsWith('item'))) {
      if (Object.hasOwn(changes, 'itemType')) {
        const itemType = changes.itemType;
        if (!['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'].includes(itemType))
          throw new Error(`${key}: choose an item type.`);
        const originalItems = sourceParent.properties[key].items;
        if (originalItems !== undefined && (!isObject(originalItems) || Object.keys(originalItems).length))
          throw new Error(`${key}: an existing item schema must keep its type; edit that schema directly.`);
        field.items = { ...(isObject(field.items) ? field.items : {}), type: itemType };
      }
      if (!isObject(field.items)) throw new Error(`${key}: choose an item type first.`);
      const item = field.items;
      for (const [column, schemaKey] of [['itemMinLength', 'minLength'], ['itemMaxLength', 'maxLength']]) {
        if (Object.hasOwn(changes, column))
          setOptional(item, schemaKey, changes[column], unsigned, `${key} item ${schemaKey}`);
      }
      if (Object.hasOwn(changes, 'itemPattern')) {
        if (typeof changes.itemPattern !== 'string') throw new Error(`${key}: item pattern must be text.`);
        if (changes.itemPattern) item.pattern = changes.itemPattern; else delete item.pattern;
      }
      const itemBaseline = fieldConstraintDraft(document, targetPath, key);
      for (const [side, inclusive, exclusive] of [
        ['Lower', 'minimum', 'exclusiveMinimum'], ['Upper', 'maximum', 'exclusiveMaximum']]) {
        const kindColumn = `item${side}Kind`, valueColumn = `item${side}Value`;
        if (!Object.hasOwn(changes, kindColumn) && !Object.hasOwn(changes, valueColumn)) continue;
        const selected = Object.hasOwn(changes, kindColumn) ? changes[kindColumn] : itemBaseline[kindColumn];
        const value = Object.hasOwn(changes, valueColumn) ? changes[valueColumn] : itemBaseline[valueColumn];
        if (!['', inclusive, exclusive].includes(selected)) throw new Error(`${key}: choose an item ${side.toLowerCase()} bound kind.`);
        delete item[inclusive]; delete item[exclusive];
        if (selected) item[selected] = bound(value, `${key} item ${side.toLowerCase()} bound`);
      }
      validateFieldConstraints(item, changes.itemType || itemBaseline.itemKind, `${key} item`);
    }
    validateFieldConstraints(field, kind, key);
  }
  return candidate;
}

const kindLabel = kind => ({ string: 'Text', integer: 'Integer', number: 'Number', array: 'Array',
  object: 'Object', boolean: 'Boolean', null: 'Null' })[kind] || 'Other';

const boundOptions = lower => [['', 'No bound'], [lower ? 'minimum' : 'maximum', 'Inclusive'],
  [lower ? 'exclusiveMinimum' : 'exclusiveMaximum', 'Exclusive']];

const extras = [['', 'Unspecified'], ['true', 'Allow any'], ['false', 'Forbid'],
  ...['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']
    .map(kind => [`type:${kind}`, `${kindLabel(kind)} values`])];

const templateSpec = (id, label, kind = 'text') => ({ id, label, kind });

function crossTemplateSpecs(kind, itemKind) {
  const specs = [templateSpec('required', 'Required', 'required')];
  if (kind === 'string') specs.push(templateSpec('minLength', 'Minimum length'),
    templateSpec('maxLength', 'Maximum length'), templateSpec('pattern', 'Pattern'));
  if (kind === 'number' || kind === 'integer') specs.push(templateSpec('lower', 'Lower bound', 'lower'),
    templateSpec('upper', 'Upper bound', 'upper'));
  if (kind === 'array') {
    specs.push(templateSpec('minItems', 'Minimum items'), templateSpec('maxItems', 'Maximum items'),
      templateSpec('uniqueItems', 'Unique items', 'unique'));
    if (itemKind === 'string') specs.push(templateSpec('itemMinLength', 'Minimum item length'),
      templateSpec('itemMaxLength', 'Maximum item length'), templateSpec('itemPattern', 'Item pattern'));
    if (itemKind === 'number' || itemKind === 'integer') specs.push(
      templateSpec('itemLower', 'Lower item bound', 'lower'),
      templateSpec('itemUpper', 'Upper item bound', 'upper'));
  }
  if (kind === 'object') specs.push(templateSpec('minProperties', 'Minimum properties'),
    templateSpec('maxProperties', 'Maximum properties'),
    templateSpec('additionalProperties', 'Extra properties', 'extra'));
  return specs;
}

function templateValue(draft, spec) {
  if (spec.kind === 'lower' || spec.kind === 'upper') {
    const prefix = spec.id.startsWith('item') ? `item${spec.kind[0].toUpperCase()}${spec.kind.slice(1)}` : spec.kind;
    const kind = draft[`${prefix}Kind`], value = draft[`${prefix}Value`];
    return kind ? `${kind} ${value}` : 'Unspecified';
  }
  const value = draft[spec.id];
  if (spec.kind === 'required') return value ? 'Required' : 'Optional';
  if (spec.kind === 'unique') return value === '' ? 'Unspecified' : value === 'true' ? 'Unique' : 'Duplicates allowed';
  if (spec.kind === 'extra') return value === '' ? 'Unspecified' : value === 'custom' ? 'Custom schema'
    : value === 'true' ? 'Allow any' : value === 'false' ? 'Forbid' : `${kindLabel(value.slice(5))} values`;
  return value === '' ? 'Unspecified' : value;
}

function templateChanges(rows) {
  const changes = {};
  for (const { spec, action, value } of rows) {
    const selected = action.value;
    if (selected === 'keep') continue;
    if (spec.kind === 'required') changes.required = selected === 'required';
    else if (spec.kind === 'lower' || spec.kind === 'upper') {
      const prefix = spec.id.startsWith('item') ? `item${spec.kind[0].toUpperCase()}${spec.kind.slice(1)}` : spec.kind;
      changes[`${prefix}Kind`] = selected === 'remove' ? '' : selected;
      changes[`${prefix}Value`] = selected === 'remove' ? '' : value.value;
    } else if (spec.kind === 'unique' || spec.kind === 'extra') {
      changes[spec.id] = selected === 'remove' ? '' : selected;
    } else {
      changes[spec.id] = selected === 'remove' ? '' : value.value;
      if (selected === 'set' && !value.value.trim())
        throw new Error(`${spec.label}: enter a value or choose Remove.`);
    }
  }
  return changes;
}

export {fieldType,typeColumns,kindLabel,boundOptions,extras,crossTemplateSpecs,templateValue,templateChanges};
