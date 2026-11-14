/** Application-neutral, reversible recipes for common validation-language rules. */
import { fullMetaValidationProgramKeys } from './program-contract.js';
import { assertValidationProgramSemantics } from './semantic-validation.js';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sameFacts = (left, right, keys) => right && keys.every(key => same(left[key], right[key]));
const text = value => value === undefined ? '' : JSON.stringify(value);
const trim = value => String(value ?? '').trim();
function parseExpression(value, label, optional = false) {
  if (!trim(value)) {
    if (optional) return undefined;
    throw new Error(`${label} is required.`);
  }
  try { return JSON.parse(value); }
  catch { throw new Error(`${label} must be valid validation expression JSON.`); }
}
function variable(value, label) {
  const name = trim(value);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    throw new Error(`${label} must be a valid variable name.`);
  return name;
}
function optionalVariable(value, label) { return trim(value) ? variable(value, label) : undefined; }
function path(value, label, optional = false) {
  const result = trim(value);
  if (result && !result.startsWith('/')) throw new Error(`${label} must be a JSON Pointer starting with / (empty selects the source root).`);
  return result;
}
function setOptional(target, key, value) {
  if (value === undefined || value === '') delete target[key]; else target[key] = value;
}
function semanticAssertion(expression, row) {
  if (!record(expression)) return { mode: 'expression' };
  const args = expression.args;
  if (expression.op === 'ne' && Array.isArray(args) && args.length === 2 && args[1] === null) {
    if (record(args[0]) && typeof args[0].context === 'string')
      return { mode: 'contextPresent', contextPath: args[0].context };
    if (record(args[0]) && typeof args[0].var === 'string' && Object.keys(args[0]).length === 1)
      return { mode: 'variablePresent', operandVariable: args[0].var };
  }
  if (['gt', 'gte'].includes(expression.op) && Array.isArray(args) && args.length === 2
    && record(args[0]) && args[0].op === 'length' && Array.isArray(args[0].args)
    && args[0].args.length === 1 && record(args[0].args[0])
    && typeof args[0].args[0].var === 'string' && typeof args[1] === 'number') {
    return { mode: 'minimumCount', countVariable: args[0].args[0].var,
      countPath: args[0].args[0].path || '', countOperator: expression.op,
      minimum: String(args[1]) };
  }
  if (expression.op === 'eq' && Array.isArray(args) && args.length === 2
    && record(args[0]) && typeof args[0].var === 'string'
    && record(args[1]) && args[1].op === 'get' && Array.isArray(args[1].args)
    && args[1].args.length === 2 && record(args[1].args[0])
    && typeof args[1].args[0].var === 'string' && Number.isInteger(args[1].args[1])) {
    return { mode: 'pathKey', keyVariable: args[0].var, keyField: args[0].path || '',
      pathVariable: args[1].args[0].var, segment: String(args[1].args[1]) };
  }
  return { mode: 'expression' };
}
function bindingFromStatement(statement) {
  if (!record(statement) || typeof statement.let !== 'string') return null;
  const expression = statement.value;
  const concat = expression?.op === 'pathString' && expression.args?.[0]?.op === 'concat'
    ? expression.args[0] : null;
  const args = concat?.args;
  if (Array.isArray(args) && args.length === 2 && args[0]?.var === '__path'
    && Array.isArray(args[1]) && args[1].every(part => typeof part === 'string'))
    return { bindingMode: 'pathSuffix', bindingName: statement.let,
      pathSuffix: args[1].join('/') };
  return { bindingMode: 'expression', bindingName: statement.let,
    bindingExpression: text(expression) };
}
function whereFromScope(scope, alias) {
  const where = scope?.where;
  if (where?.op === 'has' && Array.isArray(where.args) && where.args.length === 2
    && where.args[0]?.var === alias && typeof where.args[1] === 'string')
    return { whereMode: 'hasField', whereField: where.args[1] };
  return where === undefined ? { whereMode: 'none' }
    : { whereMode: 'expression', whereExpression: text(where) };
}
const assertionStatement = statement => record(statement) && Object.hasOwn(statement, 'assert');

/** Returns editable facts only for a supported recipe shape; all other roots remain untouched. */
export function validationRuleRecipeFromRule(rule) {
  if (!record(rule)) return null;
  let kind, assertion, wrapper = rule, binding = null;
  if (typeof rule.let === 'string' && Object.hasOwn(rule, 'value'))
    kind = 'binding';
  else if (typeof rule.check === 'string' && Object.hasOwn(rule, 'input'))
    kind = 'check';
  else if (assertionStatement(rule)) { kind = 'assertion'; assertion = rule; }
  else if (record(rule.if) && Array.isArray(rule.then) && rule.then.length === 1
    && assertionStatement(rule.then[0]) && !Array.isArray(rule.else)) {
    kind = 'guarded'; assertion = rule.then[0];
  } else if (record(rule.forEach) && typeof rule.forEach.from === 'string'
    && typeof rule.forEach.path === 'string' && Array.isArray(rule.rules)
    && (rule.rules.length === 1 || rule.rules.length === 2)) {
    if (rule.rules.length === 2) binding = bindingFromStatement(rule.rules[0]);
    assertion = rule.rules.at(-1);
    if (!assertionStatement(assertion) || (rule.rules.length === 2 && !binding)) return null;
    kind = binding ? 'eachWithPath' : 'each';
  } else return null;
  const facts = {
    kind, scopeFrom: wrapper.forEach?.from || 'root', scopePath: wrapper.forEach?.path || '',
    alias: wrapper.as || '', pathAs: wrapper.pathAs || '', indexAs: wrapper.indexAs || '',
    scopeAs: wrapper.forEach?.as || '', scopeBasePath: text(wrapper.forEach?.basePath),
    scopeWhen: text(wrapper.forEach?.when),
    guardExpression: text(wrapper.if), guardMode: 'expression', guardContextPath: '',
    assertionMode: 'expression', assertionExpression: text(assertion?.assert),
    messageMode: typeof assertion?.message === 'string' || assertion?.message === undefined ? 'text' : 'expression',
    message: typeof assertion?.message === 'string' ? assertion.message : '',
    messageExpression: typeof assertion?.message === 'string' ? '' : text(assertion?.message),
    assertionWhen: text(assertion?.when), haltOnErrors: assertion?.haltOnErrors === true,
    rootName: rule.let || '', rootValueExpression: text(rule.value),
    checkName: rule.check || '', checkInput: text(rule.input),
    checkBind: rule.bind || '', checkHalt: rule.haltOnErrors === true,
    bindingMode: 'none', bindingName: 'path', pathSuffix: '', bindingExpression: '',
    whereMode: 'none', whereField: '', whereExpression: '',
    countVariable: '', countPath: '', countOperator: 'gt', minimum: '0',
    keyVariable: '', keyField: '/id', pathVariable: '', segment: '2',
    contextPath: '', operandVariable: '',
  };
  if (kind === 'guarded' && rule.if?.op === 'ne' && Array.isArray(rule.if.args)
    && rule.if.args.length === 2 && rule.if.args[0]?.context && rule.if.args[1] === null) {
    facts.guardMode = 'contextPresent'; facts.guardContextPath = rule.if.args[0].context;
  }
  if (wrapper.forEach) Object.assign(facts, whereFromScope(wrapper.forEach, facts.alias));
  if (binding) Object.assign(facts, binding);
  if (assertion) Object.assign(facts, Object.fromEntries(Object.entries(semanticAssertion(assertion.assert, facts))
    .map(([key, value]) => [key === 'mode' ? 'assertionMode' : key, value])));
  return facts;
}

const newFacts = () => ({
  kind: 'each', scopeFrom: 'root', scopePath: '', alias: 'item', pathAs: '', indexAs: '',
  scopeAs: '', scopeBasePath: '', scopeWhen: '', whereMode: 'none', whereField: '', whereExpression: '',
  guardMode: 'contextPresent', guardContextPath: '', guardExpression: '',
  assertionMode: 'minimumCount', assertionExpression: '', countVariable: '', countPath: '',
  countOperator: 'gt', minimum: '0', keyVariable: '', keyField: '/id', pathVariable: '', segment: '2',
  contextPath: '', operandVariable: '', bindingMode: 'pathSuffix', bindingName: 'path',
  pathSuffix: '', bindingExpression: '', messageMode: 'text', message: '',
  messageExpression: '', assertionWhen: '', haltOnErrors: false,
  rootName: '', rootValueExpression: '', checkName: '', checkInput: '',
  checkBind: '', checkHalt: false,
});

function assertionFromFacts(facts) {
  const f = facts;
  if (f.assertionMode === 'expression') return parseExpression(f.assertionExpression, 'Assertion expression');
  if (f.assertionMode === 'contextPresent')
    return { op: 'ne', args: [{ context: path(f.contextPath, 'Context path') }, null] };
  if (f.assertionMode === 'variablePresent')
    return { op: 'ne', args: [{ var: variable(f.operandVariable, 'Variable') }, null] };
  if (f.assertionMode === 'minimumCount') {
    const count = Number(trim(f.minimum));
    if (!Number.isInteger(count) || count < 0) throw new Error('Minimum count must be a nonnegative integer.');
    const item = { var: variable(f.countVariable || f.alias, 'Count variable') };
    if (trim(f.countPath)) item.path = path(f.countPath, 'Count field path');
    return { op: f.countOperator === 'gte' ? 'gte' : 'gt',
      args: [{ op: 'length', args: [item] }, count] };
  }
  if (f.assertionMode === 'pathKey') {
    const segment = Number(trim(f.segment));
    if (!Number.isInteger(segment) || segment < 0) throw new Error('Path segment must be a nonnegative integer.');
    const item = { var: variable(f.keyVariable || f.alias, 'Item variable') };
    if (trim(f.keyField)) item.path = path(f.keyField, 'Item field path');
    return { op: 'eq', args: [item, { op: 'get',
      args: [{ var: variable(f.pathVariable || f.pathAs, 'Path variable') }, segment] }] };
  }
  throw new Error('Choose an assertion recipe.');
}
function assertionStatementFromFacts(facts, original = null, originalFacts = null) {
  const statement = original && assertionStatement(original) ? clone(original) : {};
  const assertionKeys = facts.assertionMode === 'minimumCount'
    ? ['assertionMode', 'countVariable', 'countPath', 'countOperator', 'minimum']
    : facts.assertionMode === 'pathKey'
      ? ['assertionMode', 'keyVariable', 'keyField', 'pathVariable', 'segment']
      : facts.assertionMode === 'contextPresent' ? ['assertionMode', 'contextPath']
        : facts.assertionMode === 'variablePresent' ? ['assertionMode', 'operandVariable']
          : ['assertionMode', 'assertionExpression'];
  statement.assert = original && sameFacts(facts, originalFacts, assertionKeys)
    ? clone(original.assert) : assertionFromFacts(facts);
  if (facts.messageMode === 'expression') setOptional(statement, 'message',
    parseExpression(facts.messageExpression, 'Message expression', true));
  else setOptional(statement, 'message', trim(facts.message));
  setOptional(statement, 'when', parseExpression(facts.assertionWhen, 'Assertion when', true));
  if (facts.haltOnErrors) statement.haltOnErrors = true; else delete statement.haltOnErrors;
  for (const [key, fields] of Object.entries({ message: ['messageMode', 'message', 'messageExpression'],
    when: ['assertionWhen'], haltOnErrors: ['haltOnErrors'] })) {
    if (!original || !sameFacts(facts, originalFacts, fields)) continue;
    if (Object.hasOwn(original, key)) statement[key] = clone(original[key]); else delete statement[key];
  }
  return statement;
}
function bindingFromFacts(facts, original = null, originalFacts = null) {
  const node = record(original) && Object.hasOwn(original, 'let') ? clone(original) : {};
  node.let = variable(facts.bindingName, 'Path binding name');
  if (original && sameFacts(facts, originalFacts,
    ['bindingMode', 'bindingName', 'pathSuffix', 'bindingExpression']))
    node.value = clone(original.value);
  else if (facts.bindingMode === 'pathSuffix') {
    const parts = trim(facts.pathSuffix).split('/').filter(Boolean);
    if (!parts.length || parts.some(part => part === '.' || part === '..'))
      throw new Error('Derived path suffix must contain one or more property names.');
    node.value = { op: 'pathString', args: [{ op: 'concat',
      args: [{ var: '__path' }, parts] }] };
  } else node.value = parseExpression(facts.bindingExpression, 'Path binding expression');
  return node;
}

/** Builds a standard validation-language root from semantic recipe facts. */
export function validationRuleFromRecipe(facts, original = null) {
  const f = facts, result = record(original) ? clone(original) : {};
  const originalFacts = original ? validationRuleRecipeFromRule(original) : null;
  if (original && same(facts, originalFacts)) return clone(original);
  if (f.kind === 'binding') {
    if (original && !Object.hasOwn(original, 'let')) throw new Error('Existing recipe kind cannot change.');
    result.let = variable(f.rootName, 'Value binding name');
    result.value = parseExpression(f.rootValueExpression, 'Bound value expression');
    return result;
  }
  if (f.kind === 'check') {
    if (original && !Object.hasOwn(original, 'check')) throw new Error('Existing recipe kind cannot change.');
    result.check = trim(f.checkName);
    if (!result.check) throw new Error('Check name is required.');
    result.input = parseExpression(f.checkInput, 'Check input expression');
    setOptional(result, 'bind', optionalVariable(f.checkBind, 'Check result variable'));
    if (f.checkHalt) result.haltOnErrors = true; else delete result.haltOnErrors;
    return result;
  }
  if (f.kind === 'assertion') {
    if (original && !assertionStatement(original)) throw new Error('Existing recipe kind cannot change.');
    return assertionStatementFromFacts(f, result, originalFacts);
  }
  if (f.kind === 'guarded') {
    if (original && !Object.hasOwn(original, 'if')) throw new Error('Existing recipe kind cannot change.');
    result.if = original && sameFacts(f, originalFacts,
      ['guardMode', 'guardContextPath', 'guardExpression']) ? clone(original.if)
      : f.guardMode === 'contextPresent'
        ? { op: 'ne', args: [{ context: path(f.guardContextPath, 'Guard context path') }, null] }
        : parseExpression(f.guardExpression, 'Guard expression');
    result.then = [assertionStatementFromFacts(f, original?.then?.[0], originalFacts)];
    return result;
  }
  if (!['each', 'eachWithPath'].includes(f.kind)) throw new Error('Choose a rule recipe.');
  if (original && !Object.hasOwn(original, 'forEach')) throw new Error('Existing recipe kind cannot change.');
  result.as = variable(f.alias, 'Item variable');
  const scope = record(result.forEach) ? clone(result.forEach) : {};
  scope.from = trim(f.scopeFrom);
  if (!scope.from) throw new Error('Collection source is required.');
  scope.path = path(f.scopePath, 'Collection path');
  if (original && sameFacts(f, originalFacts,
    ['whereMode', 'whereField', 'whereExpression', 'alias'])) {
    if (original.forEach.where === undefined) delete scope.where;
    else scope.where = clone(original.forEach.where);
  } else if (f.whereMode === 'hasField') {
    if (!trim(f.whereField)) throw new Error('Where field is required.');
    scope.where = { op: 'has', args: [{ var: result.as }, trim(f.whereField)] };
  } else if (f.whereMode === 'expression')
    scope.where = parseExpression(f.whereExpression, 'Where expression');
  else delete scope.where;
  setOptional(scope, 'basePath', parseExpression(f.scopeBasePath, 'Collection base path', true));
  setOptional(scope, 'when', parseExpression(f.scopeWhen, 'Collection when', true));
  setOptional(scope, 'as', optionalVariable(f.scopeAs, 'Inner item variable'));
  for (const [key, fields] of Object.entries({ from: ['scopeFrom'], path: ['scopePath'],
    basePath: ['scopeBasePath'], when: ['scopeWhen'], as: ['scopeAs'] })) {
    if (!original || !sameFacts(f, originalFacts, fields)) continue;
    if (Object.hasOwn(original.forEach, key)) scope[key] = clone(original.forEach[key]); else delete scope[key];
  }
  result.forEach = scope;
  setOptional(result, 'pathAs', optionalVariable(f.pathAs, 'Path variable'));
  setOptional(result, 'indexAs', optionalVariable(f.indexAs, 'Index variable'));
  for (const [key, field] of Object.entries({ as: 'alias', pathAs: 'pathAs', indexAs: 'indexAs' })) {
    if (!original || !sameFacts(f, originalFacts, [field])) continue;
    if (Object.hasOwn(original, key)) result[key] = clone(original[key]); else delete result[key];
  }
  if (f.kind === 'eachWithPath') result.rules = [
    bindingFromFacts(f, original?.rules?.[0], originalFacts),
    assertionStatementFromFacts(f, original?.rules?.[1], originalFacts),
  ];
  else result.rules = [assertionStatementFromFacts(f, original?.rules?.[0], originalFacts)];
  return result;
}

const KINDS = [['binding', 'Named value'], ['check', 'Named check'],
  ['assertion', 'Direct assertion'], ['guarded', 'Guarded assertion'],
  ['each', 'For each item'], ['eachWithPath', 'For each + derived path']];
const ASSERTIONS = [['minimumCount', 'Minimum collection size'], ['pathKey', 'Item field equals path key'],
  ['contextPresent', 'Context value present'], ['variablePresent', 'Variable present'],
  ['expression', 'Expression JSON']];

/** These seeds use the same reversible recipe facts as the existing recipe table. */
export const validationRuleRecipeTemplates = [
  { id: 'minimumCount', label: 'Each item: minimum collection size', facts: {
    ...newFacts(), kind: 'each', scopePath: '/items/*', pathAs: 'itemPath',
    countPath: '/values', minimum: '1', countOperator: 'gte', message: 'Each item needs at least one value.',
  } },
  { id: 'pathKey', label: 'Each item: field equals its map key', facts: {
    ...newFacts(), kind: 'each', scopePath: '/items/*', pathAs: 'itemPath', assertionMode: 'pathKey',
    keyField: '/id', segment: '1', message: 'Item ID must match its map key.',
  } },
  { id: 'contextPresent', label: 'Required context value', facts: {
    ...newFacts(), kind: 'assertion', assertionMode: 'contextPresent', contextPath: '/requiredValue',
    message: 'A required context value is missing.',
  } },
  { id: 'guarded', label: 'Conditional context requirement', facts: {
    ...newFacts(), kind: 'guarded', guardContextPath: '/enabled', assertionMode: 'contextPresent',
    contextPath: '/requiredValue', message: 'Provide the required value when this context is enabled.',
  } },
  { id: 'binding', label: 'Bind a reusable collection', facts: {
    ...newFacts(), kind: 'binding', rootName: 'items', rootValueExpression: '{"from":"root","path":"/items/*"}',
  } },
  { id: 'check', label: 'Check unique IDs', facts: {
    ...newFacts(), kind: 'check', checkName: 'uniqueIds', checkInput: '{"object":{"value":{"model":""}}}',
  } },
];

