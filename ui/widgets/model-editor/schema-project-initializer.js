import { schemaGeneratedOwnershipIssue } from "./schema-structure-authoring.js";

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => structuredClone(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const pathPrefix = (left, right) => left.length <= right.length
  && left.every((part, index) => String(part) === String(right[index]));

function localReferencePath(reference) {
  if (typeof reference !== "string" || !reference.startsWith("#/")) return null;
  return reference.slice(2).split("/").map(part => decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~"));
}

function at(root, path) {
  return path.reduce((value, part) => value?.[part], root);
}

function resolveLocal(schema, declaration, seen = new Set()) {
  if (!isRecord(declaration) || typeof declaration.$ref !== "string") return declaration;
  const path = localReferencePath(declaration.$ref);
  if (!path) throw new Error(`Guided creation needs a local $ref; could not resolve ${declaration.$ref}.`);
  const identity = JSON.stringify(path);
  if (seen.has(identity)) throw new Error(`Recursive $ref ${declaration.$ref} cannot be initialized automatically.`);
  return resolveLocal(schema, at(schema, path), new Set([...seen, identity]));
}

function effectiveObject(schema, declaration) {
  const resolved = resolveLocal(schema, declaration);
  if (!isRecord(resolved)) return resolved;
  const branches = Array.isArray(resolved.allOf)
    ? resolved.allOf.map(branch => effectiveObject(schema, branch)).filter(isRecord) : [];
  if (!branches.length) return resolved;
  const properties = Object.assign({}, ...branches.map(branch => branch.properties || {}), resolved.properties || {});
  const required = [...new Set([...branches.flatMap(branch => branch.required || []), ...(resolved.required || [])])];
  return { ...Object.assign({}, ...branches, resolved), properties, required };
}

function schemaDefaultValue(schema, declaration, options = {}, field = "") {
  const { projectId = "", makeId, makeName, arrayPath = [], variant = null,
    isRoot = true, itemTemplate = false, generatedIds = new Set(), depth = 0 } = options;
  if (depth > 32) throw new Error(`The ${field || "item"} declaration is recursive; declare a default or choose its child kind explicitly.`);
  const resolved = effectiveObject(schema, declaration);
  if (resolved === true || resolved === false) return resolved === true ? undefined : undefined;
  if (!isRecord(resolved)) return undefined;
  if (own(resolved, "const")) return clone(resolved.const);
  // A local $ref may carry its own default. That value belongs to this use of
  // the definition, rather than to every other reference to the definition.
  if (isRecord(declaration) && own(declaration, "default")) return clone(declaration.default);
  if (own(resolved, "default")) return clone(resolved.default);
  if (Array.isArray(resolved.enum) && resolved.enum.length) return clone(resolved.enum[0]);
  if (Array.isArray(resolved.oneOf) && resolved.oneOf.length) {
    let selected = variant === null ? null : resolved.oneOf.find(candidate =>
      containsConstant(schema, candidate, variant) || candidate?.$ref === `#/$defs/${variant}`);
    selected ||= resolved.oneOf.length === 1 ? resolved.oneOf[0] : null;
    if (!selected) return undefined;
    // The requested variant selects this collection item only. Carrying it to
    // nested choice arrays would repeatedly select the parent kind.
    return schemaDefaultValue(schema, selected, { ...options, variant: null, depth: depth + 1 }, field);
  }
  const type = Array.isArray(resolved.type) ? resolved.type.find(entry => entry !== "null") : resolved.type;
  if (type === "object" || isRecord(resolved.properties)) {
    const output = {};
    const required = new Set(resolved.required || []);
    const itemType = effectiveObject(schema, resolved.properties?.type)?.const;
    const identityStem = typeof itemType === "string" ? itemType : variant || field || "item";
    const itemName = resolved.title || (typeof itemType === "string" ? itemType : variant || field || "Item")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[._-]+/g, " ")
      .replace(/^./, first => first.toUpperCase());
    for (const [key, property] of Object.entries(resolved.properties || {})) {
      const itemSchema = effectiveObject(schema, property);
      let value;
      const declaredValue = own(property, "default") || own(itemSchema, "default")
        || own(property, "const") || own(itemSchema, "const")
        || Array.isArray(property?.enum) && property.enum.length
        || Array.isArray(itemSchema?.enum) && itemSchema.enum.length;
      if (itemTemplate && required.has(key) && !declaredValue && key === "id"
        && itemSchema?.type === "string" && typeof makeId === "function") {
        let stem = identityStem, candidate = makeId(stem), suffix = 2;
        while (generatedIds.has(candidate)) candidate = makeId(`${stem}_${suffix++}`);
        generatedIds.add(candidate);
        value = candidate;
      } else if (itemTemplate && required.has(key) && !declaredValue && key === "name"
        && itemSchema?.type === "string" && typeof makeName === "function") {
        value = makeName(arrayPath, itemName);
      } else if (itemSchema?.readOnly === true && key === "id") {
        value = isRoot ? projectId || makeId?.("project") : makeId?.(key);
      } else if (itemSchema?.readOnly === true && key === "name") {
        value = isRoot ? projectId || "Project"
          : arrayPath.length ? makeName?.(arrayPath, itemSchema.title || "Item") : itemSchema.title || "Item";
      } else if (required.has(key) || own(property, "default") || own(property, "const")
        || own(itemSchema, "default") || own(itemSchema, "const")
        || (Array.isArray(itemSchema?.enum) && itemSchema.enum.length)) {
        value = schemaDefaultValue(schema, property, { ...options, isRoot: false,
          itemTemplate, generatedIds, variant: null, depth: depth + 1 }, key);
      }
      if (value !== undefined) output[key] = value;
    }
    return output;
  }
  if (type === "array") {
    if (!itemTemplate || !Number.isInteger(resolved.minItems) || resolved.minItems < 1) return [];
    if (resolved.minItems > 64) throw new Error("This item needs more than 64 required array entries; declare an item default.");
    const items = Array.isArray(resolved.prefixItems) ? resolved.prefixItems : null;
    if (!items && !resolved.items) throw new Error(`The required ${field || "item"} array needs an item schema or default.`);
    // A collection of alternative child kinds cannot be populated without a
    // user choice. Let the editor create the parent as a draft, then add or
    // move children through the tree before validation and saving.
    if (!items && effectiveObject(schema, resolved.items)?.oneOf?.length > 1) return [];
    return Array.from({ length: resolved.minItems }, (_, index) => {
      const itemDeclaration = items?.[index] || resolved.items;
      if (!itemDeclaration) throw new Error(`The required ${field || "item"} array needs a declaration for entry ${index + 1}.`);
      const item = schemaDefaultValue(schema, itemDeclaration,
        { ...options, isRoot: false, itemTemplate, generatedIds, variant: null, depth: depth + 1 }, `${field}[${index + 1}]`);
      if (item === undefined) throw new Error(`The required ${field || "item"} array cannot initialize entry ${index + 1}; declare an item default.`);
      return item;
    });
  }
  if (type === "string") return "";
  if (type === "number" || type === "integer") {
    if (typeof resolved.minimum === "number") return resolved.minimum;
    if (typeof resolved.maximum === "number" && resolved.maximum < 0) return resolved.maximum;
    return 0;
  }
  if (type === "boolean") return false;
  if (type === "null") return null;
  return undefined;
}

function containsConstant(schema, declaration, token, seen = new Set()) {
  const resolved = resolveLocal(schema, declaration);
  if (!isRecord(resolved)) return false;
  if (Object.values(resolved.properties || {}).some(property => property?.const === token)) return true;
  if (Array.isArray(resolved.allOf)) return resolved.allOf.some(branch => containsConstant(schema, branch, token, seen));
  return false;
}

/** Build a new collection instance from its current item schema and variant token. */
export function schemaItemTemplateFactory(schema, modelEditorSchema, helpers) {
  const collection = modelEditorSchema.schemaAtPath(helpers.model, helpers.destinationPath,
    { resolveVariant: false }, schema);
  const effectiveCollection = effectiveObject(schema, collection);
  const itemDeclaration = effectiveCollection?.items;
  if (!itemDeclaration || itemDeclaration === true) {
    throw new Error("This collection has no object item kind to create.");
  }
  const itemValue = schemaDefaultValue(schema, itemDeclaration, {
    makeId: helpers.makeId,
    makeName: helpers.makeName,
    arrayPath: helpers.destinationPath,
    variant: helpers.variant,
    isRoot: false,
    itemTemplate: true,
  });
  if (!isRecord(itemValue)) throw new Error(`Could not initialize item kind ${helpers.variant || "item"} from the schema.`);
  return itemValue;
}

function creationIssue(schema, declaration, path = "#", seen = new Set()) {
  const resolved = effectiveObject(schema, declaration);
  if (!isRecord(resolved)) return "";
  const identity = resolved.$ref || null;
  if (identity && seen.has(identity)) return `${path} has a recursive $ref.`;
  const nextSeen = identity ? new Set([...seen, identity]) : seen;
  if (Array.isArray(resolved.oneOf) && resolved.oneOf.length > 1) {
    return `${path} has multiple alternatives; automatic project creation needs one unambiguous declaration or a registered initializer.`;
  }
  if (Array.isArray(resolved.oneOf) && resolved.oneOf.length === 1) {
    const issue = creationIssue(schema, resolved.oneOf[0], path, nextSeen);
    if (issue) return issue;
  }
  const required = new Set(resolved.required || []);
  for (const [key, property] of Object.entries(resolved.properties || {})) {
    const field = effectiveObject(schema, property);
    const fieldPath = `${path}/properties/${key}`;
    if (!required.has(key) && !own(field, "default") && !own(field, "const")
      && !(Array.isArray(field?.enum) && field.enum.length)) continue;
    if (path === "#" && key === "x-fullmeta-schema") continue;
    if (field?.readOnly === true && ["id", "name"].includes(key)) continue;
    if (own(field, "default") || own(field, "const") || (Array.isArray(field?.enum) && field.enum.length)) continue;
    if (field?.type === "object" || isRecord(field?.properties)) {
      const issue = creationIssue(schema, field, fieldPath, nextSeen);
      if (issue) return issue;
      continue;
    }
    if (field?.type === "array") {
      if (required.has(key) && (field.minItems || 0) > 0) {
        return `${fieldPath} requires at least ${field.minItems} items; declare a default or registered initializer that supplies them.`;
      }
      continue;
    }
    return `${fieldPath} is required but has no default, constant, choice, object initializer, or generated identity.`;
  }
  return "";
}

function genericProjectRootContractIssue(schema) {
  if (!isRecord(schema)) return "The project schema root must be an object.";
  const applicationId = schema.properties?.application?.const;
  if (typeof applicationId !== "string" || !/^[a-z][a-z0-9-]{0,47}$/.test(applicationId)) {
    return "Declare properties.application.const as the model's stable application identifier before creating a project.";
  }
  const reference = effectiveObject(schema, schema.properties?.["x-fullmeta-schema"]);
  if (!own(schema.properties, "x-fullmeta-schema") && schema.additionalProperties === false) {
    return "The schema forbids x-fullmeta-schema and does not declare it as a project field. Add a string schema property for the schema reference.";
  }
  if (own(schema.properties, "x-fullmeta-schema") && reference?.type !== "string") {
    return "Declare properties.x-fullmeta-schema as a string so the project can point back to this schema file.";
  }
  if (own(reference || {}, "const")) {
    return "properties.x-fullmeta-schema must not have a fixed const; its relative path depends on the new project's folder.";
  }
  return "";
}

export function genericProjectCreationIssue(schema) {
  const rootIssue = genericProjectRootContractIssue(schema);
  if (rootIssue) return rootIssue;
  return creationIssue(schema, schema);
}

/** Initialize required fields and declared defaults without assuming domain values. */
export function createSchemaBasedProject(schema, { projectId, schemaReference, makeId, makeName } = {}) {
  const issue = genericProjectCreationIssue(schema);
  if (issue) throw new Error(issue);
  const value = schemaDefaultValue(schema, schema, { projectId, makeId, makeName });
  if (!isRecord(value)) throw new Error("The project schema root must initialize to an object.");
  if (own(schema.properties, "x-fullmeta-schema") || schema.additionalProperties !== false) {
    value["x-fullmeta-schema"] = schemaReference;
  }
  if (typeof schema.properties?.application?.const === "string") {
    value.application = schema.properties.application.const;
  }
  return value;
}

export function genericProjectEditingIssue(schema) {
  const descriptor = schema?.["x-fullmeta-ui-tree"];
  const hasBinding = entries => Array.isArray(entries) && entries.some(entry =>
    isRecord(entry) && (typeof entry.role === "string" || hasBinding(entry.children)));
  if (!isRecord(descriptor) || !hasBinding(descriptor.children)) return "Add at least one project tree binding under x-fullmeta-ui-tree.children.";
  const seen = new Map();
  const visit = (entries, binding = [], parentRole = "") => {
    for (const entry of entries || []) {
      if (!isRecord(entry)) continue;
      const next = [...binding, ...(Array.isArray(entry.path) ? entry.path : [])];
      if (typeof entry.role === "string") {
        const key = JSON.stringify(next);
        // An object root may delegate either its entries or its property view
        // to an empty-path child. These are nested presentation roles over the
        // same object, not a second independent binding.
        const delegatedObjectView = ["objectEntries", "objectProperties"].includes(entry.role)
          && parentRole === "objectRoot"
          && Array.isArray(entry.path) && entry.path.length === 0
          && seen.get(key) === "objectRoot";
        if (seen.has(key) && !delegatedObjectView) return `Tree binding ${next.join("/")} is declared more than once.`;
        if (!seen.has(key)) seen.set(key, entry.role);
        let declarations = [schema];
        for (const part of next) {
          declarations = declarations.flatMap(declaration => {
            const resolved = effectiveObject(schema, declaration);
            const alternatives = [resolved, ...(resolved?.oneOf || []).map(branch => effectiveObject(schema, branch))];
            return alternatives.map(candidate => part === "*" ? candidate?.items : candidate?.properties?.[part])
              .filter(Boolean);
          });
          if (!declarations.length) return `Tree binding ${next.join("/")} does not resolve to a schema declaration.`;
        }
        const types = declarations.map(declaration => {
          const resolved = effectiveObject(schema, declaration);
          return resolved?.type || (resolved?.properties ? "object" : undefined);
        });
        if (entry.role === "collection" && !types.includes("array")) return `Tree binding ${next.join("/")} has role collection but is not an array.`;
        if (["objectRoot", "objectEntries"].includes(entry.role) && types.every(type => type && type !== "object")) {
          return `Tree binding ${next.join("/")} has role ${entry.role} but is not an object.`;
        }
      }
      const issue = visit(entry.children, entry.role === "collection" ? [...next, "*"] : next, entry.role);
      if (issue) return issue;
    }
    return "";
  };
  const bindingIssue = visit(descriptor.children);
  if (bindingIssue) return bindingIssue;
  for (const [index, insertion] of (descriptor.insertions || []).entries()) {
    const actionExists = (descriptor.actionMenus || []).some(menu =>
      (menu.entries || []).some(entry => entry?.action === insertion?.action));
    if (!actionExists) return `Tree insertion ${index + 1} uses ${insertion?.action || "an unnamed action"} without a matching menu entry.`;
    if (insertion?.factory === "schemaItemTemplate") {
      const collection = insertion.when?.path?.reduce((current, part) => {
        const resolved = effectiveObject(schema, current);
        return part === "*" ? resolved?.items : resolved?.properties?.[part];
      }, schema);
      if (effectiveObject(schema, collection)?.type !== "array") {
        return `Tree action ${insertion.action} does not target an array collection.`;
      }
      if (!insertion.variant) return `Tree action ${insertion.action} needs a variant token.`;
    }
  }
  return "";
}

export function schemaApplicationRuntimeIssue(schema, applicationId) {
  if (typeof applicationId !== "string" || !applicationId) return "Declare the application identifier before registering a runtime.";
  return schema?.["x-fullmeta-runtime"]?.schema === "fullmeta-model-runtime/1"
    ? "" : `Application ${applicationId} has no x-fullmeta-runtime fullmeta-model-runtime/1 declaration.`;
}

/** Parse a basic JSON Schema initialization shape for readiness reporting. */
export function genericSchemaBasicsIssue(schema) {
  if (!isRecord(schema)) return "The model schema root must be an object.";
  if (typeof schema.$schema !== "string" || !schema.$schema) return "Add the JSON Schema dialect in $schema.";
  if (typeof schema.$id !== "string" || !schema.$id) return "Add a unique absolute $id to the schema.";
  try { new URL(schema.$id); } catch { return "$id must be an absolute URL."; }
  return "";
}

/** Readiness for the editor's schema-authored project path. */
export function schemaAuthoringReadiness(schema) {
  const applicationId = schema?.properties?.application?.const;
  const basics = genericSchemaBasicsIssue(schema) || schemaGeneratedOwnershipIssue(schema, schema);
  const editing = basics || genericProjectEditingIssue(schema);
  const runtimeIssue = schemaApplicationRuntimeIssue(schema, applicationId);
  const usesRegisteredRuntime = schema?.["x-fullmeta-runtime"]?.schema === "fullmeta-model-runtime/1";
  const creation = basics || (usesRegisteredRuntime
    ? runtimeIssue || genericProjectRootContractIssue(schema)
    : genericProjectCreationIssue(schema));
  return [
    { id: "schema", label: "Schema editable", ready: !basics, issue: basics },
    { id: "editing", label: "Project editing ready", ready: !editing, issue: editing },
    { id: "creation", label: "Project creation ready", ready: !creation, issue: creation },
    { id: "runtime", label: "Application runtime ready", ready: !runtimeIssue, issue: runtimeIssue },
  ];
}
