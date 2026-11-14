import { scalarPlotColor } from "../shared/plots/style.js";

const interactiveCanvases = new WeakMap();
const interactionControllers = new Set();
const canvasIds = new WeakMap();
let nextCanvasId = 1;
let globalWheelListenerInstalled = false;
let globalPointerCaptureInstalled = false;

function axisRange(axis) {
  const minimum = Number(axis?.minimum), maximum = Number(axis?.maximum);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum <= minimum) throw new Error("A raster plot axis needs finite, increasing minimum and maximum values.");
  return { minimum, maximum };
}

function valueRange(values, declared) {
  if (Array.isArray(declared) && declared.length === 2 && declared.every(Number.isFinite) && declared[1] > declared[0]) return declared;
  let minimum = Infinity, maximum = -Infinity;
  for (const entry of values) {
    const value = Number(entry);
    if (Number.isFinite(value)) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); }
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return [0, 1];
  if (maximum === minimum) return [minimum, minimum + Math.max(Math.abs(minimum) * 0.05, 1)];
  return [minimum, maximum];
}

function tickLabel(value) { return Number(value.toPrecision(4)).toString(); }

function limitsFromAxes(xAxis, yAxis) {
  return { x: axisRange(xAxis), y: axisRange(yAxis) };
}

function pointInPlot(plot, x, y) {
  return x >= plot.x && x <= plot.x + plot.width && y >= plot.y && y <= plot.y + plot.height;
}

function plotAt(controller, x, y) {
  return [...controller.plots.values()].find(plot => pointInPlot(plot, x, y));
}

function controllerAt(clientX, clientY) {
  for (const reference of interactionControllers) {
    const controller = reference.deref();
    if (!controller) { interactionControllers.delete(reference); continue; }
    // A canvas can be unmounted while its weakly held controller is still
    // reachable during the same render turn. Detached plot bounds are stale and
    // must not intercept wheel input intended for a newly mounted view.
    if (!controller.canvas?.isConnected) continue;
    const bounds = controller.canvas.getBoundingClientRect();
    const x = clientX - bounds.left, y = clientY - bounds.top;
    const plot = plotAt(controller, x, y);
    if (plot) return { controller, plot, point: { x, y } };
  }
  return null;
}

function notifyViewChange(plot) {
  plot.onChange?.({
    id: plot.id,
    xAxis: { minimum: plot.view.x.minimum, maximum: plot.view.x.maximum },
    yAxis: { minimum: plot.view.y.minimum, maximum: plot.view.y.maximum },
  });
}

function redrawPlot(plot) {
  const { context, viewport, background } = plot;
  context.save();
  context.beginPath(); context.rect(viewport.x, viewport.y, viewport.width, viewport.height); context.clip();
  if (background) { context.fillStyle = background; context.fillRect(viewport.x, viewport.y, viewport.width, viewport.height); }
  else context.clearRect(viewport.x, viewport.y, viewport.width, viewport.height);
  try { plot.redraw(); }
  finally { context.restore(); }
}

function handleWheel(event) {
  const hit = controllerAt(event.clientX, event.clientY);
  if (!hit) return;
  const { controller, plot, point } = hit;
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1 / 1.2 : 1.2;
  const zoom = (limits, anchor, base) => {
    const span = limits.maximum - limits.minimum;
    const minimumSpan = (base.maximum - base.minimum) / 256;
    const maximumSpan = base.maximum - base.minimum;
    const newSpan = Math.max(minimumSpan, Math.min(maximumSpan, span * factor));
    const fraction = Math.max(0, Math.min(1, (anchor - limits.minimum) / span));
    let minimum = anchor - fraction * newSpan;
    let maximum = minimum + newSpan;
    if (minimum < base.minimum) { minimum = base.minimum; maximum = minimum + newSpan; }
    if (maximum > base.maximum) { maximum = base.maximum; minimum = maximum - newSpan; }
    return { minimum, maximum };
  };
  const xFraction = (point.x - plot.x) / plot.width;
  const yFraction = plot.yAxisDirection === "down"
    ? (point.y - plot.y) / plot.height
    : 1 - (point.y - plot.y) / plot.height;
  const xAnchor = plot.view.x.minimum + xFraction * (plot.view.x.maximum - plot.view.x.minimum);
  const yAnchor = plot.view.y.minimum + yFraction * (plot.view.y.maximum - plot.view.y.minimum);
  plot.view = {
    x: zoom(plot.view.x, xAnchor, plot.base.x),
    y: zoom(plot.view.y, yAnchor, plot.base.y),
    base: plot.base,
  };
  controller.views.set(plot.id, plot.view);
  redrawPlot(plot);
  notifyViewChange(plot);
}

function ensureInteractions(canvas) {
  let controller = interactiveCanvases.get(canvas);
  if (controller) return controller;
  controller = { canvas, frame: undefined, plots: new Map(), views: new Map(), drag: null };
  interactionControllers.add(new WeakRef(controller));
  if (!globalWheelListenerInstalled) {
    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    globalWheelListenerInstalled = true;
  }
  if (!globalPointerCaptureInstalled) {
    window.addEventListener("pointermove", event => {
      for (const reference of interactionControllers) {
        const active = reference.deref();
        if (!active) { interactionControllers.delete(reference); continue; }
        if (active.drag?.pointerId === event.pointerId) {
          event.__fullmetaPlotHandled = true;
          break;
        }
      }
    }, { capture: true });
    globalPointerCaptureInstalled = true;
  }
  const position = event => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    const point = position(event), plot = plotAt(controller, point.x, point.y);
    if (!plot) return;
    event.preventDefault();
    controller.drag = { plot, start: point, pointerId: event.pointerId, view: { x: { ...plot.view.x }, y: { ...plot.view.y } } };
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", event => {
    const point = position(event), drag = controller.drag;
    if (!drag) {
      canvas.style.cursor = plotAt(controller, point.x, point.y) ? "grab" : "default";
      return;
    }
    event.preventDefault();
    const { plot } = drag;
    const shiftX = (drag.start.x - point.x) / plot.width * (drag.view.x.maximum - drag.view.x.minimum);
    const verticalDelta = point.y - drag.start.y;
    const shiftY = (plot.yAxisDirection === "down" ? -verticalDelta : verticalDelta) / plot.height * (drag.view.y.maximum - drag.view.y.minimum);
    plot.view = {
      x: { minimum: drag.view.x.minimum + shiftX, maximum: drag.view.x.maximum + shiftX },
      y: { minimum: drag.view.y.minimum + shiftY, maximum: drag.view.y.maximum + shiftY },
      base: plot.base,
    };
    controller.views.set(plot.id, plot.view);
    redrawPlot(plot);
    notifyViewChange(plot);
  });
  const endDrag = () => { controller.drag = null; canvas.style.cursor = "grab"; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("dblclick", event => {
    const point = position(event), plot = plotAt(controller, point.x, point.y);
    if (!plot) return;
    event.preventDefault();
    controller.views.delete(plot.id);
    plot.view = { x: { ...plot.base.x }, y: { ...plot.base.y }, base: plot.base };
    redrawPlot(plot);
    notifyViewChange(plot);
  });
  interactiveCanvases.set(canvas, controller);
  return controller;
}

export function beginRasterPlot2dFrame(canvas, frame) {
  if (!canvas) return;
  const controller = ensureInteractions(canvas);
  if (controller.frame !== frame) {
    controller.frame = frame;
    controller.plots.clear();
  }
}

function registerInteraction(canvas, interaction, geometry, base, yAxisDirection, renderState) {
  if (!interaction?.id || !canvas) return null;
  const controller = ensureInteractions(canvas);
  if (controller.frame !== interaction.frame) {
    controller.frame = interaction.frame;
    controller.plots.clear();
  }
  const saved = controller.views.get(interaction.id);
  const restored = interaction.viewState;
  const restoredMatchesBase = restored?.base?.x?.minimum === base.x.minimum && restored?.base?.x?.maximum === base.x.maximum
    && restored?.base?.y?.minimum === base.y.minimum && restored?.base?.y?.maximum === base.y.maximum
    && Number.isFinite(restored?.x?.minimum) && Number.isFinite(restored?.x?.maximum) && restored.x.maximum > restored.x.minimum
    && Number.isFinite(restored?.y?.minimum) && Number.isFinite(restored?.y?.maximum) && restored.y.maximum > restored.y.minimum;
  const unchangedBounds = saved
    && saved.base?.x.minimum === base.x.minimum && saved.base?.x.maximum === base.x.maximum
    && saved.base?.y.minimum === base.y.minimum && saved.base?.y.maximum === base.y.maximum;
  const view = unchangedBounds ? saved : restoredMatchesBase
    ? { x: { ...restored.x }, y: { ...restored.y }, base }
    : { x: { ...base.x }, y: { ...base.y }, base };
  view.base = base;
  const plot = { id: interaction.id, ...geometry, base, view, yAxisDirection, onChange: interaction.onChange, ...renderState };
  controller.views.set(interaction.id, view);
  controller.plots.set(interaction.id, plot);
  return view;
}

function parseColor(value) {
  if (typeof value !== "string") return null;
  const hex = value.match(/^#([\da-f]{6})$/i);
  if (hex) return [0, 2, 4].map(index => parseInt(hex[1].slice(index, index + 2), 16));
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i);
  if (rgb) return rgb.slice(1, 4).map(Number);
  const hsl = value.match(/^hsla?\(\s*(-?[\d.]+)(?:deg)?[, ]+([\d.]+)%[, ]+([\d.]+)%/i);
  if (!hsl) return null;
  const hue = ((Number(hsl[1]) % 360) + 360) % 360 / 360, saturation = Number(hsl[2]) / 100, lightness = Number(hsl[3]) / 100;
  const channel = offset => {
    const k = (offset + hue * 12) % 12, a = saturation * Math.min(lightness, 1 - lightness);
    return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [channel(0), channel(8), channel(4)];
}

/**
 * Draw a row-major scalar raster in physical 2D coordinates with shared axes.
 * Raster grids register as independently interactive plots by default. The
 * shared widget retains their draw inputs and repaints only the owning
 * viewport on zoom, pan, or reset; callers provide drawOverlay for annotations
 * that must follow the current axis limits. onChange is a view-state notice,
 * not a request to rebuild the host's entire Graphics Console.
 */
export function drawRasterPlot2d({ canvas, context, data, grid, xAxis, yAxis, range, color = scalarPlotColor, opacity = 1, viewport, interaction } = {}) {
  const input = data && typeof data === "object" ? data : { grid, xAxis, yAxis, range };
  const raster = input.grid || {};
  const widthSamples = Number(raster.width), heightSamples = Number(raster.height), values = raster.values;
  if (!Number.isInteger(widthSamples) || widthSamples < 2 || !Number.isInteger(heightSamples) || heightSamples < 2
    || !values || values.length !== widthSamples * heightSamples) throw new Error("A 2D raster plot needs a row-major grid with at least 2 × 2 scalar samples.");
  if (canvas) {
    const bounds = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(bounds.width * ratio)); canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    context = context || canvas.getContext("2d");
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  if (!context?.canvas || typeof color !== "function") return null;
  const bounds = context.canvas.getBoundingClientRect(), width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
  const baseLimits = limitsFromAxes(input.xAxis, input.yAxis);
  const colorLimits = valueRange(values, input.range);
  const region = viewport || { x: 0, y: 0, width, height };
  const left = 58, right = 8, top = 8, bottom = 48;
  const side = Math.max(1, Math.min(region.width - left - right, region.height - top - bottom));
  const plotX = region.x + left + Math.max(0, (region.width - left - right - side) / 2);
  const plotY = region.y + top + Math.max(0, (region.height - top - bottom - side) / 2);
  const controller = ensureInteractions(context.canvas);
  let canvasId = canvasIds.get(context.canvas);
  if (!canvasId) { canvasId = `plot2d-${nextCanvasId++}`; canvasIds.set(context.canvas, canvasId); }
  const resolvedInteraction = interaction?.id ? interaction : {
    ...interaction,
    id: `${canvasId}-${region.x}-${region.y}-${region.width}-${region.height}`,
    frame: interaction?.frame ?? controller.frame,
  };
  const renderState = {
    context,
    viewport: { ...region },
    background: input.background || resolvedInteraction.background,
    redraw: () => drawRasterPlot2d({ context, data: input, color, opacity, viewport: region, interaction: resolvedInteraction }),
  };
  const view = registerInteraction(context.canvas, resolvedInteraction, { x: plotX, y: plotY, width: side, height: side }, baseLimits, input.yAxis?.direction, renderState);
  const xLimits = view?.x || baseLimits.x, yLimits = view?.y || baseLimits.y;
  const plotCanvas = document.createElement("canvas"); plotCanvas.width = widthSamples; plotCanvas.height = heightSamples;
  const plotContext = plotCanvas.getContext("2d");
  if (!plotContext) return null;
  const image = plotContext.createImageData(widthSamples, heightSamples);
  const alpha = Math.round(255 * Math.max(0, Math.min(1, Number(opacity))));
  for (let row = 0; row < heightSamples; row++) for (let column = 0; column < widthSamples; column++) {
    const value = Number(values[row * widthSamples + column]);
    if (!Number.isFinite(value)) continue;
    const rgb = parseColor(color(value, colorLimits, alpha / 255));
    if (!rgb || rgb.length !== 3 || !rgb.every(Number.isFinite)) continue;
    const displayRow = input.yAxis?.direction === "down" ? row : heightSamples - 1 - row;
    const pixel = (displayRow * widthSamples + column) * 4;
    image.data[pixel] = rgb[0]; image.data[pixel + 1] = rgb[1]; image.data[pixel + 2] = rgb[2]; image.data[pixel + 3] = alpha;
  }
  plotContext.putImageData(image, 0, 0);
  if (input.background) { context.fillStyle = input.background; context.fillRect(region.x, region.y, region.width, region.height); }
  const xSpan = xLimits.maximum - xLimits.minimum, ySpan = yLimits.maximum - yLimits.minimum;
  const baseXSpan = baseLimits.x.maximum - baseLimits.x.minimum, baseYSpan = baseLimits.y.maximum - baseLimits.y.minimum;
  const imageX = plotX + (baseLimits.x.minimum - xLimits.minimum) / xSpan * side;
  const imageY = plotY + (input.yAxis?.direction === "down"
    ? (baseLimits.y.minimum - yLimits.minimum) / ySpan
    : (yLimits.maximum - baseLimits.y.maximum) / ySpan) * side;
  const imageWidth = baseXSpan / xSpan * side, imageHeight = baseYSpan / ySpan * side;
  context.save();
  context.beginPath(); context.rect(plotX, plotY, side, side); context.clip();
  context.imageSmoothingEnabled = false;
  context.drawImage(plotCanvas, imageX, imageY, imageWidth, imageHeight);
  context.restore();

  const plotBottom = plotY + side, plotRight = plotX + side;
  context.save(); context.strokeStyle = "#8798aa"; context.fillStyle = "#9fb4c8"; context.lineWidth = 1; context.font = "9px sans-serif";
  context.beginPath(); context.moveTo(plotX, plotY); context.lineTo(plotX, plotBottom); context.lineTo(plotRight, plotBottom); context.stroke();
  for (const fraction of [-1, 0, 1]) {
    const tickX = plotX + (fraction + 1) * side / 2;
    const tickY = plotY + (input.yAxis?.direction === "down" ? fraction + 1 : 1 - fraction) * side / 2;
    const xValue = xLimits.minimum + (fraction + 1) * (xLimits.maximum - xLimits.minimum) / 2;
    const yValue = yLimits.minimum + (fraction + 1) * (yLimits.maximum - yLimits.minimum) / 2;
    context.beginPath(); context.moveTo(tickX, plotBottom); context.lineTo(tickX, plotBottom + 4); context.moveTo(plotX - 4, tickY); context.lineTo(plotX, tickY); context.stroke();
    context.textAlign = fraction === -1 ? "left" : fraction === 1 ? "right" : "center";
    context.fillText(tickLabel(xValue), tickX, plotBottom + 13);
    context.textAlign = "right"; context.fillText(tickLabel(yValue), plotX - 6, tickY + 3);
  }
  context.fillStyle = "#e4edf7"; context.font = "10px sans-serif"; context.textAlign = "center";
  context.fillText(input.xAxis?.label || "x", plotX + side / 2, plotBottom + 27);
  if (input.yAxis?.label) { context.save(); context.translate(plotX - 48, plotY + side / 2); context.rotate(-Math.PI / 2); context.fillText(input.yAxis.label, 0, 0); context.restore(); }
  context.restore();
  const plot = { x: plotX, y: plotY, width: side, height: side, colorRange: colorLimits, xAxis: xLimits, yAxis: yLimits };
  resolvedInteraction.drawOverlay?.(plot);
  return plot;
}
