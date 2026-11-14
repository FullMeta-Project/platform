/** Generic JSON Schema document navigation shared by the model and program editors. */

/** A JSON Schema document carries the dialect and its own FullMeta interpreter reference. */
export function isSchemaDocument(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && typeof value.$schema === "string"
    && typeof value.$id === "string"
    && typeof value["x-fullmeta-schema"] === "string";
}

function decodePointerToken(token) {
  let decoded = token;
  try { decoded = decodeURIComponent(token); } catch { /* Keep malformed escapes visible as a missing path. */ }
  return decoded.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function jsonPointerFromPath(path = []) {
  return `#${path.map((part) => `/${encodeURIComponent(String(part).replace(/~/g, "~0").replace(/\//g, "~1"))}`).join("")}`;
}

export function jsonPointerPath(pointer = "#") {
  if (typeof pointer !== "string") return null;
  const fragment = pointer.startsWith("#") ? pointer.slice(1) : pointer;
  if (fragment === "") return [];
  if (!fragment.startsWith("/")) return null;
  return fragment.slice(1).split("/").map(decodePointerToken);
}

export function resolveJsonPointer(document, pointer = "#") {
  if (!document || typeof pointer !== "string") return null;
  const parts = jsonPointerPath(pointer);
  if (!parts) return null;
  let value = document;
  for (const part of parts) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, part)) return null;
    value = value[part];
  }
  return value ?? null;
}

export function schemaReferenceTarget(document, reference, externalDocuments = []) {
  if (!document || typeof reference !== "string") return null;
  const hashIndex = reference.indexOf("#");
  const documentId = hashIndex < 0 ? reference : reference.slice(0, hashIndex);
  const pointer = hashIndex < 0 ? "#" : reference.slice(hashIndex);
  const documents = [document, ...externalDocuments].filter(Boolean);
  let resolvedDocumentId = documentId;
  if (documentId && document?.$id) {
    try { resolvedDocumentId = new URL(documentId, document.$id).href; }
    catch { /* Keep the original reference for an unresolved target. */ }
  }
  const targetDocument = documentId
    ? documents.find((candidate) => candidate.$id === resolvedDocumentId || candidate.$id === documentId)
    : document;
  if (!targetDocument) return null;
  const node = resolveJsonPointer(targetDocument, pointer);
  return node === null ? null : { document: targetDocument, documentId: targetDocument.$id || resolvedDocumentId, pointer, node };
}

export function resolveSchemaReference(document, reference, externalDocuments = []) {
  return schemaReferenceTarget(document, reference, externalDocuments)?.node ?? null;
}

export function schemaReferenceIndex(document, externalDocuments = []) {
  const references = [];
  const visited = new WeakSet();
  const walk = (value, path = []) => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (!Array.isArray(value) && typeof value.$ref === "string") {
      const target = schemaReferenceTarget(document, value.$ref, externalDocuments);
      references.push({
        sourcePointer: jsonPointerFromPath(path),
        reference: value.$ref,
        targetDocumentId: target?.documentId || "",
        targetPointer: target?.pointer || "",
        resolved: Boolean(target),
      });
    }
    for (const [key, child] of Object.entries(value)) walk(child, [...path, key]);
  };
  walk(document);
  return references;
}

