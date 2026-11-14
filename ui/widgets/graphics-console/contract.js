/** Shared, application-neutral selection and binding contract for a graphics console. */
import { resolveSelectionHighlight, selectionHighlightBindingValue } from '../selection-highlight/widget.js';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function graphicsPathMatches(pattern = [], path = []) {
  return Array.isArray(pattern) && Array.isArray(path) && pattern.length <= path.length
    && pattern.every((part, index) => part === '*' || String(part) === String(path[index]));
}

export function graphicsSelectionRule(consoleDefinition, { path = [], types = [], dimension, value } = {}) {
  const candidates = Array.isArray(types) ? types : [types];
  return (consoleDefinition?.rules || []).find(rule => {
    const when = rule.when || {};
    if (when.path && !graphicsPathMatches(when.path, path)) return false;
    if (when.paths?.length && !when.paths.some(pattern => graphicsPathMatches(pattern, path))) return false;
    if (when.types?.length && !when.types.some(type => candidates.includes(type))) return false;
    if (when.dimensions?.length && !when.dimensions.includes(Number(dimension))) return false;
    if (when.hasProperties?.length && !when.hasProperties.every(property => record(value?.properties) ? Object.hasOwn(value.properties, property) : record(value) && Object.hasOwn(value, property))) return false;
    return true;
  }) || null;
}

export function graphicsSceneForSelection(consoleDefinition, selection) {
  const rule = graphicsSelectionRule(consoleDefinition, selection);
  const sceneId = rule?.scene || consoleDefinition?.defaultScene;
  const scene = consoleDefinition?.scenes?.[sceneId];
  return { rule, sceneId, scene: scene ? { ...scene, id: sceneId } : null };
}

export function graphicsWidgetForLayer(layer, dimension) {
  return layer?.widgets?.[String(dimension)] || layer?.widget || null;
}

export function graphicsLayerForRole(scene, role) {
  return scene?.layers?.find(layer => (layer.role || layer.id) === role) || null;
}

export function graphicsLayerInput(scene, role, inputs = {}) {
  const layer = graphicsLayerForRole(scene, role);
  return layer?.input ? inputs[layer.input] : undefined;
}

export function graphicsTabForRole(scene, role) {
  return scene?.tabs?.find(tab => (tab.role || tab.id) === role) || null;
}

export function graphicsBindingValue(binding, sources = {}) {
  return selectionHighlightBindingValue(binding, sources);
}

export function graphicsSceneInputs(scene, sources) {
  return Object.fromEntries((scene?.inputs || []).map(input => [input.id, graphicsBindingValue(input.source, sources)]));
}

/** Resolve declared focus references without knowing the application's model fields. */
export function graphicsFocusTargets(consoleDefinition, rule, sources = {}) {
  return resolveSelectionHighlight(consoleDefinition, rule, sources);
}

export function graphicsConsoleIssues(value, registeredWidgets = []) {
  const issues = [];
  if (!record(value) || value.schema !== 'fullmeta-graphics-console/1') return ['Expected a fullmeta-graphics-console/1 object.'];
  if (!record(value.scenes) || !Object.keys(value.scenes).length) issues.push('Declare at least one scene.');
  if (!value.scenes?.[value.defaultScene]) issues.push('Default scene is missing.');
  else if (value.scenes[value.defaultScene].kind !== 'layered' && !value.scenes[value.defaultScene].onSelect) {
    issues.push('A non-layered default scene needs a selection action.');
  }
  if (value.adapters !== undefined && !record(value.adapters)) issues.push('Adapter requirements must be an object.');
  const widgetEntries = Array.isArray(registeredWidgets) ? registeredWidgets.map(id => [id, null]) : Object.entries(registeredWidgets || {});
  const widgets = new Set(widgetEntries.map(([id]) => id));
  const widgetKinds = Object.fromEntries(widgetEntries.map(([id, descriptor]) => [id, descriptor?.kind]));
  if (value.presentation !== undefined) {
    const presentation = value.presentation;
    if (!record(presentation) || !Array.isArray(presentation.axes) || presentation.axes.length < 2 || presentation.axes.length > 3 || !record(presentation.widgets)) issues.push('Graphics presentation needs two or three axes and widget settings.');
    else {
      for (const axis of presentation.axes) if (!Array.isArray(axis) || axis.length !== 3 || typeof axis[0] !== 'string' || !Array.isArray(axis[1]) || axis[1].length !== 3 || !axis[1].every(Number.isFinite) || !/^#[0-9a-fA-F]{6}$/.test(axis[2])) issues.push('Each view axis needs a label, three numeric direction components, and a hex color.');
      for (const [id, settings] of Object.entries(presentation.widgets)) {
        if (widgets.size && !widgets.has(id)) issues.push(`Presentation uses unregistered widget ${id}.`);
        if (!record(settings) || !settings.label || typeof settings.showSceneControls !== 'boolean') issues.push(`Widget ${id} needs a display title and scene-control setting.`);
      }
    }
  }
  const checkWidget = (widget, where) => { if (widget && widgets.size && !widgets.has(widget)) issues.push(`${where} uses unregistered widget ${widget}.`); };
  const checkKind = (widget, allowed, where) => {
    if (widget && allowed?.length && widgetKinds[widget] && !allowed.includes(widgetKinds[widget])) issues.push(`${where} needs a ${allowed.join(' or ')} renderer.`);
  };
  const checkInputs = (inputs, where) => {
    const ids = new Set();
    for (const input of inputs || []) {
      if (!input?.id || ids.has(input.id)) issues.push(`${where} needs unique input names.`);
      ids.add(input?.id);
      if (!['model', 'selected', 'runtime', 'view'].includes(input?.source?.scope)) issues.push(`${where} input ${input?.id || '?'} needs a source scope.`);
    }
  };
  for (const [id, mode] of Object.entries(value.focusModes || {})) {
    if (!record(mode) || !mode.label || !mode.target || !['model', 'selected', 'runtime', 'view', 'layer'].includes(mode.source?.scope)) {
      issues.push(`Focus ${id} needs a label, target, and source.`); continue;
    }
    if (value.focusTargets && !Object.hasOwn(value.focusTargets, mode.target)) issues.push(`Focus ${id} uses an unsupported highlight target.`);
    for (const step of mode.steps || []) {
      if (!Array.isArray(step.properties) || !step.properties.length || !['model', 'selected', 'runtime', 'view', 'layer'].includes(step.collection?.scope)) issues.push(`Focus ${id} has an incomplete reference lookup.`);
    }
  }
  for (const [id, scene] of Object.entries(value.scenes || {})) {
    if (!record(scene)) { issues.push(`Scene ${id} must be an object.`); continue; }
    if (!['layered', 'tabs'].includes(scene.kind)) issues.push(`Scene ${id} needs a layered or tabs kind.`);
    if (scene.onSelect !== undefined && (typeof scene.onSelect !== 'string' || !scene.onSelect)) issues.push(`Scene ${id} needs a named selection action.`);
    const adapter = value.adapters?.[scene.adapter];
    if (value.adapters && !adapter) issues.push(`Scene ${id} uses an undeclared data adapter.`);
    if (adapter?.kind && adapter.kind !== scene.kind) issues.push(`Scene ${id} must use the ${adapter.kind} composition for ${scene.adapter}.`);
    checkInputs(scene.inputs, `Scene ${id}`);
    for (const input of adapter?.requiredInputs || []) if (!(scene.inputs || []).some(entry => entry.id === input)) issues.push(`Scene ${id} needs the ${input} data binding.`);
    checkWidget(scene.surface?.widget, `Scene ${id}`);
    checkKind(scene.surface?.widget, adapter?.surfaceKinds, `Scene ${id}`);
    if (scene.kind === 'layered') {
      if (!scene.surface?.widget) issues.push(`Scene ${id} needs a surface widget.`);
      const keys = new Set();
      for (const layer of scene.layers || []) {
        if (!layer?.id || keys.has(layer.id)) issues.push(`Scene ${id} needs unique layer names.`);
        keys.add(layer?.id);
        checkWidget(layer?.widget, `Layer ${id}.${layer?.id}`);
        const role = layer?.role || layer?.id;
        checkKind(layer?.widget, adapter?.layerKinds?.[role], `Layer ${id}.${layer?.id}`);
        for (const widget of Object.values(layer?.widgets || {})) checkWidget(widget, `Layer ${id}.${layer?.id}`);
        for (const widget of Object.values(layer?.widgets || {})) checkKind(widget, adapter?.layerKinds?.[role], `Layer ${id}.${layer?.id}`);
        if (adapter?.layerRoles && !Object.hasOwn(adapter.layerRoles, role)) issues.push(`Layer ${id}.${layer?.id} has an unsupported rendering role.`);
        if (layer?.input && !(scene.inputs || []).some(input => input.id === layer.input)) issues.push(`Layer ${id}.${layer?.id} has no ${layer.input} input.`);
      }
      const roles = (scene.layers || []).map(entry => entry.role || entry.id);
      for (const role of roles) if (roles.filter(candidate => candidate === role).length > 1) issues.push(`Scene ${id} has duplicate ${role} rendering roles.`);
      for (const role of adapter?.requiredLayers || []) if (!roles.includes(role)) issues.push(`Scene ${id} needs the ${role} layer.`);
    }
    if (scene.kind === 'tabs') {
      if (!scene.tabs?.length) issues.push(`Scene ${id} needs at least one tab.`);
      if (scene.settingsInput && !(scene.inputs || []).some(input => input.id === scene.settingsInput)) issues.push(`Scene ${id} has no ${scene.settingsInput} settings input.`);
      const keys = new Set();
      for (const tab of scene.tabs || []) {
        if (!tab?.id || keys.has(tab.id)) issues.push(`Scene ${id} needs unique tab names.`);
        keys.add(tab?.id);
        checkWidget(tab?.widget, `Tab ${id}.${tab?.id}`);
        const role = tab?.role || tab?.id;
        checkKind(tab?.widget, adapter?.tabKinds?.[role], `Tab ${id}.${tab?.id}`);
        if (adapter?.tabRoles && !Object.hasOwn(adapter.tabRoles, role)) issues.push(`Tab ${id}.${tab?.id} has an unsupported display role.`);
        if (tab?.input && !(scene.inputs || []).some(input => input.id === tab.input)) issues.push(`Tab ${id}.${tab?.id} has no ${tab.input} input.`);
      }
      const roles = (scene.tabs || []).map(entry => entry.role || entry.id);
      for (const role of roles) if (roles.filter(candidate => candidate === role).length > 1) issues.push(`Scene ${id} has duplicate ${role} tab roles.`);
      for (const role of adapter?.requiredTabs || []) if (!roles.includes(role)) issues.push(`Scene ${id} needs the ${role} tab.`);
      if (!scene.tabs?.some(tab => tab.id === scene.defaultTab)) issues.push(`Scene ${id} has no default tab ${scene.defaultTab || '?'}.`);
    }
  }
  const ruleIds = new Set();
  for (const rule of value.rules || []) {
    if (!rule?.id || ruleIds.has(rule.id)) issues.push('Selection rules need unique names.');
    ruleIds.add(rule?.id);
    if (!value.scenes?.[rule.scene]) issues.push(`Rule ${rule?.id || '?'} refers to missing scene ${rule?.scene || '?'}.`);
    if (rule.when?.path && !Array.isArray(rule.when.path)) issues.push(`Rule ${rule.id} path must be a list.`);
    if (rule.when?.paths && (!Array.isArray(rule.when.paths) || rule.when.paths.some(path => !Array.isArray(path)))) issues.push(`Rule ${rule.id} alternative paths must be lists.`);
    if (rule.when?.hasProperties && !Array.isArray(rule.when.hasProperties)) issues.push(`Rule ${rule.id} required properties must be a list.`);
    if (rule.focus && !Object.hasOwn(value.focusModes || {}, rule.focus)) issues.push(`Rule ${rule.id} uses an undeclared focus mode.`);
    const mode = value.focusModes?.[rule.focus];
    if (mode?.source?.scope === 'layer' && !graphicsLayerForRole(value.scenes?.[rule.scene], String(mode.source.path || '').split('.')[0])) issues.push(`Rule ${rule.id} focus source needs a layer in its scene.`);
  }
  return issues;
}
