/** Application-neutral, reversible editing of project-tree presentation metadata. */

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const fields = [
  ['title', 'Displayed title', 'text'],
  ['collection', 'Collection link', 'text'],
  ['scope', 'Scope', 'text'],
  ['itemClass', 'Item CSS class', 'text'],
  ['disabledClass', 'Disabled CSS class', 'text'],
  ['heading', 'Show heading', 'boolean'],
  ['visibleWhen.source', 'Visibility source', 'text'],
  ['visibleWhen.path', 'Visibility path', 'text'],
  ['visibleWhen.equals', 'Visible when equals', 'typed'],
  ['visibleWhen.notEquals', 'Visible when not equal', 'typed'],
  ['visibleWhen.exists', 'Visible when exists', 'boolean'],
  ['icon', 'SVG icon', 'svg'],
];
const fieldKinds = new Map(fields.map(([key, , kind]) => [key, kind]));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);



function nodePathParts(nodePath) {
  if (typeof nodePath !== 'string' || !/^(0|[1-9]\d*)(?:\/(?:0|[1-9]\d*))*$/.test(nodePath)) {
    throw new Error('Tree node paths use zero-based child numbers, such as 0 or 4/1.');
  }
  return nodePath.split('/').map(Number);
}

function treeNode(documentValue, nodePath) {
  let children = documentValue?.['x-fullmeta-ui-tree']?.children;
  let node;
  for (const index of nodePathParts(nodePath)) {
    if (!Array.isArray(children) || !isObject(children[index])) {
      throw new Error(`Tree node ${nodePath} is no longer present.`);
    }
    node = children[index];
    children = node.children;
  }
  return node;
}

function annotationPath(nodePath, field) {
  const base = ['x-fullmeta-ui-tree', 'children', ...nodePathParts(nodePath)];
  if (field === 'icon') return [...base, 'x-fullmeta-ui-behavior', 'payload', 'presentation', 'icon'];
  if (field.startsWith('visibleWhen.')) return [...base, 'visibleWhen', field.slice('visibleWhen.'.length)];
  return [...base, field];
}

function generatedAnnotationOwner(documentValue, nodePath, field) {
  const target = annotationPath(nodePath, field);
  return documentValue?.['x-fullmeta-ui-generated']?.fields?.find(entry =>
    Array.isArray(entry?.path) && entry.path.length <= target.length
      && entry.path.every((part, index) => part === target[index]))?.owner || null;
}

/** Return exact schema paths an explicitly submitted annotation table may update. */
export function schemaTreeAnnotationEditPaths(edits) {
  return (Array.isArray(edits) ? edits : [])
    .filter(edit => typeof edit?.node === 'string' && typeof edit?.field === 'string'
      && fieldKinds.has(edit.field))
    .map(edit => annotationPath(edit.node, edit.field));
}

export function schemaTreeAnnotationNodes(documentValue) {
  const result = [];
  const visit = (children, prefix = '', binding = []) => {
    if (!Array.isArray(children)) return;
    children.forEach((node, index) => {
      if (!isObject(node)) return;
      const key = prefix ? `${prefix}/${index}` : String(index);
      const nextBinding = [...binding, ...(Array.isArray(node.path) ? node.path : [])];
      result.push({ key, binding: nextBinding, role: node.role || 'display group',
        title: node.title || nextBinding.at(-1) || `Group ${index + 1}`,
        hasIcon: typeof node?.['x-fullmeta-ui-behavior']?.payload?.presentation?.icon === 'string',
        hasVisibility: isObject(node.visibleWhen) });
      visit(node.children, key, nextBinding);
    });
  };
  visit(documentValue?.['x-fullmeta-ui-tree']?.children);
  return result;
}

function annotationValue(node, field) {
  if (field === 'icon') return node?.['x-fullmeta-ui-behavior']?.payload?.presentation?.icon;
  if (field === 'visibleWhen.path') {
    return Array.isArray(node?.visibleWhen?.path) ? node.visibleWhen.path.join('/') : undefined;
  }
  if (field.startsWith('visibleWhen.')) return node?.visibleWhen?.[field.slice('visibleWhen.'.length)];
  return node?.[field];
}

function typedValue(edit) {
  const { field, type, value = '' } = edit;
  const kind = fieldKinds.get(field);
  if (!kind) throw new Error(`Tree annotation ${field} is not supported.`);
  if (type === 'unset') return undefined;
  if (kind === 'text' || kind === 'svg') {
    if (type !== 'text' && !(kind === 'svg' && type === 'svg')) {
      throw new Error(`${field} needs a text value.`);
    }
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} needs text.`);
    if (kind === 'svg' && (!/^<svg(?:\s|>)[\s\S]*<\/svg>\s*$/i.test(value.trim())
      || /<script(?:\s|>)/i.test(value) || /\son[a-z]+\s*=/i.test(value))) {
      throw new Error('The icon must be an inline SVG without scripts or event handlers.');
    }
    return value;
  }
  if (kind === 'boolean' && type !== 'boolean') throw new Error(`${field} needs a true or false value.`);
  if (kind === 'typed' && !['text', 'boolean', 'number', 'null'].includes(type)) {
    throw new Error(`${field} needs text, true or false, a number, or null.`);
  }
  if (type === 'boolean') {
    if (value !== 'true' && value !== 'false') throw new Error(`${field} must be true or false.`);
    return value === 'true';
  }
  if (type === 'number') {
    if (!String(value).trim() || !Number.isFinite(Number(value))) throw new Error(`${field} needs a finite number.`);
    return Number(value);
  }
  if (type === 'null') return null;
  return value;
}

function setAnnotation(node, field, value) {
  if (field === 'icon') {
    if (value === undefined) {
      const behavior = node['x-fullmeta-ui-behavior'];
      if (!isObject(behavior?.payload?.presentation)) return;
      delete behavior.payload.presentation.icon;
      if (!Object.keys(behavior.payload.presentation).length) delete behavior.payload.presentation;
      if (!Object.keys(behavior.payload).length) delete node['x-fullmeta-ui-behavior'];
      return;
    }
    const behavior = node['x-fullmeta-ui-behavior'] ||= {
      format: 'fullmeta-ui-behavior/1', target: { kind: 'field' },
      context: 'projectEditing', payload: {},
    };
    behavior.payload ||= {};
    behavior.payload.presentation ||= {};
    behavior.payload.presentation.icon = value;
    return;
  }
  if (field.startsWith('visibleWhen.')) {
    const key = field.slice('visibleWhen.'.length);
    if (value === undefined) {
      if (!isObject(node.visibleWhen)) return;
      delete node.visibleWhen[key];
      if (!Object.keys(node.visibleWhen).length) delete node.visibleWhen;
      return;
    }
    node.visibleWhen ||= {};
    if (key === 'path') {
      const parts = value.split('/').map(part => part.trim());
      if (!parts.length || parts.some(part => !part)) throw new Error('Visibility path needs nonempty keys.');
      node.visibleWhen.path = parts;
    } else node.visibleWhen[key] = value;
    return;
  }
  if (value === undefined) delete node[field];
  else node[field] = value;
}

/** Guided operation: structural bindings and generated action menus are untouched. */
export function schemaWithTreeAnnotationEdits(documentValue, edits) {
  if (!isObject(documentValue) || !Array.isArray(documentValue?.['x-fullmeta-ui-tree']?.children)) {
    throw new Error('This schema has no project-tree children to annotate.');
  }
  if (!Array.isArray(edits)) throw new Error('Tree annotations need a list of field edits.');
  const next = clone(documentValue);
  const seen = new Set();
  for (const edit of edits) {
    if (!isObject(edit) || typeof edit.node !== 'string' || typeof edit.field !== 'string') {
      throw new Error('Each tree annotation needs a node and field.');
    }
    const identity = `${edit.node}\t${edit.field}`;
    if (seen.has(identity)) throw new Error(`Tree annotation ${identity} appears twice.`);
    seen.add(identity);
    setAnnotation(treeNode(next, edit.node), edit.field, typedValue(edit));
  }
  return next;
}

function parsedTsv(text) {
  const rows = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n').filter(line => line.trim());
  if (rows.length > 1000) throw new Error('Import at most 1,000 annotation rows at once.');
  const edits = [];
  rows.forEach((line, index) => {
    const cells = line.split('\t');
    if (index === 0 && cells[0]?.trim().toLowerCase() === 'node'
      && cells[1]?.trim().toLowerCase() === 'field') return;
    if (cells.length !== 4) throw new Error(`Line ${index + 1}: use node, field, type, value columns.`);
    edits.push({ node: cells[0].trim(), field: cells[1].trim(), type: cells[2].trim().toLowerCase(),
      value: cells[3] });
  });
  if (!edits.length) throw new Error('The table has no annotation rows.');
  return edits;
}

/** The table reads existing metadata and edits it through a narrow, previewed transaction. */

export { fields, annotationValue, treeNode, parsedTsv };

export { createSchemaTreeAnnotationsDialog } from './schema-extra-candidate-dialogs.js';
