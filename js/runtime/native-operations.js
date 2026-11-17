// @ts-check
/** Shared descriptor bindings; no executable path, network dispatch or model transformation. */
import { validateJsonSchema } from '../../model-rust/js/api.js';
import { serializableEditorValue } from '../debug/controller.js';
import { createNativeOperationResolver } from './native-operation-contract.js';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => serializableEditorValue(value);
export let nativeOperationsDigest = null;
export const nativeOperationFormat = 'fullmeta-native-operations/1';
const registries = new Map();
export async function registerNativeOperationRegistry(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.byteLength > 4 * 1024 * 1024) throw new Error('The operation registry exceeds 4 MiB.');
  const authority = JSON.parse(new TextDecoder().decode(data));
  if (authority?.format !== nativeOperationFormat || !record(authority.operations) || !record(authority.$defs)) throw new Error('Invalid application operation registry.');
  for (const [id, operation] of Object.entries(authority.operations)) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(id) || !record(operation)
      || !Number.isSafeInteger(operation.version) || operation.version < 1
      || typeof operation.program !== 'string' || !operation.program
      || typeof operation.entry !== 'string' || !operation.entry
      || !['json-stdio', 'ndjson-stdio'].includes(operation.protocol)
      || !(record(operation.inputSchema) || typeof operation.inputSchema === 'boolean')) throw new Error(`Invalid native operation declaration ${id}.`);
  }
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(value => value.toString(16).padStart(2, '0')).join('');
  registries.set(digest, { authority, digest, resolver: createNativeOperationResolver(authority, digest) });
  nativeOperationsDigest = digest;
  return digest;
}
export async function loadNativeOperationRegistry(schema, schemaUrl) {
  const name = schema?.['x-fullmeta-runtime']?.operationRegistry;
  if (name === undefined) { nativeOperationsDigest = null; return null; }
  if (typeof name !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.json$/.test(name)) throw new Error('The operation registry must be a sibling JSON filename.');
  const response = await fetch(new URL(name, schemaUrl));
  if (!response.ok) throw new Error(`Could not load the application operation registry: ${response.status}.`);
  return registerNativeOperationRegistry(new Uint8Array(await response.arrayBuffer()));
}
function selected(binding) {
  const candidates = binding?.digest ? [registries.get(binding.digest)].filter(Boolean)
    : [...registries.values()].filter(value => Object.hasOwn(value.authority.operations, binding?.id));
  if (!binding?.digest && candidates.length > 1) throw new Error('The native operation is declared by more than one application registry; use its digest.');
  const registry = candidates[0] || (!binding?.digest && registries.get(nativeOperationsDigest));
  if (!registry) throw new Error('The application operation registry digest is unknown or not loaded.');
  return registry;
}
export function nativeOperationChoices() { const registry = registries.get(nativeOperationsDigest); return registry ? Object.entries(registry.authority.operations).map(([id, descriptor]) => ({ id, ...clone(descriptor) })) : []; }
/** Optional bindings are explicit; omission retains legacy behavior. */
export function normalizeNativeOperationBinding(binding) { return binding == null ? null : selected(binding).resolver.normalizeBinding(binding); }
export function resolveNativeOperation(binding, context = {}) { return selected(binding).resolver.resolve(binding, context); }
export function nativeOperationSchema(binding, phase = 'input') {
  const { identity } = resolveNativeOperation(binding);
  if (!['input', 'result', 'event'].includes(phase)) throw new Error('Choose native input, result or event validation.');
  const authority = selected(identity).authority;
  const source = authority.operations[identity.id][`${phase}Schema`];
  const schema = source === undefined || typeof source === 'boolean' ? source : { $schema: authority.$schema, ...source, $defs: { ...authority.$defs, ...source.$defs } };
  if (schema === undefined) throw new Error(`Native operation ${identity.id} has no ${phase} schema.`);
  return clone(schema);
}
export function nativeOperationToolInputSchema(binding) {
  const schema = nativeOperationSchema(binding), definitions = schema.$defs || {};
  delete schema.$defs; delete schema.$schema;
  return { type: 'object', properties: { input: schema, expectedRevision: { type: 'integer', minimum: 0 } }, required: ['input'], additionalProperties: false, $defs: definitions };
}
export function validateNativeOperationValue(binding, phase, value) { return validateJsonSchema(clone(value), nativeOperationSchema(binding, phase)); }
export const validateNativeOperationInput = (binding, value) => validateNativeOperationValue(binding, 'input', value);
export const validateNativeOperationResult = (binding, value) => validateNativeOperationValue(binding, 'result', value);
export const validateNativeOperationEvent = (binding, value) => validateNativeOperationValue(binding, 'event', value);
export function assertNativeOperationValue(binding, phase, value) {
  const errors = validateNativeOperationValue(binding, phase, value);
  if (errors.length) { const error = new Error(`Native operation ${binding.id} ${phase} is invalid: ${errors.map(issue => typeof issue === 'string' ? issue : `${issue.path || '#'}: ${issue.message || JSON.stringify(issue)}`).join('; ')}`); Object.assign(error, { errors }); throw error; }
  return clone(value);
}
/** Defaults apply only to explicit opt-in APIs; records are never mutated. @returns {any} */
export function normalizeNativeApiContract(contract, digest) { return contract?.operationContract ? selected({ ...contract.operationContract, digest: contract.operationContract.digest || digest }).resolver.normalizeApi(contract) : clone(contract); }

/** Resolve only the API selected by a declared nativeOperation workflow. */
export function nativeOperationActionContract(action, apiContracts) {
  const execution = action?.execution;
  if (execution?.workflow?.kind !== 'nativeOperation') return null;
  const role = execution.workflow.apiRole;
  const candidates = Object.entries(execution.api || {}).filter(([key, name]) => (role === undefined || key === role) && typeof name === 'string' && apiContracts?.[name]?.operationContract);
  if (candidates.length !== 1) throw new Error('A native operation action must select exactly one declared operation API with workflow.apiRole.');
  const [apiRole, apiName] = candidates[0], apiContract = normalizeNativeApiContract(apiContracts[apiName]);
  if (execution.operation !== apiContract.operationContract.id) throw new Error('The action operation does not match its declared API operationContract.');
  return { apiRole, apiName, apiContract, operationContract: apiContract.operationContract };
}

/**
 * Only already-declared application actions yield tools. Every invocation resolves
 * current availability and goes back through the canonical guarded host command.
 * @param {{actions:()=>any[],dispatch:(command:string,args:any)=>Promise<any>,apiContracts?:any}} options
 */
export function createNativeOperationTools({ actions, dispatch, apiContracts }) {
  if (typeof actions !== 'function' || typeof dispatch !== 'function') throw new Error('Operation tools need declared action inspection and a normal command dispatcher.');
  const declared = actions(); if (!Array.isArray(declared)) throw new Error('Declared operation actions must be an array.');
  const names = new Set();
  const contractFor = action => action.apiContract || (apiContracts ? nativeOperationActionContract(action, typeof apiContracts === 'function' ? apiContracts() : apiContracts)?.apiContract : null);
  return declared.filter(action => action.execution?.workflow?.kind === 'nativeOperation' && contractFor(action)?.operationContract).map(action => {
    if (typeof action.id !== 'string' || !action.id) throw new Error('An operation tool needs its declared action ID.');
    const api = normalizeNativeApiContract(contractFor(action)), { identity, descriptor } = resolveNativeOperation(api.operationContract);
    if (!(action.execution.workflow.apiRole ? action.execution.api?.[action.execution.workflow.apiRole] : Object.keys(action.execution.api || {}).length === 1) || action.execution.operation !== identity.id) throw new Error('The native operation tool must match its declared action workflow and API role.');
    const name = `fullmeta_operation_${action.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
    if (names.has(name) || name.length > 128) throw new Error('Operation action IDs need unique valid tool names.'); names.add(name);
    return { name, description: `${action.label || action.id}: ${descriptor.description || identity.id}. Runs the declared application action with its normal availability, draft, save and operation guards.`,
      inputSchema: nativeOperationToolInputSchema(identity),
      ...(descriptor.resultSchema ? { outputSchema: nativeOperationSchema(identity, 'result') } : {}),
      // Even a native read-only check uses the normal host's visible-draft commit.
      // Its tool describes the whole action, rather than only the subprocess.
      annotations: { readOnlyHint: false, untrustedContentHint: true, consequentialHint: true },
      execute: async input => {
        if (!record(input) || Object.keys(input).some(key => !['input', 'expectedRevision'].includes(key)) || !Object.hasOwn(input, 'input') || input.expectedRevision !== undefined && (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0)) throw new Error('Use the declared operation input and optional current expectedRevision.');
        const current = actions().find(entry => entry.id === action.id);
        if (!current || !contractFor(current)?.operationContract || current.execution?.workflow?.kind !== 'nativeOperation' || current.execution.operation !== identity.id) throw new Error('The operation action is no longer declared.');
        if (current.available !== true) throw new Error(current.reason || 'The declared operation action is unavailable.');
        const now = normalizeNativeApiContract(contractFor(current));
        if (JSON.stringify(now) !== JSON.stringify(api)) throw new Error('The operation binding changed; rediscover its tool before executing.');
        const value = assertNativeOperationValue(identity, 'input', input.input);
        const result = await dispatch('operation.execute', { id: action.id, input: value, operationContract: identity, ...(input.expectedRevision === undefined ? {} : { expectedRevision: input.expectedRevision }) });
        return descriptor.resultSchema ? assertNativeOperationValue(identity, 'result', result) : clone(result === undefined ? null : result);
      } };
  });
}
