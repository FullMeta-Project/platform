export const plot1dColors = Object.freeze(["#58d2bd", "#ffad5c", "#83b8ff", "#e68bff", "#f6d365", "#f57f7f", "#a6df8a"]);

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
const seriesColor = (index) => index < plot1dColors.length ? plot1dColors[index] : `hsl(${((index - plot1dColors.length) * 137.508 + 24) % 360} 76% 68%)`;
export const plot1dColor = seriesColor;

export function scalarPlotColor(value, range = [0, 1], alpha = 0.9) {
  const minimum = Number(range?.[0]), maximum = Number(range?.[1]), span = maximum - minimum;
  const ratio = Number.isFinite(value) && Number.isFinite(span) && span > 0 ? Math.max(0, Math.min(1, (value - minimum) / span)) : 0.5;
  const stops = [[45, 106, 225], [45, 202, 184], [250, 207, 89], [236, 95, 87]], scaled = ratio * (stops.length - 1), index = Math.min(stops.length - 2, Math.floor(scaled)), local = scaled - index;
  const channels = stops[index].map((channel, axis) => Math.round(channel + (stops[index + 1][axis] - channel) * local));
  return `rgba(${channels.join(",")},${alpha})`;
}


