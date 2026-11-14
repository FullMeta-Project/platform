const relocatedSchemas=Object.freeze({
  'platform/schemas/schema-editor.schema.json':'platform/schema-editor/schema-editor.schema.json',
  'platform/schemas/empty.schema.json':'platform/schema-editor/templates/empty.schema.json',
  'platform/schemas/fullmeta-model-runtime-1.schema.json':'platform/contracts/fullmeta-model-runtime-1.schema.json',
});

/** Resolve only the exact retired shared schema URLs within this workspace.
 * Logical $id values remain stable; no duplicate schema authority is retained.
 */
export function canonicalWorkspaceSchemaUrl(value,workspaceUrl){
  const url=new URL(value),root=new URL('./',workspaceUrl);
  if(url.protocol!==root.protocol||url.origin!==root.origin||!url.pathname.startsWith(root.pathname)||url.search)return url;
  const key=url.pathname.slice(root.pathname.length),replacement=Object.hasOwn(relocatedSchemas,key)?relocatedSchemas[key]:null;
  if(!replacement)return url;
  const canonical=new URL(replacement,root);canonical.hash=url.hash;return canonical;
}

/** "absolute" means from FullMeta, rather than an operating-system drive root. */
export function schemaResourceUrl(path, { rootUrl, schemaUrl, pathType = 'absolute' }) {
  if (typeof path !== 'string' || !path || path.includes('\\') || /[:?#%]/.test(path)
    || path.startsWith('/') || !['absolute', 'relative'].includes(pathType)
    || (pathType === 'absolute' && path.split('/').includes('..'))) {
    throw new Error('Paths must use forward slashes and an absolute or relative schema path mode.');
  }
  const root = new URL('./', rootUrl);
  const url = new URL(path, pathType === 'absolute' ? root : schemaUrl);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) throw new Error('Schema paths must stay inside the FullMeta folder.');
  return url;
}
