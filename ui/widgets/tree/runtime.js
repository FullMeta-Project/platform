import { createTreeToggle, setTreeToggleState } from "./tree-primitives.js";
import { legacyFieldUiView } from "../../annotation-language.js";

/** Render a model tree from schema-provided path and node descriptors. */

const labelCase = (value) => String(value ?? "").replace(/([a-z])([A-Z])/g, "$1 $2");
const deferredSectionContents = new WeakMap();

function treeTitle(descriptor, path, context) {
  const declaration = context.schemaForPath?.(path, { resolveVariant: false });
  const resolved = context.resolveSchema?.(declaration);
  return descriptor.title || declaration?.title || resolved?.title || labelCase(path.at(-1));
}

function valueAt(root, path) {
  return (path || []).reduce((value, key) => value?.[key], root);
}

function deferSectionContents(section, render) {
  deferredSectionContents.set(section, render);
}

/** Populate a section the first time it is expanded. Returns true when work ran. */
export function populateTreeSection(section) {
  const render = deferredSectionContents.get(section);
  if (!render) return false;
  deferredSectionContents.delete(section);
  render();
  return true;
}

function appendSection(parent, label, path, descriptor = {}) {
  const section = document.createElement("section");
  section.className = ["tree-group", descriptor.sectionClass].filter(Boolean).join(" ");
  if (descriptor.heading !== false) {
    const heading = document.createElement("div");
    heading.className = "tree-label";
    heading.textContent = label || "";
    heading.dataset.arrayPath = JSON.stringify(path);
    heading.dataset.contextLabel = label || "";
    heading.treeIconSvg = legacyFieldUiView(descriptor)?.["x-fullmeta-ui-icon"] || null;
    parent.append(section);
    section.append(heading);
  } else {
    parent.append(section);
  }
  return section;
}

function appendItem(parent, value, siblings, path, descriptor, context) {
  const labelProperty = descriptor.itemLabelProperty || "name";
  const label = descriptor.labelProperty
    ? valueAt(value, [descriptor.labelProperty])
    : (value?.[labelProperty] || value?.id || context.labelFor(value, siblings));
  const item = context.addItem(parent, `${context.ownerPrefix || ""}${label}`, path, value?.enabled !== false || descriptor.selectDisabledItems === true);
  if (descriptor.itemClass) item.classList.add(descriptor.itemClass);
  if (value?.enabled === false && descriptor.disabledClass) item.classList.add(descriptor.disabledClass);
  return item;
}

function renderSchemaChildren(parent, value, path, descriptor, context) {
  const schema = context.schemaForPath(path) || {};
  const properties = schema.properties || {};
  for (const [key, propertyNode] of Object.entries(properties)) {
    const propertyUi = legacyFieldUiView(context.resolveSchema(propertyNode) || {})?.["x-fullmeta-ui-tree"];
    if (propertyUi?.role !== "children" || !value?.[key] || typeof value[key] !== "object") continue;
    const childPath = [...path, key];
    if (Array.isArray(value[key])) {
      renderCollection(parent, value[key], childPath, { ...propertyUi, heading: false }, context);
    } else {
      const childSchema = context.schemaForPath(childPath) || {};
      const hasChildren = Object.entries(childSchema.properties || {}).some(([nestedKey, nestedSchema]) =>
        legacyFieldUiView(context.resolveSchema(nestedSchema) || {})?.["x-fullmeta-ui-tree"]?.role === "children"
          && value[key][nestedKey] && typeof value[key][nestedKey] === "object");
      const section = hasChildren ? appendSection(parent, "", childPath, { heading: false }) : parent;
      const label = value[key].name || value[key].title || propertyNode.title || key;
      const item = context.addItem(section, label, childPath, value[key].enabled !== false || propertyUi.selectDisabledItems === true);
      if (hasChildren) {
        item.classList.add("tree-owner-item");
        deferSectionContents(section, () => renderSchemaChildren(section, value[key], childPath, descriptor, context));
      }
    }
  }
}

function dynamicObjectEntries(value, path, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const schema = context.resolveSchema(context.schemaForPath(path) || {}) || {};
  const declared = new Set(Object.keys(schema.properties || {}));
  return Object.entries(value).filter(([key]) => !declared.has(key));
}

function hasRenderedDescriptorChild(value, descriptor) {
  const childValue = valueAt(value, descriptor.path || []);
  if (["optionalItem", "objectRoot", "componentRoot"].includes(descriptor.role)) return Boolean(childValue);
  if (["collection", "rootItems", "children", "componentCollections"].includes(descriptor.role)) {
    return Array.isArray(childValue) && childValue.length > 0;
  }
  if (descriptor.role === "objectEntries") return childValue !== null
    && typeof childValue === "object" && !Array.isArray(childValue);
  if (descriptor.role === "transparent") {
    return (descriptor.children || []).some(child => hasRenderedDescriptorChild(childValue, child));
  }
  if (descriptor.role === "objectProperties") return childValue !== null && typeof childValue === "object" && Object.keys(childValue).length > 0;
  if (descriptor.role === "schemaDeclarations") return Array.isArray(descriptor.projection) && descriptor.projection.length > 0;
  return true;
}

function renderCollectionEntries(section, entries, path, descriptor, context) {
  entries.forEach((value, index) => {
    const itemPath = [...path, index];
    const itemSchema = context.schemaForPath(itemPath) || {};
    const childProperties = Object.entries(itemSchema.properties || {}).filter(([key, propertyNode]) =>
      legacyFieldUiView(context.resolveSchema(propertyNode) || {})?.["x-fullmeta-ui-tree"]?.role === "children"
        && value?.[key] && typeof value[key] === "object");
    const childUi = childProperties.length
      ? legacyFieldUiView(context.resolveSchema(childProperties[0][1]) || {})?.["x-fullmeta-ui-tree"] : null;
    const hasDescriptorChildren = (descriptor.children || []).some(child => hasRenderedDescriptorChild(value, child));
    const itemParent = childProperties.length || hasDescriptorChildren
      ? appendSection(section, "", itemPath, {
        heading: false,
        sectionClass: `${childUi?.sectionClass || "tree-recursive-group"}${hasDescriptorChildren ? " tree-descriptor-children-group" : ""}`,
      })
      : section;
    if (hasDescriptorChildren) itemParent.dataset.treeDefaultExpanded = "true";
    const item = appendItem(itemParent, value, entries, itemPath, descriptor, context);
    if (itemParent !== section) item.classList.add("tree-owner-item");
    renderSchemaChildren(itemParent, value, itemPath, descriptor, context);
    for (const childDescriptor of descriptor.children || []) {
      renderNode(itemParent, value, itemPath, childDescriptor, context);
    }
  });
}

function renderCollection(parent, values, path, descriptor, context) {
  // A schema-declared `children` collection belongs inside its owning tree
  // item. Keep it inside that item's deferred section instead of inventing a
  // second heading that would make the first child look like the collection.
  const ownsSection = descriptor.role !== "children" && !(descriptor.heading === false && !descriptor.sectionClass);
  const section = ownsSection
    ? appendSection(parent, `${context.ownerPrefix || ""}${treeTitle(descriptor, path, context)}`, path, descriptor)
    : parent;
  const entries = Array.isArray(values) ? values : [];
  const renderEntries = () => renderCollectionEntries(section, entries, path, descriptor, context);
  if (ownsSection) deferSectionContents(section, renderEntries);
  else renderEntries();
  return section;
}

/** Walk JSON object keys while keeping each visible node at its source path. */
function renderObjectProperties(parent, value, path, descriptor, context) {
  const maxDepth = Number.isInteger(descriptor.maxDepth) && descriptor.maxDepth >= 0
    ? descriptor.maxDepth : 3;
  const annotatedOnly = descriptor.schemaAnnotatedOnly === true;
  const annotationPrefix = descriptor.annotationPrefix || "x-fullmeta-ui-";
  const includeArrays = descriptor.includeArrays !== false;
  const annotationCache = new WeakMap();

  function hasAnnotation(node) {
    if (!node || typeof node !== "object") return false;
    if (annotationCache.has(node)) return annotationCache.get(node);
    // Set a provisional result before descent, so this also remains safe for
    // programmatically supplied documents with shared or cyclic objects.
    annotationCache.set(node, false);
    const entries = Array.isArray(node) ? node.entries() : Object.entries(node);
    for (const [key, child] of entries) {
      if (String(key).startsWith(annotationPrefix) || hasAnnotation(child)) {
        annotationCache.set(node, true);
        return true;
      }
    }
    return false;
  }

  function childrenOf(node) {
    if (Array.isArray(node)) return includeArrays ? [...node.entries()] : [];
    if (node && typeof node === "object") return Object.entries(node);
    return [];
  }

  function itemLabel(key, child) {
    if (descriptor.labelProperty && typeof child?.[descriptor.labelProperty] === "string") {
      return child[descriptor.labelProperty];
    }
    if (typeof child?.title === "string" && child.title) return child.title;
    if (Number.isInteger(key)) {
      const reference = typeof child?.$ref === "string" ? child.$ref.split("/").at(-1) : null;
      return reference ? labelCase(reference) : `Item ${key + 1}`;
    }
    return descriptor.humanizeKeys === false ? String(key) : labelCase(key);
  }

  function visit(container, node, nodePath, depth) {
    if (depth >= maxDepth) return;
    for (const [key, child] of childrenOf(node)) {
      if (annotatedOnly && !hasAnnotation(child)) continue;
      const childPath = [...nodePath, key];
      const hasChildren = depth + 1 < maxDepth && childrenOf(child)
        .some(([, grandchild]) => !annotatedOnly || hasAnnotation(grandchild));
      const section = hasChildren
        ? appendSection(container, "", childPath, { heading: false, sectionClass: descriptor.sectionClass })
        : container;
      const item = context.addItem(section, itemLabel(key, child), childPath, child?.enabled !== false || descriptor.selectDisabledItems === true);
      if (hasChildren) item.classList.add("tree-owner-item");
      if (descriptor.itemClass) item.classList.add(descriptor.itemClass);
      if (hasChildren) deferSectionContents(section, () => visit(section, child, childPath, depth + 1));
    }
  }

  if (descriptor.title) {
    const section = appendSection(parent, descriptor.title, path, descriptor);
    deferSectionContents(section, () => visit(section, value, path, 0));
    return;
  }
  visit(parent, value, path, 0);
}

/** Render declarations from the open schema document. */
function renderSchemaDeclarations(parent, projection, context) {
  function add(node, container, ancestors, location) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const section = hasChildren
      ? appendSection(container, '', node.path || [], { heading: false }) : container;
    const entry = { ...node };
    delete entry.children;
    const trail = [...ancestors, { ...entry, treeLocation: location }];
    const selectedNode = { ...node, treeLocation: location, treeTrail: trail };
    if (node.readOnly || !Array.isArray(node.path)) {
      const label = document.createElement('div');
      label.className = `tree-item tree-projection-readonly${hasChildren ? ' tree-owner-item' : ''}`;
      label.textContent = node.label;
      label.title = `${[node.sourceFile, node.sourcePointer].filter(Boolean).join('')} · unavailable source`;
      label.style.cursor = 'default';
      label.setAttribute('aria-disabled', 'true');
      label.setAttribute('aria-label', `${node.label} (read only)`);
      section.append(label);
    } else {
      const item = context.addItem(section, node.label, node.path, true, selectedNode);
      if (hasChildren) item.classList.add('tree-owner-item');
    }
    if (hasChildren) deferSectionContents(section, () => node.children.forEach((child, index) =>
      add(child, section, trail, [...location, index])));
  }
  for (const [index, node] of (projection || []).entries()) add(node, parent, [], [index]);
}

function renderNode(parent, baseValue, basePath, descriptor, context) {
  const path = [...basePath, ...(descriptor.path || [])];
  const value = valueAt(baseValue, descriptor.path || []);
  const absolutePath = [...basePath, ...(descriptor.path || [])];
  const role = descriptor.role;

  if (!role && Array.isArray(descriptor.children)) {
    const section = appendSection(parent, treeTitle(descriptor, absolutePath, context), absolutePath, descriptor);
    deferSectionContents(section, () => {
      for (const child of descriptor.children) renderNode(section, value, absolutePath, child, context);
    });
    return section;
  }

  if (role === "collectionLink") {
    const values = Array.isArray(value) ? value : [];
    const title = treeTitle(descriptor, absolutePath, context);
    return context.addCollectionLink(parent, `${title} (${values.length})`, descriptor.collection || descriptor.path?.at(-1), absolutePath);
  }

  if (role === "componentCollections") {
    const components = Array.isArray(value) ? value : [];
    components.forEach((component, index) => {
      const componentPath = [...absolutePath, index];
      const priorPrefix = context.ownerPrefix;
      context.ownerPrefix = descriptor.ownerNameProperty && components.length > 1
        ? `${component?.[descriptor.ownerNameProperty] || "Component"} · ` : "";
      for (const child of descriptor.children || []) renderNode(parent, component, componentPath, child, context);
      context.ownerPrefix = priorPrefix;
    });
    return null;
  }

  if (role === "objectRoot") {
    if (!value || typeof value !== "object") return null;
    const schema = context.resolveSchema(context.schemaForPath(absolutePath) || {}) || {};
    const hasSchemaChildren = Object.entries(schema.properties || {}).some(([key, propertyNode]) => {
      const propertyUi = legacyFieldUiView(context.resolveSchema(propertyNode) || {})?.["x-fullmeta-ui-tree"];
      return propertyUi?.role === "children" && value[key] && typeof value[key] === "object";
    });
    const hasDescriptorChildren = (descriptor.children || []).some(child => hasRenderedDescriptorChild(value, child));
    if (!hasSchemaChildren && !hasDescriptorChildren) {
      const item = context.addItem(parent, `${context.ownerPrefix || ""}${treeTitle(descriptor, absolutePath, context) || value.name || value.id}`, absolutePath, value.enabled !== false || descriptor.selectDisabledItems === true);
      if (descriptor.itemClass) item.classList.add(descriptor.itemClass);
      return item;
    }
    const section = appendSection(parent, "", absolutePath, { ...descriptor, heading: false });
    const item = context.addItem(section, `${context.ownerPrefix || ""}${treeTitle(descriptor, absolutePath, context) || value.name || value.id}`, absolutePath, value.enabled !== false || descriptor.selectDisabledItems === true);
    item.classList.add("tree-owner-item");
    if (descriptor.itemClass) item.classList.add(descriptor.itemClass);
    deferSectionContents(section, () => {
      renderSchemaChildren(section, value, absolutePath, descriptor, context);
      for (const child of descriptor.children || []) renderNode(section, value, absolutePath, child, context);
    });
    return section;
  }

  if (role === "objectEntries") {
    const entries = dynamicObjectEntries(value, absolutePath, context);
    const siblings = entries.map(([, entry]) => entry);
    for (const [key, entry] of entries) {
      const itemPath = [...absolutePath, key];
      const hasChildren = (descriptor.children || []).some(child => hasRenderedDescriptorChild(entry, child));
      const itemParent = hasChildren
        ? appendSection(parent, "", itemPath, { heading: false, sectionClass: descriptor.sectionClass })
        : parent;
      const item = appendItem(itemParent, entry, siblings, itemPath, descriptor, context);
      if (hasChildren) item.classList.add("tree-owner-item");
      renderSchemaChildren(itemParent, entry, itemPath, descriptor, context);
      if (hasChildren) for (const child of descriptor.children || []) {
        renderNode(itemParent, entry, itemPath, child, context);
      }
    }
    return null;
  }

  if (role === "rootItems") {
    const entries = Array.isArray(value) ? value : [];
    entries.forEach((entry, index) => {
      const itemPath = [...absolutePath, index];
      const section = appendSection(parent, "", itemPath, { ...descriptor, heading: false });
      const itemLabel = descriptor.title || entry?.[descriptor.itemLabelProperty || "name"] || entry?.id || context.labelFor(entry, entries);
      const item = context.addItem(section, `${context.ownerPrefix || ""}${itemLabel}`, itemPath, entry?.enabled !== false || descriptor.selectDisabledItems === true);
      item.classList.add("tree-owner-item");
      if (descriptor.itemClass) item.classList.add(descriptor.itemClass);
      if (entry?.enabled === false && descriptor.disabledClass) item.classList.add(descriptor.disabledClass);
      deferSectionContents(section, () => {
        for (const child of descriptor.children || []) renderNode(section, entry, itemPath, child, context);
      });
    });
    return null;
  }

  if (role === "componentRoot") {
    const item = appendItem(parent, value, [], absolutePath, descriptor, context);
    for (const child of descriptor.children || []) renderNode(parent, value, absolutePath, child, context);
    return item;
  }

  if (role === "optionalItem") {
    if (!value) return null;
    const item = appendItem(parent, value, [value], absolutePath, descriptor, context);
    if (descriptor.itemClass) item.classList.add(descriptor.itemClass);
    return item;
  }

  if (role === "collection") return renderCollection(parent, value, absolutePath, descriptor, context);

  if (role === "objectProperties") {
    renderObjectProperties(parent, value, absolutePath, descriptor, context);
    return null;
  }

  if (role === "schemaDeclarations") {
    renderSchemaDeclarations(parent, descriptor.projection, context);
    return null;
  }

  if (role === "transparent") {
    for (const child of descriptor.children || []) renderNode(parent, value, absolutePath, child, context);
    return null;
  }

  return null;
}

export function renderSchemaTree(root, model, descriptor, context) {
  root.replaceChildren();
  if (!model || !descriptor) return;
  for (const child of descriptor.children || []) renderNode(root, model, [], child, context);
}

/** Configure collapsible sections and populate each branch only when opened. */
export function configureTreeSections(root, {
  projectId = "model",
  collapsedByDefault = true,
  collapsedHandle = "▸",
  expandedHandle = "▾",
  state = new Map(),
  schemaForPath = () => null,
  iconForSection = () => null,
  appendSectionIcon = () => {},
  onPopulate = () => {},
} = {}) {
  const findDirectNestedSections = (section) => Array.from(section.querySelectorAll(".tree-group"))
    .filter((nested) => nested.parentElement.closest(".tree-group") === section);
  const configureNestedSections = (section, visited) => {
    for (const nested of findDirectNestedSections(section)) configureSection(nested, visited);
  };
  const configureSection = (section, visited) => {
    if (visited.has(section)) return;
    visited.add(section);
    let heading = section.querySelector(":scope > .tree-label");
    let rootItem = null;
    if (!heading) {
      rootItem = section.querySelector(":scope > .tree-item[data-model-path], :scope > .tree-projection-readonly");
      if (!rootItem) return;
      heading = document.createElement("div");
      heading.className = "tree-label";
      section.insertBefore(heading, rootItem);
      heading.append(rootItem);
    }
    if (section.dataset.treeConfigured !== "true") {
      heading.classList.add("tree-section-heading");
      const sectionTitle = rootItem?.querySelector(".tree-item-text")?.textContent.trim() || heading.textContent.trim();
      if (!rootItem) {
        const label = document.createElement("span");
        label.className = "tree-section-title";
        label.textContent = sectionTitle;
        heading.replaceChildren(label);
      }
      const sectionIdentity = heading.dataset.treeSectionKey || `${heading.dataset.arrayPath || rootItem?.dataset.modelPath || sectionTitle}|${heading.dataset.contextLabel || (!rootItem ? sectionTitle : "")}`;
      const sectionKey = `${projectId}:${sectionIdentity}`;
      const collapsed = state.get(sectionKey) ?? (section.dataset.treeDefaultExpanded === "true" ? false : collapsedByDefault);
      const toggle = createTreeToggle({ expanded: !collapsed, label: sectionTitle, className: "tree-section-toggle", collapsedHandle, expandedHandle, handleClassPrefix: "tree-section-handle" });
      const setCollapsed = (next) => {
        state.set(sectionKey, next);
        section.classList.toggle("tree-group-collapsed", next);
        setTreeToggleState(toggle, { expanded: !next, label: sectionTitle });
      };
      section.classList.toggle("tree-group-collapsed", collapsed);
      heading.prepend(toggle);
      if (!rootItem?.classList.contains('tree-projection-readonly')) {
        appendSectionIcon(heading, iconForSection(heading, rootItem, schemaForPath));
      }
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const expand = section.classList.contains("tree-group-collapsed");
        setCollapsed(!expand);
        if (expand) {
          populateTreeSection(section);
          configureNestedSections(section, new WeakSet());
          onPopulate(root);
        }
      });
      heading.addEventListener("click", (event) => {
        if (event.target.closest(".tree-section-toggle,.tree-item")) return;
        toggle.click();
      });
      section.dataset.treeConfigured = "true";
    }

    if (!section.classList.contains("tree-group-collapsed")) {
      populateTreeSection(section);
      configureNestedSections(section, visited);
    }
  };

  const visited = new WeakSet();
  for (const section of root.querySelectorAll(".tree-group")) configureSection(section, visited);
  onPopulate(root);
}

export { labelCase };

