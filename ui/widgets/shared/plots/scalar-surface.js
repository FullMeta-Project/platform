import { scalarPlotColor } from "./style.js";

function surfaceTriangles(surfaces) {
  const triangles = [];
  for (const surface of Array.isArray(surfaces) ? surfaces : []) {
    // Compact normalized contract: vertices are shared within a surface and
    // faces refer to them by index. The inline form remains accepted for the
    // editor's existing field overlay adapter.
    if (Array.isArray(surface?.vertices) && Array.isArray(surface?.faces)) {
      for (const face of surface.faces) {
        if (!Array.isArray(face) || face.length < 3 || face.some((index) => !Number.isInteger(index) || !surface.vertices[index])) continue;
        for (let index = 1; index < face.length - 1; index++) {
          triangles.push({ points: [surface.vertices[face[0]], surface.vertices[face[index]], surface.vertices[face[index + 1]]] });
        }
      }
      continue;
    }
    const points = Array.isArray(surface?.points) ? surface.points : [];
    if (points.length === 3) triangles.push({ points });
  }
  return triangles.filter(({ points }) => points.every((point) => Array.isArray(point?.position)
    && point.position.length >= 2 && point.position.every((value) => Number.isFinite(Number(value)))
    && Number.isFinite(Number(point.value))));
}

function scalarPlotProjection(triangles, dimension, width, height, view = {}) {
  const points = triangles.flatMap((surface) => surface.points);
  const coordinates = points.map(({ position }) => {
    if (dimension === 2) return [Number(position[0]), Number(position[1]), 0];
    return [Number(position[0]), Number(position[1]), Number(position[2] ?? 0)];
  });
  if (!coordinates.length) return () => [NaN, NaN, NaN];
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  for (const point of coordinates) for (let axis = 0; axis < 3; axis++) { minimum[axis] = Math.min(minimum[axis], point[axis]); maximum[axis] = Math.max(maximum[axis], point[axis]); }
  const defaultCenter = minimum.map((value, axis) => (value + maximum[axis]) / 2);
  const center = Array.isArray(view.center) && view.center.length >= dimension
    && view.center.slice(0, dimension).every(value => Number.isFinite(Number(value)))
    ? [Number(view.center[0]), Number(view.center[1]), dimension === 3 ? Number(view.center[2]) : defaultCenter[2]]
    : defaultCenter;
  const yaw = Number.isFinite(Number(view.yaw)) ? Number(view.yaw) : 0.68;
  const pitch = Number.isFinite(Number(view.pitch)) ? Number(view.pitch) : -0.42;
  const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw), cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const projectPoint = (point) => {
    const x = Number(point?.[0]) - center[0], y = Number(point?.[1]) - center[1], z = Number(point?.[2] ?? 0) - center[2];
    if (dimension === 2) return [x, -y, 0];
    const rotatedX = cosYaw * x - sinYaw * y, rotatedY = sinYaw * x + cosYaw * y, vertical = cosPitch * rotatedY - sinPitch * z, depth = sinPitch * rotatedY + cosPitch * z;
    return [rotatedX, -vertical, depth];
  };
  const rotated = coordinates.map(projectPoint), rotatedBounds = rotated.reduce((bounds, point) => ({ minX: Math.min(bounds.minX, point[0]), maxX: Math.max(bounds.maxX, point[0]), minY: Math.min(bounds.minY, point[1]), maxY: Math.max(bounds.maxY, point[1]) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const spanX = Math.max(1e-12, rotatedBounds.maxX - rotatedBounds.minX), spanY = Math.max(1e-12, rotatedBounds.maxY - rotatedBounds.minY);
  const zoom = Number.isFinite(Number(view.zoom)) ? Math.max(0.35, Math.min(5, Number(view.zoom))) : 1;
  const scale = Math.min(width * 0.78 / spanX, height * 0.78 / spanY) * zoom;
  const panX = Number.isFinite(Number(view.pan?.[0])) ? Number(view.pan[0]) : (Number(view.panX) || 0);
  const panY = Number.isFinite(Number(view.pan?.[1])) ? Number(view.pan[1]) : (Number(view.panY) || 0);
  return (point) => { const [x, y, depth] = projectPoint(point); return [width / 2 + panX + x * scale, height / 2 + panY + y * scale, depth]; };
}

/**
 * Draw normalized scalar surfaces. The public data form stores shared
 * `vertices` and indexed polygon `faces`; existing adapters may still pass
 * one inline `points` triangle per surface. A host can provide `project` and
 * `color` callbacks to share a view and palette with another graphics widget.
 */
export function drawScalarPlot({ canvas, context, data, surfaces = [], project, view = {}, color = scalarPlotColor, range = null, opacity, alpha = 0.9, dimension = 3 } = {}) {
  const input = data && typeof data === "object" ? data : { surfaces, range, opacity: opacity ?? alpha };
  const inputSurfaces = Array.isArray(input.surfaces) ? input.surfaces : [];
  const inputRange = Array.isArray(input.range) && input.range.length === 2 ? input.range : range;
  const inputOpacity = Number.isFinite(Number(input.opacity)) ? Number(input.opacity) : (opacity ?? alpha);
  let width, height;
  if (canvas) {
    const bounds = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context = context || canvas.getContext("2d");
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!project) {
      context?.clearRect(0, 0, width, height);
      if (input.background && context) {
        context.fillStyle = input.background;
        context.fillRect(0, 0, width, height);
      }
    }
  } else if (context?.canvas) {
    const bounds = context.canvas.getBoundingClientRect(); width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
  }
  if (!context || typeof color !== "function") return;
  const sourceTriangles = surfaceTriangles(inputSurfaces);
  if (typeof project !== "function") project = scalarPlotProjection(sourceTriangles, dimension, width || 1, height || 1, view);
  const values = sourceTriangles.flatMap((surface) => surface.points.map((point) => Number(point.value))).filter(Number.isFinite);
  const colorRange = inputRange || (values.length ? values.reduce((bounds, value) => [Math.min(bounds[0], value), Math.max(bounds[1], value)], [Infinity, -Infinity]) : [0, 1]);
  const triangles = sourceTriangles.map((surface) => ({ points: surface.points.map((point) => ({ ...point, screen: project(point.position) })) }))
    .filter((entry) => entry.points.length === 3)
    .sort((left, right) => left.points.reduce((sum, point) => sum + (point.screen?.[2] || 0), 0) - right.points.reduce((sum, point) => sum + (point.screen?.[2] || 0), 0));
  for (const { points } of triangles) {
    if (points.some((point) => !point.screen?.every(Number.isFinite))) continue;
    context.beginPath(); context.moveTo(points[0].screen[0], points[0].screen[1]);
    context.lineTo(points[1].screen[0], points[1].screen[1]); context.lineTo(points[2].screen[0], points[2].screen[1]); context.closePath();
    context.fillStyle = color(points.reduce((sum, point) => sum + Number(point.value), 0) / 3, colorRange, inputOpacity); context.fill();
  }
}

