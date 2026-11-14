/** Row ordering primitives shared by schema-driven collection widgets. */

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

/** Fixed tuples and read-only collections do not expose row reordering. */
export function rowReorderingAllowed(schema = {}, ui = schema?.["x-fullmeta-ui"] || {}) {
  return schema?.readOnly !== true && ui.readOnly !== true
    && !Array.isArray(schema?.prefixItems) && !Array.isArray(schema?.items)
    && !(Number.isInteger(schema?.minItems) && schema.minItems === schema.maxItems);
}

/** Render accessible adjacent-row controls, with bounds enforced in the UI. */
export function renderRowMoveButtons({ index, length, label = "row", attributes = {} }) {
  const rowIndex = Number(index), rowCount = Number(length);
  if (!Number.isInteger(rowIndex) || !Number.isInteger(rowCount) || rowIndex < 0 || rowIndex >= rowCount) return "";
  const dataAttributes = Object.entries(attributes)
    .filter(([name]) => /^data-[a-z][a-z0-9-]*$/.test(name) && name !== "data-row-move")
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join("");
  return `<span class="row-move-controls" role="group" aria-label="${escapeHtml(`Order ${label}`)}" tabindex="-1">${[["up", "↑", rowIndex === 0], ["down", "↓", rowIndex === rowCount - 1]].map(([direction, icon, disabled]) => {
    const description = `Move ${label} ${direction}`;
    return `<button class="button row-move" type="button" data-row-move="${direction}"${dataAttributes} title="${escapeHtml(description)}" aria-label="${escapeHtml(description)}"${disabled ? " disabled" : ""}>${icon}</button>`;
  }).join("")}</span>`;
}

/** Move one row to the adjacent position without changing its contents. */
export function moveArrayRow(rows, index, direction) {
  if (!Array.isArray(rows) || !Number.isInteger(index)) return false;
  const offset = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  const destination = index + offset;
  if (!offset || index < 0 || index >= rows.length || destination < 0 || destination >= rows.length) return false;
  [rows[index], rows[destination]] = [rows[destination], rows[index]];
  return true;
}
