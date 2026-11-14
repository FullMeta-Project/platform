/** Pure schema/model-to-tree projection. Paths always refer to the source document. */
import { legacyFieldUiView } from '../../annotation-language.js';

const object = value => value !== null && typeof value === 'object';
const at = (value, path = []) => path.reduce((entry, key) => entry?.[key], value);
const titleCase = value => String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');
const pathId = path => JSON.stringify(path || []);
const samePath = (a, b) => Array.isArray(a) && Array.isArray(b) && pathId(a) === pathId(b);
const clean = value => {
  if (Array.isArray(value)) return value.map(clean);
  if (!object(value)) return ['function', 'symbol', 'undefined'].includes(typeof value) ? undefined : value;
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry !== 'function' && entry !== undefined)
    .map(([key, entry]) => [key, clean(entry)]));
};

export function createTreeViewState(value = {}) {
  return { format: 'fullmeta-tree-state/1', selectedId: typeof value.selectedId === 'string' ? value.selectedId : null,
    selectedPath: Array.isArray(value.selectedPath) ? [...value.selectedPath] : null,
    focusedId: typeof value.focusedId === 'string' ? value.focusedId : null,
    expanded: Object.fromEntries(Object.entries(value.expanded || {}).filter(([, expanded]) => typeof expanded === 'boolean')) };
}

/** Presentation-only transitions. Model edits remain normal host commands. */
export function reduceTreeViewState(state, command) {
  const next = createTreeViewState(state);
  if (command.type === 'select') {
    next.selectedId = command.id ?? null;
    next.selectedPath = Array.isArray(command.path) ? [...command.path] : null;
  } else if (command.type === 'toggle') {
    if (typeof command.id !== 'string') throw new Error('A tree toggle needs a stable node ID.');
    Object.defineProperty(next.expanded, command.id, { value: Boolean(command.expanded), enumerable: true, configurable: true, writable: true });
  } else if (command.type === 'focus') next.focusedId = command.id ?? null;
  else if (command.type === 'reset') return createTreeViewState();
  else throw new Error(`Unknown tree presentation command ${command.type}.`);
  return next;
}

/**
 * Resolver callbacks are read-only dependencies. Output is serializable data: no
 * DOM nodes, functions, graphics resources or service implementations are retained.
 * Closed branches are not populated until the same projection is rerun expanded.
 */
export function projectSchemaTree(model, descriptor, options = {}) {
  const state = createTreeViewState(options.state);
  const schemaForPath = options.schemaForPath || (() => ({}));
  const resolveSchema = options.resolveSchema || (value => value || {});
  const labelFor = options.labelFor || (value => value?.name || value?.title || value?.id || 'Item');
  const collapsedByDefault = options.collapsedByDefault !== false;
  const nodes = [], diagnostics = [];
  const identityPath = path => path.map((part, index) => {
    const value = Number.isInteger(part) ? at(model, path.slice(0, index + 1)) : null;
    return typeof value?.id === 'string' && value.id ? { id: value.id } : part;
  });
  const schemaTitle = (definition, path) => {
    const declared = schemaForPath(path, { resolveVariant: false }) || {};
    return definition.title || declared.title || resolveSchema(declared)?.title || titleCase(path.at(-1));
  };
  const sectionId = (path, suffix = '') => `section:${pathId(identityPath(path))}:${suffix}`;
  const itemId = (path, value, definition = {}) => {
    const key = typeof value?.id === 'string' && value.id ? `id=${value.id}`
      : typeof value?.symbol === 'string' && value.symbol ? `symbol=${value.symbol}` : `path=${pathId(identityPath(path))}`;
    return `item:${pathId(identityPath(Number.isInteger(path.at(-1)) ? path.slice(0, -1) : path))}:${key}:${definition.role || ''}`;
  };
  const item = (list, label, path, value, definition = {}, extra = {}) => {
    const id = extra.id || itemId(path, value, definition);
    const enabled = (value?.enabled !== false || definition.selectDisabledItems === true) && !extra.readOnly;
    const disabledReason = extra.readOnly ? 'This item is read only.'
      : value?.enabled === false && definition.selectDisabledItems !== true ? 'This item is disabled for selection because its enabled value is false.' : null;
    const entry = { kind: 'item', id, label: String(label ?? ''), title: String(extra.title ?? label ?? ''),
      path: Array.isArray(path) ? [...path] : null, enabled, disabledReason, readOnly: Boolean(extra.readOnly),
      active: state.selectedId ? state.selectedId === id : samePath(state.selectedPath, path),
      className: [definition.itemClass, value?.enabled === false && definition.disabledClass].filter(Boolean).join(' '),
      ...extra };
    list.push(entry); return entry;
  };
  const markAmbiguous = (node, reason) => {
    if (!node || typeof node !== 'object') return;
    node.ambiguousIdentity = true;
    node.enabled = false;
    node.disabledReason = reason;
    if (node.owner) markAmbiguous(node.owner, reason);
    for (const child of node.children || []) markAmbiguous(child, reason);
  };
  const group = (list, label, path, definition, populate, { owner = null, id, defaultExpanded } = {}) => {
    const identity = id || sectionId(path, `${definition.role || ''}:${label || ''}`);
    const hasHeading = definition.heading !== false;
    const expandable = Boolean(owner || hasHeading);
    const expanded = !expandable || (Object.hasOwn(state.expanded, identity) ? state.expanded[identity]
      : defaultExpanded ?? !collapsedByDefault);
    const entry = { kind: 'group', id: identity, label: String(label || ''), path: [...path],
      className: definition.sectionClass || '', heading: hasHeading, owner, expandable, expanded,
      lazy: expandable && !expanded, children: [], iconSvg: legacyFieldUiView(definition)?.['x-fullmeta-ui-icon'] || null };
    if (expanded) populate(entry.children);
    list.push(entry); return entry;
  };
  const childDeclarations = (value, path) => Object.entries(schemaForPath(path)?.properties || {}).flatMap(([key, declaration]) => {
    const ui = legacyFieldUiView(resolveSchema(declaration) || {})?.['x-fullmeta-ui-tree'];
    return ui?.role === 'children' && object(value?.[key]) ? [{ key, declaration, ui }] : [];
  });
  const hasDeclaredTreeChildren = path => Object.values(schemaForPath(path)?.properties || {}).some(declaration =>
    legacyFieldUiView(resolveSchema(declaration) || {})?.['x-fullmeta-ui-tree']?.role === 'children');
  function schemaChildren(list, value, path, definition, prefix) {
    for (const { key, declaration, ui } of childDeclarations(value, path)) {
      const childPath = [...path, key], child = value[key];
      if (Array.isArray(child)) collection(list, child, childPath, { ...ui, heading: false }, prefix);
      else {
        const label = child.name || child.title || declaration.title || key;
        if (hasDeclaredTreeChildren(childPath)) {
          const owner = item([], label, childPath, child, definition);
          group(list, '', childPath, { heading: false }, nested => schemaChildren(nested, child, childPath, definition, prefix), { owner, id: `group:${owner.id}` });
        } else item(list, label, childPath, child, definition);
      }
    }
  }
  function collectionEntries(list, entries, path, definition, prefix) {
    const identities = new Map();
    entries.forEach((value, index) => {
      const itemPath = [...path, index], schemaChildrenPresent = childDeclarations(value, itemPath);
      const schemaChildrenDeclared = hasDeclaredTreeChildren(itemPath);
      const explicitChildren = (definition.children || []).length > 0;
      const label = definition.labelProperty ? value?.[definition.labelProperty]
        : value?.[definition.itemLabelProperty || 'name'] || value?.id || labelFor(value, entries);
      const owner = item([], `${prefix}${label ?? ''}`, itemPath, value, definition);
      const identity = owner.id, existing = identities.get(identity) || [];
      if (existing.length) {
        const message = 'Duplicate tree item identity; this item is unavailable until its identity is unique.';
        diagnostics.push({ path: itemPath, message: 'Duplicate tree item identity; source path disambiguates this item.' });
        for (const ambiguous of [...existing, owner]) {
          markAmbiguous(list.find(node => node === ambiguous || node.owner === ambiguous) || ambiguous, message);
        }
        owner.id += `:duplicate:${index}`;
      }
      identities.set(identity, [...existing, owner]);
      const populate = nested => {
        schemaChildren(nested, value, itemPath, definition, prefix);
        for (const child of definition.children || []) render(nested, value, itemPath, child, prefix);
      };
      if (schemaChildrenDeclared || explicitChildren) group(list, '', itemPath,
        { heading: false, sectionClass: `${schemaChildrenPresent[0]?.ui?.sectionClass || 'tree-recursive-group'}${explicitChildren ? ' tree-descriptor-children-group' : ''}` }, populate,
        { owner, id: `group:${owner.id}`, defaultExpanded: explicitChildren ? true : undefined });
      else list.push(owner);
    });
  }
  function collection(list, values, path, definition, prefix) {
    const owns = definition.role !== 'children' && !(definition.heading === false && !definition.sectionClass);
    const populate = nested => collectionEntries(nested, Array.isArray(values) ? values : [], path, definition, prefix);
    if (owns) group(list, `${prefix}${schemaTitle(definition, path)}`, path, definition, populate);
    else populate(list);
  }
  function objectProperties(list, value, path, definition) {
    const maximum = Number.isInteger(definition.maxDepth) && definition.maxDepth >= 0 ? definition.maxDepth : 3;
    const annotationPrefix = definition.annotationPrefix || 'x-fullmeta-ui-';
    const hasAnnotation = (node, seen = new Set()) => {
      if (!object(node) || seen.has(node)) return false;
      const next = new Set(seen); next.add(node);
      return Object.entries(node).some(([key, child]) => key.startsWith(annotationPrefix) || hasAnnotation(child, next));
    };
    const entries = node => Array.isArray(node) ? definition.includeArrays === false ? [] : [...node.entries()]
      : object(node) ? Object.entries(node) : [];
    const visit = (nested, node, nodePath, depth, inheritedAmbiguity = '') => {
      if (depth >= maximum) return;
      const identities = new Map();
      for (const [key, child] of entries(node)) {
        if (definition.schemaAnnotatedOnly && !hasAnnotation(child)) continue;
        const childPath = [...nodePath, key];
        const label = child?.[definition.labelProperty] || child?.title || (Number.isInteger(key)
          ? child?.$ref ? titleCase(child.$ref.split('/').at(-1)) : `Item ${key + 1}`
          : definition.humanizeKeys === false ? String(key) : titleCase(key));
        const owner = item([], label, childPath, child, definition);
        if (inheritedAmbiguity) {
          owner.ambiguousIdentity = true;
          owner.enabled = false;
          owner.disabledReason = inheritedAmbiguity;
        }
        const identity = Array.isArray(node) && typeof child?.id === 'string' && child.id ? child.id : null;
        const existing = identity ? identities.get(identity) || [] : [];
        if (existing.length) {
          const message = 'Duplicate tree item identity; this item is unavailable until its identity is unique.';
          diagnostics.push({ path: childPath, message: 'Duplicate tree item identity; source path disambiguates this item.' });
          for (const ambiguous of [...existing, owner]) {
            markAmbiguous(nested.find(node => node === ambiguous || node.owner === ambiguous) || ambiguous, message);
          }
          owner.id += `:duplicate:${key}`;
        }
        if (identity) identities.set(identity, [...existing, owner]);
        const hasChildren = depth + 1 < maximum && object(child)
          && (definition.includeArrays !== false || !Array.isArray(child));
        if (hasChildren) group(nested, '', childPath, { heading: false, sectionClass: definition.sectionClass },
          more => visit(more, child, childPath, depth + 1, owner.ambiguousIdentity ? owner.disabledReason : ''), { owner, id: `group:${owner.id}` });
        else nested.push(owner);
      }
    };
    if (definition.title) group(list, definition.title, path, definition, nested => visit(nested, value, path, 0));
    else visit(list, value, path, 0);
  }
  function schemaDeclarations(list, projection, ancestors = [], location = []) {
    for (const [index, source] of (projection || []).entries()) {
      const entry = clean({ ...source, children: undefined }), treeLocation = [...location, index];
      const trail = [...ancestors, { ...entry, treeLocation }];
      const nodeProjection = { ...entry, treeLocation, treeTrail: trail };
      const identity = `declaration:${source.sourceFile || ''}:${source.sourcePointer || pathId(source.path)}:${pathId(treeLocation)}`;
      const readOnly = source.readOnly || !Array.isArray(source.path);
      const owner = item([], source.label, source.path, { enabled: true }, {}, { id: identity,
        readOnly, enabled: !readOnly, projection: nodeProjection, iconSvg: source.iconSvg || null,
        sourceFile: source.sourceFile || null, sourcePointer: source.sourcePointer || null,
        title: readOnly ? `${[source.sourceFile, source.sourcePointer].filter(Boolean).join('')} · unavailable source` : source.label });
      if (source.children?.length) group(list, '', source.path || [], { heading: false },
        nested => schemaDeclarations(nested, source.children, trail, treeLocation), { owner, id: `group:${identity}` });
      else list.push(owner);
    }
  }
  function render(list, base, basePath, definition, prefix = '') {
    if (!definition || typeof definition !== 'object') return;
    const path = [...basePath, ...(definition.path || [])], value = at(base, definition.path || []), role = definition.role;
    if (!role && Array.isArray(definition.children)) {
      group(list, schemaTitle(definition, path), path, definition, nested => {
        for (const child of definition.children) render(nested, value, path, child, prefix);
      }); return;
    }
    if (role === 'collectionLink') {
      const label = `${schemaTitle(definition, path)} (${Array.isArray(value) ? value.length : 0})`;
      item(list, label, path, {}, definition, { id: `collection:${pathId(path)}`, kind: 'collectionLink', collection: definition.collection || definition.path?.at(-1) }); return;
    }
    if (role === 'componentCollections') {
      const components = Array.isArray(value) ? value : [];
      components.forEach((component, index) => {
        const ownerPrefix = definition.ownerNameProperty && components.length > 1 ? `${component?.[definition.ownerNameProperty] || 'Component'} · ` : '';
        for (const child of definition.children || []) render(list, component, [...path, index], child, ownerPrefix);
      }); return;
    }
    if (role === 'objectRoot') {
      if (!object(value)) return;
      const label = `${prefix}${schemaTitle(definition, path) || value.name || value.id}`;
      const hasChildren = hasDeclaredTreeChildren(path) || (definition.children || []).length > 0;
      if (!hasChildren) { item(list, label, path, value, definition); return; }
      const owner = item([], label, path, value, definition);
      group(list, '', path, { ...definition, heading: false }, nested => {
        schemaChildren(nested, value, path, definition, prefix);
        for (const child of definition.children || []) render(nested, value, path, child, prefix);
      }, { owner, id: `group:${owner.id}` }); return;
    }
    if (role === 'objectEntries') {
      if (!object(value) || Array.isArray(value)) return;
      const declared = new Set(Object.keys(resolveSchema(schemaForPath(path) || {})?.properties || {}));
      const entries = Object.entries(value).filter(([key]) => !declared.has(key)), siblings = entries.map(([, entry]) => entry);
      for (const [key, child] of entries) {
        const childPath = [...path, key], label = child?.[definition.itemLabelProperty || 'name'] || child?.id || labelFor(child, siblings);
        const owner = item([], `${prefix}${label}`, childPath, child, definition);
        const populate = nested => {
          schemaChildren(nested, child, childPath, definition, prefix);
          for (const next of definition.children || []) render(nested, child, childPath, next, prefix);
        };
        if (hasDeclaredTreeChildren(childPath) || (definition.children || []).length > 0) group(list, '', childPath,
          { heading: false, sectionClass: definition.sectionClass }, populate, { owner, id: `group:${owner.id}` });
        else { list.push(owner); schemaChildren(list, child, childPath, definition, prefix); }
      } return;
    }
    if (role === 'rootItems') {
      (Array.isArray(value) ? value : []).forEach((child, index) => {
        const childPath = [...path, index], label = definition.title || child?.[definition.itemLabelProperty || 'name'] || child?.id || labelFor(child, value);
        const owner = item([], `${prefix}${label}`, childPath, child, definition);
        if (hasDeclaredTreeChildren(childPath) || (definition.children || []).length > 0) {
          group(list, '', childPath, { ...definition, heading: false }, nested => {
            schemaChildren(nested, child, childPath, definition, prefix);
            for (const next of definition.children || []) render(nested, child, childPath, next, prefix);
          }, { owner, id: `group:${owner.id}` });
        } else list.push(owner);
      }); return;
    }
    if (role === 'componentRoot' || role === 'optionalItem') {
      if (role === 'optionalItem' && !value) return;
      const label = definition.labelProperty ? value?.[definition.labelProperty]
        : value?.[definition.itemLabelProperty || 'name'] || value?.id || labelFor(value, [value]);
      item(list, `${prefix}${label}`, path, value, definition);
      if (role === 'componentRoot') for (const next of definition.children || []) render(list, value, path, next, prefix);
      return;
    }
    if (role === 'collection' || role === 'children') collection(list, value, path, definition, prefix);
    else if (role === 'objectProperties') objectProperties(list, value, path, definition);
    else if (role === 'schemaDeclarations') schemaDeclarations(list, definition.projection);
    else if (role === 'transparent') for (const child of definition.children || []) render(list, value, path, child, prefix);
  }
  if (model && descriptor) for (const definition of descriptor.children || []) render(nodes, model, [], definition);
  return clean({ format: 'fullmeta-tree-view/1', nodes, state, diagnostics });
}

export function visibleTreeItems(projection) {
  const items = [];
  const visit = nodes => { for (const node of nodes || []) { if (node.owner) items.push(node.owner); if (node.kind !== 'group') items.push(node); visit(node.children); } };
  visit(projection?.nodes); return items;
}
