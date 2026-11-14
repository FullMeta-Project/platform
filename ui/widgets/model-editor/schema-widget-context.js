/** Read-only source context for shared schema widget design editors. */

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const MAX_REFERENCE_DEPTH = 32;

function pointer(path) {
  return `#${path.map(part => `/${String(part).replace(/~/g, "~0").replace(/\//g, "~1")}`).join("")}`;
}

function pointerPath(fragment) {
  if (fragment === "#") return [];
  if (!fragment.startsWith("#/") || /~(?![01])/.test(fragment)) return null;
  try {
    return fragment.slice(2).split("/").map(part =>
      decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~"));
  } catch { return null; }
}

function valueAt(document, path) {
  let value = document;
  for (const key of path) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

/**
 * Return the `parts`, `child`, and `resolve` interface used by shared widget
 * designers. References resolve inside the open schema document only.
 * Unsupported or cyclic references remain unresolved.
 */
export function schemaWidgetDesignContext({ document, path = [], file } = {}) {
  if (!isObject(document) || !Array.isArray(path) || typeof file !== "string" || !file) {
    throw new Error("Choose a source-anchored schema declaration.");
  }
  const sourcePart = (sourceDocument, sourceFile, sourcePath) => {
    const schema = valueAt(sourceDocument, sourcePath);
    return isObject(schema)
      ? { document: sourceDocument, file: sourceFile, path: sourcePath, pointer: pointer(sourcePath), schema }
      : null;
  };
  const root = sourcePart(document, file, path);
  const child = (part, ...keys) => part && sourcePart(part.document, part.file, [...part.path, ...keys]);
  const reference = (part, ref) => {
    if (typeof ref !== "string") return null;
    const hash = ref.indexOf("#");
    const resource = hash < 0 ? ref : ref.slice(0, hash);
    const targetPath = pointerPath(hash < 0 ? "#" : ref.slice(hash));
    if (!targetPath) return null;
    if (resource) {
      try { if (new URL(resource, document.$id).href !== new URL(document.$id).href) return null; }
      catch { return null; }
    }
    return sourcePart(document, file, targetPath);
  };
  const resolve = candidate => {
    const parts = [], visited = new Set();
    const visit = (part, depth) => {
      if (!part || depth >= MAX_REFERENCE_DEPTH) return;
      const identity = `${part.file}${part.pointer}`;
      if (visited.has(identity)) return;
      visited.add(identity);
      parts.push(part);
      visit(reference(part, part.schema.$ref), depth + 1);
      if (Array.isArray(part.schema.allOf)) {
        part.schema.allOf.forEach((_, index) => visit(child(part, "allOf", index), depth + 1));
      }
    };
    visit(candidate, 0);
    return {
      parts,
      schema: Object.assign({}, ...parts.slice().reverse().map(part => part.schema)),
    };
  };
  return { parts: root ? [root] : [], child, resolve };
}
