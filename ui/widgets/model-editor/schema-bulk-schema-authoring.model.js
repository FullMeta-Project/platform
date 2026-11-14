const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const own = (value, key) => value !== null && typeof value === 'object' && Object.hasOwn(value, key);

const clone = value => structuredClone(value);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const types = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];

const pointer = path => `#${path.map(key => `/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`).join('')}`;

const at = (root, path) => path.reduce((node, key) => own(node, key) ? node[key] : undefined, root);

const put = (node, key, value) => Object.defineProperty(node, key, { value, writable: true, enumerable: true, configurable: true });

const beneath = (path, prefix) => prefix.every((key, index) => path[index] === key);

const typedPath = (document, path) => {
  let node = document;
  return path.map(part => {
    const key = Array.isArray(node) && /^(0|[1-9]\d*)$/.test(String(part)) ? Number(part) : String(part);
    node = own(node, key) ? node[key] : undefined;
    return key;
  });
};

const keywords = new Set(['type', 'title', 'description', '$ref', 'default', 'const', 'enum', 'required',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength',
  'pattern', 'format', 'minItems', 'maxItems', 'uniqueItems', 'minContains', 'maxContains',
  'minProperties', 'maxProperties', 'additionalProperties', 'readOnly', 'writeOnly', 'deprecated']);

const maps = new Set(['properties', 'patternProperties', '$defs', 'dependentSchemas']);

const singles = new Set(['items', 'additionalProperties', 'contains', 'propertyNames', 'if', 'then', 'else', 'not', 'contentSchema']);

const sequences = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);

function pathFromText(value) {
  if (typeof value !== 'string') throw new Error('Path must be a JSON Pointer string.');
  let text = value.trim();
  if (text.startsWith('#')) {
    try { text = decodeURIComponent(text.slice(1)); }
    catch { throw new Error('The JSON Pointer contains an invalid URI escape.'); }
  }
  if (!text) return [];
  if (!text.startsWith('/') || /~(?![01])/.test(text))
    throw new Error('Use a JSON Pointer such as #/properties/settings (root is #).');
  return text.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function schemaAt(document, path) {
  let node = document;
  for (let index = 0; index < path.length;) {
    const relation = path[index++];
    if (maps.has(relation)) {
      const key = path[index++];
      if (key === undefined || !object(node?.[relation]) || !own(node[relation], key))
        throw new Error(`Schema declaration ${pointer(path)} does not exist.`);
      node = node[relation][key];
    } else if (sequences.has(relation)) {
      const key = path[index++];
      if (!/^(0|[1-9]\d*)$/.test(key || '') || !Array.isArray(node?.[relation]) || !own(node[relation], key))
        throw new Error(`Schema branch ${pointer(path)} does not exist.`);
      node = node[relation][key];
    } else if (singles.has(relation) && own(node, relation)) node = node[relation];
    else throw new Error(`${pointer(path)} is not a schema declaration path.`);
  }
  if (!object(node)) throw new Error(`${pointer(path)} is not an editable object schema.`);
  return node;
}

function kindOf(node) {
  return typeof node.type === 'string' ? node.type : Array.isArray(node.type) ? node.type.join(' | ')
    : object(node.properties) || own(node, 'additionalProperties')
    ? 'object' : own(node, 'items') ? 'array' : '';
}

function relationAt(path) {
  if (path.length >= 2 && path.at(-2) === 'properties')
    return { parentPath: path.slice(0, -2), relation: 'properties', key: path.at(-1) };
  if (['items', 'additionalProperties'].includes(path.at(-1)))
    return { parentPath: path.slice(0, -1), relation: path.at(-1), key: path.at(-1) };
  return null;
}

function setRequired(document, path, value, touched) {
  if (typeof value !== 'boolean') throw new Error('Required status must be true or false.');
  const relation = relationAt(path);
  if (relation?.relation !== 'properties') throw new Error('Required status applies only to object properties.');
  const parent = schemaAt(document, relation.parentPath);
  if (!own(parent.properties, relation.key)) throw new Error('The property must exist before setting Required.');
  const next = Array.isArray(parent.required) ? [...parent.required] : [];
  const index = next.indexOf(relation.key);
  if (value && index < 0) next.push(relation.key);
  if (!value && index >= 0) next.splice(index, 1);
  if (next.length || own(parent, 'required')) parent.required = next;
  touched.push([...relation.parentPath, 'required']);
}

function validateSchema(node, name) {
  const declared = Array.isArray(node.type) ? node.type : node.type === undefined ? [] : [node.type];
  if (declared.some(type => !types.includes(type)) || Array.isArray(node.type) && (!declared.length || new Set(declared).size !== declared.length))
    throw new Error(`${name}/type: choose a JSON Schema type or a non-empty list of distinct types.`);
  const applicable = allowed => !declared.length || declared.some(type => allowed.includes(type));
  for (const key of ['minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties', 'minContains', 'maxContains']) {
    if (!own(node, key)) continue;
    if (!Number.isSafeInteger(node[key]) || node[key] < 0) throw new Error(`${name}/${key}: use a nonnegative whole number.`);
    const allowed = /Length$/.test(key) ? ['string'] : /Properties$/.test(key) ? ['object'] : ['array'];
    if (!applicable(allowed)) throw new Error(`${name}/${key}: this constraint does not apply to ${declared.join(' or ')}.`);
  }
  for (const suffix of ['Length', 'Items', 'Properties', 'Contains'])
    if (node[`min${suffix}`] !== undefined && node[`max${suffix}`] !== undefined && node[`min${suffix}`] > node[`max${suffix}`])
      throw new Error(`${name}: minimum ${suffix.toLowerCase()} exceeds maximum ${suffix.toLowerCase()}.`);
  for (const key of ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf']) {
    if (!own(node, key)) continue;
    if (typeof node[key] !== 'number' || !Number.isFinite(node[key]) || key === 'multipleOf' && node[key] <= 0)
      throw new Error(`${name}/${key}: use ${key === 'multipleOf' ? 'a positive' : 'a finite'} number.`);
    if (!applicable(['number', 'integer'])) throw new Error(`${name}/${key}: this constraint needs a numeric schema.`);
  }
  const lower = Math.max(node.minimum ?? -Infinity, node.exclusiveMinimum ?? -Infinity);
  const upper = Math.min(node.maximum ?? Infinity, node.exclusiveMaximum ?? Infinity);
  const lowerOpen = own(node, 'exclusiveMinimum') && node.exclusiveMinimum === lower;
  const upperOpen = own(node, 'exclusiveMaximum') && node.exclusiveMaximum === upper;
  if (lower > upper || lower === upper && (lowerOpen || upperOpen))
    throw new Error(`${name}: numeric bounds leave no valid value.`);
  if (declared.length === 1 && declared[0] === 'integer') {
    const first = lowerOpen ? Math.floor(lower) + 1 : Math.ceil(lower);
    const last = upperOpen ? Math.ceil(upper) - 1 : Math.floor(upper);
    if (first > last) throw new Error(`${name}: no integer satisfies these bounds.`);
  }
  if (own(node, 'pattern')) {
    if (typeof node.pattern !== 'string' || !applicable(['string'])) throw new Error(`${name}/pattern: a text schema needs a string pattern.`);
    try { new RegExp(node.pattern); } catch { throw new Error(`${name}/pattern: invalid regular expression.`); }
  }
  if (own(node, 'enum') && (!Array.isArray(node.enum) || !node.enum.length || new Set(node.enum.map(value => JSON.stringify(value))).size !== node.enum.length))
    throw new Error(`${name}/enum: use a non-empty JSON array with distinct values.`);
  if (own(node, 'required') && (!Array.isArray(node.required) || node.required.some(key => typeof key !== 'string') || new Set(node.required).size !== node.required.length))
    throw new Error(`${name}/required: use a JSON array of distinct property keys.`);
  for (const key of ['uniqueItems', 'readOnly', 'writeOnly', 'deprecated'])
    if (own(node, key) && typeof node[key] !== 'boolean') throw new Error(`${name}/${key}: use true or false.`);
  for (const key of ['title', 'description', '$ref', 'format'])
    if (own(node, key) && typeof node[key] !== 'string') throw new Error(`${name}/${key}: use a JSON string.`);
  for (const [key, value] of Object.entries(node)) {
    if (maps.has(key) && object(value)) for (const [childKey, child] of Object.entries(value)) {
      if (object(child)) validateSchema(child, `${name}/${key}/${childKey.replace(/~/g, '~0').replace(/\//g, '~1')}`);
      else if (typeof child !== 'boolean') throw new Error(`${name}/${key}: each entry must be a schema.`);
    }
    if (singles.has(key) && object(value)) validateSchema(value, `${name}/${key}`);
    if (singles.has(key) && !object(value) && typeof value !== 'boolean') throw new Error(`${name}/${key}: use a schema or boolean.`);
  }
}

function normalizeRow(row, number) {
  if (!object(row)) throw new Error(`Row ${number}: use an operation object.`);
  if (!['add', 'set', 'remove', 'required'].includes(row.op)) throw new Error(`Row ${number}: operation must be add, set, remove, or required.`);
  for (const key of Object.keys(row)) if (!['op', 'path', 'value', 'required'].includes(key))
    throw new Error(`Row ${number}: unknown column ${key}.`);
  const path = pathFromText(row.path);
  if (!path.length) throw new Error(`Row ${number}: target a schema field or keyword, not the whole document.`);
  if (row.op !== 'remove' && !own(row, 'value')) throw new Error(`Row ${number} ${pointer(path)}: value is required.`);
  if (own(row, 'required') && (typeof row.required !== 'boolean' || row.op !== 'add'))
    throw new Error(`Row ${number} ${pointer(path)}: optional required status is a boolean on add operations.`);
  return { op: row.op, path: pointer(path), ...(own(row, 'value') ? { value: clone(row.value) } : {}),
    ...(own(row, 'required') ? { required: row.required } : {}) };
}

export function schemaAuthoringRowsFromText(text, { format = 'json' } = {}) {
  if (!['json', 'tsv'].includes(format)) throw new Error('Choose JSON or TSV batch format.');
  let rows;
  if (format === 'json') {
    let value;
    try { value = JSON.parse(String(text).replace(/^\uFEFF/, '')); }
    catch (error) { throw new Error(`Batch JSON: ${error.message}`); }
    rows = Array.isArray(value) ? value : value?.rows;
  } else {
    rows = [];
    String(text).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, index) => {
      if (!line.trim() || line.trim().startsWith('#')) return;
      const cells = line.split('\t');
      if (/^(op|operation)$/i.test(cells[0]?.trim()) && /^path$/i.test(cells[1]?.trim())) return;
      if (cells.length < 2 || cells.length > 4) throw new Error(`TSV line ${index + 1}: use Operation, Path, Value JSON, Required.`);
      const [op, path, valueText = '', requiredText = ''] = cells.map(value => value.trim());
      const row = { op, path };
      if (valueText) {
        try { row.value = JSON.parse(valueText); }
        catch { throw new Error(`TSV line ${index + 1} ${path}: value must be valid JSON.`); }
      }
      if (requiredText) {
        if (!['true', 'false'].includes(requiredText)) throw new Error(`TSV line ${index + 1}: Required must be true or false.`);
        row.required = requiredText === 'true';
      }
      rows.push(row);
    });
  }
  if (!Array.isArray(rows) || !rows.length) throw new Error('Add at least one batch row.');
  return rows.map((row, index) => normalizeRow(row, index + 1));
}

export function schemaWithAuthoringBatch(document, rows, { targetPath = [] } = {}) {
  if (!object(document) || !Array.isArray(rows)) throw new Error('A schema document and row array are required.');
  const prefix = Array.isArray(targetPath) ? targetPath.map(String) : pathFromText(targetPath);
  schemaAt(document, prefix);
  const candidate = clone(document), changed = [], touched = [], inspect = new Map();
  for (const [index, input] of rows.entries()) {
    let row, path, relation;
    try {
      row = normalizeRow(input, index + 1); path = pathFromText(row.path); relation = relationAt(path);
      if (!beneath(path, prefix)) throw new Error(`The row targets another declaration; selected target is ${pointer(prefix)}.`);
      const before = JSON.stringify(at(candidate, path));
      const beforeRequired = relation?.relation === 'properties'
        ? JSON.stringify(at(candidate, relation.parentPath)?.required) : undefined;
      if (row.op === 'add') {
        if (!relation) throw new Error('Add targets an object property, array items, or map value schema.');
        const parent = schemaAt(candidate, relation.parentPath), expectedKind = relation.relation === 'items' ? 'array' : 'object';
        if (!(Array.isArray(parent.type) ? parent.type.includes(expectedKind) : kindOf(parent) === expectedKind))
          throw new Error(`${relation.relation} requires ${relation.relation === 'items' ? 'an array' : 'an object'} parent.`);
        if (!object(row.value) && typeof row.value !== 'boolean') throw new Error('A new field needs an object or boolean JSON Schema.');
        if (relation.relation === 'properties') {
          if (own(parent, 'properties') && !object(parent.properties)) throw new Error('Parent properties must be an object.');
          if (!own(parent, 'properties')) parent.properties = {};
          if (own(parent.properties, relation.key)) throw new Error('The field already exists; set individual keywords instead.');
          put(parent.properties, relation.key, clone(row.value));
        } else {
          if (own(parent, relation.relation)) throw new Error('This relation already has a schema or policy; edit it with the existing structure tool.');
          put(parent, relation.relation, clone(row.value));
        }
        if (own(row, 'required')) setRequired(candidate, path, row.required, touched);
        inspect.set(pointer(relation.parentPath), relation.parentPath);
      } else if (row.op === 'required') {
        setRequired(candidate, path, row.value, touched);
        inspect.set(pointer(relation.parentPath), relation.parentPath);
      } else {
        const schemaPath = path.slice(0, -1), keyword = path.at(-1);
        if (!keywords.has(keyword)) throw new Error(`${keyword} is not a supported constraint or type keyword. Add structure with an add row.`);
        const node = schemaAt(candidate, schemaPath);
        if (row.op === 'remove') {
          if (!own(node, keyword)) throw new Error('The keyword to remove does not exist.');
          delete node[keyword];
        } else put(node, keyword, clone(row.value));
        inspect.set(pointer(schemaPath), schemaPath);
      }
      if (before !== JSON.stringify(at(candidate, path)) || relation?.relation === 'properties'
        && beforeRequired !== JSON.stringify(at(candidate, relation.parentPath)?.required)) {
        touched.push(path); changed.push({ row: index + 1, ...row, parent: pointer(relation?.parentPath || path.slice(0, -1)),
          relation: row.op === 'required' ? 'required' : relation?.relation || path.at(-1) });
      }
    } catch (error) {
      throw new Error(`Row ${index + 1} ${path ? pointer(path) : input?.path || '(missing path)'}${relation ? ` (parent ${pointer(relation.parentPath)}, relation ${relation.relation})` : ''}: ${error.message}`);
    }
  }
  for (const [name, path] of inspect) {
    try { validateSchema(schemaAt(candidate, path), name); }
    catch (error) {
      const row = changed.findLast(entry => beneath(pathFromText(entry.path), path));
      throw new Error(`Row ${row?.row || rows.length} ${row?.path || name}: ${error.message}`);
    }
  }
  return { document: candidate, changes: changed,
    allowGeneratedSubtrees: [...new Map(touched.map(path => {
      const typed = typedPath(candidate, path); return [JSON.stringify(typed), typed];
    })).values()] };
}

const modeFor = row => ['add', 'required'].includes(row.op) || pathFromText(row.path).at(-1) === 'type' ? 'structure' : 'constraints';

export {pathFromText,pointer,types,keywords,modeFor,kindOf,normalizeRow,beneath};
