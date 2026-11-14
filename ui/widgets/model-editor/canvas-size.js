const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_PIXELS = 16 * 1024 * 1024;

// Keep the canvas CSS box independent from its backing-store dimensions. The
// stylesheet constrains the element to its parent; this helper only sizes the
// pixel buffer from that rendered box, with limits for browser canvas budgets.
export function resizeCanvasForDisplay(canvas, context) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, bounds.width || canvas.clientWidth || 1);
  const height = Math.max(1, bounds.height || canvas.clientHeight || 1);
  const requestedRatio = Math.max(0.1, Number(window.devicePixelRatio) || 1);
  const ratio = Math.min(
    requestedRatio,
    MAX_CANVAS_DIMENSION / width,
    MAX_CANVAS_DIMENSION / height,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  );
  const backingWidth = Math.max(1, Math.floor(width * ratio));
  const backingHeight = Math.max(1, Math.floor(height * ratio));
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height, ratio };
}
