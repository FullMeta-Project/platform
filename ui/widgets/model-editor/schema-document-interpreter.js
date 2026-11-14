import { loadSchemaDocuments } from "../../../js/services.js";
import { declarativeDocumentDiagnostics } from '../validation-program/widget.js';

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const syntheticEditorShapes = new WeakSet();

function syntheticShape(shape) {
  syntheticEditorShapes.add(shape);
  return shape;
}

function genericEditorShape(value) {
  if (Array.isArray(value)) {
    const example = value.find((item) => item !== null && typeof item === "object");
    return syntheticShape({ type: "array", items: example === undefined ? {} : genericEditorShape(example) });
  }
  if (isObject(value)) {
    return syntheticShape({
      type: "object",
      properties: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, genericEditorShape(child)])),
    });
  }
  return syntheticShape({});
}

function isPatternPropertyNavigationError(error) {
  return /navigation of patternProperties requires an explicit property declaration/i.test(error?.message || "");
}

// The interpreting schema supplies validation and presentation rules. A JSON
// Schema document may also contain keys not yet declared by that interpreter;
// expose their existing values in the settings form without changing validation.
function editorShapeForValue(fragment, value, rootSchema, api) {
  if (fragment === false) return false;
  if (!isObject(value)) return fragment ?? genericEditorShape(value);
  const resolved = isObject(fragment)
    ? syntheticEditorShapes.has(fragment) ? fragment : resolveSchemaForEditor(fragment, rootSchema, api)
    : {};
  if (resolved?.["x-fullmeta-ui"]?.onlyDeclaredProperties === true) return resolved;
  const properties = { ...(isObject(resolved?.properties) ? resolved.properties : {}) };
  let added = !isObject(fragment);
  for (const [key, child] of Object.entries(value)) {
    if (!Object.hasOwn(properties, key)) {
      properties[key] = genericEditorShape(child);
      added = true;
    }
  }
  if (!added) return resolved;
  return syntheticShape({ ...resolved, type: resolved.type || "object", properties });
}

/** Load the interpreter named by a schema document and expose generic editor operations. */
export async function loadSchemaDocumentInterpreter(document, documentUrl, workspaceUrl) {
  const reference = document?.["x-fullmeta-schema"];
  if (typeof reference !== "string" || !reference || reference.includes("\\")
    || /[:?#]/.test(reference) || reference.startsWith("/") || !reference.endsWith(".json")) {
    throw new Error("The schema document must specify x-fullmeta-schema as a relative JSON schema path.");
  }

  const selectedSchemaUrl = new URL(reference, documentUrl);
  const sources = await loadSchemaDocuments(selectedSchemaUrl, workspaceUrl);
  const schema = sources[0]?.document;
  if (!isObject(schema) || typeof schema.$id !== "string") {
    throw new Error("The interpreting schema must be a JSON Schema document with an $id.");
  }

  const modelSchemaApi = await import("../../../model-rust/js/api.js");
  modelSchemaApi.configureModelSchema(schema, sources.slice(1).map((source) => source.document));
  // validate_json_schema takes request.schema directly in the WASM API. Keep a
  // detached copy so the shared adapter does not replace it with a handle.
  const validationSchema = structuredClone(schema);
  const schemaDocuments = sources.map((source) => source.document);
  const validateAuthoredDocument = value => [...modelSchemaApi.validateJsonSchema(value, validationSchema),
    ...declarativeDocumentDiagnostics(value).map(issue => `${issue.path}: ${issue.message}`)];

  return {
    schema,
    schemaDocuments,
    schemaUrl: sources[0]?.url || selectedSchemaUrl,
    modelEditorSchema: {
      modelEditorSchemaForPath(model, path, options) {
        const value = (path || []).reduce((current, key) => current?.[key], model);
        try {
          return editorShapeForValue(modelSchemaApi.schemaAtPath(model, path, options, schema), value, schema, modelSchemaApi);
        } catch (error) {
          if (!isPatternPropertyNavigationError(error)) throw error;
          return genericEditorShape(value);
        }
      },
      modelEditorSchemaProperty(schemaNode, value, key) {
        if (syntheticEditorShapes.has(schemaNode) && Object.hasOwn(schemaNode.properties || {}, key)) {
          return editorShapeForValue(schemaNode.properties[key], value?.[key], schema, modelSchemaApi);
        }
        try {
          return editorShapeForValue(modelSchemaApi.schemaProperty(schemaNode, value, key, schema), value?.[key], schema, modelSchemaApi);
        } catch (error) {
          if (!isPatternPropertyNavigationError(error)) throw error;
          return genericEditorShape(value?.[key]);
        }
      },
      modelEditorSchemaItem(schemaNode, value, index) {
        if (syntheticEditorShapes.has(schemaNode) && schemaNode.items) {
          return editorShapeForValue(schemaNode.items, value?.[index], schema, modelSchemaApi);
        }
        try {
          return editorShapeForValue(modelSchemaApi.schemaItem(schemaNode, value, index, schema), value?.[index], schema, modelSchemaApi);
        } catch (error) {
          if (!isPatternPropertyNavigationError(error)) throw error;
          return genericEditorShape(value?.[index]);
        }
      },
      resolveModelEditorSchema(schemaNode) {
        if (syntheticEditorShapes.has(schemaNode)) return schemaNode;
        return resolveSchemaForEditor(schemaNode, schema, modelSchemaApi);
      },
      validateFullMetaModel(value) {
        return validateAuthoredDocument(value);
      },
      validateFullMetaModelStructure(value) {
        // Derived-output consistency is an authoring error, not structural repair
        // mode: the normal dialog must remain available for explicit regeneration.
        return modelSchemaApi.validateJsonSchema(value, validationSchema);
      },
      validateFullMetaModelWithRules(value) {
        return validateAuthoredDocument(value);
      },
      modelUnitChoices: [],
    },
  };
}

function resolveSchemaForEditor(schemaNode, rootSchema, api, visited = new Set()) {
  const resolved = api.resolveSchemaNode(schemaNode, rootSchema);
  if (!isObject(resolved) || visited.has(resolved)) return resolved;
  visited.add(resolved);
  const compositions = Array.isArray(resolved.allOf)
    ? resolved.allOf.map((part) => resolveSchemaForEditor(part, rootSchema, api, visited)).filter(isObject)
    : [];
  if (!compositions.length) return resolved;

  const properties = Object.assign({}, ...compositions.map((part) => part.properties || {}), resolved.properties || {});
  const patternProperties = Object.assign({}, ...compositions.map((part) => part.patternProperties || {}), resolved.patternProperties || {});
  const required = [...new Set([...compositions.flatMap((part) => part.required || []), ...(resolved.required || [])])];
  return { ...Object.assign({}, ...compositions, resolved), properties, patternProperties, required };
}
