/**
 * Resolve a group of dependent settings from a schema declaration.
 *
 * The declaration names the document paths, capability catalogs, related item,
 * choice expressions, source order, and output groups. This module knows only
 * those generic operations; applications provide their vocabulary in the schema.
 */

function valueAt(source, path = [], state = {}) {
  if (!Array.isArray(path)) throw new Error("A settings path must be an array.");
  return path.reduce((value, part) => {
    const key = part === "$itemIndex" ? state.$itemIndex
      : part && typeof part === "object" ? state[part.state] : part;
    return value?.[key];
  }, source);
}

function expressionValue(expression, context) {
  if (expression === null || typeof expression !== "object" || Array.isArray(expression)) return expression;
  switch (expression.kind) {
    case "path":
      return valueAt(context[expression.scope], expression.path, context.state);
    case "schemaEnum": {
      const path = expression.path?.map(part => part === "$itemIndex" ? context.state.$itemIndex : part);
      const field = context.resolveSchema(context.schemaAtPath(context.document, path)) || {};
      return Array.isArray(field.enum) ? field.enum
        : Object.hasOwn(field, "const") ? [field.const] : [];
    }
    case "keys": {
      const value = expressionValue(expression.of, context);
      return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
    }
    case "singleton": {
      const value = expressionValue(expression.of, context);
      return value === undefined || value === null ? [] : [value];
    }
    case "intersect": {
      const lists = (expression.of || []).map(entry => expressionValue(entry, context));
      if (!lists.length || lists.some(list => !Array.isArray(list))) return [];
      return lists[0].filter(value => lists.slice(1).every(list => list.includes(value)));
    }
    case "when": {
      const value = expressionValue(expression.test, context);
      const matches = Object.hasOwn(expression, "equals") ? value === expression.equals : Boolean(value);
      return expressionValue(matches ? expression.then : expression.else, context);
    }
    case "merge":
      return Object.assign({}, ...(expression.of || []).map(entry => expressionValue(entry, context) || {}));
    default:
      throw new Error(`Unknown settings expression kind ${String(expression.kind)}.`);
  }
}

function typed(value, type) {
  if (value === undefined || value === null) return value;
  if (type === "unsignedInteger" || type === "integer" || type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  return value;
}

function choose(allowed, candidates, type) {
  if (!Array.isArray(allowed)) throw new Error("Settings choices must be an array.");
  for (const candidate of candidates) {
    const value = typed(candidate, type);
    if (allowed.includes(value)) return value;
  }
  return allowed[0];
}

function effectiveOptions(optionSets, rules, state) {
  const options = { ...optionSets };
  for (const rule of rules || []) {
    if (Object.entries(rule.when || {}).every(([key, value]) => state[key] === value)) {
      Object.assign(options, rule.options || {});
    }
  }
  return options;
}

function sourceCandidate(definition, sourceRule, source, state) {
  if (!sourceRule.byContext) return source?.[definition.key];
  const selector = definition.defaultByContext;
  if (!selector) return undefined;
  const contextValue = state[selector.contextKey];
  return contextValue === undefined ? undefined : source?.[selector.property]?.[String(contextValue)];
}

/**
 * The caller supplies schemaAtPath(document, path) and resolveSchema(schema).
 * Missing profile settings return null, matching a profile without an editor
 * settings group. Invalid saved/default values fall back to a declared allowed
 * value; validation of the saved document remains a separate operation.
 */
export function resolveDeclaredSettings({ document, item, capabilities, declaration, schemaAtPath, resolveSchema }) {
  if (!declaration || !document || !item || !capabilities) return null;
  const profileId = valueAt(document, declaration.profile?.idPath);
  const profileSettings = valueAt(capabilities, declaration.profile?.settingsPath)?.[profileId];
  if (!profileSettings) return null;

  const collection = valueAt(document, declaration.itemCollectionPath) || [];
  const itemIndex = Array.isArray(collection)
    ? collection.findIndex(entry => entry?.[declaration.itemIdentityKey] === item?.[declaration.itemIdentityKey]) : -1;
  const related = declaration.relatedItem || {};
  const relatedCollection = valueAt(document, related.collectionPath) || [];
  const relatedId = valueAt(item, related.referencePath);
  const relatedItem = Array.isArray(relatedCollection)
    ? relatedCollection.find(entry => entry?.[related.identityKey] === relatedId)
    : relatedCollection && typeof relatedCollection === "object" && relatedId !== undefined
      ? relatedCollection[relatedId]
        || (relatedCollection?.[related.identityKey] === relatedId ? relatedCollection : undefined)
      : undefined;
  const state = { $itemIndex: Math.max(0, itemIndex) };
  const context = { document, item, capabilities, profileSettings, relatedItem, state, schemaAtPath, resolveSchema };
  const options = {};

  for (const field of declaration.choiceFields || []) {
    const allowed = expressionValue(field.choices, context);
    if (!Array.isArray(allowed)) throw new Error(`Choices for ${field.key} must resolve to an array.`);
    options[field.key] = allowed;
    state[field.key] = choose(allowed, (field.candidates || [])
      .map(candidate => expressionValue(candidate, context)), field.type);
  }

  const group = declaration.optionGroup;
  if (group) {
    const resolution = expressionValue(group.resolution, context);
    const optionSets = expressionValue(group.options, context);
    const rules = expressionValue(group.rules, context);
    if (!Array.isArray(resolution?.fields) || !Array.isArray(resolution?.sourceOrder)
      || !optionSets || typeof optionSets !== "object") {
      throw new Error("The declared settings option group is incomplete.");
    }
    const sources = Object.fromEntries(Object.entries(group.sources || {})
      .map(([name, expression]) => [name, expressionValue(expression, context)]));
    for (const field of resolution.fields) {
      const allowed = effectiveOptions(optionSets, rules, state)[field.key];
      options[field.key] = allowed;
      state[field.key] = choose(allowed, resolution.sourceOrder
        .map(rule => sourceCandidate(field, rule, sources[rule.source], state)), field.type);
    }
  }

  const result = { options };
  for (const group of declaration.outputGroups || []) {
    result[group.key] = Object.fromEntries((group.fields || []).map(key => [key, state[key]]));
  }
  return result;
}
