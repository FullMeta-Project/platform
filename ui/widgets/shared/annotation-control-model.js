/** Serializable raw control models; DOM and React resources never enter these drafts. */
let nextRow = 0;
export const annotationRow = value => ({ id: ++nextRow, value: String(value ?? '') });
export function adoptAnnotationRows(value) {
  if (!value || typeof value !== 'object') return;
  if (Number.isSafeInteger(value.id)) nextRow = Math.max(nextRow, value.id);
  for (const child of Object.values(value)) if (child && typeof child === 'object') adoptAnnotationRows(child);
}
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const kind = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
export function createAnnotationControl(field, value, makeStructured) {
  const original = object(value) ? structuredClone(value) : {};
  if (field.type === 'boolean') return { value: value === true };
  if (field.type === 'json') return { enabled: value !== undefined, structured: makeStructured(value ?? {}) };
  if (field.type === 'source') return { original, scope: original.scope || field.defaultScope || '', path: (Array.isArray(original.path) ? original.path : []).map(annotationRow),
    properties: Object.fromEntries((field.properties || []).map(property => [property.key, property.type === 'schemaFilter'
      ? { annotationKeys: (original[property.key]?.annotationKeys || []).join(', '), valuePath: (original[property.key]?.valuePath || []).join('/') }
      : property.type === 'boolean' ? original[property.key] === true : original[property.key] ?? ''])) };
  if (field.type === 'namedLabels') return { original, values: Object.fromEntries((field.entries || []).map(([key]) => [key, original[key] || ''])) };
  if (field.type === 'siblingCondition') return { original, property: original.property || '', kind: original.value === null ? 'null'
    : ['number', 'boolean'].includes(typeof original.value) ? typeof original.value : 'string',
    text: original.value == null ? '' : String(original.value), boolean: original.value !== false };
  if (field.type === 'stringList') return { rows: (Array.isArray(value) ? value : []).map(annotationRow) };
  if (field.type === 'siblings') return { rows: (Array.isArray(value) ? value : []).map(value => ({ id: ++nextRow, label: value?.label || '', path: (Array.isArray(value?.path) ? value.path : []).map(annotationRow) })) };
  if (field.type === 'typedMap') return { rows: Object.entries(original).map(([key, value]) => ({ id: ++nextRow, key, kind: kind(value),
    text: ['string', 'number'].includes(typeof value) ? String(value) : '', boolean: value !== false,
    structured: makeStructured(Array.isArray(value) || object(value) ? value : {}) })) };
  if (field.type === 'stringListMap') return { rows: Object.entries(original).map(([key, values]) => ({ id: ++nextRow, key, items: (Array.isArray(values) ? values : []).map(annotationRow) })) };
  if (['stringMap', 'initialChoice'].includes(field.type)) return { original, property: original.property || '',
    rows: Object.entries(field.type === 'initialChoice' ? original.values || {} : original).map(([key, text]) => ({ id: ++nextRow, key, text: String(text) })) };
  return { value: value ?? '' };
}
export function readAnnotationControl(field, draft, readStructured) {
  const json = (value, entries) => ({ text: value === undefined ? '' : JSON.stringify(value), entries });
  if (field.type === 'boolean') return { checked: draft.value === true, text: '' };
  if (field.type === 'json') return json(draft.enabled ? readStructured(draft.structured) : undefined);
  if (field.type === 'source') {
    const next = { ...draft.original, scope: draft.scope, path: draft.path.map(row => row.value.trim()) };
    for (const property of field.properties || []) {
      const value = draft.properties[property.key];
      if (property.type === 'boolean') { if (value) next[property.key] = true; else delete next[property.key]; }
      else if (property.type === 'schemaFilter') {
        const annotationKeys = value.annotationKeys.split(',').map(value => value.trim()).filter(Boolean), valuePath = value.valuePath.split('/').map(value => value.trim()).filter(Boolean);
        if (annotationKeys.length || valuePath.length) next[property.key] = { annotationKeys, valuePath }; else delete next[property.key];
      } else if (String(value).trim()) next[property.key] = String(value).trim(); else delete next[property.key];
    } return json(next);
  }
  if (field.type === 'namedLabels') {
    const next = { ...draft.original }; for (const [key, value] of Object.entries(draft.values)) { if (String(value).trim()) next[key] = String(value).trim(); else delete next[key]; }
    return json(Object.keys(next).length ? next : undefined);
  }
  if (field.type === 'siblingCondition') {
    const value = draft.kind === 'null' ? null : draft.kind === 'boolean' ? draft.boolean : draft.kind === 'number' ? Number(draft.text) : draft.text;
    return json(draft.property.trim() ? { ...draft.original, property: draft.property.trim(), value } : undefined,
      { property: draft.property.trim(), value, valid: ['boolean', 'null'].includes(draft.kind) || draft.text.trim() !== '' && (draft.kind !== 'number' || Number.isFinite(Number(draft.text))) });
  }
  if (field.type === 'stringList') return json(draft.rows.length ? draft.rows.map(row => row.value.trim()) : undefined);
  if (field.type === 'siblings') return json(draft.rows.map(row => ({ path: row.path.map(part => part.value.trim()), ...(row.label.trim() ? { label: row.label.trim() } : {}) })));
  if (field.type === 'typedMap') {
    const entries = draft.rows.map(row => ({ key: row.key.trim(), kind: row.kind, text: row.text, value: row.kind === 'null' ? null
      : row.kind === 'boolean' ? row.boolean : row.kind === 'string' ? row.text : row.kind === 'number' ? Number(row.text) : readStructured(row.structured) }));
    return json(entries.length ? Object.fromEntries(entries.map(({ key, value }) => [key, value])) : undefined, entries);
  }
  if (field.type === 'stringListMap') {
    const entries = draft.rows.map(row => [row.key.trim(), row.items.map(item => item.value.trim())]);
    return json(entries.length ? Object.fromEntries(entries) : undefined, entries);
  }
  if (['stringMap', 'initialChoice'].includes(field.type)) {
    const entries = draft.rows.map(row => [row.key.trim(), row.text.trim()]), values = Object.fromEntries(entries);
    return json(field.type === 'initialChoice' ? draft.property.trim() || entries.length ? { ...draft.original, property: draft.property.trim(), values } : undefined
      : entries.length ? values : undefined, entries);
  }
  return { text: String(draft.value ?? '') };
}
