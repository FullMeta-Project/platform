import { fieldColor } from '../shared/plots/field-color.js';

/** Draw a numeric color scale supplied by the caller. */
export function drawColorbar({ context: ctx, width, height, range, label = '', units = '', color = fieldColor }) {
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite))
    throw new TypeError('Colorbar range must contain two finite numbers.');
  if (range[0] > range[1])
    throw new RangeError('Colorbar minimum must not exceed maximum.');
  const x = width - 48, y = 42, h = Math.max(80, Math.min(height - 125, 270)), barWidth = 12;
  const gradient = ctx.createLinearGradient(0, y + h, 0, y);
  for (let index = 0; index <= 20; index++) gradient.addColorStop(index / 20, color(range[0] + (range[1] - range[0]) * index / 20, range));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, barWidth, h);
  ctx.strokeStyle = '#a9b7c8';
  ctx.strokeRect(x, y, barWidth, h);
  ctx.fillStyle = '#d6e0eb';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  if (range[0] === range[1]) ctx.fillText(Number(range[0].toPrecision(3)), x + 17, y + h / 2);
  else {
    ctx.fillText(Number(range[1].toPrecision(3)), x + 17, y + 4);
    ctx.fillText(Number(range[0].toPrecision(3)), x + 17, y + h);
  }
  ctx.save();
  ctx.translate(x - 7, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(units ? `${label} (${units})` : label, 0, 0);
  ctx.restore();
}
