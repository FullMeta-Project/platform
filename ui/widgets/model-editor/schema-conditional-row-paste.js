/** Typed, tabular input for reusable conditional definition constraints. */
const kinds = new Set(['ref', 'allOfRef', 'const', 'enum', 'minItems', 'maxItems',
  'false', 'conditionalRef']);
const valueKinds = new Set(['string', 'number', 'boolean', 'null']);

/**
 * One row is target path, constraint kind, value, and optional value type.
 * A conditionalRef row may also specify nested when path/value and then path.
 * This accepts only factorized fields, never a pasted schema object.
 */
export function parseConditionalConstraintRows(text) {
  const rows = [];
  for (const [index, rawLine] of String(text).split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const columns = rawLine.split('\t');
    if (columns.length < 2 || columns.length > 7)
      throw new Error(`Line ${index + 1} needs 2–7 tab-separated columns.`);
    const [rawPath, rawKind, value = '', rawValueKind = 'string', rawWhenPath = '',
      whenValue = '', rawThenPath = ''] = columns;
    const path = rawPath.trim(), kind = rawKind.trim(),
      valueKind = rawValueKind.trim() || 'string',
      whenPath = rawWhenPath.trim(), thenPath = rawThenPath.trim();
    if (!path) throw new Error(`Line ${index + 1} needs a target path.`);
    if (!kinds.has(kind))
      throw new Error(`Line ${index + 1} has an unknown constraint type: ${kind || '(empty)'}.`);
    if (!valueKinds.has(valueKind))
      throw new Error(`Line ${index + 1} has an unknown value type: ${valueKind}.`);
    if (kind === 'conditionalRef' && (!value || !whenPath || !thenPath))
      throw new Error(`Line ${index + 1} needs a reference, nested when path, and nested then path.`);
    if (kind !== 'conditionalRef' && (whenPath || whenValue || thenPath))
      throw new Error(`Line ${index + 1} has nested conditional columns for a ${kind} row.`);
    rows.push({ path, kind, value, valueKind,
      whenPath, whenValue, thenPath });
  }
  if (!rows.length) throw new Error('Paste at least one constraint row.');
  return rows;
}

export function formatConditionalConstraintRows(rows) {
  return rows.map(row => [row.path || '', row.kind || 'ref', row.value || '',
    row.valueKind || 'string', row.whenPath || '', row.whenValue || '',
    row.thenPath || ''].join('\t').replace(/\t+$/, '')).join('\n');
}
