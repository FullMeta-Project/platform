// Generated from widget.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { LauncherContent, LauncherProjectsSection, LauncherDialogs } from "../../workspace/launcher-layout.js";
import { createWorkspaceEditorController } from "./runtime.js";
import { EditMenu, HelpMenu, HelpDialog, DocumentationMarkdown } from "../../workspace/standard-menus.js";
import { validateJsonSchema } from "../../../model-rust/js/api.js";
import { svgIconSource } from "../../runtime/svg-icons.js";
function ExplorerIcon({ icons, role }) {
  const value = icons?.[role] || (role === "folderOpen" ? icons?.folder : role === "schema" ? icons?.json || icons?.file : role === "json" ? icons?.file : null), source = svgIconSource(value);
  return source ? /* @__PURE__ */ React.createElement("img", { className: "workspace-explorer-icon", src: source, width: 16, height: 16, alt: "", "aria-hidden": "true", "data-icon-role": role }) : /* @__PURE__ */ React.createElement("span", { className: "workspace-explorer-icon-fallback", "aria-hidden": "true" }, role === "folder" || role === "folderOpen" ? "\u{1F4C1}" : "\u25A4");
}
const fileIconRole = (name) => /^(?:schema\.json)$|\.schema\.json$/i.test(name) ? "schema" : /\.json$/i.test(name) ? "json" : "file";
function ExplorerDirectory({ path, name, explorer, icons, onCommand, onContext }) {
  const expanded = Boolean(explorer.expanded[path]), folder = explorer.folders[path];
  const selected = explorer.selected?.path === path;
  const issue = (command) => {
    void Promise.resolve(onCommand?.(command)).catch(() => {
    });
  };
  return /* @__PURE__ */ React.createElement("li", { className: "workspace-explorer-directory", role: "treeitem", "aria-expanded": expanded, "aria-selected": selected }, /* @__PURE__ */ React.createElement("div", { className: "workspace-explorer-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "workspace-explorer-toggle", "aria-label": `${expanded ? "Collapse" : "Expand"} ${name}`, onClick: () => issue({ type: "workspace.tree.toggle", args: { path, expanded: !expanded } }) }, expanded ? "\u25BE" : "\u25B8"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "workspace-explorer-name" + (selected ? " active" : ""), title: path, onContextMenu: (event) => onContext(event, path, "directory"), onKeyDown: (event) => {
    if (event.key === "ContextMenu" || event.key === "F10" && event.shiftKey) onContext(event, path, "directory");
  }, onClick: () => issue({ type: "workspace.file.select", args: { path } }) }, /* @__PURE__ */ React.createElement(ExplorerIcon, { icons, role: expanded ? "folderOpen" : "folder" }), " ", name)), expanded ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("ul", { role: "group" }, (folder?.directories || []).map((entry) => /* @__PURE__ */ React.createElement(ExplorerDirectory, { key: entry.path, path: entry.path, name: entry.name, explorer, icons, onCommand, onContext })), (folder?.files || []).map((entry) => /* @__PURE__ */ React.createElement("li", { key: entry.path, role: "treeitem", "aria-selected": explorer.selected?.path === entry.path }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "workspace-explorer-name workspace-explorer-file" + (explorer.selected?.path === entry.path ? " active" : ""), title: entry.path, onContextMenu: (event) => onContext(event, entry.path, "file"), onKeyDown: (event) => {
    if (event.key === "ContextMenu" || event.key === "F10" && event.shiftKey) onContext(event, entry.path, "file");
  }, onClick: () => issue({ type: "workspace.file.select", args: { path: entry.path } }), onDoubleClick: () => issue({ type: entry.path.toLowerCase().endsWith(".json") ? "workspace.file.open" : "workspace.file.select", args: { path: entry.path } }) }, /* @__PURE__ */ React.createElement(ExplorerIcon, { icons, role: fileIconRole(entry.name) }), " ", entry.name)))), folder?.loading ? /* @__PURE__ */ React.createElement("p", { className: "workspace-explorer-message", role: "status" }, "Loading\u2026") : null, folder?.error ? /* @__PURE__ */ React.createElement("p", { className: "workspace-explorer-message error", role: "alert" }, folder.error) : null, folder?.nextOffset !== null && folder?.nextOffset !== void 0 ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button workspace-explorer-more", disabled: folder.loading, onClick: () => issue({ type: "workspace.files.more", args: { path } }) }, "More files\u2026") : null) : null);
}
function WorkspaceExplorer({ explorer, icons, onCommand }) {
  const root = explorer.root || ".", [menu, setMenu] = React.useState(null), [pending, setPending] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(""), dialog = React.useRef(null);
  React.useEffect(() => {
    if (!menu) return;
    const close = (event) => {
      if (!event.target.closest?.(".workspace-tree-menu")) setMenu(null);
    }, key = (event) => {
      if (event.key === "Escape") {
        setMenu(null);
        menu.anchor?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  React.useEffect(() => {
    if (pending && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [pending]);
  const context = (event, path, kind) => {
    event.preventDefault();
    event.stopPropagation();
    if (!path.startsWith("projects/") || kind === "file" && path.split("/").length < 3) {
      setMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect(), keyboard = event.type === "keydown", x = keyboard ? rect.right : event.clientX, y = keyboard ? rect.bottom : event.clientY;
    setMenu({ path, kind, anchor: event.currentTarget, x: Math.max(0, Math.min(x, window.innerWidth - 190)), y: Math.max(0, Math.min(y, window.innerHeight - 50)) });
  };
  const choose = () => {
    const chosen = menu;
    setMenu(null);
    if (chosen.kind === "directory") {
      void Promise.resolve(onCommand?.({ type: "workspace.folder.delete", args: { path: chosen.path } })).catch(() => {
      });
    } else {
      setError("");
      setPending(chosen.path);
    }
  };
  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onCommand?.({ type: "workspace.file.delete", args: { path: pending } });
      dialog.current?.close();
      setPending(null);
    } catch (failure) {
      setError(failure.message || "Could not delete the file.");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "workspace-pane-heading" }, /* @__PURE__ */ React.createElement("h2", null, "Explorer"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => void Promise.resolve(onCommand?.({ type: "workspace.files.refresh", args: { path: root } })).catch(() => {
  }) }, "Refresh")), /* @__PURE__ */ React.createElement("ul", { className: "workspace-explorer-tree", role: "tree", "aria-label": "FullMeta workspace files" }, /* @__PURE__ */ React.createElement(ExplorerDirectory, { path: root, name: root === "." ? "FullMeta" : root.split("/").at(-1), explorer, icons, onCommand, onContext: context })), menu ? /* @__PURE__ */ React.createElement("div", { className: "tree-context-menu workspace-tree-menu", role: "menu", "aria-label": `Actions for ${menu.path}`, style: { left: menu.x, top: menu.y } }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "context-menu-item", role: "menuitem", autoFocus: true, onClick: choose }, "Delete\u2026")) : null, /* @__PURE__ */ React.createElement("dialog", { ref: dialog, className: "project-delete-dialog", "aria-labelledby": "workspace-file-delete-title", "aria-describedby": "workspace-file-delete-description", onCancel: (event) => {
    if (busy) event.preventDefault();
    else setPending(null);
  } }, /* @__PURE__ */ React.createElement("div", { className: "project-delete-content" }, /* @__PURE__ */ React.createElement("h2", { id: "workspace-file-delete-title" }, "Delete file?"), /* @__PURE__ */ React.createElement("p", { id: "workspace-file-delete-description" }, "Permanently delete the file ", /* @__PURE__ */ React.createElement("code", null, pending), "?"), error ? /* @__PURE__ */ React.createElement("p", { className: "error", role: "alert" }, error) : null, /* @__PURE__ */ React.createElement("div", { className: "project-delete-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", autoFocus: true, disabled: busy, onClick: () => {
    dialog.current?.close();
    setPending(null);
  } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button danger", disabled: busy, onClick: confirm }, busy ? "Deleting\u2026" : "Delete file")))));
}
function WorkspaceFileDetails({ explorer, onCommand }) {
  const selected = explorer.selected, preview = explorer.preview;
  if (!selected) return /* @__PURE__ */ React.createElement("div", { className: "workspace-file-details" }, /* @__PURE__ */ React.createElement("h2", null, "Settings"), /* @__PURE__ */ React.createElement("p", null, "Select a file or folder to inspect its details."), /* @__PURE__ */ React.createElement("p", null, "The workspace configuration is read only here."));
  return /* @__PURE__ */ React.createElement("div", { className: "workspace-file-details" }, /* @__PURE__ */ React.createElement("h2", null, selected.name), /* @__PURE__ */ React.createElement("dl", null, /* @__PURE__ */ React.createElement("dt", null, "Path"), /* @__PURE__ */ React.createElement("dd", null, /* @__PURE__ */ React.createElement("code", null, selected.path)), /* @__PURE__ */ React.createElement("dt", null, "Type"), /* @__PURE__ */ React.createElement("dd", null, selected.kind === "directory" ? "Folder" : "File"), selected.bytes !== void 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("dt", null, "Size"), /* @__PURE__ */ React.createElement("dd", null, selected.bytes.toLocaleString(), " bytes")) : null, preview?.path === selected.path && preview.contentHash ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("dt", null, "SHA-256"), /* @__PURE__ */ React.createElement("dd", null, /* @__PURE__ */ React.createElement("code", null, preview.contentHash))) : null), selected.openAvailable ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button primary", onClick: () => void Promise.resolve(onCommand?.({ type: "workspace.file.open", args: { path: selected.path } })).catch(() => {
  }) }, "Open JSON document") : selected.openReason === "No interpreting schema" ? /* @__PURE__ */ React.createElement("p", { className: "workspace-document-unavailable" }, "No interpreting schema") : null, preview?.path === selected.path ? /* @__PURE__ */ React.createElement(React.Fragment, null, preview.loading ? /* @__PURE__ */ React.createElement("p", { role: "status" }, "Reading text\u2026") : preview.error ? /* @__PURE__ */ React.createElement("p", { className: "error", role: "alert" }, preview.error) : typeof preview.text === "string" ? /* @__PURE__ */ React.createElement("details", { className: "workspace-file-preview" }, /* @__PURE__ */ React.createElement("summary", null, "Text preview"), /* @__PURE__ */ React.createElement("pre", null, preview.text)) : null) : null);
}
function WorkspaceDocuments({ documents, onCommand }) {
  const folderName = (group) => group.relativePath === "." ? group.folder === "." ? "FullMeta" : group.folder.split("/").at(-1) : group.relativePath;
  const distinctTitle = (group, file) => {
    const title = file.summary?.title;
    return title && title !== group.folder.split("/").at(-1) && title !== folderName(group) ? title : null;
  };
  return /* @__PURE__ */ React.createElement("div", { className: "workspace-documents" }, /* @__PURE__ */ React.createElement("h2", null, "Folder contents"), /* @__PURE__ */ React.createElement("p", { className: "workspace-documents-root" }, /* @__PURE__ */ React.createElement("code", null, documents.root || ".", "/")), /* @__PURE__ */ React.createElement("div", { className: "workspace-document-grid" }, documents.groups.map((group) => {
    const projectFolder = group.folder.startsWith("projects/") && group.folder.length > "projects/".length;
    return /* @__PURE__ */ React.createElement("article", { key: group.folder, className: "workspace-document-card" }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("div", { className: "workspace-document-folder-heading" }, /* @__PURE__ */ React.createElement("h3", null, group.folder !== documents.root ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "workspace-folder-browse workspace-folder-title", "aria-label": `Browse folder ${group.folder}`, onClick: () => void Promise.resolve(onCommand?.({ type: "workspace.folder.select", args: { path: group.folder } })).catch(() => {
    }) }, folderName(group)) : folderName(group)), projectFolder ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button workspace-document-delete", "aria-label": `Delete project folder ${group.folder}`, onClick: () => void Promise.resolve(onCommand?.({ type: "workspace.project.delete", args: { path: group.folder, title: folderName(group), documentCount: group.files.length } })).catch(() => {
    }) }, "Delete") : null), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("code", null, group.folder, "/"))), /* @__PURE__ */ React.createElement("div", { className: "workspace-document-entries" }, group.files.map((file) => {
      const title = distinctTitle(group, file);
      return /* @__PURE__ */ React.createElement("div", { key: file.path, className: "workspace-document-entry" }, title || file.summary?.application ? /* @__PURE__ */ React.createElement("div", { className: "workspace-document-entry-heading" }, title ? /* @__PURE__ */ React.createElement("h4", null, title) : null, file.summary?.application ? /* @__PURE__ */ React.createElement("span", { className: "workspace-document-application" }, file.summary.application) : null) : null, /* @__PURE__ */ React.createElement("p", { className: "workspace-document-filename" }, file.name), /* @__PURE__ */ React.createElement("p", null, (file.summary?.bytes ?? file.bytes).toLocaleString(), " bytes"), file.summary?.validJson === false ? /* @__PURE__ */ React.createElement("p", { className: "error" }, "Invalid JSON") : null, file.openAvailable ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button primary", "aria-label": `Open ${file.path}`, onClick: () => void Promise.resolve(onCommand?.({ type: "workspace.file.open", args: { path: file.path } })).catch(() => {
      }) }, "Open") : file.summary?.validJson && file.openReason === "No interpreting schema" ? /* @__PURE__ */ React.createElement("p", { className: "workspace-document-unavailable" }, "No interpreting schema") : null);
    })));
  })), /* @__PURE__ */ React.createElement("p", { role: "status" }, documents.loading ? "Discovering current-folder documents\u2026" : documents.summaries?.loading ? "Checking interpreting schemas\u2026" : documents.complete ? `${documents.totalFiles} interpretable document(s).` : `${documents.totalFiles} interpretable document(s) found. More entries remain in this folder.`), documents.error ? /* @__PURE__ */ React.createElement("p", { className: "error", role: "alert" }, documents.error) : null, documents.summaries?.loading ? /* @__PURE__ */ React.createElement("p", { className: "workspace-document-summary-status", role: "status" }, "Loading document details\u2026") : null, !documents.loading && !documents.summaries?.loading && documents.complete && !documents.totalFiles ? /* @__PURE__ */ React.createElement("p", null, "No project documents with an interpreting schema were found directly in this folder.") : null, !documents.complete ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: documents.loading, onClick: () => void Promise.resolve(onCommand?.({ type: "workspace.discover.more", args: {} })).catch(() => {
  }) }, "Discover more") : null);
}
function WorkspaceMarkdownPreview({ explorer, workspaceUrl, enabled = true }) {
  const selected = explorer.selected, preview = explorer.preview;
  if (!enabled || selected?.kind !== "file" || !selected.path.toLowerCase().endsWith(".md")) return null;
  const current = preview?.path === selected.path ? preview : null;
  return /* @__PURE__ */ React.createElement("section", { className: "workspace-markdown-preview", "aria-label": "Markdown preview" }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("h2", null, selected.name), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("code", null, selected.path))), !current || current.loading ? /* @__PURE__ */ React.createElement("p", { role: "status" }, "Reading Markdown\u2026") : current.error ? /* @__PURE__ */ React.createElement("p", { className: "error", role: "alert" }, current.error) : /* @__PURE__ */ React.createElement(React.Fragment, null, current.truncated ? /* @__PURE__ */ React.createElement("p", { className: "workspace-markdown-truncated", role: "status" }, "Showing the first 65,536 characters.") : null, /* @__PURE__ */ React.createElement(DocumentationMarkdown, { text: current.text || "", baseUrl: new URL(selected.path, workspaceUrl || "http://fullmeta.local/").href })));
}
const emptyExplorer = () => ({ root: ".", selected: null, expanded: { ".": true }, folders: {}, preview: null });
function Widget({ view = {}, onCommand }) {
  const explorer = { root: ".", ...view.explorer || emptyExplorer() }, layout = view.layout || "stacked", documents = view.documents || { root: null, groups: [], totalFiles: 0, loading: false, complete: false, error: "" }, markdownSelected = view.markdownPreview === true && explorer.selected?.kind === "file" && explorer.selected.path.toLowerCase().endsWith(".md");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("header", { className: "topbar app-topbar" }, /* @__PURE__ */ React.createElement("div", { className: "brand" }, /* @__PURE__ */ React.createElement("img", { className: "brand-icon", src: "/platform/ui/brand-icon.svg", alt: "", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "brand-name" }, "FullMeta"), /* @__PURE__ */ React.createElement("div", { className: "brand-sub" }, view.title || "Workspace"))), /* @__PURE__ */ React.createElement("details", { id: "file-menu", className: "app-file-menu" }, /* @__PURE__ */ React.createElement("summary", null, "File"), /* @__PURE__ */ React.createElement("div", { className: "app-file-menu-list", "aria-label": "Workspace file commands" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: (event) => {
    event.currentTarget.closest("details").open = false;
    void Promise.resolve(onCommand?.({ type: "workspace.file.choose", args: {} })).catch(() => {
    });
  } }, "Open\u2026"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: (event) => {
    event.currentTarget.closest("details").open = false;
    void Promise.resolve(onCommand?.({ type: "workspace.application.new", args: {} })).catch(() => {
    });
  } }, "New application\u2026"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: !view.selectedProject, onClick: (event) => {
    event.currentTarget.closest("details").open = false;
    void Promise.resolve(onCommand?.({ type: "workspace.project.delete", args: {} })).catch(() => {
    });
  } }, "Delete project\u2026"), /* @__PURE__ */ React.createElement("hr", null), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: !explorer.selected?.openAvailable, onClick: (event) => {
    event.currentTarget.closest("details").open = false;
    void Promise.resolve(onCommand?.({ type: "workspace.file.open", args: {} })).catch(() => {
    });
  } }, "Open selected JSON"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: Boolean(explorer.folders[explorer.root]?.loading), onClick: (event) => {
    event.currentTarget.closest("details").open = false;
    void Promise.resolve(onCommand?.({ type: "workspace.files.refresh", args: { path: explorer.root } })).catch(() => {
    });
  } }, "Refresh workspace"))), /* @__PURE__ */ React.createElement(EditMenu, null), /* @__PURE__ */ React.createElement("details", { id: "view-menu", className: "app-file-menu" }, /* @__PURE__ */ React.createElement("summary", null, "View"), /* @__PURE__ */ React.createElement("div", { className: "app-file-menu-list", role: "menu", "aria-label": "Workspace layout" }, [["stacked", "Stacked", "Tree on the left; Graphics above Settings"], ["columns", "Columns", "Tree | Settings | Graphics from left to right"]].map(([id, label, description]) => /* @__PURE__ */ React.createElement("button", { key: id, title: description, type: "button", className: "button", role: "menuitemradio", "aria-checked": layout === id, "data-workspace-layout": id, onClick: () => void Promise.resolve(onCommand?.({ type: "workspace.layout.set", args: { layout: id } })).catch(() => {
  }) }, label)))), /* @__PURE__ */ React.createElement(HelpMenu, null)), /* @__PURE__ */ React.createElement("div", { className: "workspace-document-path" }, /* @__PURE__ */ React.createElement("output", { "aria-label": "Canonical workspace document" }, view.documentPath || "index.json"), explorer.selected ? /* @__PURE__ */ React.createElement("span", null, "Selected: ", /* @__PURE__ */ React.createElement("code", null, explorer.selected.path)) : null), /* @__PURE__ */ React.createElement("main", { className: "wrap workspace-editor-main" }, /* @__PURE__ */ React.createElement("div", { className: "workspace" }, /* @__PURE__ */ React.createElement("aside", { id: "workspace-explorer", className: "panel tree" }, /* @__PURE__ */ React.createElement(WorkspaceExplorer, { explorer, icons: view.explorerIcons, onCommand })), /* @__PURE__ */ React.createElement("div", { id: "tree-splitter", className: "panel-splitter tree-splitter", role: "separator", "aria-orientation": "vertical", "aria-label": "Resize Explorer", "aria-valuemin": 210, "aria-valuemax": 520, "aria-valuenow": 260, tabIndex: 0 }), /* @__PURE__ */ React.createElement("div", { id: "right-workspace", className: "right-workspace" }, /* @__PURE__ */ React.createElement("section", { id: "workspace-graphics", className: "panel graphics-panel", "aria-label": "Graphics Console" }, /* @__PURE__ */ React.createElement("div", { className: "workspace-pane-heading" }, /* @__PURE__ */ React.createElement("h2", null, "Graphics Console")), /* @__PURE__ */ React.createElement("div", { id: "workspace-launcher-surface", hidden: markdownSelected }, /* @__PURE__ */ React.createElement(LauncherContent, { projects: false })), /* @__PURE__ */ React.createElement("div", { className: "workspace-markdown-surface", hidden: !markdownSelected }, /* @__PURE__ */ React.createElement(WorkspaceMarkdownPreview, { explorer, workspaceUrl: view.workspaceUrl, enabled: view.markdownPreview === true }))), /* @__PURE__ */ React.createElement("div", { id: "right-splitter", className: "panel-splitter right-splitter " + (layout === "columns" ? "vertical-splitter" : "horizontal-splitter"), role: "separator", "aria-orientation": layout === "columns" ? "vertical" : "horizontal", "aria-label": "Resize Graphics Console and Settings", tabIndex: 0 }), /* @__PURE__ */ React.createElement("section", { id: "workspace-settings", className: "panel editor" }, /* @__PURE__ */ React.createElement("div", { hidden: explorer.selected?.kind !== "directory" }, /* @__PURE__ */ React.createElement(WorkspaceDocuments, { documents, onCommand })), /* @__PURE__ */ React.createElement("div", { hidden: explorer.selected?.kind === "directory" }, /* @__PURE__ */ React.createElement(WorkspaceFileDetails, { explorer, onCommand })))))), /* @__PURE__ */ React.createElement("div", { className: "launcher", hidden: true, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(LauncherProjectsSection, null)), /* @__PURE__ */ React.createElement(LauncherDialogs, null), /* @__PURE__ */ React.createElement(HelpDialog, null), /* @__PURE__ */ React.createElement("dialog", { id: "workspace-file-dialog", className: "workspace-file-dialog", "aria-labelledby": "workspace-file-picker-title" }, /* @__PURE__ */ React.createElement("div", { id: "workspace-file-dialog-host" })));
}
const WorkspaceEditor = Widget;
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
const mounted = /* @__PURE__ */ new WeakMap();
async function mountEditor(container, context) {
  if (!container || container.nodeType !== 1) throw new Error("A workspace editor container is required.");
  if (mounted.has(container)) throw new Error("The workspace editor is already mounted.");
  const document2 = container.ownerDocument, links = [];
  for (const reference of ["../../../fullmeta.css", "../model-editor/widget.css", "../model-editor/layout.css", "../../workspace/file-picker.css", "../../workspace/standard-menus.css", "./widget.css", "../../runtime/workspace-layout.css"]) {
    const link = document2.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(reference, import.meta.url).href;
    document2.head.append(link);
    links.push(link);
  }
  container.classList.add("fullmeta-workspace-editor");
  let controller, surface, disposed = false;
  const preventContextMenu = (event) => event.preventDefault();
  const cleanup = () => {
    document2.removeEventListener("contextmenu", preventContextMenu, true);
    surface?.dispose();
    links.forEach((link) => link.remove());
    container.classList.remove("fullmeta-workspace-editor", "fullmeta-workspace");
    delete container.dataset.workspaceLayout;
    mounted.delete(container);
  };
  try {
    const documentValue = context?.document;
    if (documentValue?.format !== "fullmeta-workspace/1") throw new Error("The workspace editor needs a fullmeta-workspace/1 document.");
    if (!context.schema || typeof context.schema !== "object") throw new Error("The workspace editor needs its interpreting schema.");
    const issues = validateJsonSchema(documentValue, context.schema);
    if (issues.length) throw new Error("Invalid workspace configuration: " + issues[0]);
    document2.addEventListener("contextmenu", preventContextMenu, true);
    surface = mountWidget(container, { view: { title: documentValue.title || "Workspace" }, onCommand: (command) => controller?.dispatch(command.type, command.args) });
    controller = createWorkspaceEditorController(container, context, { update: (view) => surface.update({ view, onCommand: (command) => controller.dispatch(command.type, command.args) }) });
    mounted.set(container, controller);
    await controller.ready;
    return Object.freeze({ ...controller, dispose() {
      if (disposed) return;
      disposed = true;
      controller.dispose();
      cleanup();
    } });
  } catch (error) {
    controller?.dispose();
    cleanup();
    throw error;
  }
}
import { createWorkspaceEditorController as createWorkspaceEditorController2 } from "./runtime.js";
import { createWorkspaceWebMcpTools } from "./webmcp.js";
export {
  Widget,
  WorkspaceDocuments,
  WorkspaceEditor,
  WorkspaceExplorer,
  WorkspaceFileDetails,
  WorkspaceMarkdownPreview,
  createWorkspaceEditorController2 as createWorkspaceEditorController,
  createWorkspaceWebMcpTools,
  mountEditor,
  mountWidget
};

//# sourceMappingURL=widget.js.map
