/** Small DOM tree primitives shared by the model editor and schema browser. */

export function createTreeItem({
  label,
  active = false,
  disabled = false,
  className = "tree-item",
  title = label,
  icon = null,
  dataset = {},
} = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${className}${active ? " active" : ""}`;
  button.title = String(title ?? label ?? "");
  button.disabled = Boolean(disabled);
  for (const [key, value] of Object.entries(dataset)) {
    if (value !== undefined && value !== null) button.dataset[key] = String(value);
  }
  if (icon) {
    button.classList.add("tree-has-icon");
    button.append(icon);
  }
  const text = document.createElement("span");
  text.className = "tree-item-text";
  text.textContent = String(label ?? "");
  button.append(text);
  return button;
}

export function setTreeToggleState(button, { expanded, label = "tree section" } = {}) {
  if (!button) return;
  const isExpanded = Boolean(expanded);
  button.setAttribute("aria-expanded", String(isExpanded));
  button.setAttribute("aria-label", `${isExpanded ? "Collapse" : "Expand"} ${label}`);
  button.title = button.getAttribute("aria-label");
  const collapsedHandle = button.querySelector('[data-tree-toggle-handle="collapsed"]');
  const expandedHandle = button.querySelector('[data-tree-toggle-handle="expanded"]');
  if (collapsedHandle) collapsedHandle.hidden = isExpanded;
  if (expandedHandle) expandedHandle.hidden = !isExpanded;
}

export function createTreeToggle({
  expanded = true,
  label = "tree section",
  className = "tree-section-toggle",
  collapsedHandle = "▸",
  expandedHandle = "▾",
  handleClassPrefix = "tree-toggle-handle",
} = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  const collapsed = document.createElement("span");
  collapsed.className = `${handleClassPrefix}-collapsed`;
  collapsed.dataset.treeToggleHandle = "collapsed";
  collapsed.textContent = String(collapsedHandle);
  const open = document.createElement("span");
  open.className = `${handleClassPrefix}-expanded`;
  open.dataset.treeToggleHandle = "expanded";
  open.textContent = String(expandedHandle);
  button.append(collapsed, open);
  setTreeToggleState(button, { expanded, label });
  return button;
}
