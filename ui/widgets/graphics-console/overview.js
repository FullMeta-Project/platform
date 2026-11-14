const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const tooltipRegionsByContext = new WeakMap();

function fitText(context, value, width) {
  const text = String(value ?? "");
  if (context.measureText(text).width <= width) return text;
  let end = text.length;
  while (end > 0 && context.measureText(`${text.slice(0, end)}…`).width > width) end--;
  return `${text.slice(0, end)}…`;
}

function write(context, value, x, y, width, color = "#d6e7f3", font = "12px system-ui, sans-serif") {
  context.fillStyle = color;
  context.font = font;
  context.textAlign = "left";
  context.fillText(fitText(context, value, width), x, y);
}

function sceneRows(scene) {
  const rows = [];
  if (scene?.surface?.widget) rows.push(["Surface", scene.surface.widget]);
  for (const layer of scene?.layers || []) {
    const widget = layer.widget || Object.entries(layer.widgets || {})
      .map(([dimension, id]) => `${dimension}D ${id}`).join(" · ");
    rows.push(["Layer", `${layer.input ? `${layer.input} → ` : ""}${layer.label || layer.id}${widget ? ` · ${widget}` : ""}`]);
  }
  for (const tab of scene?.tabs || []) {
    rows.push(["Tab", `${tab.input ? `${tab.input} → ` : ""}${tab.label || tab.id}${tab.widget ? ` · ${tab.widget}` : ""}`]);
  }
  for (const input of scene?.inputs || []) {
    const source = input.source || {};
    rows.push(["Binding", `${source.scope || "source"}${source.path ? `.${source.path}` : ""} → ${input.label || input.id}`]);
  }
  return rows;
}

/** Read-only, application-neutral diagram of a declared Graphics console. */
export function drawGraphicsConsoleOverview({ context, value, title, width, height, selectedScene } = {}) {
  if (!context) return;
  const tooltipRegions = [];
  tooltipRegionsByContext.set(context, tooltipRegions);
  const inset = 24;
  const contentWidth = Math.max(1, width - 2 * inset);
  if (!record(value) || !record(value.scenes)) {
    write(context, title || "JSON Schema", inset, 42, contentWidth, "#d6e7f3", "600 18px system-ui, sans-serif");
    const explanation = typeof value === "string"
      ? `Graphics console reference: ${value}`
      : "No Graphics console declaration is present in this document.";
    write(context, explanation, inset, 68, contentWidth, "#89a8bd");
    return;
  }

  const scenes = Object.entries(value.scenes);
  if (!scenes.length) return;

  const top = 20;
  const gap = 10;
  const columns = Math.min(scenes.length, width >= 680 ? 3 : width >= 440 ? 2 : 1);
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const rowsByScene = scenes.map(([, scene]) => sceneRows(scene));
  const cardHeights = rowsByScene.map(rows => Math.max(68, 50 + rows.length * 18));
  const cardTopsByRow = [];
  cardHeights.reduce((y, cardHeight, index) => {
    const row = Math.floor(index / columns);
    if (cardTopsByRow[row] !== undefined) return y;
    cardTopsByRow[row] = y;
    const rowHeight = Math.max(...cardHeights.slice(row * columns, (row + 1) * columns));
    return y + rowHeight + gap;
  }, top);
  context.save();
  context.beginPath();
  context.rect(0, top, width, Math.max(1, height - top));
  context.clip();
  for (const [index, [id, scene]] of scenes.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cardX = inset + column * (cardWidth + gap);
    const y = cardTopsByRow[row];
    const cardHeight = cardHeights[index];
    if (y >= height) break;
    context.fillStyle = id === selectedScene ? "#183547" : "#142330";
    context.strokeStyle = id === selectedScene ? "#42c4b5" : "#294356";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(cardX, y, cardWidth, cardHeight, 7);
    context.fill();
    context.stroke();

    const x = cardX + 13;
    const rowWidth = Math.max(1, cardWidth - 26);
    write(context, scene.label || id, x, y + 23, rowWidth, "#e6f3fc", "600 14px system-ui, sans-serif");
    const rows = rowsByScene[index];
    const rowHeight = 18;
    const maxRows = Math.max(0, Math.floor((cardHeight - 43) / rowHeight));
    rows.slice(0, maxRows).forEach(([type, detail], rowIndex) => {
      const rowY = y + 44 + rowIndex * rowHeight;
      write(context, type, x, rowY, 48, "#56cdbb", "11px system-ui, sans-serif");
      const detailX = x + 52;
      const detailWidth = Math.max(1, rowWidth - 52);
      context.save();
      context.font = "12px system-ui, sans-serif";
      const isTruncated = context.measureText(String(detail ?? "")).width > detailWidth;
      context.restore();
      if (isTruncated) tooltipRegions.push({
        x: detailX, y: rowY - 14, width: detailWidth, height: rowHeight, text: String(detail),
      });
      write(context, detail, detailX, rowY, detailWidth, "#cbdce8");
    });
    if (rows.length > maxRows && maxRows > 0) {
      write(context, `+${rows.length - maxRows} more declarations`, x, y + cardHeight - 10, rowWidth, "#87a9bd", "11px system-ui, sans-serif");
    }
  }
  context.restore();
}

export function graphicsConsoleOverviewTooltipAt(context, x, y) {
  return tooltipRegionsByContext.get(context)?.find(region =>
    x >= region.x && x <= region.x + region.width
      && y >= region.y && y <= region.y + region.height)?.text || null;
}

export const graphicsConsoleOverviewWidget = Object.freeze({
  id: "graphicsConsoleOverview",
  kind: "diagram",
  render: drawGraphicsConsoleOverview,
  tooltipAt: graphicsConsoleOverviewTooltipAt,
});
