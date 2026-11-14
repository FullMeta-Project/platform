/** Native validation statements for the bulk editor; no import-specific rule language. */
import { parseValidationExpression, validationOperationNames } from './expression-language.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const kinds = ['assert', 'let', 'check', 'if', 'forEach', 'forEachTree'];
const operations = new Set(validationOperationNames);
const namedOperations = new Set(['map', 'filter', 'lookup', 'matches', 'canonicalMap', 'descendants']);
const namedRequired = { map: ['items', 'value'], filter: ['items', 'where'], lookup: ['items', 'where'],
  matches: ['value', 'schema'], canonicalMap: ['value'], descendants: ['items', 'childrenPath'] };
const booleanOrDynamicOperations = new Set(['all', 'any', 'contains', 'eq', 'gt', 'gte', 'has', 'isNull',
  'lt', 'lte', 'matches', 'ne', 'not', 'setEqual', 'subset', 'unique', 'choose', 'coalesce', 'get', 'lookup', 'productAtMost']);
const emptyArgumentOperations = new Set(['all', 'any', 'coalesce', 'concat', 'merge', 'text']);
const checks = new Set(['expression', 'options', 'quantity', 'rules', 'schema', 'uniqueIds', 'collection']);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const pointerKey = key => key.replace(/~/g, '~0').replace(/\//g, '~1');

function identifier(value, path) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))
    fail(path, 'Use a valid variable name.');
}

function expression(value, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => expression(item, `${path}/${index}`));
    return;
  }
  if (!object(value) || own(value, 'literal')) return;
  if (own(value, 'object')) {
    if (!object(value.object)) fail(`${path}/object`, 'An object constructor needs an object.');
    for (const [key, child] of Object.entries(value.object)) expression(child, `${path}/object/${pointerKey(key)}`);
    return;
  }
  if (own(value, 'array')) {
    if (!Array.isArray(value.array)) fail(`${path}/array`, 'An array constructor needs an array.');
    expression(value.array, `${path}/array`); return;
  }
  if (own(value, 'op')) {
    if (!operations.has(value.op)) fail(`${path}/op`, `Unknown validation operation ${JSON.stringify(value.op)}.`);
    const nativeNamed = value.op === 'choose' && ['when', 'then', 'else'].some(key => own(value, key))
      || value.op === 'get' && ['value', 'key'].some(key => own(value, key));
    if (namedOperations.has(value.op)) {
      for (const key of namedRequired[value.op]) if (!own(value, key)) fail(`${path}/${key}`, `${value.op} requires ${key}.`);
    } else if (nativeNamed) {
      const fields = value.op === 'choose' ? ['when', 'then', 'else'] : ['value', 'key'];
      fields.forEach((key, index) => {
        if (!own(value, key) && (!Array.isArray(value.args) || index >= value.args.length))
          fail(`${path}/${key}`, `${value.op} requires ${key}.`);
      });
    } else if (!nativeNamed) {
      if (!Array.isArray(value.args) && !(value.args === undefined && emptyArgumentOperations.has(value.op)))
        fail(`${path}/args`, 'Operation arguments must be an array.');
      // Reuse the language parser's arity rules when arguments have a printable
      // spelling. Complex native values remain available in their JSON form.
      // Validate arity without serializing an arbitrarily large nested AST.
      // Children are checked recursively below, independently of text limits.
      const args = (value.args || []).map(() => 'null');
      try { parseValidationExpression(`${value.op}(${args.join(', ')})`); }
      catch (error) { fail(path, error.message); }
    }
    if (own(value, 'args')) {
      if (!Array.isArray(value.args)) fail(`${path}/args`, 'Operation arguments must be an array.');
      expression(value.args, `${path}/args`);
    }
    for (const key of ['items', 'value', 'where', 'schema', 'omitValue', 'allowedKeys', 'key', 'when', 'then', 'else', 'childrenPath'])
      if (own(value, key)) expression(value[key], `${path}/${key}`);
    if (own(value, 'as')) identifier(value.as, `${path}/as`);
    return;
  }
  if (!['from', 'var', 'model', 'schema', 'context'].some(key => own(value, key))) return; // Plain objects are native literal data.
  if (own(value, 'var')) identifier(value.var, `${path}/var`);
  if (own(value, 'as')) identifier(value.as, `${path}/as`);
  if (own(value, 'from') && (typeof value.from !== 'string' || !value.from.trim()))
    fail(`${path}/from`, 'A selector source is required.');
  if (typeof value.path === 'string' && value.path !== '' && !value.path.startsWith('/'))
    fail(`${path}/path`, 'Use a JSON Pointer beginning with /, or an empty root pointer.');
  for (const key of ['path', 'where', 'when', 'basePath', 'model', 'schema', 'context'])
    if (own(value, key)) expression(value[key], `${path}/${key}`);
}

function predicate(value, path) {
  expression(value, path);
  // Variable references and conditional expressions have runtime-dependent
  // types. Reject only predicates whose scalar type is already unambiguous.
  if (typeof value !== 'boolean' && !object(value)) fail(path, 'A condition must evaluate to a boolean.');
  if (object(value) && own(value, 'literal') && typeof value.literal !== 'boolean')
    fail(path, 'A condition must evaluate to a boolean.');
  if (object(value) && !own(value, 'literal')) {
    if (own(value, 'op') && !booleanOrDynamicOperations.has(value.op)
      || own(value, 'object') || own(value, 'array') || own(value, 'from') && value.first !== true && !own(value, 'op')
      || !['op', 'from', 'var', 'model', 'schema', 'context'].some(key => own(value, key)))
      fail(path, 'A condition must evaluate to a boolean.');
  }
}

function statements(rules, path) {
  if (!Array.isArray(rules)) fail(path, 'Statements must be an array.');
  rules.forEach((rule, index) => {
    const at = `${path}/${index}`;
    if (!object(rule)) fail(at, 'A statement must be an object.');
    const found = kinds.filter(kind => own(rule, kind));
    if (found.length !== 1) fail(at, 'A statement must contain exactly one rule kind.');
    const kind = found[0];
    const required = key => {
      if (!own(rule, key)) fail(`${at}/${key}`, `${key} is required.`);
    };
    if (own(rule, 'when')) predicate(rule.when, `${at}/when`);
    if (own(rule, 'haltOnErrors') && typeof rule.haltOnErrors !== 'boolean')
      fail(`${at}/haltOnErrors`, 'haltOnErrors must be true or false.');
    if (kind === 'assert') {
      predicate(rule.assert, `${at}/assert`);
      required('message');
      expression(rule.message, `${at}/message`);
    } else if (kind === 'let') {
      identifier(rule.let, `${at}/let`); required('value');
      expression(rule.value, `${at}/value`);
    } else if (kind === 'check') {
      if (!checks.has(rule.check)) fail(`${at}/check`, `Unknown check kind ${JSON.stringify(rule.check)}.`);
      if (own(rule, 'input')) expression(rule.input, `${at}/input`);
      if (own(rule, 'bind')) identifier(rule.bind, `${at}/bind`);
    } else if (kind === 'if') {
      predicate(rule.if, `${at}/if`);
      for (const branch of ['then', 'else']) if (own(rule, branch)) statements(rule[branch], `${at}/${branch}`);
    } else {
      expression(rule[kind], `${at}/${kind}`);
      for (const key of ['as', 'pathAs', 'indexAs']) if (own(rule, key)) identifier(rule[key], `${at}/${key}`);
      required('rules'); statements(rule.rules, `${at}/rules`);
      if (kind === 'forEachTree') {
        required('children');
        if (!object(rule.children) || !['from', 'var', 'model', 'schema', 'context'].some(key => own(rule.children, key)))
          fail(`${at}/children`, 'A tree children selector needs a source.');
        expression(rule.children, `${at}/children`);
      }
    }
    for (const branch of ['rules', 'then', 'else']) {
      const allowed = branch === 'rules' ? kind === 'forEach' || kind === 'forEachTree' : kind === 'if';
      if (own(rule, branch) && !allowed) fail(`${at}/${branch}`, `${branch} is not a branch of a ${kind} statement.`);
    }
  });
}

/** Import statements only; surrounding native program metadata is not applied.
 * Scope and data-dependent expression types belong to whole-program validation.
 */
export function validationRulesFromJson(text) {
  let value;
  try { value = JSON.parse(String(text).replace(/^\uFEFF/, '')); }
  catch (error) { throw new Error(`Validation rule JSON: ${error.message}`); }
  const rules = Array.isArray(value) ? value : object(value) ? value.rules : undefined;
  if (!Array.isArray(rules) || !rules.length)
    fail('/rules', 'Paste a non-empty native statement array or a program object containing rules.');
  statements(rules, '/rules');
  return structuredClone(rules);
}

/** Root-rule counts by position, matching the bulk editor's numbered addresses. */
export function validationRuleChangeCounts(beforeRules, afterRules) {
  const counts = { added: 0, changed: 0, preserved: 0, removed: 0 };
  for (let index = 0; index < Math.max(beforeRules.length, afterRules.length); index++) {
    if (index >= beforeRules.length) counts.added++;
    else if (index >= afterRules.length) counts.removed++;
    else if (JSON.stringify(beforeRules[index]) === JSON.stringify(afterRules[index])) counts.preserved++;
    else counts.changed++;
  }
  return counts;
}

export const validationRuleImportTemplates = [
  { id: 'assert', label: 'Required context value', rules: [
    { assert: { op: 'ne', args: [{ context: '/requiredValue' }, null] }, message: 'A required context value is missing.' },
  ] },
  { id: 'forEach', label: 'For each item + pathAs', rules: [
    { forEach: { from: 'root', path: '/items/*' }, as: 'item', pathAs: 'itemPath', rules: [
      { assert: { op: 'has', args: [{ var: 'item' }, 'name'] }, message: 'Each item needs a name.' },
    ] },
  ] },
  { id: 'forEachTree', label: 'For each tree node', rules: [
    { forEachTree: { from: 'root', path: '/nodes/*' }, as: 'node', pathAs: 'nodePath',
      children: { from: 'node', path: '/children/*' }, rules: [
        { assert: { op: 'has', args: [{ var: 'node' }, 'name'] }, message: 'Each tree node needs a name.' },
      ] },
  ] },
  { id: 'if', label: 'Conditional with nested branches', rules: [
    { if: { op: 'ne', args: [{ context: '/enabled' }, null] }, then: [
      { assert: { op: 'eq', args: [{ context: '/enabled' }, true] }, message: 'The context must be enabled.' },
    ], else: [
      { assert: { op: 'ne', args: [{ context: '/fallback' }, null] }, message: 'Provide a fallback context value.' },
    ] },
  ] },
];
