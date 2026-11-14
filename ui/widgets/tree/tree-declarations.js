/**
 * Interpret tree presentation and edit policy declared by an application schema.
 *
 * Paths in a descriptor are always paths in the original JSON document. This
 * module may omit hidden presentation nodes, but never rewrites those paths.
 */

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const at = (value, path = []) => Array.isArray(path)
  ? path.reduce((current, key) => current?.[key], value) : undefined;

/** Match a JSON path; `*` matches one segment and a trailing `**` matches any suffix. */
export function treePathMatches(pattern, path) {
  if (!Array.isArray(pattern) || !Array.isArray(path)) return false;
  const suffix = pattern.at(-1) === '**';
  const length = suffix ? pattern.length - 1 : pattern.length;
  if (suffix ? path.length < length : path.length !== length) return false;
  return pattern.slice(0, length).every((part, index) =>
    part === '*' || part === path[index]);
}

/** Evaluate a small, data-only condition against the open document and UI state. */
export function treeConditionMatches(condition, state = {}) {
  if (condition === undefined) return true;
  if (!isObject(condition)) return false;
  if (Array.isArray(condition.all)) return condition.all.every(item => treeConditionMatches(item, state));
  if (Array.isArray(condition.any)) return condition.any.some(item => treeConditionMatches(item, state));
  if (own(condition, 'not')) return !treeConditionMatches(condition.not, state);

  const roots = {
    model: state.model,
    editorOptions: state.editorOptions,
    capabilities: state.capabilities,
    item: state.item,
  };
  if (!own(roots, condition.source)) return false;
  const actual = at(roots[condition.source], condition.path || []);
  if (own(condition, 'exists') && (actual !== undefined) !== condition.exists) return false;
  if (own(condition, 'equals') && actual !== condition.equals) return false;
  if (own(condition, 'notEquals') && actual === condition.notEquals) return false;
  if (own(condition, 'in') && (!Array.isArray(condition.in) || !condition.in.includes(actual))) return false;
  if (own(condition, 'includes') && !(Array.isArray(actual) || typeof actual === 'string'
    ? actual.includes(condition.includes) : false)) return false;
  return ['exists', 'equals', 'notEquals', 'in', 'includes'].some(key => own(condition, key));
}

/** Return a filtered copy of a schema tree without losing its document anchors. */
export function resolveTreeDescriptor(descriptor, state = {}) {
  if (!isObject(descriptor)) return null;
  function visit(node) {
    if (!isObject(node) || !treeConditionMatches(node.visibleWhen, state)) return null;
    const result = { ...node };
    for (const key of ['children', 'items']) {
      if (Array.isArray(node[key])) result[key] = node[key].map(visit).filter(Boolean);
    }
    return result;
  }
  return visit(descriptor);
}

function targetMatches(when, target, state) {
  if (!isObject(when)) return false;
  const scope = when.scope || 'collection';
  const path = scope === 'item' ? target?.itemPath : target?.arrayPath;
  if (scope !== 'item' && scope !== 'collection') return false;
  if (!Array.isArray(path) || !treePathMatches(when.path, path)) return false;
  const item = target?.itemPath ? at(state.model, target.itemPath) : null;
  if (own(when, 'type') && item?.type !== when.type) return false;
  if (Array.isArray(when.types) && !when.types.includes(item?.type)) return false;
  if (when.visibleWhen && !treeConditionMatches(when.visibleWhen, { ...state, item })) return false;
  return true;
}

function anchoredPath(spec, target) {
  if (!isObject(spec)) return null;
  const anchors = {
    model: [],
    arrayPath: target?.arrayPath,
    itemPath: target?.itemPath,
    itemArrayPath: target?.itemArrayPath,
  };
  const base = anchors[spec.from];
  return Array.isArray(base) && (spec.append === undefined || Array.isArray(spec.append))
    ? [...base, ...(spec.append || [])] : null;
}

function catalogEntries(catalogs, name, dimension) {
  const declared = catalogs?.[name];
  const entries = typeof declared === 'function' ? declared(dimension) : declared;
  return Array.isArray(entries) ? entries : [];
}

function templateValue(value, helpers) {
  if (Array.isArray(value)) return value.map(entry => templateValue(entry, helpers));
  if (!isObject(value)) return value;
  if (own(value, '$generate')) {
    if (value.$generate === 'id' && typeof helpers.makeId === 'function') {
      return helpers.makeId(value.base || 'item');
    }
    if (value.$generate === 'name' && typeof helpers.makeName === 'function') {
      return helpers.makeName(helpers.destinationPath, value.base || 'Item');
    }
    throw new Error(`No generator is registered for ${value.$generate}.`);
  }
  if (value.$copy === 'item') {
    const source = helpers.target?.itemPath && at(helpers.model, helpers.target.itemPath);
    if (!source) return undefined;
    return helpers.cloneItem?.(source, helpers.destinationPath) ?? structuredClone(source);
  }
  if (value.$value === 'model' && Array.isArray(value.path)) {
    return structuredClone(at(helpers.model, value.path));
  }
  if (value.$value === 'catalog' && typeof value.property === 'string') {
    return helpers.catalogEntry?.[value.property];
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) =>
    [key, templateValue(child, helpers)]));
}

function fillLabel(label, item) {
  return String(label || '').replace(/\{(name|id|symbol|type)\}/g,
    (_, key) => String(item?.[key] ?? ''));
}

/**
 * Build the nine tree-plan operations consumed by Model Editor from a schema
 * descriptor. Missing menus and insertions deliberately produce no actions.
 * Item factories are registered functions; the schema selects them by name.
 */
export function createSchemaTreeActionPlans({
  model,
  descriptor,
  editorOptions = {},
  capabilities = {},
  catalogs = {},
  catalogIssues = {},
  itemFactories = {},
  dimension = null,
  makeId,
  makeName,
  cloneItem,
} = {}) {
  const policy = isObject(descriptor) ? descriptor : {};
  const state = { model, editorOptions, capabilities };
  const valueAt = path => at(model, path);
  const matches = (when, target) => targetMatches(when, target, state);
  const findRule = (rules, target) => (Array.isArray(rules) ? rules : [])
    .find(rule => matches(rule?.when, target));

  function menuTarget(itemPath, nodeArrayPath) {
    if (!Array.isArray(itemPath) && !Array.isArray(nodeArrayPath)) return null;
    const initialArray = Number.isInteger(itemPath?.at(-1))
      ? itemPath.slice(0, -1) : Array.isArray(nodeArrayPath) ? nodeArrayPath
        : isObject(at(model, itemPath)) ? itemPath : null;
    const preliminary = { itemPath, arrayPath: initialArray, itemArrayPath: initialArray };
    const rule = findRule(policy.menuTargets, preliminary);
    const arrayPath = rule?.arrayPath ? anchoredPath(rule.arrayPath, preliminary) : initialArray;
    if (!Array.isArray(arrayPath)) return null;
    const target = {
      itemPath: Array.isArray(itemPath) ? [...itemPath] : null,
      arrayPath,
      itemArrayPath: initialArray,
      afterIndex: Number.isInteger(itemPath?.at(-1)) ? itemPath.at(-1) : null,
      selectionLabel: rule?.selectionLabel,
    };
    return findRule(policy.actionMenus, target) ? target : null;
  }

  function menuEntries(target) {
    const rule = findRule(policy.actionMenus, target);
    if (!rule) return [];
    const item = target?.itemPath ? valueAt(target.itemPath) : null;
    return (rule.entries || []).flatMap(entry => {
      if (!isObject(entry) || !treeConditionMatches(entry.visibleWhen, { ...state, item })) return [];
      if (entry.separator) return [{ separator: true }];
      if (typeof entry.catalog === 'string') return catalogEntries(catalogs, entry.catalog, dimension)
        .filter(action => !entry.target || action.target === entry.target)
        .map(action => ({
          label: fillLabel(action[entry.labelField || 'label'], item),
          action: action[entry.actionField || 'action'],
          available: entry.available,
        })).filter(action => typeof action.action === 'string');
      if (typeof entry.action !== 'string') return [];
      return [{ label: fillLabel(entry.label || entry.action, item),
        action: entry.action, available: entry.available }];
    });
  }

  function insertionForAction(action, target) {
    const declaration = (policy.insertions || []).find(entry =>
      (entry?.action === action || (typeof entry?.catalog === 'string'
        && catalogEntries(catalogs, entry.catalog, dimension).some(candidate => candidate.action === action)))
      && matches(entry.when, target));
    if (!declaration) return null;
    const destination = declaration.destination || {};
    const path = anchoredPath(destination, target);
    if (!path) return null;
    const catalogEntry = typeof declaration.catalog === 'string'
      ? catalogEntries(catalogs, declaration.catalog, dimension)
        .find(entry => entry.action === action) : null;
    const helpers = { model, target, destinationPath: path, catalogEntry,
      variant: declaration.variant, makeId, makeName, cloneItem, editorOptions, capabilities, dimension };
    const factory = itemFactories[declaration.factory];
    const item = typeof factory === 'function'
      ? factory(helpers) : own(declaration, 'template')
        ? templateValue(declaration.template, helpers) : undefined;
    if (item === undefined) return null;
    if (destination.kind === 'settings') return {
      settingsPath: path, item,
      fallbackName: declaration.fallbackName,
      parentName: declaration.parentName,
    };
    if (destination.kind !== 'array') return null;
    return { arrayPath: path, item,
      afterIndex: declaration.afterIndex === 'target' ? target?.afterIndex ?? null : null };
  }

  function displayItemName(item, arrayPath) {
    const rule = findRule(policy.itemLabels, { arrayPath });
    const properties = rule?.properties || ['name', 'symbol', 'id'];
    const label = properties.map(key => item?.[key]).find(value => value !== undefined && value !== '') || 'Item';
    const suffix = rule?.suffixProperty && item?.[rule.suffixProperty];
    return suffix ? `${label}${rule.separator || ' · '}${suffix}` : String(label);
  }

  function itemTitle(item, path) {
    const rule = findRule(policy.itemTitles, { itemPath: path,
      arrayPath: Number.isInteger(path?.at(-1)) ? path.slice(0, -1) : path });
    if (rule?.label) return fillLabel(rule.label, item);
    const title = item?.type || item?.name || '';
    return String(title).replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ').replace(/^./, first => first.toUpperCase());
  }

  function catalogIssue(action) {
    for (const [name, issue] of Object.entries(catalogIssues || {})) {
      if (!catalogEntries(catalogs, name, dimension).some(entry => entry.action === action)) continue;
      const first = typeof issue === 'function' ? issue()?.[0] : issue?.[0];
      if (first) return `${name} action catalog mismatch: ${first}`;
    }
    return '';
  }

  return {
    defaultArrayItem(arrayPath) {
      return insertionForAction('add-default', { arrayPath })?.item ?? null;
    },
    insertionForAction,
    menuTarget,
    menuEntries,
    displayItemName,
    itemTitle,
    catalogIssue,
    allowsMissingArray(path) {
      return (policy.allowMissingArrays || []).some(pattern => treePathMatches(pattern, path));
    },
    objectPropertyDeletion(path) {
      const rule = (policy.optionalObjects || []).find(entry => treePathMatches(entry?.path, path));
      return rule ? { fallbackName: rule.fallbackName, parentName: rule.parentName } : null;
    },
  };
}
