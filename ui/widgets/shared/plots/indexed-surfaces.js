/** Adapt field-slice triangles to the shared plot2d/plot3d indexed-surface contract. */
export function fieldSlicesToPlotData(slices, positionFor = (point) => point.position) {
  const vertices = [], faces = [], vertexIndexes = new Map();
  for (const slice of Array.isArray(slices) ? slices : []) {
    const points = Array.isArray(slice?.points) ? slice.points : [];
    if (points.length !== 3) continue;
    const face = [];
    for (const point of points) {
      const position = positionFor(point);
      const value = Number(point?.value);
      if (!Array.isArray(position) || position.length < 2 || !position.every(Number.isFinite) || !Number.isFinite(value)) {
        face.length = 0;
        break;
      }
      const key = JSON.stringify([position, value]);
      let vertexIndex = vertexIndexes.get(key);
      if (vertexIndex === undefined) {
        vertexIndex = vertices.length;
        vertexIndexes.set(key, vertexIndex);
        vertices.push({ position, value });
      }
      face.push(vertexIndex);
    }
    if (face.length === 3) faces.push(face);
  }
  return { surfaces: vertices.length ? [{ vertices, faces }] : [] };
}

