export function collectIds(value, ids = new Set()) {
  if (Array.isArray(value)) value.forEach((entry) => collectIds(entry, ids));
  else if (value && typeof value === 'object') {
    if (typeof value.id === 'string') ids.add(value.id);
    Object.values(value).forEach((entry) => collectIds(entry, ids));
  }
  return ids;
}

export function uniqueModelId(model, base = 'item', reserved = []) {
  const stem = String(base).replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z]+/, 'item_').slice(0, 52) || 'item';
  const ids = collectIds(model);
  for (const id of reserved || []) if (typeof id === 'string') ids.add(id);
  let candidate = stem, index = 2;
  while (ids.has(candidate)) candidate = `${stem}_${index++}`;
  return candidate;
}

export function uniqueArrayName(items, base) {
  const names = new Set((items || []).map((entry) => entry?.name));
  let name = base, index = 2;
  while (names.has(name)) name = `${base} ${index++}`;
  return name;
}

export function insertionIndexForModelArray(items, afterIndex = null) {
  if (!Array.isArray(items)) throw new Error('The target is not a model item list.');
  return Number.isInteger(afterIndex) ? afterIndex + 1 : items.length;
}
