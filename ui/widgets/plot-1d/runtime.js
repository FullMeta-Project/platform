import { plot1dColor } from "../shared/plots/style.js";
import { renderPlotLegend } from './legend.js';

function valueRange(values, minimum, maximum) {
  const hasMinimum = Number.isFinite(Number(minimum)), hasMaximum = Number.isFinite(Number(maximum));
  const measured = values.reduce((range, value) => ({ min: Math.min(range.min, value), max: Math.max(range.max, value) }), { min: Infinity, max: -Infinity });
  let min = hasMinimum ? Number(minimum) : values.length ? measured.min : 0;
  let max = hasMaximum ? Number(maximum) : values.length ? measured.max : 1;
  if (min === max) {
    const bump = Math.max(Math.abs(min) * 0.05, 1);
    min -= bump;
    max += bump;
  } else {
    const padding = (max - min) * 0.04;
    if (!hasMinimum) min -= padding;
    if (!hasMaximum) max += padding;
  }
  return { min, max, span: max - min };
}

function niceTicks(min, max, target) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return { step: 1, values: [min] };
  const raw = span / target, magnitude = 10 ** Math.floor(Math.log10(raw)), fraction = raw / magnitude;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * magnitude;
  const first = Math.ceil(min / step - 1e-10), last = Math.floor(max / step + 1e-10);
  return { step, values: Array.from({ length: Math.min(20, Math.max(0, last - first + 1)) }, (_, index) => (first + index) * step) };
}

function formatTick(value, step) {
  const decimals = Math.max(0, Math.min(8, (step.toFixed(8).replace(/0+$/, "").split(".")[1] || "").length));
  return Number(value.toFixed(decimals)).toString();
}

/** Draw the application-neutral plot1d data contract onto a host-owned canvas. */
export function readyPlot1dSeries(series) {
  return (Array.isArray(series) ? series : []).map((entry, index) => ({
    ...entry,
    color: entry?.color || plot1dColor(index),
    points: (Array.isArray(entry?.points) ? entry.points : []).filter((point) => Array.isArray(point)
      && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
      .map(([x, y]) => [Number(x), Number(y)]),
  })).filter((entry) => entry.points.length);
}

export function drawPlot1d({ canvas, data, series = [], xAxis = {}, yAxes = {} } = {}) {
  const input = data && typeof data === "object" ? data : { series, xAxis, yAxes };
  const ready = readyPlot1dSeries(input.series);
  if (!canvas) return "";

  const bounds = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (!ready.length) { context.clearRect(0, 0, width, height); return ""; }
  const pad = { left: 58, right: 38, top: 20, bottom: 48 }, plotWidth = Math.max(1, width - pad.left - pad.right), plotHeight = Math.max(1, height - pad.top - pad.bottom);
  const xValues = [], valuesByAxis = { left: [], right: [] };
  for (const entry of ready) {
    const axisValues = valuesByAxis[entry.axis === "right" ? "right" : "left"];
    for (const [xValue, yValue] of entry.points) { xValues.push(xValue); axisValues.push(yValue); }
  }
  const xRange = valueRange(xValues, input.xAxis?.minimum, input.xAxis?.maximum);
  const leftRange = valueRange(valuesByAxis.left, input.yAxes?.left?.minimum, input.yAxes?.left?.maximum), rightRange = valueRange(valuesByAxis.right, input.yAxes?.right?.minimum, input.yAxes?.right?.maximum);
  const x = (value) => pad.left + (value - xRange.min) / xRange.span * plotWidth;
  const y = (value, axis) => { const limits = axis === "right" ? rightRange : leftRange; return pad.top + (limits.max - value) / limits.span * plotHeight; };
  const xTicks = niceTicks(xRange.min, xRange.max, Math.max(2, Math.min(7, Math.floor(plotWidth / 110))));

  context.fillStyle = input.background || "#0c141e"; context.fillRect(0, 0, width, height); context.font = "10px system-ui"; context.strokeStyle = "#263544"; context.fillStyle = "#a9b6c8"; context.lineWidth = 1;
  for (const tick of xTicks.values) { const px = x(tick); context.beginPath(); context.moveTo(px, pad.top); context.lineTo(px, pad.top + plotHeight); context.stroke(); context.textAlign = "center"; context.fillText(formatTick(tick, xTicks.step), px, pad.top + plotHeight + 18); }
  for (let index = 0; index <= 5; index++) {
    const py = pad.top + plotHeight * index / 5, leftValue = leftRange.max - leftRange.span * index / 5;
    context.beginPath(); context.moveTo(pad.left, py); context.lineTo(pad.left + plotWidth, py); context.stroke(); context.textAlign = "right"; context.fillText(leftValue.toPrecision(3), pad.left - 7, py + 3);
    if (valuesByAxis.right.length) { const rightValue = rightRange.max - rightRange.span * index / 5; context.textAlign = "left"; context.fillText(rightValue.toPrecision(3), pad.left + plotWidth + 7, py + 3); }
  }
  context.strokeStyle = "#8798aa"; context.beginPath(); context.moveTo(pad.left, pad.top); context.lineTo(pad.left, pad.top + plotHeight); context.lineTo(pad.left + plotWidth, pad.top + plotHeight); context.stroke();
  context.fillStyle = "#e4edf7"; context.font = "600 12px system-ui"; context.textAlign = "center"; context.fillText(input.xAxis?.label || "x", pad.left + plotWidth / 2, height - 9);
  if (input.yAxes?.left?.label) { context.save(); context.translate(13, pad.top + plotHeight / 2); context.rotate(-Math.PI / 2); context.fillText(input.yAxes.left.label, 0, 0); context.restore(); }
  if (valuesByAxis.right.length && input.yAxes?.right?.label) { context.save(); context.translate(width - 10, pad.top + plotHeight / 2); context.rotate(Math.PI / 2); context.fillText(input.yAxes.right.label, 0, 0); context.restore(); }

  for (const entry of ready) {
    context.beginPath(); entry.points.forEach(([px, py], index) => index ? context.lineTo(x(px), y(py, entry.axis)) : context.moveTo(x(px), y(py, entry.axis)));
    context.strokeStyle = entry.color; context.lineWidth = 2; context.setLineDash(entry.style === "dashed" ? [6, 4] : entry.style === "dotted" ? [2, 3] : []); context.stroke(); context.setLineDash([]);
  }
  return renderPlotLegend(ready);
}

