import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
import { schemaResourceUrl } from "../schema-paths.js";

/** Resolve schema-owned executable paths relative to the declaring schema or workspace. */
export function resolveExternalProgramRegistry(sources, root) {
  const registry = {};
  for (const { document, url } of sources) {
  for (const [id, registration] of Object.entries(document['x-fullmeta-runtime']?.externalPrograms || {})) {
    const executable = registration?.executable;
    const entries = registration?.allowedEntries;
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(id) || Object.hasOwn(registry, id)
      || !['absolute', 'relative'].includes(registration.pathType)
      || typeof executable !== 'string' || !/\.exe$/.test(executable)
      || !Array.isArray(entries) || !entries.length
      || entries.some(entry => typeof entry !== 'string' || !entry.trim())) {
      throw new Error(`Invalid external program registration ${id}.`);
    }
    const resolved = schemaResourceUrl(executable, { rootUrl: pathToFileURL(root + sep), schemaUrl: url, pathType: registration.pathType });
    const path = fileURLToPath(resolved);
    registry[id] = { path: process.platform === 'win32' ? path : path.slice(0, -4), allowedEntries: [...entries] };
  }
  }
  return registry;
}
