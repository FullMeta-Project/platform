/** Read-only, application-neutral Graphics response for a schema declaration. */
import { graphicsSceneForSelection, mountGraphicsContextView } from "../graphics-console/widget.js";

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

function discriminatorValues(schema, seen = new Set()) {
  if (!isObject(schema) || seen.has(schema)) return [];
  seen.add(schema);
  const type = schema.properties?.type;
  const values = [
    ...(type?.const !== undefined ? [type.const] : []),
    ...(Array.isArray(type?.enum) ? type.enum : []),
  ];
  for (const key of ["allOf", "oneOf", "anyOf"]) {
    for (const branch of Array.isArray(schema[key]) ? schema[key] : []) {
      values.push(...discriminatorValues(branch, seen));
    }
  }
  return [...new Set(values)];
}

/**
 * Match a projected schema declaration against its document's Graphics rules.
 * `selection.binding` is the model-instance path declared by x-fullmeta-ui-tree;
 * `selection.path` / `sourcePointer` remain separate JSON source addresses.
 * Pass a resolved schema value when available so discriminator rules can match.
 */
export function schemaGraphicsContext({ graphicsConsole, selection, schemaValue, dimension } = {}) {
  if (!isObject(graphicsConsole) || !Array.isArray(selection?.binding)) return null;
  const value = schemaValue ?? selection.value ?? selection.schema ?? {};
  const types = discriminatorValues(value);
  const matched = graphicsSceneForSelection(graphicsConsole, {
    path: selection.binding, types, dimension, value,
  });
  const focusId = matched.rule?.focus || null;
  return {
    label: selection.label || selection.binding.join(" › ") || "Schema root",
    binding: [...selection.binding],
    sourceFile: selection.sourceFile || "",
    sourcePointer: selection.sourcePointer || "#",
    types,
    rule: matched.rule,
    sceneId: matched.sceneId,
    scene: matched.scene,
    focusId,
    focus: focusId ? graphicsConsole.focusModes?.[focusId] || null : null,
  };
}


export function mountSchemaGraphicsContext(options = {}) {
  return mountGraphicsContextView({ container: options.container, context: schemaGraphicsContext(options) });
}
