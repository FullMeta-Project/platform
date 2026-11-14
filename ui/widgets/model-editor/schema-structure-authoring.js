/** Pure JSON tree edits used only by the schema document source form. */

import { schemaWithProjectIntegration } from "./schema-project-integration-authoring.js";

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

/** Identify JSON Schema declaration nodes without treating annotation data as schemas. */
export function schemaDeclarationScope(path) {
  if (!Array.isArray(path)) return "";
  if (!path.length) return "schema";
  const last = path.at(-1), parent = path.at(-2);
  if (last === "$defs") return "definitions";
  if (["$defs", "properties", "patternProperties", "dependentSchemas"].includes(parent)) return "schema";
  if (["items", "additionalProperties", "not", "if", "then", "else", "contains", "propertyNames"].includes(last)) return "schema";
  if (Number.isInteger(last) && ["allOf", "anyOf", "oneOf", "prefixItems"].includes(parent)) return "schema";
  return "";
}

function initialValue(kind) {
  switch (kind) {
    case "object": return {};
    case "array": return [];
    case "string": return "";
    case "number": return 0;
    case "boolean": return false;
    case "null": return null;
    default: throw new Error("Choose an initial value type.");
  }
}

function memberAt(value, path) {
  let current = value;
  for (const part of path) {
    if ((Array.isArray(current) || isObject(current)) && Object.hasOwn(current, part)) current = current[part];
    else throw new Error("The selected JSON path no longer exists.");
  }
  return current;
}

function propertyName(name) {
  if (typeof name !== "string" || !name.trim()) throw new Error("Enter a property name.");
  return name;
}

function authoringKey(value, label = "Machine key") {
  if (typeof value !== "string" || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${label} must start with a letter or underscore and contain only letters, numbers, underscores, or hyphens.`);
  }
  if (["__proto__", "constructor", "prototype"].includes(value)) {
    throw new Error(`${label} ${value} is reserved.`);
  }
  return value;
}

function authoringTitle(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Enter a readable title.");
  return value.trim();
}

function schemaObjectWithIdentity(title, identityFields) {
  const declaration = { type: "object", title, properties: {} };
  for (const field of identityFields) {
    declaration.properties[field] = { type: "string", title: field === "id" ? "ID" : "Name", readOnly: true };
  }
  if (identityFields.length) declaration.required = [...identityFields];
  return declaration;
}

function equalPath(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length
    && left.every((part, index) => part === right[index]);
}

function treeDescriptorOwner(document, binding) {
  const root = document["x-fullmeta-ui-tree"];
  if (!isObject(root)) return null;
  if (!Array.isArray(binding) || !binding.length) {
    const rootGroupIndex = (root.children || []).findIndex(entry => isObject(entry)
      && Array.isArray(entry.path) && entry.path.length === 0 && !entry.role
      && Array.isArray(entry.children));
    return rootGroupIndex >= 0
      ? { descriptor: root.children[rootGroupIndex], entries: root.children[rootGroupIndex].children,
        entriesPath: ["x-fullmeta-ui-tree", "children", rootGroupIndex, "children"] }
      : { descriptor: root, entries: root.children, entriesPath: ["x-fullmeta-ui-tree", "children"] };
  }
  let found = null;
  const visit = (entries, prefix = [], entriesPath = ["x-fullmeta-ui-tree", "children"]) => {
    if (!Array.isArray(entries) || found) return;
    for (const [index, entry] of entries.entries()) {
      if (!isObject(entry)) continue;
      const current = [...prefix, ...(Array.isArray(entry.path) ? entry.path : [])];
      if (equalPath(current, binding)) {
        found = { descriptor: entry, entries: entry.children,
          entriesPath: [...entriesPath, index, "children"] };
        return;
      }
      visit(entry.children, current, [...entriesPath, index, "children"]);
      if (found) return;
    }
  };
  visit(root.children);
  return found;
}

const collectionTreeRoles = new Set(["collection", "collectionLink", "rootItems", "componentCollections"]);

function treeCollectionDescriptorLocation(document, schemaPath, binding = []) {
  const tree = document?.["x-fullmeta-ui-tree"];
  if (!isObject(tree) || !Array.isArray(tree.children)) return null;
  const matches = (descriptor, descriptorPath, currentBinding) => {
    if (!isObject(descriptor) || !collectionTreeRoles.has(descriptor.role)) return null;
    return { descriptor, descriptorPath: [...descriptorPath], binding: [...currentBinding] };
  };
  const visit = (entries, prefix = [], entriesPath = ["x-fullmeta-ui-tree", "children"], predicate = null) => {
    if (!Array.isArray(entries)) return null;
    for (const [index, entry] of entries.entries()) {
      if (!isObject(entry)) continue;
      const currentBinding = [...prefix, ...(Array.isArray(entry.path) ? entry.path : [])];
      const descriptorPath = [...entriesPath, index];
      if (predicate(entry, currentBinding)) {
        const found = matches(entry, descriptorPath, currentBinding);
        if (found) return found;
      }
      const nested = visit(entry.children, currentBinding, [...descriptorPath, "children"], predicate);
      if (nested) return nested;
    }
    return null;
  };

  if (Array.isArray(binding) && binding.length && !binding.includes("*")) {
    const exact = visit(tree.children, [], ["x-fullmeta-ui-tree", "children"], (_entry, current) => equalPath(current, binding));
    if (exact) return exact;
  }

  const ownedBinding = document[GENERATED_FIELDS_KEY]?.fields?.find(entry =>
    equalPath(entry?.owner?.path, schemaPath)
      && entry?.owner?.input === "standard project-tree binding");
  if (ownedBinding) {
    const descriptor = pathAt(document, ownedBinding.path);
    const found = matches(descriptor, ownedBinding.path, descriptor?.path || []);
    if (found) return found;
  }

  return visit(tree.children, [], ["x-fullmeta-ui-tree", "children"], (_entry, current) => {
    if (current.includes("*")) return false;
    try { return equalPath(schemaAtPropertyPath(document, current), schemaPath); }
    catch { return false; }
  });
}

function collectionPresentationValues({ showHeading = true, itemClass = "" } = {}) {
  if (typeof showHeading !== "boolean") throw new Error("Choose whether to show the collection heading.");
  const normalizedClass = typeof itemClass === "string" ? itemClass.trim() : "";
  if (normalizedClass && !/^[A-Za-z_][A-Za-z0-9_-]*(?:\s+[A-Za-z_][A-Za-z0-9_-]*)*$/.test(normalizedClass)) {
    throw new Error("Item class must contain one or more CSS class names separated by spaces.");
  }
  return { showHeading, itemClass: normalizedClass };
}

function appendTreeBinding(document, binding, key, role, title, groupPath = null, presentation = null) {
  const presentationFields = presentation ? collectionPresentationValues(presentation) : null;
  const entry = { path: [key], role, ...(title ? { title } : {}) };
  if (presentationFields?.showHeading === false) entry.heading = false;
  if (presentationFields?.itemClass) entry.itemClass = presentationFields.itemClass;
  const tree = document["x-fullmeta-ui-tree"] ||= { children: [] };
  if (!Array.isArray(tree.children)) throw new Error("The schema tree children must be a list.");
  if (Array.isArray(groupPath)) {
    const group = memberAt(document, groupPath);
    if (!isObject(group) || group.role || !Array.isArray(group.path)) {
      throw new Error("The selected display group is no longer available.");
    }
    const children = group.children ||= [];
    if (!Array.isArray(children)) throw new Error("The selected display group's children must be a list.");
    children.push(entry);
    return [...groupPath, "children", children.length - 1];
  }
  const parentBinding = binding.at(-1) === "*" ? binding.slice(0, -1) : binding;
  let owner = treeDescriptorOwner(document, parentBinding);
  if (!owner) {
    const descriptor = { path: [...parentBinding], role: "objectRoot" };
    tree.children.push(descriptor);
    owner = { descriptor, entries: descriptor.children,
      entriesPath: ["x-fullmeta-ui-tree", "children", tree.children.length - 1, "children"] };
  }
  const entries = owner.entries || (owner.descriptor.children = []);
  if (!Array.isArray(entries)) throw new Error("The selected tree group children must be a list.");
  entries.push(entry);
  return [...owner.entriesPath, entries.length - 1];
}

function collectionActionBinding(document, ownerPath, binding) {
  if (memberAt(document, ownerPath)?.type !== "array") {
    throw new Error("An item action must belong to an array collection.");
  }
  // A projected item has a trailing * in its tree binding. Insertion menus
  // belong to the containing array, even when authoring starts on that item.
  const requested = Array.isArray(binding) ? [...binding] : [];
  if (requested.at(-1) === "*") requested.pop();
  const path = requested.length
    ? requested : treeCollectionDescriptorLocation(document, ownerPath, binding)?.binding;
  if (!Array.isArray(path) || !path.length || path.at(-1) === "*") {
    throw new Error("Bind the array collection in the project tree before adding its item action.");
  }
  return [...path];
}

function appendCollectionItemAction(document, binding, title, token, ownerPath, variantSelector = token) {
  const tree = document["x-fullmeta-ui-tree"] ||= { children: [] };
  if (!isObject(tree)) throw new Error("The project tree declaration must be an object.");
  const collectionBinding = collectionActionBinding(document, ownerPath, binding);
  const action = `add-${token}`;
  const actionMenus = tree.actionMenus ||= [];
  const insertions = tree.insertions ||= [];
  if (!Array.isArray(actionMenus) || !Array.isArray(insertions)) {
    throw new Error("Project tree actionMenus and insertions must be lists.");
  }
  if (actionMenus.some(menu => menu?.entries?.some(entry => entry?.action === action))
    || insertions.some(entry => entry?.action === action)) {
    throw new Error(`Tree action ${action} is already declared.`);
  }
  let menuIndex = actionMenus.findIndex(menu => menu?.when?.scope === "collection"
    && equalPath(menu.when.path, collectionBinding));
  if (menuIndex < 0) {
    actionMenus.push({ when: { scope: "collection", path: [...collectionBinding] }, entries: [] });
    menuIndex = actionMenus.length - 1;
  }
  const menu = actionMenus[menuIndex];
  if (!Array.isArray(menu.entries)) throw new Error("The selected collection menu entries must be a list.");
  menu.entries.push({ label: `Add ${title}`, action });
  insertions.push({ action, when: { scope: "collection", path: [...collectionBinding] },
    destination: { kind: "array", from: "arrayPath" }, factory: "schemaItemTemplate", variant: variantSelector });
  const actionPath = ["x-fullmeta-ui-tree", "actionMenus", menuIndex, "entries", menu.entries.length - 1];
  const insertionPath = ["x-fullmeta-ui-tree", "insertions", insertions.length - 1];
  recordGeneratedField(document, actionPath, ownerPath, `item kind ${token}`);
  recordGeneratedField(document, insertionPath, ownerPath, `item kind ${token}`);
}

const GENERATED_FIELDS_KEY = "x-fullmeta-ui-generated";

const hiddenFieldBehavior = () => ({
  format: "fullmeta-ui-behavior/1",
  target: { kind: "field" },
  context: "projectEditing",
  payload: { presentation: { hidden: true } },
});

function schemaFieldsFromAuthoringRows(fields, existingProperties = {}, rowLabel = "Settings field") {
  if (!Array.isArray(fields)) throw new Error("The field table must contain a list of rows.");
  const properties = {}, required = [], keys = new Set();
  for (const [index, entry] of fields.entries()) {
    if (!isObject(entry)) throw new Error(`${rowLabel} row ${index + 1} is invalid.`);
    const property = authoringKey(entry.key, `Field key in row ${index + 1}`);
    const fieldTitle = typeof entry.title === "string" && entry.title.trim() ? authoringTitle(entry.title) : "";
    const fieldShape = entry.shape;
    const supportedShapes = ["object", "array", "string", "number", "integer", "boolean", "null",
      "reference", "array-reference", "array-number"];
    if (!supportedShapes.includes(fieldShape)) {
      throw new Error(`Choose a supported value shape for row ${index + 1}.`);
    }
    const supportedWidgets = ["valueControl", "referenceSelector", "quantity", "quantityVector", "tree"];
    if (entry.widget !== undefined && entry.widget !== "" && !supportedWidgets.includes(entry.widget)) {
      throw new Error(`Choose a supported editor widget for row ${index + 1}.`);
    }
    if (entry.itemWidget !== undefined && entry.itemWidget !== ""
      && !["valueControl", "quantity"].includes(entry.itemWidget)) {
      throw new Error(`Choose a supported array item widget for row ${index + 1}.`);
    }
    if (keys.has(property) || Object.hasOwn(existingProperties, property)) {
      throw new Error(`Property ${property} is already declared or repeated in the table.`);
    }
    keys.add(property);
    const refKey = entry.referenceKey ? authoringKey(entry.referenceKey, `Reference key in row ${index + 1}`) : "";
    if (["reference", "array-reference"].includes(fieldShape) && !refKey) {
      throw new Error(`Enter a reusable definition key for row ${index + 1}.`);
    }
    if (!["reference", "array-reference"].includes(fieldShape) && refKey) {
      throw new Error(`A reusable definition key is only used for reference shapes (row ${index + 1}).`);
    }
    const arrayShape = fieldShape.startsWith("array-") || fieldShape === "array";
    const typeShape = fieldShape === "array-reference" || fieldShape === "array-number" ? "array"
      : fieldShape === "reference" ? "reference" : fieldShape;
    const field = typeShape === "reference"
      ? { $ref: `#/$defs/${refKey}` }
      : { type: typeShape };
    if (fieldTitle) field.title = fieldTitle;
    if (fieldShape === "array-reference") field.items = { $ref: `#/$defs/${refKey}` };
    if (fieldShape === "array-number") field.items = { type: "number" };
    const itemCount = entry.itemCount === undefined || entry.itemCount === "" ? undefined
      : Number(entry.itemCount);
    if (itemCount !== undefined) {
      if (!arrayShape || !Number.isInteger(itemCount) || itemCount < 0) {
        throw new Error(`Item count in row ${index + 1} must be a non-negative integer on an array field.`);
      }
      field.minItems = itemCount;
      field.maxItems = itemCount;
    }
    const choices = String(entry.choices || "").trim();
    if (choices) {
      if (!(["string", "number", "integer", "boolean", "null"].includes(typeShape))) {
        throw new Error(`Choices in row ${index + 1} require a scalar field shape.`);
      }
      field.enum = enumValues(typeShape, choices);
    }
    const componentLabels = String(entry.componentLabels || "").split(",").map(label => label.trim()).filter(Boolean);
    if (entry.widget === "quantityVector" && componentLabels.length) {
      if (!arrayShape) throw new Error(`Quantity-vector labels in row ${index + 1} require an array field.`);
      if (itemCount !== undefined && itemCount !== componentLabels.length) {
        throw new Error(`Quantity-vector labels in row ${index + 1} must match its fixed item count.`);
      }
    }
    if (entry.defaultValue !== undefined && entry.fixedValue !== undefined) {
      throw new Error(`Choose a default or fixed value in row ${index + 1}, not both.`);
    }
    for (const [input, keyword] of [[entry.defaultValue, "default"], [entry.fixedValue, "const"]]) {
      if (input === undefined) continue;
      const compatibleValue = typeShape === "integer" ? Number.isInteger(input)
        : typeShape === "number" ? typeof input === "number" && Number.isFinite(input)
        : typeShape === "array" ? Array.isArray(input)
        : typeShape === "object" ? isObject(input)
        : typeShape === "null" ? input === null
        : typeof input === typeShape;
      if ((typeShape === "reference" && keyword === "const")
        || (typeShape !== "reference" && !compatibleValue)) {
        throw new Error(`The ${keyword === "const" ? "fixed value" : "default"} in row ${index + 1} must match the selected ${fieldShape} shape.`);
      }
      field[keyword] = structuredClone(input);
    }
    const itemBehavior = entry.itemWidget ? {
      format: "fullmeta-ui-behavior/1", target: { kind: "field" }, context: "projectEditing",
      payload: { widget: { type: entry.itemWidget, settings: {} } },
    } : null;
    if (itemBehavior && isObject(field.items)) field.items["x-fullmeta-ui-behavior"] = itemBehavior;
    if (entry.hidden === true || supportedWidgets.includes(entry.widget)) {
      const behavior = { format: "fullmeta-ui-behavior/1", target: { kind: "field" },
        context: "projectEditing", payload: {} };
      if (entry.hidden === true) behavior.payload.presentation = { hidden: true };
      if (entry.widget) {
        const settings = entry.widget === "quantityVector" && componentLabels.length
          ? { componentLabels }
          : entry.widget === "tree" ? { role: "children", sectionClass: "union-geometry-group" } : {};
        behavior.payload.widget = { type: entry.widget, settings };
      }
      field["x-fullmeta-ui-behavior"] = behavior;
    }
    properties[property] = field;
    if (entry.required === true) required.push(property);
  }
  return { properties, required };
}

function recordGeneratedField(document, path, ownerPath, input) {
  const registry = document[GENERATED_FIELDS_KEY] ||= {
    schema: "fullmeta-ui-generated/1",
    fields: [],
  };
  if (!isObject(registry) || registry.schema !== "fullmeta-ui-generated/1"
    || !Array.isArray(registry.fields)) {
    throw new Error(`${GENERATED_FIELDS_KEY} must use the fullmeta-ui-generated/1 format.`);
  }
  if (registry.fields.some(entry => equalPath(entry.path, path))) {
    throw new Error(`The generated path ${JSON.stringify(path)} already has an owner.`);
  }
  registry.fields.push({ path: [...path], owner: { path: [...ownerPath], input } });
}

function pathAt(document, path) {
  try { return memberAt(document, path); }
  catch { return undefined; }
}

/** Correct legacy item actions authored from an item projection rather than its array. */
function repairGeneratedCollectionActions(document, ownerPath, binding) {
  const collectionBinding = collectionActionBinding(document, ownerPath, binding);
  const itemBinding = [...collectionBinding, "*"];
  const tree = document["x-fullmeta-ui-tree"];
  const registry = document[GENERATED_FIELDS_KEY];
  if (!isObject(tree) || !Array.isArray(tree.actionMenus)
    || !Array.isArray(tree.insertions) || !Array.isArray(registry?.fields)) {
    throw new Error("This collection has no generated tree actions to repair.");
  }
  const owned = registry.fields.filter(entry => equalPath(entry?.owner?.path, ownerPath)
    && entry.owner.input?.startsWith("item kind ")
    && entry.path?.length === 3 && entry.path[0] === "x-fullmeta-ui-tree"
    && entry.path[1] === "insertions" && Number.isInteger(entry.path[2]));
  const actions = new Set(owned.map(entry => tree.insertions[entry.path[2]]?.action).filter(Boolean));
  const incorrect = owned.map(entry => tree.insertions[entry.path[2]])
    .filter(entry => entry?.factory === "schemaItemTemplate"
      && entry.when?.scope === "collection" && equalPath(entry.when.path, itemBinding));
  if (!incorrect.length) throw new Error("This collection has no generated item actions with an item path to repair.");
  for (const insertion of incorrect) insertion.when.path = [...collectionBinding];

  const menus = tree.actionMenus;
  const candidates = menus.flatMap((menu, index) =>
    menu?.when?.scope === "collection"
      && (equalPath(menu.when.path, collectionBinding) || equalPath(menu.when.path, itemBinding))
      && menu.entries?.some(entry => actions.has(entry?.action)) ? [index] : []);
  if (!candidates.length) throw new Error("The generated item actions have no collection menu to repair.");
  for (const index of candidates) {
    const menu = menus[index];
    if (!Array.isArray(menu.entries) || Object.keys(menu).some(key => !["when", "entries"].includes(key))) {
      throw new Error("A collection menu has custom settings; repair its item actions in that menu.");
    }
  }
  const selected = new Set(candidates), first = candidates[0], menuIndices = new Map(), entryIndices = new Map();
  const merged = { ...menus[first], when: { ...menus[first].when, path: [...collectionBinding] }, entries: [] };
  const nextMenus = [];
  for (let index = 0; index < menus.length; index++) {
    if (index === first) {
      menuIndices.set(index, nextMenus.length);
      nextMenus.push(merged);
      for (const sourceIndex of candidates) {
        menus[sourceIndex].entries.forEach((entry, entryIndex) => {
          entryIndices.set(`${sourceIndex}/${entryIndex}`, merged.entries.length);
          merged.entries.push(entry);
        });
      }
    } else if (!selected.has(index)) {
      menuIndices.set(index, nextMenus.length);
      nextMenus.push(menus[index]);
    }
  }
  for (const entry of registry.fields) {
    const path = entry.path;
    if (path?.[0] !== "x-fullmeta-ui-tree" || path[1] !== "actionMenus"
      || !Number.isInteger(path[2])) continue;
    const oldIndex = path[2];
    if (selected.has(oldIndex)) {
      if (path[3] !== "entries" || !Number.isInteger(path[4])) {
        throw new Error("A generated collection menu has a separate owner; its actions cannot be merged automatically.");
      }
      path[2] = menuIndices.get(first);
      path[4] = entryIndices.get(`${oldIndex}/${path[4]}`);
    } else {
      path[2] = menuIndices.get(oldIndex);
    }
  }
  tree.actionMenus = nextMenus;
  return incorrect.length;
}

function generatedFieldsIssue(document) {
  const registry = document?.[GENERATED_FIELDS_KEY];
  if (registry === undefined) return "";
  if (!isObject(registry) || registry.schema !== "fullmeta-ui-generated/1"
    || !Array.isArray(registry.fields)) return `${GENERATED_FIELDS_KEY} must use the fullmeta-ui-generated/1 format.`;
  const seen = new Set();
  for (const entry of registry.fields) {
    if (!isObject(entry) || !Array.isArray(entry.path) || !entry.path.length
      || entry.path.some(part => !["string", "number"].includes(typeof part))
      || !isObject(entry.owner) || !Array.isArray(entry.owner.path)
      || typeof entry.owner.input !== "string" || !entry.owner.input.trim()) {
      return `${GENERATED_FIELDS_KEY} entries need a generated path and an owning input.`;
    }
    const key = JSON.stringify(entry.path);
    if (seen.has(key)) return `${GENERATED_FIELDS_KEY} assigns the same path more than once.`;
    seen.add(key);
    if (pathAt(document, entry.path) === undefined) {
      return `Generated path ${entry.path.join("/")} is missing; regenerate it from ${entry.owner.input}.`;
    }
  }
  return "";
}

/** Reject generated-fragment edits outside explicitly authorized authoring tables. */
export function schemaGeneratedOwnershipIssue(before, after, {
  allowGeneratedPaths = [], allowGeneratedSubtrees = [],
} = {}) {
  const beforeRegistry = before?.[GENERATED_FIELDS_KEY];
  const afterRegistry = after?.[GENERATED_FIELDS_KEY];
  if (JSON.stringify(beforeRegistry) !== JSON.stringify(afterRegistry)) {
    return "Generated-field ownership is read-only. Change the owning schema choice with its authoring table.";
  }
  const registryIssue = generatedFieldsIssue(before);
  if (registryIssue) return registryIssue;
  for (const entry of beforeRegistry?.fields || []) {
    const allowedByTable = allowGeneratedPaths.some(path =>
      Array.isArray(path) && pathStartsWith(path, entry.path))
      || allowGeneratedSubtrees.some(path => Array.isArray(path)
        && (pathStartsWith(entry.path, path) || pathStartsWith(path, entry.path)));
    if (allowedByTable) continue;
    const original = pathAt(before, entry.path), next = pathAt(after, entry.path);
    if (JSON.stringify(original) !== JSON.stringify(next)) {
      const owner = entry.owner.path.length
        ? entry.owner.path.join("/") : "the schema root";
      return `Generated schema data at ${entry.path.join("/")} is read-only here. Its owner is ${owner} (${entry.owner.input}); use an authoring table to change it.`;
    }
  }
  return "";
}

/** Find the owner of a generated source path for read-only form rendering. */
export function schemaGeneratedOwnerAtPath(document, path) {
  if (!Array.isArray(path)) return null;
  if (pathStartsWith(path, [GENERATED_FIELDS_KEY])) {
    return { path: [], input: "guided authoring ownership registry" };
  }
  return document?.[GENERATED_FIELDS_KEY]?.fields?.find(entry =>
    Array.isArray(entry?.path) && pathStartsWith(path, entry.path))?.owner || null;
}

function localSchemaAt(document, declaration, seen = new Set()) {
  if (!isObject(declaration) || typeof declaration.$ref !== "string") return declaration;
  const path = localReferencePath(declaration.$ref);
  if (!path) throw new Error("Guided authoring needs a local $ref target in this self-contained schema.");
  const identity = JSON.stringify(path);
  if (seen.has(identity)) throw new Error("The selected declaration contains a recursive $ref.");
  return localSchemaAt(document, memberAt(document, path), new Set([...seen, identity]));
}

function hasDiscriminator(document, declaration, key, token = null) {
  const resolved = localSchemaAt(document, declaration);
  if (!isObject(resolved)) return false;
  if (Array.isArray(resolved.allOf)) {
    return resolved.allOf.some(branch => hasDiscriminator(document, branch, key, token));
  }
  return isObject(resolved.properties?.[key])
    && typeof resolved.properties[key].const === "string"
    && (token === null || resolved.properties[key].const === token);
}

function singleCollectionVariant(document, collectionPath) {
  const collection = memberAt(document, collectionPath);
  if (!isObject(collection) || collection.type !== "array" || !isObject(collection.items)) {
    throw new Error("Select an array collection with an item declaration.");
  }
  let variant = collection.items, path = [...collectionPath, "items"];
  const visited = new Set();
  for (let depth = 0; depth < 20; depth++) {
    if (typeof variant.$ref === "string") {
      const refPath = localReferencePath(variant.$ref);
      if (!refPath || visited.has(JSON.stringify(refPath))) {
        throw new Error("The collection item must resolve to one local, non-recursive declaration.");
      }
      visited.add(JSON.stringify(refPath)); path = refPath;
      variant = memberAt(document, path); continue;
    }
    if (Array.isArray(variant.oneOf)) {
      if (variant.oneOf.length !== 1) {
        throw new Error("This collection has multiple item kinds. Keep a discriminator for those kinds.");
      }
      path = [...path, "oneOf", 0]; variant = variant.oneOf[0]; continue;
    }
    if (variant.type === "object" || isObject(variant.properties)) return { path, variant };
    throw new Error("The collection item is not an object declaration.");
  }
  throw new Error("The collection item has too many nested references.");
}

/** Reverse-inspect the stored discriminator policy for one collection item kind. */
export function schemaSingleItemPolicy(document, collectionPath) {
  if (!isObject(document) || !Array.isArray(collectionPath))
    throw new Error("Select a collection declaration first.");
  const { path, variant } = singleCollectionVariant(document, collectionPath);
  const records = document[GENERATED_FIELDS_KEY]?.fields || [];
  const generated = records.find(entry => (entry.path?.length === path.length + 2
      || (entry.path?.length === path.length + 3 && entry.path.at(-1) === "const"))
    && equalPath(entry.path.slice(0, path.length), path)
    && entry.path[path.length] === "properties"
    && entry.owner?.input?.endsWith(" discriminator"));
  const key = generated?.path?.[path.length + 1]
    || (typeof variant.properties?.type?.const === "string" ? "type" : "");
  const declared = key && variant.properties?.[key];
  const stored = !!(isObject(declared) && typeof declared.const === "string"
    && Array.isArray(variant.required) && variant.required.includes(key));
  const action = records.find(entry => equalPath(entry.owner?.path, collectionPath)
    && entry.path?.[0] === "x-fullmeta-ui-tree" && entry.path?.[1] === "insertions"
    && entry.owner?.input?.startsWith("item kind "));
  const insertion = action ? memberAt(document, action.path) : null;
  return { path, title: variant.title || path.at(-1) || "Item",
    stored, generated: !!generated, key: key || "type",
    token: stored ? declared.const : typeof insertion?.variant === "string"
      ? insertion.variant : path.at(-1) || "item" };
}

function propertyOwner(document, path, binding) {
  const selected = memberAt(document, path);
  if (isSchemaTreeDeclaration(document, path)) return { selected, path, binding };
  if (Array.isArray(selected?.path) && Array.isArray(selected?.children) && !selected.role) {
    const ownerPath = schemaAtPropertyPath(document, selected.path);
    return { selected: memberAt(document, ownerPath), path: ownerPath,
      binding: Array.isArray(binding) && binding.length ? binding : selected.path, group: selected, groupPath: path };
  }
  throw new Error("Choose a schema declaration or a display group.");
}

/** Read the project-tree heading and item class for a bound collection declaration. */
export function schemaCollectionTreePresentation(document, path, binding = []) {
  if (!isObject(document) || !Array.isArray(path)) return null;
  let declaration;
  try { declaration = memberAt(document, path); }
  catch { return null; }
  if (!isObject(declaration) || declaration.type !== "array") return null;
  const location = treeCollectionDescriptorLocation(document, path, binding);
  if (!location) return null;
  return {
    showHeading: location.descriptor.heading !== false,
    itemClass: typeof location.descriptor.itemClass === "string" ? location.descriptor.itemClass : "",
    descriptorPath: location.descriptorPath,
    binding: location.binding,
  };
}

function schemaWithBoundTreeGroup(document, descriptorPath, { modelPath = "", sectionKind = "collection", title = "" } = {}) {
  const descriptor = memberAt(document, descriptorPath);
  if (!isObject(descriptor) || !Array.isArray(descriptor.path) || !Array.isArray(descriptor.children) || descriptor.role) {
    throw new Error("Select an unbound display group in the project tree.");
  }
  if (descriptor.children.length) throw new Error("Bind an empty display group before adding children.");
  const keys = typeof modelPath === "string" ? modelPath.trim().split(".").filter(Boolean) : [];
  if (!keys.length || keys[0] !== "model") throw new Error("Enter a model path beginning with model, such as model.geometry.features.");
  keys.forEach((key, index) => authoringKey(key, `Model path segment ${index + 1}`));
  if (!["group", "collection", "objectRoot"].includes(sectionKind)) throw new Error("Choose a section, collection, or object root binding.");
  const label = authoringTitle(title);
  if (sectionKind === "group" && keys.length !== 1) throw new Error("A display section can bind only to the model root.");

  let declarationPath = [];
  let declaration = document;
  for (const [index, key] of keys.entries()) {
    if (declaration.type && declaration.type !== "object") throw new Error(`Model path segment ${keys.slice(0, index).join(".")} is not an object.`);
    declaration.properties ||= {};
    if (!isObject(declaration.properties)) throw new Error(`The schema path before ${key} must have object properties.`);
    const isLeaf = index === keys.length - 1;
    let child = declaration.properties[key];
    if (!isLeaf || sectionKind === "group") {
      if (child === undefined && !isLeaf) {
        child = { type: "object", title: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, first => first.toUpperCase()), properties: {} };
        declaration.properties[key] = child;
      }
      if (!isObject(child)) throw new Error(`Model path ${keys.slice(0, index + 1).join(".")} is not declared as an object.`);
      if (child.type && child.type !== "object") throw new Error(`Model path ${keys.slice(0, index + 1).join(".")} is not an object.`);
    } else if (child === undefined) {
      child = sectionKind === "collection"
        ? { type: "array", title: label, "x-fullmeta-ui-behavior": treeChildBehavior() }
        : { type: "object", title: label, properties: {}, "x-fullmeta-ui-behavior": treeChildBehavior() };
      declaration.properties[key] = child;
      const childPath = [...declarationPath, "properties", key];
      recordGeneratedField(document, [...childPath, "x-fullmeta-ui-behavior"], childPath, "standard project-tree behavior");
    } else if (!isObject(child) || child.type !== (sectionKind === "collection" ? "array" : "object")) {
      throw new Error(`Model path ${keys.join(".")} already exists with a different shape.`);
    }
    declarationPath = [...declarationPath, "properties", key];
    declaration = child;
  }

  const treeEntry = { ...descriptor, path: keys };
  if (sectionKind === "group") delete treeEntry.role;
  else treeEntry.role = sectionKind;
  treeEntry.title = label;
  if (sectionKind !== "objectRoot") delete treeEntry.children;
  document["x-fullmeta-ui-tree"] ||= { children: [] };
  const treeEntryPath = descriptorPath;
  for (const key of Object.keys(descriptor)) {
    if (!Object.hasOwn(treeEntry, key)) delete descriptor[key];
  }
  Object.assign(descriptor, treeEntry);
  recordGeneratedField(document, [...treeEntryPath, "path"], declarationPath, `project-tree section ${sectionKind}`);
  if (sectionKind !== "group") {
    recordGeneratedField(document, [...treeEntryPath, "role"], declarationPath, `project-tree section ${sectionKind}`);
  }
  return { document, path: descriptorPath, label, changedPaths: [`/${declarationPath.join("/")}`, "/x-fullmeta-ui-tree", `/${GENERATED_FIELDS_KEY}`] };
}

/** Apply one guided authoring choice to the schema in a single copy-on-write transaction. */
export function schemaWithAuthoringOperation(document, path, {
  operation, binding = [], key = "", title = "", shape = "object", required = false,
  showHeading = true, itemClass = "", setup = null,
  schemaPath = "",
  fieldKey = "", treeRole = "optionalItem", visibleWhenOption = "",
  identity = "none", identityFields: requestedIdentityFields, discriminator = "type", token = "", storeDiscriminator = true, definitionKey = "definition", variantKey = "", unionKey = "", variants = [], geometryDimension = "", geometryRole = "", definitionKind = "object", definitionItemShape = "", definitionReferenceKey = "", definitionItemCount = "", definitionChoices = "", definitionPattern = "", definitionMinLength = "", definitionMaxLength = "", definitionMinimum = "", definitionMaximum = "", expressionNamespaces = "", memberKeys = [], defaultValue, fixedValue, fields = [], requiredKeys = [], closedObject = false, sourceKeys = [], nestedDefinitionKey = "", insertFirst = false, modelPath = "", sectionKind,
} = {}) {
  if (!isObject(document) || !Array.isArray(path)) throw new Error("Select a schema declaration first.");
  const next = structuredClone(document);
  const label = title.trim() ? authoringTitle(title)
    : ["reusable-schema-definition", "collection-tree-presentation", "collection-item-kinds-table", "collection-item-policy", "object-requirements", "repair-collection-actions", "bind-existing-field-tree", "project-integration"].includes(operation) ? "" : authoringTitle(title);
  if (operation === "bind-tree-group") {
    return schemaWithBoundTreeGroup(next, path, { modelPath, sectionKind, title: label });
  }
  if (operation === "project-integration") {
    if (path.length) throw new Error("Select the schema root for project integration.");
    const result = schemaWithProjectIntegration(next, setup, schemaPath);
    for (const [generatedPath, source] of result.generatedPaths) {
      const entry = next[GENERATED_FIELDS_KEY]?.fields?.find(item => equalPath(item.path, generatedPath));
      if (entry) {
        entry.owner.input = source;
      } else {
        recordGeneratedField(next, generatedPath, [], source);
      }
    }
    delete result.generatedPaths;
    result.changedPaths.push(`/${GENERATED_FIELDS_KEY}`);
    return result;
  }
  if (operation === "display-group") {
    const selected = path.length ? memberAt(next, path) : next["x-fullmeta-ui-tree"] || next;
    const tree = next["x-fullmeta-ui-tree"] ||= { children: [] };
    if (!Array.isArray(tree.children)) throw new Error("The schema tree children must be a list.");
    if (path.length && isObject(selected) && Array.isArray(selected.children) && !selected.role) {
      selected.children.push({ title: label, path: [], children: [] });
    } else if (!path.length) {
      tree.children.push({ title: label, path: [], children: [] });
    } else {
      const owner = propertyOwner(next, path, binding);
      let entry = treeDescriptorOwner(next, owner.binding);
      if (!entry) {
        const descriptor = { path: [...owner.binding], role: "objectRoot", children: [] };
        tree.children.push(descriptor);
        entry = { descriptor, entries: descriptor.children };
      }
      const children = entry.entries || (entry.descriptor.children = []);
      children.push({ title: label, path: [], children: [] });
    }
    return { document: next, path: path.slice(), label, changedPaths: ["/x-fullmeta-ui-tree"] };
  }

  const identityFields = requestedIdentityFields === undefined
    ? (identity === "id-name" ? ["id", "name"] : identity === "none" ? [] : null)
    : requestedIdentityFields;
  if (identityFields === null || !Array.isArray(identityFields)
    || identityFields.some(field => !["id", "name"].includes(field))
    || new Set(identityFields).size !== identityFields.length) {
    throw new Error("Choose whether to generate the ID field, the name field, both, or neither.");
  }
  const name = ["object-node", "collection", "settings-field", "reusable-schema-definition", "nest-existing-fields"].includes(operation)
    ? authoringKey(key)
    : "";
  const owner = propertyOwner(next, path, binding);
  const declaration = owner.selected;
  if (!isObject(declaration)) throw new Error("The selected schema declaration is not an object.");
  if (operation === "collection-item-policy") {
    if (declaration.type !== "array") throw new Error("Select a collection declaration.");
    const policy = schemaSingleItemPolicy(next, owner.path);
    const variant = memberAt(next, policy.path);
    if (storeDiscriminator === policy.stored) {
      throw new Error("The item-kind storage policy is unchanged.");
    }
    if (!storeDiscriminator) {
      if (!policy.generated) {
        throw new Error("Only a discriminator generated by guided authoring can be removed here.");
      }
      if (Object.keys(variant.properties[policy.key] || {}).some(key => key !== "const")) {
        throw new Error("This discriminator has additional overlays. Remove them in Generated field overlays before removing the discriminator.");
      }
      delete variant.properties[policy.key];
      variant.required = variant.required.filter(field => field !== policy.key);
      if (!variant.required.length) delete variant.required;
      const registry = next[GENERATED_FIELDS_KEY];
      const fieldPath = [...policy.path, "properties", policy.key];
      registry.fields = registry.fields.filter(entry => !equalPath(entry.path, fieldPath)
        && !(Array.isArray(entry.path) && entry.path.length > fieldPath.length
          && equalPath(entry.path.slice(0, fieldPath.length), fieldPath)));
      if (Array.isArray(variant["x-fullmeta-editorActions"])) {
        for (const action of variant["x-fullmeta-editorActions"]) {
          if (action?.type === policy.token && action.action === `add-${policy.token}`) delete action.type;
        }
      }
    } else {
      const key = authoringKey(discriminator, "Discriminator key");
      const itemToken = String(token || "").trim();
      if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(itemToken)) {
        throw new Error("Item kind token must start with a letter and use letters, numbers, periods, underscores, or hyphens.");
      }
      if (!isObject(variant.properties) || Object.hasOwn(variant.properties, key)) {
        throw new Error(`The item kind already declares ${key}. Choose an unused discriminator key.`);
      }
      variant.properties[key] = { const: itemToken };
      variant.required ||= [];
      if (!variant.required.includes(key)) variant.required.push(key);
      recordGeneratedField(next, [...policy.path, "properties", key],
        policy.path.at(0) === "$defs" ? policy.path : owner.path,
        `item kind ${itemToken} discriminator`);
      if (Array.isArray(variant["x-fullmeta-editorActions"])) {
        for (const action of variant["x-fullmeta-editorActions"]) {
          if (action?.action === `add-${itemToken}` && action.type === undefined) action.type = itemToken;
        }
      }
    }
    return { document: next, path: owner.path.slice(), label: policy.title,
      sourceSummary: storeDiscriminator
        ? `This single item kind now stores ${discriminator} = ${token} in project JSON.`
        : `This single item kind no longer stores a discriminator in project JSON.`,
      changedPaths: [`/${policy.path.join("/")}`, `/${GENERATED_FIELDS_KEY}`] };
  }
  if (operation === "bind-existing-field-tree") {
    if (owner.group || (declaration.type && declaration.type !== "object")
      || !isObject(declaration.properties)) {
      throw new Error("Select an object or item-kind declaration with existing fields.");
    }
    const existingKey = authoringKey(fieldKey, "Existing field key");
    if (!Object.hasOwn(declaration.properties, existingKey)) {
      throw new Error(`Field ${existingKey} is not declared on the selected object.`);
    }
    if (!["optionalItem", "objectRoot", "collection"].includes(treeRole)) {
      throw new Error("Choose an optional item, object root, or collection tree role.");
    }
    const fieldPath = [...owner.path, "properties", existingKey];
    const fieldDeclaration = localSchemaAt(next, declaration.properties[existingKey]);
    const fieldShape = fieldDeclaration?.type
      || (isObject(fieldDeclaration?.properties) ? "object" : "");
    if (treeRole === "collection" ? fieldShape !== "array" : fieldShape !== "object") {
      throw new Error(`Field ${existingKey} must be ${treeRole === "collection" ? "an array" : "an object"} for this tree role.`);
    }
    if (!Array.isArray(owner.binding) || !owner.binding.length) {
      throw new Error("Select the object from its bound project-tree branch before showing a field there.");
    }
    const parentBinding = owner.binding.at(-1) === "*"
      ? owner.binding.slice(0, -1) : owner.binding;
    let treeOwner = treeDescriptorOwner(next, parentBinding);
    if (!treeOwner) {
      throw new Error("The selected object is not bound to the project tree.");
    }
    // Array item variants inherit their containing collection's descriptor.
    // Object-map entry variants inherit the objectEntries child of their map.
    if (owner.binding.at(-1) === "*" && treeOwner.descriptor.role === "objectRoot") {
      const entryIndex = treeOwner.descriptor.children?.findIndex(entry =>
        entry?.role === "objectEntries" && Array.isArray(entry.path) && !entry.path.length) ?? -1;
      if (entryIndex >= 0) {
        treeOwner = {
          descriptor: treeOwner.descriptor.children[entryIndex],
          entriesPath: [...treeOwner.entriesPath, entryIndex, "children"],
        };
      }
    }
    const children = treeOwner.descriptor.children ||= [];
    if (!Array.isArray(children)) throw new Error("The project-tree branch children must be a list.");
    if (children.some(entry => Array.isArray(entry?.path) && equalPath(entry.path, [existingKey]))) {
      throw new Error(`Field ${existingKey} is already shown in this project-tree branch.`);
    }
    const presentation = collectionPresentationValues({ showHeading, itemClass });
    const optionKey = String(visibleWhenOption || "").trim();
    if (optionKey) authoringKey(optionKey, "Editor option key");
    const treeEntry = { path: [existingKey], role: treeRole };
    if (label) treeEntry.title = label;
    if (presentation.itemClass) treeEntry.itemClass = presentation.itemClass;
    if (treeRole === "collection" && !presentation.showHeading) treeEntry.heading = false;
    if (optionKey) treeEntry.visibleWhen = {
      notEquals: false, path: [optionKey], source: "editorOptions",
    };
    children.push(treeEntry);
    const treePath = [...treeOwner.entriesPath, children.length - 1];
    recordGeneratedField(next, treePath, fieldPath, "existing field tree binding");
    return { document: next, path: fieldPath, label: label || fieldDeclaration.title || existingKey,
      changedPaths: [`/${treePath.join("/")}`] };
  }
  if (operation === "collection-tree-presentation") {
    if (declaration.type !== "array") throw new Error("Select a collection declaration to configure its tree presentation.");
    const location = treeCollectionDescriptorLocation(next, owner.path, owner.binding);
    if (!location) throw new Error("This collection is not bound to a project-tree collection item. Bind it to the tree first.");
    const presentation = collectionPresentationValues({ showHeading, itemClass });
    if (presentation.showHeading) delete location.descriptor.heading;
    else location.descriptor.heading = false;
    if (presentation.itemClass) location.descriptor.itemClass = presentation.itemClass;
    else delete location.descriptor.itemClass;
    const registry = next[GENERATED_FIELDS_KEY];
    const hasWholeBindingOwner = registry?.fields?.some(entry => equalPath(entry.path, location.descriptorPath));
    if (!hasWholeBindingOwner) {
      recordGeneratedField(next, location.descriptorPath, owner.path, "standard project-tree binding");
    }
    return { document: next, path: owner.path.slice(), label: declaration.title || owner.path.at(-1) || "Collection",
      changedPaths: ["/x-fullmeta-ui-tree", `/${GENERATED_FIELDS_KEY}`] };
  }
  if (operation === "repair-collection-actions") {
    if (declaration.type !== "array") throw new Error("Select a collection declaration to repair its item actions.");
    const count = repairGeneratedCollectionActions(next, owner.path, owner.binding);
    return { document: next, path: owner.path.slice(), label: `${count} collection action${count === 1 ? "" : "s"} repaired`,
      changedPaths: ["/x-fullmeta-ui-tree/actionMenus", "/x-fullmeta-ui-tree/insertions", `/${GENERATED_FIELDS_KEY}`] };
  }
  if (owner.group && !["object-node", "collection", "settings-field", "settings-fields"].includes(operation)) {
    throw new Error("A display group can contain object nodes, collections, and settings fields; choose a schema node to add an item kind.");
  }

  if (operation === "nest-existing-fields") {
    if (declaration.type && declaration.type !== "object") {
      throw new Error("Select an object declaration containing the fields to nest.");
    }
    if (!isObject(declaration.properties)) {
      throw new Error("The selected object has no direct fields to nest.");
    }
    if (Object.hasOwn(declaration.properties, name)) {
      throw new Error(`Property ${name} already exists on the selected object.`);
    }
    if (!Array.isArray(sourceKeys) || !sourceKeys.length || sourceKeys.some(value => typeof value !== "string")) {
      throw new Error("Select at least one existing field to nest.");
    }
    const moved = new Set(sourceKeys);
    if (moved.size !== sourceKeys.length || sourceKeys.some(value => !Object.hasOwn(declaration.properties, value))) {
      throw new Error("Selected fields must be distinct direct properties of this object.");
    }
    if (declaration.required !== undefined && !Array.isArray(declaration.required)) {
      throw new Error("The selected object's required declaration must be a list.");
    }
    if (typeof closedObject !== "boolean" || typeof insertFirst !== "boolean") {
      throw new Error("Choose the nested object's closure and field position.");
    }
    const reusableKey = typeof nestedDefinitionKey === "string" && nestedDefinitionKey.trim()
      ? authoringKey(nestedDefinitionKey.trim(), "Reusable definition key") : "";
    if (reusableKey && (next.$defs !== undefined && !isObject(next.$defs))) {
      throw new Error("The schema definitions keyword must be an object.");
    }
    if (reusableKey && Object.hasOwn(next.$defs || {}, reusableKey)) {
      throw new Error(`Reusable definition ${reusableKey} already exists.`);
    }
    const destinationPath = reusableKey ? ["$defs", reusableKey] : [...owner.path, "properties", name];
    const sourcePaths = sourceKeys.map(sourceKey => [...owner.path, "properties", sourceKey]);
    const registry = next[GENERATED_FIELDS_KEY];
    // A generated property is an output of another guided choice. Moving it
    // would leave that choice's regeneration contract inconsistent.
    for (const sourcePath of sourcePaths) {
      if (registry?.fields?.some(entry => equalPath(entry.path, sourcePath))) {
        throw new Error(`Field ${sourcePath.at(-1)} is generated by another guided choice and cannot be nested.`);
      }
      if (registry?.fields?.some(entry => pathStartsWith(entry.owner?.path || [], sourcePath)
        && !pathStartsWith(entry.path, sourcePath))) {
        throw new Error(`Field ${sourcePath.at(-1)} owns generated data elsewhere. Move its dependent tree or action entries first.`);
      }
    }
    const referencedSource = sourcePaths.find(sourcePath => {
      const visit = value => {
        if (!value || typeof value !== "object") return false;
        if (isObject(value) && typeof value.$ref === "string") {
          const reference = localReferencePath(value.$ref);
          if (reference && pathStartsWith(reference, sourcePath)) return true;
        }
        return Object.values(value).some(visit);
      };
      return visit(next);
    });
    if (referencedSource) {
      throw new Error(`Field ${referencedSource.at(-1)} is referenced by another schema declaration. Update that reference before nesting it.`);
    }
    const oldRequired = new Set(declaration.required || []);
    const nestedProperties = {};
    for (const [sourceKey, field] of Object.entries(declaration.properties)) {
      if (moved.has(sourceKey)) nestedProperties[sourceKey] = field;
    }
    const nestedRequired = Object.keys(nestedProperties).filter(sourceKey => oldRequired.has(sourceKey));
    const nested = { type: "object", title: label, properties: nestedProperties };
    if (nestedRequired.length) nested.required = nestedRequired;
    if (closedObject) nested.additionalProperties = false;
    const propertyEntries = Object.entries(declaration.properties).filter(([sourceKey]) => !moved.has(sourceKey));
    const firstMovedIndex = Object.keys(declaration.properties).findIndex(sourceKey => moved.has(sourceKey));
    const insertionIndex = insertFirst ? 0 : Math.min(firstMovedIndex, propertyEntries.length);
    if (reusableKey) (next.$defs ||= {})[reusableKey] = nested;
    propertyEntries.splice(insertionIndex, 0, [name, reusableKey
      ? { $ref: `#/$defs/${reusableKey}`, title: label } : nested]);
    declaration.properties = Object.fromEntries(propertyEntries);
    const parentRequired = (declaration.required || []).filter(sourceKey => !moved.has(sourceKey));
    if (required) parentRequired.push(name);
    if (parentRequired.length) declaration.required = parentRequired;
    else delete declaration.required;
    // Retain ownership records for generated annotations below moved fields.
    // Their owner follows the field only if it was itself inside that field.
    for (const entry of registry?.fields || []) {
      for (const sourcePath of sourcePaths) {
        if (pathStartsWith(entry.path, sourcePath)) {
          entry.path = [...destinationPath, "properties", sourcePath.at(-1), ...entry.path.slice(sourcePath.length)];
        }
        if (pathStartsWith(entry.owner?.path || [], sourcePath)) {
          entry.owner.path = [...destinationPath, "properties", sourcePath.at(-1), ...entry.owner.path.slice(sourcePath.length)];
        }
      }
    }
    const generatedIssue = generatedFieldsIssue(next);
    if (generatedIssue) throw new Error(generatedIssue);
    return { document: next, path: [...owner.path, "properties", name], label,
      changedPaths: [`/${destinationPath.join("/")}`, `/${[...owner.path, "properties", name].join("/")}`,
        `/${[...owner.path, "required"].join("/")}`,
        `/${GENERATED_FIELDS_KEY}`] };
  }

  if (operation === "object-requirements") {
    if (declaration.type && declaration.type !== "object") {
      throw new Error("Select an object schema declaration to set its requirements.");
    }
    if (!isObject(declaration.properties)) {
      throw new Error("This object has no declared properties to choose from.");
    }
    if (declaration.required !== undefined && !Array.isArray(declaration.required)) {
      throw new Error("The object's required declaration must be a list.");
    }
    if (!Array.isArray(requiredKeys) || requiredKeys.some(key => typeof key !== "string")) {
      throw new Error("Required property keys must be a list of declared properties.");
    }
    const propertyKeys = Object.keys(declaration.properties);
    const selectedKeys = new Set(requiredKeys);
    if (selectedKeys.size !== requiredKeys.length
      || requiredKeys.some(key => !Object.hasOwn(declaration.properties, key))) {
      throw new Error("Required property keys must be distinct declared properties.");
    }
    if (typeof closedObject !== "boolean") throw new Error("Choose whether this object is closed.");
    if (closedObject && isObject(declaration.additionalProperties)) {
      throw new Error("This object has an entry schema. It cannot be closed without removing those entries.");
    }
    const unrelatedRequired = (declaration.required || []).filter(key => !Object.hasOwn(declaration.properties, key));
    const nextRequired = [...propertyKeys.filter(key => selectedKeys.has(key)), ...unrelatedRequired];
    if (nextRequired.length) declaration.required = nextRequired;
    else delete declaration.required;
    if (closedObject) declaration.additionalProperties = false;
    else if (declaration.additionalProperties === false) delete declaration.additionalProperties;
    return { document: next, path: owner.path.slice(), label: declaration.title || "Object requirements",
      changedPaths: [`/${[...owner.path, "required"].join("/")}`,
        `/${[...owner.path, "additionalProperties"].join("/")}`] };
  }

  if (operation === "object-node" || operation === "collection") {
    if (declaration.type && declaration.type !== "object") throw new Error("Add an object node or collection beneath an object schema.");
    if (declaration.properties !== undefined && !isObject(declaration.properties)) {
      throw new Error("The parent properties keyword must be an object.");
    }
    declaration.properties ||= {};
    if (Object.hasOwn(declaration.properties, name)) throw new Error(`Property ${name} already exists.`);
    const childPath = [...owner.path, "properties", name];
    const child = operation === "collection"
      ? { type: "array", title: label, "x-fullmeta-ui-behavior": treeChildBehavior() }
      : { ...schemaObjectWithIdentity(label, identityFields), "x-fullmeta-ui-behavior": treeChildBehavior() };
    declaration.properties[name] = child;
    if (required && !declaration.required?.includes(name)) (declaration.required ||= []).push(name);
    const bindingPath = appendTreeBinding(next, owner.binding, name,
      operation === "collection" ? (owner.group ? "collectionLink" : "collection") : "objectRoot",
      label, owner.groupPath || null,
      operation === "collection" ? { showHeading, itemClass } : null);
    recordGeneratedField(next, [...childPath, "x-fullmeta-ui-behavior"], childPath, "standard project-tree behavior");
    recordGeneratedField(next, bindingPath, childPath, "standard project-tree binding");
    if (operation === "object-node") {
      for (const field of identityFields) {
        recordGeneratedField(next, [...childPath, "properties", field], childPath, "instance identity");
      }
    }
    return { document: next, path: childPath, label,
      changedPaths: [`/${childPath.join("/")}`, "/x-fullmeta-ui-tree", `/${GENERATED_FIELDS_KEY}`] };
  }

  if (operation === "settings-field") {
    if (declaration.type && declaration.type !== "object") throw new Error("A settings field must be added beneath an object declaration.");
    if (!["object", "array", "string", "number", "integer", "boolean", "null"].includes(shape)) {
      throw new Error("Choose a supported JSON value shape for this field.");
    }
    declaration.properties ||= {};
    if (!isObject(declaration.properties)) throw new Error("The parent properties keyword must be an object.");
    if (Object.hasOwn(declaration.properties, name)) throw new Error(`Property ${name} already exists.`);
    const field = { type: shape, title: label };
    const compatibleValue = value => shape === "integer" ? Number.isInteger(value)
      : shape === "number" ? typeof value === "number" && Number.isFinite(value)
      : shape === "array" ? Array.isArray(value)
      : shape === "object" ? isObject(value)
      : shape === "null" ? value === null
      : typeof value === shape;
    if (fixedValue !== undefined) {
      if (defaultValue !== undefined) throw new Error("Choose a fixed value or a default value, not both.");
      if (!compatibleValue(fixedValue)) throw new Error(`The fixed value must match the selected ${shape} shape.`);
      field.const = structuredClone(fixedValue);
    }
    if (defaultValue !== undefined) {
      if (!compatibleValue(defaultValue)) throw new Error(`The default value must match the selected ${shape} shape.`);
      field.default = structuredClone(defaultValue);
    }
    declaration.properties[name] = field;
    if (required && !declaration.required?.includes(name)) (declaration.required ||= []).push(name);
    return { document: next, path: [...owner.path, "properties", name], label,
      changedPaths: [`/${[...owner.path, "properties", name].join("/")}`] };
  }

  if (operation === "settings-fields") {
    if (declaration.type && declaration.type !== "object") throw new Error("Settings fields must be added beneath an object declaration.");
    if (declaration.properties !== undefined && !isObject(declaration.properties)) {
      throw new Error("The parent properties keyword must be an object.");
    }
    if (!Array.isArray(fields) || fields.length === 0) throw new Error("Add at least one settings field in the table.");
    declaration.properties ||= {};
    if (declaration.required !== undefined && !Array.isArray(declaration.required)) {
      throw new Error("The parent required keyword must be a list.");
    }
    const batch = schemaFieldsFromAuthoringRows(fields, declaration.properties);
    const addedPaths = [];
    Object.assign(declaration.properties, batch.properties);
    if (batch.required.length) {
      declaration.required ||= [];
      for (const property of batch.required) {
        if (!declaration.required.includes(property)) declaration.required.push(property);
      }
    }
    for (const property of Object.keys(batch.properties)) addedPaths.push([...owner.path, "properties", property]);
    return { document: next, path: owner.path.slice(), label: `${label} (${fields.length} fields)`,
      changedPaths: [...addedPaths.map(fieldPath => `/${fieldPath.join("/")}`), `/${[...owner.path, "required"].join("/")}`] };
  }

  if (operation === "reusable-schema-definition") {
    const reusableKey = name;
    const definitions = next.$defs ||= {};
    if (!isObject(definitions)) throw new Error("The schema $defs keyword must be an object.");
    if (Object.hasOwn(definitions, reusableKey)) throw new Error(`Definition ${reusableKey} already exists.`);
    const definitionTitle = label;
    let definition;
    if (definitionKind === "object") {
      if (!fields.length) throw new Error(`Add the fields for object definition ${reusableKey}.`);
      const batch = schemaFieldsFromAuthoringRows(fields, {}, `Definition ${reusableKey} field`);
      definition = { type: "object", ...(definitionTitle ? { title: definitionTitle } : {}), properties: batch.properties,
        ...(batch.required.length ? { required: batch.required } : {}), additionalProperties: false };
    } else if (["string", "number", "integer", "boolean", "null"].includes(definitionKind)) {
      definition = { type: definitionKind, ...(definitionTitle ? { title: definitionTitle } : {}) };
      const choices = enumValues(definitionKind, definitionChoices);
      if (choices) definition.enum = choices;
      if (definitionKind === "string") {
        const minLengthValue = optionalCount(definitionMinLength, "Minimum length");
        const maxLengthValue = optionalCount(definitionMaxLength, "Maximum length");
        if (minLengthValue !== undefined && maxLengthValue !== undefined && minLengthValue > maxLengthValue) {
          throw new Error("Minimum length cannot be greater than maximum length.");
        }
        if (minLengthValue !== undefined) definition.minLength = minLengthValue;
        if (maxLengthValue !== undefined) definition.maxLength = maxLengthValue;
        if (String(definitionPattern || "").trim()) {
          try { new RegExp(definitionPattern); }
          catch { throw new Error("Enter a valid regular-expression pattern."); }
          definition.pattern = definitionPattern;
        }
        const namespaces = String(expressionNamespaces || "").split(",").map(value => value.trim()).filter(Boolean);
        if (namespaces.length) definition["x-fullmeta-edit"] = { expression: { namespaces } };
      } else {
        const minimumValue = optionalBound(definitionMinimum, "Minimum");
        const maximumValue = optionalBound(definitionMaximum, "Maximum");
        if (minimumValue !== undefined && maximumValue !== undefined && minimumValue > maximumValue) {
          throw new Error("Minimum cannot be greater than maximum.");
        }
        if (minimumValue !== undefined) definition.minimum = minimumValue;
        if (maximumValue !== undefined) definition.maximum = maximumValue;
      }
      definition["x-fullmeta-ui-behavior"] = {
        format: "fullmeta-ui-behavior/1", target: { kind: "field" }, context: "projectEditing",
        payload: { widget: { type: "valueControl", settings: {} } },
      };
    } else if (definitionKind === "array") {
      if (!["number", "reference"].includes(definitionItemShape)) {
        throw new Error("Choose number or reusable reference as the array item shape.");
      }
      const definitionItems = definitionItemShape === "reference"
        ? { $ref: `#/$defs/${authoringKey(definitionReferenceKey, "Array item reference key")}` }
        : { type: "number" };
      const count = optionalCount(definitionItemCount, "Fixed item count");
      definition = { type: "array", ...(definitionTitle ? { title: definitionTitle } : {}), items: definitionItems,
        ...(count === undefined ? {} : { minItems: count, maxItems: count }) };
    } else if (definitionKind === "union") {
      if (!Array.isArray(memberKeys) || !memberKeys.length) throw new Error(`Add at least one member definition to union ${reusableKey}.`);
      const members = memberKeys.map((member, index) => authoringKey(member, `Union member ${index + 1}`));
      if (new Set(members).size !== members.length) throw new Error("Union member definitions must be unique.");
      definition = { ...(definitionTitle ? { title: definitionTitle } : {}), oneOf: members.map(member => ({ $ref: `#/$defs/${member}` })) };
    } else {
      throw new Error("Choose object, scalar, array, or union as the reusable definition shape.");
    }
    definitions[reusableKey] = definition;
    return { document: next, path: ["$defs", reusableKey], label: definitionTitle || reusableKey,
      changedPaths: [`/${["$defs", reusableKey].join("/")}`] };
  }

  if (operation === "shared-definition-collection") {
    if (declaration.type !== "array") throw new Error("Select a collection to attach a reusable definition row.");
    const reusableKey = authoringKey(definitionKey, "Reusable definition key");
    const definitions = next.$defs ||= {};
    if (!isObject(definitions)) throw new Error("The schema $defs keyword must be an object.");
    let definition = definitions[reusableKey];
    if (definition === undefined) {
      if (!fields.length) throw new Error(`Add the fields that make up the new reusable definition ${reusableKey}.`);
      const batch = schemaFieldsFromAuthoringRows(fields, {}, "Definition field");
      definition = { type: "object", title: label, properties: batch.properties,
        ...(batch.required.length ? { required: batch.required } : {}), additionalProperties: false };
      definitions[reusableKey] = definition;
    } else {
      if (!isObject(definition) || definition.type !== "object") {
        throw new Error(`Reusable definition ${reusableKey} already exists and is not an object schema.`);
      }
      if (fields.length) throw new Error(`Reusable definition ${reusableKey} already exists. Clear the field rows to attach it without duplicating its fields.`);
    }

    const itemReference = `#/$defs/${reusableKey}`;
    if (declaration.items === undefined) declaration.items = { $ref: itemReference };
    else if (declaration.items?.$ref !== itemReference) {
      throw new Error("This collection already has a different item declaration.");
    }
    const collectionKey = owner.path.at(-1);
    if (owner.path.at(-2) !== "properties" || typeof collectionKey !== "string") {
      throw new Error("The selected collection must be a named schema property.");
    }
    const parentSchema = memberAt(next, owner.path.slice(0, -2));
    if (!isObject(parentSchema) || (parentSchema.type && parentSchema.type !== "object")) {
      throw new Error("The collection's parent must be an object schema.");
    }
    if (required) {
      if (parentSchema.required !== undefined && !Array.isArray(parentSchema.required)) {
        throw new Error("The collection parent's required keyword must be a list.");
      }
      parentSchema.required ||= [];
      if (!parentSchema.required.includes(collectionKey)) parentSchema.required.push(collectionKey);
    }
    const referencePath = [...owner.path, "items", "$ref"];
    if (!next[GENERATED_FIELDS_KEY]?.fields?.some(entry => equalPath(entry.path, referencePath))) {
      recordGeneratedField(next, referencePath, owner.path, `reusable definition ${reusableKey}`);
    }
    return { document: next, path: owner.path.slice(), label: `${label} row`,
      changedPaths: [`/${["$defs", reusableKey].join("/")}`, `/${[...owner.path, "items"].join("/")}`,
        `/${[...owner.path.slice(0, -2), "required"].join("/")}`, `/${GENERATED_FIELDS_KEY}`] };
  }

  if (operation === "collection-item-kinds-table") {
    const objectMap = declaration.type === "object";
    if (!objectMap && declaration.type !== "array") {
      throw new Error("Select a collection or object-map declaration to add item kinds.");
    }
    if (!Array.isArray(variants) || !variants.length) throw new Error("Add at least one item kind row.");
    if (!Array.isArray(fields)) throw new Error("Item kind fields must be table rows.");
    const discriminatorKey = String(discriminator || "").trim()
      ? authoringKey(discriminator.trim(), "Discriminator key") : "";
    if (discriminatorKey && identityFields.includes(discriminatorKey)) {
      throw new Error("The discriminator key must differ from generated identity fields.");
    }
    const reusableUnionKey = String(unionKey || "").trim()
      ? authoringKey(unionKey.trim(), "Reusable union key") : "";
    if (!objectMap && !discriminatorKey && (variants.length !== 1 || declaration.items !== undefined)) {
      throw new Error("A collection may have one type-free item kind; multiple kinds need a stored discriminator.");
    }
    if (!objectMap && discriminatorKey && declaration.items !== undefined) {
      const existing = localSchemaAt(next, declaration.items);
      const members = Array.isArray(existing?.oneOf) ? existing.oneOf : [declaration.items];
      if (!members.every(member => hasDiscriminator(next, member, discriminatorKey))) {
        throw new Error(`Every existing item kind must store ${discriminatorKey} before adding another kind.`);
      }
    }
    if (!objectMap && variants.length > 1 && !reusableUnionKey) {
      throw new Error("Enter a reusable union key when adding multiple collection item kinds.");
    }
    const normalized = variants.map((entry, index) => {
      if (!isObject(entry)) throw new Error(`Item kind row ${index + 1} is invalid.`);
      const variantToken = String(entry.token || "").trim();
      if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(variantToken)) {
        throw new Error(`Item kind token in row ${index + 1} must start with a letter and contain letters, numbers, periods, underscores, or hyphens.`);
      }
      return { token: variantToken,
        title: authoringTitle(entry.title),
        key: authoringKey(entry.definitionKey, `Reusable item key in row ${index + 1}`) };
    });
    if (new Set(normalized.map(entry => entry.token)).size !== normalized.length
      || new Set(normalized.map(entry => entry.key)).size !== normalized.length) {
      throw new Error("Item kind tokens and reusable keys must each be unique.");
    }
    const byToken = new Set(normalized.map(entry => entry.token));
    for (const field of fields) {
      if (!isObject(field) || (field.kindToken && !byToken.has(field.kindToken))) {
        throw new Error(`Field row for ${field?.kindToken || "an unknown kind"} does not match an item kind token.`);
      }
    }
    const definitions = next.$defs ||= {};
    if (!isObject(definitions)) throw new Error("The schema $defs keyword must be an object.");
    if (reusableUnionKey && (normalized.some(entry => entry.key === reusableUnionKey))) {
      throw new Error("The reusable union key must differ from each item kind key.");
    }
    const newPaths = [];
    for (const entry of normalized) {
      if (Object.hasOwn(definitions, entry.key)) throw new Error(`Definition ${entry.key} already exists.`);
      const properties = {};
      const requiredFields = [];
      for (const field of identityFields) {
        const shared = definitions[field];
        properties[field] = isObject(shared)
          ? { $ref: `#/$defs/${field}`,
            "x-fullmeta-ui-behavior": { format: "fullmeta-ui-behavior/1", target: { kind: "field" },
              context: "projectEditing", payload: { widget: { type: "valueControl", settings: {} } } } }
          : { type: "string", title: field === "id" ? "ID" : "Name", readOnly: true };
        requiredFields.push(field);
      }
      if (discriminatorKey) {
        properties[discriminatorKey] = { const: entry.token };
        requiredFields.push(discriminatorKey);
      }
      const rows = fields.filter(field => !field.kindToken || field.kindToken === entry.token);
      const batch = schemaFieldsFromAuthoringRows(rows, properties, `Item kind ${entry.title} field`);
      Object.assign(properties, batch.properties);
      requiredFields.push(...batch.required);
      const definition = { type: "object", title: entry.title, properties,
        ...(requiredFields.length ? { required: requiredFields } : {}), additionalProperties: false,
        ...(!objectMap ? { "x-fullmeta-editorActions": [{ action: `add-${entry.token}`,
          label: `Add ${entry.title}`, labelAfter: `Add ${entry.title} after`,
          ...(discriminatorKey ? { type: entry.token } : {}) }] } : {}) };
      definitions[entry.key] = definition;
      const variantPath = ["$defs", entry.key];
      if (discriminatorKey) recordGeneratedField(next, [...variantPath, "properties", discriminatorKey], variantPath,
        `item kind ${entry.token} discriminator`);
      for (const field of identityFields) {
        recordGeneratedField(next, [...variantPath, "properties", field], variantPath,
          `item kind ${entry.token} identity`);
      }
      newPaths.push(`/${variantPath.join("/")}`);
    }
    const itemRefs = normalized.map(entry => ({ $ref: `#/$defs/${entry.key}` }));
    if (reusableUnionKey) {
      let union = definitions[reusableUnionKey];
      if (union === undefined) {
        union = { title: label || `${declaration.title || "Collection"} item`, oneOf: [] };
        definitions[reusableUnionKey] = union;
      }
      if (!isObject(union) || !Array.isArray(union.oneOf)) {
        throw new Error(`Reusable union ${reusableUnionKey} must contain a oneOf list.`);
      }
      for (const itemRef of itemRefs) {
        if (union.oneOf.some(existing => existing?.$ref === itemRef.$ref)) {
          throw new Error(`Definition ${itemRef.$ref} is already in ${reusableUnionKey}.`);
        }
        union.oneOf.push(itemRef);
      }
      const unionRef = `#/$defs/${reusableUnionKey}`;
      const memberKey = objectMap ? "additionalProperties" : "items";
      if (declaration[memberKey] === undefined) declaration[memberKey] = { $ref: unionRef };
      else if (declaration[memberKey]?.$ref !== unionRef) {
        throw new Error(`This declaration must use ${reusableUnionKey} as its reusable item union.`);
      }
      newPaths.push(`/${["$defs", reusableUnionKey].join("/")}`);
    } else if (objectMap) {
      if (declaration.additionalProperties === undefined || declaration.additionalProperties === false) {
        declaration.additionalProperties = { oneOf: [] };
      }
      if (!isObject(declaration.additionalProperties)
        || !Array.isArray(declaration.additionalProperties.oneOf)) {
        throw new Error("This object map already has a different additional-properties declaration.");
      }
      for (const itemRef of itemRefs) {
        if (declaration.additionalProperties.oneOf.some(existing => existing?.$ref === itemRef.$ref)) {
          throw new Error(`Definition ${itemRef.$ref} is already an object entry kind.`);
        }
        declaration.additionalProperties.oneOf.push(itemRef);
      }
    } else if (declaration.items === undefined) {
      declaration.items = itemRefs[0];
    } else {
      throw new Error("This collection already has an item declaration. Enter its union key to add kinds to it.");
    }
    if (objectMap) {
      const actions = declaration["x-fullmeta-editorActions"] ||= [];
      if (!Array.isArray(actions)) throw new Error("Object-map editor actions must be a list.");
      for (const entry of normalized) {
        const action = `add-${entry.token}`;
        if (actions.some(existing => existing?.action === action)) throw new Error(`Editor action ${action} already exists.`);
        actions.push({ action, label: `Add ${entry.title}`,
          ...(discriminatorKey ? { type: entry.token } : {}) });
        recordGeneratedField(next, [...owner.path, "x-fullmeta-editorActions", actions.length - 1], owner.path,
          `object entry kind ${entry.token}`);
      }
      const treeOwner = treeDescriptorOwner(next, owner.binding);
      if (treeOwner) {
        const children = treeOwner.descriptor.children ||= [];
        if (!Array.isArray(children)) throw new Error("The object-map tree children must be a list.");
        if (!children.some(child => child?.role === "objectEntries" && Array.isArray(child.path) && !child.path.length)) {
          children.push({ path: [], role: "objectEntries" });
          recordGeneratedField(next, [...treeOwner.entriesPath, children.length - 1], owner.path,
            "object entry tree binding");
        }
      }
    } else {
      for (const entry of normalized) {
        appendCollectionItemAction(next, owner.binding, entry.title, entry.token, owner.path,
          discriminatorKey ? entry.token : entry.key);
      }
    }
    return { document: next, path: owner.path.slice(), label: `${normalized.length} item kind${normalized.length === 1 ? "" : "s"}`,
      changedPaths: [...newPaths, `/${[...owner.path, objectMap ? "additionalProperties" : "items"].join("/")}`,
        ...(objectMap ? [`/${[...owner.path, "x-fullmeta-editorActions"].join("/")}`] : []),
        "/x-fullmeta-ui-tree", `/${GENERATED_FIELDS_KEY}`] };
  }

  if (operation === "collection-item-kind") {
    if (declaration.type !== "array") throw new Error("Select a collection declaration to add an item kind.");
    const discriminatorKey = String(discriminator || "").trim()
      ? authoringKey(discriminator.trim(), "Discriminator key") : "";
    if (discriminatorKey && identityFields.includes(discriminatorKey)) {
      throw new Error("The discriminator key must differ from generated identity fields.");
    }
    if (!discriminatorKey && declaration.items !== undefined) {
      throw new Error("A type-free item kind needs an empty collection. Keep a discriminator when adding another kind.");
    }
    if (typeof token !== "string" || !/^[A-Za-z][A-Za-z0-9._-]*$/.test(token)) {
      throw new Error("Variant token must start with a letter and contain only letters, numbers, periods, underscores, or hyphens.");
    }
    const reusableVariantKey = variantKey ? authoringKey(variantKey, "Reusable item kind key") : "";
    const reusableUnionKey = unionKey ? authoringKey(unionKey, "Reusable union definition key") : "";
    if (Boolean(reusableVariantKey) !== Boolean(reusableUnionKey)) {
      throw new Error("Enter both the reusable item kind key and its union definition key, or leave both blank for an inline kind.");
    }
    if (geometryDimension !== "" && !["2", "3"].includes(String(geometryDimension))) {
      throw new Error("Choose a geometry dimension of 2 or 3.");
    }
    if (geometryRole && geometryRole !== "group") throw new Error("Choose group or leave the geometry role blank.");
    const properties = {};
    const requiredFields = [];
    for (const field of identityFields) {
      properties[field] = reusableVariantKey
        ? { $ref: `#/$defs/${field}`,
          "x-fullmeta-ui-behavior": { format: "fullmeta-ui-behavior/1", target: { kind: "field" },
            context: "projectEditing", payload: { widget: { type: "valueControl", settings: {} } } } }
        : { type: "string", title: field === "id" ? "ID" : "Name", readOnly: true };
      requiredFields.push(field);
    }
    if (discriminatorKey) {
      properties[discriminatorKey] = { const: token };
      requiredFields.push(discriminatorKey);
    }
    if (fields.length) {
      const batch = schemaFieldsFromAuthoringRows(fields, properties, "Item field");
      Object.assign(properties, batch.properties);
      requiredFields.push(...batch.required);
    }
    const orderedProperties = reusableVariantKey
      ? Object.fromEntries(Object.entries(properties).sort(([left], [right]) => left.localeCompare(right)))
      : properties;
    const variant = { type: "object", title: label, properties: orderedProperties, required: requiredFields,
      ...(reusableVariantKey ? { additionalProperties: false } : {}) };
    if (reusableVariantKey) {
      const definitions = next.$defs ||= {};
      if (!isObject(definitions)) throw new Error("The schema $defs keyword must be an object.");
      if (Object.hasOwn(definitions, reusableVariantKey)) throw new Error(`Definition ${reusableVariantKey} already exists.`);
      if (geometryDimension) variant["x-fullmeta-geometryDimension"] = Number(geometryDimension);
      if (geometryRole === "group") {
        variant["x-fullmeta-geometryRole"] = "group";
        variant["x-fullmeta-geometryDimensions"] = [2, 3];
      }
      variant["x-fullmeta-editorActions"] = [{ action: `add-${token}`,
        label: `Add ${label}`, labelAfter: `Add ${label} after`,
        ...(discriminatorKey ? { type: token } : {}) }];
      definitions[reusableVariantKey] = variant;
      const union = definitions[reusableUnionKey] ||= { title: "Domain Geometry Feature", oneOf: [] };
      if (!isObject(union) || !Array.isArray(union.oneOf)) {
        throw new Error(`Reusable union ${reusableUnionKey} must contain a oneOf list.`);
      }
      const variantRef = `#/$defs/${reusableVariantKey}`;
      if (union.oneOf.some(entry => entry?.$ref === variantRef)) {
        throw new Error(`Definition ${reusableVariantKey} is already a member of ${reusableUnionKey}.`);
      }
      union.oneOf.push({ $ref: variantRef });
      const unionRef = `#/$defs/${reusableUnionKey}`;
      if (declaration.items === undefined) declaration.items = { $ref: unionRef };
      else if (declaration.items?.$ref !== unionRef) {
        throw new Error(`This collection must use ${reusableUnionKey} as its reusable item union.`);
      }
      const variantPath = ["$defs", reusableVariantKey];
      if (discriminatorKey) recordGeneratedField(next, [...variantPath, "properties", discriminatorKey], variantPath,
        `item kind ${token} discriminator`);
      for (const field of identityFields) {
        recordGeneratedField(next, [...variantPath, "properties", field], variantPath, `item kind ${token} identity`);
      }
      appendCollectionItemAction(next, owner.binding, label, token, owner.path,
        discriminatorKey ? token : reusableVariantKey);
      return { document: next, path: variantPath, label,
        changedPaths: [`/${variantPath.join("/")}`, `/${["$defs", reusableUnionKey].join("/")}`, `/${[...owner.path, "items"].join("/")}`,
          "/x-fullmeta-ui-tree", `/${GENERATED_FIELDS_KEY}`] };
    }
    if (declaration.items === undefined && declaration.prefixItems === undefined) {
      declaration.items = variant;
      const variantPath = [...owner.path, "items"];
      if (discriminatorKey) recordGeneratedField(next, [...variantPath, "properties", discriminatorKey], owner.path,
        `item kind ${token} discriminator`);
      for (const field of identityFields) {
        recordGeneratedField(next, [...variantPath, "properties", field], owner.path, `item kind ${token} identity`);
      }
      appendCollectionItemAction(next, owner.binding, label, token, owner.path);
      return { document: next, path: variantPath, label,
        changedPaths: [`/${variantPath.join("/")}`, "/x-fullmeta-ui-tree", `/${GENERATED_FIELDS_KEY}`] };
    }
    if (declaration.prefixItems !== undefined) {
      throw new Error("This collection uses tuple items. Guided item kinds require a single items declaration.");
    }
    const items = declaration.items;
    if (isObject(items?.oneOf)) throw new Error("The collection oneOf declaration is malformed.");
    if (isObject(items) && Array.isArray(items.oneOf)) {
      if (items.oneOf.some(item => !hasDiscriminator(next, item, discriminatorKey))) {
        throw new Error(`Every existing item kind must declare ${discriminatorKey} as a constant before another kind can be added.`);
      }
      if (items.oneOf.some(item => hasDiscriminator(next, item, discriminatorKey, token))) {
        throw new Error(`Variant token ${token} already exists in this collection.`);
      }
      items.oneOf.push(variant);
    } else {
      if (!hasDiscriminator(next, items, discriminatorKey)) {
        throw new Error(`The existing item declaration has no constant ${discriminatorKey}. Add the first item kind through this guided operation before adding another.`);
      }
      if (hasDiscriminator(next, items, discriminatorKey, token)) throw new Error(`Variant token ${token} already exists in this collection.`);
      declaration.items = { oneOf: [items, variant] };
    }
    const variantIndex = declaration.items.oneOf.length - 1;
    const variantPath = [...owner.path, "items", "oneOf", variantIndex];
    recordGeneratedField(next, [...variantPath, "properties", discriminatorKey], owner.path,
      `item kind ${token} discriminator`);
    for (const field of identityFields) {
      recordGeneratedField(next, [...variantPath, "properties", field], owner.path, `item kind ${token} identity`);
    }
    appendCollectionItemAction(next, owner.binding, label, token, owner.path);
    return { document: next, path: variantPath, label,
      changedPaths: [`/${[...owner.path, "items"].join("/")}`, "/x-fullmeta-ui-tree", `/${GENERATED_FIELDS_KEY}`] };
  }

  throw new Error("Choose a supported schema authoring operation.");
}

function optionalBound(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
  return number;
}

function optionalCount(value, label) {
  const number = optionalBound(value, label);
  if (number !== undefined && (!Number.isInteger(number) || number < 0)) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return number;
}

function enumValues(kind, text) {
  const lines = String(text || "").split(/[\r\n,]+/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return undefined;
  if (!["string", "number", "integer", "boolean", "null"].includes(kind)) {
    throw new Error("Choose a scalar type before entering choices.");
  }
  const values = lines.map((line, index) => {
    if (kind === "string") return line;
    if (kind === "boolean") {
      if (line !== "true" && line !== "false") throw new Error(`Choice ${index + 1} must be true or false.`);
      return line === "true";
    }
    if (kind === "null") {
      if (line !== "null") throw new Error(`Choice ${index + 1} must be null.`);
      return null;
    }
    const number = Number(line);
    if (!Number.isFinite(number)) throw new Error(`Choice ${index + 1} must be a finite number.`);
    if (kind === "integer" && !Number.isInteger(number)) throw new Error(`Choice ${index + 1} must be an integer.`);
    return number;
  });
  if (new Set(values.map(value => JSON.stringify(value))).size !== values.length) {
    throw new Error("Choices must be unique.");
  }
  return values;
}

export function editSchemaStructure(value, { action, path = [], name, kind, declarationKind, required = false,
  title = "", description = "", reference = "", referenceChoice = "", choices = "", minimum = "", maximum = "",
  minLength = "", maxLength = "", minItems = "", maxItems = "" } = {}) {
  if (!Array.isArray(path)) throw new Error("The JSON path is invalid.");
  const next = structuredClone(value);
  if (action === "add-schema-declaration") {
    const key = propertyName(name);
    if (kind && !["object", "array", "string", "number", "integer", "boolean", "null"].includes(kind)) {
      throw new Error("Choose a JSON Schema type or leave it unspecified.");
    }
    if (referenceChoice.trim() && reference.trim()) throw new Error("Choose either a listed definition or a custom reference.");
    const resolvedReference = referenceChoice.trim() || reference.trim();
    if (kind && resolvedReference) throw new Error("Choose either a type or a reference for this declaration.");
    const declaration = {};
    if (kind) declaration.type = kind;
    if (resolvedReference) declaration.$ref = resolvedReference;
    if (title.trim()) declaration.title = title.trim();
    if (description.trim()) declaration.description = description.trim();
    const choicesList = enumValues(kind, choices);
    if (choicesList) declaration.enum = choicesList;
    const min = optionalBound(minimum, "Minimum"), max = optionalBound(maximum, "Maximum");
    if ((min !== undefined || max !== undefined) && !["number", "integer"].includes(kind)) {
      throw new Error("Minimum and maximum are available for number and integer properties.");
    }
    if (min !== undefined && max !== undefined && min > max) throw new Error("Minimum cannot be greater than maximum.");
    if (min !== undefined) declaration.minimum = min;
    if (max !== undefined) declaration.maximum = max;
    const minChars = optionalCount(minLength, "Minimum length"), maxChars = optionalCount(maxLength, "Maximum length");
    if ((minChars !== undefined || maxChars !== undefined) && kind !== "string") {
      throw new Error("Length limits are available for string properties.");
    }
    if (minChars !== undefined && maxChars !== undefined && minChars > maxChars) throw new Error("Minimum length cannot be greater than maximum length.");
    if (minChars !== undefined) declaration.minLength = minChars;
    if (maxChars !== undefined) declaration.maxLength = maxChars;
    const minCount = optionalCount(minItems, "Minimum items"), maxCount = optionalCount(maxItems, "Maximum items");
    if ((minCount !== undefined || maxCount !== undefined) && kind !== "array") {
      throw new Error("Item limits are available for array properties.");
    }
    if (minCount !== undefined && maxCount !== undefined && minCount > maxCount) throw new Error("Minimum items cannot be greater than maximum items.");
    if (minCount !== undefined) declaration.minItems = minCount;
    if (maxCount !== undefined) declaration.maxItems = maxCount;
    if (declarationKind === "definitions") {
      if (!isObject(next) || Object.hasOwn(next, key)) throw new Error(`Definition ${key} already exists.`);
      next[key] = declaration;
      return next;
    }
    if (declarationKind !== "schema" || !isObject(next)) throw new Error("Select a schema declaration.");
    if (next.properties !== undefined && !isObject(next.properties)) throw new Error("The properties keyword must be an object.");
    if (next.required !== undefined && (!Array.isArray(next.required) || next.required.some(item => typeof item !== "string"))) {
      throw new Error("The required keyword must be a list of property names.");
    }
    if (Object.hasOwn(next.properties || {}, key)) throw new Error(`Property ${key} already exists.`);
    next.properties ??= {};
    next.properties[key] = declaration;
    if (required && !next.required?.includes(key)) (next.required ??= []).push(key);
    return next;
  }
  if (action === "add-property") {
    const owner = memberAt(next, path), key = propertyName(name);
    if (!isObject(owner)) throw new Error("Select an object to add a property.");
    if (Object.hasOwn(owner, key)) throw new Error(`Property ${key} already exists.`);
    Object.defineProperty(owner, key, {
      value: initialValue(kind), enumerable: true, writable: true, configurable: true,
    });
    return next;
  }
  if (action === "add-item") {
    const owner = memberAt(next, path);
    if (!Array.isArray(owner)) throw new Error("Select an array to add an item.");
    owner.push(initialValue(kind));
    return next;
  }
  if (!path.length) throw new Error("The document root cannot be renamed or removed.");
  const ownerPath = path.slice(0, -1), key = path.at(-1), owner = memberAt(next, ownerPath);
  if (!Array.isArray(owner) && !isObject(owner) || !Object.hasOwn(owner, key)) {
    throw new Error("The selected JSON member no longer exists.");
  }
  if (action === "remove") {
    if (Array.isArray(owner)) owner.splice(key, 1);
    else delete owner[key];
    return next;
  }
  if (action === "rename") {
    if (!isObject(owner)) throw new Error("Only object properties can be renamed.");
    const replacement = propertyName(name);
    if (replacement === key) return value;
    if (Object.hasOwn(owner, replacement)) throw new Error(`Property ${replacement} already exists.`);
    const renamed = Object.fromEntries(Object.entries(owner).map(([oldKey, entry]) =>
      [oldKey === key ? replacement : oldKey, entry]));
    if (!ownerPath.length) return renamed;
    const parent = memberAt(next, ownerPath.slice(0, -1));
    parent[ownerPath.at(-1)] = renamed;
    return next;
  }
  throw new Error("Unknown JSON structure action.");
}

/** Duplicate one anchored member inside the same JSON document. */
export function duplicateSchemaMember(document, path) {
  if (!Array.isArray(path) || !path.length) throw new Error("Select a schema tree item to duplicate.");
  const next = structuredClone(document);
  const owner = memberAt(next, path.slice(0, -1));
  const key = path.at(-1);
  if ((!Array.isArray(owner) && !isObject(owner)) || !Object.hasOwn(owner, key)) {
    throw new Error("The selected schema tree item no longer exists.");
  }
  const original = owner[key];
  if (!original || typeof original !== "object") throw new Error("Select an object or array declaration to duplicate.");
  if (isObject(original) && typeof original.$id === "string") {
    throw new Error("This declaration has its own $id. Create a new declaration and choose a new identifier.");
  }
  const copy = structuredClone(original);
  if (Array.isArray(owner)) {
    if (!Number.isInteger(key)) throw new Error("The array item path is invalid.");
    owner.splice(key + 1, 0, copy);
    return { document: next, path: [...path.slice(0, -1), key + 1], label: `Item ${key + 2}` };
  }
  let newKey = `${key}Copy`, index = 2;
  while (Object.hasOwn(owner, newKey)) newKey = `${key}Copy${index++}`;
  const replacement = Object.fromEntries(Object.entries(owner).flatMap(([entryKey, value]) =>
    entryKey === key ? [[entryKey, value], [newKey, copy]] : [[entryKey, value]]));
  if (path.length === 1) return { document: replacement, path: [newKey], label: newKey };
  const grandparent = memberAt(next, path.slice(0, -2));
  grandparent[path.at(-2)] = replacement;
  if (path.at(-2) === "properties" && Array.isArray(grandparent.required)
    && grandparent.required.includes(key) && !grandparent.required.includes(newKey)) {
    grandparent.required.push(newKey);
  }
  return { document: next, path: [...path.slice(0, -1), newKey], label: newKey };
}

/** Change only the displayed title; the JSON key and references stay stable. */
export function schemaWithRenamedTitle(document, path, title) {
  if (!Array.isArray(path)) throw new Error("Select a schema tree item to rename.");
  const nextTitle = typeof title === "string" ? title.trim() : "";
  if (!nextTitle) throw new Error("A tree item title cannot be empty.");
  const next = structuredClone(document);
  const declaration = memberAt(next, path);
  if (!isObject(declaration)) throw new Error("Only object declarations have a title.");
  declaration.title = nextTitle;
  const registry = next[GENERATED_FIELDS_KEY];
  for (const entry of registry?.fields || []) {
    if (equalPath(entry.owner?.path, path)
      && entry.owner?.input === "standard project-tree binding") {
      const generated = pathAt(next, entry.path);
      if (isObject(generated)) generated.title = nextTitle;
    }
  }
  const variantToken = Object.values(declaration.properties || {})
    .find(property => typeof property?.const === "string")?.const;
  const collectionPath = path.at(-2) === "oneOf" ? path.slice(0, -3)
    : path.at(-1) === "items" ? path.slice(0, -1) : null;
  if (variantToken && collectionPath) for (const entry of registry?.fields || []) {
    if (!equalPath(entry.owner?.path, collectionPath)
      || !entry.owner?.input?.startsWith(`item kind ${variantToken}`)) continue;
    const generated = pathAt(next, entry.path);
    if (isObject(generated) && typeof generated.action === "string" && typeof generated.label === "string") {
      generated.label = `Add ${nextTitle}`;
    }
  }
  return { document: next, path: [...path], label: nextTitle };
}

/**
 * Explain why a schema-document tree wrapper cannot be removed by promoting
 * its children into the wrapper's parent level.
 */
export function schemaTreePromotionIssue(document, descriptorPath) {
  if (!Array.isArray(descriptorPath) || descriptorPath.length < 3
    || descriptorPath[0] !== "x-fullmeta-ui-tree" || descriptorPath[1] !== "children"
    || !Number.isInteger(descriptorPath.at(-1))) {
    return "Select a project-tree group or object root.";
  }
  let descriptor, siblings;
  try {
    descriptor = memberAt(document, descriptorPath);
    siblings = memberAt(document, descriptorPath.slice(0, -1));
  } catch { return "The selected project-tree level no longer exists."; }
  if (!Array.isArray(siblings) || !isObject(descriptor)
    || !Array.isArray(descriptor.path) || !Array.isArray(descriptor.children)) {
    return "Only a project-tree group or object root with children can be flattened.";
  }
  if (descriptor.role && descriptor.role !== "objectRoot") {
    return "Only display groups and object roots can be flattened.";
  }
  if (!descriptor.children.length) return "This tree level has no children to promote.";
  if (descriptor.children.some(child => !isObject(child) || !Array.isArray(child.path))) {
    return "Every child must have a project-tree path before it can be promoted.";
  }
  return "";
}

/** Move one schema-document tree wrapper's children up a level via a guided action. */
export function schemaWithPromotedTreeChildren(document, descriptorPath) {
  const issue = schemaTreePromotionIssue(document, descriptorPath);
  if (issue) throw new Error(issue);
  const next = structuredClone(document);
  const descriptor = memberAt(next, descriptorPath);
  const siblingsPath = descriptorPath.slice(0, -1);
  const siblings = memberAt(next, siblingsPath);
  const index = descriptorPath.at(-1);
  const prefix = descriptor.path;
  const promoted = descriptor.children.map(child => ({
    ...child,
    path: [...prefix, ...child.path],
  }));
  const descriptorChildrenPath = [...descriptorPath, "children"];
  const registry = next[GENERATED_FIELDS_KEY];
  if (Array.isArray(registry?.fields)) {
    const remapped = [];
    for (const entry of registry.fields) {
      const path = entry.path;
      if (equalPath(path, descriptorPath)) continue;
      if (pathStartsWith(path, descriptorChildrenPath)) {
        const childIndex = path[descriptorChildrenPath.length];
        if (Number.isInteger(childIndex)) {
          entry.path = [...siblingsPath, index + childIndex, ...path.slice(descriptorChildrenPath.length + 1)];
        }
      } else if (pathStartsWith(path, siblingsPath)
        && path.length > siblingsPath.length
        && Number.isInteger(path[siblingsPath.length]) && path[siblingsPath.length] > index) {
        entry.path[siblingsPath.length] += promoted.length - 1;
      }
      remapped.push(entry);
    }
    registry.fields = remapped;
  }
  siblings.splice(index, 1, ...promoted);
  return {
    document: next,
    path: [],
    label: descriptor.title || descriptor.role || "tree level",
    promotedCount: promoted.length,
  };
}

/** Explain why a tree descriptor cannot be shifted one place in its siblings. */
export function schemaTreeMoveIssue(document, descriptorPath, direction) {
  if (!Array.isArray(descriptorPath) || descriptorPath.length < 3
    || descriptorPath[0] !== "x-fullmeta-ui-tree" || descriptorPath[1] !== "children"
    || !Number.isInteger(descriptorPath.at(-1)) || !["up", "down"].includes(direction)) {
    return "Select a project-tree item to move.";
  }
  let siblings;
  try { siblings = memberAt(document, descriptorPath.slice(0, -1)); }
  catch { return "The selected project-tree level no longer exists."; }
  const index = descriptorPath.at(-1), nextIndex = index + (direction === "up" ? -1 : 1);
  if (!Array.isArray(siblings) || !isObject(siblings[index])) return "The selected project-tree item no longer exists.";
  if (nextIndex < 0 || nextIndex >= siblings.length) return `This tree item is already at the ${direction === "up" ? "top" : "bottom"} of its level.`;
  return "";
}

/** Reorder one project-tree descriptor and keep generated bindings anchored. */
export function schemaWithMovedTreeItem(document, descriptorPath, direction) {
  const issue = schemaTreeMoveIssue(document, descriptorPath, direction);
  if (issue) throw new Error(issue);
  const next = structuredClone(document);
  const siblingsPath = descriptorPath.slice(0, -1);
  const siblings = memberAt(next, siblingsPath);
  const from = descriptorPath.at(-1), to = from + (direction === "up" ? -1 : 1);
  const [moving] = siblings.splice(from, 1);
  siblings.splice(to, 0, moving);
  for (const entry of next[GENERATED_FIELDS_KEY]?.fields || []) {
    const path = entry.path;
    if (!pathStartsWith(path, siblingsPath) || !Number.isInteger(path[siblingsPath.length])) continue;
    if (path[siblingsPath.length] === from) path[siblingsPath.length] = to;
    else if (path[siblingsPath.length] === to) path[siblingsPath.length] = from;
  }
  return { document: next, path: [], label: moving.title || moving.role || "tree item", direction };
}

const pathStartsWith = (path, prefix) => prefix.length <= path.length
  && prefix.every((part, index) => path[index] === part);

function shiftGeneratedPathAfterRemoval(registry, arrayPath, index) {
  if (!Array.isArray(registry?.fields)) return;
  const shift = path => {
    if (!Array.isArray(path) || path.length <= arrayPath.length
      || !arrayPath.every((part, position) => path[position] === part)
      || !Number.isInteger(path[arrayPath.length]) || path[arrayPath.length] <= index) return;
    path[arrayPath.length]--;
  };
  for (const entry of registry.fields) { shift(entry.path); shift(entry.owner?.path); }
}

function deleteAtPath(document, path, registry) {
  const parentPath = path.slice(0, -1), key = path.at(-1);
  let parent;
  try { parent = memberAt(document, parentPath); } catch { return; }
  if (Array.isArray(parent) && Number.isInteger(key) && key >= 0 && key < parent.length) {
    parent.splice(key, 1);
    shiftGeneratedPathAfterRemoval(registry, parentPath, key);
  } else if (isObject(parent)) delete parent[key];
}

/** Explain why a projected schema declaration cannot be removed. */
export function schemaTreeDeleteIssue(document, path) {
  if (!Array.isArray(path) || !path.length) return "The schema document root cannot be deleted.";
  let declaration, owner;
  try {
    declaration = memberAt(document, path);
    owner = memberAt(document, path.slice(0, -1));
  } catch { return "The selected schema tree item no longer exists."; }
  if (!isSchemaTreeDeclaration(document, path) || !isObject(declaration)) {
    return "Only schema declarations can be deleted; tree headings are presentation groups.";
  }
  if (Array.isArray(owner) && ["allOf", "anyOf", "oneOf"].includes(path.at(-2))
    && owner.length === 1) {
    return "The last alternative cannot be deleted. Delete its parent declaration instead.";
  }
  const visit = (value, sourcePath = []) => {
    if (!value || typeof value !== "object" || pathStartsWith(sourcePath, path)) return false;
    if (isObject(value) && typeof value.$ref === "string") {
      const referencePath = localReferencePath(value.$ref);
      if (referencePath && pathStartsWith(referencePath, path)) return true;
    }
    return Object.entries(value).some(([key, child]) =>
      visit(child, [...sourcePath, Array.isArray(value) ? Number(key) : key]));
  };
  if (visit(document)) return "This declaration is referenced elsewhere in the schema. Remove those references first.";
  return "";
}

/** Remove a declaration and any tree presentation entry anchored to it. */
export function schemaWithDeletedTreeItem(document, path) {
  const issue = schemaTreeDeleteIssue(document, path);
  if (issue) throw new Error(issue);
  const next = structuredClone(document);
  const registry = next[GENERATED_FIELDS_KEY];
  const deletedDeclaration = memberAt(next, path);
  const variantToken = Object.values(deletedDeclaration?.properties || {})
    .find(property => typeof property?.const === "string")?.const;
  const variantOwnerPath = variantToken && path.at(-2) === "oneOf" ? path.slice(0, -3)
    : variantToken && path.at(-1) === "items" ? path.slice(0, -1) : null;
  const ownedEntries = new Set((registry?.fields || []).filter(entry =>
    pathStartsWith(entry.owner?.path || [], path) || pathStartsWith(entry.path || [], path)
    || (variantToken && Array.isArray(variantOwnerPath)
      && equalPath(entry.owner?.path, variantOwnerPath)
      && entry.owner?.input?.startsWith(`item kind ${variantToken}`))));
  const externalGeneratedPaths = [...ownedEntries]
    .map(entry => entry.path)
    .filter(generatedPath => !pathStartsWith(generatedPath, path))
    .sort((left, right) => {
      const limit = Math.min(left.length, right.length);
      for (let index = 0; index < limit; index++) {
        if (left[index] === right[index]) continue;
        if (typeof left[index] === "number" && typeof right[index] === "number") return right[index] - left[index];
        return String(right[index]).localeCompare(String(left[index]));
      }
      return right.length - left.length;
    });
  for (const generatedPath of externalGeneratedPaths) deleteAtPath(next, generatedPath, registry);
  const owner = memberAt(next, path.slice(0, -1));
  const key = path.at(-1);
  const title = memberAt(next, path).title || String(key);
  if (Array.isArray(owner)) {
    owner.splice(key, 1);
    shiftGeneratedPathAfterRemoval(registry, path.slice(0, -1), key);
  }
  else delete owner[key];
  if (path.at(-2) === "properties") {
    const declaration = memberAt(next, path.slice(0, -2));
    if (Array.isArray(declaration.required)) {
      declaration.required = declaration.required.filter(name => name !== key);
      if (!declaration.required.length) delete declaration.required;
    }
  }
  const tree = next["x-fullmeta-ui-tree"];
  const prune = (entries, binding = [], entriesPath = ["x-fullmeta-ui-tree", "children"]) => {
    if (!Array.isArray(entries)) return;
    for (let index = entries.length - 1; index >= 0; index--) {
      const entry = entries[index];
      if (!isObject(entry)) continue;
      const nextBinding = [...binding, ...(Array.isArray(entry.path) ? entry.path : [])];
      let declarationPath;
      try { declarationPath = schemaAtPropertyPath(document, nextBinding); }
      catch { /* Keep unrelated or unresolved presentation entries. */ }
      if (declarationPath && pathStartsWith(declarationPath, path)) {
        entries.splice(index, 1);
        shiftGeneratedPathAfterRemoval(registry, entriesPath, index);
      } else prune(entry.children, nextBinding, [...entriesPath, index, "children"]);
    }
  };
  prune(tree?.children);
  if (registry?.fields) {
    registry.fields = registry.fields.filter(entry => !ownedEntries.has(entry));
    if (!registry.fields.length) delete next[GENERATED_FIELDS_KEY];
  }
  return { document: next, path: [], label: "Document settings", deletedLabel: title };
}

const newTreeItem = () => ({ title: "New item", type: "object", properties: {} });
const treeChildBehavior = () => ({
  format: "fullmeta-ui-behavior/1",
  target: { kind: "field" },
  context: "projectEditing",
  payload: { widget: { type: "tree", settings: { role: "children" } } },
});

function unusedKey(owner) {
  let key = "newItem", index = 2;
  while (Object.hasOwn(owner, key)) key = `newItem${index++}`;
  return key;
}

function localReferencePath(reference) {
  if (typeof reference !== "string" || !reference.startsWith("#/")) return null;
  try {
    return reference.slice(2).split("/").map(part =>
      decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~"));
  } catch { return null; }
}

function schemaAtPropertyPath(document, keys) {
  let path = [];
  for (const key of keys) {
    let declaration = memberAt(document, path);
    const visited = new Set();
    while (isObject(declaration) && typeof declaration.$ref === "string") {
      const referencePath = localReferencePath(declaration.$ref);
      if (!referencePath) throw new Error("Add item needs a local schema declaration.");
      const identity = JSON.stringify(referencePath);
      if (visited.has(identity)) throw new Error("The schema reference is recursive.");
      visited.add(identity);
      path = referencePath;
      declaration = memberAt(document, path);
    }
    if (!isObject(declaration?.properties) || !Object.hasOwn(declaration.properties, key)) {
      throw new Error(`The schema has no property named ${key}.`);
    }
    path = [...path, "properties", key];
  }
  let declaration = memberAt(document, path);
  const visited = new Set();
  while (isObject(declaration) && typeof declaration.$ref === "string") {
    const referencePath = localReferencePath(declaration.$ref);
    if (!referencePath) throw new Error("Add item needs a local schema declaration.");
    const identity = JSON.stringify(referencePath);
    if (visited.has(identity)) throw new Error("The schema reference is recursive.");
    visited.add(identity);
    path = referencePath;
    declaration = memberAt(document, path);
  }
  return path;
}

/** Nested $defs maps can contain declarations more deeply than one level. */
export function isSchemaTreeDeclaration(document, path) {
  if (!Array.isArray(path)) return false;
  const value = memberAt(document, path);
  if (!isObject(value)) return false;
  if (typeof path[0] === "string" && path[0].startsWith("x-fullmeta-ui-")) return false;
  if (schemaDeclarationScope(path) === "schema") return true;
  return path.includes("$defs") && [
    "type", "properties", "$ref", "allOf", "anyOf", "oneOf", "items", "additionalProperties",
  ].some(key => Object.hasOwn(value, key));
}

/** Add a minimal, optional child declaration beneath a schema tree item. */
export function schemaWithAddedChildItem(document, path) {
  if (!Array.isArray(path)) throw new Error("Select a schema tree item to add beneath.");
  const next = structuredClone(document);
  const selected = memberAt(next, path);
  if (!isObject(selected)) throw new Error("Add item needs an object declaration.");

  // A descriptor group is a tree heading. Its child must also have a real
  // schema property so the project document has somewhere to store the value.
  if (Array.isArray(selected.path) && Array.isArray(selected.children) && !selected.role) {
    const ownerPath = schemaAtPropertyPath(next, selected.path);
    const owner = memberAt(next, ownerPath);
    owner.properties ??= {};
    if (!isObject(owner.properties)) throw new Error("The parent properties must be an object.");
    const key = unusedKey(owner.properties);
    owner.properties[key] = newTreeItem();
    selected.children.push({ path: [key], role: "objectRoot" });
    return { document: next, path: [...ownerPath, "properties", key], label: "New item" };
  }

  if (!isSchemaTreeDeclaration(next, path)) {
    throw new Error("Add item needs a schema declaration or a schema tree group.");
  }

  if (selected.type === "array") {
    if (selected.items !== undefined || selected.prefixItems !== undefined) {
      throw new Error("This collection already has an item declaration. Add another item kind with an explicit discriminator after the guided collection-item authoring flow is available; automatic anyOf composition is unsupported.");
    }
    const child = newTreeItem();
    selected.items = child;
    return { document: next, path: [...path, "items"], label: "New item" };
  }

  if (selected.type && selected.type !== "object") {
    throw new Error("Add item needs an object or array declaration.");
  }
  if (selected.properties !== undefined && !isObject(selected.properties)) {
    throw new Error("The parent properties must be an object.");
  }
  selected.properties ??= {};
  const key = unusedKey(selected.properties);
  const child = newTreeItem();
  // The same declaration drives schema navigation and, when instantiated,
  // the project tree. An absent optional child changes no existing model.
  child["x-fullmeta-ui-behavior"] = treeChildBehavior();
  selected.properties[key] = child;
  if (!path.length && isObject(next["x-fullmeta-ui-tree"])) {
    (next["x-fullmeta-ui-tree"].children ??= []).push({ path: [key], role: "objectRoot" });
  }
  return { document: next, path: [...path, "properties", key], label: "New item" };
}

/** Keep a schema node's required list aligned with edits to its properties map. */
export function schemaWithEditedProperties(schema, properties, { action, from, to } = {}) {
  if (!isObject(schema) || !isObject(properties)) throw new Error("Select a schema property map.");
  const next = structuredClone(schema);
  next.properties = structuredClone(properties);
  if (Array.isArray(next.required)) {
    if (action === "rename") next.required = next.required.map(key => key === from ? to : key);
    else if (action === "remove") next.required = next.required.filter(key => key !== from);
    if (!next.required.length) delete next.required;
  }
  return next;
}
