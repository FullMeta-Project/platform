import { runCommandPreview } from './workflow-command-preview.js';
import { runStorageCleanup } from './workflow-storage.js';
import { runStreamAction } from './workflow-stream.js';
import { runNativeOperation } from './workflow-native-operation.js';

const workflowRunners = Object.freeze({
  documentValidation: (services, readInputs, execution) => services.validate(readInputs, execution),
  commandPreview: runCommandPreview,
  storageCleanup: runStorageCleanup,
  streamRun: runStreamAction,
  nativeOperation: runNativeOperation,
});

/** Bind declared actions to the shared editor services, without an application operation map. */
export function createActions(services, bindings) {
  return Object.fromEntries(bindings.map((binding) => {
    const execution = binding.execution;
    const operationId = execution?.operation;
    const workflowKind = execution?.workflow?.kind;
    if (typeof operationId !== 'string' || !operationId) {
      throw new Error(`The ${binding.id} action does not declare an operation.`);
    }
    const run = Object.hasOwn(workflowRunners, workflowKind) ? workflowRunners[workflowKind] : null;
    if (typeof run !== 'function') {
      throw new Error(`The ${binding.id} action has no registered workflow kind ${JSON.stringify(workflowKind)}.`);
    }
    return [binding.id, workflowKind === 'nativeOperation'
      ? invocation => run(services, () => services.resolveInputs(execution.inputs || {}), execution, invocation)
      : () => run(services, () => services.resolveInputs(execution.inputs || {}), execution)];
  }));
}

/** Compatibility binder for application packages still using registered operations. */
export function bindRegisteredActions(bindings, operations, resolveInputs) {
  return Object.fromEntries(bindings.map((binding) => {
    const operationId = binding.execution?.operation;
    if (typeof operationId !== 'string' || !operationId) {
      throw new Error(`The ${binding.id} action does not declare an operation.`);
    }
    const operation = Object.hasOwn(operations, operationId) ? operations[operationId] : null;
    if (typeof operation !== 'function') {
      throw new Error(`No registered operation handles ${operationId}.`);
    }
    return [binding.id, () => operation(() => resolveInputs(binding.execution.inputs || {}), binding.execution)];
  }));
}
