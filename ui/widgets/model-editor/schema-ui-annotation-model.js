/** Pure UI annotation draft value checks; no browser or component dependency. */
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validValue(type, value) {
  if (value === undefined) return true;
  if (type === 'text') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'stringList') return Array.isArray(value) && value.every(item => typeof item === 'string');
  if (type === 'stringMap') return isObject(value) && Object.values(value).every(item => typeof item === 'string');
  if (type === 'typedValue') return value === undefined || value === null
    || typeof value === 'string' || typeof value === 'boolean'
    || typeof value === 'number' && Number.isFinite(value);
  return type === 'json';
}

export function initialState(type, value) {
  if (type === 'boolean') return value === undefined ? '' : String(value);
  if (type === 'stringList') return Array.isArray(value) ? [...value] : [];
  if (type === 'stringMap') return isObject(value) ? Object.entries(value) : [];
  if (type === 'typedValue') return value === null ? { kind: 'null', value: '' }
    : typeof value === 'boolean' ? { kind: 'boolean', value: String(value) }
    : typeof value === 'number' ? { kind: 'number', value: String(value) }
    : { kind: 'text', value: typeof value === 'string' ? value : '' };
  if (type === 'json') return value === undefined ? '' : JSON.stringify(value, null, 2);
  return value === undefined ? '' : value;
}

export function stateValue(type, draft, label) {
  if (type === 'boolean') {
    if (draft === '') return undefined;
    if (draft === 'true') return true;
    if (draft === 'false') return false;
    throw new Error(`${label} must be Yes or No.`);
  }
  if (type === 'stringList') {
    if (!Array.isArray(draft) || draft.some(item => typeof item !== 'string')) throw new Error(`${label} must be a list of text values.`);
    return [...draft];
  }
  if (type === 'stringMap') {
    if (!Array.isArray(draft) || draft.some(row => !Array.isArray(row) || row.length !== 2 || row.some(value => typeof value !== 'string'))) {
      throw new Error(`${label} must be a set of text labels.`);
    }
    const keys = new Set();
    const entries = [];
    for (const [key, text] of draft) {
      if (!key.trim()) throw new Error(`${label} needs a key for every row.`);
      if (keys.has(key)) throw new Error(`${label} has the same key twice: ${key}.`);
      keys.add(key);
      entries.push([key, text]);
    }
    return Object.fromEntries(entries);
  }
  if (type === 'typedValue') {
    if (!isObject(draft) || typeof draft.kind !== 'string') throw new Error(`${label} needs a value type.`);
    if (draft.kind === 'null') return null;
    if (draft.kind === 'boolean') {
      if (draft.value === 'true') return true;
      if (draft.value === 'false') return false;
      throw new Error(`${label} must be Yes or No.`);
    }
    if (draft.kind === 'number') {
      if (typeof draft.value !== 'string' || !draft.value.trim() || !Number.isFinite(Number(draft.value))) {
        throw new Error(`${label} must be a finite number.`);
      }
      return Number(draft.value);
    }
    if (draft.kind === 'text' && typeof draft.value === 'string') {
      return draft.value === '' ? undefined : draft.value;
    }
    throw new Error(`${label} has an unsupported value type.`);
  }
  if (type === 'json') {
    if (draft === '') return undefined;
    try { return JSON.parse(draft); }
    catch { throw new Error(`${label} must be valid JSON.`); }
  }
  if (type === 'text') {
    if (typeof draft !== 'string') throw new Error(`${label} must be text.`);
    return draft === '' ? undefined : draft;
  }
  throw new Error(`${label} has an unsupported field type.`);
}
