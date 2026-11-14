import { sceneProjection } from './runtime.js';
/** One owner resizes, clears and projects a layered scene. Layers receive context only. */
export function drawLayeredScene({ canvas, layers = [], background = '#0c141e', project, view = {} } = {}) {
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect(), width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
  const ratio = globalThis.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d'); if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
  if (background) { context.fillStyle = background; context.fillRect(0, 0, width, height); }
  if (typeof project !== 'function') {
    const points = layers.filter(layer => layer.visible !== false).flatMap(layer => {
      const options = layer.options || {}, primitives = options.scene?.primitives || [];
      return [...primitives.flatMap(primitive => primitive.points || []), ...(options.data?.surfaces || []).flatMap(surface => [...(surface.vertices || []), ...(surface.points || [])].map(point => point.position))].filter(Array.isArray);
    });
    if (points.length) project = sceneProjection({ dimension: layers.find(layer => layer.options?.scene?.dimension)?.options.scene.dimension || 3, primitives: [{ points }] }, width, height, { ...view, pan: view.pan || [view.panX || 0, view.panY || 0] });
  }
  for (const layer of layers) {
    if (layer.visible === false) continue;
    const draw = layer.draw || layer.renderer?.render;
    if (typeof draw !== 'function') throw new Error(`Layer ${layer.id || '(unnamed)'} has no drawing kernel.`);
    context.save();
    const { canvas: ignoredCanvas, context: ignoredContext, ...options } = layer.options || {};
    try { draw({ ...options, view, project, context, width, height, clear: false, background: null }); }
    finally { context.restore(); }
  }
  return { width, height, layers: layers.filter(layer => layer.visible !== false).length };
}
