import { loadWorkspaceJson } from "../../js/schema-document-loader.js";
import { loadApplicationPackage } from "../../js/application-packages.js";
import { resolveEditorWidget } from "../widgets/shared/editor-contract.js";
import {canonicalWorkspaceSchemaUrl} from '../../js/schema-paths.js';

const workspaceUrl = new URL("../../..", import.meta.url);
const hostUrl = new URL("../../editor-host.json", import.meta.url);
function canonicalDocumentPath(value,root){
  if(typeof value!=='string')return value;
  const original=new URL(value,root),canonical=canonicalWorkspaceSchemaUrl(original,root);
  return canonical.href===original.href?value:canonical.pathname.slice(new URL('./',root).pathname.length);
}

export function documentEditorUrl(path, action = null, rootUrl = workspaceUrl) {
  if (typeof path !== 'string' || !path.toLowerCase().endsWith('.json') || /[\\?#:]/.test(path)
    || path.startsWith('/') || path.split('/').some(part => !part || part === '..' || part === '.')) throw new Error('Choose a workspace JSON document.');
  if (action !== null && action !== 'create-project') throw new Error('Choose a supported document opening action.');
  const target = new URL('platform/loader.html', rootUrl);
  target.searchParams.set('model', canonicalDocumentPath(path,rootUrl));
  if (action) target.searchParams.set('action', action);
  return target;
}

export async function mountRegisteredEditor(container, { modelPath = null, action = null } = {}) {
  const host = await loadWorkspaceJson(hostUrl, workspaceUrl);
  modelPath=canonicalDocumentPath(modelPath,workspaceUrl);
  async function readDocument(path) {
    if (typeof path !== 'string' || !path.endsWith('.json') || /[\\?#:]/.test(path)
      || path.split('/').some(part => !part || part === '..' || part === '.')) throw new Error('Choose a workspace JSON document.');
    path=canonicalDocumentPath(path,workspaceUrl);
    const parts = path.split('/'), file = parts.pop(), folder = parts.join('/') || '.';
    const endpoint = new URL('/api/model', workspaceUrl);
    endpoint.searchParams.set('folder', folder); endpoint.searchParams.set('file', file);
    const response = await fetch(endpoint, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Could not open ${path}.`);
    return result;
  }
  async function resolveEditor(document, documentUrl) {
    const reference = document?.['x-fullmeta-schema'];
    if (typeof reference !== 'string' || !reference.endsWith('.json') || /[\\?#:]/.test(reference) || reference.startsWith('/')) {
      throw new Error('The document must declare its interpreting schema in x-fullmeta-schema.');
    }
    const schemaUrl = canonicalWorkspaceSchemaUrl(new URL(reference, documentUrl),workspaceUrl);
    const schema = await loadWorkspaceJson(schemaUrl, workspaceUrl);
    const selection = await resolveEditorWidget({ schema, schemaUrl, defaultWidget: host.defaultEditor, loadJson: loadWorkspaceJson });
    return { schema, schemaUrl, selection };
  }
  const result = modelPath ? await readDocument(modelPath) : null;
  const documentUrl = modelPath ? new URL(modelPath, workspaceUrl) : null;
  const resolved = result
    ? await resolveEditor(result.model, documentUrl)
    : await (async () => {
      const schemaUrl = new URL(host.defaultSchema, hostUrl);
      const schema = await loadWorkspaceJson(schemaUrl, workspaceUrl);
      return { schema, schemaUrl, selection: await resolveEditorWidget({ schema, schemaUrl, defaultWidget: host.defaultEditor, loadJson: loadWorkspaceJson }) };
    })();
  const { selection, schema, schemaUrl } = resolved;
  const module = await import(selection.widget.moduleUrl);
  const mount = module[selection.widget.editor.mount];
  if (typeof mount !== 'function') throw new Error(`Editor ${selection.widget.id} has no callable mount entry.`);
  const services = Object.freeze({
    loadApplicationPackage, readDocument, resolveEditor, workspaceUrl,
    navigate(path, action = null) {
      const target = documentEditorUrl(path, action);
      location.assign(target.href);
    },
  });
  return mount(container, {
    document: result?.model ?? null, schema, schemaUrl, options: selection.options, services,
    initial: { path: modelPath, result, selection, action },
  });
}
