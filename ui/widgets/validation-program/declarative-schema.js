/** Embeddable JSON Schema definitions for the separately versioned source language.
 * Cross-row stage identity and derived-output equivalence remain compiler checks.
 */
import { declarativeConstraintTypes, declarativeRuleSources, declarativeValidationFormat } from './declarative-rules.js';

const ref = name => ({ $ref: `#/$defs/declarativeValidation${name}` });
const pointer = { type: 'string', pattern: '^(?:/(?:[^~]|~[01])*)?$' };
const finiteBound = { type: 'number' };
const countBound = { type: 'integer', minimum: 0 };

export const declarativeValidationDefinitions = {
  declarativeValidationOperand: {
    type: 'object', properties: { field: pointer, source: { enum: declarativeRuleSources }, path: pointer, literal: {}, binding: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9_]*$' }, ancestor: { type: 'integer', minimum: 1, maximum: 16 }, object: { type: 'object', maxProperties: 64, propertyNames: { pattern: '^[A-Za-z_][A-Za-z0-9_]*$', not: { enum: ['__proto__', 'constructor', 'prototype'] } }, additionalProperties: ref('Operand') }, array: { type: 'array', maxItems: 64, items: ref('Operand') }, norm: ref('Operand'),
      select: { type: 'object', required: ['kind', 'from'], properties: { kind: { enum: ['items', 'keys', 'values', 'entries'] }, from: ref('Operand'), where: ref('Condition'), value: ref('Operand'), single: { type: 'boolean' }, flatten: { type: 'boolean' }, childrenPath: { ...pointer, minLength: 1 } }, additionalProperties: true },
      canonicalMap: { type: 'object', required: ['value', 'omitValue'], properties: { value: ref('Operand'), omitValue: ref('Operand') }, additionalProperties: true },
      allowErrors: { type: 'boolean' },
    },
    oneOf: [
      { required: ['field'], properties: { source: false, literal: false, binding: false, ancestor: false } },
      { required: ['source', 'path'], properties: { field: false, literal: false, binding: false, ancestor: false } },
      { required: ['literal'], properties: { field: false, source: false, binding: false, ancestor: false } },
      { required: ['binding', 'path'], properties: { field: false, source: false, literal: false, ancestor: false } },
      { required: ['ancestor', 'path'], properties: { field: false, source: false, literal: false, binding: false } },
    ].map(branch => ({ ...branch, properties: { ...branch.properties, object: false, array: false } })).concat([
      ...['object', 'array'].map(mode => ({ required: [mode], properties: Object.fromEntries(['field', 'source', 'literal', 'binding', 'ancestor', 'object', 'array'].filter(key => key !== mode).map(key => [key, false])) })),
    ]).map(branch => ({ ...branch, properties: { ...branch.properties, norm: false } })).concat([
      { required: ['norm'], properties: Object.fromEntries(['field', 'source', 'literal', 'binding', 'ancestor', 'object', 'array'].map(key => [key, false])) },
    ]).map(branch => ({ ...branch, properties: { ...branch.properties, select: false } })).concat([
      { required: ['select'], properties: Object.fromEntries(['field', 'source', 'literal', 'binding', 'ancestor', 'object', 'array', 'norm'].map(key => [key, false])) },
    ]).map(branch => ({ ...branch, properties: { ...branch.properties, canonicalMap: false } })).concat([
      { required: ['canonicalMap'], properties: Object.fromEntries(['field', 'source', 'literal', 'binding', 'ancestor', 'object', 'array', 'norm', 'select'].map(key => [key, false])) },
    ]), additionalProperties: true,
  },
  declarativeValidationScope: {
    type: 'object', required: ['source', 'path'], properties: {
      source: { enum: declarativeRuleSources }, path: pointer, childrenPath: { ...pointer, minLength: 1 }, when: ref('Condition'),
      nested: { type: 'array', maxItems: 16, items: { type: 'object', required: ['path'], properties: { path: pointer, childrenPath: { ...pointer, minLength: 1 }, when: ref('Condition') }, additionalProperties: true } },
    }, additionalProperties: true,
  },
  declarativeValidationConstraint: {
    type: 'object', required: ['type', 'subject'], properties: {
      type: { enum: declarativeConstraintTypes.map(item => item.type) }, subject: ref('Operand'), other: ref('Operand'), excluded: ref('Operand'), itemPath: pointer, entryWhen: ref('Condition'),
      minimum: finiteBound, maximum: finiteBound,
      countPath: pointer, collectionPath: pointer,
      omitValue: { type: 'string' },
      check: { enum: ['quantity', 'expression', 'uniqueIds', 'rules', 'collection'] },
      expose: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9_]*$' },
      gate: { type: 'boolean' },
      subjectInput: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9_]*$' },
      inputs: { type: 'array', maxItems: 64, items: { type: 'object', required: ['name', 'operand'], properties: {
        name: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9_]*$' }, operand: ref('Operand'),
      }, additionalProperties: true } },
    },
    oneOf: declarativeConstraintTypes.map(item => {
      const bounds = item.bounds === 'none' ? [] : item.bounds === 'range' ? ['minimum', 'maximum'] : [item.bounds];
      const schema = { properties: { type: { const: item.type } }, required: ['type', 'subject', ...(item.other ? ['other'] : []), ...(item.excluded ? ['excluded'] : []), ...(item.projection ? ['itemPath'] : []), ...(item.omitMapValue ? ['omitValue'] : []), ...(item.aggregate ? ['countPath', 'collectionPath'] : []), ...(item.semantic ? ['check', 'subjectInput', 'inputs'] : []), ...bounds] };
      for (const bound of bounds) schema.properties[bound] = /Count$|^countRange$/.test(item.type) ? countBound : finiteBound;
      return schema;
    }), additionalProperties: true,
  },
  declarativeValidationCondition: {
    oneOf: [ref('Constraint'),
      ...['all', 'any'].map(key => ({ type: 'object', required: [key], properties: { [key]: { type: 'array', minItems: 1, items: ref('Condition') } }, additionalProperties: true })),
      { type: 'object', required: ['not'], properties: { not: ref('Condition') }, additionalProperties: true },
    ],
  },
  declarativeValidationDiagnostic: {
    type: 'object', required: ['message'], properties: { path: pointer, message: { type: 'string', minLength: 1 } }, additionalProperties: true,
  },
  declarativeValidationObligation: {
    type: 'object', required: ['id', 'name', 'stage', 'scope', 'constraint', 'diagnostic'], properties: {
      id: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9_-]*$' }, name: { type: 'string', minLength: 1 }, stage: { type: 'string', minLength: 1 },
      scope: ref('Scope'), constraint: ref('Constraint'), diagnostic: ref('Diagnostic'), when: ref('Condition'),
    }, additionalProperties: true,
  },
  declarativeValidationSource: {
    type: 'object', required: ['format', 'obligations'], properties: {
      format: { const: declarativeValidationFormat }, obligations: { type: 'array', items: ref('Obligation') },
    }, additionalProperties: true,
  },
  declarativeValidationProgram: {
    type: 'object', required: ['rules'], properties: {
      rules: { type: 'array', items: { type: 'object' } }, maximumErrors: { type: 'integer', minimum: 1 },
      declarative: ref('Source'),
    }, additionalProperties: true,
  },
};

export const declarativeValidationProgramSchema = ref('Program');
