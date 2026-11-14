import platformCatalog from '../catalog.json' with { type: 'json' };
import catalogContract from '../../schemas/fullmeta-ui-widget-catalog-1.schema.json' with { type: 'json' };
import { validateUiContractValue } from '../../schemas/contract-validation.js';

const defaultCatalogUrl = new URL('../catalog.json', import.meta.url);
const workspaceUrl = new URL('../../../../', import.meta.url);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const presentationDefaults = Object.freeze({ format: 'fullmeta-react-widget/1', component: 'Widget', mount: 'mountWidget' });

function capabilityExports(entry) {
  return [entry.field?.render, entry.authoring?.render, entry.graphics?.render, entry.graphics?.descriptor,
    entry.editor?.mount, entry.presentation?.component, entry.presentation?.mount,
    ...(entry.authoring?.tools || []).map(tool => tool.entry)].filter(value => value !== undefined);
}

/** Expand catalog shorthand once; retain original properties and never guess a module path. */
export function normalizeWidgetCatalog(document) {
  if (!record(document) || !Array.isArray(document.widgets)) throw new Error('Enter a widget catalog with a widgets array.');
  return { ...document, widgets: document.widgets.map(entry => {
    if (!record(entry)) throw new Error('Enter a widget catalog entry.');
    const presentation = entry.presentation === true ? { ...presentationDefaults }
      : record(entry.presentation) ? { ...presentationDefaults, ...entry.presentation } : entry.presentation;
    const normalized = { ...entry, ...(presentation === undefined ? {} : { presentation }) };
    // Explicit names are additive ABI declarations; inferred names come only from capabilities.
    if (entry.exports !== undefined && !Array.isArray(entry.exports)) throw new Error(`Widget ${entry.id} exports must be an array.`);
    if (entry.exports && new Set(entry.exports).size !== entry.exports.length) throw new Error(`Widget ${entry.id} repeats an export.`);
    normalized.exports = [...new Set([...(entry.exports || []), ...capabilityExports(normalized)])];
    return normalized;
  }) };
}

/** Check advertised interfaces against a loaded namespace or a statically collected export set. */
export function assertWidgetModuleExports(widget, namespaceOrSet) {
  const actual = namespaceOrSet instanceof Set ? namespaceOrSet : new Set(Object.keys(namespaceOrSet));
  for (const symbol of widget.exports || capabilityExports(widget)) {
    if (!actual.has(symbol)) throw new Error(`Widget ${widget.id} has no public export ${symbol}.`);
  }
}

function localUrl(reference, base, root) {
  if (typeof reference !== 'string' || !reference || reference.includes('\\')) throw new Error('Enter a local widget resource path.');
  const url = new URL(reference, base);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)
    || url.search || url.hash || /%2f|%5c/i.test(url.pathname)) {
    throw new Error(`Widget resource must stay inside FullMeta: ${reference}`);
  }
  return url;
}

/** Resolve and merge catalogs without importing executable modules. IDs are unique across catalogs. */
export function combineWidgetCatalogs(sources, { rootUrl = workspaceUrl } = {}) {
  const root = new URL(rootUrl), widgets = [], catalogs = [], ids = new Set(), catalogIds = new Set();
  for (const { document, url: location } of sources) {
    const url = localUrl(String(location), root, root);
    const errors = validateUiContractValue(document, catalogContract, catalogContract, 'catalog');
    if (errors.length) throw new Error(`Invalid widget catalog ${url.pathname}: ${errors[0]}`);
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(document.id)) throw new Error(`Invalid widget catalog ID ${document.id}.`);
    if (catalogIds.has(document.id)) throw new Error(`Duplicate widget catalog ID ${document.id}.`);
    catalogIds.add(document.id);
    catalogs.push({ id: document.id, label: document.label || document.id, url: url.href });
    for (const entry of normalizeWidgetCatalog(document).widgets) {
      if (!record(entry) || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(entry.id || '')
        || typeof entry.label !== 'string' || !entry.label
        || !['field','graphics','component'].includes(entry.category)
        || !Array.isArray(entry.exports) || !entry.exports.length
        || new Set(entry.exports).size !== entry.exports.length
        || entry.exports.some(name => !/^[A-Za-z_$][\w$]*$/.test(name))) throw new Error(`Invalid widget in ${document.id}.`);
      if (ids.has(entry.id)) throw new Error(`Duplicate widget ID ${entry.id} in catalog ${document.id}.`);
      ids.add(entry.id);
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\/widget\.js$/.test(entry.module || '')) throw new Error(`Widget ${entry.id} must expose a folder/widget.js public interface.`);
      const moduleUrl = localUrl(entry.module, url, root).href;
      if (entry.authoring?.tools !== undefined && !Array.isArray(entry.authoring.tools)) throw new Error(`Widget ${entry.id} authoring tools must be an array.`);
      const authoringProfile = entry.authoring?.schemaAuthoringProfile;
      let authoringProfileContractUrl;
      if (authoringProfile !== undefined) {
        if (!record(authoringProfile) || authoringProfile.format !== 'fullmeta-ui-behavior/1'
          || authoringProfile.context !== 'schemaAuthoring'
          || authoringProfile.target?.kind !== 'widget' || authoringProfile.target.name !== entry.id
          || !record(authoringProfile.payload) || typeof authoringProfile.payload.annotationKey !== 'string'
          || !record(authoringProfile.payload.authoring)) {
          throw new Error(`Widget ${entry.id} has an invalid schema-authoring profile.`);
        }
        const contract = authoringProfile.payload.authoring.validationContract;
        if (contract !== undefined) {
          authoringProfileContractUrl = localUrl(contract, new URL('./', moduleUrl), root).href;
        }
      }
      const tools = entry.authoring?.tools || [];
      if (new Set(tools.map(tool => tool.id)).size !== tools.length || tools.some(tool => !/^[A-Za-z][A-Za-z0-9_-]*$/.test(tool.id))) {
        throw new Error(`Widget ${entry.id} authoring tools need unique IDs.`);
      }
      if (entry.graphics && new Set(entry.graphics.dimensions).size !== entry.graphics.dimensions.length) throw new Error(`Widget ${entry.id} repeats a Graphics dimension.`);
      if(entry.presentation&&entry.provider)throw new Error(`Widget ${entry.id} must choose a visual presentation or a headless provider.`);
      for (const symbol of [entry.field?.render, entry.authoring?.render, entry.graphics?.render, entry.graphics?.descriptor, entry.editor?.mount,
        entry.presentation?.component,entry.presentation?.mount,
        ...(entry.authoring?.tools || []).map(tool => tool.entry)].filter(Boolean)) {
        if (!/^[A-Za-z_$][\w$]*$/.test(symbol) || !entry.exports.includes(symbol)) throw new Error(`Widget ${entry.id} does not declare export ${symbol}.`);
      }
      widgets.push({ ...entry, catalogId: document.id, catalogLabel: document.label || document.id,
        catalogUrl: url.href, moduleUrl,
        ...(authoringProfile ? { authoringProfileContractUrl } : {}),
        ...(entry.graphics ? { graphics: { ...entry.graphics,
          ...(entry.graphics.dataSchema ? { dataSchema: localUrl(entry.graphics.dataSchema, url, root).href } : {}),
        } } : {}),
      });
    }
  }
  for (const widget of widgets) {
    if (widget.uses !== undefined && (!Array.isArray(widget.uses) || new Set(widget.uses).size !== widget.uses.length || widget.uses.some(id => typeof id !== 'string' || !ids.has(id)))) {
      throw new Error(`Widget component ${widget.id} requires widgets that are absent from the combined catalogs.`);
    }
  }
  const schemaAuthoringDeclarations = widgets.map(widget => widget.authoring?.schemaAuthoring).filter(Boolean);
  const schemaAuthoring = schemaAuthoringDeclarations.length ? {
    presentation: Object.assign({}, ...schemaAuthoringDeclarations.map(entry => entry.presentation || {})),
    tree: schemaAuthoringDeclarations.map(entry => entry.tree).find(Boolean),
    documentWidgets: schemaAuthoringDeclarations.flatMap(entry => entry.documentWidgets || []),
    tools: schemaAuthoringDeclarations.flatMap(entry => entry.tools || []),
  } : null;
  return { catalogs, widgets, schemaAuthoring };
}

/** Schema-relative catalog references are the only application-specific inputs. */
export async function loadWidgetCatalogs({ schema, schemaUrl, rootUrl = workspaceUrl, loadJson } = {}) {
  const root = new URL(rootUrl);
  const references = schema?.['x-fullmeta-ui-graphicsInterfaces']?.catalogs;
  if (references !== undefined && (!Array.isArray(references) || !references.length)) throw new Error('Widget catalogs must be a nonempty array of paths.');
  const urls = (references || [defaultCatalogUrl.href]).map(path => localUrl(path, schemaUrl || defaultCatalogUrl, root));
  if (new Set(urls.map(url => url.href)).size !== urls.length) throw new Error('The same widget catalog is listed twice.');
  const sources = await Promise.all(urls.map(async url => {
    if (url.href === defaultCatalogUrl.href) return { url, document: platformCatalog };
    if (loadJson) return { url, document: await loadJson(url, root) };
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load widget catalog ${url.pathname} (${response.status}).`);
    return { url, document: await response.json() };
  }));
  return combineWidgetCatalogs(sources, { rootUrl: root });
}

export const sharedWidgetCatalog = combineWidgetCatalogs([{ url: defaultCatalogUrl, document: platformCatalog }]);

/** Resolve declared React capabilities through public module entries. No schema-supplied code. */
export async function loadReactWidgetProviders(catalog,{importModule=url=>import(url),category='field'}={}) {
  const providers=await Promise.all(catalog.widgets.filter(widget=>(!category||widget.category===category)&&widget.presentation).map(async widget=>{
    const module=await importModule(widget.moduleUrl),{component,mount,format}=widget.presentation;
    if(typeof module[component]!=='function'||typeof module[mount]!=='function')throw new Error(`Widget ${widget.id} has no callable ${format} presentation.`);
    assertWidgetModuleExports(widget,module);
    return [widget.id,Object.freeze({component:module[component],mount:module[mount],format})];
  }));
  return Object.freeze(Object.fromEntries(providers));
}

/** Only widgets with an authoring profile can be offered as field annotation choices. */
export function fieldWidgetChoices(discovered = sharedWidgetCatalog, profiles = {}) {
  return discovered.widgets.filter(widget => widget.category === 'field' && profiles[widget.id]?.editor === 'annotation')
    .map(widget => ({ widget: widget.id, label: `${widget.label} · ${widget.catalogLabel}`, profile: profiles[widget.id] }));
}

export function catalogGraphicsRegistration(widget, schemaUrl) {
  if (!widget?.graphics) throw new Error('Choose a Graphics widget from the catalog.');
  const base = new URL('./', schemaUrl), target = new URL(widget.moduleUrl);
  if (base.origin !== target.origin) throw new Error('Widget registration must be local.');
  const left = base.pathname.split('/').filter(Boolean), right = target.pathname.split('/').filter(Boolean);
  while (left.length && right.length && left[0] === right[0]) { left.shift(); right.shift(); }
  return { id: widget.id, kind: widget.graphics.kind, label: widget.label,
    registrationFile: '../'.repeat(left.length) + right.join('/'),
    registrationSymbol: widget.graphics.descriptor || widget.graphics.render,
    registrationLabel: `${widget.catalogLabel}: ${widget.label}` };
}
