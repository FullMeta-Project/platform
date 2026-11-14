/** Versioned authored obligations compiled to the existing FullMeta rule AST.
 * This module has no renderer, DOM, application or execution dependencies.
 */
import { isFullMetaValidationProgramKey } from './program-contract.js';
import { conditionIdentity } from './condition-equivalence.js';
export { compareConditions } from './condition-equivalence.js';

export const declarativeValidationFormat = 'fullmeta-declarative-rules/1';
export const declarativeRuleSources = ['root', 'model', 'schema', 'context'];
export const declarativeConstraintTypes = [
  { type: 'required', label: 'Value is required', bounds: 'none' },
  { type: 'forbidden', label: 'Value is forbidden', bounds: 'none' },
  { type: 'nonblank', label: 'Text is nonblank', bounds: 'none' },
  { type: 'equals', label: 'Values are equal', other: true, bounds: 'none' },
  { type: 'notEquals', label: 'Values differ', other: true, bounds: 'none' },
  { type: 'unique', label: 'Collection values are unique', collection: true, bounds: 'none' },
  { type: 'memberOf', label: 'Value belongs to registry or collection', other: true, bounds: 'none' },
  { type: 'memberOfDifference', label: 'Value belongs to one collection excluding another', other: true, excluded: true, bounds: 'none' },
  { type: 'subset', label: 'Collection is a subset', other: true, collection: true, bounds: 'none' },
  { type: 'setEqual', label: 'Collections contain the same values', other: true, collection: true, bounds: 'none' },
  { type: 'minimum', label: 'Value meets a minimum', bounds: 'minimum' },
  { type: 'maximum', label: 'Value meets a maximum', bounds: 'maximum' },
  { type: 'range', label: 'Value is within a range', bounds: 'range' },
  { type: 'minCount', label: 'Collection count meets a minimum', collection: true, bounds: 'minimum' },
  { type: 'maxCount', label: 'Collection count meets a maximum', collection: true, bounds: 'maximum' },
  { type: 'countRange', label: 'Collection count is within a range', collection: true, bounds: 'range' },
  { type: 'uniqueBy', label: 'Collection field values are unique', collection: true, projection: true, bounds: 'none' },
  { type: 'semanticCheck', label: 'Reusable semantic check', semantic: true, bounds: 'none' },
  { type: 'keyMatchesField', label: 'Object keys match item fields', keyed: true, projection: true, bounds: 'none' },
  { type: 'lessThan', label: 'Value is less than another', other: true, bounds: 'none' },
  { type: 'lessOrEqual', label: 'Value is at most another', other: true, bounds: 'none' },
  { type: 'greaterThan', label: 'Value is greater than another', other: true, bounds: 'none' },
  { type: 'greaterOrEqual', label: 'Value is at least another', other: true, bounds: 'none' },
  { type: 'notMemberOf', label: 'Value does not belong to registry or collection', other: true, bounds: 'none' },
  { type: 'productAtMost', label: 'Product of item counts is at most a limit', collection: true, other: true, aggregate: true, bounds: 'none' },
  { type: 'countAtMost', label: 'Collection count is at most a limit', collection: true, other: true, bounds: 'none' },
  { type: 'disjoint', label: 'Collections share no values', collection: true, other: true, bounds: 'none' },
  { type: 'uniqueCanonicalMapBy', label: 'Collection maps are unique after omitting a value', collection: true, projection: true, omitMapValue: true, bounds: 'none' },
].map(descriptor => Object.freeze({ other: false, collection: false, ...descriptor }));

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const clone = value => structuredClone(value);
const token = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
const descriptors = new Map(declarativeConstraintTypes.map(descriptor => [descriptor.type, descriptor]));
const op = (name, ...args) => ({ op: name, args });
const literal = value => ({ literal: clone(value) });
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function conditionKey(condition) {
  return conditionIdentity(condition);
}

function declarativeIdentity(record) {
    if (!object(record) || !object(record.scope) || !object(record.constraint) || typeof record.stage !== 'string') return null;
    // An unfinished editor draft must never be presented as a proved identity.
    // Dependency resolution needs the whole program, so only structural
    // diagnostics can be decided from this individual record.
    if (recordDiagnostics([record]).some(item => item.code !== 'invalid-dependency')) return null;
    const scope = clone(record.scope), conditions = [conditionKey(scope.when)];
    delete scope.when;
    if (Array.isArray(scope.nested)) scope.nested = scope.nested.map(item => {
      if (!object(item)) { conditions.push(null); return item; }
      const next = { ...item }; conditions.push(conditionKey(next.when)); delete next.when; return next;
    });
    const constraint = clone(record.constraint);
    if (constraint.entryWhen) { conditions.push(conditionKey(constraint.entryWhen)); delete constraint.entryWhen; }
    if (!['semanticCheck', 'keyMatchesField', 'productAtMost', 'countAtMost', 'disjoint'].includes(constraint.type)) {
      const predicate = conditionKey(constraint);
      if (predicate === null) return null;
      conditions.push(predicate);
      for (const key of Object.keys(constraint)) delete constraint[key];
    }
    if (['equals', 'notEquals', 'setEqual', 'disjoint'].includes(constraint.type) && object(constraint.subject) && object(constraint.other)
        && JSON.stringify(canonical(constraint.subject)) > JSON.stringify(canonical(constraint.other)))
      [constraint.subject, constraint.other] = [constraint.other, constraint.subject];
    conditions.push(conditionKey(record.when));
    if (conditions.includes(null)) return null;
    return JSON.stringify(canonical({ stage: record.stage, scope, constraint, conditions }));
}

/** Compare validation behavior; diagnostic messages and locations may differ. */
export function compareDeclarativeObligations(left, right) {
  const a = declarativeIdentity(left), b = declarativeIdentity(right);
  return a !== null && b !== null && a === b ? 'equivalent' : 'unknown';
}

export function equivalentDeclarativeObligations(records) {
  const matches = [], seen = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const identity = declarativeIdentity(record);
    if (identity === null) continue;
    if (seen.has(identity)) matches.push({ first: seen.get(identity), second: record.id });
    else seen.set(identity, record.id);
  }
  return matches;
}
const jsonValue = (value, visiting = new Set()) => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!object(value) && !Array.isArray(value) || visiting.has(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
  const next = new Set(visiting); next.add(value);
  return Object.values(value).every(child => jsonValue(child, next));
};

export function createDeclarativeObligation(overrides = {}) {
  const defaults = { id: 'requirement_1', name: 'Required value', stage: 'model',
    scope: { source: 'root', path: '', nested: [] },
    constraint: { type: 'required', subject: { field: '/value' } },
    diagnostic: { path: '/value', message: 'A required value is missing.' } };
  return { ...defaults, ...clone(overrides),
    scope: { ...defaults.scope, ...clone(overrides.scope || {}) },
    constraint: { ...defaults.constraint, ...clone(overrides.constraint || {}) },
    diagnostic: { ...defaults.diagnostic, ...clone(overrides.diagnostic || {}) } };
}

function recordDiagnostics(obligations, { programKey } = {}) {
  const diagnostics = [], base = programKey ? `#/${token(programKey)}` : '#';
  const report = (row, suffix, message, code = 'invalid-obligation') => diagnostics.push({
    severity: 'error', code, row: row + 1, obligationId: obligations?.[row]?.id || '',
    path: `${base}/declarative/obligations${row < 0 ? '' : `/${row}`}${suffix}`, message,
  });
  if (!Array.isArray(obligations)) { report(-1, '', 'Authored obligations must be an array.'); return diagnostics; }
  const pointer = (value, row, path, { wildcard = true } = {}) => {
    if (typeof value !== 'string' || value !== '' && !value.startsWith('/') || /~(?![01])/.test(value || '')) {
      report(row, path, 'Use a JSON Pointer beginning with /, or an empty root pointer.'); return false;
    }
    if (!wildcard && value.split('/').slice(1).includes('*')) {
      report(row, path, 'A diagnostic location must identify one field; wildcard paths are not allowed.'); return false;
    }
    return true;
  };
  const operand = (value, row, path, depth = 0) => {
    if (depth > 16) { report(row, path, 'Structured operands support at most 16 nested levels.'); return; }
    if (!object(value)) { report(row, path, 'Select a field, an explicit source/path, or a literal value.'); return; }
    const count = ['field', 'source', 'literal', 'binding', 'ancestor', 'object', 'array', 'norm', 'select', 'canonicalMap'].filter(key => own(value, key)).length;
    if (count !== 1) { report(row, path, 'An operand must select exactly one source, literal, object, or array.'); return; }
    if (own(value, 'norm')) operand(value.norm, row, `${path}/norm`, depth + 1);
    if (own(value, 'canonicalMap')) {
      if (!object(value.canonicalMap)) report(row, path, 'Declare a map value and the entry value to omit.');
      else {
        operand(value.canonicalMap.value, row, `${path}/canonicalMap/value`, depth + 1);
        operand(value.canonicalMap.omitValue, row, `${path}/canonicalMap/omitValue`, depth + 1);
      }
    }
    if (own(value, 'select')) {
      const query = value.select;
      if (!object(query) || !['items', 'keys', 'values', 'entries'].includes(query.kind)) report(row, path, 'Choose collection items, object keys, values, or entries.');
      else {
        if (own(query, 'single') && typeof query.single !== 'boolean') report(row, path, 'Single selection must be true or false.');
        if (own(query, 'flatten') && typeof query.flatten !== 'boolean') report(row, path, 'Flatten selection must be true or false.');
        if (own(query, 'childrenPath')) {
          pointer(query.childrenPath, row, `${path}/select/childrenPath`);
          if (!query.childrenPath) report(row, path, 'A recursive child path must not be empty.');
        }
        operand(query.from, row, `${path}/select/from`, depth + 1);
        if (own(query, 'where')) constraint(query.where, row, `${path}/select/where`);
        if (own(query, 'value')) operand(query.value, row, `${path}/select/value`, depth + 1);
      }
    }
    if (own(value, 'object')) {
      if (!object(value.object) || Object.keys(value.object).length > 64) report(row, path, 'Use an object of at most 64 named operands.');
      else for (const [key, child] of Object.entries(value.object)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) report(row, path, 'Use a nonreserved identifier for each object member.');
        operand(child, row, `${path}/object/${key}`, depth + 1);
      }
    }
    if (own(value, 'array')) {
      if (!Array.isArray(value.array) || value.array.length > 64) report(row, path, 'Use an array of at most 64 operands.');
      else value.array.forEach((child, index) => operand(child, row, `${path}/array/${index}`, depth + 1));
    }
    if (own(value, 'field')) pointer(value.field, row, `${path}/field`);
    if (own(value, 'source')) {
      if (!declarativeRuleSources.includes(value.source)) report(row, `${path}/source`, 'Select root, model, schema or context.');
      pointer(value.path, row, `${path}/path`);
    }
    if (own(value, 'binding')) {
      if (own(value, 'allowErrors') && typeof value.allowErrors !== 'boolean') report(row, `${path}/allowErrors`, 'Allow failed check results must be true or false.');
      if (typeof value.binding !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(value.binding))
        report(row, `${path}/binding`, 'Use a derived result name beginning with a letter.');
      pointer(value.path, row, `${path}/path`);
    }
    if (own(value, 'ancestor')) {
      const nestedMatch = /^\/scope\/nested\/(\d+)\/when/.exec(path);
      const scopeDepth = path.startsWith('/scope/when') ? 0 : nestedMatch ? Number(nestedMatch[1]) + 1 : (obligations[row]?.scope?.nested?.length || 0);
      const depth = Math.min(16, scopeDepth + [...path.matchAll(/\/select\/(?:where|value)(?=\/|$)/g)].length);
      if (!Number.isSafeInteger(value.ancestor) || value.ancestor < 1 || value.ancestor > depth || path.includes('/entryWhen'))
        report(row, `${path}/ancestor`, 'Choose an available parent scope.');
      pointer(value.path, row, `${path}/path`);
    }
    if (own(value, 'literal')) {
      if (!jsonValue(value.literal)) report(row, `${path}/literal`, 'Literal values must be finite serializable JSON.');
    }
  };
  const constraint = (value, row, path, depth = 0) => {
    if (!object(value) || depth > 16) { report(row, path, 'Use a supported declarative constraint (maximum condition depth is 16).'); return; }
    const combinations = ['all', 'any', 'not'].filter(key => own(value, key));
    if (combinations.length) {
      if (combinations.length !== 1 || own(value, 'type')) { report(row, path, 'Choose one condition combination or one constraint type.'); return; }
      const key = combinations[0];
      if (key === 'not') constraint(value.not, row, `${path}/not`, depth + 1);
      else if (!Array.isArray(value[key]) || !value[key].length) report(row, `${path}/${key}`, 'Use a non-empty condition list.');
      else value[key].forEach((child, index) => constraint(child, row, `${path}/${key}/${index}`, depth + 1));
      return;
    }
    const descriptor = descriptors.get(value.type);
    if (!descriptor) { report(row, `${path}/type`, 'Choose a supported reusable constraint type.'); return; }
    operand(value.subject, row, `${path}/subject`);
    if (descriptor.other) operand(value.other, row, `${path}/other`);
    if (descriptor.excluded) operand(value.excluded, row, `${path}/excluded`);
    if (descriptor.projection) pointer(value.itemPath, row, `${path}/itemPath`);
    if (descriptor.omitMapValue && typeof value.omitValue !== 'string') report(row, `${path}/omitValue`, 'Enter the map value to omit from comparisons.');
    if (descriptor.aggregate) {
      pointer(value.countPath, row, `${path}/countPath`, { wildcard: false });
      pointer(value.collectionPath, row, `${path}/collectionPath`, { wildcard: false });
    }
    if (descriptor.keyed && (!object(value.subject) || !own(value.subject, 'field')
      || String(value.subject.field || '').split('/').includes('*')))
      report(row, `${path}/subject`, 'Use a non-wildcard field relative to the selected subject for a keyed collection.');
    if (descriptor.keyed && path !== '/constraint') report(row, path, 'Key matching is an obligation, not an applicability condition.');
    if (descriptor.keyed && own(value, 'entryWhen')) constraint(value.entryWhen, row, `${path}/entryWhen`, depth + 1);
    if (descriptor.semantic) {
      if (path !== '/constraint') report(row, path, 'Semantic checks are obligations, not applicability conditions.');
      if (!['quantity', 'expression', 'uniqueIds', 'rules', 'collection'].includes(value.check))
        report(row, `${path}/check`, 'Choose a supported semantic check.');
      if (own(value, 'gate') && typeof value.gate !== 'boolean') report(row, `${path}/gate`, 'Use true or false for the prerequisite.');
      if (own(value, 'expose') && (typeof value.expose !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(value.expose)))
        report(row, `${path}/expose`, 'Use a derived result name beginning with a letter.');
      const names = new Set();
      const inputName = (name, location) => {
        if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || name === 'path')
          report(row, location, 'Use a nonreserved input name beginning with a letter.');
        else if (names.has(name)) report(row, location, 'Each semantic input name must be unique.');
        else names.add(name);
      };
      inputName(value.subjectInput, `${path}/subjectInput`);
      if (!Array.isArray(value.inputs) || value.inputs.length > 64) report(row, `${path}/inputs`, 'Use at most 64 semantic inputs.');
      else value.inputs.forEach((input, index) => {
        if (!object(input)) { report(row, `${path}/inputs/${index}`, 'Use an input name and operand.'); return; }
        inputName(input.name, `${path}/inputs/${index}/name`);
        operand(input.operand, row, `${path}/inputs/${index}/operand`);
      });
    }
    const bounds = descriptor.bounds === 'range' ? ['minimum', 'maximum']
      : descriptor.bounds === 'none' ? [] : [descriptor.bounds];
    for (const bound of bounds) {
      if (typeof value[bound] !== 'number' || !Number.isFinite(value[bound])
        || /Count$|^countRange$/.test(value.type) && (!Number.isSafeInteger(value[bound]) || value[bound] < 0))
        report(row, `${path}/${bound}`, /Count$|^countRange$/.test(value.type) ? 'Use a nonnegative safe integer.' : 'Use a finite number.');
    }
    if (descriptor.bounds === 'range' && typeof value.minimum === 'number' && typeof value.maximum === 'number'
      && value.minimum > value.maximum) report(row, path, 'The minimum must not exceed the maximum.');
  };
  const ids = new Set(); let stage, gateRow;
  obligations.forEach((record, row) => {
    if (!object(record)) { report(row, '', 'Each obligation must be a record.'); return; }
    if (typeof record.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(record.id)) report(row, '/id', 'Use a stable identifier beginning with a letter.');
    else if (ids.has(record.id)) report(row, '/id', `Obligation identifier ${record.id} is duplicated.`); else ids.add(record.id);
    for (const key of ['name', 'stage']) if (typeof record[key] !== 'string' || !record[key].trim()) report(row, `/${key}`, `${key} must be nonblank text.`);
    if (typeof record.stage === 'string' && record.stage.trim()) {
      if (stage === undefined) stage = record.stage;
      else if (stage !== record.stage) report(row, '/stage', 'A target program is one execution stage. Put obligations for another stage in a separate validation program.');
    }
    if (!object(record.scope)) report(row, '/scope', 'Select a source and subject scope.');
    else {
      if (!declarativeRuleSources.includes(record.scope.source)) report(row, '/scope/source', 'Select root, model, schema or context.');
      pointer(record.scope.path, row, '/scope/path');
      if (own(record.scope, 'when')) constraint(record.scope.when, row, '/scope/when');
      if (own(record.scope, 'childrenPath')) {
        if (pointer(record.scope.childrenPath, row, '/scope/childrenPath') && !record.scope.childrenPath)
          report(row, '/scope/childrenPath', 'A recursive child path must not be empty.');
      }
      if (own(record.scope, 'nested')) {
        if (!Array.isArray(record.scope.nested) || record.scope.nested.length > 16) report(row, '/scope/nested', 'Nested scopes must be an array of at most 16 relative path records.');
        else record.scope.nested.forEach((scope, index) => {
          if (!object(scope)) report(row, `/scope/nested/${index}`, 'Use a relative scope path record.');
          else {
            pointer(scope.path, row, `/scope/nested/${index}/path`);
            if (own(scope, 'when')) constraint(scope.when, row, `/scope/nested/${index}/when`);
            if (own(scope, 'childrenPath') && pointer(scope.childrenPath, row, `/scope/nested/${index}/childrenPath`) && !scope.childrenPath)
              report(row, `/scope/nested/${index}/childrenPath`, 'A recursive child path must not be empty.');
          }
        });
      }
    }
    constraint(record.constraint, row, '/constraint');
    if (record.constraint?.gate === true) {
      if (record.constraint.type !== 'semanticCheck' || !object(record.scope) || !rootScope(record.scope) || own(record, 'when'))
        report(row, '/constraint/gate', 'A prerequisite must be an unconditional root-scoped semantic check.');
      if (gateRow !== undefined) report(row, '/constraint/gate', 'A program may declare at most one prerequisite.');
      else gateRow = row;
    }
    if (object(record.constraint) && own(record.constraint, 'expose')) {
      if (record.constraint.type !== 'semanticCheck') report(row, '/constraint/expose', 'Only a semantic check can expose a result.');
      if (own(record, 'when')) report(row, '/constraint/expose', 'A reusable result requires an unconditional check.');
    }
    // Combinations describe applicability; a primary obligation remains one constraint.
    if (object(record.constraint) && ['all', 'any', 'not'].some(key => own(record.constraint, key)))
      report(row, '/constraint', 'Use one primary constraint per obligation; combinations belong in when.');
    if (own(record, 'when')) constraint(record.when, row, '/when');
    if (!object(record.diagnostic)) report(row, '/diagnostic', 'Provide a diagnostic location and message.');
    else {
      if (own(record.diagnostic, 'path')) pointer(record.diagnostic.path, row, '/diagnostic/path', { wildcard: false });
      if (typeof record.diagnostic.message !== 'string' || !record.diagnostic.message.trim()) report(row, '/diagnostic/message', 'The user-facing diagnostic message must be nonblank text.');
    }
  });
  if (!diagnostics.length) dependencyOrder(obligations, (row, message) => report(row, '/constraint', message, 'invalid-dependency'));
  return diagnostics;
}

// Only recognized operands are dependencies; arbitrary extension data and literal
// JSON must never acquire semantics merely because they contain a "binding" key.
function dependencyOrder(obligations, report) {
  const producers = new Map(), dependencies = obligations.map(() => new Set()), requiredSuccess = obligations.map(() => new Set());
  obligations.forEach((record, row) => {
    const name = record.constraint.expose;
    if (!name) return;
    if (producers.has(name)) report(row, `Derived result ${name} is declared more than once.`);
    else producers.set(name, row);
  });
  const gate = obligations.findIndex(record => record.constraint.gate === true);
  if (gate >= 0 && dependencies[gate].size) report(gate, 'A program prerequisite cannot depend on another named result.');
  const visitConstraint = (value, names, strictNames) => {
    if (!object(value)) return;
    for (const part of ['all', 'any']) if (Array.isArray(value[part])) value[part].forEach(child => visitConstraint(child, names, strictNames));
    if (value.not) visitConstraint(value.not, names, strictNames);
    const descriptor = descriptors.get(value.type);
    if (!descriptor) return;
    const operands = [value.subject, ...(descriptor.other ? [value.other] : []), ...(descriptor.excluded ? [value.excluded] : []),
      ...(descriptor.semantic && Array.isArray(value.inputs) ? value.inputs.map(input => input.operand) : [])];
    const visitOperand = operand => {
      if (!object(operand)) return;
      if (typeof operand.binding === 'string') { names.add(operand.binding); if (operand.allowErrors !== true) strictNames?.add(operand.binding); }
      if (object(operand.object)) Object.values(operand.object).forEach(visitOperand);
      if (Array.isArray(operand.array)) operand.array.forEach(visitOperand);
      if (object(operand.norm)) visitOperand(operand.norm);
      if (object(operand.canonicalMap)) { visitOperand(operand.canonicalMap.value); visitOperand(operand.canonicalMap.omitValue); }
      if (object(operand.select)) {
        visitOperand(operand.select.from); visitOperand(operand.select.value);
        visitConstraint(operand.select.where, names, strictNames);
      }
    };
    operands.forEach(visitOperand);
    if (descriptor.keyed) visitConstraint(value.entryWhen, names, strictNames);
  };
  obligations.forEach((record, row) => {
    visitConstraint(record.constraint, dependencies[row], requiredSuccess[row]); visitConstraint(record.when, dependencies[row], requiredSuccess[row]);
    visitConstraint(record.scope?.when, dependencies[row], requiredSuccess[row]);
    for (const scope of record.scope?.nested || []) visitConstraint(scope.when, dependencies[row], requiredSuccess[row]);
    for (const name of dependencies[row]) {
      if (!producers.has(name)) report(row, `Derived result ${name} is not declared.`);
      else {
        const source = obligations[producers.get(name)];
        if (!rootScope(source.scope) && !scopeContains(source.scope, record.scope))
          report(row, `Derived result ${name} is available only in its declared subject scope or a nested child scope.`);
      }
    }
    const parts = scopeParts(record.scope);
    [record.scope, ...(record.scope?.nested || [])].forEach((scope, depth) => {
      const names = new Set(); visitConstraint(scope?.when, names);
      for (const name of names) {
        if (!producers.has(name)) continue;
        const source = obligations[producers.get(name)].scope;
        const producerParts = scopeParts(source);
        if (!rootScope(source) && !(producerParts.length <= depth
          && producerParts.every((part, index) => part === parts[index])))
          report(row, `Scope filter result ${name} must be declared at an ancestor scope or the program root.`);
      }
    });
  });
  const state = new Array(obligations.length).fill(0), sorted = [];
  const visit = row => {
    if (state[row] === 2) return;
    if (state[row] === 1) { report(row, 'Derived result dependencies contain a cycle.'); return; }
    state[row] = 1;
    for (const name of dependencies[row]) if (producers.has(name)) visit(producers.get(name));
    state[row] = 2; sorted.push(row);
  };
  if (gate >= 0) visit(gate);
  obligations.forEach((_, row) => visit(row));
  return { sorted, dependencies, requiredSuccess, producers, gate };
}

const rootScope = scope => ['root', 'model'].includes(scope.source) && scope.path === '' && !scope.childrenPath && !scope.nested?.length && !scope.when;
const scopeParts = scope => [JSON.stringify(canonical({ source: scope.source === 'model' ? 'root' : scope.source,
  path: scope.path, ...(scope.childrenPath ? { childrenPath: scope.childrenPath } : {}), ...(scope.when ? { when: scope.when } : {}) })),
  ...(scope.nested || []).map(item => JSON.stringify(canonical({ path: item.path,
    ...(item.childrenPath ? { childrenPath: item.childrenPath } : {}), ...(item.when ? { when: item.when } : {}) })))];
const scopeContains = (parent, child) => {
  const from = scopeParts(parent), to = scopeParts(child);
  return from.length <= to.length && from.every((part, index) => part === to[index]);
};

function throwDiagnostics(diagnostics) {
  if (!diagnostics.length) return;
  const first = diagnostics[0];
  const error = new Error(`${first.row > 0 ? `Rule ${first.row}${first.obligationId ? ` (${first.obligationId})` : ''}: ` : ''}${first.path}: ${first.message}`);
  error.diagnostics = diagnostics; throw error;
}

function operandExpression(operand, binding, parents = []) {
  if (own(operand, 'canonicalMap')) return { op: 'canonicalMap', value: operandExpression(operand.canonicalMap.value, binding, parents), omitValue: operandExpression(operand.canonicalMap.omitValue, binding, parents) };
  if (own(operand, 'select')) {
    const query = operand.select, source = operandExpression(query.from, binding, parents), itemBinding = `${binding}_selectedItem`;
    let selected = query.kind === 'items' ? source : op(query.kind, source);
    if (query.childrenPath) selected = { op: 'descendants', items: selected, childrenPath: literal(query.childrenPath) };
    if (query.where) selected = { op: 'filter', items: selected, as: itemBinding, where: predicateExpression(query.where, itemBinding, [binding, ...parents]) };
    if (query.value) selected = { op: 'map', items: selected, as: itemBinding, value: operandExpression(query.value, itemBinding, [binding, ...parents]) };
    if (query.flatten) selected = op('flatten', selected);
    if (query.single) selected = op('choose', op('eq', op('length', selected), 1), op('get', selected, 0), null);
    return op('choose', { op: 'matches', value: source, schema: literal({ type: [query.kind === 'items' ? 'array' : 'object', 'null'] }) }, selected, false);
  }
  if (own(operand, 'norm')) {
    const vector = operandExpression(operand.norm, binding, parents);
    return op('choose', { op: 'matches', value: vector, schema: literal({ type: 'array', items: { type: 'number' } }) }, op('norm', vector), null);
  }
  if (own(operand, 'object')) return { object: Object.fromEntries(Object.entries(operand.object).map(([key, child]) => [key, operandExpression(child, binding, parents)])) };
  if (own(operand, 'array')) return { array: operand.array.map(child => operandExpression(child, binding, parents)) };
  if (own(operand, 'literal')) return literal(operand.literal);
  if (own(operand, 'field')) return { var: binding, path: operand.field };
  if (own(operand, 'binding')) return { var: `__derived_${operand.binding}`, path: operand.path };
  if (own(operand, 'ancestor')) {
    if (operand.ancestor <= parents.length) return { var: parents[operand.ancestor - 1], path: operand.path };
    const match = /^__obligationItem(\d+)$/.exec(parents.at(-1) || binding), levels = operand.ancestor - parents.length;
    if (!match || levels > Number(match[1])) throw new Error('An ancestor operand requires an available parent scope.');
    return { var: `__obligationItem${Number(match[1]) - levels}`, path: operand.path };
  }
  // A var selector returns a scalar for a non-wildcard path and a collection for wildcards.
  return { var: operand.source, path: operand.path };
}

function countProductParts(constraint, binding, parents = []) {
  const subject = operandExpression(constraint.subject, binding, parents);
  const other = operandExpression(constraint.other, binding, parents);
  const count = { var: '__countItem', path: constraint.countPath };
  const collection = { var: '__countItem', path: constraint.collectionPath };
  const factor = op('choose', op('not', op('isNull', count)), count,
    op('choose', { op: 'matches', value: collection, schema: literal({ type: 'array' }) }, op('length', collection), null));
  const factors = { op: 'map', items: subject, as: '__countItem', value: factor };
  const integer = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
  const validFactors = { op: 'map', items: factors, as: '__factor', value: { op: 'matches', value: { var: '__factor' }, schema: literal(integer) } };
  const valid = op('all', { op: 'matches', value: subject, schema: literal({ type: 'array' }) },
    { op: 'matches', value: other, schema: literal(integer) }, op('all', validFactors));
  return { other, factors, valid };
}

function predicateExpression(constraint, binding, parents = []) {
  if (own(constraint, 'all')) return op('all', ...constraint.all.map(child => predicateExpression(child, binding, parents)));
  if (own(constraint, 'any')) return op('any', ...constraint.any.map(child => predicateExpression(child, binding, parents)));
  if (own(constraint, 'not')) return op('not', predicateExpression(constraint.not, binding, parents));
  const subject = operandExpression(constraint.subject, binding, parents);
  const other = constraint.other && operandExpression(constraint.other, binding, parents);
  const matches = schema => ({ op: 'matches', value: subject, schema: literal(schema) });
  const numeric = matches({ type: 'number' });
  const list = matches({ type: ['array', 'null'] });
  const countable = matches({ type: ['array', 'object', 'string', 'null'] });
  const numericValue = /Count$|^countRange$/.test(constraint.type) ? op('length', subject) : subject;
  switch (constraint.type) {
    case 'required': return op('not', op('isNull', subject));
    case 'forbidden': return op('isNull', subject);
    case 'nonblank': return op('all', matches({ type: 'string' }), op('ne', op('trim', subject), ''));
    case 'equals': return op('eq', subject, other);
    case 'notEquals': return op('ne', subject, other);
    case 'lessThan': case 'lessOrEqual': case 'greaterThan': case 'greaterOrEqual':
      return op('all', numeric, { op: 'matches', value: other, schema: literal({ type: 'number' }) },
        op({ lessThan: 'lt', lessOrEqual: 'lte', greaterThan: 'gt', greaterOrEqual: 'gte' }[constraint.type], subject, other));
    case 'unique': return op('all', list, op('unique', subject));
    case 'countAtMost': return op('all', matches({ type: 'array' }),
      { op: 'matches', value: other, schema: literal({ type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER }) },
      op('lte', op('length', subject), other));
    case 'disjoint': return op('all', matches({ type: 'array' }),
      { op: 'matches', value: other, schema: literal({ type: 'array' }) },
      op('not', op('any', { op: 'map', items: subject, as: '__disjointItem', value: op('contains', other, { var: '__disjointItem' }) })));
    case 'uniqueBy': return op('all', list, op('unique', {
      op: 'map', items: subject, as: '__uniqueItem', value: { var: '__uniqueItem', path: constraint.itemPath },
    }));
    case 'uniqueCanonicalMapBy': {
      const item = { var: '__uniqueMapItem', path: constraint.itemPath };
      const valid = { op: 'matches', value: item, schema: literal({ type: 'object' }) };
      return op('all', list,
        op('all', { op: 'map', items: subject, as: '__uniqueMapItem', value: valid }),
        op('unique', { op: 'map', items: subject, as: '__uniqueMapItem', value:
          op('choose', valid, { op: 'canonicalMap', value: item, omitValue: literal(constraint.omitValue) }, null) }));
    }
    case 'productAtMost': {
      const parts = countProductParts(constraint, binding, parents);
      return op('all', parts.valid, op('productAtMost', parts.factors, parts.other));
    }
    case 'memberOf': return op('all', { op: 'matches', value: other, schema: literal({ type: ['array', 'object', 'null'] }) }, op('contains', other, subject));
    case 'memberOfDifference': {
      const excluded = operandExpression(constraint.excluded, binding, parents);
      return op('all', { op: 'matches', value: other, schema: literal({ type: ['array', 'object', 'null'] }) },
        op('contains', other, subject), { op: 'matches', value: excluded, schema: literal({ type: ['array', 'object', 'null'] }) },
        op('not', op('contains', excluded, subject)));
    }
    case 'notMemberOf': return op('all', { op: 'matches', value: other, schema: literal({ type: ['array', 'object', 'null'] }) }, op('not', op('contains', other, subject)));
    case 'subset': case 'setEqual': return op('all', list,
      { op: 'matches', value: other, schema: literal({ type: ['array', 'null'] }) }, op(constraint.type, subject, other));
    default: {
      const checks = [/Count$|^countRange$/.test(constraint.type) ? countable : numeric];
      if (['minimum', 'range', 'minCount', 'countRange'].includes(constraint.type)) checks.push(op('gte', numericValue, constraint.minimum));
      if (['maximum', 'range', 'maxCount', 'countRange'].includes(constraint.type)) checks.push(op('lte', numericValue, constraint.maximum));
      return op('all', ...checks);
    }
  }
}

/** Deterministically compile independent obligations; does not execute rules. */
export function compileDeclarativeValidation(obligations, options = {}) {
  throwDiagnostics(recordDiagnostics(obligations, options));
  const { sorted, dependencies, requiredSuccess, producers, gate } = dependencyOrder(obligations, () => {});
  const compile = (record, row, local = false) => {
    const guard = requiredSuccess[row].size ? op('all', ...[...requiredSuccess[row]].sort().map(name => op('all',
      op('not', op('isNull', { var: `__derived_${name}` })),
      op('eq', op('length', { var: `__derived_${name}`, path: '/errors' }), 0)))) : null;
    if ((record.constraint.expose || record.constraint.gate) && !local) {
      const constraint = record.constraint;
      const suffix = record.diagnostic.path || '';
      const diagnosticPath = op('pathString', literal(suffix ? suffix.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~')) : []));
      const path = constraint.check === 'rules' ? diagnosticPath : op('text', diagnosticPath, ': ', record.diagnostic.message);
      const input = { object: Object.fromEntries([
        [constraint.subjectInput, operandExpression(constraint.subject, record.scope.source)],
        ...constraint.inputs.map(item => [item.name, operandExpression(item.operand, record.scope.source)]),
      ]) };
      const check = { check: constraint.check, input };
      if (constraint.expose) check.bind = `__derived_${constraint.expose}`;
      if (constraint.gate) check.haltOnErrors = true;
      if (guard) check.when = guard;
      return [{ let: 'path', value: path }, check];
    }
    const scopes = [record.scope, ...(record.scope.nested || [])];
    const wrap = depth => {
      const binding = `__obligationItem${depth}`, pathBinding = `__obligationPath${depth}`;
      const selector = { from: depth ? `__obligationItem${depth - 1}` : scopes[depth].source,
        path: scopes[depth].path };
      if (depth) selector.basePath = { var: `__obligationPath${depth - 1}` };
      let rules;
      if (depth < scopes.length - 1) rules = [wrap(depth + 1)];
      else {
        const diagnostic = record.diagnostic.path || '';
        const suffix = diagnostic ? diagnostic.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~')) : [];
        const fullPath = suffix.length ? op('concat', { var: pathBinding }, literal(suffix)) : { var: pathBinding };
        if (record.constraint.type === 'keyMatchesField') {
          const constraint = record.constraint;
          const mapPath = constraint.subject.field ? constraint.subject.field.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~')) : [];
          const entry = `__obligationEntry${depth}`, entryValue = `__obligationValue${depth}`;
          const value = operandExpression(constraint.subject, binding);
          const entryPath = op('concat', { var: pathBinding }, literal(mapPath),
            { array: [{ var: entry, path: '/key' }] }, literal(suffix));
          const assertion = { assert: op('eq', { var: entry, path: '/key' }, { var: entryValue, path: constraint.itemPath }), message: record.diagnostic.message };
          if (own(constraint, 'entryWhen')) assertion.when = predicateExpression(constraint.entryWhen, entryValue);
          const branch = { if: { op: 'matches', value, schema: literal({ type: ['object', 'null'] }) }, then: [
            { forEach: op('entries', value), as: entry, rules: [
              { let: entryValue, value: { var: entry, path: '/value' } },
              { let: 'path', value: op('pathString', entryPath) }, assertion,
            ] },
          ], else: [{ let: 'path', value: op('pathString', op('concat', { var: pathBinding }, literal(mapPath))) }, { assert: false, message: record.diagnostic.message }] };
          if (own(record, 'when')) branch.when = predicateExpression(record.when, binding);
          rules = [branch];
        } else {
        const assertion = record.constraint.type === 'semanticCheck'
          ? { check: record.constraint.check, input: { object: Object.fromEntries([
            [record.constraint.subjectInput, operandExpression(record.constraint.subject, binding)],
            ...record.constraint.inputs.map(input => [input.name, operandExpression(input.operand, binding)]),
          ]) } }
          : { assert: predicateExpression(record.constraint, binding), message: record.diagnostic.message };
        if (record.constraint.type === 'productAtMost') {
          const { factors, other, valid } = countProductParts(record.constraint, binding);
          const exact = op('choose', op('contains', factors, 0), 0, op('product', factors));
          const count = op('choose', op('productAtMost', factors, Number.MAX_SAFE_INTEGER), exact, 'greater than 9007199254740991');
          assertion.message = op('choose', valid, op('text', record.diagnostic.message, ' Count: ', count, '; limit: ', other, '.'), record.diagnostic.message);
        }
        if (record.constraint.type === 'countAtMost') {
          const subject = operandExpression(record.constraint.subject, binding), other = operandExpression(record.constraint.other, binding);
          const valid = op('all', { op: 'matches', value: subject, schema: literal({ type: 'array' }) },
            { op: 'matches', value: other, schema: literal({ type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER }) });
          assertion.message = op('choose', valid, op('text', record.diagnostic.message, ' Count: ', op('length', subject), '; limit: ', other, '.'), record.diagnostic.message);
        }
        if (record.constraint.expose) assertion.bind = `__derived_${record.constraint.expose}`;
        if (own(record, 'when')) assertion.when = predicateExpression(record.when, binding);
        // Path assignment is private to this singleton/loop root; no obligation leaks bindings.
        const diagnosticPath = op('pathString', fullPath);
        rules = [{ let: 'path', value: record.constraint.type === 'semanticCheck' && record.constraint.check !== 'rules'
          ? op('text', diagnosticPath, ': ', record.diagnostic.message) : diagnosticPath }, assertion];
        }
        if (local && guard) rules = [{ if: guard, then: rules }];
      }
      if (scopes[depth].when) rules = [{ if: predicateExpression(scopes[depth].when, binding), then: rules }];
      return scopes[depth].childrenPath
        ? { forEachTree: selector, as: binding, pathAs: pathBinding,
          children: { from: binding, path: scopes[depth].childrenPath, basePath: { var: pathBinding } }, rules }
        : { forEach: selector, as: binding, pathAs: pathBinding, rules };
    };
    const rule = wrap(0);
    if (guard && !local) rule.when = guard;
    return [rule];
  };
  if (!producers.size && gate < 0) return obligations.flatMap(compile);
  const localNames = new Set([...producers].filter(([, row]) => !rootScope(obligations[row].scope)).map(([name]) => name));
  if (!localNames.size) return [ ...[...producers.keys()].sort().map(name => ({ let: `__derived_${name}`, value: null })),
    ...sorted.flatMap(row => compile(obligations[row], row)) ];

  // A scope tree gives each item its own bindings and lets children inherit
  // their parent's successful results. Siblings never share local bindings.
  const groups = new Map(), rowGroup = [];
  obligations.forEach((record, row) => {
    const local = localNames.has(record.constraint.expose) || [...dependencies[row]].some(name => localNames.has(name));
    const key = local ? `scope:${scopeParts(record.scope)[0]}` : `row:${row}`;
    if (!groups.has(key)) groups.set(key, { key, rows: [], local });
    groups.get(key).rows.push(row); rowGroup[row] = key;
  });
  const orderedGroups = [], visited = new Set();
  const visitGroup = key => {
    if (visited.has(key)) return;
    visited.add(key);
    for (const row of groups.get(key).rows) for (const name of dependencies[row]) {
      const producer = rowGroup[producers.get(name)];
      if (producer !== key) visitGroup(producer);
    }
    orderedGroups.push(groups.get(key));
  };
  if (gate >= 0) visitGroup(rowGroup[gate]);
  for (const group of groups.values()) visitGroup(group.key);
  const output = [...producers.keys()].filter(name => !localNames.has(name)).sort().map(name => ({ let: `__derived_${name}`, value: null }));
  for (const group of orderedGroups) {
    if (!group.local) { output.push(...compile(obligations[group.rows[0]], group.rows[0])); continue; }
    const memberRows = sorted.filter(row => rowGroup[row] === group.key);
    let rootNode;
    for (const row of memberRows) {
      const compiled = compile(obligations[row], row, true)[0];
      const parts = scopeParts(obligations[row].scope);
      let current = compiled;
      const scopeRecords = [obligations[row].scope, ...(obligations[row].scope.nested || [])];
      const body = (node, depth) => scopeRecords[depth].when ? node.rules[0].then : node.rules;
      const filter = (node, depth) => scopeRecords[depth].when ? node.rules[0].if : null;
      if (!rootNode) rootNode = { wrapper: { ...current, rules: [] }, filter: filter(current, 0), children: new Map(), statements: [], names: [] };
      let node = rootNode;
      for (let depth = 1; depth < parts.length; depth++) {
        current = body(current, depth - 1)[0];
        if (!node.children.has(parts[depth])) node.children.set(parts[depth],
          { wrapper: { ...current, rules: [] }, filter: filter(current, depth), children: new Map(), statements: [], names: [] });
        node = node.children.get(parts[depth]);
      }
      if (obligations[row].constraint.expose) node.names.push(obligations[row].constraint.expose);
      node.statements.push(...body(current, parts.length - 1));
    }
    const materialize = node => { const rules = [
      ...node.names.sort().map(name => ({ let: `__derived_${name}`, value: null })),
      ...node.statements, ...[...node.children.values()].map(materialize),
    ]; return { ...node.wrapper, rules: node.filter ? [{ if: node.filter, then: rules }] : rules }; };
    output.push(materialize(rootNode));
  }
  return output;
}

/** Report authored-record and stale-derived-output diagnostics without mutation. */
export function declarativeValidationDiagnostics(program, options = {}) {
  if (!object(program) || !own(program, 'declarative')) return [];
  const base = options.programKey ? `#/${token(options.programKey)}` : '#';
  if (!object(program.declarative) || program.declarative.format !== declarativeValidationFormat)
    return [{ severity: 'error', code: 'unsupported-format', row: 0, path: `${base}/declarative/format`,
      message: `Use ${declarativeValidationFormat}; unsupported formats are never migrated implicitly.` }];
  const diagnostics = recordDiagnostics(program.declarative.obligations, options);
  if (diagnostics.length) return diagnostics;
  const compiled = compileDeclarativeValidation(program.declarative.obligations, options);
  if (!same(compiled, program.rules)) diagnostics.push({ severity: 'error', code: 'stale-generated-rules', row: 0,
    path: `${base}/rules`, message: 'Generated rules do not match the authored obligations. Review the mismatch and explicitly regenerate; no output was overwritten.' });
  return diagnostics;
}

export function declarativeProgramState(program, options = {}) {
  if (!object(program) || !own(program, 'declarative')) return { kind: 'legacy', obligations: [], diagnostics: [], stage: null };
  const diagnostics = declarativeValidationDiagnostics(program, options);
  const obligations = Array.isArray(program.declarative?.obligations) ? clone(program.declarative.obligations) : [];
  return { kind: diagnostics.some(item => item.code !== 'stale-generated-rules') ? 'invalid'
    : diagnostics.length ? 'stale' : 'declarative', obligations, diagnostics,
    stage: obligations[0]?.stage || null,
    compiledRules: diagnostics.some(item => item.code !== 'stale-generated-rules') ? null : compileDeclarativeValidation(obligations, options) };
}

/** Explicit authoring transaction. Legacy conversion and stale regeneration require intent. */
/** @param {any} program @param {any[]} obligations @param {{resolveStale?:boolean,convertLegacy?:boolean,programKey?:string}} options */
export function programWithDeclarativeObligations(program, obligations, { resolveStale = false, convertLegacy = false, programKey } = {}) {
  const original = object(program) ? program : { maximumErrors: 80, rules: [] };
  const state = declarativeProgramState(original, { programKey });
  if (state.diagnostics.some(item => item.code === 'unsupported-format')) throwDiagnostics(state.diagnostics);
  if (state.kind === 'legacy' && Array.isArray(original.rules) && original.rules.length && !convertLegacy)
    throw new Error('This program contains legacy rules. Explicitly choose conversion/replacement before authoring declarative obligations.');
  if (['stale', 'invalid'].includes(state.kind) && !resolveStale) throwDiagnostics(state.diagnostics);
  const rules = compileDeclarativeValidation(obligations, { programKey });
  return { ...clone(original), declarative: { ...(object(original.declarative) ? clone(original.declarative) : {}),
    format: declarativeValidationFormat, obligations: clone(obligations) }, rules };
}

/** Candidate/Save guards inspect every declared program, including malformed derived output. */
export function declarativeDocumentDiagnostics(document) {
  if (!object(document)) return [];
  return Object.entries(document).filter(([key, value]) => isFullMetaValidationProgramKey(key) && object(value) && own(value, 'declarative'))
    .flatMap(([programKey, program]) => declarativeValidationDiagnostics(program, { programKey }));
}

export function assertDeclarativeDocument(document) {
  const diagnostics = declarativeDocumentDiagnostics(document); throwDiagnostics(diagnostics); return document;
}
