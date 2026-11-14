function assertWorkspaceUrl(url, workspaceUrl) {
  if (url.origin !== workspaceUrl.origin || !url.pathname.startsWith(workspaceUrl.pathname)
    || url.search || /%2f|%5c/i.test(url.pathname)) {
    throw new Error('Schema imports must stay inside FullMeta.');
  }
}

/** Read one JSON file without following references. Paths are confined to FullMeta. */
export async function loadWorkspaceJson(url, workspaceUrl) {
  url = canonicalWorkspaceSchemaUrl(url,workspaceUrl);
  assertWorkspaceUrl(url, workspaceUrl);
  let document;
  if (url.protocol === 'file:') {
    const { readFile, lstat, realpath } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { relative, isAbsolute, sep } = await import('node:path');
    const path = fileURLToPath(url), info = await lstat(path);
    const inside = relative(await realpath(fileURLToPath(workspaceUrl)), await realpath(path));
    if (!info.isFile() || info.isSymbolicLink() || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
      throw new Error('Schema imports must be regular files inside FullMeta.');
    }
    document = JSON.parse(await readFile(url, 'utf8'));
  } else {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load schema ${url.pathname} (${response.status}).`);
    document = await response.json();
  }
  return document;
}

/** Load a local graph of ordinary JSON Schema documents. */
export async function loadSchemaDocuments(rootUrl, workspaceUrl) {
  const sources = [], byPath = new Map(), byId = new Map();
  const rootLocation = canonicalWorkspaceSchemaUrl(rootUrl,workspaceUrl); rootLocation.hash = '';
  const rootDirectory = new URL('./', rootLocation);
  let identifierBase;
  async function load(url) {
    url = canonicalWorkspaceSchemaUrl(url,workspaceUrl); url.hash = '';
    assertWorkspaceUrl(url, workspaceUrl);
    if (byPath.has(url.href)) return byPath.get(url.href);
    if (sources.length >= 4096) throw new Error('Too many schema documents.');
    const document = await loadWorkspaceJson(url, workspaceUrl);
    if (!document || typeof document !== 'object' || Array.isArray(document) || typeof document.$id !== 'string') throw new Error('Each schema document requires a string $id.');
    const id = new URL(document.$id);
    if (!['http:', 'https:'].includes(id.protocol) || id.search || id.hash) throw new Error('Schema $id must be an absolute HTTP(S) document identifier.');
    identifierBase ||= new URL('./', id);
    if (byId.has(id.href)) throw new Error(`Duplicate schema identifier ${id.href}.`);
    byPath.set(url.href, document); byId.set(id.href, document);
    sources.push({ document, url });
    const references = [];
    function visit(value) {
      if (!value || typeof value !== 'object') return;
      if (value !== document && !Array.isArray(value) && typeof value.$id === 'string') throw new Error('Nested schema identifiers are unsupported.');
      for (const [key, child] of Object.entries(value)) {
        if (key === '$ref' && typeof child === 'string') {
          references.push({ owner: value, reference: child });
        } else if (key !== '$ref') visit(child);
      }
    }
    visit(document);
    for (const { owner, reference } of references) {
      if (reference.includes('\\') || reference.startsWith('//')) throw new Error(`Unsupported schema reference ${reference}.`);
      let targetId, fragment;
      const logicalTarget = new URL(reference, id);
      const logicalFragment = logicalTarget.hash; logicalTarget.hash = '';
      if (!logicalTarget.search && logicalTarget.href === id.href) {
        // A canonical self-reference remains local even if the physical file was renamed.
        targetId = id.href;
        fragment = logicalFragment;
      } else if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(reference) && !reference.startsWith('/')) {
        // Local imports follow the declaring file, independently of its canonical $id.
        const location = new URL(reference, url);
        fragment = location.hash; location.hash = '';
        const imported = await load(location);
        targetId = new URL(imported.$id).href;
      } else {
        // Absolute identifiers retain the established logical-ID directory mapping.
        const identifier = new URL(reference, id);
        fragment = identifier.hash; identifier.hash = '';
        if (identifier.search) throw new Error(`Unsupported schema reference ${reference}.`);
        if (!byId.has(identifier.href)) {
          if (identifier.origin !== identifierBase.origin || !identifier.pathname.startsWith(identifierBase.pathname)) throw new Error(`Unsupported schema reference ${reference}.`);
          const imported = await load(new URL(identifier.pathname.slice(identifierBase.pathname.length), rootDirectory));
          targetId = new URL(imported.$id).href;
        } else targetId = identifier.href;
      }
      owner.$ref = targetId === id.href && url.href === rootLocation.href ? fragment || '#' : targetId + fragment;
    }
    return document;
  }
  await load(rootUrl);
  return sources;
}
import {canonicalWorkspaceSchemaUrl} from './paths.js';

