/** Conservative Boolean equivalence for the existing declarative condition AST.
 * Atoms are opaque unless their equivalence follows directly from the runtime.
 * No JSON literal, expression text or unknown extension data is interpreted as code.
 */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const key = value => JSON.stringify(canonical(value));
const unary = new Set(['required', 'forbidden', 'nonblank', 'unique', 'uniqueBy', 'minimum', 'maximum', 'range', 'minCount', 'maxCount', 'countRange']);
const binary = new Set(['equals', 'notEquals', 'memberOf', 'memberOfDifference', 'notMemberOf', 'subset', 'setEqual', 'lessThan', 'lessOrEqual', 'greaterThan', 'greaterOrEqual']);
const pointer = value => typeof value === 'string' && (value === '' || value.startsWith('/')) && !/~(?![01])/.test(value);
function validJson(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!object(value) && !Array.isArray(value) || seen.has(value)) return false;
  const next = new Set(seen); next.add(value);
  return Object.values(value).every(item => validJson(item, next));
}
function validOperand(value) {
  if (!object(value)) return false;
  const modes = ['field', 'source', 'literal', 'binding'].filter(name => own(value, name));
  if (modes.length !== 1) return false;
  if (modes[0] === 'field') return pointer(value.field);
  if (modes[0] === 'literal') return validJson(value.literal);
  return pointer(value.path) && (modes[0] === 'source'
    ? ['root', 'model', 'schema', 'context'].includes(value.source)
    : typeof value.binding === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(value.binding));
}

function atom(condition) {
  const result = structuredClone(condition);
  let negate = false;
  if (result.type === 'forbidden') { result.type = 'required'; negate = true; }
  if (result.type === 'notEquals') { result.type = 'equals'; negate = true; }
  // Collection order and multiplicity are irrelevant to these set predicates.
  const normalizeSet = operand => {
    if (!object(operand) || !Array.isArray(operand.literal)) return;
    const unique = new Map(operand.literal.map(value => [key(value), canonical(value)]));
    operand.literal = [...unique.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value);
  };
  if (['memberOf', 'notMemberOf', 'subset', 'setEqual'].includes(result.type)) normalizeSet(result.other);
  if (['subset', 'setEqual'].includes(result.type)) normalizeSet(result.subject);
  // Equality is symmetric in the native evaluator. Keep other operators opaque:
  // e.g. notMemberOf has a type guard and is not simply NOT memberOf.
  if (['equals', 'setEqual'].includes(result.type) && object(result.subject) && object(result.other)
      && key(result.subject) > key(result.other)) [result.subject, result.other] = [result.other, result.subject];
  return { name: key(result), negate };
}

/** Return a canonical reduced decision diagram, or null for unsupported/large inputs. */
export function conditionIdentity(condition, limit = 10) {
  if (condition == null) return 'true';
  const atoms = new Set();
  function parse(value, depth = 0) {
    if (!object(value) || depth > 16) throw new Error('Invalid condition');
    const operators = ['all', 'any', 'not'].filter(name => own(value, name));
    if (operators.length) {
      if (operators.length !== 1 || own(value, 'type')) throw new Error('Invalid condition');
      const operator = operators[0];
      if (operator === 'not') return { op: 'not', child: parse(value.not, depth + 1) };
      if (!Array.isArray(value[operator]) || !value[operator].length) throw new Error('Invalid condition');
      return { op: operator, children: value[operator].map(child => parse(child, depth + 1)) };
    }
    if (!validOperand(value.subject) || !(unary.has(value.type) || binary.has(value.type))
        || binary.has(value.type) && !validOperand(value.other)
        || value.type === 'memberOfDifference' && !validOperand(value.excluded)
        || value.type === 'uniqueBy' && !pointer(value.itemPath)) throw new Error('Invalid condition');
    const bounds = ['minimum', 'minCount'].includes(value.type) ? ['minimum']
      : ['maximum', 'maxCount'].includes(value.type) ? ['maximum']
      : ['range', 'countRange'].includes(value.type) ? ['minimum', 'maximum'] : [];
    if (bounds.some(bound => typeof value[bound] !== 'number' || !Number.isFinite(value[bound])
      || /Count$|^countRange$/.test(value.type) && (!Number.isSafeInteger(value[bound]) || value[bound] < 0))
      || bounds.length === 2 && value.minimum > value.maximum) throw new Error('Invalid condition');
    if (value.type === 'memberOfDifference') return { op: 'all', children: [
      parse({ type: 'memberOf', subject: value.subject, other: value.other }, depth + 1),
      parse({ type: 'notMemberOf', subject: value.subject, other: value.excluded }, depth + 1),
    ] };
    const item = atom(value); atoms.add(item.name);
    return { op: 'atom', ...item };
  }
  let tree;
  try { tree = parse(condition); } catch { return null; }
  if (atoms.size > limit) return null;
  const names = [...atoms].sort(), values = new Map();
  function evaluate(node) {
    if (node.op === 'atom') return !!values.get(node.name) !== node.negate;
    if (node.op === 'not') return !evaluate(node.child);
    return node.op === 'all' ? node.children.every(evaluate) : node.children.some(evaluate);
  }
  function build(index) {
    if (index === names.length) return evaluate(tree);
    const name = names[index]; values.set(name, false); const left = build(index + 1);
    values.set(name, true); const right = build(index + 1); values.delete(name);
    return key(left) === key(right) ? left : [name, left, right];
  }
  return key(build(0));
}

/** Prove equality of conditions or report that this checker cannot determine it. */
export function compareConditions(left, right) {
  const a = conditionIdentity(left), b = conditionIdentity(right);
  return a !== null && b !== null && a === b ? 'equivalent' : 'unknown';
}
