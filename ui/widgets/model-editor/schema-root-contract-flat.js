/** Reversible leaf rows for any JSON root extension value. */
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isContainer = value => isObject(value) || Array.isArray(value);
const encode = part => String(part).replace(/~/g, '~0').replace(/\//g, '~1');
const decode = part => part.replace(/~1/g, '/').replace(/~0/g, '~');
const kindOf = (value, key = '') => Array.isArray(value) ? 'array'
  : isObject(value) ? 'object'
    : value === null ? 'null'
      : typeof value === 'string' ? /[\r\n\t]/.test(value) ? 'escaped-string'
        : key === '$ref' || value.startsWith('#/') ? 'reference' : 'string'
        : typeof value;

export function flatContractRows(value) {
  if (!isContainer(value)) throw new Error('Flat rows require an object or array root extension.');
  const rows = [];
  const walk = (node, path = []) => {
    if (path.length) rows.push({
      path: path.map(encode).join('/'), type: kindOf(node, String(path.at(-1))),
      value: isContainer(node) || node === null ? ''
        : kindOf(node, String(path.at(-1))) === 'escaped-string'
          ? JSON.stringify(node).slice(1, -1) : String(node),
    });
    if (isContainer(node)) {
      for (const [key, child] of Object.entries(node)) walk(child, [...path, key]);
    }
  };
  walk(value);
  return rows;
}

export function parseContractPath(path) {
  const text = String(path || '').trim().replace(/^\//, '');
  if (!text) throw new Error('Each row needs a path relative to the selected extension.');
  const parts = text.split('/');
  if (parts.some(part => !part || /~(?![01])/.test(part))) {
    throw new Error(`Invalid path ${path}. Use / between keys and ~1 for a literal slash.`);
  }
  return parts.map(decode);
}

function valueForRow(row) {
  const text = String(row.value ?? '');
  switch (row.type) {
    case 'string': case 'reference': return text;
    case 'escaped-string':
      try { return JSON.parse(`"${text}"`); }
      catch { throw new Error(`${row.path}: enter escaped text using \\n for line breaks.`); }
    case 'number': {
      const number = Number(text.trim());
      if (!text.trim() || !Number.isFinite(number))
        throw new Error(`${row.path}: enter a finite number.`);
      return number;
    }
    case 'boolean':
      if (text !== 'true' && text !== 'false') throw new Error(`${row.path}: choose true or false.`);
      return text === 'true';
    case 'null': return null;
    case 'object': return {};
    case 'array': return [];
    default: throw new Error(`${row.path}: unsupported value type ${row.type}.`);
  }
}

function arrayIndex(part, length, path) {
  if (!/^(0|[1-9]\d*)$/.test(part) || !Number.isSafeInteger(Number(part)))
    throw new Error(`${path}: array positions must be whole numbers starting at 0.`);
  const index = Number(part);
  if (index > length) throw new Error(`${path}: add earlier array positions first.`);
  return index;
}

function put(owner, key, value, path) {
  const index = Array.isArray(owner) ? arrayIndex(key, owner.length, path) : key;
  const existing = Object.hasOwn(owner, index) ? owner[index] : undefined;
  if (existing !== undefined) {
    if (isContainer(existing) && isContainer(value)
      && Array.isArray(existing) === Array.isArray(value)) return existing;
    throw new Error(`${path}: a parent already has a different value or container type.`);
  }
  if (Array.isArray(owner) && index === owner.length) owner.push(value);
  else if (isObject(owner)) Object.defineProperty(owner, index, {
    value, enumerable: true, writable: true, configurable: true,
  });
  else owner[index] = value;
  return value;
}

export function contractFromFlatRows(rootKind, rows) {
  if (!['object', 'array'].includes(rootKind)) throw new Error('Flat rows require an object or array root extension.');
  const root = rootKind === 'array' ? [] : {};
  const seen = new Set();
  for (const row of rows) {
    const parts = parseContractPath(row.path);
    const identity = JSON.stringify(parts);
    if (seen.has(identity)) throw new Error(`${row.path}: this path appears twice.`);
    seen.add(identity);
    let owner = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index], next = parts[index + 1];
      const position = Array.isArray(owner) ? arrayIndex(key, owner.length, row.path) : key;
      let child = Object.hasOwn(owner, position) ? owner[position] : undefined;
      if (child === undefined) child = put(owner, key, /^(0|[1-9]\d*)$/.test(next) ? [] : {}, row.path);
      if (!isContainer(child)) throw new Error(`${row.path}: ${parts.slice(0, index + 1).join('/')} is a value, not a container.`);
      owner = child;
    }
    put(owner, parts.at(-1), valueForRow(row), row.path);
  }
  return root;
}
