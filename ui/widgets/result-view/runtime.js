import { graphicsWidgetForLayer } from "../graphics-console/widget.js";

/**
 * Resolve a result scene's presentation from the graphics-console declaration.
 *
 * A layered scene displays its surface and child renderers in one spatial view.
 * A tabs scene displays one declared renderer at a time. Neither shape implies
 * a particular application, result format, layer role, or tab role.
 */
export function resolveResultView({ scene, widgets = {}, dimension, selectedTabId } = {}) {
  if (!scene || !['layered', 'tabs'].includes(scene.kind)) {
    throw new Error('A result view needs a layered or tabs graphics scene.');
  }

  const resolveWidget = (id, where, checkDimension = false) => {
    const widget = widgets[id];
    if (!id || !widget) throw new Error(`${where} uses an unregistered graphics widget.`);
    if (checkDimension && widget.dimensions?.length && !widget.dimensions.includes(Number(dimension))) {
      throw new Error(`Graphics widget ${id} cannot display a ${dimension}D spatial result.`);
    }
    return widget;
  };

  if (scene.kind === 'layered') {
    const surfaceWidgetId = scene.surface?.widget;
    const surfaceRenderer = resolveWidget(surfaceWidgetId, `Scene ${scene.id || scene.label || '(unnamed)'} surface`, true);
    const contentLayers = (scene.layers || []).filter(layer => layer.widget || Object.keys(layer.widgets || {}).length)
      .map(layer => {
        const widgetId = graphicsWidgetForLayer(layer, dimension);
        return { layer, widgetId, renderer: resolveWidget(widgetId, `Layer ${layer.id || '(unnamed)'}`, true) };
      });
    if (!contentLayers.length) throw new Error('A layered result scene needs a rendered content layer.');
    const primary = contentLayers[0];
    return {
      layout: 'layered', isSpatial: true, scene,
      surfaceWidgetId, surfaceRenderer, contentLayers,
      contentLayer: primary.layer, contentWidgetId: primary.widgetId,
      contentRenderer: primary.renderer, activeTab: null, tabs: [],
    };
  }

  const tabs = scene.tabs || [];
  if (!tabs.length) throw new Error('A tabbed result scene needs at least one tab.');
  for (const tab of tabs) resolveWidget(tab.widget, `Tab ${tab.id || '(unnamed)'}`);
  const activeTab = tabs.find(tab => tab.id === selectedTabId)
    || tabs.find(tab => tab.id === scene.defaultTab) || tabs[0];
  return {
    layout: 'tabs', isSpatial: false, scene,
    surfaceWidgetId: null, surfaceRenderer: null, contentLayers: [], contentLayer: null,
    contentWidgetId: activeTab.widget, contentRenderer: widgets[activeTab.widget], activeTab, tabs,
  };
}

/** Show the host surface matching the declared scene composition. */
export function showResultViewSurface({ view, spatialHost, tabsHost, spatialNote, tabsNote } = {}) {
  if (!view || !['layered', 'tabs'].includes(view.layout)) throw new Error('Unknown result view layout.');
  const spatial = view.layout === 'layered';
  if (spatialHost) spatialHost.hidden = !spatial;
  if (tabsHost) tabsHost.hidden = spatial;
  if (spatialNote) spatialNote.hidden = !spatial;
  if (tabsNote) tabsNote.hidden = spatial;
  return view;
}
