/** A generic row editor for root x-* contracts. No application keys are built in. */
import { contractFromFlatRows, flatContractRows, parseContractPath } from './schema-root-contract-flat.js';
import { parseSiblingObjectMatrix, siblingObjectMatrix } from './schema-root-contract-matrix.js';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isContainer = value => isObject(value) || Array.isArray(value);
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const at = (value, path) => path.reduce((node, part) => node?.[part], value);
const pointer = path => `#/${path.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;





const kinds = [
  ['string', 'Text'], ['escaped-string', 'Escaped text'], ['reference', 'Reference text'], ['number', 'Number'],
  ['boolean', 'True / false'], ['null', 'Null'], ['object', 'Object'], ['array', 'Array'],
];
const kindOf = (value, key = '') => {
  if (Array.isArray(value)) return 'array';
  if (isObject(value)) return 'object';
  if (value === null) return 'null';
  if (typeof value === 'string') return /[\r\n\t]/.test(value) ? 'escaped-string'
    : key === '$ref' || value.startsWith('#/') ? 'reference' : 'string';
  return typeof value;
};
const count = value => Array.isArray(value) ? `${value.length} items` : `${Object.keys(value).length} keys`;
const defaultValue = kind => ({ string: '', 'escaped-string': '', reference: '#/', number: 0,
  boolean: false, null: null, object: {}, array: [] })[kind];
const validExtensionName = name => /^x-[A-Za-z0-9_.-]+$/.test(name);
const startsWithPath = (path, prefix) => prefix.length <= path.length
  && prefix.every((part, index) => path[index] === part);
const contractPath = parts => parts.map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');

/** Resolve an imported extension path without silently redirecting another key. */
export function rootContractImportPath(value, extensionKey) {
  const raw = String(value || '').trim().replace(/^#\//, '').replace(/^\//, '');
  const parts = parseContractPath(raw);
  if (/^(?:#\/|\/)/.test(String(value || '').trim()) && String(parts[0]).startsWith('x-')) {
    if (parts[0] !== extensionKey)
      throw new Error(`Imported path targets ${parts[0]}, but the selected extension is ${extensionKey}. Select the matching existing extension before importing.`);
    if (parts.length === 1) throw new Error('Import child paths within the selected extension, not its root.');
    return contractPath(parts.slice(1));
  }
  return contractPath(parts);
}

/** Root extension values are authored as individual fields, not pasted objects. */

export { kinds };

export { createBulkRootContractsDialog } from './schema-extra-candidate-dialogs.js';
