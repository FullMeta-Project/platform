/** Shared pure normalization for browser loading and in-memory build validation. */
import { serializableEditorValue as clone } from '../debug/controller.js';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function createNativeOperationResolver(authority, digest) {
  function normalizeBinding(binding) {
    if (binding === undefined || binding === null) return null;
    if (!record(binding) || Object.keys(binding).some(key => !['id', 'version', 'digest'].includes(key)) || typeof binding.id !== 'string') throw new Error('Use an operationContract record with id, version and optional digest.');
    const descriptor = authority.operations[binding.id];
    if (!Object.hasOwn(authority.operations, binding.id) || !descriptor) throw new Error(`Unknown native operation ${binding.id}.`);
    if (binding.version !== descriptor.version) throw new Error(`Native operation ${binding.id} requires version ${descriptor.version}.`);
    if (binding.digest !== undefined && binding.digest !== digest) throw new Error(`Native operation ${binding.id} digest does not match the current descriptor authority.`);
    return { id: binding.id, version: descriptor.version, digest };
  }
  function resolve(binding, context = {}) {
    const identity = normalizeBinding(binding); if (!identity) throw new Error('Select an explicit operationContract binding.');
    const descriptor = authority.operations[identity.id];
    for (const key of ['program', 'entry', 'protocol']) if (context[key] !== undefined && context[key] !== descriptor[key]) throw new Error(`Native operation ${identity.id} ${key} does not match its descriptor.`);
    return { identity, descriptor: clone(descriptor) };
  }
  function normalizeApi(contract) {
    if (typeof contract === 'string') return contract;
    if (!record(contract)) throw new Error('An API contract must be a route string or record.');
    if (contract.operationContract === undefined) return clone(contract);
    if (contract.schemaOperation !== undefined) throw new Error('An API cannot mix schemaOperation and operationContract.');
    const { identity, descriptor } = resolve(contract.operationContract), outputType = descriptor.protocol === 'ndjson-stdio' ? 'application/x-ndjson' : 'application/json';
    if (typeof contract.route !== 'string' || !/^\/api\/[A-Za-z0-9/_-]+$/.test(contract.route)) throw new Error('An operation API needs an explicit local /api/ route.');
    if (!record(contract.externalProgram) || typeof contract.externalProgram.registryId !== 'string' || !contract.externalProgram.registryId.trim()) throw new Error('An operation API needs an explicit externalProgram.registryId.');
    if (contract.method !== undefined && contract.method !== 'POST') throw new Error(`Native operation ${identity.id} requires POST.`);
    if (contract.handler !== undefined && (typeof contract.handler !== 'string' || !contract.handler.trim())) throw new Error('An explicit API handler must be nonblank text.');
    const external = contract.externalProgram;
    if (external.entry !== undefined && external.entry !== descriptor.entry || external.protocol !== undefined && external.protocol !== descriptor.protocol || external.entries !== undefined) throw new Error(`Native operation ${identity.id} entry/protocol conflicts with its descriptor.`);
    if (contract.input !== undefined && !record(contract.input) || contract.output !== undefined && !record(contract.output)) throw new Error('API input/output shapes must be records.');
    if (contract.input?.contentType !== undefined && contract.input.contentType !== 'application/json' || contract.output?.contentType !== undefined && contract.output.contentType !== outputType) throw new Error(`Native operation ${identity.id} content type conflicts with its descriptor.`);
    return { ...clone(contract), operationContract: identity, method: 'POST', handler: contract.handler || identity.id,
      input: { contentType: 'application/json', fields: [], ...clone(contract.input || {}) }, output: { contentType: outputType, fields: [], ...clone(contract.output || {}) },
      externalProgram: { ...clone(external), entry: descriptor.entry, protocol: descriptor.protocol } };
  }
  return Object.freeze({ normalizeBinding, resolve, normalizeApi });
}
