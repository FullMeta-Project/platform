// Generated from file-picker.jsx by scripts/build-frontend.mjs.
import React, { useLayoutEffect, useRef, useState } from "../widgets/shared/react/react-runtime.js";
import { mountReactComponent } from "../widgets/shared/react/mount.js";
const presenters = /* @__PURE__ */ new WeakMap();
const importButtons = /* @__PURE__ */ new WeakMap();
const allowedExtensions = /* @__PURE__ */ new Set([".json", ".tsv", ".txt"]);
function canonicalWorkspacePath(value, { root = true } = {}) {
  if (typeof value !== "string") throw new Error("Enter a workspace-relative path.");
  const text = value.trim();
  if (root && (text === "" || text === ".")) return ".";
  if (!text || text.startsWith("/") || /[\\:?#\u0000-\u001f]/.test(text) || text.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Choose a path inside FullMeta without traversal or absolute path prefixes.");
  return text;
}
const partsOf = (path) => {
  const parts = path.split("/");
  return { folder: parts.slice(0, -1).join("/") || ".", file: parts.at(-1) };
};
const ownerKey = (dialog) => dialog?.dataset.authoringTool || dialog?.dataset.schemaAuthoringTool || dialog?.id || null;
function extensionsOf(values = [".json", ".tsv", ".txt"]) {
  if (!Array.isArray(values) || !values.length || values.some((value) => !allowedExtensions.has(value))) throw new Error("Choose JSON, TSV or TXT workspace files.");
  return [...new Set(values)];
}
function validateWorkspacePickerState(state) {
  if (!state || state.format !== "fullmeta-workspace-picker/1" || typeof state.open !== "boolean") throw new Error("Unsupported workspace picker state.");
  if (!state.open) return state;
  if (!["open", "schema-for-new", "new-folder", "import"].includes(state.purpose) || !["file", "directory"].includes(state.mode)) throw new Error("Unsupported workspace picker purpose.");
  if (state.purpose === "new-folder" !== (state.mode === "directory")) throw new Error("The workspace picker mode does not match its purpose.");
  if (canonicalWorkspacePath(state.folder) !== state.folder || typeof state.selectedPath !== "string") throw new Error("Invalid canonical workspace picker path.");
  extensionsOf(state.extensions);
  if (state.selectedPath) canonicalWorkspacePath(state.selectedPath, { root: false });
  for (const name of ["pathDraft", "filter", "error"]) if (typeof state[name] !== "string") throw new Error("Invalid workspace picker text state.");
  if (state.ownerKey !== null && typeof state.ownerKey !== "string" || state.importKey !== null && typeof state.importKey !== "string") throw new Error("Invalid workspace picker owner.");
  if (state.focus !== void 0 && state.focus !== null && (!["path", "filter"].includes(state.focus.field) || !Number.isSafeInteger(state.focus.start) || !Number.isSafeInteger(state.focus.end) || state.focus.start < 0 || state.focus.end < state.focus.start || !["forward", "backward", "none"].includes(state.focus.direction))) throw new Error("Invalid workspace picker input focus.");
  if (state.purpose === "import" && (!state.ownerKey || !state.importKey)) throw new Error("An import picker needs its current owning controls.");
  validateListing(state.listing, state.folder);
  const entries = state.mode === "directory" ? state.listing.directories : state.listing.files;
  if (state.selectedPath && !entries.some((entry) => entry.path === state.selectedPath)) throw new Error("The saved selection is not in the workspace folder listing.");
  return state;
}
function validateListing(value, folder) {
  if (!value || !Array.isArray(value.directories) || !Array.isArray(value.files) || value.directories.length + value.files.length > 2e4) throw new Error("Invalid saved workspace directory listing.");
  const expectedParent = folder === "." ? null : partsOf(folder).folder;
  if (value.parent !== expectedParent || !Number.isSafeInteger(value.total) || value.total < 0 || value.nextOffset !== null && (!Number.isSafeInteger(value.nextOffset) || value.nextOffset < 0)) throw new Error("Invalid workspace directory page.");
  const paths = /* @__PURE__ */ new Set();
  for (const entry of [...value.directories, ...value.files]) {
    if (!entry || typeof entry.name !== "string" || entry.name.length > 512 || canonicalWorkspacePath(entry.path, { root: false }) !== entry.path || partsOf(entry.path).folder !== folder || partsOf(entry.path).file !== entry.name || paths.has(entry.path)) throw new Error("Invalid saved workspace entry.");
    paths.add(entry.path);
  }
  if (value.files.some((entry) => !Number.isSafeInteger(entry.bytes) || entry.bytes < 0)) throw new Error("Invalid saved workspace file size.");
  return value;
}
const safely = (callback) => {
  Promise.resolve().then(callback).catch(() => {
  });
};
function WorkspaceFilePicker({ state, commands }) {
  const directories = state.directories.filter((entry) => entry.name.toLowerCase().includes(state.filter.toLowerCase())), files = state.files.filter((entry) => entry.name.toLowerCase().includes(state.filter.toLowerCase()));
  return /* @__PURE__ */ React.createElement("section", { className: "workspace-file-picker", "aria-busy": state.loading || state.accepting }, /* @__PURE__ */ React.createElement("h2", { id: "workspace-file-picker-title" }, state.title), /* @__PURE__ */ React.createElement("p", null, "Choose ", state.mode === "directory" ? "a folder" : "a file", " inside FullMeta."), /* @__PURE__ */ React.createElement("form", { onSubmit: (event) => {
    event.preventDefault();
    safely(() => commands.navigate(state.pathDraft));
  }, className: "workspace-picker-location" }, /* @__PURE__ */ React.createElement("label", null, "Folder inside FullMeta", /* @__PURE__ */ React.createElement("input", { "aria-label": "Workspace folder", value: state.pathDraft, onChange: (event) => commands.pathDraft(event.target.value), disabled: state.accepting })), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: state.accepting }, "Go"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => safely(() => commands.navigate(state.parent || ".")), disabled: !state.parent || state.loading || state.accepting }, "Up")), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Workspace folder breadcrumbs" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: state.accepting, onClick: () => safely(() => commands.navigate(".")) }, "FullMeta"), state.folder !== "." ? state.folder.split("/").map((part, index, all) => /* @__PURE__ */ React.createElement(React.Fragment, { key: all.slice(0, index + 1).join("/") }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, " / "), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: state.accepting, onClick: () => safely(() => commands.navigate(all.slice(0, index + 1).join("/"))) }, part))) : null), /* @__PURE__ */ React.createElement("label", { className: "workspace-picker-filter" }, "Filter this folder", /* @__PURE__ */ React.createElement("input", { type: "search", "aria-label": "Filter workspace files", value: state.filter, onChange: (event) => commands.filter(event.target.value), disabled: state.accepting })), /* @__PURE__ */ React.createElement("div", { className: "workspace-picker-entries", "aria-label": "Workspace entries" }, directories.map((entry) => /* @__PURE__ */ React.createElement("div", { key: entry.path, className: "workspace-picker-entry" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: state.accepting, "aria-label": `Open folder ${entry.name}`, onClick: () => safely(() => commands.navigate(entry.path)) }, "\u{1F4C1} ", entry.name), state.mode === "directory" ? /* @__PURE__ */ React.createElement("button", { type: "button", disabled: state.accepting || state.loading, "aria-pressed": state.selectedPath === entry.path, onClick: () => commands.select(entry.path) }, "Select folder") : null)), state.mode === "file" ? files.map((entry) => /* @__PURE__ */ React.createElement("button", { key: entry.path, type: "button", className: "workspace-picker-file", disabled: state.accepting || state.loading, "aria-pressed": state.selectedPath === entry.path, onClick: () => commands.select(entry.path), onDoubleClick: () => safely(() => {
    commands.select(entry.path);
    return commands.accept();
  }) }, /* @__PURE__ */ React.createElement("span", null, entry.name), /* @__PURE__ */ React.createElement("small", null, entry.bytes.toLocaleString(), " bytes"))) : null, !state.loading && !directories.length && (!files.length || state.mode === "directory") ? /* @__PURE__ */ React.createElement("p", { className: "settings-empty" }, "No matching ", state.mode === "directory" ? "folders" : "files", ".") : null), state.nextOffset !== null ? /* @__PURE__ */ React.createElement("button", { type: "button", disabled: state.loading || state.accepting, onClick: () => safely(() => commands.more()) }, "More entries") : null, /* @__PURE__ */ React.createElement("p", { className: "workspace-picker-selection" }, state.mode === "directory" ? `Folder: ${state.selectedPath || state.folder}` : state.selectedPath ? `Selected: ${state.selectedPath}` : "Select a file to continue."), /* @__PURE__ */ React.createElement("p", { role: "status", className: state.error ? "status error" : "status" }, state.error || (state.loading ? "Loading workspace\u2026" : "")), /* @__PURE__ */ React.createElement("div", { className: "save-as-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: commands.cancel }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "primary", disabled: state.loading || state.accepting || state.mode === "file" && !state.selectedPath, onClick: () => safely(() => commands.accept()) }, state.accepting ? "Working\u2026" : state.acceptLabel)));
}
function createWorkspaceFilePicker({ dialog, container = dialog, requestJson, defaultFolder = () => "." }) {
  if (!dialog || typeof requestJson !== "function") throw new Error("The workspace picker needs its dialog and checked document services.");
  if (presenters.has(dialog.ownerDocument)) throw new Error("This page already has a workspace file picker.");
  let state = { format: "fullmeta-workspace-picker/1", open: false, purpose: "open", mode: "file", folder: ".", pathDraft: ".", filter: "", selectedPath: "", extensions: [".json"], directories: [], files: [], parent: null, nextOffset: null, total: 0, loading: false, accepting: false, error: "", title: "Open workspace file", acceptLabel: "Open", ownerKey: null, importKey: null }, generation = 0, disposed = false, onAccept = null, ownerDialog = null, opener = null, ownerClose = null;
  const document = dialog.ownerDocument, imports = importButtons.get(document) || /* @__PURE__ */ new Set();
  importButtons.set(document, imports);
  let lastFocus = null;
  const currentImportOwner = () => {
    const active = document.activeElement?.closest?.("dialog[open]");
    return active && active !== dialog ? active : state.open && ownerDialog?.open ? ownerDialog : [...document.querySelectorAll("dialog[open]")].filter((node) => node !== dialog).at(-1) || null;
  };
  const currentImports = () => {
    const owner = currentImportOwner();
    if (!owner) return [];
    return [...imports].filter((entry) => entry.button?.isConnected && entry.button.closest("dialog") === owner).map((entry) => {
      const options = entry.options(), button = entry.button;
      const hidden = Boolean(button.closest('[hidden],.hidden,[inert],[aria-hidden="true"]'));
      let cssHidden = false;
      for (let node = button; node && node !== owner.parentElement; node = node.parentElement) {
        const style = document.defaultView?.getComputedStyle(node);
        if (style?.display === "none" || style?.visibility === "hidden") {
          cssHidden = true;
          break;
        }
      }
      return { entry, owner, options, metadata: { key: entry.key, label: options.title || button.getAttribute("aria-label") || button.textContent.trim(), ownerKey: ownerKey(owner), extensions: extensionsOf(options.extensions), available: !disposed && !hidden && !cssHidden && !button.matches(":disabled") && owner.open } };
    });
  };
  const availableImports = () => {
    const entries = currentImports();
    return entries.map(({ metadata }) => ({ ...metadata, available: metadata.available && entries.filter((value) => value.metadata.key === metadata.key).length === 1 }));
  };
  const captureFocus = (node) => {
    const label = node?.getAttribute?.("aria-label");
    return ["Workspace folder", "Filter workspace files"].includes(label) ? { field: label === "Workspace folder" ? "path" : "filter", start: node.selectionStart ?? 0, end: node.selectionEnd ?? 0, direction: node.selectionDirection || "none" } : null;
  };
  const savedRows = (rows) => rows.map((entry) => ({ ...entry }));
  const snapshot = () => ({ format: state.format, open: state.open, ...state.open ? { purpose: state.purpose, mode: state.mode, folder: state.folder, pathDraft: state.pathDraft, filter: state.filter, selectedPath: state.selectedPath, extensions: [...state.extensions], ownerKey: ownerKey(ownerDialog), importKey: state.importKey, error: state.error, focus: captureFocus(document.activeElement) || lastFocus, listing: { directories: savedRows(state.directories), files: savedRows(state.files), parent: state.parent, nextOffset: state.nextOffset, total: state.total } } : {} });
  const render = () => {
    if (!disposed) mount.update({ state: { ...state }, commands });
  };
  const releaseOwner = () => {
    if (ownerDialog && ownerClose) ownerDialog.removeEventListener("close", ownerClose);
    ownerClose = null;
  };
  const close = () => {
    generation++;
    releaseOwner();
    state = { ...state, open: false, loading: false, accepting: false };
    onAccept = null;
    ownerDialog = null;
    if (dialog.open) dialog.close();
    render();
    if (opener?.isConnected) opener.focus();
  };
  const listing = async (folder, offset = 0) => {
    const next = canonicalWorkspacePath(folder), epoch = ++generation;
    state = { ...state, loading: true, error: "", ...offset ? {} : { folder: next, parent: next === "." ? null : partsOf(next).folder, pathDraft: next, selectedPath: "", directories: [], files: [], nextOffset: null, total: 0, filter: "" } };
    render();
    try {
      const result = await requestJson(`/api/workspace/files?folder=${encodeURIComponent(next)}&extensions=${encodeURIComponent(state.extensions.join(","))}&offset=${offset}&limit=500`, { cache: "no-store" });
      if (disposed || epoch !== generation || !state.open) return snapshot();
      if (result?.format !== "fullmeta-workspace-files/1" || result.folder !== next || !Array.isArray(result.directories) || !Array.isArray(result.files)) throw new Error("The workspace directory response is invalid.");
      validateListing(result, next);
      const directories = result.directories.map((entry) => ({ name: entry.name, path: entry.path })), files = result.files.map((entry) => ({ name: entry.name, path: entry.path, bytes: entry.bytes }));
      if ((offset ? state.directories.length + state.files.length : 0) + directories.length + files.length > 2e4) throw new Error("This workspace folder exceeds the 20,000-entry browsing limit.");
      state = { ...state, parent: result.parent === null ? null : canonicalWorkspacePath(result.parent), directories: offset ? [...state.directories, ...directories] : directories, files: offset ? [...state.files, ...files] : files, nextOffset: Number.isSafeInteger(result.nextOffset) ? result.nextOffset : null, total: result.total, loading: false };
    } catch (error) {
      if (epoch !== generation || disposed) return snapshot();
      state = { ...state, loading: false, error: error.message };
      render();
      throw error;
    }
    render();
    return snapshot();
  };
  const commands = {
    async navigate(folder) {
      if (!state.open) throw new Error("Open the workspace picker first.");
      if (state.accepting) throw new Error("Wait for the selected file to finish.");
      try {
        return await listing(folder);
      } catch (error) {
        state = { ...state, error: error.message };
        render();
        throw error;
      }
    },
    more() {
      if (state.nextOffset === null || state.loading || state.accepting) return snapshot();
      return listing(state.folder, state.nextOffset);
    },
    select(path) {
      if (!state.open || state.loading || state.accepting) throw new Error("Wait for the workspace folder to load.");
      const value = canonicalWorkspacePath(path, { root: false }), entries = state.mode === "directory" ? state.directories : state.files;
      if (!entries.some((entry) => entry.path === value)) throw new Error("Choose an entry from the current workspace folder.");
      state = { ...state, selectedPath: value, error: "" };
      render();
      return snapshot();
    },
    pathDraft(value) {
      state = { ...state, pathDraft: value };
      render();
    },
    filter(value) {
      state = { ...state, filter: value };
      render();
    },
    async accept() {
      if (!state.open || state.loading || state.accepting) throw new Error("Wait for the workspace picker to finish.");
      if (state.mode === "file" && !state.selectedPath) throw new Error("Select a workspace file first.");
      const epoch = generation, target = state.mode === "directory" ? state.selectedPath || state.folder : state.selectedPath, entry = state.files.find((file) => file.path === target), callback = onAccept;
      state = { ...state, accepting: true, error: "" };
      render();
      try {
        let selected = state.mode === "directory" ? { folder: target, path: target } : { path: target, ...partsOf(target), name: entry.name, bytes: entry.bytes };
        if (state.purpose === "import" || state.purpose === "schema-for-new") {
          const file = await requestJson(`/api/workspace/file?path=${encodeURIComponent(target)}`, { cache: "no-store" });
          if (file?.format !== "fullmeta-workspace-file/1" || file.path !== target || typeof file.text !== "string" || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 2 * 1024 * 1024 || typeof file.contentHash !== "string") throw new Error("The workspace file response is invalid.");
          selected = { ...selected, text: file.text, contentHash: file.contentHash, bytes: file.bytes };
        }
        if (disposed || epoch !== generation || !state.open || ownerDialog && !ownerDialog.open) return snapshot();
        await callback?.(selected);
        if (epoch === generation && state.open) close();
        return { accepted: true, ...selected };
      } catch (error) {
        if (epoch === generation && !disposed) {
          state = { ...state, accepting: false, error: error.message };
          render();
        }
        throw error;
      }
    },
    cancel() {
      if (state.open) close();
      return snapshot();
    }
  };
  const mount = mountReactComponent(container, WorkspaceFilePicker, { state, commands });
  const cancelEvent = (event) => {
    event.preventDefault();
    commands.cancel();
  }, closeEvent = () => {
    if (state.open) close();
  }, focusOut = (event) => {
    const value = captureFocus(event.target);
    if (value) lastFocus = value;
  };
  dialog.addEventListener("cancel", cancelEvent);
  dialog.addEventListener("close", closeEvent);
  dialog.addEventListener("focusout", focusOut);
  const api = {
    ...commands,
    dialog,
    get ownerDialog() {
      return ownerDialog;
    },
    inspect: () => ({ ...snapshot(), loading: state.loading, accepting: state.accepting, entries: [...state.directories.map((entry) => ({ ...entry, kind: "directory" })), ...state.files.map((entry) => ({ ...entry, kind: "file" }))], nextOffset: state.nextOffset, total: state.total, availableImports: availableImports() }),
    snapshot,
    /** @param {string} key @param {{folder?:string}} options */
    async openImport(key, options = {}) {
      if (disposed) throw new Error("The workspace picker has been disposed.");
      if (!options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some((name) => name !== "folder")) throw new Error("An import action accepts its optional workspace folder only.");
      const folder = options.folder === void 0 ? void 0 : canonicalWorkspacePath(options.folder);
      if (typeof key !== "string" || !key) throw new Error("Choose an import key from the current authoring dialog.");
      const matches = currentImports().filter((value) => value.metadata.key === key);
      if (matches.length !== 1 || !matches[0].metadata.available) throw new Error("This import control is not available in the current open dialog.");
      const { entry, owner, options: registered } = matches[0];
      if (state.open) throw new Error("Finish the current workspace file selection first.");
      for (let details = entry.button.closest("details"); details && owner.contains(details); details = details.parentElement?.closest("details")) details.open = true;
      return api.open({ ...registered, purpose: "import", mode: "file", ownerDialog: owner, opener: entry.button, importKey: key, ...folder === void 0 ? {} : { folder } });
    },
    async open(options = {}) {
      if (disposed) throw new Error("The workspace picker has been disposed.");
      if (state.open) throw new Error("Finish the current workspace file selection first.");
      const purpose = options.purpose || "open", mode = options.mode || (purpose === "new-folder" ? "directory" : "file");
      lastFocus = null;
      const folder = canonicalWorkspacePath(options.folder ?? defaultFolder()), parent = folder === "." ? null : partsOf(folder).folder;
      state = { ...state, open: true, purpose, mode, folder, parent, pathDraft: folder, filter: "", selectedPath: "", directories: [], files: [], nextOffset: null, total: 0, extensions: extensionsOf(options.extensions || [".json"]), error: "", loading: false, accepting: false, importKey: options.importKey || null, title: options.title || (mode === "directory" ? "Choose workspace folder" : "Open workspace file"), acceptLabel: options.acceptLabel || (mode === "directory" ? "Choose folder" : purpose === "import" ? "Import file" : "Open") };
      onAccept = options.onAccept;
      ownerDialog = options.ownerDialog || null;
      opener = options.opener || document.activeElement;
      state.ownerKey = ownerKey(ownerDialog);
      if (ownerDialog) {
        ownerClose = () => commands.cancel();
        ownerDialog.addEventListener("close", ownerClose, { once: true });
      }
      validateWorkspacePickerState(snapshot());
      render();
      if (!dialog.open) dialog.showModal();
      if (options.restoredListing) {
        const { directories, files, parent: parent2, nextOffset, total } = validateListing(options.restoredListing, state.folder);
        state = { ...state, ...structuredClone({ directories, files, parent: parent2, nextOffset, total }) };
        render();
      } else await listing(state.folder);
      container.querySelector('[aria-label="Workspace folder"]')?.focus();
      return snapshot();
    },
    registerImport(entry) {
      imports.add(entry);
      return () => imports.delete(entry);
    },
    async restore(stateToRestore, options = {}) {
      validateWorkspacePickerState(stateToRestore);
      if (!stateToRestore.open) {
        commands.cancel();
        return snapshot();
      }
      let restoreOptions = options;
      if (stateToRestore.purpose === "import") {
        const entry = [...imports].find((entry2) => entry2.key === stateToRestore.importKey && entry2.button?.isConnected && ownerKey(entry2.button.closest("dialog")) === stateToRestore.ownerKey);
        if (!entry) throw new Error("Reopen the owning import controls before restoring their workspace picker.");
        restoreOptions = entry.options();
      }
      const { purpose, mode, folder, extensions, importKey, listing: restoredListing } = stateToRestore;
      await api.open({ ...restoreOptions, purpose, mode, folder, extensions, importKey, restoredListing });
      state = { ...state, pathDraft: stateToRestore.pathDraft, filter: stateToRestore.filter, error: stateToRestore.error, selectedPath: [...state.directories, ...state.files].some((entry) => entry.path === stateToRestore.selectedPath) ? stateToRestore.selectedPath : "" };
      render();
      if (stateToRestore.focus) {
        lastFocus = structuredClone(stateToRestore.focus);
        const input = container.querySelector(`[aria-label="${lastFocus.field === "path" ? "Workspace folder" : "Filter workspace files"}"]`);
        input?.focus();
        if (input && typeof input.setSelectionRange === "function") input.setSelectionRange(lastFocus.start, lastFocus.end, lastFocus.direction);
      }
      return snapshot();
    },
    dispose() {
      if (disposed) return;
      close();
      disposed = true;
      dialog.removeEventListener("cancel", cancelEvent);
      dialog.removeEventListener("close", closeEvent);
      dialog.removeEventListener("focusout", focusOut);
      mount.dispose();
      if (presenters.get(document) === api) presenters.delete(document);
    }
  };
  presenters.set(document, api);
  return api;
}
function WorkspaceFileButton({ label, extensions = [".json", ".tsv", ".txt"], onFile, disabled = false, importKey = label }) {
  const button = useRef(null), latest = useRef(null), [error, setError] = useState("");
  latest.current = { onFile, label, extensions };
  const options = () => ({ purpose: "import", extensions: latest.current.extensions, importKey, ownerDialog: button.current?.closest("dialog"), opener: button.current, title: latest.current.label, onAccept: async (selected) => latest.current.onFile?.({ name: selected.name, path: selected.path, size: selected.bytes, contentHash: selected.contentHash, text: async () => selected.text }) });
  useLayoutEffect(() => {
    const document = button.current.ownerDocument, entries = importButtons.get(document) || /* @__PURE__ */ new Set();
    importButtons.set(document, entries);
    const entry = { key: importKey, button: button.current, options };
    entries.add(entry);
    return () => entries.delete(entry);
  }, [importKey]);
  return /* @__PURE__ */ React.createElement("span", { className: "workspace-file-import" }, /* @__PURE__ */ React.createElement("button", { ref: button, type: "button", className: "button", disabled, "aria-label": label, onClick: async () => {
    try {
      setError("");
      const picker = presenters.get(button.current.ownerDocument);
      if (!picker) throw new Error("The workspace file picker is not mounted.");
      await picker.openImport(importKey);
    } catch (error2) {
      setError(error2.message);
    }
  } }, label), error ? /* @__PURE__ */ React.createElement("span", { role: "alert" }, error) : null);
}
export {
  WorkspaceFileButton,
  WorkspaceFilePicker,
  canonicalWorkspacePath,
  createWorkspaceFilePicker,
  validateWorkspacePickerState
};

//# sourceMappingURL=file-picker.js.map
