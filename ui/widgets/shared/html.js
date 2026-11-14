/** Small HTML helpers shared by schema-driven controls. */

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export const pathAttribute = (path) => escapeHtml(JSON.stringify(path));

export function settingRow(label, content, description = "") {
  const help = description ? `<div class="settings-empty">${escapeHtml(description)}</div>` : "";
  return `<tr><td>${escapeHtml(label)}</td><td>${content}${help}</td></tr>`;
}

export const humanize = (value) => String(value ?? "Setting")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/^./, (character) => character.toUpperCase());
