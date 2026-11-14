/** Read-only structure inventory for the currently loaded schema document. */
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const pointerPart = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');

export function schemaStructureSummary(audit) {
  return {
    treeNodes: audit.T,
    fieldPaths: audit.D,
    fieldDeclarations: audit.DDeclarations,
    uiBehaviorFacts: audit.U,
    uiPhysicalKeys: audit.UAnnotationDeclarations,
    validationRules: audit.V,
    scopeNote: `Inventory of ${audit.label || 'the current schema'} only. Counts describe structure; they do not by themselves establish completion.`,
  };
}

function countTree(schema) {
  const count = node => (node?.children || []).reduce((sum, child) => sum + 1 + count(child), 0);
  return count(schema?.['x-fullmeta-ui-tree']);
}
function countNestedRuleNodes(rules) {
  let count = 0;
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(visit);
    if (['assert', 'check', 'bind', 'let', 'forEach', 'if'].some(key => Object.hasOwn(value, key))) count += 1;
    for (const child of Object.values(value)) visit(child);
  };
  visit(rules);
  return count;
}
function inspectUiAnnotationDeclarations(schema) {
  const declarations = [];
  const visit = (value, path = '') => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach((child, index) => visit(child, `${path}/${index}`));
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}/${pointerPart(key)}`;
      if (key.startsWith('x-fullmeta-ui')) declarations.push({ path: childPath, key, value: child });
      visit(child, childPath);
    }
  };
  visit(schema);
  return declarations;
}

export function inspectSchemaDocument(schema, label = 'current schema') {
  const fields = new Set(), declarationBranches = new Set(), annotations = new Map(), iconDeclarations = new Set();
  const seen = new WeakMap(); let nextId = 0;
  function walk(current, fieldPath, schemaPath, refStack = []) {
    if (!current || typeof current !== 'object') return;
    let id = seen.get(current); if (!id) { id = ++nextId; seen.set(current, id); }
    const visitKey = `${fieldPath}|${schemaPath}|${id}`;
    if (walk.visited.has(visitKey)) return; walk.visited.add(visitKey);
    if (typeof current.$ref === 'string' && current.$ref.startsWith('#/')) {
      const refPath = current.$ref.slice(2).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'));
      let target = schema; for (const part of refPath) target = target?.[part];
      const refId = refPath.join('/');
      if (!refStack.includes(refId)) walk(target, fieldPath, `#/${refId}`, [...refStack, refId]);
    }
    const payload = current['x-fullmeta-ui-behavior']?.payload;
    if (payload && typeof payload === 'object') {
      if (typeof payload.presentation?.icon === 'string' && payload.presentation.icon.length) iconDeclarations.add(`${fieldPath} :: ${schemaPath}`);
      let facts = annotations.get(fieldPath); if (!facts) annotations.set(fieldPath, facts = new Map());
      const addLeaves = (value, suffix) => {
        if (Array.isArray(value)) { if (value.length) value.forEach((child, index) => addLeaves(child, `${suffix}/${index}`)); }
        else if (value && typeof value === 'object') { for (const [key, child] of Object.entries(value)) addLeaves(child, `${suffix}/${pointerPart(key)}`); }
        else { const values = facts.get(suffix) || new Set(); values.add(stable(value)); facts.set(suffix, values); }
      };
      addLeaves(payload, '');
    }
    if (current.properties && typeof current.properties === 'object') for (const [key, child] of Object.entries(current.properties)) {
      const childPath = `${fieldPath}/${pointerPart(key)}`, declarationPath = `${schemaPath}/properties/${pointerPart(key)}`;
      fields.add(childPath || '/'); declarationBranches.add(`${childPath || '/'} :: ${declarationPath}`);
      walk(child, childPath, declarationPath, refStack);
    }
    if (current.items && typeof current.items === 'object') walk(current.items, `${fieldPath}/*`, `${schemaPath}/items`, refStack);
    if (Array.isArray(current.prefixItems)) current.prefixItems.forEach((child, index) => walk(child, `${fieldPath}/${index}`, `${schemaPath}/prefixItems/${index}`, refStack));
    for (const keyword of ['allOf', 'anyOf', 'oneOf']) if (Array.isArray(current[keyword])) current[keyword].forEach((child, index) =>
      walk(child, fieldPath, `${schemaPath}/${keyword}/${index}`, refStack));
    for (const keyword of ['if', 'then', 'else', 'not']) if (current[keyword] && typeof current[keyword] === 'object')
      walk(current[keyword], fieldPath, `${schemaPath}/${keyword}`, refStack);
    if (current.additionalProperties && typeof current.additionalProperties === 'object') walk(current.additionalProperties, `${fieldPath}/*`, `${schemaPath}/additionalProperties`, refStack);
    if (current.patternProperties && typeof current.patternProperties === 'object') for (const [pattern, child] of Object.entries(current.patternProperties))
      walk(child, `${fieldPath}/*`, `${schemaPath}/patternProperties/${pointerPart(pattern)}`, refStack);
  }
  walk.visited = new Set(); walk(schema, '', '#');
  const rules = schema?.['x-fullmeta-rules']?.rules || [];
  let uiFacts = 0; for (const facts of annotations.values()) for (const values of facts.values()) uiFacts += 1;
  const uiAnnotationDeclarations = inspectUiAnnotationDeclarations(schema);
  return { label, T: countTree(schema), D: fields.size, DDeclarations: declarationBranches.size, U: uiFacts,
    ULocations: annotations.size, UAnnotationDeclarations: uiAnnotationDeclarations.length,
    UBehaviorSites: uiAnnotationDeclarations.filter(entry => entry.key === 'x-fullmeta-ui-behavior').length,
    UOtherAnnotationDeclarations: uiAnnotationDeclarations.filter(entry => entry.key !== 'x-fullmeta-ui-behavior').length,
    V: rules.length, VNestedNodes: countNestedRuleNodes(rules), fields, declarationBranches, annotations, iconDeclarations,
    uiAnnotationDeclarations, rules };
}



function logicalBranch(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  const modelIndex = parts.indexOf('model');
  if (modelIndex >= 0) return parts[modelIndex + 1] ? `model/${parts[modelIndex + 1]}` : 'model (root)';
  return parts[0] || '(schema root)';
}
function groupEntries(entries, getKey) {
  const groups = new Map();
  for (const entry of entries) {
    const key = getKey(entry), list = groups.get(key) || [];
    list.push(entry); groups.set(key, list);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}
function descriptorLabel(descriptor, index) {
  if (descriptor.title) return descriptor.title;
  const path = Array.isArray(descriptor.path) ? descriptor.path.join('/') : '';
  return path || descriptor.role || `Tree branch ${index + 1}`;
}
function descriptorCount(descriptor) {
  return 1 + (descriptor.children || []).reduce((sum, child) => sum + descriptorCount(child), 0);
}
function ruleLabel(rule, index) {
  if (typeof rule?.as === 'string') return rule.as;
  if (typeof rule?.message === 'string') return rule.message;
  const nestedMessage = value => {
    if (!value || typeof value !== 'object') return '';
    if (Array.isArray(value)) { for (const child of value) { const found = nestedMessage(child); if (found) return found; } return ''; }
    if (typeof value.message === 'string') return value.message;
    for (const child of Object.values(value)) { const found = nestedMessage(child); if (found) return found; }
    return '';
  };
  return nestedMessage(rule) || `Rule ${index + 1}`;
}


export { logicalBranch, groupEntries, descriptorLabel, descriptorCount, ruleLabel };

export { createSchemaBranchAuditDialog } from './schema-extra-candidate-dialogs.js';
