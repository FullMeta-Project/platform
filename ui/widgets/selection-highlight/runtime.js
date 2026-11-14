/**
 * Resolve a tree selection to application-neutral scene targets. The console
 * chooses a focus mode; an application renderer decides how to draw its data.
 */
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function selectionHighlightBindingValue(binding, sources = {}) {
  if (!record(binding) || !['model', 'selected', 'runtime', 'view', 'layer'].includes(binding.scope)) return undefined;
  const root = sources[binding.scope];
  if (!binding.path) return root;
  return String(binding.path).split('.').filter(Boolean).reduce((value, key) => value?.[key], root);
}

export function resolveSelectionHighlight(consoleDefinition, rule, sources = {}) {
  const mode = consoleDefinition?.focusModes?.[rule?.focus];
  if (!record(mode)) return { target: null, values: [] };
  let values = [selectionHighlightBindingValue(mode.source, sources)].filter(record);
  for (const step of mode.steps || []) {
    const collection = selectionHighlightBindingValue(step.collection, sources);
    if (!Array.isArray(collection)) return { target: mode.target, values: [] };
    values = values.flatMap(value => (step.properties || []).map(property => value?.[property]))
      .filter(reference => typeof reference === 'string' || typeof reference === 'number')
      .map(reference => collection.find(item => item?.[step.key || 'id'] === reference))
      .filter(item => record(item) && Object.entries(step.where || {}).every(([key, expected]) => item[key] === expected));
  }
  const seen = new Set();
  return { target: mode.target, values: values.filter(value => {
    const key = value.id ?? value;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }) };
}

/**
 * Build a highlight overlay from normalized scene primitives. A geometry,
 * network, or diagram adapter can tag primitives with an id or ownerId; no
 * renderer-specific or application-specific drawing logic is needed here.
 */
export function selectionHighlightPrimitives(primitives = [], focus = {}, {
  keys = ['id', 'ownerId'],
  identityKey = 'id',
  identityOf,
  color = '#48d7b2',
  lineWidth = 2.8,
} = {}) {
  const ids = new Set((focus.values || []).map(value => record(value) ? value[identityKey] : value).filter(value => value !== undefined && value !== null));
  if (!ids.size || !Array.isArray(primitives)) return [];
  return primitives.filter((primitive, index) => {
    const identity = typeof identityOf === 'function' ? identityOf(primitive, index) : undefined;
    return ids.has(identity) || keys.some(key => ids.has(primitive?.[key]));
  })
    .map(primitive => ({
      ...primitive,
      stroke: color,
      ...(primitive.type === 'point' ? { fill: color } : {}),
      opacity: 1,
      lineWidth,
    }));
}

export const selectionHighlightWidget = Object.freeze({
  id: 'selectionHighlight',
  kind: 'overlay',
  resolve: resolveSelectionHighlight,
  primitives: selectionHighlightPrimitives,
});
