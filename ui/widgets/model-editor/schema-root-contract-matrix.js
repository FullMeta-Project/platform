/** Typed scalar table rows for sibling objects in any root extension. */
import { parseContractPath } from './schema-root-contract-flat.js';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isContainer = value => isObject(value) || Array.isArray(value);
const encode = part => String(part).replace(/~/g, '~0').replace(/\//g, '~1');
const pathText = parts => parts.map(encode).join('/');
const scalarKind = (value, key) => value === null ? 'null'
  : typeof value === 'string' && (key === '$ref' || value.startsWith('#/')) ? 'reference'
    : typeof value;
const scalarKinds = new Set(['string', 'number', 'boolean', 'null', 'reference']);

function scalarLeaves(value, path = [], output = []) {
  if (isContainer(value)) {
    for (const [key, child] of Object.entries(value)) scalarLeaves(child, [...path, key], output);
  } else output.push({ path: pathText(path), type: scalarKind(value, path.at(-1)), value });
  return output;
}

function escaped(value) {
  if (value === '') return '\\e';
  return String(value).replace(/\\/g, '\\\\').replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function unescaped(value, row, field) {
  if (value === '\\e') return '';
  if (/\\(?![\\trn])/.test(value))
    throw new Error(`Matrix line ${row}, ${field}: use \\e for empty text or escape backslashes.`);
  return value.replace(/\\([\\trn])/g, (_, code) => ({ '\\': '\\', t: '\t', r: '\r', n: '\n' })[code]);
}

/** Display existing sibling objects as tab-separated, typed field columns. */
export function siblingObjectMatrix(value, requestedPaths = [], sharedOnly = false) {
  if (!isContainer(value)) throw new Error('Choose an object or array branch.');
  const items = Object.entries(value).filter(([, item]) => isObject(item));
  const columns = new Map(), records = [];
  for (const [key, item] of items) {
    const fields = new Map();
    for (const leaf of scalarLeaves(item)) {
      if (!leaf.path) continue;
      const identity = JSON.stringify([leaf.path, leaf.type]);
      if (!columns.has(identity)) columns.set(identity, { path: leaf.path, type: leaf.type });
      fields.set(identity, leaf);
    }
    records.push({ key, fields });
  }
  const ordered = requestedPaths.length
    ? requestedPaths.flatMap(path => {
      const matches = [...columns.entries()].filter(([, column]) => column.path === path);
      return matches.length ? matches : [[JSON.stringify([path, 'string']), { path, type: 'string' }]];
    })
    : [...columns.entries()].filter(([identity]) => !sharedOnly
      || records.every(record => record.fields.has(identity)));
  const lines = [["item", ...ordered.map(([, column]) => `${column.path}:${column.type}`)].join('\t')];
  for (const record of records) lines.push([
    escaped(record.key),
    ...ordered.map(([identity]) => {
      const leaf = record.fields.get(identity);
      if (!leaf) return '';
      if (leaf.type === 'null') return 'null';
      return escaped(leaf.value);
    }),
  ].join('\t'));
  return { text: lines.join('\n'), itemCount: records.length, columnCount: ordered.length };
}

/** Parse only typed scalar cells. Empty cells are omitted, preserving other fields. */
export function parseSiblingObjectMatrix(text, branchPath, branchValue) {
  if (!isContainer(branchValue)) throw new Error('Choose an object or array branch.');
  const lines = String(text).replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());
  if (lines.length < 2) throw new Error('Enter a matrix header and at least one item row.');
  if (lines.length > 2001) throw new Error('Load at most 2,000 sibling objects at a time.');
  const headers = lines[0].split('\t');
  if (headers[0].trim().toLowerCase() !== 'item' || headers.length < 2)
    throw new Error('The matrix header must begin with item, followed by typed field columns.');
  const columns = [], seenColumns = new Set();
  for (const header of headers.slice(1)) {
    const separator = header.lastIndexOf(':');
    if (separator < 1) throw new Error(`Matrix column ${header} needs a field path and type, such as label:string.`);
    const path = header.slice(0, separator).trim(), type = header.slice(separator + 1).trim().toLowerCase();
    if (!scalarKinds.has(type)) throw new Error(`Matrix column ${header}: use a scalar value type.`);
    const parts = parseContractPath(path), identity = JSON.stringify([parts, type]);
    if (seenColumns.has(identity)) throw new Error(`Matrix field ${path}:${type} appears twice.`);
    seenColumns.add(identity); columns.push({ parts, type, path });
  }
  const rows = [], seenItems = new Set();
  for (let lineNumber = 1; lineNumber < lines.length; lineNumber += 1) {
    const cells = lines[lineNumber].split('\t');
    if (cells.length !== headers.length)
      throw new Error(`Matrix line ${lineNumber + 1}: expected ${headers.length} tab-separated columns.`);
    const key = unescaped(cells[0], lineNumber + 1, 'item');
    if (!key) throw new Error(`Matrix line ${lineNumber + 1}: enter an item key or index.`);
    if (Array.isArray(branchValue) && !/^(0|[1-9]\d*)$/.test(key))
      throw new Error(`Matrix line ${lineNumber + 1}: array item must be a whole-number index.`);
    if (seenItems.has(key)) throw new Error(`Matrix item ${key} appears twice.`);
    seenItems.add(key);
    const activeFields = new Set();
    for (let index = 0; index < columns.length; index += 1) {
      if (cells[index + 1] === '') continue;
      const { parts, type, path } = columns[index];
      const fieldIdentity = JSON.stringify(parts);
      if (activeFields.has(fieldIdentity))
        throw new Error(`Matrix line ${lineNumber + 1}: ${path} has more than one typed value.`);
      activeFields.add(fieldIdentity);
      const raw = unescaped(cells[index + 1], lineNumber + 1, path);
      if (type === 'number' && (!raw.trim() || !Number.isFinite(Number(raw))))
        throw new Error(`Matrix line ${lineNumber + 1}, ${path}: enter a finite number.`);
      if (type === 'boolean' && raw !== 'true' && raw !== 'false')
        throw new Error(`Matrix line ${lineNumber + 1}, ${path}: enter true or false.`);
      if (type === 'null' && raw !== 'null')
        throw new Error(`Matrix line ${lineNumber + 1}, ${path}: enter null.`);
      rows.push({
        path: pathText([...branchPath, key, ...parts]), type,
        value: type === 'null' ? '' : raw,
      });
    }
  }
  if (!rows.length) throw new Error('Enter at least one matrix value. Empty cells leave fields unchanged.');
  return rows;
}
