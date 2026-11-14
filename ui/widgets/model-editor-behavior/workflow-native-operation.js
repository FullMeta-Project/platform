/** The host owns preflight, model/draft/save guards, progress and native transport. */
export async function runNativeOperation(services, readInputs, execution, invocation) {
  if (execution?.workflow?.kind !== 'nativeOperation' || !(execution.workflow.apiRole ? execution.api?.[execution.workflow.apiRole] : Object.keys(execution.api || {}).length === 1)) throw new Error('The action needs a nativeOperation workflow and declared API role.');
  if (typeof services.nativeOperation !== 'function') throw new Error('The host has no guarded native operation service.');
  return services.nativeOperation(execution, readInputs, invocation);
}
