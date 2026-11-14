/** Static authoring diagnostics for the existing native validation-rule format.
 * Data-dependent types and application policy remain the runtime validator's job.
 */
import { validationRulesFromJson } from './json-import.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const kindOf = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
const builtinTypes = { root: 'unknown', model: 'unknown', schema: 'object', context: 'unknown',
  documents: 'array', path: 'string', __path: 'array' };
const booleanOps = new Set(['all', 'any', 'contains', 'eq', 'gt', 'gte', 'has', 'isNull',
  'lt', 'lte', 'matches', 'ne', 'not', 'setEqual', 'subset', 'unique']);
const numberOps = new Set(['abs', 'length', 'norm', 'product']);
const stringOps = new Set(['format', 'pathString', 'text', 'trim']);
const arrayOps = new Set(['concat', 'distinct', 'entries', 'filter', 'flatten', 'keys', 'map', 'path', 'values']);
const objectOps = new Set(['canonicalMap', 'fromEntries', 'merge', 'schemaAt']);
const pointerToken = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
const address = pointer => pointer.replace(/^\/rules\/(\d+)/, (_, index) => String(Number(index) + 1))
  .replace(/\/(rules|then|else)\/(\d+)/g, (_, branch, index) => `.${branch}[${Number(index) + 1}]`)
  .replace(/\//g, '.');
const constantBoolean = value => typeof value === 'boolean' ? value
  : object(value) && typeof value.literal === 'boolean' ? value.literal : undefined;

/** Returns precise errors and conservative warnings without changing the program.
 * Conditional bindings produce warnings; definitely unavailable bindings are errors.
 */
export function validationProgramDiagnostics(program, { programKey = 'x-fullmeta-rules' } = {}) {
  const result = [];
  const report = (path, message, severity = 'error') => result.push({
    path: `#/${pointerToken(programKey)}${path}`, statementPath: address(path), message, severity,
  });
  if (!object(program) || !Array.isArray(program.rules)) {
    report('/rules', 'A validation program needs a rules array.'); return result;
  }
  if (!program.rules.length) return result;
  try { validationRulesFromJson(JSON.stringify(program.rules)); }
  catch (error) {
    const match = /^(\/rules[^:]*):\s*([\s\S]*)$/.exec(error.message);
    report(match?.[1] || '/rules', match?.[2] || error.message); return result;
  }
  const scope = new Map(Object.entries(builtinTypes).map(([name, type]) => [name, { type, definite: true }]));
  const read = (name, path, env) => {
    const binding = env.get(name);
    if (!binding) { report(path, `$${name} is not available in this statement's scope.`); return 'unknown'; }
    if (!binding.definite) report(path, `$${name} may be undefined because its binding is conditional.`, 'warning');
    return binding.type;
  };
  const expect = (type, allowed, path, label) => {
    if (type !== 'unknown' && !allowed.includes(type))
      report(path, `${label} must evaluate to ${allowed.join(' or ')}; this expression produces ${type}.`);
  };
  const bind = (env, name, type, definite) => {
    const old = env.get(name);
    env.set(name, { type: definite || !old || old.type === type ? type : 'unknown',
      definite: Boolean(definite || old?.definite) });
  };
  function expression(value, path, env) {
    if (Array.isArray(value)) { value.forEach((child, index) => expression(child, `${path}/${index}`, env)); return 'array'; }
    if (!object(value)) return kindOf(value);
    if (own(value, 'literal')) return kindOf(value.literal);
    if (own(value, 'object')) {
      for (const [key, child] of Object.entries(value.object)) expression(child, `${path}/object/${pointerToken(key)}`, env);
      return 'object';
    }
    if (own(value, 'array')) { expression(value.array, `${path}/array`, env); return 'array'; }
    if (own(value, 'op')) {
      if (value.op === 'choose') {
        const named = own(value, 'when'), condition = named ? value.when : value.args?.[0];
        expect(expression(condition, named ? `${path}/when` : `${path}/args/0`, env),
          ['boolean'], named ? `${path}/when` : `${path}/args/0`, 'Choose condition');
        const branch = constantBoolean(condition);
        const yes = () => expression(own(value, 'then') ? value.then : value.args?.[1], own(value, 'then') ? `${path}/then` : `${path}/args/1`, env);
        const no = () => expression(own(value, 'else') ? value.else : value.args?.[2], own(value, 'else') ? `${path}/else` : `${path}/args/2`, env);
        if (branch === true) return yes();
        if (branch === false) return no();
        const a = yes(), b = no(); return a === b ? a : 'unknown';
      }
      const args = value.args || [], types = args.map((child, index) => expression(child, `${path}/args/${index}`, env));
      if (['map', 'filter', 'lookup'].includes(value.op)) {
        expect(expression(value.items, `${path}/items`, env), ['array', 'null'], `${path}/items`, 'Projection input');
        const local = new Map(env);
        for (const [name, type] of [[value.as || 'item', 'unknown'], ['item', 'unknown'], ['index', 'number']])
          local.set(name, { type, definite: true });
        const body = value.op === 'map' ? 'value' : 'where';
        const type = expression(value[body], `${path}/${body}`, local);
        if (body === 'where') expect(type, ['boolean'], `${path}/${body}`, 'Filter predicate');
      } else {
        for (const key of ['items', 'value', 'where', 'schema', 'omitValue', 'allowedKeys', 'key', 'when', 'then', 'else'])
          if (own(value, key)) expression(value[key], `${path}/${key}`, env);
      }
      if (value.op === 'not') expect(types[0], ['boolean'], `${path}/args/0`, 'not input');
      if (['lt', 'lte', 'gt', 'gte'].includes(value.op))
        types.slice(0, 2).forEach((type, index) => expect(type, ['number'], `${path}/args/${index}`, 'Comparison input'));
      if (value.op === 'abs') expect(types[0], ['number'], `${path}/args/0`, 'abs input');
      if (['all', 'any'].includes(value.op)) types.forEach((type, index) => {
        expect(type, ['boolean', 'array'], `${path}/args/${index}`, 'Boolean input');
        if (Array.isArray(args[index])) args[index].forEach((child, item) =>
          expect(expression(child, `${path}/args/${index}/${item}`, env), ['boolean'], `${path}/args/${index}/${item}`, 'Boolean array item'));
      });
      if (['product', 'norm', 'distinct', 'flatten', 'fromEntries', 'unique', 'setEqual', 'subset'].includes(value.op))
        types.slice(0, ['setEqual', 'subset'].includes(value.op) ? 2 : 1).forEach((type, index) =>
          expect(type, ['array', 'null'], `${path}/args/${index}`, 'Collection input'));
      if (['keys', 'values', 'entries'].includes(value.op)) expect(types[0], ['object', 'null'], `${path}/args/0`, 'Object input');
      if (value.op === 'pathString') expect(types[0], ['array'], `${path}/args/0`, 'Path input');
      if (value.op === 'trim' || value.op === 'format') expect(types[0], ['string'], `${path}/args/0`, 'Text input');
      if (value.op === 'length') expect(types[0], ['array', 'object', 'string', 'null'], `${path}/args/0`, 'Length input');
      if (booleanOps.has(value.op)) return 'boolean';
      if (numberOps.has(value.op)) return 'number';
      if (stringOps.has(value.op)) return 'string';
      if (arrayOps.has(value.op)) return 'array';
      if (objectOps.has(value.op)) return 'object';
      return 'unknown';
    }
    if (['from', 'var', 'model', 'schema', 'context'].some(key => own(value, key))) {
      let sourceType = 'unknown';
      if (own(value, 'from') || own(value, 'var')) {
        const key = own(value, 'from') ? 'from' : 'var';
        sourceType = read(value[key], `${path}/${key}`, env);
      }
      if (own(value, 'when')) expect(expression(value.when, `${path}/when`, env), ['boolean'], `${path}/when`, 'Selector condition');
      const pointer = value.path ?? value.model ?? value.schema ?? value.context;
      if (pointer !== undefined && typeof pointer !== 'string') expression(pointer, `${path}/path`, env);
      if (own(value, 'where')) {
        const local = new Map(env);
        for (const [name, type] of [[value.as || 'item', 'unknown'], ['item', 'unknown'], ['index', 'number'], ['key', 'unknown']])
          local.set(name, { type, definite: true });
        expect(expression(value.where, `${path}/where`, local), ['boolean'], `${path}/where`, 'Selector filter');
      }
      if (own(value, 'basePath')) expect(expression(value.basePath, `${path}/basePath`, env), ['array'], `${path}/basePath`, 'Selector base path');
      if (value.first === true) return 'unknown';
      if (own(value, 'from') || typeof pointer === 'string' && pointer.split('/').includes('*')) return 'array';
      return pointer === undefined || pointer === '' ? sourceType : 'unknown';
    }
    return 'object'; // Native plain objects are literal data, including extension metadata.
  }
  function statements(rules, path, env) {
    rules.forEach((rule, index) => {
      const at = `${path}/${index}`;
      if (own(rule, 'when')) expect(expression(rule.when, `${at}/when`, env), ['boolean'], `${at}/when`, 'Statement condition');
      if (rule.when === false || object(rule.when) && rule.when.literal === false) return;
      const definite = !own(rule, 'when') || rule.when === true || object(rule.when) && rule.when.literal === true;
      if (own(rule, 'let')) bind(env, rule.let, expression(rule.value, `${at}/value`, env), definite);
      else if (own(rule, 'check')) {
        if (own(rule, 'input')) expect(expression(rule.input, `${at}/input`, env), ['object'], `${at}/input`, 'Check input');
        if (rule.bind) bind(env, rule.bind, 'unknown', definite);
      } else if (own(rule, 'assert')) {
        expect(expression(rule.assert, `${at}/assert`, env), ['boolean'], `${at}/assert`, 'Assertion');
        expect(expression(rule.message, `${at}/message`, env), ['string'], `${at}/message`, 'Assertion message');
      } else if (own(rule, 'if')) {
        expect(expression(rule.if, `${at}/if`, env), ['boolean'], `${at}/if`, 'Conditional predicate');
        const yes = new Map(env), no = new Map(env);
        const selected = constantBoolean(rule.if);
        if (selected !== false) statements(rule.then || [], `${at}/then`, yes);
        if (selected !== true) statements(rule.else || [], `${at}/else`, no);
        for (const name of new Set([...yes.keys(), ...no.keys()])) {
          const a = selected === false ? no.get(name) : yes.get(name), b = selected === true ? yes.get(name) : no.get(name);
          env.set(name, { type: a?.type === b?.type ? a.type : 'unknown',
            definite: Boolean(definite && a?.definite && b?.definite || env.get(name)?.definite) });
        }
      } else {
        const kind = own(rule, 'forEach') ? 'forEach' : 'forEachTree';
        const type = expression(rule[kind], `${at}/${kind}`, env);
        expect(type, ['array', 'null'], `${at}/${kind}`, 'Loop collection');
        const local = new Map(env);
        local.set(rule.as || 'item', { type: 'unknown', definite: true });
        local.set(rule.indexAs || 'index', { type: 'number', definite: true });
        if (rule.pathAs && rule.pathAs !== 'path') local.set(rule.pathAs, { type: 'array', definite: true });
        local.set('path', { type: 'string', definite: true }); local.set('__path', { type: 'array', definite: true });
        statements(rule.rules, `${at}/rules`, local);
        if (kind === 'forEachTree') expression(rule.children, `${at}/children`, local);
      }
    });
  }
  statements(program.rules, '/rules', scope);
  // A value can appear more than once during type inference; show each issue once.
  return result.filter((item, index) => result.findIndex(other => other.path === item.path && other.message === item.message) === index);
}

export function assertValidationProgramSemantics(program, options) {
  const diagnostics = validationProgramDiagnostics(program, options);
  const error = diagnostics.find(item => item.severity === 'error');
  if (error) throw new Error(`Statement ${error.statementPath} (${error.path}): ${error.message}`);
  return diagnostics;
}
