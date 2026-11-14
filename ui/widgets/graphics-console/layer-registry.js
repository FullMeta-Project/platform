/**
 * Client-side graphics API for schema-declared layers. An application registers
 * named handlers; the shared editor resolves a scene's inputs and invokes only
 * the handlers named by its layer declarations.
 */
export function createGraphicsLayerRegistry(initialHandlers = {}) {
  const handlers = new Map();

  function register(id, handler) {
    if (typeof id !== 'string' || !id.trim()) throw new Error('A graphics layer handler needs a nonempty ID.');
    if (typeof handler !== 'function') throw new Error(`Graphics layer handler ${id} must be a function.`);
    if (handlers.has(id)) throw new Error(`Graphics layer handler ${id} is already registered.`);
    handlers.set(id, handler);
  }

  for (const [id, handler] of Object.entries(initialHandlers)) register(id, handler);

  function prepare(scene, inputs = {}, context = {}, isVisible = (layer) => layer.defaultVisible !== false) {
    if (!Array.isArray(scene?.layers)) return [];
    const visibleLayers = scene.layers.filter(isVisible);
    const visibleRoles = new Set(visibleLayers.map((layer) => layer.role || layer.id));
    const prepared = [];
    for (const layer of visibleLayers) {
      if (!layer.handler) continue;
      if ((layer.requiresVisible || []).some((role) => !visibleRoles.has(role))) continue;
      const handler = handlers.get(layer.handler);
      if (!handler) throw new Error(`Graphics layer handler ${layer.handler} is not registered.`);
      if (layer.input && !Object.hasOwn(inputs, layer.input)) {
        throw new Error(`Graphics layer ${layer.id || layer.role} needs scene input ${layer.input}.`);
      }
      prepared.push({
        layer,
        output: handler({ layer, input: layer.input ? inputs[layer.input] : undefined, inputs, scene, context }),
      });
    }
    return prepared;
  }

  return Object.freeze({
    register,
    has: (id) => handlers.has(id),
    prepare,
  });
}
