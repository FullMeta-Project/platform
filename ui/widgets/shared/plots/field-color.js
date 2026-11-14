export function fieldColor(value, range, alpha = 1) {
  let t = !Number.isFinite(value) || value <= range[0] ? 0 : value >= range[1] ? 1 : (value - range[0]) / (range[1] - range[0]);
  const stops = [[30, 64, 175], [14, 165, 233], [45, 212, 191], [250, 204, 21], [249, 115, 22], [220, 38, 38]];
  t = Math.pow(t, .8);
  const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const c = stops[i].map((value, index) => Math.round(value + (stops[i + 1][index] - value) * f));
  return `rgba(${c.join(',')},${alpha})`;
}
