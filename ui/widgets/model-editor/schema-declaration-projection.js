/** A bounded, source-anchored view of a JSON Schema document's declarations. */
import { effectiveSchemaTreeLabel, schemaActionSourceForDeclaration } from './schema-action-presentation.js';

import { legacyFieldUiView } from "../../annotation-language.js";

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const at = (value, path = []) => path.reduce((current, key) => current?.[key], value);
const humanize = value => String(value ?? '').replace(/([a-z\d])([A-Z])/g, '$1 $2')
  .replace(/[_.-]+/g, ' ').replace(/^./, first => first.toUpperCase());

function pointerPath(pointer = '#') {
  if (typeof pointer !== 'string' || !pointer.startsWith('#')) return null;
  const fragment = pointer.slice(1);
  if (!fragment) return [];
  if (!fragment.startsWith('/')) return null;
  try {
    return fragment.slice(1).split('/').map(token =>
      decodeURIComponent(token).replace(/~1/g, '/').replace(/~0/g, '~'));
  } catch { return null; }
}

function source(document, file, path = [], editable = false) {
  return { document, file, path, value: at(document, path), editable };
}

function targetForReference(current, reference, documents) {
  if (typeof reference !== 'string') return null;
  const hash = reference.indexOf('#');
  const resource = hash < 0 ? reference : reference.slice(0, hash);
  const path = pointerPath(hash < 0 ? '#' : reference.slice(hash));
  if (!path) return null;
  if (!resource) return source(current.document, current.file, path, current.editable);
  let identifier;
  try { identifier = new URL(resource, current.document.$id).href; }
  catch { return null; }
  const imported = documents.get(identifier);
  return imported ? source(imported.document, imported.file, path, true) : null;
}

function followReference(current, documents, seen = new Set()) {
  let target = current;
  while (isRecord(target?.value) && typeof target.value.$ref === 'string') {
    const identity = `${target.file}:${target.path.join('/')}`;
    if (seen.has(identity)) break;
    seen.add(identity);
    const next = targetForReference(target, target.value.$ref, documents);
    if (!next) break;
    target = next;
  }
  return target;
}

function propertySource(current, key, documents, seen = new Set()) {
  if (!current) return null;
  const resolved = followReference(current, documents, seen);
  const identity = `${resolved.file}:${resolved.path.join('/')}:${key}`;
  if (seen.has(identity)) return null;
  seen.add(identity);
  if (isRecord(resolved.value?.properties) && Object.hasOwn(resolved.value.properties, key)) {
    return source(resolved.document, resolved.file, [...resolved.path, 'properties', key], resolved.editable);
  }
  for (let index = 0; index < (resolved.value?.allOf || []).length; index++) {
    const found = propertySource(source(resolved.document, resolved.file, [...resolved.path, 'allOf', index], resolved.editable), key, documents, new Set(seen));
    if (found) return found;
  }
  return null;
}

function schemaAtBinding(root, binding, documents) {
  let current = root;
  for (const key of binding || []) {
    current = propertySource(current, key, documents);
    if (!current) return null;
  }
  return followReference(current, documents);
}

function variantsForCollection(current, documents) {
  if (!current) return [];
  const resolved = followReference(current, documents);
  const item = resolved.value?.items === undefined ? resolved
    : followReference(source(resolved.document, resolved.file, [...resolved.path, 'items'], resolved.editable), documents);
  const result = [];
  function expand(candidate, seen = new Set()) {
    const branch = followReference(candidate, documents);
    const identity = `${branch.file}:${branch.path.join('/')}`;
    if (seen.has(identity) || !isRecord(branch.value)) return;
    seen.add(identity);
    const alternative = Array.isArray(branch.value.oneOf) ? 'oneOf'
      : Array.isArray(branch.value.anyOf) ? 'anyOf' : null;
    if (alternative) {
      branch.value[alternative].forEach((_, index) =>
        expand(source(branch.document, branch.file, [...branch.path, alternative, index], branch.editable), new Set(seen)));
      return;
    }
    result.push(branch);
  }
  expand(item);
  return result;
}

function labelForVariant(current, fallback) {
  return effectiveSchemaTreeLabel(current?.value, humanize(current?.path.at(-1)) || fallback);
}

function nestedTreeProperties(current, documents) {
  const result = [];
  const visited = new Set();
  function visit(candidate) {
    if (!isRecord(candidate?.value)) return;
    const identity = `${candidate.file}:${candidate.path.join('/')}`;
    if (visited.has(identity)) return;
    visited.add(identity);
    for (const [key, value] of Object.entries(candidate.value.properties || {})) {
      if (legacyFieldUiView(value)?.['x-fullmeta-ui-tree']?.role === 'children') {
        result.push({ key, property: source(candidate.document, candidate.file,
          [...candidate.path, 'properties', key], candidate.editable) });
      }
    }
    const reference = targetForReference(candidate, candidate.value.$ref, documents);
    if (reference) visit(reference);
    if (Array.isArray(candidate.value.allOf)) candidate.value.allOf.forEach((_, index) =>
      visit(source(candidate.document, candidate.file, [...candidate.path, 'allOf', index], candidate.editable)));
  }
  visit(current);
  return result;
}

function node(label, current, { children = [], binding = null } = {}) {
  const declaration = current?.value;
  const view = legacyFieldUiView(declaration);
  return {
    label: label || 'Declaration',
    iconSvg: view?.['x-fullmeta-ui-icon'] || null,
    path: current?.editable ? current.path : null,
    sourceFile: current?.file || '',
    sourcePointer: current ? `#${current.path.map(part => `/${String(part).replace(/~/g, '~0').replace(/\//g, '~1')}`).join('')}` : '#',
    readOnly: !current?.editable,
    binding: Array.isArray(binding) ? [...binding] : null,
    children,
  };
}

function addRelatedSource(target, label, current) {
  if (!current?.editable || !Array.isArray(current.path)) return;
  const sources = target.relatedSources ||= [];
  if (sources.some(entry => entry.file === current.file
    && entry.path.length === current.path.length
    && entry.path.every((part, index) => part === current.path[index]))) return;
  sources.push({ label, file: current.file, path: [...current.path] });
}

function collectionActionSource(current) {
  if (!current) return null;
  const action = schemaActionSourceForDeclaration({
    document: current.document, path: current.path, value: current.value,
  });
  return action ? source(current.document, current.file, action.path, current.editable) : null;
}

function objectEntryVariants(current, documents) {
  const object = followReference(current, documents);
  if (!isRecord(object?.value?.additionalProperties)) return [];
  const declaration = source(object.document, object.file,
    [...object.path, 'additionalProperties'], object.editable);
  return variantsForCollection(declaration, documents);
}

function appendNestedTreeCollections(parent, owner, documents, depth, maxDepth, ancestors = new Set()) {
  if (depth >= maxDepth) return;
  const ownerIdentity = `${owner.file}:${owner.path.join('/')}`;
  if (ancestors.has(ownerIdentity)) return;
  const branch = new Set(ancestors);
  branch.add(ownerIdentity);
  for (const { key, property } of nestedTreeProperties(owner, documents)) {
    const declaration = legacyFieldUiView(property.value)?.['x-fullmeta-ui-tree'];
    const collection = node(property.value.title || declaration.title || humanize(key), property,
      { binding: [...parent.binding, key], documents });
    if (parent.children.some(child => child.sourceFile === collection.sourceFile
      && child.sourcePointer === collection.sourcePointer)) continue;
    parent.children.push(collection);
    if (depth + 1 >= maxDepth) continue;
    for (const variant of variantsForCollection(property, documents)) {
      const variantIdentity = `${variant.file}:${variant.path.join('/')}`;
      if (variantIdentity === `${property.file}:${property.path.join('/')}`) {
        appendNestedTreeCollections(collection, variant, documents, depth + 1, maxDepth, branch);
        continue;
      }
      const item = node(labelForVariant(variant, humanize(key)), variant,
        { binding: [...collection.binding, '*'], documents });
      collection.children.push(item);
      appendNestedTreeCollections(item, variant, documents, depth + 2, maxDepth, branch);
    }
  }
}

function declarationNodes(root, descriptor, documents, maxDepth, descriptorPath = null) {
  if (!descriptor.role && Array.isArray(descriptor.children)) {
    const groupSource = Array.isArray(descriptorPath)
      ? source(root.document, root.file, descriptorPath, true) : null;
    const group = node(descriptor.title || humanize(descriptor.path?.at(-1)), groupSource,
      { binding: descriptor.path || [], documents });
    if (maxDepth > 1) group.children = descriptor.children.map((child, index) =>
      declarationNodes(root, { ...child, path: [...(descriptor.path || []), ...(child.path || [])] },
        documents, maxDepth - 1,
        Array.isArray(descriptorPath) ? [...descriptorPath, 'children', index] : null)).filter(Boolean);
    return group;
  }
  const base = schemaAtBinding(root, descriptor.path || [], documents);
  if (!base) return null;
  const current = base;
  const binding = Array.isArray(descriptor.path) ? descriptor.path : [];
  const collectionRole = ['collection', 'rootItems', 'componentCollections'].includes(descriptor.role);
  const variants = collectionRole ? variantsForCollection(current, documents) : [];
  // A required, single root item is the section itself in an instance tree.
  // Preserve the array declaration as an editable related source.
  const singleRootItem = descriptor.role === 'rootItems' && current.value?.type === 'array'
    && current.value.minItems === 1 && current.value.maxItems === 1 && variants.length === 1;
  const primary = singleRootItem ? variants[0] : current;
  const result = node(primary.value?.title || descriptor.title || humanize((descriptor.path || []).at(-1)), primary,
    { binding: singleRootItem ? [...binding, '*'] : binding });
  if (singleRootItem) addRelatedSource(result, 'Collection rules', current);
  if (maxDepth <= 1) return result;

  const owners = [];
  if (collectionRole) {
    if (singleRootItem) {
      owners.push({ treeNode: result, definition: primary, depth: 1 });
      appendNestedTreeCollections(result, primary, documents, 1, maxDepth);
    } else {
      result.children = variants.map(variant => {
        const item = node(labelForVariant(variant, descriptor.title || 'Item'), variant,
          { binding: [...binding, '*'], documents });
        appendNestedTreeCollections(item, variant, documents, 2, maxDepth);
        owners.push({ treeNode: item, definition: variant, depth: 2 });
        return item;
      });
    }
  } else {
    owners.push({ treeNode: result, definition: current, depth: 1 });
    appendNestedTreeCollections(result, current, documents, 1, maxDepth);
  }
  if (Array.isArray(descriptor.children)) {
    for (const { treeNode, definition, depth } of owners) {
      if (depth >= maxDepth) continue;
      for (const child of descriptor.children) {
        const childSource = schemaAtBinding(definition, child.path || [], documents);
        if (!childSource) continue;
        const childLabel = childSource.value?.title || child.title || humanize((child.path || []).at(-1));
        const childBinding = [...treeNode.binding, ...(Array.isArray(child.path) ? child.path : [])];
        // An explicit tree child takes precedence over a collection discovered
        // from the field's tree widget. Both describe the same project path.
        const automaticIndex = treeNode.children.findIndex(item =>
          JSON.stringify(item.binding) === JSON.stringify(childBinding));
        if (automaticIndex >= 0) {
          if (child.heading === false) treeNode.children.splice(automaticIndex, 1);
          else continue;
        }
        if (child.role === 'objectEntries') {
          for (const variant of objectEntryVariants(childSource, documents)) {
            const item = node(labelForVariant(variant, childLabel), variant,
              { binding: [...childBinding, '*'], documents });
            treeNode.children.push(item);
            appendNestedTreeCollections(item, variant, documents, depth + 1, maxDepth);
          }
          continue;
        }
        // Mirror an instance tree's heading-free collection by projecting its
        // allowed item forms beside each other, with the collection editable.
        if (child.heading === false
          && ['collection', 'rootItems', 'componentCollections'].includes(child.role)) {
          const actionSource = collectionActionSource(childSource);
          addRelatedSource(treeNode, `${childLabel} collection`, childSource);
          addRelatedSource(treeNode, `${childLabel} item actions`, actionSource);
          for (const variant of variantsForCollection(childSource, documents)) {
            const item = node(labelForVariant(variant, childLabel), variant,
              { binding: [...childBinding, '*'], documents });
            addRelatedSource(item, `${childLabel} collection`, childSource);
            addRelatedSource(item, `${childLabel} item actions`, actionSource);
            treeNode.children.push(item);
            appendNestedTreeCollections(item, variant, documents, depth + 1, maxDepth);
          }
        } else {
          treeNode.children.push(node(childLabel, childSource,
            { binding: childBinding, documents }));
        }
      }
    }
  }
  return result;
}

/** Project authored schema tree children, retaining exact local edit paths. */
export function projectSchemaDeclarations(model, modelFile, spec) {
  const maxDepth = Math.min(6, Math.max(1, Number(spec?.maxDepth) || 3));
  const root = source(model, modelFile, [], true);
  const documents = new Map();
  if (typeof model?.$id === 'string') {
    try { documents.set(new URL(model.$id).href, { document: model, file: modelFile }); }
    catch { /* An invalid identifier must remain editable in the open document. */ }
  }
  const childrenPath = spec?.childrenPath || ['x-fullmeta-ui-tree', 'children'];
  const children = at(model, childrenPath);
  return Array.isArray(children)
    ? children.map((child, index) => declarationNodes(root, child, documents, maxDepth,
      [...childrenPath, index])).filter(Boolean)
    : [];
}
