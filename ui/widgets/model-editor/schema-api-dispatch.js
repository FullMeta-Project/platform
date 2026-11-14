/** Route a declared API name to a trusted server function. */
export async function dispatchSchemaApi(request, response, url, editorApi, handlers) {
  for (const [name, declaration] of Object.entries(editorApi || {})) {
    const contract = typeof declaration === 'string' ? { route: declaration, handler: name } : declaration;
    if (contract?.route !== url.pathname) continue;
    const handler = Object.hasOwn(handlers, contract.handler) ? handlers[contract.handler] : null;
    if (typeof handler !== 'function') throw new Error(`No server function is registered for the ${name} API.`);
    await handler(request, response, url, contract);
    return true;
  }
  return false;
}
