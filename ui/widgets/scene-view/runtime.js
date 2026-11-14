const finitePosition = (position, dimension) => Array.isArray(position)
  && position.length >= dimension
  && position.slice(0, dimension).every((coordinate) => Number.isFinite(Number(coordinate)));

const scenePoint = (position, dimension) => [
  Number(position[0]),
  Number(position[1]),
  dimension === 3 ? Number(position[2]) : 0,
];

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function defaultProjection(scene, width, height, view = {}) {
  const dimension = scene.dimension === 2 ? 2 : 3;
  const positions = scene.primitives.flatMap((primitive) => primitive.points || [])
    .filter((position) => finitePosition(position, dimension))
    .map((position) => scenePoint(position, dimension));
  if (!positions.length) return () => [NaN, NaN, NaN];

  const bounds = [0, 1, 2].map((axis) => positions.reduce((range, position) => ({
    minimum: Math.min(range.minimum, position[axis]),
    maximum: Math.max(range.maximum, position[axis]),
  }), { minimum: Infinity, maximum: -Infinity }));
  const defaultCenter = bounds.map(({ minimum, maximum }) => (minimum + maximum) / 2);
  const center = Array.isArray(view.center) && finitePosition(view.center, dimension)
    ? scenePoint(view.center, dimension)
    : defaultCenter;
  const yaw = Number.isFinite(Number(view.yaw)) ? Number(view.yaw) : 0.68;
  const pitch = Number.isFinite(Number(view.pitch)) ? Number(view.pitch) : -0.42;
  const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw), cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const rotate = (position) => {
    const x = position[0] - center[0], y = position[1] - center[1], z = position[2] - center[2];
    if (dimension === 2) return [x, -y, 0];
    const rotatedX = cosYaw * x - sinYaw * y;
    const rotatedY = sinYaw * x + cosYaw * y;
    return [rotatedX, -(cosPitch * rotatedY - sinPitch * z), sinPitch * rotatedY + cosPitch * z];
  };
  const rotated = positions.map(rotate);
  const screenBounds = rotated.reduce((range, position) => ({
    minimumX: Math.min(range.minimumX, position[0]), maximumX: Math.max(range.maximumX, position[0]),
    minimumY: Math.min(range.minimumY, position[1]), maximumY: Math.max(range.maximumY, position[1]),
  }), { minimumX: Infinity, maximumX: -Infinity, minimumY: Infinity, maximumY: -Infinity });
  const spanX = Math.max(1e-12, screenBounds.maximumX - screenBounds.minimumX);
  const spanY = Math.max(1e-12, screenBounds.maximumY - screenBounds.minimumY);
  const zoom = clamp(Number(view.zoom) || 1, 0.05, 100);
  const scale = Math.min(width * 0.82 / spanX, height * 0.82 / spanY) * zoom;
  const panX = Number.isFinite(Number(view.pan?.[0])) ? Number(view.pan[0])
    : Number.isFinite(Number(view.panX)) ? Number(view.panX) : 0;
  const panY = Number.isFinite(Number(view.pan?.[1])) ? Number(view.pan[1])
    : Number.isFinite(Number(view.panY)) ? Number(view.panY) : 0;
  return (position) => {
    const [x, y, depth] = rotate(scenePoint(position, dimension));
    return [width / 2 + panX + x * scale, height / 2 + panY + y * scale, depth];
  };
}
export { defaultProjection as sceneProjection };

function drawPrimitive(context, primitive, projectedPoints) {
  const rawOpacity = Number(primitive.opacity ?? 1), rawLineWidth = Number(primitive.lineWidth ?? 1.5);
  const opacity = Number.isFinite(rawOpacity) ? clamp(rawOpacity, 0, 1) : 1;
  const lineWidth = Number.isFinite(rawLineWidth) ? Math.max(0, rawLineWidth) : 1.5;
  context.save();
  context.globalAlpha = opacity;
  context.lineWidth = lineWidth;
  context.strokeStyle = primitive.stroke || "#9db1c7";
  context.fillStyle = primitive.fill || "#58d2bd";
  context.lineJoin = "round";
  context.lineCap = "round";

  if (primitive.type === "point") {
    const [x, y] = projectedPoints[0] || [];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      context.beginPath(); context.arc(x, y, Math.max(2, lineWidth * 1.5), 0, Math.PI * 2);
      if (primitive.fill) context.fill(); else context.stroke();
    }
  } else if (projectedPoints.length >= 2 && projectedPoints.every((point) => point.every(Number.isFinite))) {
    context.beginPath(); context.moveTo(projectedPoints[0][0], projectedPoints[0][1]);
    for (const [x, y] of projectedPoints.slice(1)) context.lineTo(x, y);
    if (primitive.type === "triangle" || primitive.closed) context.closePath();
    if (primitive.fill && (primitive.type === "triangle" || primitive.closed)) context.fill();
    if (primitive.stroke !== "none") context.stroke();
  }
  context.restore();
}

/**
 * Render normalized geometry or mesh primitives to a canvas/context.
 * `scene` is `{ dimension: 2|3, primitives: [{ type, points, ...style }] }`.
 * The host owns geometry extraction, pointer interaction and view-state updates.
 */
export function drawSceneView({ canvas, context, scene = {}, project, view = {}, background = "#0c141e", clear = true } = {}) {
  const primitives = Array.isArray(scene.primitives) ? scene.primitives : [];
  let width, height;
  if (canvas) {
    const bounds = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context = context || canvas.getContext("2d");
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  } else if (context?.canvas) {
    const bounds = context.canvas.getBoundingClientRect(); width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
  }
  if (!context || !width || !height) return;
  if (clear) context.clearRect(0, 0, width, height);
  if (background) { context.fillStyle = background; context.fillRect(0, 0, width, height); }
  const projection = typeof project === "function" ? project : defaultProjection(scene, width, height, view);
  const commands = primitives.map((primitive) => {
    const dimension = scene.dimension === 2 ? 2 : 3;
    const positions = (primitive.points || []).filter((position) => finitePosition(position, dimension));
    const projected = positions.map((position) => {
      const result = projection(position);
      return Array.isArray(result) ? result : [NaN, NaN, 0];
    });
    const depth = projected.length ? projected.reduce((sum, point) => sum + (Number(point[2]) || 0), 0) / projected.length : 0;
    return { primitive, projected, depth };
  }).filter(({ primitive }) => ["point", "polyline", "triangle"].includes(primitive.type));
  commands.sort((left, right) => left.depth - right.depth);
  for (const { primitive, projected } of commands) drawPrimitive(context, primitive, projected);
}

/** A standalone shared graphics renderer; application packages may register it as a geometry widget. */
export const sceneViewRenderer = Object.freeze({
  id: "sceneView",
  kind: "scene",
  dimensions: Object.freeze([2, 3]),
  render: drawSceneView,
});
